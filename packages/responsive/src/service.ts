/**
 * ResponsiveService (M3-CONTRACTS §3.5): as 6 capabilities do Responsive Lab.
 *
 * - responsive.viewport.create (+ list/read/delete do registry — 09§24)
 * - responsive.preview (09§27; runtime real do projeto)
 * - responsive.diagnose (09§34-36; browser real — 09§46)
 * - responsive.stressTest (09§32-33; perfis fixos D14; NUNCA persistido)
 * - responsive.compare (09§43; pixelmatch D14)
 * - responsive.snapshot (09§44)
 *
 * Este service NÃO registra capabilities no Control Plane (Wave 3). Quem
 * chama já passou pelo gate de permissão; aqui só execução de domínio.
 * close() encerra TODOS os previews e o browser — use em teardown.
 */

import { err, nexoError, ok, type Result } from '@nexo/shared';
import type { ProcessRegistry } from '@nexo/runtime';
import type { Storage } from '@nexo/storage';

import { createBrowserManager, type BrowserManager, type BrowserSession } from './browser.js';
import { captureRenderedPage } from './capture.js';
import { compareViewports } from './compare.js';
import type { CollectIssuesOptions } from './diagnose.js';
import { responsiveError } from './errors.js';
import { createPreviewManager, type PreviewManager } from './preview.js';
import { captureSnapshot } from './snapshot.js';
import { runStressProfileOnPage } from './stress.js';
import { createViewportRegistry, type ViewportRegistry } from './viewports.js';
import type {
  BrowserCapabilities,
  CompareResult,
  DiagnosticIssue,
  PreviewInfo,
  ProjectBreakpoints,
  ProjectScriptsScanner,
  Snapshot,
  SourceMapperFn,
  StressProfileId,
  StressTestResult,
  Viewport,
  ViewportCreateInput,
  ViewportPreset,
} from './types.js';
import { STRESS_PROFILES } from './stress.js';
import { detectProjectBreakpoints } from './viewports.js';

export interface ResponsiveServiceOptions {
  storage: Storage;
  /** dataDir para artefatos (snapshots/, compare/). Tipicamente o mesmo do storage. */
  dataDir: string;
  scanner?: ProjectScriptsScanner;
  /** Mapper DOM→source (09§37/§50). Ausente = sourceMapping omitido dos issues. */
  sourceMapper?: SourceMapperFn;
  /** Presets de viewport CONFIGURÁVEIS (09§25). Default: DEFAULT_VIEWPORT_PRESETS. */
  presets?: readonly ViewportPreset[];
  seedPresets?: boolean;
  /** Nome do script de dev server (default: 'dev' SOMENTE se declarado no projeto). */
  devScriptName?: string;
  processRegistry?: ProcessRegistry;
  /** Injetável para testes de indisponibilidade (browser sabotado). */
  browserManager?: BrowserManager;
  /** Injetável para testes (preview manager com script/startup controlados). */
  previewManager?: PreviewManager;
  timeouts?: {
    browserLaunchMs?: number;
    navigationMs?: number;
    previewStartupMs?: number;
  };
  /** Default: resolve via storage.repos.projects (ProjectRegistration.rootPath). */
  resolveProjectRoot?: (projectId: string) => Promise<Result<string>>;
}

export interface DiagnoseResult {
  projectId: string;
  route: string;
  viewport: Viewport;
  previewUrl: string;
  issues: DiagnosticIssue[];
  browser: { engine: string; engineVersion: string; capabilities: BrowserCapabilities };
}

export interface ResponsiveService {
  viewportCreate(input: ViewportCreateInput): Result<Viewport>;
  viewportList(): Viewport[];
  viewportRead(id: string): Result<Viewport>;
  viewportDelete(id: string): Result<{ deleted: true; id: string }>;
  projectBreakpoints(projectId: string): Promise<Result<ProjectBreakpoints>>;

  preview(input: { projectId: string; route?: string; viewportId: string }): Promise<Result<PreviewInfo>>;
  diagnose(input: { projectId: string; route?: string; viewportId: string }): Promise<Result<DiagnoseResult>>;
  stressTest(input: {
    projectId: string;
    route?: string;
    viewportId: string;
    profile: StressProfileId;
  }): Promise<Result<StressTestResult>>;
  compare(input: { projectId: string; route?: string; viewportIds: string[] }): Promise<Result<CompareResult>>;
  snapshot(input: { projectId: string; route?: string; viewportId: string }): Promise<Result<Snapshot>>;

  stopPreview(projectId: string): Promise<Result<{ stopped: true; projectId: string }>>;
  /** Encerra previews + browser. Obrigatório em teardown de testes. */
  close(): Promise<void>;
}

/** Capacidades mínimas para diagnósticos geométricos (09§47). */
const REQUIRED_FOR_DIAGNOSTICS: readonly (keyof BrowserCapabilities)[] = ['viewportResize', 'domInspection', 'boundingBoxes'];
const REQUIRED_FOR_SCREENSHOT: readonly (keyof BrowserCapabilities)[] = ['viewportResize', 'screenshots'];

function requireCapabilities(
  session: BrowserSession,
  needed: readonly (keyof BrowserCapabilities)[],
): Result<void> {
  const missing = needed.filter((k) => session.capabilities[k] !== true);
  if (missing.length === 0) return ok(undefined);
  return err(
    responsiveError('UNSUPPORTED', 'BROWSER_UNAVAILABLE', `browser não expõe capacidades necessárias: ${missing.join(', ')}`, {
      retryable: false,
      details: { missingCapabilities: missing, detected: session.capabilities },
      nextAction: 'use um ambiente de browser com suporte a ' + missing.join(', ') + ' (09§47: capacidades são detectadas, não assumidas)',
    }),
  );
}

export function createResponsiveService(opts: ResponsiveServiceOptions): Result<ResponsiveService> {
  const registryResult = createViewportRegistry(opts.storage, {
    ...(opts.presets !== undefined ? { presets: opts.presets } : {}),
    ...(opts.seedPresets !== undefined ? { seedPresets: opts.seedPresets } : {}),
  });
  if (!registryResult.ok) return registryResult;
  const registry: ViewportRegistry = registryResult.value;

  const previews: PreviewManager =
    opts.previewManager ??
    createPreviewManager({
      ...(opts.processRegistry !== undefined ? { processRegistry: opts.processRegistry } : {}),
      ...(opts.scanner !== undefined ? { scanner: opts.scanner } : {}),
      ...(opts.devScriptName !== undefined ? { scriptName: opts.devScriptName } : {}),
      ...(opts.timeouts?.previewStartupMs !== undefined ? { startupTimeoutMs: opts.timeouts.previewStartupMs } : {}),
    });

  const browsers: BrowserManager =
    opts.browserManager ??
    createBrowserManager({
      ...(opts.timeouts?.browserLaunchMs !== undefined ? { launchTimeoutMs: opts.timeouts.browserLaunchMs } : {}),
      ...(opts.timeouts?.navigationMs !== undefined ? { navigationTimeoutMs: opts.timeouts.navigationMs } : {}),
    });

  const collectOptions: CollectIssuesOptions = { sourceMapper: opts.sourceMapper };

  const resolveRoot = async (projectId: string): Promise<Result<string>> => {
    if (opts.resolveProjectRoot) return opts.resolveProjectRoot(projectId);
    const project = opts.storage.repos.projects.getById(projectId);
    if (!project) {
      return err(
        responsiveError('NOT_FOUND', 'PROJECT_NOT_FOUND', `project not registered: '${projectId}'`, {
          resource: projectId,
          nextAction: 'registre o projeto no workspace (project registry) antes do preview',
        }),
      );
    }
    return ok(project.rootPath);
  };

  const ensurePreview = async (input: {
    projectId: string;
    route?: string;
    viewportId: string;
  }): Promise<Result<{ preview: PreviewInfo; viewport: Viewport; pageUrl: string; rootPath: string }>> => {
    const viewportResult = registry.read(input.viewportId);
    if (!viewportResult.ok) return viewportResult;
    const rootResult = await resolveRoot(input.projectId);
    if (!rootResult.ok) return rootResult;
    const route = input.route ?? '/';
    const started = await previews.start({
      projectId: input.projectId,
      rootPath: rootResult.value,
      viewport: viewportResult.value,
      route,
    });
    if (!started.ok) return started;
    const pageUrl = new URL(route, started.value.previewUrl).toString();
    return ok({ preview: started.value, viewport: viewportResult.value, pageUrl, rootPath: rootResult.value });
  };

  const launchChecked = async (needed: readonly (keyof BrowserCapabilities)[]): Promise<Result<BrowserSession>> => {
    const session = await browsers.launch();
    if (!session.ok) return session;
    const caps = requireCapabilities(session.value, needed);
    if (!caps.ok) return caps;
    return session;
  };

  return ok({
    viewportCreate: (input) => registry.create(input),
    viewportList: () => registry.list(),
    viewportRead: (id) => registry.read(id),
    viewportDelete: (id) => registry.delete(id),

    async projectBreakpoints(projectId) {
      const root = await resolveRoot(projectId);
      if (!root.ok) return root;
      return detectProjectBreakpoints(root.value);
    },

    async preview(input) {
      const ensured = await ensurePreview(input);
      if (!ensured.ok) return ensured;
      return ok(ensured.value.preview);
    },

    async diagnose(input) {
      const ensured = await ensurePreview(input);
      if (!ensured.ok) return ensured;
      const session = await launchChecked(REQUIRED_FOR_DIAGNOSTICS);
      if (!session.ok) return session;
      const capture = await captureRenderedPage(session.value, ensured.value.pageUrl, ensured.value.viewport, {
        collectOptions,
        ...(opts.timeouts?.navigationMs !== undefined ? { navigationTimeoutMs: opts.timeouts.navigationMs } : {}),
      });
      if (!capture.ok) return capture;
      return ok({
        projectId: input.projectId,
        route: ensured.value.preview.route,
        viewport: ensured.value.viewport,
        previewUrl: ensured.value.pageUrl,
        issues: capture.value.issues,
        browser: {
          engine: session.value.capabilities.engine,
          engineVersion: session.value.capabilities.engineVersion,
          capabilities: session.value.capabilities,
        },
      });
    },

    async stressTest(input) {
      const profile = STRESS_PROFILES[input.profile];
      if (!profile) {
        return err(
          nexoError('INVALID_INPUT', `unknown stress profile: '${String(input.profile)}'`, {
            details: {
              availableProfiles: Object.keys(STRESS_PROFILES),
              nextAction: `use um perfil fixo documentado (D14): ${Object.keys(STRESS_PROFILES).join(', ')}`,
            },
          }),
        );
      }
      const ensured = await ensurePreview(input);
      if (!ensured.ok) return ensured;
      const session = await launchChecked(REQUIRED_FOR_DIAGNOSTICS);
      if (!session.ok) return session;

      // extremeViewport: re-renderiza no viewport extremo do perfil (09§32).
      const effectiveViewport: Viewport =
        input.profile === 'extremeViewport'
          ? {
              ...ensured.value.viewport,
              width: Number(profile.params['width'] ?? 240),
              height: Number(profile.params['height'] ?? 320),
              orientation: 'Portrait',
            }
          : ensured.value.viewport;

      const pageResult = await session.value.newPage(effectiveViewport);
      if (!pageResult.ok) return pageResult;
      const page = pageResult.value;
      try {
        await page.goto(ensured.value.pageUrl, {
          waitUntil: 'load',
          timeout: opts.timeouts?.navigationMs ?? 30_000,
        });
        const result = await runStressProfileOnPage({
          page,
          profile: input.profile,
          viewport: effectiveViewport,
          route: ensured.value.preview.route,
          rootPath: ensured.value.rootPath,
          collectOptions,
        });
        return result;
      } catch (cause) {
        return err(
          responsiveError('INTERNAL', 'PREVIEW_NOT_RESPONDING', `stressTest falhou ao renderizar: ${(cause as Error).message}`, {
            resource: ensured.value.pageUrl,
            retryable: true,
            details: { cause: (cause as Error).message },
          }),
        );
      } finally {
        await page.context().close().catch(() => undefined);
      }
    },

    async compare(input) {
      if (input.viewportIds.length === 0) {
        return err(
          responsiveError('INVALID_INPUT', 'VIEWPORT_NOT_FOUND', 'compare exige ao menos 1 viewportId', {
            details: { nextAction: 'passe viewportIds[] com viewports existentes (09§43)' },
          }),
        );
      }
      const viewports: Viewport[] = [];
      for (const id of input.viewportIds) {
        const v = registry.read(id);
        if (!v.ok) return v;
        viewports.push(v.value);
      }
      const ensured = await ensurePreview({ projectId: input.projectId, ...(input.route !== undefined ? { route: input.route } : {}), viewportId: input.viewportIds[0]! });
      if (!ensured.ok) return ensured;
      const session = await launchChecked(REQUIRED_FOR_SCREENSHOT);
      if (!session.ok) return session;
      return compareViewports({
        projectId: input.projectId,
        route: ensured.value.preview.route,
        previewUrl: ensured.value.pageUrl,
        viewports,
        session: session.value,
        artifactsDir: opts.dataDir,
        collectOptions,
      });
    },

    async snapshot(input) {
      const ensured = await ensurePreview(input);
      if (!ensured.ok) return ensured;
      const session = await launchChecked(REQUIRED_FOR_SCREENSHOT);
      if (!session.ok) return session;
      return captureSnapshot({
        projectId: input.projectId,
        route: ensured.value.preview.route,
        previewUrl: ensured.value.pageUrl,
        viewport: ensured.value.viewport,
        rootPath: ensured.value.rootPath,
        session: session.value,
        storage: opts.storage,
        dataDir: opts.dataDir,
        captureOptions: { collectOptions },
      });
    },

    stopPreview: (projectId) => previews.stop(projectId),

    async close() {
      await previews.stopAll();
      await browsers.close();
    },
  });
}

// Re-export para conveniência do consumidor do service.
export { STRESS_PROFILES } from './stress.js';
export { DEFAULT_VIEWPORT_PRESETS } from './viewports.js';
