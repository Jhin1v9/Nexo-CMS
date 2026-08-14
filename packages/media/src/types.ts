/**
 * Media Model (doc 08§41/§42/§43/§50/§82 — M3-CONTRACTS §3.3).
 *
 * - AssetIdentity: identidade estável do asset onde o Nexo o rastreia (08§42).
 * - AssetOrigin distingue arquivo local de recurso remoto (08§43/§55).
 * - UsageState: `Unknown` NUNCA é tratado como `Unused` (08§50, M3 §8.8).
 * - AssetMetadata (08§82): NUNCA contém secrets.
 */

/** Classes de asset suportadas (08§41). */
export type AssetType =
  | 'Image'
  | 'SVG'
  | 'Video'
  | 'Audio'
  | 'Font'
  | 'PDF'
  | 'Document'
  | 'Other';

/** Origens possíveis de um asset (08§43). */
export type AssetOrigin =
  | 'LocalProject'
  | 'UploadedFile'
  | 'GeneratedFile'
  | 'ExternalURL'
  | 'CDN'
  | 'Library'
  | 'Integration';

/** Origens que correspondem a um arquivo local dentro do Project Root. */
export const LOCAL_ORIGINS: readonly AssetOrigin[] = ['LocalProject', 'UploadedFile', 'GeneratedFile'];

/** Origens remotas: NUNCA deletar/modificar como se fossem arquivo local (08§55). */
export const REMOTE_ORIGINS: readonly AssetOrigin[] = ['ExternalURL', 'CDN'];

/** Estados de uso (08§50). `Unknown` nunca vira `Unused`. */
export type UsageState = 'Used' | 'Unused' | 'Unknown' | 'External' | 'Generated';

/** Escopo do asset (alinhado ao escopo de componentes, M3-CONTRACTS §7). */
export type AssetScope = 'Project' | 'Workspace' | 'Library';

/** Confidence de referência textual (vocabulário de M3-CONTRACTS §5). */
export type ReferenceConfidence = 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN';

/** Como a referência aparece no arquivo (import/src/href/url()/texto). */
export type ReferenceKind = 'import' | 'src' | 'href' | 'css-url' | 'text';

export interface AssetDimensions {
  width: number;
  height: number;
}

/**
 * Origem concreta do asset (08§42 "Source" + 08§43):
 * - local: `path` relativo ao Project Root;
 * - remota: `url` absoluta (http/https) — apenas a referência é gerenciada (08§55).
 */
export interface AssetSource {
  origin: AssetOrigin;
  path?: string;
  url?: string;
}

/** Ocorrência real de referência ao asset num arquivo do projeto (08§49). */
export interface AssetReference {
  /** Path do arquivo referenciador, relativo ao Project Root. */
  filePath: string;
  /** Linha 1-based da ocorrência. */
  line: number;
  kind: ReferenceKind;
  /** Texto exato encontrado que referencia o asset. */
  matchedText: string;
  /**
   * HIGH_CONFIDENCE: match do path completo do asset (relativo ao root ou URL
   * pública derivada de public/). PARTIAL: match somente do basename (pode ser
   * coincidental — nunca reescrito automaticamente).
   */
  confidence: ReferenceConfidence;
}

/** Metadata de mídia (08§82). NUNCA contém secrets. */
export interface AssetMetadata {
  name: string;
  type: AssetType;
  /** MIME real detectado por magic bytes (08§45 — nunca pela extensão). */
  mime: string;
  dimensions?: AssetDimensions;
  /** Tamanho em bytes. */
  size: number;
  source: AssetSource;
  altText?: string;
  caption?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  references: AssetReference[];
}

/** Estado de uso com evidência: estado sem scan confiável é `Unknown`. */
export interface AssetUsage {
  state: UsageState;
  /** Confidence do scan que determinou o estado; UNKNOWN quando nunca escaneado. */
  confidence: ReferenceConfidence | 'UNKNOWN';
  /** ISO 8601 do último scan de referências; ausente se nunca escaneado. */
  scannedAt?: string;
}

/** Identidade estável do asset (08§42) + estado de uso (08§50). */
export interface AssetIdentity {
  id: string;
  type: AssetType;
  source: AssetSource;
  metadata: AssetMetadata;
  dimensions?: AssetDimensions;
  references: AssetReference[];
  scope: AssetScope;
  usage: AssetUsage;
}

/** Patch de metadata permitido em media.update (08§82 — alt text, caption, name). */
export interface AssetMetadataPatch {
  name?: string;
  altText?: string;
  caption?: string;
}
