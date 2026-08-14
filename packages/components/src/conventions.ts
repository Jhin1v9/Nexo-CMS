/**
 * Inspecao de convencoes do projeto (doc 08§21 — "Component Creation Must
 * Use Existing Project Conventions"): Naming, Directory Structure, Imports,
 * Formatting, Styling, Component Patterns, Exports.
 *
 * Estrategia (documentada, deterministica):
 *  - Com componentes existentes detectados (detect.ts), as convencoes sao
 *    derivadas por MAIORIA com evidencia: diretorio alvo = dir com mais
 *    componentes; extensao = majoritaria (.tsx/.jsx); export style =
 *    majoritario (named/default); padrao de props = majoritario
 *    (interface/type-alias/inline); styling via tecnologias detectadas
 *    (tailwind > plain-css > unknown).
 *  - Projeto SEM componentes => convencoes DEFAULT documentadas
 *    (source:'default'): dir 'src/components', extensao '.tsx' (stack
 *    first-class React+TSX — D6), named export, interface `${Name}Props`.
 *    Nunca inventamos uma convencao "fingindo" que ela veio do projeto —
 *    `source` distingue detectado de default.
 */

import type { DetectedTechnology } from '@nexo/adapters';

import type { ComponentDetection } from './detect.js';

export interface ProjectConventions {
  /** Diretorios de componentes detectados no disco (08§21 Directory Structure). */
  componentDirs: string[];
  /** Diretorio alvo para novos componentes. */
  targetDir: string;
  fileExtension: '.tsx' | '.jsx';
  exportStyle: 'named' | 'default';
  /** Padrao de declaracao de props majoritario (interface XProps, type alias, inline). */
  propsPattern: 'interface' | 'type-alias' | 'inline' | 'none';
  styling: 'tailwind' | 'plain-css' | 'unknown';
  /** 'detected' = derivada de componentes reais; 'default' = defaults documentados. */
  source: 'detected' | 'default';
  evidence: string[];
}

/** Diretorio default documentado quando o projeto nao tem componentes (08§21). */
export const DEFAULT_COMPONENT_DIR = 'src/components';

function majority<T extends string>(values: readonly T[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    // empate => vence a primeira ocorrencia alfabetica (deterministico)
    if (c > bestCount || (c === bestCount && best !== null && v < best)) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

function detectStyling(technologies: readonly DetectedTechnology[]): ProjectConventions['styling'] {
  const stylingTechs = technologies.filter((t) => t.category === 'STYLING');
  if (stylingTechs.some((t) => t.technology === 'tailwind')) return 'tailwind';
  if (stylingTechs.some((t) => t.technology === 'plain-css')) return 'plain-css';
  return 'unknown';
}

export function inspectConventions(
  detection: ComponentDetection,
  technologies: readonly DetectedTechnology[],
): ProjectConventions {
  const styling = detectStyling(technologies);
  const evidence: string[] = [];
  if (styling !== 'unknown') evidence.push(`styling:${styling} (adapter M1)`);

  const components = detection.components;
  if (components.length === 0 || detection.componentDirs.length === 0) {
    evidence.push('nenhum componente existente detectado — convencoes DEFAULT documentadas (08§21)');
    return {
      componentDirs: [],
      targetDir: DEFAULT_COMPONENT_DIR,
      fileExtension: '.tsx',
      exportStyle: 'named',
      propsPattern: 'interface',
      styling,
      source: 'default',
      evidence,
    };
  }

  // diretorio alvo: dir com mais componentes (empate => ordem dos candidatos)
  const dirCounts = new Map<string, number>();
  for (const c of components) {
    const dir = c.file.slice(0, c.file.lastIndexOf('/'));
    dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
  }
  let targetDir = detection.componentDirs[0] ?? DEFAULT_COMPONENT_DIR;
  let targetCount = 0;
  for (const dir of detection.componentDirs) {
    const count = [...dirCounts.entries()]
      .filter(([d]) => d === dir || d.startsWith(`${dir}/`))
      .reduce((acc, [, c]) => acc + c, 0);
    if (count > targetCount) {
      targetDir = dir;
      targetCount = count;
    }
  }
  evidence.push(`target-dir:${targetDir} (${targetCount} componente(s) existente(s))`);

  const ext = majority(components.map((c): '.tsx' | '.jsx' => (c.file.endsWith('.jsx') ? '.jsx' : '.tsx')));
  const exportStyle = majority(components.map((c) => c.exportKind));
  const propsPattern = majority(
    components
      .map((c) => c.propsDeclKind)
      .filter((k): k is 'interface' | 'type-alias' | 'inline' => k !== 'none' && k !== 'binding-only'),
  );
  if (ext !== null) evidence.push(`extension:${ext} (maioria)`);
  if (exportStyle !== null) evidence.push(`export-style:${exportStyle} (maioria)`);
  if (propsPattern !== null) evidence.push(`props-pattern:${propsPattern} (maioria)`);

  return {
    componentDirs: [...detection.componentDirs],
    targetDir,
    fileExtension: ext ?? '.tsx',
    exportStyle: exportStyle ?? 'named',
    propsPattern: propsPattern ?? 'interface',
    styling,
    source: 'detected',
    evidence,
  };
}
