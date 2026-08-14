/**
 * Execução dos comandos M1 (SPEC.md §10): mesma capability do Control Plane
 * via HTTP — a CLI NÃO duplica lógica de domínio (ARCHITECTURE-MAP: one domain
 * capability, many authorized consumers).
 *
 * Saída humana default; --json para JSON puro do value. Erros estruturados ->
 * stderr + exit != 0 (1 = erro de execução; 2 = erro de uso/argv).
 */

import { parseCliArgs, CliUsageError, USAGE, type CliCommand } from './args.js';
import { createNexoClient, type ApiResult, type NexoClient } from './client.js';
import {
  formatCapabilities,
  formatCommandResult,
  formatGitBranchList,
  formatGitDiff,
  formatGitHistory,
  formatGitMutation,
  formatGitStatus,
  formatProjectImport,
  formatProjectList,
  formatProjectOpen,
} from './format.js';

export interface RunIo {
  out: { write(s: string): unknown };
  err: { write(s: string): unknown };
}

type Formatter = (value: never) => string;

async function execute(
  client: NexoClient,
  command: Exclude<CliCommand, { kind: 'help' }>,
  io: RunIo,
): Promise<number> {
  let result: ApiResult;
  let format: Formatter;

  switch (command.kind) {
    case 'capabilities':
      result = await client.capabilities();
      format = formatCapabilities as Formatter;
      break;
    case 'project.import':
      result = await client.invoke('project.import', { rootPath: command.path });
      format = formatProjectImport as Formatter;
      break;
    case 'project.open':
      result = await client.invoke('project.open', { projectId: command.projectId });
      format = formatProjectOpen as Formatter;
      break;
    case 'project.list':
      result = await client.invoke('project.list', {});
      format = formatProjectList as Formatter;
      break;
    case 'runtime.exec':
      result = await client.invoke('runtime.command.execute', {
        projectId: command.projectId,
        command: command.command,
        args: command.args,
        ...(command.timeoutMs !== undefined ? { timeoutMs: command.timeoutMs } : {}),
      });
      format = formatCommandResult as Formatter;
      break;
    // ---- M2 (git): invoke da capability homônima — a CLI NÃO duplica domínio
    case 'git.status':
      result = await client.invoke('git.status', { projectId: command.projectId });
      format = formatGitStatus as Formatter;
      break;
    case 'git.diff':
      result = await client.invoke('git.diff', {
        projectId: command.projectId,
        ...(command.mode !== undefined ? { mode: command.mode } : {}),
        ...(command.from !== undefined ? { from: command.from } : {}),
        ...(command.to !== undefined ? { to: command.to } : {}),
        ...(command.path !== undefined ? { path: command.path } : {}),
      });
      format = formatGitDiff as Formatter;
      break;
    case 'git.history':
      result = await client.invoke('git.history', {
        projectId: command.projectId,
        ...(command.limit !== undefined ? { limit: command.limit } : {}),
        ...(command.ref !== undefined ? { ref: command.ref } : {}),
      });
      format = formatGitHistory as Formatter;
      break;
    case 'git.branch.list':
      result = await client.invoke('git.branch.list', { projectId: command.projectId });
      format = formatGitBranchList as Formatter;
      break;
    case 'git.branch.create':
      result = await client.invoke('git.branch.create', {
        projectId: command.projectId,
        name: command.name,
        ...(command.startPoint !== undefined ? { startPoint: command.startPoint } : {}),
        ...(command.checkout ? { checkout: true } : {}),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.branch.switch':
      result = await client.invoke('git.branch.switch', { projectId: command.projectId, name: command.name });
      format = formatGitMutation as Formatter;
      break;
    case 'git.branch.delete':
      result = await client.invoke('git.branch.delete', { projectId: command.projectId, name: command.name });
      format = formatGitMutation as Formatter;
      break;
    case 'git.commit':
      result = await client.invoke('git.commit', {
        projectId: command.projectId,
        message: command.message,
        ...(command.files !== undefined ? { files: command.files } : {}),
        ...(command.all ? { all: true } : {}),
        ...(command.expectedHead !== undefined ? { expectedHead: command.expectedHead } : {}),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.push':
      result = await client.invoke('git.push', {
        projectId: command.projectId,
        ...(command.remote !== undefined ? { remote: command.remote } : {}),
        ...(command.branch !== undefined ? { branch: command.branch } : {}),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.pull':
      result = await client.invoke('git.pull', {
        projectId: command.projectId,
        ...(command.remote !== undefined ? { remote: command.remote } : {}),
        ...(command.branch !== undefined ? { branch: command.branch } : {}),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.fetch':
      result = await client.invoke('git.fetch', {
        projectId: command.projectId,
        ...(command.remote !== undefined ? { remote: command.remote } : {}),
      });
      format = formatGitMutation as Formatter;
      break;
  }

  if (!result.ok) {
    // Erro estruturado -> stderr + exit != 0 (SPEC §10). --json também em erro:
    // agents consomem o envelope completo.
    if ('json' in command && command.json) {
      io.err.write(`${JSON.stringify({ ok: false, error: result.error }, null, 2)}\n`);
    } else {
      const approval = result.error.requiresApproval === true ? ' (requer aprovação explícita)' : '';
      io.err.write(`erro [${result.error.code}]${approval}: ${result.error.message}\n`);
    }
    return 1;
  }

  if ('json' in command && command.json) {
    io.out.write(`${JSON.stringify(result.value, null, 2)}\n`);
  } else {
    io.out.write(`${format(result.value as never)}\n`);
  }
  return 0;
}

export async function run(argv: readonly string[], io: RunIo, client?: NexoClient): Promise<number> {
  let command: CliCommand;
  try {
    command = parseCliArgs(argv);
  } catch (e) {
    if (e instanceof CliUsageError) {
      io.err.write(`uso inválido: ${e.message}\n\n${USAGE}`);
      return 2;
    }
    throw e;
  }

  if (command.kind === 'help') {
    io.out.write(USAGE);
    return 0;
  }

  return execute(client ?? createNexoClient(), command, io);
}
