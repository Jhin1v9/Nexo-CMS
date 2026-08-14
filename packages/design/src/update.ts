/**
 * design.update (M3-CONTRACTS §3.4; doc 09§7, §74-79).
 *
 * Fluxo OBRIGATORIO antes de mutar (09§75 Scope Resolution):
 *   1. O que e o alvo (token ou elemento)?
 *   2. De onde vem o valor atual (PropertySource — 09§7)?
 *   3. Herdado? tokenizado? component-level? global? (09§74)
 * So entao escolhe a rota de mutacao.
 *
 * Rotas desta wave (stack first-class React+TSX + Tailwind + Plain CSS — D6):
 *  - target token / DesignToken / CssVariable / ThemeConfiguration
 *      -> design.token.update (edita a FONTE — 09§8);
 *  - TailwindUtility -> setUtilityClass (adapter) + setJsxProp className
 *      (transformer) na instancia alvo;
 *  - DirectValue / ComponentProp -> setJsxProp com propName explicito;
 *  - InlineStyle -> UNSUPPORTED honesto: o transformer desta wave emite
 *    atributos string/number/boolean; `style="..."` em React seria semantic-
 *    amente errado (fake) e editar objeto style exige nova operacao de adapter
 *    (fronteria: design NAO implementa parser de framework — 09§5);
 *  - StyledComponentRule -> UNSUPPORTED (stack detection-only — D6);
 *  - Unknown -> UnknownPropertySource EXIGINDO escolha explicita (09§7).
 *
 * 09§56: se a utility atual e TOKEN-LIGADA (ex.: 'bg-primary') e o novo valor
 * seria ARBITRARIO (ex.: 'bg-[#ff0000]'), a operacao desanexa a instancia do
 * token compartilhado => exige `explicitDetach: true` (intencao explicita).
 *
 * Impact report ANTES de mutar (09§78-79): para token, usos do token; para
 * utility, usos da classe atual em OUTROS arquivos (selector compartilhado).
 */

import { createReactTsxTransformer, createTailwindStylingAdapter } from '@nexo/adapters';
import type { ElementSelector, TransformResult } from '@nexo/adapters';
import { err, ok, type Result } from '@nexo/shared';

import { designError } from './errors.js';
import { buildClassImpactReport } from './impact.js';
import { guardPath, writeFileVerified, type ProjectFs } from './paths.js';
import { updateToken } from './token.js';
import type { ImpactReport, PropertySource } from './types.js';
import type { TokenUpdateResult } from './token.js';

// ---------------------------------------------------------------------------
// contrato
// ---------------------------------------------------------------------------

export interface DesignUpdateTokenTarget {
  kind: 'token';
  tokenRef: string;
}

/**
 * Alvo elemento (React/TSX). `propertySource` DEVE vir resolvido a montante
 * (selection/read do editor, 09§7/§75): design.update NUNCA adivinha a fonte.
 */
export interface DesignUpdateElementTarget {
  kind: 'element';
  /** Arquivo .tsx/.jsx relativo ao Project Root. */
  file: string;
  elementSelector: ElementSelector;
  propertySource: PropertySource;
  /** classList ATUAL da instancia (obrigatorio para TailwindUtility). */
  classList?: string;
  /** tokenRef da FONTE (obrigatorio para CssVariable/DesignToken/ThemeConfiguration). */
  tokenRef?: string;
  /** Prop JSX alvo (obrigatorio para DirectValue/ComponentProp). */
  propName?: string;
  /** 09§56: confirma desanexar a instancia de utility token-ligada. */
  explicitDetach?: boolean;
}

export type DesignUpdateTarget = DesignUpdateTokenTarget | DesignUpdateElementTarget;

export interface DesignUpdateInput {
  projectId: string;
  target: DesignUpdateTarget;
  /** Propriedade CSS canonica (ex.: 'color', 'background-color', 'padding'). */
  property: string;
  /** Novo valor (verbatim; para utility: token name ou valor CSS arbitrario). */
  value: string;
}

export interface DesignUpdateResult {
  updated: true;
  route: 'token-source' | 'tailwind-utility' | 'jsx-prop';
  propertySource: PropertySource;
  filesChanged: string[];
  impact: ImpactReport;
  verified: true;
  /** Presente na rota token-source (detalhe da edicao da FONTE). */
  token?: TokenUpdateResult;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Utility token-ligada: classe `<prefix>-<nome>` NAO arbitraria (sem '['). */
function findTokenLinkedClass(classList: string, prefix: string): string | null {
  for (const c of classList.split(/\s+/)) {
    if (c.startsWith(`${prefix}-`) && !c.startsWith(`${prefix}-[`)) return c;
  }
  return null;
}

function mapTransformFailure(result: TransformResult, resource: string) {
  const first = result.diagnostics[0];
  const code = first?.code ?? 'INTERNAL';
  if (code === 'UNSUPPORTED' || result.unsupported !== undefined) {
    return designError('UnsupportedMechanism', first?.message ?? 'mecanismo nao suportado', {
      resource,
      details: { diagnostics: result.diagnostics, unsupported: result.unsupported },
    });
  }
  return designError('MissingInput', first?.message ?? 'falha na transformacao', {
    resource,
    details: { diagnostics: result.diagnostics },
  });
}

// ---------------------------------------------------------------------------
// design.update
// ---------------------------------------------------------------------------

export async function designUpdate(
  fsCtx: ProjectFs,
  input: DesignUpdateInput,
): Promise<Result<DesignUpdateResult>> {
  if (typeof input.property !== 'string' || input.property.trim() === '') {
    return err(designError('MissingInput', 'property (CSS canonica) e obrigatoria', {}));
  }
  if (typeof input.value !== 'string' || input.value.trim() === '') {
    return err(designError('MissingInput', 'value deve ser string nao vazia', {}));
  }

  // -- rota 1: alvo token explicito ------------------------------------------
  if (input.target.kind === 'token') {
    const token = await updateToken(fsCtx, {
      tokenRef: input.target.tokenRef,
      value: input.value,
    });
    if (!token.ok) return err(token.error);
    return ok({
      updated: true,
      route: 'token-source',
      propertySource: 'DesignToken',
      filesChanged: token.value.filesChanged,
      impact: token.value.impact,
      verified: true,
      token: token.value,
    });
  }

  const target = input.target;
  const propertySource: PropertySource = target.propertySource;

  // -- rota 2: fontes tokenizadas delegam ao token.update (09§8) -------------
  if (
    propertySource === 'CssVariable' ||
    propertySource === 'DesignToken' ||
    propertySource === 'ThemeConfiguration'
  ) {
    if (target.tokenRef === undefined || target.tokenRef.trim() === '') {
      return err(
        designError(
          'MissingInput',
          `PropertySource ${propertySource} exige target.tokenRef (a FONTE a editar — 09§8); sem ele nao adivinhamos o token`,
          { resource: target.file },
        ),
      );
    }
    const token = await updateToken(fsCtx, { tokenRef: target.tokenRef, value: input.value });
    if (!token.ok) return err(token.error);
    return ok({
      updated: true,
      route: 'token-source',
      propertySource,
      filesChanged: token.value.filesChanged,
      impact: token.value.impact,
      verified: true,
      token: token.value,
    });
  }

  // -- rota 3: TailwindUtility ------------------------------------------------
  if (propertySource === 'TailwindUtility') {
    if (target.classList === undefined) {
      return err(
        designError(
          'MissingInput',
          'Rota TailwindUtility exige target.classList (classList atual da instancia; o Nexo nao re-deriva atributos fora do adapter)',
          { resource: target.file },
        ),
      );
    }
    const tailwind = createTailwindStylingAdapter();
    const util = tailwind.setUtilityClass({
      classList: target.classList,
      property: input.property,
      value: input.value,
    });
    if (!util.ok) {
      return err(
        designError('UnsupportedMechanism', util.diagnostics[0]?.message ?? 'propriedade sem mapeamento Tailwind', {
          resource: input.property,
          details: { diagnostics: util.diagnostics, unsupported: util.unsupported },
        }),
      );
    }

    // 09§56: desanexar de token-ligada exige intencao explicita
    const newClass = util.newClassList.split(/\s+/).pop() ?? '';
    const prefix = newClass.split('-')[0] ?? '';
    const currentLinked = findTokenLinkedClass(target.classList, prefix);
    const newIsArbitrary = newClass.startsWith(`${prefix}-[`);
    if (currentLinked !== null && newIsArbitrary && target.explicitDetach !== true) {
      return err(
        designError(
          'DetachRequiresIntent',
          `A utility atual '${currentLinked}' e ligada a um token compartilhado; o novo valor geraria a classe arbitraria '${newClass}' e DESANEXARIA esta instancia do token (09§56). Confirme com explicitDetach:true ou edite a FONTE do token via design.token.update.`,
          { resource: target.file, requiresApproval: true, details: { currentClass: currentLinked, newClass } },
        ),
      );
    }

    // impact: a classe ATUAL e compartilhada? (09§78 '.button → 17 usages')
    const impact =
      currentLinked !== null
        ? await buildClassImpactReport(fsCtx.rootAbs, currentLinked, target.file)
        : ({
            target: `${input.property} em <${target.elementSelector.componentName ?? target.elementSelector.jsxTag ?? '?'}> (${target.file})`,
            usagesCount: 0,
            scannedFiles: 0,
            affectedFiles: [],
            affectedComponents: [],
            affectedPages: [],
            affectedTokens: [],
            affectedInstances: 1,
            entries: [],
            notes: [
              'Edicao instance-scoped (utility arbitraria desta instancia); nenhuma classe compartilhada removida.',
            ],
          } satisfies ImpactReport);

    const abs = await guardPath(fsCtx, target.file);
    if (!abs.ok) return err(abs.error);
    const transformer = createReactTsxTransformer();
    const result = await transformer.setJsxProp({
      file: abs.value,
      elementSelector: target.elementSelector,
      propName: 'className',
      value: util.newClassList,
    });
    if (!result.ok || result.newContent === undefined) {
      return err(mapTransformFailure(result, target.file));
    }
    const written = await writeFileVerified(fsCtx, result.file ?? target.file, result.newContent);
    if (!written.ok) return err(written.error);
    return ok({
      updated: true,
      route: 'tailwind-utility',
      propertySource,
      filesChanged: [written.value.file],
      impact,
      verified: true,
    });
  }

  // -- rota 4: DirectValue / ComponentProp (setJsxProp) ------------------------
  if (propertySource === 'DirectValue' || propertySource === 'ComponentProp') {
    if (target.propName === undefined || target.propName.trim() === '') {
      return err(
        designError(
          'MissingInput',
          `Rota ${propertySource} exige target.propName (prop JSX que carrega o valor direto)`,
          { resource: target.file },
        ),
      );
    }
    const abs = await guardPath(fsCtx, target.file);
    if (!abs.ok) return err(abs.error);
    const transformer = createReactTsxTransformer();
    const result = await transformer.setJsxProp({
      file: abs.value,
      elementSelector: target.elementSelector,
      propName: target.propName,
      value: input.value,
    });
    if (!result.ok || result.newContent === undefined) {
      return err(mapTransformFailure(result, target.file));
    }
    const written = await writeFileVerified(fsCtx, result.file ?? target.file, result.newContent);
    if (!written.ok) return err(written.error);
    const impact: ImpactReport = {
      target: `${target.propName} em <${target.elementSelector.componentName ?? target.elementSelector.jsxTag ?? '?'}> (${target.file})`,
      usagesCount: 0,
      scannedFiles: 0,
      affectedFiles: [written.value.file],
      affectedComponents: [written.value.file],
      affectedPages: [],
      affectedTokens: [],
      affectedInstances: 1,
      entries: [],
      notes: [
        'Edicao instance-scoped: apenas o atributo da instancia selecionada foi alterado (09§74: nao toca estilo global/component-level).',
        'Cascade awareness (09§76-77): computed != source; o efeito final depende de cascata/media queries.',
      ],
    };
    return ok({
      updated: true,
      route: 'jsx-prop',
      propertySource,
      filesChanged: [written.value.file],
      impact,
      verified: true,
    });
  }

  // -- rotas honestamente UNSUPPORTED -----------------------------------------
  if (propertySource === 'InlineStyle') {
    return err(
      designError(
        'UnsupportedMechanism',
        'Edicao de inline style (style={{ ... }}) nao suportada nesta wave: o ReactTsxTransformer emite apenas atributos string/number/boolean e um style="..." seria semanticamente errado em React. Edite o objeto style no code editor (operacao de adapter dedicada fica para wave futura).',
        { resource: target.file, details: { mechanism: 'react-inline-style-object' } },
      ),
    );
  }
  if (propertySource === 'StyledComponentRule') {
    return err(
      designError(
        'UnsupportedMechanism',
        'styled-components e detection-only no M3 (D6): regras css`` nao tem write-path nesta wave',
        { resource: target.file, details: { mechanism: 'styled-components' } },
      ),
    );
  }

  // -- Unknown: NUNCA adivinhar (09§7) -----------------------------------------
  return err(
    designError(
      'UnknownPropertySource',
      'PropertySource desconhecido/ausente: resolva a fonte do valor ANTES de mutar (09§7/§75) e informe target.propertySource explicitamente',
      {
        resource: target.file,
        details: {
          knownSources: [
            'DirectValue',
            'CssVariable',
            'DesignToken',
            'TailwindUtility',
            'ThemeConfiguration',
            'ComponentProp',
            'StyledComponentRule',
            'InlineStyle',
          ],
        },
      },
    ),
  );
}
