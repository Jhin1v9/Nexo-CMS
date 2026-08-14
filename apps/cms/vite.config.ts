import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Proxy /v1 -> Agent API do runtime (apps/runtime/src/main.ts: bind
 * 127.0.0.1, porta NEXO_PORT, default 47820 — mesmo default do client da CLI).
 * Override no dev: NEXO_URL=http://127.0.0.1:<porta> pnpm -F @nexo/cms dev.
 */
const target = process.env['NEXO_URL'] ?? 'http://127.0.0.1:47820';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/v1': { target, changeOrigin: false },
    },
  },
});
