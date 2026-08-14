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
 *
 * Comandos M2 (Git, doc 10 — mesma capability do Control Plane via invoke):
 *  - nexo git status <projectId> [--json]
 *  - nexo git diff <projectId> [--mode M] [--from F] [--to T] [--path P] [--json]
 *  - nexo git history <projectId> [--limit N] [--ref R] [--json]
 *  - nexo git branch list <projectId> [--json]
 *  - nexo git branch create <projectId> <name> [--start-point S] [--checkout] [--json]
 *  - nexo git branch switch <projectId> <name> [--json]
 *  - nexo git branch delete <projectId> <name> [--json]
 *  - nexo git commit <projectId> --message M [--files a,b,c] [--all] [--expected-head H] [--json]
 *  - nexo git push <projectId> [--remote R] [--branch B] [--json]
 *  - nexo git pull <projectId> [--remote R] [--branch B] [--json]
 *  - nexo git fetch <projectId> [--remote R] [--json]
 */

import { parseArgs } from 'node:util';

export type CliCommand =
  | { kind: 'capabilities'; json: boolean }
  | { kind: 'project.import'; path: string; json: boolean }
  | { kind: 'project.open'; projectId: string; json: boolean }
  | { kind: 'project.list'; json: boolean }
  | { kind: 'runtime.exec'; projectId: string; command: string; args: string[]; timeoutMs?: number; json: boolean }
  | { kind: 'git.status'; projectId: string; json: boolean }
  | {
      kind: 'git.diff';
      projectId: string;
      mode?: string;
      from?: string;
      to?: string;
      path?: string;
      json: boolean;
    }
  | { kind: 'git.history'; projectId: string; limit?: number; ref?: string; json: boolean }
  | { kind: 'git.branch.list'; projectId: string; json: boolean }
  | { kind: 'git.branch.create'; projectId: string; name: string; startPoint?: string; checkout: boolean; json: boolean }
  | { kind: 'git.branch.switch'; projectId: string; name: string; json: boolean }
  | { kind: 'git.branch.delete'; projectId: string; name: string; json: boolean }
  | {
      kind: 'git.commit';
      projectId: string;
      message: string;
      files?: string[];
      all: boolean;
      expectedHead?: string;
      json: boolean;
    }
  | { kind: 'git.push'; projectId: string; remote?: string; branch?: string; json: boolean }
  | { kind: 'git.pull'; projectId: string; remote?: string; branch?: string; json: boolean }
  | { kind: 'git.fetch'; projectId: string; remote?: string; json: boolean }
  | { kind: 'help' };

/** Erro de uso (argv inválido): exit code 2, mensagem em stderr. */
export class CliUsageError extends Error {
  override readonly name = 'CliUsageError';
}

export const USAGE = `nexo — NEXO CMS CLI (M2)

Uso:
  nexo capabilities [--json]
  nexo project import <path> [--json]
  nexo project open <id> [--json]
  nexo project list [--json]
  nexo runtime exec --project <id> [--timeout <ms>] <cmd> [args...] [--json]
  nexo git status <projectId> [--json]
  nexo git diff <projectId> [--mode <M>] [--from <F>] [--to <T>] [--path <P>] [--json]
  nexo git history <projectId> [--limit <N>] [--ref <R>] [--json]
  nexo git branch list <projectId> [--json]
  nexo git branch create <projectId> <name> [--start-point <S>] [--checkout] [--json]
  nexo git branch switch <projectId> <name> [--json]
  nexo git branch delete <projectId> <name> [--json]
  nexo git commit <projectId> --message <M> [--files <a,b,c>] [--all] [--expected-head <H>] [--json]
  nexo git push <projectId> [--remote <R>] [--branch <B>] [--json]
  nexo git pull <projectId> [--remote <R>] [--branch <B>] [--json]
  nexo git fetch <projectId> [--remote <R>] [--json]

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
        // M2 (git)
        mode: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
        path: { type: 'string' },
        limit: { type: 'string' },
        ref: { type: 'string' },
        'start-point': { type: 'string' },
        checkout: { type: 'boolean', default: false },
        message: { type: 'string' },
        files: { type: 'string' },
        all: { type: 'boolean', default: false },
        'expected-head': { type: 'string' },
        remote: { type: 'string' },
        branch: { type: 'string' },
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

  if (group === 'git') {
    return parseGitCommand(sub, rest, parsed.values, json);
  }

  throw new CliUsageError(`comando desconhecido: '${pos.join(' ')}'`);
}

/** Exige exatamente N posicionais não-vazios; overloads devolvem tupla tipada. */
function expectPositionals(rest: string[], count: 1, usage: string): [string];
function expectPositionals(rest: string[], count: 2, usage: string): [string, string];
function expectPositionals(rest: string[], count: number, usage: string): string[] {
  if (rest.length !== count || rest.some((p) => p.length === 0)) throw new CliUsageError(`uso: ${usage}`);
  return rest;
}

function parseOptionalInt(raw: string | undefined, flag: string): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0) throw new CliUsageError(`${flag} inválido: '${raw}'`);
  return n;
}

/** Flags M2 relevantes aos comandos git (subconjunto tipado de parsed.values). */
interface GitFlagValues {
  mode?: string;
  from?: string;
  to?: string;
  path?: string;
  limit?: string;
  ref?: string;
  'start-point'?: string;
  checkout?: boolean;
  message?: string;
  files?: string;
  all?: boolean;
  'expected-head'?: string;
  remote?: string;
  branch?: string;
}

/** Parsing dos comandos M2 `nexo git *` (doc 10 — invoke da capability homônima). */
function parseGitCommand(
  sub: string | undefined,
  rest: string[],
  values: GitFlagValues,
  json: boolean,
): CliCommand {
  if (sub === 'status') {
    const [projectId] = expectPositionals(rest, 1, 'nexo git status <projectId>');
    return { kind: 'git.status', projectId, json };
  }
  if (sub === 'diff') {
    const [projectId] = expectPositionals(rest, 1, 'nexo git diff <projectId> [--mode M] [--from F] [--to T] [--path P]');
    return {
      kind: 'git.diff',
      projectId,
      ...(values.mode !== undefined ? { mode: values.mode } : {}),
      ...(values.from !== undefined ? { from: values.from } : {}),
      ...(values.to !== undefined ? { to: values.to } : {}),
      ...(values.path !== undefined ? { path: values.path } : {}),
      json,
    };
  }
  if (sub === 'history') {
    const [projectId] = expectPositionals(rest, 1, 'nexo git history <projectId> [--limit N] [--ref R]');
    const limit = parseOptionalInt(values.limit, '--limit');
    return {
      kind: 'git.history',
      projectId,
      ...(limit !== undefined ? { limit } : {}),
      ...(values.ref !== undefined ? { ref: values.ref } : {}),
      json,
    };
  }
  if (sub === 'branch') {
    const [action, ...args] = rest;
    if (action === 'list') {
      const [projectId] = expectPositionals(args, 1, 'nexo git branch list <projectId>');
      return { kind: 'git.branch.list', projectId, json };
    }
    if (action === 'create') {
      const [projectId, name] = expectPositionals(
        args,
        2,
        'nexo git branch create <projectId> <name> [--start-point S] [--checkout]',
      );
      return {
        kind: 'git.branch.create',
        projectId,
        name,
        ...(values['start-point'] !== undefined ? { startPoint: values['start-point'] } : {}),
        checkout: values.checkout === true,
        json,
      };
    }
    if (action === 'switch') {
      const [projectId, name] = expectPositionals(args, 2, 'nexo git branch switch <projectId> <name>');
      return { kind: 'git.branch.switch', projectId, name, json };
    }
    if (action === 'delete') {
      const [projectId, name] = expectPositionals(args, 2, 'nexo git branch delete <projectId> <name>');
      return { kind: 'git.branch.delete', projectId, name, json };
    }
    throw new CliUsageError(`subcomando git branch desconhecido: '${String(action)}'`);
  }
  if (sub === 'commit') {
    const [projectId] = expectPositionals(rest, 1, 'nexo git commit <projectId> --message M [--files a,b,c] [--all] [--expected-head H]');
    const message = values.message;
    if (message === undefined || message.trim().length === 0) {
      throw new CliUsageError('git commit exige --message <M> (mensagem explícita, doc 10 §21)');
    }
    const files =
      values.files !== undefined
        ? values.files
            .split(',')
            .map((f) => f.trim())
            .filter((f) => f.length > 0)
        : undefined;
    if (files !== undefined && files.length === 0) {
      throw new CliUsageError("--files inválido: lista vazia (use --files a,b,c ou omita)");
    }
    if (files !== undefined && values.all === true) {
      throw new CliUsageError("--files e --all são mutuamente exclusivos (escopo de commit, decisão D5)");
    }
    return {
      kind: 'git.commit',
      projectId,
      message,
      ...(files !== undefined ? { files } : {}),
      all: values.all === true,
      ...(values['expected-head'] !== undefined ? { expectedHead: values['expected-head'] } : {}),
      json,
    };
  }
  if (sub === 'push' || sub === 'pull') {
    const [projectId] = expectPositionals(rest, 1, `nexo git ${sub} <projectId> [--remote R] [--branch B]`);
    const remoteBranch = {
      ...(values.remote !== undefined ? { remote: values.remote } : {}),
      ...(values.branch !== undefined ? { branch: values.branch } : {}),
    };
    return sub === 'push'
      ? { kind: 'git.push', projectId, ...remoteBranch, json }
      : { kind: 'git.pull', projectId, ...remoteBranch, json };
  }
  if (sub === 'fetch') {
    const [projectId] = expectPositionals(rest, 1, 'nexo git fetch <projectId> [--remote R]');
    return {
      kind: 'git.fetch',
      projectId,
      ...(values.remote !== undefined ? { remote: values.remote } : {}),
      json,
    };
  }
  throw new CliUsageError(`subcomando git desconhecido: '${String(sub)}'`);
}
