#!/usr/bin/env node
/**
 * Entrypoint do Agent API (SPEC.md §9): bind 127.0.0.1, porta NEXO_PORT
 * (default 47820). Falha de bootstrap (ex.: STORAGE_UNAVAILABLE) -> stderr
 * estruturado + exit != 0 (No Fake Success).
 */

// dep: @hono/node-server — adapter Node oficial do Hono (serve HTTP em 127.0.0.1; SPEC §9).
import { serve } from '@hono/node-server';

import { createRuntime } from './bootstrap.js';

const DEFAULT_PORT = 47820;

function main(): void {
  const portRaw = process.env['NEXO_PORT'];
  const port = portRaw !== undefined ? Number.parseInt(portRaw, 10) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    process.stderr.write(`[nexo-runtime] NEXO_PORT inválida: '${String(portRaw)}'\n`);
    process.exit(1);
  }

  const runtime = createRuntime();
  if (!runtime.ok) {
    process.stderr.write(`[nexo-runtime] bootstrap falhou: ${JSON.stringify(runtime.error)}\n`);
    process.exit(1);
  }

  serve({ fetch: runtime.value.app.fetch, hostname: '127.0.0.1', port }, (info) => {
    process.stdout.write(`[nexo-runtime] Agent API ouvindo em http://127.0.0.1:${info.port}/v1\n`);
  });

  const shutdown = (): void => {
    runtime.value.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
