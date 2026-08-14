/**
 * Execução dos comandos M1/M2/M3 (SPEC.md §10, M3-CONTRACTS §3): mesma
 * capability do Control Plane via HTTP — a CLI NÃO duplica lógica de domínio
 * (ARCHITECTURE-MAP: one domain capability, many authorized consumers).
 *
 * Saída humana default; --json para JSON puro do value. Erros estruturados ->
 * stderr + exit != 0 (1 = erro de execução; 2 = erro de uso/argv), com code +
 * nextAction quando o Control Plane os fornece.
 */

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { parseCliArgs, CliUsageError, USAGE, type CliApproval, type CliCommand } from './args.js';
import { createNexoClient, type ApiResult, type NexoClient } from './client.js';
import {
  formatCapabilities,
  formatChangeList,
  formatChangeObject,
  formatChangePreview,
  formatCommandResult,
  formatComponentList,
  formatComponentSchema,
  formatDesignModel,
  formatDiagnosticIssues,
  formatEditorOpen,
  formatEditorSave,
  formatGeneric,
  formatGitBranchList,
  formatGitDiff,
  formatGitHistory,
  formatGitMutation,
  formatGitStatus,
  formatKeyValue,
  formatMediaList,
  formatMediaMetadata,
  formatProjectImport,
  formatProjectList,
  formatProjectOpen,
  formatResponsivePreview,
  formatThemes,
  formatViewport,
} from './format.js';

export interface RunIo {
  out: { write(s: string): unknown };
  err: { write(s: string): unknown };
  /**
   * Lê stdin completo (conteúdo de `editor save`, JSON de patch/change quando
   * a flag é omitida). Injetável nos testes; default = process.stdin.
   */
  readStdin?: () => Promise<string>;
}

async function defaultReadStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

type Formatter = (value: never) => string;

/** Spread condicional do envelope de aprovação D17 no input do invoke. */
function approvalInput(command: CliCommand): { approval?: CliApproval } {
  return 'approval' in command && command.approval !== undefined ? { approval: command.approval } : {};
}

/**
 * JSON inline (flag) ou via stdin quando a flag é omitida (patch de
 * component.update/theme.update, ChangeInput de editor.change-create).
 * JSON malformado -> erro de uso (exit 2), nunca enviado ao servidor.
 */
async function resolveJsonInput(raw: string | undefined, io: RunIo, what: string): Promise<unknown> {
  const text = raw ?? (await (io.readStdin ?? defaultReadStdin)());
  if (text.trim().length === 0) {
    throw new CliUsageError(`${what}: JSON ausente (use a flag ou forneça via stdin)`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (e) {
    throw new CliUsageError(`${what}: JSON malformado (${(e as Error).message})`);
  }
}

/**
 * Operações potencialmente longas (diagnose/stress/compare/snapshot usam
 * browser real, 09§46): mensagem de progresso HONESTA em stderr — apenas
 * início e duração real medida; nunca progresso fabricado.
 */
async function withProgress<T>(io: RunIo, label: string, fn: () => Promise<T>): Promise<T> {
  io.err.write(`${label}...`);
  const start = Date.now();
  try {
    const result = await fn();
    io.err.write(` concluído em ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    return result;
  } catch (e) {
    io.err.write(` falhou após ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    throw e;
  }
}

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
        ...approvalInput(command),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.branch.switch':
      result = await client.invoke('git.branch.switch', {
        projectId: command.projectId,
        name: command.name,
        ...approvalInput(command),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.branch.delete':
      result = await client.invoke('git.branch.delete', {
        projectId: command.projectId,
        name: command.name,
        ...approvalInput(command),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.commit':
      result = await client.invoke('git.commit', {
        projectId: command.projectId,
        message: command.message,
        ...(command.files !== undefined ? { files: command.files } : {}),
        ...(command.all ? { all: true } : {}),
        ...(command.expectedHead !== undefined ? { expectedHead: command.expectedHead } : {}),
        ...approvalInput(command),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.push':
      result = await client.invoke('git.push', {
        projectId: command.projectId,
        ...(command.remote !== undefined ? { remote: command.remote } : {}),
        ...(command.branch !== undefined ? { branch: command.branch } : {}),
        ...approvalInput(command),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.pull':
      result = await client.invoke('git.pull', {
        projectId: command.projectId,
        ...(command.remote !== undefined ? { remote: command.remote } : {}),
        ...(command.branch !== undefined ? { branch: command.branch } : {}),
        ...approvalInput(command),
      });
      format = formatGitMutation as Formatter;
      break;
    case 'git.fetch':
      result = await client.invoke('git.fetch', {
        projectId: command.projectId,
        ...(command.remote !== undefined ? { remote: command.remote } : {}),
        ...approvalInput(command),
      });
      format = formatGitMutation as Formatter;
      break;
    // ---- M3: editor (M3-CONTRACTS §3.1) — ids EXATOS do contrato
    case 'editor.open':
      result = await client.invoke('editor.source.open', {
        projectId: command.projectId,
        filePath: command.filePath,
      });
      format = formatEditorOpen as Formatter;
      break;
    case 'editor.save': {
      // Conteúdo novo via stdin (arquivos grandes não cabem em argv).
      const content = await (io.readStdin ?? defaultReadStdin)();
      result = await client.invoke('editor.source.save', {
        projectId: command.projectId,
        filePath: command.filePath,
        content,
        ...(command.expectedHash !== undefined ? { expectedHash: command.expectedHash } : {}),
        ...approvalInput(command),
      });
      format = formatEditorSave as Formatter;
      break;
    }
    case 'editor.selection.read':
      result = await client.invoke('editor.selection.read', {
        projectId: command.projectId,
        route: command.route,
        nodeRef: command.nodeRef,
      });
      format = formatGeneric as Formatter;
      break;
    case 'editor.change.create': {
      const change = await resolveJsonInput(command.changeJson, io, 'editor change-create (ChangeInput)');
      result = await client.invoke('editor.change.create', {
        projectId: command.projectId,
        change,
      });
      format = formatChangeObject as Formatter;
      break;
    }
    case 'editor.change.preview':
      result = await client.invoke('editor.change.preview', {
        projectId: command.projectId,
        changeId: command.changeId,
      });
      format = formatChangePreview as Formatter;
      break;
    case 'editor.change.apply':
      result = await client.invoke('editor.change.apply', {
        projectId: command.projectId,
        changeId: command.changeId,
        ...(command.expectedHash !== undefined ? { expectedHash: command.expectedHash } : {}),
        ...approvalInput(command),
      });
      format = formatEditorSave as Formatter;
      break;
    case 'editor.change.reject':
      result = await client.invoke('editor.change.reject', {
        projectId: command.projectId,
        changeId: command.changeId,
      });
      format = formatKeyValue as Formatter;
      break;
    case 'editor.change.list':
      result = await client.invoke('editor.change.list', { projectId: command.projectId });
      format = formatChangeList as Formatter;
      break;
    case 'editor.change.undo':
      result = await client.invoke('editor.change.undo', {
        projectId: command.projectId,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    case 'editor.change.redo':
      result = await client.invoke('editor.change.redo', {
        projectId: command.projectId,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    // ---- M3: components (M3-CONTRACTS §3.2)
    case 'component.list':
      result = await client.invoke('component.list', {
        projectId: command.projectId,
        ...(command.scope !== undefined ? { scope: command.scope } : {}),
      });
      format = formatComponentList as Formatter;
      break;
    case 'component.read':
      result = await client.invoke('component.read', {
        projectId: command.projectId,
        componentId: command.componentId,
      });
      format = formatComponentSchema as Formatter;
      break;
    case 'component.create':
      result = await client.invoke('component.create', {
        projectId: command.projectId,
        name: command.name,
        ...(command.description !== undefined ? { description: command.description } : {}),
        props: command.props ?? [],
        ...(command.variants !== undefined ? { variants: command.variants } : {}),
        ...(command.scope !== undefined ? { scope: command.scope } : {}),
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    case 'component.update': {
      const patch = await resolveJsonInput(command.patchJson, io, 'component update (patch)');
      result = await client.invoke('component.update', {
        projectId: command.projectId,
        componentId: command.componentId,
        patch,
        ...approvalInput(command),
      });
      format = formatChangePreview as Formatter; // Diff retornado (08§22)
      break;
    }
    case 'component.delete':
      result = await client.invoke('component.delete', {
        projectId: command.projectId,
        componentId: command.componentId,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    case 'component.publish':
      result = await client.invoke('component.publish', {
        projectId: command.projectId,
        componentId: command.componentId,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    // ---- M3: media (M3-CONTRACTS §3.3)
    case 'media.list':
      result = await client.invoke('media.list', {
        projectId: command.projectId,
        ...(command.filter !== undefined ? { filter: command.filter } : {}),
      });
      format = formatMediaList as Formatter;
      break;
    case 'media.read':
      result = await client.invoke('media.read', {
        projectId: command.projectId,
        assetId: command.assetId,
        ...(command.includeContent ? { includeContent: true } : {}),
      });
      format = formatMediaMetadata as Formatter;
      break;
    case 'media.search':
      result = await client.invoke('media.search', {
        projectId: command.projectId,
        query: command.query,
      });
      format = formatMediaList as Formatter;
      break;
    case 'media.upload': {
      // Leitura do arquivo local é I/O da CLI (transporte); validação de MIME
      // real é do servidor (08§45) — a CLI NÃO adivinha tipo por extensão.
      let contentBase64: string;
      try {
        contentBase64 = (await readFile(command.file)).toString('base64');
      } catch (e) {
        io.err.write(`erro [LOCAL_IO]: não foi possível ler '${command.file}' (${(e as Error).message})\n`);
        return 1;
      }
      result = await client.invoke('media.upload', {
        projectId: command.projectId,
        fileName: command.fileName ?? basename(command.file),
        contentBase64,
        ...(command.targetPath !== undefined ? { targetPath: command.targetPath } : {}),
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    }
    case 'media.update':
      result = await client.invoke('media.update', {
        projectId: command.projectId,
        assetId: command.assetId,
        ...(command.name !== undefined ? { name: command.name } : {}),
        ...(command.alt !== undefined ? { alt: command.alt } : {}),
        ...(command.caption !== undefined ? { caption: command.caption } : {}),
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    case 'media.replace': {
      let contentBase64: string;
      try {
        contentBase64 = (await readFile(command.file)).toString('base64');
      } catch (e) {
        io.err.write(`erro [LOCAL_IO]: não foi possível ler '${command.file}' (${(e as Error).message})\n`);
        return 1;
      }
      result = await client.invoke('media.replace', {
        projectId: command.projectId,
        assetId: command.assetId,
        fileName: basename(command.file),
        contentBase64,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    }
    case 'media.delete':
      result = await client.invoke('media.delete', {
        projectId: command.projectId,
        assetId: command.assetId,
        // 08§51: com referências conhecidas o servidor exige confirm:true;
        // Unknown NUNCA é tratado como Unused (decisão do servidor, não da CLI).
        ...(command.confirm ? { confirm: true } : {}),
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    // ---- M3: design/theme (M3-CONTRACTS §3.4)
    case 'design.read':
      result = await client.invoke('design.read', { projectId: command.projectId });
      format = formatDesignModel as Formatter;
      break;
    case 'design.update':
      result = await client.invoke('design.update', {
        projectId: command.projectId,
        target: command.target,
        property: command.property,
        value: command.value,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    case 'design.token.read':
      result = await client.invoke('design.token.read', {
        projectId: command.projectId,
        ...(command.tokenRef !== undefined ? { tokenRef: command.tokenRef } : {}),
      });
      format = formatDesignModel as Formatter;
      break;
    case 'design.token.update':
      result = await client.invoke('design.token.update', {
        projectId: command.projectId,
        tokenRef: command.tokenRef,
        value: command.value,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    case 'theme.read':
      result = await client.invoke('theme.read', { projectId: command.projectId });
      format = formatThemes as Formatter;
      break;
    case 'theme.update': {
      const patch = await resolveJsonInput(command.patchJson, io, 'theme update (patch)');
      result = await client.invoke('theme.update', {
        projectId: command.projectId,
        theme: command.theme,
        patch,
        ...approvalInput(command),
      });
      format = formatKeyValue as Formatter;
      break;
    }
    // ---- M3: responsive (M3-CONTRACTS §3.5) — browser real (09§46)
    case 'responsive.viewport.create':
      result = await client.invoke('responsive.viewport.create', {
        projectId: command.projectId,
        width: command.width,
        height: command.height,
        ...(command.name !== undefined ? { name: command.name } : {}),
        ...(command.dpr !== undefined ? { dpr: command.dpr } : {}),
        ...(command.orientation !== undefined ? { orientation: command.orientation } : {}),
      });
      format = formatViewport as Formatter;
      break;
    case 'responsive.preview':
      result = await client.invoke('responsive.preview', {
        projectId: command.projectId,
        viewportId: command.viewportId,
        ...(command.route !== undefined ? { route: command.route } : {}),
      });
      format = formatResponsivePreview as Formatter;
      break;
    case 'responsive.diagnose':
      result = await withProgress(io, 'Running diagnostics (real browser)', () =>
        client.invoke('responsive.diagnose', {
          projectId: command.projectId,
          viewportId: command.viewportId,
          ...(command.route !== undefined ? { route: command.route } : {}),
        }),
      );
      format = formatDiagnosticIssues as Formatter;
      break;
    case 'responsive.stressTest':
      result = await withProgress(io, `Running stress test (profile '${command.profile}', content never persisted)`, () =>
        client.invoke('responsive.stressTest', {
          projectId: command.projectId,
          viewportId: command.viewportId,
          profile: command.profile,
        }),
      );
      format = formatDiagnosticIssues as Formatter;
      break;
    case 'responsive.compare':
      result = await withProgress(io, `Comparing ${command.viewportIds.length} viewports (real browser)`, () =>
        client.invoke('responsive.compare', {
          projectId: command.projectId,
          viewportIds: command.viewportIds,
        }),
      );
      format = formatGeneric as Formatter;
      break;
    case 'responsive.snapshot':
      result = await withProgress(io, 'Capturing snapshot (real browser)', () =>
        client.invoke('responsive.snapshot', {
          projectId: command.projectId,
          viewportId: command.viewportId,
          ...(command.route !== undefined ? { route: command.route } : {}),
        }),
      );
      format = formatGeneric as Formatter;
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
      // NexoError estável carrega nextAction (M3-CONTRACTS §3) — sempre impresso.
      if (result.error.nextAction !== undefined) {
        io.err.write(`  próximo passo: ${result.error.nextAction}\n`);
      }
      // D17: sem --approve, REQUIRE_APPROVAL orienta a reexecução explícita.
      // Se approval já foi enviado e ainda assim recusado, a mensagem do
      // servidor (inválido/insuficiente) é a fonte da verdade — sem hint.
      const lacksApproval = !('approval' in command) || command.approval === undefined;
      if (
        lacksApproval &&
        (result.error.requiresApproval === true || result.error.code === 'REQUIRE_APPROVAL')
      ) {
        io.err.write('Requer aprovacao: reexecute com --approve --approver <seu-id>\n');
      }
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

  try {
    return await execute(client ?? createNexoClient(), command, io);
  } catch (e) {
    // Erros de uso tardios (JSON de stdin/flag malformado) -> exit 2.
    if (e instanceof CliUsageError) {
      io.err.write(`uso inválido: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
}
