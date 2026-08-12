/**
 * Detecção evidence-based (SPEC.md §0/§2 — contratos congelados).
 * Regra global: incerto -> UNKNOWN / nunca inventar.
 */

export type Confidence = 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type SupportLevel =
  | 'FULLY_SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'DETECTED_BUT_UNSUPPORTED'
  | 'UNKNOWN'
  | 'CUSTOM';

/** Resultados parciais explícitos: nunca SUCCESS em parcial (SPEC §0). */
export type OpStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export type Detection<T> = {
  value: T | null;
  confidence: Confidence;
  evidence: string[];
};
