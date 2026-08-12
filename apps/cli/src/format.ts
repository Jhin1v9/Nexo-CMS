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
