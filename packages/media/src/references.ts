/**
 * Media Reference Tracking (doc 08§49) e reescrita textual de referências
 * (08§48 Update References — troca de path de asset e referência textual;
 * NÃO é transformação de código AST, M3-CONTRACTS §3.3).
 *
 * Estratégia honesta e determinística:
 * - Needles de ALTA confiança: path do asset relativo ao Project Root
 *   ('src/assets/logo.png' — cobre variantes './', '/', '@/' por substring) e,
 *   para assets sob public/, a URL pública ('/logo.png' após strip de 'public/').
 * - Needle de confiança PARTIAL: basename isolado (pode ser coincidental —
 *   reportado, NUNCA reescrito automaticamente).
 * - Scan limitado a arquivos de texto com extensões de source; binários,
 *   arquivos >1MB, ilegíveis e diretórios ignorados (node_modules, .git,
 *   dist, build, ...) não são varridos => `complete:false` => uso `Unknown`
 *   (08§50: Unknown nunca tratado como Unused).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, ok, type Result } from '@nexo/shared';

import { mediaError } from './errors.js';
import { guardPath, toRelative, type ProjectFs } from './paths.js';
import type { AssetReference, ReferenceKind } from './types.js';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.turbo',
  'coverage',
  '.cache',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.css', '.scss', '.sass', '.less',
  '.html', '.htm', '.vue', '.svelte', '.astro',
  '.md', '.mdx', '.json', '.txt',
]);

const MAX_FILE_BYTES = 1024 * 1024; // 1MB
const MAX_SCANNED_FILES = 5000;

/** Needles de referência para um asset local (ordem estável). */
export function referenceNeedles(relPath: string): { full: string[]; basename: string } {
  const full = [relPath];
  if (relPath === 'public' || relPath.startsWith('public/')) {
    const publicUrl = '/' + relPath.slice('public/'.length);
    if (publicUrl !== '/' && !full.includes(publicUrl)) full.push(publicUrl);
  }
  return { full, basename: path.posix.basename(relPath) };
}

function classifyKind(line: string): ReferenceKind {
  if (/\bimport\b|\bfrom\s*['"]|\brequire\s*\(/.test(line)) return 'import';
  if (/\bsrc\s*=\s*['"{]/.test(line)) return 'src';
  if (/\bhref\s*=\s*['"{]/.test(line)) return 'href';
  if (/url\(\s*['"]?/.test(line)) return 'css-url';
  return 'text';
}

interface WalkedFile {
  rel: string;
  abs: string;
}

async function walkTextFiles(fsCtx: ProjectFs): Promise<{ files: WalkedFile[]; truncated: boolean }> {
  const files: WalkedFile[] = [];
  let truncated = false;

  async function walk(dirAbs: string): Promise<void> {
    if (files.length >= MAX_SCANNED_FILES) {
      truncated = true;
      return;
    }
    let dirents;
    try {
      dirents = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    dirents.sort((a, b) => a.name.localeCompare(b.name));
    for (const d of dirents) {
      if (files.length >= MAX_SCANNED_FILES) {
        truncated = true;
        return;
      }
      const abs = path.join(dirAbs, d.name);
      if (d.isDirectory()) {
        if (!SKIP_DIRS.has(d.name)) await walk(abs);
      } else if (d.isFile()) {
        if (TEXT_EXTENSIONS.has(path.extname(d.name).toLowerCase())) {
          files.push({ rel: toRelative(fsCtx, abs), abs });
        }
      }
    }
  }

  await walk(fsCtx.rootAbs);
  return { files, truncated };
}

export interface ReferenceScan {
  references: AssetReference[];
  scannedFiles: number;
  /** Arquivos de texto pulados (ilegível/grande demais) ou walk truncado. */
  skippedFiles: number;
  /** false => uso do asset é `Unknown` (08§50), nunca `Unused`. */
  complete: boolean;
}

/** Scan textual de referências ao asset em todo o projeto (08§49). */
export async function scanAssetReferences(
  fsCtx: ProjectFs,
  relPath: string,
): Promise<Result<ReferenceScan>> {
  const { full, basename } = referenceNeedles(relPath);
  const { files, truncated } = await walkTextFiles(fsCtx);
  const references: AssetReference[] = [];
  let skipped = 0;

  for (const file of files) {
    // o próprio arquivo do asset nunca é referência de si mesmo
    if (file.rel === relPath) continue;
    let content: string;
    try {
      const st = await fs.stat(file.abs);
      if (st.size > MAX_FILE_BYTES) {
        skipped += 1;
        continue;
      }
      content = await fs.readFile(file.abs, 'utf8');
    } catch {
      skipped += 1;
      continue;
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      const fullHit = full.find((needle) => line.includes(needle));
      if (fullHit !== undefined) {
        references.push({
          filePath: file.rel,
          line: i + 1,
          kind: classifyKind(line),
          matchedText: fullHit,
          confidence: 'HIGH_CONFIDENCE',
        });
        continue;
      }
      if (basename.length > 0 && line.includes(basename)) {
        references.push({
          filePath: file.rel,
          line: i + 1,
          kind: classifyKind(line),
          matchedText: basename,
          confidence: 'PARTIAL',
        });
      }
    }
  }

  return ok({
    references,
    scannedFiles: files.length - skipped,
    skippedFiles: skipped,
    complete: !truncated && skipped === 0,
  });
}

export interface ReferenceRewrite {
  filePath: string;
  replacements: number;
}

/**
 * Reescreve ocorrências textuais HIGH_CONFIDENCE do path antigo pelo novo
 * (import/src/href/url()). Retorna os arquivos alterados. Referências PARTIAL
 * (basename) NUNCA são reescritas — retornadas em `ambiguous` para o caller
 * reportar como diagnóstico.
 */
export async function rewriteAssetReferences(
  fsCtx: ProjectFs,
  oldRelPath: string,
  newRelPath: string,
  references: readonly AssetReference[],
): Promise<Result<{ rewritten: ReferenceRewrite[]; ambiguous: AssetReference[] }>> {
  const oldNeedles = referenceNeedles(oldRelPath).full;
  const newNeedles = referenceNeedles(newRelPath).full;
  const ambiguous = references.filter((r) => r.confidence !== 'HIGH_CONFIDENCE');

  // substituição 1:1 por needle correspondente (mesmo índice de variante)
  const pairs: Array<[string, string]> = oldNeedles.map((oldNeedle, i) => [
    oldNeedle,
    newNeedles[i] ?? newNeedles[0] ?? newRelPath,
  ]);

  const byFile = new Map<string, AssetReference[]>();
  for (const ref of references) {
    if (ref.confidence !== 'HIGH_CONFIDENCE') continue;
    const list = byFile.get(ref.filePath) ?? [];
    list.push(ref);
    byFile.set(ref.filePath, list);
  }

  const rewritten: ReferenceRewrite[] = [];
  for (const [filePath, refs] of [...byFile.entries()].sort()) {
    const guarded = await guardPath(fsCtx, filePath);
    if (!guarded.ok) return guarded;
    let content: string;
    try {
      content = await fs.readFile(guarded.value, 'utf8');
    } catch (e) {
      return err(
        mediaError('VerificationFailed', `Falha ao ler '${filePath}' para atualizar referências`, {
          resource: filePath,
          details: { cause: (e as Error).message },
        }),
      );
    }
    let updated = content;
    let replacements = 0;
    for (const ref of refs) {
      const pair = pairs.find(([oldNeedle]) => oldNeedle === ref.matchedText);
      if (pair === undefined) continue;
      const [oldNeedle, newNeedle] = pair;
      const occurrences = updated.split(oldNeedle).length - 1;
      updated = updated.split(oldNeedle).join(newNeedle);
      replacements += occurrences;
    }
    if (updated === content) continue;
    try {
      await fs.writeFile(guarded.value, updated, 'utf8');
    } catch (e) {
      return err(
        mediaError('VerificationFailed', `Falha ao escrever '${filePath}' ao atualizar referências`, {
          resource: filePath,
          details: { cause: (e as Error).message },
        }),
      );
    }
    // Verify (08§48): reler e conferir que o needle novo está presente e o antigo, ausente
    const reread = await fs.readFile(guarded.value, 'utf8');
    const expectedNew = pairs.map(([, n]) => n).find((n) => reread.includes(n));
    const lingeringOld = oldNeedles.find((n) => reread.includes(n));
    if (expectedNew === undefined || lingeringOld !== undefined) {
      return err(
        mediaError(
          'VerificationFailed',
          `Verificação pós-escrita falhou em '${filePath}' (referência nova ausente ou antiga remanescente)`,
          { resource: filePath },
        ),
      );
    }
    rewritten.push({ filePath, replacements });
  }
  return ok({ rewritten, ambiguous });
}
