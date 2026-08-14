/**
 * Helpers PUROS da área /components (sem React — testáveis em node).
 * Regras: Unknown nunca é adivinhado (M3 §8.8); rótulos textuais sempre
 * acompanham cor (cor nunca é o único canal — 07 §54).
 */

import type { BadgeTone } from '../../components/ui';
import type {
  ComponentIdentity,
  ComponentSource,
  ComponentScope,
  PropType,
  PublishCheck,
  PublishValidation,
} from '../../api/hooks';

/** Tom do badge de escopo (08§6). Texto do escopo é sempre renderizado junto. */
export function scopeTone(scope: ComponentScope): BadgeTone {
  switch (scope) {
    case 'Project':
      return 'primary';
    case 'Workspace':
      return 'warning';
    case 'Library':
      return 'success';
  }
}

/** Rótulo legível do Component Source (08§8 — união discriminada concreta). */
export function componentSourceLabel(source: ComponentSource): string {
  switch (source.kind) {
    case 'ProjectFile':
      return source.path;
    case 'MultipleProjectFiles':
      return `${source.paths.length} arquivos (${source.paths[0] ?? '—'})`;
    case 'GeneratedSource':
      return `Gerado (${source.generator}): ${source.path}`;
    case 'ExternalScript':
      return `Script externo: ${source.url}`;
    case 'ExternalWidget':
      return `Widget externo: ${source.provider}`;
    case 'LibraryPackage':
      return `${source.packageName}@${source.version}`;
    case 'Integration':
      return `Integração: ${source.provider}`;
  }
}

/** Versão para exibição — null vira marcador honesto, nunca inventado. */
export function versionLabel(version: string | null): string {
  return version ?? 'sem versão';
}

/** Vocabulário congelado de PropType (M3-CONTRACTS §7) — opções do editor de props. */
export const PROP_TYPE_OPTIONS: readonly PropType[] = [
  'String',
  'Number',
  'Boolean',
  'Image',
  'Video',
  'URL',
  'Color',
  'RichText',
  'Enum',
  'Array',
  'Object',
  'ComponentReference',
  'Slot',
];

/** default de prop serializável: literais JSON; demais -> string de exibição. */
export function propDefaultLabel(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[valor não serializável]';
  }
}

export interface PublishCheckEntry {
  key: keyof PublishValidation;
  label: string;
  check: PublishCheck;
}

/** As 6 verificações de publish (08§74) em ordem fixa — nenhuma omitida. */
export function publishCheckEntries(validation: PublishValidation): PublishCheckEntry[] {
  return [
    { key: 'sourceIntegrity', label: 'Source Integrity', check: validation.sourceIntegrity },
    { key: 'dependencyResolution', label: 'Dependency Resolution', check: validation.dependencyResolution },
    { key: 'noSecretLeakage', label: 'No Secret Leakage', check: validation.noSecretLeakage },
    { key: 'noPrivateReferences', label: 'No Private References', check: validation.noPrivateReferences },
    { key: 'schemaValidity', label: 'Schema Validity', check: validation.schemaValidity },
    { key: 'compatibility', label: 'Compatibility', check: validation.compatibility },
  ];
}

/** Extrai PublishValidation de details de erro (bloqueio §74) — ou undefined. */
export function publishValidationFromDetails(details: Record<string, unknown> | undefined): PublishValidation | undefined {
  const v = details?.['publishValidation'];
  if (typeof v === 'object' && v !== null && 'sourceIntegrity' in v) return v as PublishValidation;
  return undefined;
}

export interface ImpactBlockSummary {
  label: string;
  items: string[];
}

/** Blocos não-vazios da impact analysis (08§23) para exibição antes do delete. */
export function impactBlocks(impact: {
  references: { file: string; line: number }[];
  routes: string[];
  pages: string[];
  otherComponents: string[];
  exports: string[];
  tests: string[];
  assets: string[];
}): ImpactBlockSummary[] {
  const blocks: ImpactBlockSummary[] = [];
  if (impact.references.length > 0) {
    blocks.push({
      label: `Referências (${impact.references.length})`,
      items: impact.references.map((r) => `${r.file}:${r.line}`),
    });
  }
  if (impact.routes.length > 0) blocks.push({ label: `Rotas (${impact.routes.length})`, items: impact.routes });
  if (impact.pages.length > 0) blocks.push({ label: `Páginas (${impact.pages.length})`, items: impact.pages });
  if (impact.otherComponents.length > 0)
    blocks.push({ label: `Outros componentes (${impact.otherComponents.length})`, items: impact.otherComponents });
  if (impact.exports.length > 0) blocks.push({ label: `Exports (${impact.exports.length})`, items: impact.exports });
  if (impact.tests.length > 0) blocks.push({ label: `Testes (${impact.tests.length})`, items: impact.tests });
  if (impact.assets.length > 0)
    blocks.push({ label: `Assets usados pelo componente — reportados, nunca deletados (${impact.assets.length})`, items: impact.assets });
  return blocks;
}

/** Filtro local por escopo (além do filtro server-side) — identidades fiéis. */
export function filterByScope(list: ComponentIdentity[], scope: ComponentScope | 'all'): ComponentIdentity[] {
  if (scope === 'all') return list;
  return list.filter((c) => c.scope === scope);
}

/** Impacto parcial carregado em details de erro DeleteBlockedByReferences (08§23). */
export interface BlockedImpact {
  referenceCount: number;
  references: { file: string; line: number; kind: string }[];
  routes: string[];
  pages: string[];
  otherComponents: string[];
  exports: string[];
  tests: string[];
  assets: string[];
}

/**
 * Extrai o impacto de um erro ControlPlaneError do component.delete.
 * - kind 'blocked': DeleteBlockedByReferences -> exige confirm:true.
 * - kind 'unknown-impact': DeleteBlockedImpactUnknown -> delete bloqueado,
 *   sem caminho de confirmação (impacto Unknown nunca = sem referências).
 * - null: outro erro.
 */
export function blockedImpactFromError(error: unknown): { kind: 'blocked'; impact: BlockedImpact } | { kind: 'unknown-impact'; scannedFiles: number; skippedFiles: number } | null {
  if (typeof error !== 'object' || error === null) return null;
  const details = (error as { shape?: { details?: Record<string, unknown> } }).shape?.details;
  if (details === undefined) return null;
  const kindTag = details['componentError'];
  if (kindTag === 'DeleteBlockedImpactUnknown') {
    return {
      kind: 'unknown-impact',
      scannedFiles: typeof details['scannedFiles'] === 'number' ? details['scannedFiles'] : 0,
      skippedFiles: typeof details['skippedFiles'] === 'number' ? details['skippedFiles'] : 0,
    };
  }
  if (kindTag !== 'DeleteBlockedByReferences') return null;
  const rawImpact = (details['impact'] ?? {}) as Record<string, unknown>;
  const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const rawRefs = Array.isArray(details['references']) ? details['references'] : [];
  return {
    kind: 'blocked',
    impact: {
      referenceCount: typeof details['referenceCount'] === 'number' ? details['referenceCount'] : rawRefs.length,
      references: rawRefs
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          file: typeof r['file'] === 'string' ? r['file'] : '?',
          line: typeof r['line'] === 'number' ? r['line'] : 0,
          kind: typeof r['kind'] === 'string' ? r['kind'] : 'text',
        })),
      routes: asStrings(rawImpact['routes']),
      pages: asStrings(rawImpact['pages']),
      otherComponents: asStrings(rawImpact['otherComponents']),
      exports: asStrings(rawImpact['exports']),
      tests: asStrings(rawImpact['tests']),
      assets: asStrings(rawImpact['assets']),
    },
  };
}
