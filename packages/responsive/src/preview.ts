/**
 * Responsive Preview (doc 09§27; M3 §8.2: preview = runtime REAL do projeto).
 *
 * Fluxo: Select Project -> Select Viewport -> Start/Reuse Preview -> Render.
 * - O comando do dev server vem dos scripts REAIS do projeto (scanner de
 *   @nexo/intelligence quando injetado; fallback documentado: leitura direta
 *   do package.json). NUNCA assume 'dev': se nenhum script aplicável existir,
 *   erro honesto PREVIEW_SCRIPT_UNKNOWN com os scripts disponíveis.
 * - Spawn SEM shell (args estruturados — mesma disciplina do CommandExecutor
 *   de @nexo/runtime). Scripts com operadores de shell (&&, |, ;, >, `$(`),
 *   assignments de env ou múltiplos comandos NÃO são executáveis sem shell:
 *   UNSUPPORTED honesto em vez de shell escondido.
 * - DESVIO JUSTIFICADO: CommandExecutor.execute é request/response BOUNDED
 *   (resolve só no exit; mata apenas no próprio timeout; sem API de stop) —
 *   incompatível com dev server long-lived + "registrar processo para stop".
 *   Aqui: spawn direto com as mesmas garantias (shell:false, timeout real,
 *   kill SIGTERM->SIGKILL) + registro no ProcessRegistry de @nexo/runtime,
 *   para que process.list reflita o preview.
 * - URL real: extraída do stdout do server e/ou porta alocada; aguardada por
 *   polling HTTP real até responder (qualquer status < 500) ou timeout.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';

import { err, nexoError, ok, type Result } from '@nexo/shared';
import type { ProcessRegistry } from '@nexo/runtime';

import { responsiveError } from './errors.js';
import type { PreviewInfo, ProjectScriptsScanner, Viewport } from './types.js';

export const DEFAULT_PREVIEW_STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;
const STOP_GRACE_MS = 2_000;

export interface PreviewManagerOptions {
  processRegistry?: ProcessRegistry;
  /** Scanner de scripts (ex.: createProjectScanner() de @nexo/intelligence). */
  scanner?: ProjectScriptsScanner;
  startupTimeoutMs?: number;
  /** Nome do script de dev a usar; default: 'dev' SOMENTE se declarado. */
  scriptName?: string;
}

export interface PreviewStartInput {
  projectId: string;
  rootPath: string;
  viewport: Viewport;
  route?: string;
}

export interface PreviewManager {
  start(input: PreviewStartInput): Promise<Result<PreviewInfo>>;
  stop(projectId: string): Promise<Result<{ stopped: true; projectId: string }>>;
  stopAll(): Promise<void>;
  running(): PreviewInfo[];
}

interface ParsedScriptCommand {
  bin: string;
  args: string[];
}

const SHELL_OPERATOR_RE = /(&&|\|\||[;|><`$]|\\\n)/;

/** Tokeniza sem shell. Qualquer operador de shell -> null (UNSUPPORTED). */
export function parseScriptCommand(command: string): ParsedScriptCommand | null {
  const trimmed = command.trim();
  if (trimmed.length === 0 || SHELL_OPERATOR_RE.test(trimmed)) return null;
  const tokens = trimmed.split(/\s+/);
  const bin = tokens[0];
  if (!bin || /^[A-Za-z_][A-Za-z0-9_]*=/.test(bin)) return null; // env assignment precisa de shell
  return { bin, args: tokens.slice(1) };
}

async function readPackageScripts(rootPath: string, scanner?: ProjectScriptsScanner): Promise<Result<Record<string, string>>> {
  if (scanner) {
    const scanned = await scanner.scan(rootPath);
    if (scanned.ok && scanned.value.scripts.value !== null) {
      return ok(scanned.value.scripts.value);
    }
    // Scanner sem evidência -> cai no fallback honesto abaixo.
  }
  // Fallback documentado: leitura direta do package.json do projeto.
  let raw: string;
  try {
    raw = await fs.readFile(path.join(rootPath, 'package.json'), 'utf8');
  } catch (cause) {
    return err(
      responsiveError('NOT_FOUND', 'PROJECT_NOT_FOUND', `package.json not readable at '${rootPath}'`, {
        resource: rootPath,
        details: { cause: (cause as NodeJS.ErrnoException).message },
        nextAction: 'verifique o rootPath do projeto',
      }),
    );
  }
  try {
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return ok(pkg.scripts ?? {});
  } catch {
    return err(
      nexoError('INVALID_INPUT', `package.json inválido em '${rootPath}'`, { resource: rootPath }),
    );
  }
}

function chooseDevScript(scripts: Record<string, string>, preferred?: string): Result<{ name: string; command: string }> {
  const names = Object.keys(scripts);
  if (preferred !== undefined) {
    const command = scripts[preferred];
    if (command === undefined) {
      return err(
        responsiveError('INVALID_INPUT', 'PREVIEW_SCRIPT_UNKNOWN', `script '${preferred}' não declarado no package.json`, {
          details: { availableScripts: names, nextAction: `declare o script '${preferred}' ou escolha um de: ${names.join(', ') || '(nenhum)'}` },
        }),
      );
    }
    return ok({ name: preferred, command });
  }
  // NUNCA assumir 'dev': só usamos se estiver REALMENTE declarado (M3 brief).
  const dev = scripts['dev'];
  if (dev !== undefined) return ok({ name: 'dev', command: dev });
  return err(
    responsiveError('UNSUPPORTED', 'PREVIEW_SCRIPT_UNKNOWN', 'nenhum script de dev server identificado no projeto', {
      details: {
        availableScripts: names,
        nextAction: "declare um script 'dev' no package.json do projeto ou passe scriptName explicitamente",
      },
    }),
  );
}

function allocatePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      srv.close(() => (port > 0 ? resolve(port) : reject(new Error('failed to allocate port'))));
    });
  });
}

const URL_RE = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d+)\/?/i;

async function waitForUrl(url: string, timeoutMs: number, child: ChildProcess): Promise<Result<void>> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no attempt made';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      return err(
        responsiveError('INTERNAL', 'PREVIEW_START_FAILED', `dev server exited before responding (exitCode=${child.exitCode})`, {
          retryable: true,
          details: { url },
          nextAction: 'inspecione os logs do dev server do projeto',
        }),
      );
    }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2_000), redirect: 'manual' });
      if (res.status < 500) return ok(undefined); // server REAL respondendo
      lastError = `HTTP ${res.status}`;
    } catch (cause) {
      lastError = (cause as Error).message;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return err(
    responsiveError('INTERNAL', 'PREVIEW_NOT_RESPONDING', `dev server não respondeu em ${timeoutMs}ms em ${url}`, {
      resource: url,
      retryable: true,
      details: { lastError },
      nextAction: 'verifique se o dev server sobe manualmente com o mesmo script',
    }),
  );
}

interface RunningPreview {
  info: PreviewInfo;
  child: ChildProcess;
}

export function createPreviewManager(opts: PreviewManagerOptions = {}): PreviewManager {
  const startupTimeoutMs = opts.startupTimeoutMs ?? DEFAULT_PREVIEW_STARTUP_TIMEOUT_MS;
  const sessions = new Map<string, RunningPreview>();

  async function start(input: PreviewStartInput): Promise<Result<PreviewInfo>> {
    const existing = sessions.get(input.projectId);
    if (existing && existing.child.exitCode === null) {
      // Start / Reuse (09§27): dev server é por projeto; viewport é por página.
      return ok({ ...existing.info, reused: true, viewport: input.viewport });
    }
    if (existing) sessions.delete(input.projectId);

    const scriptsResult = await readPackageScripts(input.rootPath, opts.scanner);
    if (!scriptsResult.ok) return scriptsResult;
    const chosen = chooseDevScript(scriptsResult.value, opts.scriptName);
    if (!chosen.ok) return chosen;

    const parsed = parseScriptCommand(chosen.value.command);
    if (!parsed) {
      return err(
        responsiveError('UNSUPPORTED', 'PREVIEW_SCRIPT_UNKNOWN', `script '${chosen.value.name}' requer shell (operadores/env/multi-comando) — não executado`, {
          details: {
            script: chosen.value.command,
            nextAction: 'simplifique o script para um único comando com args literais (spawn é SEM shell, SPEC §4)',
          },
        }),
      );
    }

    // Binário resolvido no node_modules/.bin do projeto quando presente
    // (mesmo efeito de `npm run`, sem shell); senão, PATH do ambiente.
    const localBin = path.join(input.rootPath, 'node_modules', '.bin', parsed.bin);
    const bin = existsSync(localBin) ? localBin : parsed.bin;

    let args = [...parsed.args];
    let expectedUrl: string | null = null;
    // Vite: porta determinística via flag real do CLI (evita colisão entre
    // previews paralelos). Só injeta se o script não fixar porta.
    if (parsed.bin === 'vite' && !args.some((a) => a === '--port' || a === '-p' || a.startsWith('--port='))) {
      try {
        const port = await allocatePort();
        args = [...args, '--port', String(port), '--strictPort'];
        expectedUrl = `http://localhost:${port}/`;
      } catch {
        // sem porta alocada: cai na detecção via stdout
      }
    }

    const startedAt = new Date().toISOString();
    const child = spawn(bin, args, {
      shell: false,
      cwd: input.rootPath,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (child.pid !== undefined) {
      opts.processRegistry?.registerStart({
        pid: child.pid,
        command: bin,
        args: [...args],
        startedAt,
      });
    }
    const pid = child.pid;
    child.once('exit', (code) => {
      if (pid !== undefined) {
        opts.processRegistry?.registerEnd(pid, startedAt, {
          status: 'EXITED',
          endedAt: new Date().toISOString(),
          exitCode: code,
        });
      }
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c: string) => {
      stdoutBuf += c;
    });
    child.stderr.on('data', (c: string) => {
      stderrBuf += c;
    });

    const spawnError = await new Promise<string | null>((resolve) => {
      child.once('error', (e) => resolve(e.message));
      // Se o spawn não falhar rápido, seguimos para a detecção de URL.
      setTimeout(() => resolve(null), 1_000).unref();
    });
    if (spawnError !== null) {
      return err(
        responsiveError('INTERNAL', 'PREVIEW_START_FAILED', `falha ao spawnar dev server: ${spawnError}`, {
          resource: chosen.value.command,
          retryable: true,
          details: { bin, args },
          nextAction: 'verifique se as dependências do projeto estão instaladas (node_modules)',
        }),
      );
    }

    // URL: porta conhecida (vite) OU detectada no stdout (ex.: "Local: http://localhost:5173/").
    const urlFromStdout = (): string | null => {
      const m = URL_RE.exec(stdoutBuf);
      return m ? m[0] : null;
    };
    let url = expectedUrl ?? urlFromStdout();
    const detectDeadline = Date.now() + startupTimeoutMs;
    while (url === null && Date.now() < detectDeadline && child.exitCode === null) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      url = urlFromStdout();
    }
    if (url === null) {
      await killChild(child);
      return err(
        responsiveError('INTERNAL', 'PREVIEW_START_FAILED', 'não foi possível determinar a URL do dev server', {
          resource: chosen.value.command,
          retryable: true,
          details: { stdout: stdoutBuf.slice(0, 1_000), stderr: stderrBuf.slice(0, 1_000) },
          nextAction: 'use um dev server que reporte a URL (ex.: vite) ou fixe --port no script',
        }),
      );
    }

    const remainingMs = Math.max(1_000, detectDeadline - Date.now());
    const ready = await waitForUrl(url, remainingMs, child);
    if (!ready.ok) {
      await killChild(child);
      return err({
        ...ready.error,
        details: { ...ready.error.details, stdout: stdoutBuf.slice(0, 1_000), stderr: stderrBuf.slice(0, 1_000) },
      });
    }

    const route = input.route ?? '/';
    const info: PreviewInfo = {
      projectId: input.projectId,
      previewUrl: new URL(route, url).toString(),
      state: 'RUNNING',
      reused: false,
      viewport: input.viewport,
      route,
      scriptName: chosen.value.name,
      ...(child.pid !== undefined ? { pid: child.pid } : {}),
    };
    sessions.set(input.projectId, { info, child });
    return ok(info);
  }

  async function killChild(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      const force = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, STOP_GRACE_MS);
      child.once('exit', () => {
        clearTimeout(force);
        resolve();
      });
      child.kill('SIGTERM');
    });
  }

  return {
    start,
    async stop(projectId) {
      const session = sessions.get(projectId);
      if (!session) {
        return err(
          responsiveError('NOT_FOUND', 'PREVIEW_NOT_RUNNING', `nenhum preview ativo para '${projectId}'`, {
            resource: projectId,
            nextAction: 'inicie um preview com responsive.preview',
          }),
        );
      }
      sessions.delete(projectId);
      await killChild(session.child);
      return ok({ stopped: true, projectId });
    },
    async stopAll() {
      const all = [...sessions.values()];
      sessions.clear();
      await Promise.all(all.map((s) => killChild(s.child)));
    },
    running() {
      return [...sessions.values()]
        .filter((s) => s.child.exitCode === null)
        .map((s) => ({ ...s.info }));
    },
  };
}
