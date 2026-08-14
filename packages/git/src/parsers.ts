/**
 * Parsers de formatos machine-readable do git CLI (D2: saída estruturada via
 * formatos oficiais — `--porcelain=v2 --branch`, `--format` com separadores de
 * unidade 0x1f/0x1e, `--numstat`, `branch --format`).
 * Funções puras e determinísticas: sem I/O, testáveis unitariamente.
 */

import type { GitBranchInfo, GitDiffFileStat, GitFileChange, GitLogEntry, GitChangeKind } from './types.js';

/** Separadores de unidade/registro (doc 10 via git --format %x1f/%x1e). */
export const UNIT_SEP = '';
export const RECORD_SEP = '';

/** Formato de log usado pelo client (campos alinhados com parseGitLog). */
export const GIT_LOG_FORMAT = '%H%x1f%an%x1f%ae%x1f%cn%x1f%ce%x1f%s%x1f%aI%x1f%P%x1f%D%x1e';

/**
 * Formato de branch list usado pelo client (campos alinhados com parseGitBranchFormat).
 * ATENÇÃO: `git branch --format` (for-each-ref) NÃO interpreta %x1f — apenas
 * átomos %(campo). Por isso o separador 0x1f é embutido como caractere literal
 * (spawn sem shell passa o arg literalmente).
 */
export const GIT_BRANCH_FORMAT = `%(refname:short)${UNIT_SEP}%(HEAD)${UNIT_SEP}%(upstream:short)${UNIT_SEP}%(objectname)`;

export interface GitRawStatus {
  branch: string | null;
  head: string | null;
  detached: boolean;
  tracking: string | null;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicts: GitFileChange[];
}

function kindFromLetter(letter: string): GitChangeKind {
  switch (letter) {
    case 'A':
      return 'added';
    case 'M':
      return 'modified';
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    case 'C':
      return 'copied';
    case 'T':
      return 'typechange';
    case 'U':
      return 'unmerged';
    default:
      return 'unknown';
  }
}

/**
 * Parse de `git status --porcelain=v2 --branch` (formato estável desde git 2.11).
 * Linhas: `# branch.*` (headers), `1` (mudança ordinária), `2` (rename/copy,
 * path e origPath separados por TAB), `u` (unmerged/conflito), `?` (untracked),
 * `!` (ignored — não exposto).
 */
export function parseGitStatusPorcelainV2(stdout: string): GitRawStatus {
  const out: GitRawStatus = {
    branch: null,
    head: null,
    detached: false,
    tracking: null,
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    untracked: [],
    conflicts: [],
  };

  for (const line of stdout.split('\n')) {
    if (line.length === 0) continue;

    if (line.startsWith('# branch.oid ')) {
      const oid = line.slice('# branch.oid '.length).trim();
      out.head = oid === '(initial)' ? null : oid;
      continue;
    }
    if (line.startsWith('# branch.head ')) {
      const head = line.slice('# branch.head '.length).trim();
      if (head === '(detached)') {
        out.detached = true;
        out.branch = null;
      } else {
        out.branch = head;
      }
      continue;
    }
    if (line.startsWith('# branch.upstream ')) {
      out.tracking = line.slice('# branch.upstream '.length).trim();
      continue;
    }
    if (line.startsWith('# branch.ab ')) {
      const m = /^# branch\.ab \+(\d+) -(\d+)/.exec(line);
      if (m) {
        out.ahead = Number(m[1]);
        out.behind = Number(m[2]);
      }
      continue;
    }
    if (line.startsWith('#')) continue; // headers desconhecidos: ignorar

    if (line.startsWith('? ')) {
      out.untracked.push(line.slice(2));
      continue;
    }
    if (line.startsWith('! ')) continue; // ignored: não exposto no contrato

    if (line.startsWith('u ')) {
      // u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>
      const parts = line.split(' ', 11);
      const path = parts[10] ?? '';
      if (path.length > 0) out.conflicts.push({ path, kind: 'unmerged' });
      continue;
    }

    if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const renamed = line.startsWith('2 ');
      // 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
      // 2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path>\t<origPath>
      const parts = line.split(' ', renamed ? 10 : 9);
      const xy = parts[1] ?? '..';
      let path = parts[renamed ? 9 : 8] ?? '';
      let origPath: string | undefined;
      if (renamed && path.includes('\t')) {
        const idx = path.indexOf('\t');
        origPath = path.slice(idx + 1);
        path = path.slice(0, idx);
      }
      if (path.length === 0) continue;
      const x = xy[0] ?? '.';
      const y = xy[1] ?? '.';
      if (x !== '.' && x !== 'U') out.staged.push(origPath !== undefined ? { path, origPath, kind: kindFromLetter(x) } : { path, kind: kindFromLetter(x) });
      if (y !== '.' && y !== 'U') out.unstaged.push(origPath !== undefined ? { path, origPath, kind: kindFromLetter(y) } : { path, kind: kindFromLetter(y) });
      if (x === 'U' || y === 'U') out.conflicts.push({ path, kind: 'unmerged' });
      continue;
    }
    // Linha desconhecida: ignorar (No Fake Success não exige falhar em formato novo).
  }

  return out;
}

/**
 * Parse de `git log --format=<GIT_LOG_FORMAT>`: registros separados por 0x1e,
 * campos por 0x1f (resistente a espaços/quebras nos dados do commit).
 */
export function parseGitLog(stdout: string): GitLogEntry[] {
  const entries: GitLogEntry[] = [];
  for (const record of stdout.split(RECORD_SEP)) {
    const trimmed = record.replace(/^\n+|\n+$/g, '');
    if (trimmed.length === 0) continue;
    const f = trimmed.split(UNIT_SEP);
    if (f.length < 9) continue;
    const parentsRaw = f[7] ?? '';
    const refsRaw = f[8] ?? '';
    entries.push({
      hash: f[0] ?? '',
      authorName: f[1] ?? '',
      authorEmail: f[2] ?? '',
      committerName: f[3] ?? '',
      committerEmail: f[4] ?? '',
      message: f[5] ?? '',
      dateISO: f[6] ?? '',
      parents: parentsRaw.trim().length === 0 ? [] : parentsRaw.trim().split(' '),
      refs: refsRaw.trim().length === 0 ? [] : refsRaw.split(',').map((r) => r.trim()).filter((r) => r.length > 0),
    });
  }
  return entries;
}

/**
 * Parse de `git diff --numstat`: `<add>\t<del>\t<path>` por linha.
 * Binários aparecem como `-\t-` -> contabilizados como 0/0 (numstat não conta
 * linhas de binário; não inventamos números).
 */
export function parseGitNumstat(stdout: string): GitDiffFileStat[] {
  const files: GitDiffFileStat[] = [];
  for (const line of stdout.split('\n')) {
    if (line.length === 0) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const add = parts[0] === '-' ? 0 : Number(parts[0]);
    const del = parts[1] === '-' ? 0 : Number(parts[1]);
    files.push({
      path: parts.slice(2).join('\t'),
      additions: Number.isFinite(add) ? add : 0,
      deletions: Number.isFinite(del) ? del : 0,
    });
  }
  return files;
}

/**
 * Parse de `git branch --list --format=<GIT_BRANCH_FORMAT>`:
 * nome, flag HEAD ('*' = atual), upstream (vazio = sem tracking), hash.
 */
export function parseGitBranchFormat(stdout: string): GitBranchInfo[] {
  const branches: GitBranchInfo[] = [];
  for (const line of stdout.split('\n')) {
    if (line.length === 0) continue;
    const f = line.split(UNIT_SEP);
    if (f.length < 4) continue;
    const name = f[0] ?? '';
    if (name.length === 0) continue;
    const tracking = (f[2] ?? '').trim();
    const head = (f[3] ?? '').trim();
    branches.push({
      name,
      current: (f[1] ?? '').trim() === '*',
      tracking: tracking.length === 0 ? null : tracking,
      head: head.length === 0 ? null : head,
    });
  }
  return branches;
}

/**
 * Parse de `git remote -v`: `nome\t<url> (fetch|push)`. URLs são redigidas
 * pelo CHAMADOR (redact.ts) antes de saírem do package.
 */
export function parseGitRemoteVerbose(stdout: string): Array<{ name: string; url: string; kind: 'fetch' | 'push' }> {
  const out: Array<{ name: string; url: string; kind: 'fetch' | 'push' }> = [];
  for (const line of stdout.split('\n')) {
    if (line.length === 0) continue;
    const m = /^(\S+)\t(\S+) \((fetch|push)\)$/.exec(line);
    if (!m) continue;
    out.push({ name: m[1] ?? '', url: m[2] ?? '', kind: m[3] === 'push' ? 'push' : 'fetch' });
  }
  return out;
}
