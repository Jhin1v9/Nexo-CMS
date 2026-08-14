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
 *
 * Comandos M3 (M3-CONTRACTS §3 — mesma capability, mais um consumer, Inv. 17):
 *  - nexo editor open <projectId> <file> [--json]
 *  - nexo editor save <projectId> <file> [--expected-hash H] [--json]   (conteudo via stdin)
 *  - nexo editor selection <projectId> --route R --node-ref N [--json]
 *  - nexo editor change-create <projectId> [--change JSON] [--json]    (JSON via flag ou stdin)
 *  - nexo editor change-preview <projectId> <changeId> [--json]
 *  - nexo editor change-apply <projectId> <changeId> [--expected-hash H] [--json]
 *  - nexo editor change-reject <projectId> <changeId> [--json]
 *  - nexo editor changes <projectId> [--json]
 *  - nexo editor undo <projectId> [--json]
 *  - nexo editor redo <projectId> [--json]
 *  - nexo component list <projectId> [--scope S] [--json]
 *  - nexo component read <projectId> <componentId> [--json]
 *  - nexo component create <projectId> --name N [--description D] [--props JSON] [--variants JSON] [--scope S] [--json]
 *  - nexo component update <projectId> <componentId> [--patch JSON] [--json]  (patch via flag ou stdin)
 *  - nexo component delete <projectId> <componentId> [--json]
 *  - nexo component publish <projectId> <componentId> [--json]
 *  - nexo media list <projectId> [--filter F] [--json]
 *  - nexo media read <projectId> <assetId> [--include-content] [--json]
 *  - nexo media search <projectId> <query> [--json]
 *  - nexo media upload <projectId> <file> [--name N] [--target-path P] [--json]
 *  - nexo media update <projectId> <assetId> [--name N] [--alt A] [--caption C] [--json]
 *  - nexo media replace <projectId> <assetId> <file> [--json]
 *  - nexo media delete <projectId> <assetId> [--confirm] [--json]
 *  - nexo design read <projectId> [--json]
 *  - nexo design update <projectId> --target T --property P --value V [--json]
 *  - nexo design token-read <projectId> [--token-ref R] [--json]
 *  - nexo design token-update <projectId> --token-ref R --value V [--json]
 *  - nexo theme read <projectId> [--json]
 *  - nexo theme update <projectId> --theme T [--patch JSON] [--json]   (patch via flag ou stdin)
 *  - nexo responsive viewport-create <projectId> --width W --height H [--name N] [--dpr D] [--orientation O] [--json]
 *  - nexo responsive preview <projectId> --viewport-id V [--route R] [--json]
 *  - nexo responsive diagnose <projectId> --viewport-id V [--route R] [--json]
 *  - nexo responsive stress-test <projectId> --viewport-id V --profile P [--json]
 *  - nexo responsive compare <projectId> --viewports id1,id2[,id3...] [--json]
 *  - nexo responsive snapshot <projectId> --viewport-id V [--route R] [--json]
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
  | { kind: 'git.branch.create'; projectId: string; name: string; startPoint?: string; checkout: boolean; approval?: CliApproval; json: boolean }
  | { kind: 'git.branch.switch'; projectId: string; name: string; approval?: CliApproval; json: boolean }
  | { kind: 'git.branch.delete'; projectId: string; name: string; approval?: CliApproval; json: boolean }
  | {
      kind: 'git.commit';
      projectId: string;
      message: string;
      files?: string[];
      all: boolean;
      expectedHead?: string;
      approval?: CliApproval;
      json: boolean;
    }
  | { kind: 'git.push'; projectId: string; remote?: string; branch?: string; approval?: CliApproval; json: boolean }
  | { kind: 'git.pull'; projectId: string; remote?: string; branch?: string; approval?: CliApproval; json: boolean }
  | { kind: 'git.fetch'; projectId: string; remote?: string; approval?: CliApproval; json: boolean }
  // ---- M3: editor (M3-CONTRACTS §3.1)
  | { kind: 'editor.open'; projectId: string; filePath: string; json: boolean }
  | { kind: 'editor.save'; projectId: string; filePath: string; expectedHash?: string; approval?: CliApproval; json: boolean }
  | { kind: 'editor.selection.read'; projectId: string; route: string; nodeRef: string; json: boolean }
  | { kind: 'editor.change.create'; projectId: string; changeJson?: string; json: boolean }
  | { kind: 'editor.change.preview'; projectId: string; changeId: string; json: boolean }
  | { kind: 'editor.change.apply'; projectId: string; changeId: string; expectedHash?: string; approval?: CliApproval; json: boolean }
  | { kind: 'editor.change.reject'; projectId: string; changeId: string; json: boolean }
  | { kind: 'editor.change.list'; projectId: string; json: boolean }
  | { kind: 'editor.change.undo'; projectId: string; approval?: CliApproval; json: boolean }
  | { kind: 'editor.change.redo'; projectId: string; approval?: CliApproval; json: boolean }
  // ---- M3: components (M3-CONTRACTS §3.2)
  | { kind: 'component.list'; projectId: string; scope?: string; json: boolean }
  | { kind: 'component.read'; projectId: string; componentId: string; json: boolean }
  | {
      kind: 'component.create';
      projectId: string;
      name: string;
      description?: string;
      props?: unknown[];
      variants?: unknown[];
      scope?: string;
      approval?: CliApproval;
      json: boolean;
    }
  | { kind: 'component.update'; projectId: string; componentId: string; patchJson?: string; approval?: CliApproval; json: boolean }
  | { kind: 'component.delete'; projectId: string; componentId: string; approval?: CliApproval; json: boolean }
  | { kind: 'component.publish'; projectId: string; componentId: string; approval?: CliApproval; json: boolean }
  // ---- M3: media (M3-CONTRACTS §3.3)
  | { kind: 'media.list'; projectId: string; filter?: string; json: boolean }
  | { kind: 'media.read'; projectId: string; assetId: string; includeContent: boolean; json: boolean }
  | { kind: 'media.search'; projectId: string; query: string; json: boolean }
  | { kind: 'media.upload'; projectId: string; file: string; fileName?: string; targetPath?: string; json: boolean }
  | {
      kind: 'media.update';
      projectId: string;
      assetId: string;
      name?: string;
      alt?: string;
      caption?: string;
      json: boolean;
    }
  | { kind: 'media.replace'; projectId: string; assetId: string; file: string; json: boolean }
  | { kind: 'media.delete'; projectId: string; assetId: string; confirm: boolean; json: boolean }
  // ---- M3: design/theme (M3-CONTRACTS §3.4)
  | { kind: 'design.read'; projectId: string; json: boolean }
  | { kind: 'design.update'; projectId: string; target: string; property: string; value: string; json: boolean }
  | { kind: 'design.token.read'; projectId: string; tokenRef?: string; json: boolean }
  | { kind: 'design.token.update'; projectId: string; tokenRef: string; value: string; json: boolean }
  | { kind: 'theme.read'; projectId: string; json: boolean }
  | { kind: 'theme.update'; projectId: string; theme: string; patchJson?: string; json: boolean }
  // ---- M3: responsive (M3-CONTRACTS §3.5)
  | {
      kind: 'responsive.viewport.create';
      projectId: string;
      width: number;
      height: number;
      name?: string;
      dpr?: number;
      orientation?: string;
      json: boolean;
    }
  | { kind: 'responsive.preview'; projectId: string; viewportId: string; route?: string; json: boolean }
  | { kind: 'responsive.diagnose'; projectId: string; viewportId: string; route?: string; json: boolean }
  | { kind: 'responsive.stressTest'; projectId: string; viewportId: string; profile: string; json: boolean }
  | { kind: 'responsive.compare'; projectId: string; viewportIds: string[]; json: boolean }
  | { kind: 'responsive.snapshot'; projectId: string; viewportId: string; route?: string; json: boolean }
  | { kind: 'help' };

/** Erro de uso (argv inválido): exit code 2, mensagem em stderr. */
export class CliUsageError extends Error {
  override readonly name = 'CliUsageError';
}

export const USAGE = `nexo — NEXO CMS CLI (M3)

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

  nexo editor open <projectId> <file> [--json]
  nexo editor save <projectId> <file> [--expected-hash <H>] [--json]
      (conteudo novo lido de stdin; CONFLICT se o hash divergir)
  nexo editor selection <projectId> --route <R> --node-ref <N> [--json]
  nexo editor change-create <projectId> [--change <JSON>] [--json]
      (ChangeInput em JSON via --change ou stdin)
  nexo editor change-preview <projectId> <changeId> [--json]
  nexo editor change-apply <projectId> <changeId> [--expected-hash <H>] [--json]
  nexo editor change-reject <projectId> <changeId> [--json]
  nexo editor changes <projectId> [--json]
  nexo editor undo <projectId> [--json]
  nexo editor redo <projectId> [--json]

  nexo component list <projectId> [--scope <S>] [--json]
  nexo component read <projectId> <componentId> [--json]
  nexo component create <projectId> --name <N> [--description <D>] [--props <JSON>] [--variants <JSON>] [--scope <S>] [--json]
  nexo component update <projectId> <componentId> [--patch <JSON>] [--json]
      (patch em JSON via --patch ou stdin)
  nexo component delete <projectId> <componentId> [--json]
  nexo component publish <projectId> <componentId> [--json]

  nexo media list <projectId> [--filter <F>] [--json]
  nexo media read <projectId> <assetId> [--include-content] [--json]
  nexo media search <projectId> <query> [--json]
  nexo media upload <projectId> <file> [--name <N>] [--target-path <P>] [--json]
  nexo media update <projectId> <assetId> [--name <N>] [--alt <A>] [--caption <C>] [--json]
  nexo media replace <projectId> <assetId> <file> [--json]
  nexo media delete <projectId> <assetId> [--confirm] [--json]
      (com referencias conhecidas, o servidor pode exigir --confirm)

  nexo design read <projectId> [--json]
  nexo design update <projectId> --target <T> --property <P> --value <V> [--json]
  nexo design token-read <projectId> [--token-ref <R>] [--json]
  nexo design token-update <projectId> --token-ref <R> --value <V> [--json]
  nexo theme read <projectId> [--json]
  nexo theme update <projectId> --theme <T> [--patch <JSON>] [--json]
      (patch em JSON via --patch ou stdin)

  nexo responsive viewport-create <projectId> --width <W> --height <H> [--name <N>] [--dpr <D>] [--orientation <O>] [--json]
  nexo responsive preview <projectId> --viewport-id <V> [--route <R>] [--json]
  nexo responsive diagnose <projectId> --viewport-id <V> [--route <R>] [--json]
  nexo responsive stress-test <projectId> --viewport-id <V> --profile <P> [--json]
  nexo responsive compare <projectId> --viewports <id1,id2[,id3...]> [--json]
  nexo responsive snapshot <projectId> --viewport-id <V> [--route <R>] [--json]

Aprovacao (D17): comandos de mutacao aceitam --approve --approver <id>
  [--justification <texto>]; o envelope de invoke carrega
  approval: { approver, justification? }. Sem --approve, REQUIRE_APPROVAL
  orienta a reexecucao com aprovacao explicita.

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
        // D17 (canal de aprovação): mutações podem carregar approval no envelope
        approve: { type: 'boolean', default: false },
        approver: { type: 'string' },
        justification: { type: 'string' },
        // M3 (editor/component/media/design/theme/responsive)
        'expected-hash': { type: 'string' },
        route: { type: 'string' },
        'node-ref': { type: 'string' },
        change: { type: 'string' },
        scope: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        props: { type: 'string' },
        variants: { type: 'string' },
        patch: { type: 'string' },
        filter: { type: 'string' },
        'include-content': { type: 'boolean', default: false },
        alt: { type: 'string' },
        caption: { type: 'string' },
        'target-path': { type: 'string' },
        confirm: { type: 'boolean', default: false },
        target: { type: 'string' },
        property: { type: 'string' },
        value: { type: 'string' },
        'token-ref': { type: 'string' },
        theme: { type: 'string' },
        width: { type: 'string' },
        height: { type: 'string' },
        dpr: { type: 'string' },
        orientation: { type: 'string' },
        'viewport-id': { type: 'string' },
        viewports: { type: 'string' },
        profile: { type: 'string' },
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

  if (group === 'editor') {
    return parseEditorCommand(sub, rest, parsed.values, json);
  }

  if (group === 'component') {
    return parseComponentCommand(sub, rest, parsed.values, json);
  }

  if (group === 'media') {
    return parseMediaCommand(sub, rest, parsed.values, json);
  }

  if (group === 'design' || group === 'theme') {
    return parseDesignCommand(group, sub, rest, parsed.values, json);
  }

  if (group === 'responsive') {
    return parseResponsiveCommand(sub, rest, parsed.values, json);
  }

  throw new CliUsageError(`comando desconhecido: '${pos.join(' ')}'`);
}

/**
 * Envelope de aprovação D17: mutações podem carregar
 * `approval: { approver, justification? }` no input do invoke.
 */
export interface CliApproval {
  approver: string;
  justification?: string;
}

interface ApprovalFlagValues {
  approve?: boolean;
  approver?: string;
  justification?: string;
}

/**
 * Constrói o envelope de aprovação a partir das flags (D17).
 * `--approve` exige `--approver <id>`; `--approver`/`--justification` sem
 * `--approve` é erro de uso (intenção explícita, nunca implícita).
 */
function buildApproval(values: ApprovalFlagValues): CliApproval | undefined {
  if (values.approve !== true) {
    if (values.approver !== undefined || values.justification !== undefined) {
      throw new CliUsageError('--approver/--justification exigem --approve (decisão D17)');
    }
    return undefined;
  }
  const approver = values.approver?.trim();
  if (approver === undefined || approver.length === 0) {
    throw new CliUsageError('--approve exige --approver <id> (decisão D17)');
  }
  return {
    approver,
    ...(values.justification !== undefined ? { justification: values.justification } : {}),
  };
}

/** Spread condicional de approval (omite a chave quando ausente). */
function withApproval(approval: CliApproval | undefined): { approval?: CliApproval } {
  return approval !== undefined ? { approval } : {};
}

/** JSON.parse com erro de uso claro (flags que recebem JSON inline). */
function parseJsonFlag(raw: string, flag: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    throw new CliUsageError(`${flag} inválido: JSON malformado (${(e as Error).message})`);
  }
}

/** JSON de flag ou stdin ('-' / ausência) é resolvido em run.ts; aqui só valida a flag. */
function parseJsonArrayFlag(raw: string, flag: string): unknown[] {
  const parsed = parseJsonFlag(raw, flag);
  if (!Array.isArray(parsed)) throw new CliUsageError(`${flag} inválido: esperado array JSON`);
  return parsed;
}

/** Exige exatamente N posicionais não-vazios; overloads devolvem tupla tipada. */
function expectPositionals(rest: string[], count: 1, usage: string): [string];
function expectPositionals(rest: string[], count: 2, usage: string): [string, string];
function expectPositionals(rest: string[], count: 3, usage: string): [string, string, string];
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
interface GitFlagValues extends ApprovalFlagValues {
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
        ...withApproval(buildApproval(values)),
        json,
      };
    }
    if (action === 'switch') {
      const [projectId, name] = expectPositionals(args, 2, 'nexo git branch switch <projectId> <name>');
      return { kind: 'git.branch.switch', projectId, name, ...withApproval(buildApproval(values)), json };
    }
    if (action === 'delete') {
      const [projectId, name] = expectPositionals(args, 2, 'nexo git branch delete <projectId> <name>');
      return { kind: 'git.branch.delete', projectId, name, ...withApproval(buildApproval(values)), json };
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
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  if (sub === 'push' || sub === 'pull') {
    const [projectId] = expectPositionals(rest, 1, `nexo git ${sub} <projectId> [--remote R] [--branch B]`);
    const remoteBranch = {
      ...(values.remote !== undefined ? { remote: values.remote } : {}),
      ...(values.branch !== undefined ? { branch: values.branch } : {}),
      ...withApproval(buildApproval(values)),
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
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  throw new CliUsageError(`subcomando git desconhecido: '${String(sub)}'`);
}

// ---- M3 (M3-CONTRACTS §3) ----------------------------------------------------

/** Flags M3 (subconjunto tipado de parsed.values). */
interface M3FlagValues extends ApprovalFlagValues {
  'expected-hash'?: string;
  route?: string;
  'node-ref'?: string;
  change?: string;
  scope?: string;
  name?: string;
  description?: string;
  props?: string;
  variants?: string;
  patch?: string;
  filter?: string;
  'include-content'?: boolean;
  alt?: string;
  caption?: string;
  'target-path'?: string;
  confirm?: boolean;
  target?: string;
  property?: string;
  value?: string;
  'token-ref'?: string;
  theme?: string;
  width?: string;
  height?: string;
  dpr?: string;
  orientation?: string;
  'viewport-id'?: string;
  viewports?: string;
  profile?: string;
}

/** Flag string obrigatória e não-vazia. */
function requireFlag(raw: string | undefined, flag: string, usage: string): string {
  if (raw === undefined || raw.trim().length === 0) {
    throw new CliUsageError(`${usage} exige ${flag}`);
  }
  return raw;
}

/** Dimensão de viewport: inteiro positivo (width/height) — 09§26 dimensões arbitrárias. */
function requireDimension(raw: string | undefined, flag: string): number {
  if (raw === undefined) throw new CliUsageError(`viewport-create exige ${flag} <N> (inteiro positivo)`);
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0 || String(n) !== raw.trim()) {
    throw new CliUsageError(`${flag} inválido: '${raw}' (inteiro positivo)`);
  }
  return n;
}

/** DPR opcional: número positivo (aceita decimais, ex. 1.5). */
function parseOptionalDpr(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) throw new CliUsageError(`--dpr inválido: '${raw}' (número positivo)`);
  return n;
}

/** Parsing dos comandos M3 `nexo editor *` (M3-CONTRACTS §3.1 — invoke homônimo). */
function parseEditorCommand(
  sub: string | undefined,
  rest: string[],
  values: M3FlagValues,
  json: boolean,
): CliCommand {
  if (sub === 'open') {
    const [projectId, filePath] = expectPositionals(rest, 2, 'nexo editor open <projectId> <file>');
    return { kind: 'editor.open', projectId, filePath, json };
  }
  if (sub === 'save') {
    const [projectId, filePath] = expectPositionals(rest, 2, 'nexo editor save <projectId> <file> [--expected-hash H]');
    return {
      kind: 'editor.save',
      projectId,
      filePath,
      ...(values['expected-hash'] !== undefined ? { expectedHash: values['expected-hash'] } : {}),
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  if (sub === 'selection') {
    const usage = 'nexo editor selection <projectId> --route R --node-ref N';
    const [projectId] = expectPositionals(rest, 1, usage);
    return {
      kind: 'editor.selection.read',
      projectId,
      route: requireFlag(values.route, '--route <R>', usage),
      nodeRef: requireFlag(values['node-ref'], '--node-ref <N>', usage),
      json,
    };
  }
  if (sub === 'change-create') {
    const [projectId] = expectPositionals(rest, 1, 'nexo editor change-create <projectId> [--change JSON]');
    return {
      kind: 'editor.change.create',
      projectId,
      ...(values.change !== undefined ? { changeJson: values.change } : {}),
      json,
    };
  }
  if (sub === 'change-preview') {
    const [projectId, changeId] = expectPositionals(rest, 2, 'nexo editor change-preview <projectId> <changeId>');
    return { kind: 'editor.change.preview', projectId, changeId, json };
  }
  if (sub === 'change-apply') {
    const [projectId, changeId] = expectPositionals(rest, 2, 'nexo editor change-apply <projectId> <changeId> [--expected-hash H]');
    return {
      kind: 'editor.change.apply',
      projectId,
      changeId,
      ...(values['expected-hash'] !== undefined ? { expectedHash: values['expected-hash'] } : {}),
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  if (sub === 'change-reject') {
    const [projectId, changeId] = expectPositionals(rest, 2, 'nexo editor change-reject <projectId> <changeId>');
    return { kind: 'editor.change.reject', projectId, changeId, json };
  }
  if (sub === 'changes') {
    const [projectId] = expectPositionals(rest, 1, 'nexo editor changes <projectId>');
    return { kind: 'editor.change.list', projectId, json };
  }
  if (sub === 'undo' || sub === 'redo') {
    const [projectId] = expectPositionals(rest, 1, `nexo editor ${sub} <projectId>`);
    const approval = withApproval(buildApproval(values));
    return sub === 'undo'
      ? { kind: 'editor.change.undo', projectId, ...approval, json }
      : { kind: 'editor.change.redo', projectId, ...approval, json };
  }
  throw new CliUsageError(`subcomando editor desconhecido: '${String(sub)}'`);
}

/** Parsing dos comandos M3 `nexo component *` (M3-CONTRACTS §3.2). */
function parseComponentCommand(
  sub: string | undefined,
  rest: string[],
  values: M3FlagValues,
  json: boolean,
): CliCommand {
  if (sub === 'list') {
    const [projectId] = expectPositionals(rest, 1, 'nexo component list <projectId> [--scope S]');
    return {
      kind: 'component.list',
      projectId,
      ...(values.scope !== undefined ? { scope: values.scope } : {}),
      json,
    };
  }
  if (sub === 'read') {
    const [projectId, componentId] = expectPositionals(rest, 2, 'nexo component read <projectId> <componentId>');
    return { kind: 'component.read', projectId, componentId, json };
  }
  if (sub === 'create') {
    const [projectId] = expectPositionals(
      rest,
      1,
      'nexo component create <projectId> --name N [--description D] [--props JSON] [--variants JSON] [--scope S]',
    );
    return {
      kind: 'component.create',
      projectId,
      name: requireFlag(values.name, '--name <N>', 'nexo component create'),
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(values.props !== undefined ? { props: parseJsonArrayFlag(values.props, '--props') } : {}),
      ...(values.variants !== undefined ? { variants: parseJsonArrayFlag(values.variants, '--variants') } : {}),
      ...(values.scope !== undefined ? { scope: values.scope } : {}),
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  if (sub === 'update') {
    const [projectId, componentId] = expectPositionals(rest, 2, 'nexo component update <projectId> <componentId> [--patch JSON]');
    return {
      kind: 'component.update',
      projectId,
      componentId,
      ...(values.patch !== undefined ? { patchJson: values.patch } : {}),
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  if (sub === 'delete' || sub === 'publish') {
    const [projectId, componentId] = expectPositionals(rest, 2, `nexo component ${sub} <projectId> <componentId>`);
    const approval = withApproval(buildApproval(values));
    return sub === 'delete'
      ? { kind: 'component.delete', projectId, componentId, ...approval, json }
      : { kind: 'component.publish', projectId, componentId, ...approval, json };
  }
  throw new CliUsageError(`subcomando component desconhecido: '${String(sub)}'`);
}

/** Parsing dos comandos M3 `nexo media *` (M3-CONTRACTS §3.3). */
function parseMediaCommand(
  sub: string | undefined,
  rest: string[],
  values: M3FlagValues,
  json: boolean,
): CliCommand {
  if (sub === 'list') {
    const [projectId] = expectPositionals(rest, 1, 'nexo media list <projectId> [--filter F]');
    return {
      kind: 'media.list',
      projectId,
      ...(values.filter !== undefined ? { filter: values.filter } : {}),
      json,
    };
  }
  if (sub === 'read') {
    const [projectId, assetId] = expectPositionals(rest, 2, 'nexo media read <projectId> <assetId> [--include-content]');
    return { kind: 'media.read', projectId, assetId, includeContent: values['include-content'] === true, json };
  }
  if (sub === 'search') {
    const [projectId, query] = expectPositionals(rest, 2, 'nexo media search <projectId> <query>');
    return { kind: 'media.search', projectId, query, json };
  }
  if (sub === 'upload') {
    const [projectId, file] = expectPositionals(rest, 2, 'nexo media upload <projectId> <file> [--name N] [--target-path P]');
    return {
      kind: 'media.upload',
      projectId,
      file,
      ...(values.name !== undefined ? { fileName: values.name } : {}),
      ...(values['target-path'] !== undefined ? { targetPath: values['target-path'] } : {}),
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  if (sub === 'update') {
    const [projectId, assetId] = expectPositionals(rest, 2, 'nexo media update <projectId> <assetId> [--name N] [--alt A] [--caption C]');
    if (values.name === undefined && values.alt === undefined && values.caption === undefined) {
      throw new CliUsageError('media update exige ao menos um campo de metadata: --name, --alt ou --caption (08§82)');
    }
    return {
      kind: 'media.update',
      projectId,
      assetId,
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.alt !== undefined ? { alt: values.alt } : {}),
      ...(values.caption !== undefined ? { caption: values.caption } : {}),
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  if (sub === 'replace') {
    const [projectId, assetId, file] = expectPositionals(rest, 3, 'nexo media replace <projectId> <assetId> <file>');
    return { kind: 'media.replace', projectId, assetId, file, ...withApproval(buildApproval(values)), json };
  }
  if (sub === 'delete') {
    const [projectId, assetId] = expectPositionals(rest, 2, 'nexo media delete <projectId> <assetId> [--confirm]');
    return {
      kind: 'media.delete',
      projectId,
      assetId,
      confirm: values.confirm === true,
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  throw new CliUsageError(`subcomando media desconhecido: '${String(sub)}'`);
}

/** Parsing dos comandos M3 `nexo design *` / `nexo theme *` (M3-CONTRACTS §3.4). */
function parseDesignCommand(
  group: 'design' | 'theme',
  sub: string | undefined,
  rest: string[],
  values: M3FlagValues,
  json: boolean,
): CliCommand {
  if (group === 'design') {
    if (sub === 'read') {
      const [projectId] = expectPositionals(rest, 1, 'nexo design read <projectId>');
      return { kind: 'design.read', projectId, json };
    }
    if (sub === 'update') {
      const usage = 'nexo design update <projectId> --target T --property P --value V';
      const [projectId] = expectPositionals(rest, 1, usage);
      return {
        kind: 'design.update',
        projectId,
        target: requireFlag(values.target, '--target <T>', usage),
        property: requireFlag(values.property, '--property <P>', usage),
        value: requireFlag(values.value, '--value <V>', usage),
        ...withApproval(buildApproval(values)),
        json,
      };
    }
    if (sub === 'token-read') {
      const [projectId] = expectPositionals(rest, 1, 'nexo design token-read <projectId> [--token-ref R]');
      return {
        kind: 'design.token.read',
        projectId,
        ...(values['token-ref'] !== undefined ? { tokenRef: values['token-ref'] } : {}),
        json,
      };
    }
    if (sub === 'token-update') {
      const usage = 'nexo design token-update <projectId> --token-ref R --value V';
      const [projectId] = expectPositionals(rest, 1, usage);
      return {
        kind: 'design.token.update',
        projectId,
        tokenRef: requireFlag(values['token-ref'], '--token-ref <R>', usage),
        value: requireFlag(values.value, '--value <V>', usage),
        ...withApproval(buildApproval(values)),
        json,
      };
    }
    throw new CliUsageError(`subcomando design desconhecido: '${String(sub)}'`);
  }
  if (sub === 'read') {
    const [projectId] = expectPositionals(rest, 1, 'nexo theme read <projectId>');
    return { kind: 'theme.read', projectId, json };
  }
  if (sub === 'update') {
    const usage = 'nexo theme update <projectId> --theme <T> [--patch JSON]';
    const [projectId] = expectPositionals(rest, 1, usage);
    return {
      kind: 'theme.update',
      projectId,
      theme: requireFlag(values.theme, '--theme <T>', usage),
      ...(values.patch !== undefined ? { patchJson: values.patch } : {}),
      ...withApproval(buildApproval(values)),
      json,
    };
  }
  throw new CliUsageError(`subcomando theme desconhecido: '${String(sub)}'`);
}

/** Parsing dos comandos M3 `nexo responsive *` (M3-CONTRACTS §3.5). */
function parseResponsiveCommand(
  sub: string | undefined,
  rest: string[],
  values: M3FlagValues,
  json: boolean,
): CliCommand {
  if (sub === 'viewport-create') {
    const [projectId] = expectPositionals(
      rest,
      1,
      'nexo responsive viewport-create <projectId> --width W --height H [--name N] [--dpr D] [--orientation O]',
    );
    const width = requireDimension(values.width, '--width');
    const height = requireDimension(values.height, '--height');
    const dpr = parseOptionalDpr(values.dpr);
    return {
      kind: 'responsive.viewport.create',
      projectId,
      width,
      height,
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(dpr !== undefined ? { dpr } : {}),
      ...(values.orientation !== undefined ? { orientation: values.orientation } : {}),
      json,
    };
  }
  if (sub === 'preview' || sub === 'diagnose' || sub === 'snapshot') {
    const usage = `nexo responsive ${sub} <projectId> --viewport-id V [--route R]`;
    const [projectId] = expectPositionals(rest, 1, usage);
    const base = {
      projectId,
      viewportId: requireFlag(values['viewport-id'], '--viewport-id <V>', usage),
      ...(values.route !== undefined ? { route: values.route } : {}),
      json,
    };
    if (sub === 'preview') return { kind: 'responsive.preview', ...base };
    if (sub === 'diagnose') return { kind: 'responsive.diagnose', ...base };
    return { kind: 'responsive.snapshot', ...base };
  }
  if (sub === 'stress-test') {
    const usage = 'nexo responsive stress-test <projectId> --viewport-id V --profile P';
    const [projectId] = expectPositionals(rest, 1, usage);
    return {
      kind: 'responsive.stressTest',
      projectId,
      viewportId: requireFlag(values['viewport-id'], '--viewport-id <V>', usage),
      profile: requireFlag(values.profile, '--profile <P>', usage),
      json,
    };
  }
  if (sub === 'compare') {
    const usage = 'nexo responsive compare <projectId> --viewports id1,id2[,id3...]';
    const [projectId] = expectPositionals(rest, 1, usage);
    const raw = requireFlag(values.viewports, '--viewports <id1,id2,...>', usage);
    const viewportIds = raw
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (viewportIds.length < 2) {
      throw new CliUsageError('--viewports inválido: compare exige ao menos 2 viewports (ex.: --viewports mobile,desktop)');
    }
    return { kind: 'responsive.compare', projectId, viewportIds, json };
  }
  throw new CliUsageError(`subcomando responsive desconhecido: '${String(sub)}'`);
}
