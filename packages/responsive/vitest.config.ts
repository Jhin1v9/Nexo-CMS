/**
 * Vitest config de @nexo/responsive.
 *
 * Timeouts elevados JUSTIFICADOS: testes de browser/dev server REAIS
 * (vite cold start + chromium headless) — D14 exige browser real e proíbe
 * fake, então pagamos o custo real de boot.
 *
 * NOTA de serialização: funções passadas a page.evaluate são auto-contidas
 * (constantes no corpo da função) — transpilers que injetam helpers de
 * módulo (ex.: esbuild/tsx com keepNames) quebram evaluate; os testes rodam
 * via Vitest/oxc sem esse helper.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 180_000,
    hookTimeout: 120_000,
  },
});
