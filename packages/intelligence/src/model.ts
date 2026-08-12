/**
 * ProjectModel (SPEC.md §7 — Wave 2C).
 * Modelo de inteligência do projeto: somente o que foi DETECTADO com evidência.
 * Desconhecimento não autoriza invenção (INVARIANTS #6/#25): campos sem sinal
 * ficam com value null + confidence UNKNOWN.
 */

import type { DetectedTechnology } from '@nexo/adapters';
import type { Confidence, Detection, SupportLevel } from '@nexo/shared';

export interface ProjectModel {
  projectId: string;
  rootPath: string;
  analyzedAt: string;
  analysisVersion: 1;
  root: Detection<{ isMonorepo: boolean; packageRoots: string[] }>;
  technologies: DetectedTechnology[];
  packageManager: Detection<{ name: 'npm' | 'pnpm' | 'yarn' | 'bun'; version: string | null }>;
  /** Scripts exatamente como declarados em package.json — NUNCA assumir 'dev'/'build'. */
  scripts: Detection<Record<string, string>>;
  git: Detection<{ isRepo: boolean; branch: string | null }>;
  structure: {
    entryFiles: string[];
    configFiles: string[];
    topLevelDirs: string[];
  };
  /** Agregado das detecções (regras em scanner.ts). */
  support: SupportLevel;
  confidence: Confidence;
}
