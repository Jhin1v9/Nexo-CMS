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
 * Formatter genérico para resultados de mutação (git commit/push/pull/fetch/
 * branch.* e mutações M3): linhas-chave `campo: valor` para primitivos;
 * objetos/aninhados em JSON compacto. O envelope completo segue disponível
 * via --json.
 */
export function formatKeyValue(value: Record<string, unknown>): string {
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

/** Alias histórico (M2): ver formatKeyValue. */
export const formatGitMutation = formatKeyValue;

// ---- M3 (M3-CONTRACTS §3) ----------------------------------------------------
// Formatters best-effort sobre os shapes concretos do contrato (§6, §7) e
// defensivos sobre campos opcionais: campos ausentes são omitidos (nunca
// inventados). Shape desconhecido cai no fallback JSON pretty (honesto).

/** Fallback honesto para shapes sem formatter dedicado: JSON pretty puro. */
export function formatGeneric(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

interface DiagnosticLike {
  severity?: string;
  certainty?: string;
  code?: string;
  message?: string;
  evidence?: unknown;
}

/** Diagnostics de pipeline (save/publish/validate): severity + certainty. */
export function formatDiagnostics(diagnostics: unknown): string[] {
  if (!Array.isArray(diagnostics) || diagnostics.length === 0) return [];
  return ['diagnostics:'].concat(
    diagnostics.map((d: DiagnosticLike) => {
      const severity = d.severity !== undefined ? `[${d.severity}]` : '[info]';
      const certainty = d.certainty !== undefined ? ` (${d.certainty})` : '';
      const code = d.code !== undefined ? ` ${d.code}` : '';
      const message = d.message ?? JSON.stringify(d);
      const evidence = d.evidence !== undefined ? ` — evidência: ${JSON.stringify(d.evidence)}` : '';
      return `  ${severity}${certainty}${code} ${message}${evidence}`;
    }),
  );
}

interface EditorOpenLike {
  content: string;
  encoding?: string;
  hash?: string;
  language?: string;
  readOnly?: boolean;
}

/**
 * `editor open`: humano recebe o CONTEÚDO puro (pipeável); metadados
 * (hash/encoding/language/readOnly) ficam no envelope --json.
 */
export function formatEditorOpen(value: EditorOpenLike): string {
  return value.content.replace(/\n$/, '');
}

interface EditorSaveLike {
  saved?: boolean;
  hash?: string;
  verified?: boolean;
  diagnostics?: unknown;
}

/** `editor save`: nunca imprime "saved" sem o campo real (zero fake success). */
export function formatEditorSave(value: EditorSaveLike): string {
  const lines: string[] = [];
  lines.push(`saved: ${value.saved === true}`);
  if (value.hash !== undefined) lines.push(`hash: ${value.hash}`);
  if (value.verified !== undefined) lines.push(`verified: ${value.verified}`);
  lines.push(...formatDiagnostics(value.diagnostics));
  return lines.join('\n');
}

interface ChangeObjectLike {
  id: string;
  files?: string[];
  operation?: string;
  source?: string;
  origin?: string;
  state?: string;
  createdAt?: string;
  appliedAt?: string | null;
}

/** Change Object (M3-CONTRACTS §6) em linha única + detalhes. */
export function formatChangeObject(change: ChangeObjectLike): string {
  const lines = [
    `${change.id}  [${change.state ?? 'UNKNOWN'}]  ${change.operation ?? '?'}  origem: ${change.origin ?? change.source ?? '?'}`,
  ];
  const files = change.files ?? [];
  if (files.length > 0) lines.push(`  arquivos: ${files.join(', ')}`);
  if (change.createdAt !== undefined) lines.push(`  criado: ${change.createdAt}`);
  if (change.appliedAt !== undefined && change.appliedAt !== null) lines.push(`  aplicado: ${change.appliedAt}`);
  return lines.join('\n');
}

/** `editor changes`: pending changes + estados (array ou envelope {changes}). */
export function formatChangeList(value: unknown): string {
  const list: ChangeObjectLike[] = Array.isArray(value)
    ? (value as ChangeObjectLike[])
    : ((value as { changes?: ChangeObjectLike[] })?.changes ?? []);
  if (list.length === 0) return 'nenhuma pending change';
  return list.map(formatChangeObject).join('\n');
}

/** `editor change-preview`: Diff (07§42). Se houver campo diff textual, imprime; senão fallback JSON. */
export function formatChangePreview(value: unknown): string {
  if (value !== null && typeof value === 'object' && 'diff' in value) {
    const diff = (value as { diff: unknown }).diff;
    if (typeof diff === 'string') return diff.replace(/\n$/, '');
  }
  return formatGeneric(value);
}

interface ComponentIdentityLike {
  id: string;
  name?: string;
  scope?: string;
  version?: string | null;
  source?: unknown;
}

function extractArray(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (value !== null && typeof value === 'object') {
    const inner = (value as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/** `component list`: ComponentIdentity[] (08§6). */
export function formatComponentList(value: unknown): string {
  const list = extractArray(value, 'components') as ComponentIdentityLike[];
  if (list.length === 0) return 'nenhum componente';
  return list
    .map((c) => {
      const version = c.version !== undefined && c.version !== null ? `  v${c.version}` : '';
      const scope = c.scope !== undefined ? `  [${c.scope}]` : '';
      return `${c.id}  ${c.name ?? '(sem nome)'}${scope}${version}`;
    })
    .join('\n');
}

interface ComponentSchemaLike {
  identity?: ComponentIdentityLike & { source?: unknown };
  props?: { name: string; type?: string; required?: boolean; default?: unknown; description?: string }[];
  variants?: { name: string; values?: string[] }[];
  slots?: { name: string; kind?: string }[];
  events?: string[];
  assets?: string[];
}

/** `component read`: Component Schema completo (M3-CONTRACTS §7). */
export function formatComponentSchema(value: ComponentSchemaLike): string {
  const lines: string[] = [];
  const id = value.identity;
  if (id !== undefined) {
    lines.push(`${id.id}  ${id.name ?? ''}  [${id.scope ?? '?'}]${id.version != null ? `  v${id.version}` : ''}`.trimEnd());
    if (id.source !== undefined) lines.push(`  source: ${JSON.stringify(id.source)}`);
  }
  const props = value.props ?? [];
  if (props.length > 0) {
    lines.push('  props:');
    for (const p of props) {
      const req = p.required === true ? ' (obrigatória)' : '';
      const def = p.default !== undefined ? `  default: ${JSON.stringify(p.default)}` : '';
      const desc = p.description !== undefined ? `  — ${p.description}` : '';
      lines.push(`    ${p.name}: ${p.type ?? '?'}${req}${def}${desc}`);
    }
  }
  const variants = value.variants ?? [];
  if (variants.length > 0) {
    lines.push('  variants:');
    for (const v of variants) lines.push(`    ${v.name}: ${(v.values ?? []).join(' | ')}`);
  }
  const slots = value.slots ?? [];
  if (slots.length > 0) {
    lines.push('  slots:');
    for (const s of slots) lines.push(`    ${s.name}  [${s.kind ?? '?'}]`);
  }
  const events = value.events ?? [];
  if (events.length > 0) lines.push(`  events: ${events.join(', ')}`);
  const assets = value.assets ?? [];
  if (assets.length > 0) lines.push(`  assets: ${assets.join(', ')}`);
  return lines.length > 0 ? lines.join('\n') : formatGeneric(value);
}

interface AssetIdentityLike {
  id: string;
  name?: string;
  fileName?: string;
  mimeType?: string;
  type?: string;
  usageState?: string;
  usage?: string;
  sizeBytes?: number;
  size?: number;
  /** Shape real do AssetIdentity (08§42): name/type/size vivem em metadata. */
  metadata?: { name?: string; type?: string; size?: number };
}

function assetLine(a: AssetIdentityLike): string {
  const name = a.metadata?.name ?? a.name ?? a.fileName ?? '(sem nome)';
  const mime = a.metadata?.type ?? a.mimeType ?? a.type;
  const usage = a.usage ?? a.usageState;
  const size = a.metadata?.size ?? a.sizeBytes ?? a.size;
  return [
    `${a.id}  ${name}`,
    mime !== undefined ? `  ${mime}` : '',
    size !== undefined ? `  ${size}B` : '',
    usage !== undefined ? `  [${usage}]` : '',
  ].join('');
}

/** `media list` / `media search`: AssetIdentity[] com usage state (08§42/§50). */
export function formatMediaList(value: unknown): string {
  const assets = extractArray(value, 'assets');
  const list = (assets.length > 0 ? assets : extractArray(value, 'matches')) as AssetIdentityLike[];
  if (list.length === 0) return 'nenhum asset';
  return list.map(assetLine).join('\n');
}

/**
 * `media read`: metadata completa (08§82, sem secrets). Com includeContent,
 * o binário NÃO é despejado na saída humana — apenas o tamanho (use --json).
 */
export function formatMediaMetadata(value: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, v] of Object.entries(value)) {
    if (key === 'contentBase64' && typeof v === 'string') {
      const bytes = Math.floor((v.length * 3) / 4);
      lines.push(`content: (base64, ~${bytes} bytes — use --json para extrair)`);
    } else if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      lines.push(`${key}: ${String(v)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(v)}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : 'ok';
}

interface DesignTokenLike {
  ref?: string;
  name?: string;
  type?: string;
  value?: unknown;
  source?: unknown;
}

function tokenLine(t: DesignTokenLike): string {
  const ref = t.ref ?? t.name ?? '?';
  const type = t.type !== undefined ? `  [${t.type}]` : '';
  const val = t.value !== undefined ? `  = ${JSON.stringify(t.value)}` : '';
  const src = t.source !== undefined ? `  (${JSON.stringify(t.source)})` : '';
  return `  ${ref}${type}${val}${src}`;
}

/**
 * `design read` / `design token-read`: Design Model (09§51-52) — tokens por
 * tipo, themes detectados, property sources. Defensivo sobre o shape.
 */
export function formatDesignModel(value: unknown): string {
  if (value === null || typeof value !== 'object') return formatGeneric(value);
  const model = value as { tokens?: unknown; themes?: unknown; propertySources?: unknown };
  const lines: string[] = [];
  if (model.tokens !== undefined) {
    if (Array.isArray(model.tokens)) {
      lines.push('tokens:');
      for (const t of model.tokens as DesignTokenLike[]) lines.push(tokenLine(t));
    } else if (typeof model.tokens === 'object' && model.tokens !== null) {
      lines.push('tokens:');
      for (const [type, tokens] of Object.entries(model.tokens as Record<string, unknown>)) {
        lines.push(`  ${type}:`);
        if (Array.isArray(tokens)) {
          for (const t of tokens as DesignTokenLike[]) lines.push(`  ${tokenLine(t)}`);
        }
      }
    }
  }
  if (model.themes !== undefined) {
    lines.push('themes:');
    const themes = model.themes;
    if (Array.isArray(themes)) {
      for (const t of themes as { name?: string; activation?: unknown }[]) {
        const activation = t.activation !== undefined ? `  (ativação: ${JSON.stringify(t.activation)})` : '';
        lines.push(`  ${t.name ?? JSON.stringify(t)}${activation}`);
      }
    } else {
      lines.push(`  ${JSON.stringify(themes)}`);
    }
  }
  if (model.propertySources !== undefined) {
    lines.push(`property sources: ${JSON.stringify(model.propertySources)}`);
  }
  return lines.length > 0 ? lines.join('\n') : formatGeneric(value);
}

/** `theme read`: temas Light/Dark/Brand/Custom + mecanismo de ativação (09§53). */
export function formatThemes(value: unknown): string {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const envelope = value as { themes?: unknown };
    if (envelope.themes !== undefined) return formatThemes(envelope.themes);
  }
  if (!Array.isArray(value) || value.length === 0) return 'nenhum tema detectado';
  return value
    .map((t: { name?: string; activationMechanism?: unknown; activation?: unknown }) => {
      const mech = t.activationMechanism ?? t.activation;
      return `${t.name ?? JSON.stringify(t)}${mech !== undefined ? `  (ativação: ${JSON.stringify(mech)})` : ''}`;
    })
    .join('\n');
}

/** Issues de diagnóstico responsive (09§34-36): severity + certainty + evidence. */
export function formatDiagnosticIssues(value: unknown): string {
  const issues = extractArray(value, 'issues') as DiagnosticLike[];
  if (issues.length === 0) return 'nenhuma issue detectada';
  const lines = [`issues: ${issues.length}`];
  for (const i of issues) {
    const severity = i.severity !== undefined ? `[${i.severity}]` : '[UNKNOWN]';
    const certainty = i.certainty !== undefined ? ` (${i.certainty})` : ' (UNKNOWN)';
    const code = i.code !== undefined ? ` ${i.code}` : '';
    lines.push(`  ${severity}${certainty}${code} ${i.message ?? JSON.stringify(i)}`);
    if (i.evidence !== undefined) lines.push(`    evidência: ${JSON.stringify(i.evidence)}`);
  }
  return lines.join('\n');
}

interface ViewportLike {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  dpr?: number;
  orientation?: string;
}

/** `responsive viewport-create`: Viewport (09§24). */
export function formatViewport(value: ViewportLike): string {
  const lines: string[] = [];
  if (value.id !== undefined) lines.push(`viewport: ${value.id}`);
  if (value.name !== undefined) lines.push(`  name:        ${value.name}`);
  if (value.width !== undefined && value.height !== undefined) {
    lines.push(`  dimensões:   ${value.width}x${value.height}`);
  }
  if (value.dpr !== undefined) lines.push(`  dpr:         ${value.dpr}`);
  if (value.orientation !== undefined) lines.push(`  orientação:  ${value.orientation}`);
  return lines.length > 0 ? lines.join('\n') : formatGeneric(value);
}

/** `responsive preview`: estado do preview via runtime real (09§27) + URL. */
export function formatResponsivePreview(value: unknown): string {
  if (value !== null && typeof value === 'object') {
    const v = value as { url?: string; state?: unknown; status?: unknown };
    const lines: string[] = [];
    if (v.url !== undefined) lines.push(`url: ${v.url}`);
    const state = v.state ?? v.status;
    if (state !== undefined) lines.push(`estado: ${typeof state === 'string' ? state : JSON.stringify(state)}`);
    if (lines.length > 0) {
      const rest = Object.entries(v).filter(([k]) => k !== 'url' && k !== 'state' && k !== 'status');
      for (const [k, val] of rest) {
        lines.push(`${k}: ${val === null || typeof val !== 'object' ? String(val) : JSON.stringify(val)}`);
      }
      return lines.join('\n');
    }
  }
  return formatGeneric(value);
}
