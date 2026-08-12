/**
 * Fingerprint de staleness (SPEC §7/§8): hash estável dos inputs do modelo.
 * sha256 de (package.json + lockfile + config files conhecidos), em ordem fixa,
 * formato "<relpath>\0<conteúdo>\0" por arquivo presente. Arquivos ausentes são
 * ignorados. Read-only: nunca escreve no projeto.
 *
 * Wave 5 (FIX 4 — fingerprint cego para estáticos): quando NÃO há package.json
 * (projeto estático, ex.: html-static), o fingerprint também cobre o
 * `index.html` raiz e os arquivos estáticos conhecidos detectados
 * (STATIC_FINGERPRINT_INPUTS) — antes, editar o index.html de um projeto
 * estático NÃO mudava o fingerprint e project.open nunca detectava
 * STALE_CONTEXT. Com package.json presente o conjunto é inalterado
 * (contrato M1 preservado).
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Arquivos conhecidos que alimentam o ProjectModel (ordem canônica fixa). */
export const FINGERPRINT_INPUTS: readonly string[] = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'astro.config.mjs',
  'astro.config.js',
  'astro.config.ts',
  'svelte.config.js',
  'svelte.config.ts',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
];

/**
 * Inputs adicionais para projetos SEM package.json (Wave 5 FIX 4): entrada e
 * assets/configs estáticos conhecidos na raiz. Ordem canônica fixa; ausentes
 * são ignorados (mesma regra dos demais inputs).
 */
export const STATIC_FINGERPRINT_INPUTS: readonly string[] = [
  'index.html',
  'styles.css',
  'style.css',
  'main.css',
  'app.css',
  'main.js',
  'script.js',
  'app.js',
  'robots.txt',
  'manifest.json',
  'site.webmanifest',
  'favicon.ico',
];

export async function computeFingerprint(root: string): Promise<string> {
  const hash = createHash('sha256');
  let hasPackageJson = false;
  try {
    await readFile(join(root, 'package.json'), 'utf8');
    hasPackageJson = true;
  } catch {
    hasPackageJson = false; // ausente/ilegível: projeto possivelmente estático
  }
  const inputs = hasPackageJson ? FINGERPRINT_INPUTS : [...FINGERPRINT_INPUTS, ...STATIC_FINGERPRINT_INPUTS];
  for (const rel of inputs) {
    let content: string | null = null;
    try {
      content = await readFile(join(root, rel), 'utf8');
    } catch {
      content = null; // ausente/ilegível: não participa do hash
    }
    if (content !== null) {
      hash.update(rel);
      hash.update('\0');
      hash.update(content);
      hash.update('\0');
    }
  }
  return hash.digest('hex');
}
