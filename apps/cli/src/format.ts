/**
 * Saída humana (default) e --json (SPEC.md §10). Formatação é best-effort
 * sobre os shapes conhecidos das capabilities M1; campos ausentes são
 * omitidos (nunca inventados).
 */

interface DiscoveredCapability {
  id: string;
  domain: string;
  description: string;
  risk: string;
  allowed: string;
}

interface ProjectRegistrationLike {
  id: string;
  name: string;
  rootPath: string;
  status: string;
  fingerprint?: string;
}

interface ProjectModelLike {
  technologies?: { technology: string; confidence: string }[];
  support?: string;
  confidence?: string;
}

interface CommandResultLike {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  classification: string;
  timedOut: boolean;
}

function technologiesSummary(model: ProjectModelLike | undefined): string {
  if (model?.technologies === undefined || model.technologies.length === 0) return 'nenhuma tecnologia detectada';
  return model.technologies.map((t) => `${t.technology} (${t.confidence})`).join(', ');
}

export function formatCapabilities(value: { capabilities: unknown[] }): string {
  const caps = value.capabilities as DiscoveredCapability[];
  return caps
    .map((c) => `${c.id}  [${c.allowed}]  ${c.domain}/${c.risk}  — ${c.description}`)
    .join('\n');
}

export function formatProjectImport(value: {
  project: ProjectRegistrationLike;
  model?: ProjectModelLike;
  alreadyRegistered: boolean;
}): string {
  const p = value.project;
  const flag = value.alreadyRegistered ? ' (já registrado)' : '';
  return [
    `projeto ${p.id}${flag}`,
    `  nome:     ${p.name}`,
    `  rootPath: ${p.rootPath}`,
    `  stack:    ${technologiesSummary(value.model)}`,
  ].join('\n');
}

export function formatProjectOpen(value: {
  project: ProjectRegistrationLike;
  model?: ProjectModelLike;
  analyzedAt?: string;
}): string {
  const p = value.project;
  const lines = [
    `projeto ${p.id}`,
    `  nome:     ${p.name}`,
    `  rootPath: ${p.rootPath}`,
    `  status:   ${p.status}`,
  ];
  if (value.analyzedAt !== undefined) lines.push(`  analisado: ${value.analyzedAt}`);
  lines.push(`  stack:    ${technologiesSummary(value.model)}`);
  if (value.model?.support !== undefined) lines.push(`  suporte:  ${value.model.support} / confiança ${value.model.confidence ?? 'UNKNOWN'}`);
  return lines.join('\n');
}

export function formatProjectList(value: { projects: ProjectRegistrationLike[] }): string {
  if (value.projects.length === 0) return 'nenhum projeto registrado';
  return value.projects.map((p) => `${p.id}  ${p.name}  ${p.rootPath}  [${p.status}]`).join('\n');
}

export function formatCommandResult(value: CommandResultLike): string {
  const lines = [
    `exitCode: ${value.exitCode === null ? 'null' : value.exitCode}  classificação: ${value.classification}${value.timedOut ? '  (TIMED OUT)' : ''}`,
  ];
  if (value.stdout.length > 0) lines.push(`--- stdout ---\n${value.stdout.replace(/\n$/, '')}`);
  if (value.stderr.length > 0) lines.push(`--- stderr ---\n${value.stderr.replace(/\n$/, '')}`);
  return lines.join('\n');
}

// ---- M2 (git) --------------------------------------------------------------

interface GitFileChangeLike {
  path: string;
  origPath?: string;
  kind: string;
}

interface GitStatusLike {
  isRepo: boolean;
  states: string[];
  repoRoot?: string;
  branch?: string | null;
  head?: string | null;
  detached?: boolean;
  tracking?: string | null;
  ahead?: number;
  behind?: number;
  staged?: GitFileChangeLike[];
  unstaged?: GitFileChangeLike[];
  untracked?: string[];
  conflicts?: GitFileChangeLike[];
  remoteState?: string;
}

interface GitLogEntryLike {
  hash: string;
  authorName: string;
  authorEmail: string;
  message: string;
  dateISO: string;
}

interface GitBranchInfoLike {
  name: string;
  current: boolean;
  tracking: string | null;
  head: string | null;
}

interface GitDiffLike {
  mode: string;
  diff: string;
  files: { path: string; additions: number; deletions: number }[];
}

function formatChanges(label: string, changes: GitFileChangeLike[]): string[] {
  if (changes.length === 0) return [];
  return [`  ${label}:`].concat(changes.map((c) => `    ${c.kind.padEnd(9)} ${c.path}`));
}

export function formatGitStatus(value: GitStatusLike): string {
  if (!value.isRepo) return 'não é um repositório git (NO_REPOSITORY)';
  const lines: string[] = [];
  lines.push(`branch: ${value.branch ?? '(detached)'}${value.detached === true ? '  [DETACHED]' : ''}`);
  if (value.head != null) lines.push(`head:   ${value.head.slice(0, 12)}`);
  if (value.tracking != null) {
    lines.push(`tracking: ${value.tracking}  ahead ${value.ahead ?? 0} / behind ${value.behind ?? 0}`);
  }
  if (value.remoteState !== undefined) lines.push(`remoto: ${value.remoteState}`);
  lines.push(`states: ${value.states.join(', ')}`);
  lines.push(...formatChanges('staged', value.staged ?? []));
  lines.push(...formatChanges('unstaged', value.unstaged ?? []));
  const untracked = value.untracked ?? [];
  if (untracked.length > 0) {
    lines.push('  untracked:');
    for (const p of untracked) lines.push(`    ${p}`);
  }
  lines.push(...formatChanges('conflitos', value.conflicts ?? []));
  return lines.join('\n');
}

export function formatGitHistory(value: GitLogEntryLike[]): string {
  if (value.length === 0) return 'sem commits';
  return value
    .map((e) => `${e.hash.slice(0, 12)}  ${e.dateISO}  ${e.authorName} <${e.authorEmail}>  ${e.message}`)
    .join('\n');
}

export function formatGitBranchList(value: GitBranchInfoLike[]): string {
  if (value.length === 0) return 'sem branches';
  return value
    .map((b) => {
      const current = b.current ? '*' : ' ';
      const tracking = b.tracking !== null ? `  [${b.tracking}]` : '';
      const head = b.head !== null ? `  ${b.head.slice(0, 12)}` : '';
      return `${current} ${b.name}${head}${tracking}`;
    })
    .join('\n');
}

/** Diff completo (NUNCA truncado) precedido do resumo numstat. */
export function formatGitDiff(value: GitDiffLike): string {
  const lines: string[] = [`mode: ${value.mode}`];
  if (value.files.length > 0) {
    lines.push('arquivos:');
    for (const f of value.files) lines.push(`  ${f.path}  +${f.additions} -${f.deletions}`);
  } else {
    lines.push('arquivos: nenhum');
  }
  if (value.diff.length > 0) lines.push(`--- diff ---\n${value.diff.replace(/\n$/, '')}`);
  return lines.join('\n');
}

/**
 * Formatter genérico para resultados de mutação git (commit/push/pull/fetch/
 * branch.*): linhas-chave `campo: valor` para primitivos; objetos/aninhados em
 * JSON compacto. O envelope completo segue disponível via --json.
 */
export function formatGitMutation(value: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, v] of Object.entries(value)) {
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      lines.push(`${key}: ${String(v)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(v)}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : 'ok';
}
