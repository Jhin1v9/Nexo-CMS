/**
 * Resolução de path de destino (doc 08§53) e naming (08§52).
 *
 * 08§53: o path de armazenamento é determinado pela inspeção do projeto —
 * NUNCA assumir /public ou /src/assets. Estratégia determinística:
 *  1. targetPath explícito (sempre vence, após scope guard);
 *  2. diretórios já usados por assets registrados no registry (evidência real);
 *  3. candidatos conhecidos que EXISTEM no disco (public, src/assets, ...).
 * Zero candidatos => NoAssetDirectoryDetected; mais de um =>
 * AmbiguousAssetDirectory (exigir targetPath explícito — nunca adivinhar).
 *
 * 08§52: preserva a convenção de naming do projeto (kebab-case vs snake_case
 * detectada por maioria nos arquivos do diretório de destino); colisão =>
 * sufixo determinístico `-2`, `-3`, ... (NUNCA 'final-final-2').
 *
 * Todo path final passa pelo scope guard de @nexo/runtime (resolveWithinRoot):
 * contenção lexical + realpath de ancestral (rejeita '../' e symlink escape).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, ok, type Result } from '@nexo/shared';
import { resolveWithinRoot } from '@nexo/runtime';

import { mediaError } from './errors.js';

/** Candidatos conhecidos de diretório de assets (ordem estável, determinística). */
export const ASSET_DIR_CANDIDATES: readonly string[] = [
  'public',
  'public/assets',
  'public/images',
  'src/assets',
  'src/assets/images',
  'assets',
  'static',
  'static/assets',
  'images',
  'media',
];

/** Contexto de filesystem com raiz do projeto já resolvida/realpatheada. */
export interface ProjectFs {
  rootAbs: string;
  rootReal: string;
}

export async function createProjectFs(rootPath: string): Promise<Result<ProjectFs>> {
  const rootAbs = path.resolve(rootPath);
  try {
    const rootReal = await fs.realpath(rootAbs);
    return ok({ rootAbs, rootReal });
  } catch {
    return err(
      mediaError('AssetNotFound', `Project Root não encontrado no disco: '${rootPath}'`, {
        resource: rootPath,
      }),
    );
  }
}

/** Scope guard: resolve `rel` dentro do root ou erro SCOPE_VIOLATION. */
export async function guardPath(fsCtx: ProjectFs, rel: string): Promise<Result<string>> {
  if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\0')) {
    return err(mediaError('InvalidFileName', `Path inválido: '${String(rel)}'`, { resource: String(rel) }));
  }
  const resolved = await resolveWithinRoot(fsCtx.rootAbs, fsCtx.rootReal, rel);
  if (!resolved.ok) {
    if (resolved.reason === 'ESCAPE') {
      return err(
        mediaError('ScopeViolation', `Path escapa do Project Root: '${rel}'`, {
          resource: rel,
          details: { root: fsCtx.rootAbs, rel },
        }),
      );
    }
    return err(
      mediaError('VerificationFailed', `Falha ao resolver path '${rel}': ${resolved.cause.message}`, {
        resource: rel,
      }),
    );
  }
  return ok(resolved.abs);
}

/** Converte path absoluto (já contido no root) em relativo POSIX-like estável. */
export function toRelative(fsCtx: ProjectFs, abs: string): string {
  return path.relative(fsCtx.rootAbs, abs).split(path.sep).join('/');
}

async function isDirectory(abs: string): Promise<boolean> {
  try {
    return (await fs.stat(abs)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Detecta diretórios de assets existentes (08§53). Retorna a lista de
 * candidatos presentes no disco, unida aos diretórios já usados por assets
 * registrados (evidência do registry), ordenada de forma estável.
 */
export async function detectAssetDirectories(
  fsCtx: ProjectFs,
  registryDirs: readonly string[],
): Promise<string[]> {
  const found = new Set<string>();
  for (const rel of registryDirs) {
    const guarded = await guardPath(fsCtx, rel);
    if (guarded.ok && (await isDirectory(guarded.value))) found.add(rel);
  }
  for (const candidate of ASSET_DIR_CANDIDATES) {
    const guarded = await guardPath(fsCtx, candidate);
    if (guarded.ok && (await isDirectory(guarded.value))) found.add(candidate);
  }
  return [...found].sort();
}

/** Validação de nome (08§45 Name): sem separadores, traversal, NUL, reservados. */
export function validateFileName(fileName: string): Result<string> {
  if (
    typeof fileName !== 'string' ||
    fileName.trim().length === 0 ||
    fileName !== path.basename(fileName) ||
    fileName === '.' ||
    fileName === '..' ||
    fileName.includes('\0') ||
    /[<>:"|?*]/.test(fileName)
  ) {
    return err(
      mediaError('InvalidFileName', `Nome de arquivo inválido: '${String(fileName)}'`, {
        resource: String(fileName),
      }),
    );
  }
  return ok(fileName.trim());
}

type NamingConvention = 'kebab' | 'snake' | 'none';

/** Detecta a convenção dominante de naming nos arquivos do diretório (08§52). */
function detectConvention(names: readonly string[]): NamingConvention {
  let kebab = 0;
  let snake = 0;
  for (const name of names) {
    const stem = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
    if (stem.includes('-')) kebab += 1;
    if (stem.includes('_')) snake += 1;
  }
  if (kebab > snake) return 'kebab';
  if (snake > kebab) return 'snake';
  return 'none';
}

/**
 * Normaliza o nome para a convenção do projeto (somente quando há convenção
 * clara): espaços e o separador "errado" viram o separador dominante. Nunca
 * inventa nome arbitrário; colisão => sufixo determinístico `-2`, `-3`, ...
 */
export async function resolveDestinationName(
  dirAbs: string,
  fileName: string,
): Promise<string> {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(dirAbs, { withFileTypes: true }))
      .filter((e) => e.isFile())
      .map((e) => e.name);
  } catch {
    // diretório será criado — sem convenção detectável, nome original preservado
  }
  const convention = detectConvention(entries);
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';
  let normalizedStem = stem.replace(/\s+/g, convention === 'snake' ? '_' : '-');
  if (convention === 'kebab') normalizedStem = normalizedStem.replace(/_+/g, '-');
  if (convention === 'snake') normalizedStem = normalizedStem.replace(/-+/g, '_');

  const taken = new Set(entries.map((e) => e.toLowerCase()));
  let candidate = `${normalizedStem}${ext}`;
  let counter = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${normalizedStem}-${counter}${ext}`;
    counter += 1;
  }
  return candidate;
}

/**
 * Resolve o destino final de um upload (08§53 + scope guard):
 * - targetPath explícito: se aponta para diretório existente (ou termina em
 *   '/'), o nome é resolvido dentro dele; senão é o path completo do arquivo.
 * - sem targetPath: detecção de diretório de assets; 0 => erro, >1 => erro
 *   ambíguo (nextAction: provide-explicit-targetPath).
 */
export async function resolveUploadDestination(
  fsCtx: ProjectFs,
  fileName: string,
  targetPath: string | undefined,
  registryDirs: readonly string[],
): Promise<Result<{ relPath: string; absPath: string }>> {
  const nameCheck = validateFileName(fileName);
  if (!nameCheck.ok) return nameCheck;

  if (targetPath !== undefined && targetPath.trim() !== '') {
    const rel = targetPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
    const guarded = await guardPath(fsCtx, rel);
    if (!guarded.ok) return guarded;
    if ((await isDirectory(guarded.value)) || targetPath.endsWith('/')) {
      const name = await resolveDestinationName(guarded.value, nameCheck.value);
      const fileAbs = path.join(guarded.value, name);
      const fileGuarded = await guardPath(fsCtx, toRelative(fsCtx, fileAbs));
      if (!fileGuarded.ok) return fileGuarded;
      return ok({ relPath: toRelative(fsCtx, fileAbs), absPath: fileAbs });
    }
    // targetPath = path completo do arquivo; o basename precisa ser válido
    const base = path.basename(guarded.value);
    const baseCheck = validateFileName(base);
    if (!baseCheck.ok) return baseCheck;
    return ok({ relPath: toRelative(fsCtx, guarded.value), absPath: guarded.value });
  }

  const dirs = await detectAssetDirectories(fsCtx, registryDirs);
  if (dirs.length === 0) {
    return err(
      mediaError(
        'NoAssetDirectoryDetected',
        'Nenhum diretório de assets detectado no projeto (08§53: não assumir /public nem /src/assets). Informe targetPath explícito.',
        { resource: fileName },
      ),
    );
  }
  const first = dirs[0];
  if (dirs.length > 1 || first === undefined) {
    return err(
      mediaError(
        'AmbiguousAssetDirectory',
        `Mais de um diretório de assets candidato: [${dirs.join(', ')}]. Informe targetPath explícito.`,
        { resource: fileName, details: { candidates: dirs } },
      ),
    );
  }
  const dirGuarded = await guardPath(fsCtx, first);
  if (!dirGuarded.ok) return dirGuarded;
  const name = await resolveDestinationName(dirGuarded.value, nameCheck.value);
  const fileAbs = path.join(dirGuarded.value, name);
  const fileGuarded = await guardPath(fsCtx, toRelative(fsCtx, fileAbs));
  if (!fileGuarded.ok) return fileGuarded;
  return ok({ relPath: toRelative(fsCtx, fileAbs), absPath: fileAbs });
}
