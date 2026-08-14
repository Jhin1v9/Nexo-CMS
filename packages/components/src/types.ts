/**
 * Component Model (doc 08§5-§16/§26/§63/§74 — M3-CONTRACTS §7, FROZEN).
 *
 * Autoridade: M3-CONTRACTS.md §7 (ComponentSchema concreto, D7). Proibido
 * fork privado de contrato. Regras duras respeitadas aqui:
 *  - UNKNOWN/UNSUPPORTED explicito, nunca adivinhado (M3 §8.8; 08§90 item 24):
 *    `ResolvedPropType` admite 'Unknown' ALEM do vocabulario PropType congelado
 *    quando o tipo TS nao e determinavel — tipo indeterminado NUNCA e mapeado
 *    por heuristica de nome (decisao registrada nesta wave).
 *  - Identidade estavel DENTRO do escopo (08§6); Project Component !=
 *    Library Component (08§87): publish gera NOVO id no escopo Library.
 */

// ---------------------------------------------------------------------------
// Identidade e escopo (08§6/§7)
// ---------------------------------------------------------------------------

export type ComponentScope = 'Project' | 'Workspace' | 'Library';

/** Classes de componente (08§5). */
export type ComponentClass =
  | 'NativeProjectComponent'
  | 'NexoLibraryComponent'
  | 'GeneratedProjectComponent'
  | 'ExternalComponent'
  | 'CompositeComponent';

/**
 * Component Source (08§8 — uniao discriminada concreta; a referencia de
 * source deve permanecer rastreavel).
 */
export type ComponentSource =
  | { kind: 'ProjectFile'; path: string }
  | { kind: 'MultipleProjectFiles'; paths: string[] }
  | { kind: 'GeneratedSource'; generator: string; path: string }
  | { kind: 'ExternalScript'; url: string }
  | { kind: 'ExternalWidget'; provider: string; url?: string }
  | { kind: 'LibraryPackage'; packageName: string; version: string }
  | { kind: 'Integration'; provider: string };

/** Identidade estavel do componente dentro do seu escopo (08§6). */
export interface ComponentIdentity {
  id: string;
  name: string;
  scope: ComponentScope;
  source: ComponentSource;
  version: string | null;
}

// ---------------------------------------------------------------------------
// Props / Variants / Slots (08§10-§14)
// ---------------------------------------------------------------------------

/** Vocabulario congelado de tipos de prop (M3-CONTRACTS §7; 08§11). */
export type PropType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Image'
  | 'Video'
  | 'URL'
  | 'Color'
  | 'RichText'
  | 'Enum'
  | 'Array'
  | 'Object'
  | 'ComponentReference'
  | 'Slot';

/**
 * PropType resolvido pela deteccao: 'Unknown' quando o tipo TS nao e
 * determinavel de forma confiavel (M3 §8.8 — nunca adivinhar). 'Unknown'
 * NAO faz parte do vocabulario congelado PropType; e o marcador honesto de
 * indeterminacao (mesma regra de Confidence UNKNOWN de M3-CONTRACTS §5).
 */
export type ResolvedPropType = PropType | 'Unknown';

export interface ComponentProp {
  name: string;
  type: ResolvedPropType;
  default?: unknown;
  required: boolean;
  description?: string;
  /** Regra de validacao machine-readable quando conhecida (ex.: 'oneOf:a|b'). */
  validation?: string;
}

export interface ComponentVariant {
  name: string;
  values: string[];
}

/** Slot (08§14): Fixed Prop vs Composable Slot. */
export interface ComponentSlot {
  name: string;
  kind: 'FixedProp' | 'ComposableSlot';
}

/**
 * PropertySource minimo (doc 09§7 referenciado por M3-CONTRACTS §7 `styles`).
 * O Design Model completo pertence a @nexo/design (skeleton em Wave 2b);
 * aqui fica o espelho estrutural minimo, mesmo padrao de ProjectModelSnapshot.
 */
export interface PropertySource {
  kind: 'TailwindUtility' | 'CssVariable' | 'InlineStyle' | 'Stylesheet' | 'Theme' | 'Unknown';
  reference: string;
}

// ---------------------------------------------------------------------------
// Component Schema (M3-CONTRACTS §7 — EXATO)
// ---------------------------------------------------------------------------

export interface ComponentSchema {
  identity: ComponentIdentity;
  props: ComponentProp[];
  variants: ComponentVariant[];
  slots: ComponentSlot[];
  events: string[];
  assets: string[];
  styles: PropertySource[];
  responsiveRules: unknown[];
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Compatibilidade / Portabilidade (08§16/§63)
// ---------------------------------------------------------------------------

export type CompatibilityResult = 'COMPATIBLE' | 'PARTIAL' | 'INCOMPATIBLE' | 'UNKNOWN';

export type Portability = 'Portable' | 'PartiallyPortable' | 'ProjectSpecific' | 'NonPortable';

// ---------------------------------------------------------------------------
// Dependencias e versao (08§18/§26)
// ---------------------------------------------------------------------------

export interface ComponentDependency {
  kind: 'package' | 'component' | 'asset' | 'utility';
  name: string;
  /** true quando declarada (package.json / registry) — nunca escondida (08§65). */
  declared: boolean;
}

/**
 * Version record (08§26): Component, Version, Source, Dependencies,
 * Compatibility, Changes, Published At. Source carrega SNAPSHOT do conteudo
 * (Library e serializavel e nao depende de arquivo do projeto — 08§62).
 */
export interface ComponentVersion {
  id: string;
  componentId: string;
  version: string;
  source: {
    /** Path do arquivo de origem no momento do publish (rastreabilidade). */
    path?: string;
    contentHash: string;
    snapshot: string;
  };
  dependencies: ComponentDependency[];
  compatibility: CompatibilityResult;
  changes: string[];
  publishedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Library Validation (08§74 — checklist minimo de publicacao)
// ---------------------------------------------------------------------------

export interface PublishCheck {
  pass: boolean;
  detail: string;
}

/** Validacao §74 completa — TODAS as seis verificacoes, sem excecao. */
export interface PublishValidation {
  sourceIntegrity: PublishCheck;
  dependencyResolution: PublishCheck;
  noSecretLeakage: PublishCheck;
  noPrivateReferences: PublishCheck;
  schemaValidity: PublishCheck;
  compatibility: PublishCheck;
}

export function allPublishChecksPass(v: PublishValidation): boolean {
  return (
    v.sourceIntegrity.pass &&
    v.dependencyResolution.pass &&
    v.noSecretLeakage.pass &&
    v.noPrivateReferences.pass &&
    v.schemaValidity.pass &&
    v.compatibility.pass
  );
}

// ---------------------------------------------------------------------------
// Diff (08§22 — component.update retorna Diff; espelho local de 07§42, pois
// @nexo/components NAO pode depender de @nexo/editor — M3-CONTRACTS §2)
// ---------------------------------------------------------------------------

export type ComponentFileDiffStatus = 'Added' | 'Removed' | 'Modified';

export interface ComponentFileDiff {
  file: string;
  before: string | null;
  after: string | null;
  status: ComponentFileDiffStatus;
  /** Linhas presentes somente em `after`. */
  added: string[];
  /** Linhas presentes somente em `before`. */
  removed: string[];
}

export interface ComponentDiff {
  files: ComponentFileDiff[];
}
