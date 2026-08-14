/**
 * design.token.read / design.token.update (M3-CONTRACTS §3.4; doc 09§8-10,
 * §51, §56, §79).
 *
 *  - token.read: tokens com origem EXATA arquivo:linha (via Styling Adapters).
 *  - token.update: edita a FONTE do token (09§8) via adapter de styling
 *    (Tailwind v4 @theme / v3 config / Plain CSS :root) — o valor novo e
 *    escrito VERBATIM (09§10: NUNCA converter HSL->HEX etc.).
 *  - Impact report (09§79) e computado ANTES de qualquer mutacao.
 *  - 09§56: esta operacao edita a FONTE compartilhada do token e NUNCA toca
 *    nos usos — nenhum elemento e desanexado do token por token.update.
 *  - Verificacao pos-escrita real: re-leitura do token no disco precisa
 *    conferir o valor escrito (zero fake success, M3 §8.4).
 *
 *  Precedencia documentada quando o mesmo tokenRef existe em mais de um
 *  mecanismo: Tailwind (v4 @theme primeiro, depois v3 config — delegado ao
 *  adapter) > Plain CSS :root. Multiplas FONTES Plain CSS (varios arquivos)
 *  => AmbiguousToken (nunca adivinhamos a cascata pretendida).
 */

import path from 'node:path';

import { createPlainCssStylingAdapter, createTailwindStylingAdapter } from '@nexo/adapters';
import type { TransformResult } from '@nexo/adapters';
import { classifyRepresentation } from '@nexo/adapters';
import type { TokenRepresentation } from '@nexo/adapters';
import { err, ok, type Result } from '@nexo/shared';

import { designError } from './errors.js';
import { buildTokenImpactReport } from './impact.js';
import { readAllTokens } from './inspect.js';
import { writeFileVerified, type ProjectFs } from './paths.js';
import type { ImpactReport, TokenInfo } from './types.js';

// ---------------------------------------------------------------------------
// design.token.read
// ---------------------------------------------------------------------------

export interface TokenReadResult {
  tokens: TokenInfo[];
}

/** Le tokens; com tokenRef, filtra (erro TokenNotFound se ausente). */
export async function readTokens(
  rootAbs: string,
  tokenRef?: string,
): Promise<Result<TokenReadResult>> {
  const tokens = await readAllTokens(rootAbs);
  if (tokenRef === undefined) return ok({ tokens });
  const matches = matchTokenRef(tokens, tokenRef);
  if (matches.length === 0) {
    return err(
      designError(
        'TokenNotFound',
        `Token '${tokenRef}' nao encontrado. ${tokens.length} tokens detectados; liste-os com design.token.read sem tokenRef.`,
        { resource: tokenRef },
      ),
    );
  }
  return ok({ tokens: matches });
}

/** Casa tokenRef exato ou com normalizacao '--' prefixada ('color-primary' -> '--color-primary'). */
function matchTokenRef(tokens: TokenInfo[], tokenRef: string): TokenInfo[] {
  const ref = tokenRef.trim();
  return tokens.filter((t) => t.tokenRef === ref || t.tokenRef === `--${ref}`);
}

// ---------------------------------------------------------------------------
// design.token.update
// ---------------------------------------------------------------------------

export interface TokenUpdateInput {
  tokenRef: string;
  /** Novo valor VERBATIM (sem conversao de representacao — 09§10). */
  value: string;
}

export interface TokenUpdateResult {
  tokenRef: string;
  previousValue: string;
  value: string;
  /** Representacao do NOVO valor como escrito (classificada, nao convertida). */
  representation: TokenRepresentation;
  file: string;
  line: number;
  filesChanged: string[];
  impact: ImpactReport;
  verified: true;
}

export async function updateToken(
  fsCtx: ProjectFs,
  input: TokenUpdateInput,
): Promise<Result<TokenUpdateResult>> {
  if (typeof input.value !== 'string' || input.value.trim() === '') {
    return err(
      designError('MissingInput', 'value deve ser string nao vazia (escrita verbatim)', {
        resource: input.tokenRef,
      }),
    );
  }

  const tokens = await readAllTokens(fsCtx.rootAbs);
  const matches = matchTokenRef(tokens, input.tokenRef);
  if (matches.length === 0) {
    if (tokens.length === 0) {
      // Nenhum token em NENHUM mecanismo suportado => UNSUPPORTED honesto
      // (Inv. 6/25: nunca inventar fonte de token).
      return err(
        designError(
          'UnsupportedMechanism',
          `Nenhum mecanismo de tokens suportado detectado (@theme v4 / tailwind.config v3 / :root CSS vars); token '${input.tokenRef}' nao tem fonte conhecida para editar`,
          { resource: input.tokenRef },
        ),
      );
    }
    return err(
      designError(
        'TokenNotFound',
        `Token '${input.tokenRef}' nao encontrado. ${tokens.length} tokens detectados; liste-os com design.token.read sem tokenRef.`,
        { resource: input.tokenRef },
      ),
    );
  }

  // Precedencia documentada: tailwind (v4/v3 via adapter) > plain-css.
  const twMatch = matches.find((t) => t.mechanism === 'tailwind-v4' || t.mechanism === 'tailwind-v3');
  const target = twMatch ?? matches[0];
  if (target === undefined) {
    return err(designError('TokenNotFound', `Token '${input.tokenRef}' nao resolvido`, { resource: input.tokenRef }));
  }

  // Impact ANTES de mutar (09§78-79)
  const impact = await buildTokenImpactReport(fsCtx.rootAbs, target.tokenRef, target.source);

  let result: TransformResult;
  if (twMatch !== undefined) {
    const tailwind = createTailwindStylingAdapter();
    result = await tailwind.updateToken({
      root: fsCtx.rootAbs,
      tokenRef: target.tokenRef,
      value: input.value,
    });
  } else {
    // Plain CSS: a FONTE do token e o :root de UM arquivo; varios arquivos
    // definindo a mesma var => ambiguo (nunca adivinhamos).
    const files = [...new Set(matches.map((t) => t.source.file))];
    if (files.length > 1) {
      return err(
        designError(
          'AmbiguousToken',
          `Variavel '${target.tokenRef}' definida em multiplos arquivos: ${files.join(', ')}; refine o alvo`,
          { resource: target.tokenRef, details: { files } },
        ),
      );
    }
    const plain = createPlainCssStylingAdapter();
    result = await plain.updateCssVariable({
      file: path.join(fsCtx.rootAbs, target.source.file),
      name: target.tokenRef,
      value: input.value,
    });
  }

  if (!result.ok || result.newContent === undefined) {
    const unsupported = result.unsupported;
    const first = result.diagnostics[0];
    if (unsupported !== undefined || first?.code === 'UNSUPPORTED') {
      return err(
        designError('UnsupportedMechanism', first?.message ?? 'mecanismo nao suportado', {
          resource: target.tokenRef,
          details: { diagnostics: result.diagnostics, unsupported },
        }),
      );
    }
    if (first?.code === 'AMBIGUOUS_TARGET') {
      return err(
        designError('AmbiguousToken', first.message, {
          resource: target.tokenRef,
          details: { diagnostics: result.diagnostics },
        }),
      );
    }
    return err(
      designError('TokenNotFound', first?.message ?? 'falha na transformacao do token', {
        resource: target.tokenRef,
        details: { diagnostics: result.diagnostics },
      }),
    );
  }

  // Persistencia via runtime scope guard + verificacao de conteudo (07§41)
  const written = await writeFileVerified(fsCtx, result.file ?? target.source.file, result.newContent);
  if (!written.ok) return err(written.error);

  // Verificacao pos-escrita de DOMINIO: o token re-lido confere o novo valor
  const reread = await readAllTokens(fsCtx.rootAbs);
  const after = reread.find(
    (t) => t.tokenRef === target.tokenRef && t.source.file === written.value.file,
  );
  if (after === undefined || after.value !== input.value.trim()) {
    return err(
      designError(
        'VerificationFailed',
        `Verificacao pos-escrita falhou: token '${target.tokenRef}' re-lido de '${written.value.file}' nao confere o valor escrito`,
        { resource: target.tokenRef },
      ),
    );
  }

  return ok({
    tokenRef: target.tokenRef,
    previousValue: target.value,
    value: after.value,
    representation: classifyRepresentation(after.value),
    file: written.value.file,
    line: after.source.line,
    filesChanged: [written.value.file],
    impact,
    verified: true,
  });
}
