/**
 * Adapter Contract (SPEC.md §6 — Wave 2C).
 *
 * Invariantes (INVARIANTS.md):
 *  - #5: Adapters são a fronteira da especialização tecnológica.
 *  - #6/#25: desconhecimento não autoriza invenção — adapter sem sinais retorna
 *    Detection com value null e o registry NÃO emite detecção (ausência ≠ UNKNOWN inventado).
 *  - Discovery NUNCA muta o projeto: detect() é read-only sobre DetectionContext.
 */

import type { Confidence, Detection, SupportLevel } from '@nexo/shared';

export type AdapterCategory = 'FRAMEWORK' | 'STYLING' | 'PACKAGE_MANAGER' | 'BUILD' | 'TEST';

export type AdapterCapabilityLevel =
  | 'FULL'
  | 'PARTIAL'
  | 'READ_ONLY'
  | 'EXPERIMENTAL'
  | 'UNSUPPORTED';

export interface AdapterIdentity {
  id: string;
  name: string;
  category: AdapterCategory;
  adapterVersion: string;
}

/**
 * Entrada de diretório mínima (shape alinhado a SPEC §4 DirEntry).
 * Definido aqui (não em runtime) porque adapters depende apenas de @nexo/shared (SPEC §6).
 */
export interface DirEntry {
  name: string;
  kind: 'file' | 'dir' | 'symlink' | 'other';
  size?: number;
  mtime?: string;
}

/**
 * Contexto de detecção read-only. Implementações tolerantes a erro:
 * readFile retorna null em ausência; listDir retorna [] em ausência.
 * NENHUMA operação escreve no projeto (discovery nunca muta).
 */
export interface DetectionContext {
  root: string;
  readFile(rel: string): Promise<string | null>;
  exists(rel: string): Promise<boolean>;
  listDir(rel?: string): Promise<DirEntry[]>;
}

/**
 * Valor padronizado retornado pelos adapters M1 dentro de Detection<unknown>.
 * version: range declarado em package.json (ex.: "^19.1.0") ou versão exata do
 * campo packageManager; null quando não há fonte declarativa de versão.
 */
export interface AdapterDetectionValue {
  version: string | null;
  details?: Record<string, unknown>;
}

export interface Adapter {
  identity: AdapterIdentity;
  /** NUNCA muta; evidence obrigatória quando value !== null. */
  detect(ctx: DetectionContext): Promise<Detection<unknown>>;
  getCapabilities(): AdapterCapabilityLevel;
  analyze?(ctx: DetectionContext): Promise<Record<string, unknown>>;
}

/** Tecnologia detectada, normalizada pelo AdapterRegistry (SPEC §6). */
export interface DetectedTechnology {
  technology: string;
  category: AdapterCategory;
  confidence: Confidence;
  support: SupportLevel;
  evidence: string[];
  version: string | null;
  adapterId: string;
  adapterVersion: string;
}

/**
 * Mapeamento capability level -> support (regra documentada M1):
 *  - FULL -> FULLY_SUPPORTED
 *  - PARTIAL | READ_ONLY | EXPERIMENTAL -> PARTIALLY_SUPPORTED
 *    (M1 é detection/read-only: sabemos detectar e ler, ainda não escrevemos)
 *  - UNSUPPORTED -> DETECTED_BUT_UNSUPPORTED (detectamos, mas o Nexo M1 não
 *    oferece nenhuma capability para a tecnologia — nunca inventar suporte).
 */
export function capabilityLevelToSupport(level: AdapterCapabilityLevel): SupportLevel {
  switch (level) {
    case 'FULL':
      return 'FULLY_SUPPORTED';
    case 'PARTIAL':
    case 'READ_ONLY':
    case 'EXPERIMENTAL':
      return 'PARTIALLY_SUPPORTED';
    case 'UNSUPPORTED':
      return 'DETECTED_BUT_UNSUPPORTED';
  }
}
