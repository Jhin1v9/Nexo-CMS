/**
 * PlainCssStylingAdapter — write-path M3 para Plain CSS via CSS custom
 * properties (stack first-class, D6; doc 09§7-10/§18).
 *
 * Mecanismo suportado: arquivos .css do projeto com declaracoes de variaveis
 * (`--name: value;`) — tokens lidos preferencialmente de `:root`, edicao em
 * qualquer regra desde que o alvo seja UNICO.
 *
 * Parse: textual cuidadoso (ver css-source.ts — escopo e limitacoes
 * documentados la; sem deps novas, sem AST CSS disponivel no repo).
 *
 * Regras duras:
 *  - NUNCA escreve em disco: updateCssVariable retorna `newContent`.
 *  - Shorthand/longhand preservados (09§18): substituimos APENAS o range do
 *    valor da custom property alvo; nada ao redor e expandido/colapsado.
 *  - Representacao preservada (09§10): valor novo escrito verbatim.
 *  - Multiplas definicoes da mesma variavel: se exatamente UMA esta em
 *    `:root`, ela e a fonte; caso contrario => AMBIGUOUS_TARGET (nunca
 *    adivinhamos qual cascata o usuario quer).
 *  - Pos-edicao: o resultado e re-parseado (declaracao alvo presente com o
 *    novo valor + chaves balanceadas) antes de retornar; falha => ok=false.
 */

import { readFile } from 'node:fs/promises';

import type { Detection } from '@nexo/shared';

import { createNodeDetectionContext, findFiles } from '../fs-context.js';
import type { AdapterIdentity, DetectionContext } from '../types.js';
import { bracesBalanced, parseCssDeclarations, type CssDeclaration } from './css-source.js';
import type {
  DesignToken,
  ReadTokensInput,
  StylingAdapter,
} from './styling.js';
import { classifyRepresentation } from './styling.js';
import { diag, failTransform, okTransform, type TransformResult } from './types.js';

export interface UpdateCssVariableInput {
  /** Path absoluto do arquivo .css. */
  file: string;
  /** Nome da variavel; '--' inicial opcional (normalizado: '--' e prefixado). */
  name: string;
  /** Novo valor, escrito VERBATIM (sem conversao — 09§10). */
  value: string;
}

export interface PlainCssStylingAdapter extends StylingAdapter {
  updateCssVariable(input: UpdateCssVariableInput): Promise<TransformResult>;
}

interface CssFileDecls {
  rel: string;
  content: string;
  decls: CssDeclaration[];
}

async function readCssFilesWithVars(ctx: DetectionContext): Promise<CssFileDecls[]> {
  const cssFiles = await findFiles(
    ctx,
    (rel) => rel.endsWith('.css'),
    { maxDepth: 6, ignoreDirs: ['node_modules', '.git', 'dist'], maxResults: 100 },
  );
  const out: CssFileDecls[] = [];
  for (const rel of cssFiles) {
    const content = await ctx.readFile(rel);
    if (content === null) continue;
    const decls = parseCssDeclarations(content).filter((d) => d.property.startsWith('--'));
    if (decls.length > 0) out.push({ rel, content, decls });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

export function createPlainCssStylingAdapter(): PlainCssStylingAdapter {
  const identity: AdapterIdentity = {
    id: 'plain-css-styling',
    name: 'Plain CSS (write-path)',
    category: 'STYLING',
    adapterVersion: '0.0.0',
  };

  return {
    identity,

    async detect(ctx: DetectionContext): Promise<Detection<unknown>> {
      const files = await readCssFilesWithVars(ctx);
      if (files.length === 0) {
        return { value: null, confidence: 'UNKNOWN', evidence: [] };
      }
      const evidence = files.map(
        (f) => `file:${f.rel} (${f.decls.length} custom properties)`,
      );
      return {
        value: {
          version: null,
          details: { cssFiles: files.map((f) => f.rel) },
        },
        confidence: 'HIGH',
        evidence,
      };
    },

    async readTokens(input: ReadTokensInput): Promise<DesignToken[]> {
      const ctx = createNodeDetectionContext(input.root);
      const files = await readCssFilesWithVars(ctx);
      const tokens: DesignToken[] = [];
      for (const f of files) {
        for (const d of f.decls) {
          // tokens de design = variaveis GLOBAIS (:root); variaveis locais de
          // componente nao sao design tokens (decisao documentada; 09§51).
          if (d.selector !== ':root') continue;
          tokens.push({
            tokenRef: d.property,
            value: d.value,
            kind: 'other',
            representation: classifyRepresentation(d.value),
            source: { file: f.rel, line: d.line },
          });
        }
      }
      return tokens;
    },

    async updateCssVariable(input: UpdateCssVariableInput): Promise<TransformResult> {
      const name = input.name.startsWith('--') ? input.name : `--${input.name}`;
      if (!/^--[A-Za-z0-9_-]+$/.test(name)) {
        return failTransform([diag('INVALID_INPUT', `nome de variavel CSS invalido: ${input.name}`)]);
      }
      if (!input.file.endsWith('.css')) {
        return failTransform(
          [diag('UNSUPPORTED', `updateCssVariable suporta apenas arquivos .css; recebido: ${input.file}`, { file: input.file })],
          { reason: 'extensao fora do mecanismo Plain CSS', mechanism: 'non-css' },
        );
      }

      let content: string;
      try {
        content = await readFile(input.file, 'utf8');
      } catch {
        return failTransform([
          diag('INVALID_INPUT', `arquivo nao legivel: ${input.file}`, { file: input.file }),
        ]);
      }

      const matches = parseCssDeclarations(content).filter((d) => d.property === name);
      if (matches.length === 0) {
        return failTransform([
          diag('TARGET_NOT_FOUND', `variavel ${name} nao encontrada em ${input.file}`, { file: input.file }),
        ]);
      }
      let target: CssDeclaration | undefined;
      if (matches.length === 1) {
        target = matches[0];
      } else {
        const inRoot = matches.filter((d) => d.selector === ':root');
        if (inRoot.length === 1) {
          target = inRoot[0];
        } else {
          return failTransform(
            matches.map((d) =>
              diag(
                'AMBIGUOUS_TARGET',
                `variavel ${name} definida ${matches.length}x em ${input.file} (linha ${d.line}, seletor ${d.selector ?? '?'}); refine o alvo`,
                { file: input.file, line: d.line },
              ),
            ),
          );
        }
      }
      if (target === undefined) {
        return failTransform([diag('INTERNAL', 'falha interna na selecao do alvo', { file: input.file })]);
      }

      // substitui SOMENTE o range do valor (09§10/§18)
      const newContent =
        content.slice(0, target.valueStart) + input.value + content.slice(target.valueEnd);

      // verificacao pos-edicao: chaves balanceadas + declaracao alvo re-parseia
      if (!bracesBalanced(newContent)) {
        return failTransform([
          diag('INTERNAL', 'edicao produziu CSS com chaves desbalanceadas (descartado, arquivo original intocado)', { file: input.file }),
        ]);
      }
      const recheck = parseCssDeclarations(newContent).find(
        (d) => d.property === name && d.line === target.line,
      );
      if (recheck === undefined || recheck.value !== input.value.trim()) {
        return failTransform([
          diag('INTERNAL', 'edicao nao sobreviveu ao re-parse (descartado, arquivo original intocado)', { file: input.file }),
        ]);
      }
      return okTransform(newContent, input.file);
    },
  };
}
