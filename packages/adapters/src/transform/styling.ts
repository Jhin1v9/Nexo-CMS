/**
 * StylingAdapter — contrato do write-path M3 para estilo (M3-CONTRACTS §2;
 * doc 09§7-10: design.token.update edita a FONTE do token preservando
 * representacao; Inv. 6/25: mecanismo desconhecido => UNSUPPORTED honesto).
 *
 * Implementacoes desta wave (stack first-class — D6):
 *  - TailwindStylingAdapter (v4: `@import "tailwindcss"` + `@theme`; v3:
 *    tailwind.config.* theme/extend);
 *  - PlainCssStylingAdapter (CSS variables em arquivos .css).
 *
 * Regras duras:
 *  - NUNCA escreve em disco: update* retorna `newContent` do arquivo-fonte.
 *  - NUNCA converte representacao de cor/unidade por preferencia (09§10):
 *    `updateToken` escreve o valor fornecido VERBATIM no range do valor
 *    original; HSL continua HSL, HEX continua HEX, var() continua var().
 *  - Shorthand/longhand preservados (09§18): nada e expandido/colapsado.
 */

import type { Detection } from '@nexo/shared';

import type { AdapterIdentity, DetectionContext } from '../types.js';
import type { TransformDiagnostic, UnsupportedInfo } from './types.js';

export type DesignTokenKind = 'color' | 'spacing' | 'radius' | 'other';

/** Classificacao da representacao COMO ESCRITA (nunca convertemos). */
export type TokenRepresentation =
  | 'hex'
  | 'hsl'
  | 'rgb'
  | 'keyword'
  | 'var'
  | 'length'
  | 'other';

/** Design token com origem exata (doc 09§: token.read retorna arquivo:linha). */
export interface DesignToken {
  /** Referencia canonica do token: '--color-primary' (v4) ou 'colors.primary' (config). */
  tokenRef: string;
  value: string;
  kind: DesignTokenKind;
  representation: TokenRepresentation;
  /** FONTE do token (arquivo relativo ao root + linha 1-based). */
  source: { file: string; line: number };
}

export interface ReadTokensInput {
  /** Path absoluto do Project Root. */
  root: string;
}

export interface UpdateTokenInput {
  /** Path absoluto do Project Root. */
  root: string;
  /**
   * Referencia do token. Formas aceitas:
   *  - Tailwind v4: '--color-primary' ou 'color-primary' (normalizado para '--...');
   *  - Tailwind v3 config: 'colors.primary', 'theme.colors.brand.light',
   *    'spacing.4', 'borderRadius.lg' (prefixo 'theme.' opcional; 'extend.'
   *    tentado como fallback quando a chave nao existe diretamente em theme).
   *  - PlainCss: use updateCssVariable (tokenRef = nome da variavel CSS).
   */
  tokenRef: string;
  /** Novo valor, escrito VERBATIM (sem conversao de formato — 09§10). */
  value: string;
}

export type UtilityClassResult =
  | { ok: true; newClassList: string; diagnostics: [] }
  | {
      ok: false;
      newClassList?: undefined;
      diagnostics: TransformDiagnostic[];
      unsupported?: UnsupportedInfo;
    };

export interface SetUtilityClassInput {
  /** classList atual (string separada por espacos, como no atributo class). */
  classList: string;
  /**
   * Propriedade CSS canonica (ex.: 'color', 'background-color', 'padding',
   * 'border-radius'). Tabela de mapeamento documentada na implementacao;
   * propriedade fora da tabela => UNSUPPORTED honesto.
   */
  property: string;
  /**
   * Valor: nome de token Tailwind (ex.: 'primary', '4', 'lg') => classe
   * `<prefix>-<value>`; valor CSS arbitrario (ex.: '#ff0000', '1.5rem',
   * 'var(--x)') => sintaxe arbitrary `<prefix>-[<value>]`. Valores com
   * espacos => UNSUPPORTED (arbitrary values nao admitem espacos crus).
   */
  value: string;
}

export interface StylingAdapter {
  identity: AdapterIdentity;
  /**
   * Deteccao read-only (mesmo contrato dos adapters M1: nunca muta; value
   * null + evidence quando nao ha sinais — ausencia nao e UNKNOWN inventado).
   */
  detect(ctx: DetectionContext): Promise<Detection<unknown>>;
  /** Le tokens com origem exata (arquivo:linha). Somente leitura. */
  readTokens(input: ReadTokensInput): Promise<DesignToken[]>;
}

// ---------------------------------------------------------------------------
// helpers compartilhados
// ---------------------------------------------------------------------------

/** Classifica a representacao do valor como escrito (sem conversao). */
export function classifyRepresentation(value: string): TokenRepresentation {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return 'hex';
  if (/^hsla?\(/i.test(v)) return 'hsl';
  if (/^rgba?\(/i.test(v)) return 'rgb';
  if (/^var\(/i.test(v)) return 'var';
  if (/^[+-]?[\d.]+(px|rem|em|%|vh|vw|ch|ex|cm|mm|in|pt|pc|svh|lvh|dvh)$/i.test(v)) return 'length';
  if (/^[a-z]+$/i.test(v)) return 'keyword';
  return 'other';
}

/** Kind a partir do nome de token Tailwind v4 ('--color-*', '--radius-*', ...). */
export function kindFromCssVar(name: string): DesignTokenKind {
  if (name.startsWith('--color-')) return 'color';
  if (name.startsWith('--spacing')) return 'spacing';
  if (name.startsWith('--radius')) return 'radius';
  return 'other';
}

/** Kind a partir do grupo de config v3 ('colors'|'spacing'|'borderRadius'). */
export function kindFromConfigGroup(group: string): DesignTokenKind {
  if (group === 'colors') return 'color';
  if (group === 'spacing') return 'spacing';
  if (group === 'borderRadius') return 'radius';
  return 'other';
}
