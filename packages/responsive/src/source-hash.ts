/**
 * Hash de integridade do Source Project (doc 09§33: stress content NUNCA é
 * persistido — a prova é empírica). sha256 sobre (path relativo + conteúdo)
 * de cada arquivo do projeto, excluindo diretórios gerados/vendor.
 *
 * Determinístico: paths ordenados antes do hash. Não é um fingerprint de
 * Project Intelligence — é evidência de "nada mudou no disco".
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const SOURCE_HASH_EXCLUDED_DIRS: readonly string[] = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.nexo',
  '.next',
  '.cache',
];

const MAX_FILES = 10_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MiB por arquivo (guarda de memória)

export interface SourceHashResult {
  hash: string; // sha256 hex
  hashedFiles: number;
  truncated: boolean; // true se MAX_FILES atingido (honesto, nunca escondido)
  excludedDirs: string[];
}

export async function hashSourceTree(rootAbsPath: string): Promise<SourceHashResult> {
  const entries: string[] = [];
  let truncated = false;

  async function walk(dir: string): Promise<void> {
    if (entries.length >= MAX_FILES) {
      truncated = true;
      return;
    }
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const d of dirents) {
      if (entries.length >= MAX_FILES) {
        truncated = true;
        return;
      }
      const abs = path.join(dir, d.name);
      if (d.isDirectory()) {
        if (SOURCE_HASH_EXCLUDED_DIRS.includes(d.name)) continue;
        await walk(abs);
      } else if (d.isFile()) {
        entries.push(abs);
      }
    }
  }

  await walk(rootAbsPath);
  entries.sort();

  const hash = createHash('sha256');
  for (const abs of entries) {
    const rel = path.relative(rootAbsPath, abs);
    const st = await fs.stat(abs);
    hash.update(rel);
    hash.update('\0');
    if (st.size <= MAX_FILE_BYTES) {
      hash.update(await fs.readFile(abs));
    } else {
      // Arquivo grande demais para hashear inteiro: registra tamanho como
      // evidência parcial (mudança de tamanho ainda é detectada).
      hash.update(`size:${st.size}`);
    }
    hash.update('\0');
  }

  return {
    hash: hash.digest('hex'),
    hashedFiles: entries.length,
    truncated,
    excludedDirs: [...SOURCE_HASH_EXCLUDED_DIRS],
  };
}
