/**
 * Parsing de argumentos do `nexo` (SPEC.md §10) — node:util.parseArgs, puro e
 * testável (smoke test sem spawnar servidor).
 *
 * Comandos M1:
 *  - nexo capabilities [--json]
 *  - nexo project import <path> [--json]
 *  - nexo project open <id> [--json]
 *  - nexo project list [--json]
 *  - nexo runtime exec --project <id> [--timeout ms] <cmd> [args...] [--json]
 *    (`--project` é obrigatório: runtime.* opera scoped ao rootPath registrado,
 *    SPEC §9)
 */

import { parseArgs } from 'node:util';

export type CliCommand =
  | { kind: 'capabilities'; json: boolean }
  | { kind: 'project.import'; path: string; json: boolean }
  | { kind: 'project.open'; projectId: string; json: boolean }
  | { kind: 'project.list'; json: boolean }
  | { kind: 'runtime.exec'; projectId: string; command: string; args: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'help' };

/** Erro de uso (argv inválido): exit code 2, mensagem em stderr. */
export class CliUsageError extends Error {
  override readonly name = 'CliUsageError';
}

export const USAGE = `nexo — NEXO CMS CLI (M1)

Uso:
  nexo capabilities [--json]
  nexo project import <path> [--json]
  nexo project open <id> [--json]
  nexo project list [--json]
  nexo runtime exec --project <id> [--timeout <ms>] <cmd> [args...] [--json]

Env:
  NEXO_URL    URL do Agent API (default http://127.0.0.1:47820)
  NEXO_ACTOR  Ator enviado no header x-nexo-actor (default cli:local)
`;

export function parseCliArgs(argv: readonly string[]): CliCommand {
  // Wave 5 (FIX 5): `pnpm start -- <args>` / `npm run start -- <args>`
  // repassam o `--` LITERALMENTE para o argv. O `--` é o terminador de
  // opções do parseArgs: tudo depois dele vira posicional, o que quebrava
  // flags (`nexo -- capabilities --json` -> '--json' caía como posicional).
  // Causa-raiz corrigida aqui: removemos UM `--` leading (wrapper de script)
  // antes de parsear. `--` em posição interna segue a semântica normal do
  // parseArgs (terminador de opções).
  const normalized = argv[0] === '--' ? argv.slice(1) : argv;
  const parse = () =>
    parseArgs({
      args: normalized as string[],
      options: {
        json: { type: 'boolean', default: false },
        project: { type: 'string' },
        timeout: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse();
  } catch (e) {
    throw new CliUsageError((e as Error).message);
  }

  const json = parsed.values.json === true;
  if (parsed.values.help === true) return { kind: 'help' };
  const pos = parsed.positionals;
  const [group, sub, ...rest] = pos;

  if (group === undefined) return { kind: 'help' };

  if (group === 'capabilities' && sub === undefined) {
    return { kind: 'capabilities', json };
  }

  if (group === 'project') {
    if (sub === 'import') {
      const path = rest[0];
      if (path === undefined || rest.length > 1) throw new CliUsageError('uso: nexo project import <path>');
      return { kind: 'project.import', path, json };
    }
    if (sub === 'open') {
      const projectId = rest[0];
      if (projectId === undefined || rest.length > 1) throw new CliUsageError('uso: nexo project open <id>');
      return { kind: 'project.open', projectId, json };
    }
    if (sub === 'list') {
      if (rest.length > 0) throw new CliUsageError('uso: nexo project list');
      return { kind: 'project.list', json };
    }
    throw new CliUsageError(`subcomando project desconhecido: '${String(sub)}'`);
  }

  if (group === 'runtime' && sub === 'exec') {
    const projectId = parsed.values.project;
    if (projectId === undefined || projectId.length === 0) {
      throw new CliUsageError('runtime exec exige --project <id> (escopo do projeto registrado)');
    }
    const [command, ...args] = rest;
    if (command === undefined) throw new CliUsageError('uso: nexo runtime exec --project <id> <cmd> [args...]');
    let timeoutMs: number | undefined;
    if (parsed.values.timeout !== undefined) {
      timeoutMs = Number.parseInt(parsed.values.timeout, 10);
      if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
        throw new CliUsageError(`--timeout inválido: '${parsed.values.timeout}'`);
      }
    }
    return { kind: 'runtime.exec', projectId, command, args, ...(timeoutMs !== undefined ? { timeoutMs } : {}), json };
  }

  throw new CliUsageError(`comando desconhecido: '${pos.join(' ')}'`);
}
