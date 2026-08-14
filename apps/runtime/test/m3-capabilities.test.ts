/**
 * Testes das 35 capabilities M3 (M3-CONTRACTS §3) no apps/runtime — servidor
 * HTTP REAL em porta efêmera + fixture real react-vite-tailwind copiado para
 * tmpdir (nunca mutar o fixture versionado).
 *
 * Cobertura:
 *  1. Fluxo HTTP real por domínio:
 *     - editor: source.open -> hash real -> source.save (DESTRUCTIVE) com
 *       expectedHash via canal de aprovação D17 -> verificado no disco;
 *       expectedHash errado -> 409 CONFLICT (nunca sobrescreve).
 *     - media: upload (PNG real, magic bytes) com aprovação -> list contém.
 *     - design: token.read com token CSS real (:root var no fixture copiado).
 *     - responsive: viewport.create (registry global, dimensões arbitrárias).
 *     - component: list (detecção AST real do fixture).
 *  2. Probes de segurança: capability desconhecida -> 404; input inválido ->
 *     400; mutação sem approval -> 422 REQUIRE_APPROVAL; approval com
 *     approver vazio -> 400; approval NUNCA cria grant (ator sem grant +
 *     approval -> 403 FORBIDDEN).
 *  3. Mutações M3 sem aprovação NÃO executam (short-circuit — SPEC §8).
 *
 * diagnose/stressTest/compare/snapshot com browser real (Playwright) ficam
 * para a Wave 6-7 (e2e) — NÃO testados aqui (09§46).
 */

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// dep: @hono/node-server — servidor real em porta efêmera (padrão server.test.ts).
import { serve, type ServerType } from '@hono/node-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRuntime, type RuntimeInstance } from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, '../../../packages/intelligence/test/fixtures/react-vite-tailwind');

/** PNG 1x1 real (magic bytes válidos — upload valida MIME por conteúdo, 08§45). */
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

interface ApiResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    requiresApproval?: boolean;
    requiredCapability?: string;
    details?: Record<string, unknown>;
  };
}

let workDir: string;
let fixtureCopy: string;
let runtime: RuntimeInstance;
let server: ServerType;
let base: string;
let projectId: string;

async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  actor: string | null = 'cli:local',
): Promise<{ status: number; body: ApiResult<T> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (actor !== null) headers['x-nexo-actor'] = actor;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as ApiResult<T> };
}

const invoke = <T = unknown>(id: string, input: unknown, actor: string | null = 'cli:local') =>
  api<T>('POST', `/v1/capabilities/${id}/invoke`, input, actor);

/** Invoke com aprovação por invocação (D17). */
const invokeApproved = <T = unknown>(id: string, input: unknown, approver = 'human:reviewer') =>
  invoke<T>(id, { ...(input as Record<string, unknown>), approval: { approver, justification: 'test D17' } });

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'nexo-runtime-m3-'));
  fixtureCopy = join(workDir, 'fixture-react');
  cpSync(FIXTURE, fixtureCopy, { recursive: true });
  // Token CSS real (:root var) para design.token.read — cópia tmp, nunca o fixture.
  writeFileSync(join(fixtureCopy, 'src', 'tokens.css'), ':root {\n  --color-primary: #112233;\n}\n');
  // Componente real em dir de componentes (detecção 08§5.1: somente dirs
  // candidatos EXISTENTES — nunca assumido sem evidência).
  mkdirSync(join(fixtureCopy, 'src', 'components'), { recursive: true });
  writeFileSync(
    join(fixtureCopy, 'src', 'components', 'Button.tsx'),
    'export function Button(props: { label: string }): React.JSX.Element {\n  return <button>{props.label}</button>;\n}\n',
  );

  const created = createRuntime({ dataDir: join(workDir, 'nexo-home') });
  if (!created.ok) throw new Error(`bootstrap falhou: ${created.error.message}`);
  runtime = created.value;
  server = serve({ fetch: runtime.app.fetch, hostname: '127.0.0.1', port: 0 });
  await new Promise<void>((resolveListen) => server.on('listening', resolveListen));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('sem porta efêmera');
  base = `http://127.0.0.1:${address.port}`;

  const imported = await invoke<{ project: { id: string } }>('project.import', { rootPath: fixtureCopy });
  if (imported.body.value === undefined) throw new Error('project.import falhou no setup');
  projectId = imported.body.value.project.id;
});

afterAll(async () => {
  server.close();
  runtime.close();
  rmSync(workDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// editor.* — fluxo open -> save (expectedHash) com aprovação D17
// ---------------------------------------------------------------------------

describe('editor.* — open + save com expectedHash (fluxo HTTP real)', () => {
  let openedHash: string;

  it('editor.source.open -> conteúdo real + hash sha256 + language', async () => {
    const { status, body } = await invoke<{
      content: string;
      hash: string;
      language: string;
      readOnly: boolean;
    }>('editor.source.open', { projectId, filePath: 'src/App.tsx' });
    expect(status).toBe(200);
    const v = body.value!;
    expect(v.content).toContain('export function App');
    expect(v.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(v.language).toBeTruthy();
    expect(v.readOnly).toBe(false);
    openedHash = v.hash;
  });

  it('editor.source.save SEM approval -> 422 REQUIRE_APPROVAL e NADA escrito', async () => {
    const before = readFileSync(join(fixtureCopy, 'src/App.tsx'), 'utf8');
    const { status, body } = await invoke('editor.source.save', {
      projectId,
      filePath: 'src/App.tsx',
      content: '// nao deveria ser escrito\n',
      expectedHash: openedHash,
    });
    expect(status).toBe(422);
    expect(body.error?.code).toBe('REQUIRE_APPROVAL');
    expect(body.error?.requiresApproval).toBe(true);
    expect(body.error?.requiredCapability).toBe('editor.source.save');
    // prova de short-circuit: disco intacto
    expect(readFileSync(join(fixtureCopy, 'src/App.tsx'), 'utf8')).toBe(before);
  });

  it('editor.source.save COM approval + expectedHash correto -> saved/verified de verdade', async () => {
    const newContent = readFileSync(join(fixtureCopy, 'src/App.tsx'), 'utf8') + '\n// m3 wave3 edit\n';
    const { status, body } = await invokeApproved<{
      saved: boolean;
      hash: string;
      verified: boolean;
      diagnostics: string[];
    }>('editor.source.save', {
      projectId,
      filePath: 'src/App.tsx',
      content: newContent,
      expectedHash: openedHash,
    });
    expect(status).toBe(200);
    expect(body.value?.saved).toBe(true);
    expect(body.value?.verified).toBe(true);
    // verificação independente: disco contém o conteúdo novo
    expect(readFileSync(join(fixtureCopy, 'src/App.tsx'), 'utf8')).toBe(newContent);
    // hash retornado corresponde ao conteúdo real relido via source.open
    const reopened = await invoke<{ hash: string; content: string }>('editor.source.open', {
      projectId,
      filePath: 'src/App.tsx',
    });
    expect(reopened.body.value?.hash).toBe(body.value?.hash);
    expect(reopened.body.value?.content).toContain('// m3 wave3 edit');
    openedHash = reopened.body.value!.hash;
  });

  it('editor.source.save com expectedHash errado -> 409 CONFLICT (com approval)', async () => {
    const { status, body } = await invokeApproved('editor.source.save', {
      projectId,
      filePath: 'src/App.tsx',
      content: 'x\n',
      expectedHash: '0'.repeat(64),
    });
    expect(status).toBe(409);
    expect(body.error?.code).toBe('CONFLICT');
  });

  it('editor.change.list -> array (estado real do ChangeManager)', async () => {
    const { status, body } = await invoke<unknown[]>('editor.change.list', { projectId });
    expect(status).toBe(200);
    expect(Array.isArray(body.value)).toBe(true);
  });

  it('editor.selection.read com nodeRef componente -> mapping EXACT real (intelligence)', async () => {
    const { status, body } = await invoke<{
      confidence: string;
      sourceFile?: string;
      sourceLocation?: { line: number; column: number };
    }>('editor.selection.read', { projectId, route: '/', nodeRef: 'App' });
    expect(status).toBe(200);
    expect(body.value?.confidence).toBe('EXACT');
    expect(body.value?.sourceFile).toBe('src/App.tsx');
    expect(body.value?.sourceLocation?.line).toBeGreaterThan(0);
  });

  it('editor.selection.read sem sinal -> UNKNOWN honesto + alternativas (07§15)', async () => {
    const { status, body } = await invoke<{ confidence: string; alternatives?: string[] }>(
      'editor.selection.read',
      { projectId, route: '/', nodeRef: 'ComponenteInexistente' },
    );
    expect(status).toBe(200);
    expect(body.value?.confidence).toBe('UNKNOWN');
    expect(Array.isArray(body.value?.alternatives)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// media.* — upload (PNG real) + list
// ---------------------------------------------------------------------------

describe('media.* — upload + list (fluxo HTTP real)', () => {
  let assetId: string;

  it('media.upload SEM approval -> 422 e nenhum arquivo gravado', async () => {
    const { status, body } = await invoke('media.upload', {
      projectId,
      fileName: 'pixel.png',
      contentBase64: PNG_1X1_BASE64,
    });
    expect(status).toBe(422);
    expect(body.error?.code).toBe('REQUIRE_APPROVAL');
    expect(body.error?.requiredCapability).toBe('media.upload');
  });

  it('media.upload sem diretório de assets e sem targetPath -> erro honesto (08§53)', async () => {
    // O fixture não tem public/ nem src/assets: o service NÃO assume destino.
    const { body } = await invokeApproved('media.upload', {
      projectId,
      fileName: 'pixel.png',
      contentBase64: PNG_1X1_BASE64,
    });
    expect(body.ok).toBe(false);
    expect(JSON.stringify(body.error?.details)).toContain('NoAssetDirectoryDetected');
  });

  it('media.upload COM approval + targetPath explícito -> asset real (verified + sha256)', async () => {
    const { status, body } = await invokeApproved<{
      asset: { id: string; type: string };
      storedPath: string;
      verified: boolean;
      sha256: string;
    }>('media.upload', {
      projectId,
      fileName: 'pixel.png',
      contentBase64: PNG_1X1_BASE64,
      targetPath: 'assets/pixel.png',
    });
    expect(status).toBe(200);
    expect(body.value?.verified).toBe(true);
    expect(body.value?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(body.value?.asset.type).toBe('Image');
    assetId = body.value!.asset.id;
    // o arquivo existe de verdade dentro do projeto
    const stored = readFileSync(join(fixtureCopy, body.value!.storedPath));
    expect(stored.toString('base64')).toBe(PNG_1X1_BASE64);
  });

  it('media.list -> contém o asset enviado', async () => {
    const { status, body } = await invoke<{ id: string }[]>('media.list', { projectId });
    expect(status).toBe(200);
    expect(body.value!.some((a) => a.id === assetId)).toBe(true);
  });

  it('media.read -> metadata real sem contentBase64 por default', async () => {
    const { status, body } = await invoke<{ asset: { id: string }; contentBase64?: string }>('media.read', {
      projectId,
      assetId,
    });
    expect(status).toBe(200);
    expect(body.value?.asset.id).toBe(assetId);
    expect(body.value?.contentBase64).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// design.* — token.read
// ---------------------------------------------------------------------------

describe('design.* — token.read (fluxo HTTP real)', () => {
  it('design.token.read -> inclui o token CSS real do projeto (--color-primary)', async () => {
    const { status, body } = await invoke<{
      tokens: { name?: string; ref?: string; value?: string; source?: { file?: string } }[];
    }>('design.token.read', { projectId });
    expect(status).toBe(200);
    const tokens = body.value!.tokens;
    expect(Array.isArray(tokens)).toBe(true);
    const found = tokens.find((t) => JSON.stringify(t).includes('--color-primary'));
    expect(found).toBeDefined();
    expect(JSON.stringify(found)).toContain('#112233');
  });

  it('design.token.read com tokenRef inexistente -> erro estruturado (TokenNotFound)', async () => {
    const { status, body } = await invoke('design.token.read', { projectId, tokenRef: '--nao-existe' });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(body.ok).toBe(false);
  });

  it('theme.read -> estrutura real de temas detectados', async () => {
    const { status, body } = await invoke<Record<string, unknown>>('theme.read', { projectId });
    expect(status).toBe(200);
    expect(body.value).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// responsive.viewport.create — registry global (09§24-26)
// ---------------------------------------------------------------------------

describe('responsive.viewport.create (fluxo HTTP real)', () => {
  it('cria viewport com dimensões arbitrárias (09§26) + defaults honestos', async () => {
    const { status, body } = await invoke<{
      id: string;
      width: number;
      height: number;
      orientation: string;
    }>('responsive.viewport.create', { name: 'm3-test-viewport', width: 390, height: 844 });
    expect(status).toBe(200);
    expect(body.value?.id).toBeTruthy();
    expect(body.value?.width).toBe(390);
    expect(body.value?.height).toBe(844);
    expect(['Portrait', 'Landscape']).toContain(body.value?.orientation);
  });

  it('viewport inválido (width 0) -> 400 INVALID_INPUT no gate zod', async () => {
    const { status, body } = await invoke('responsive.viewport.create', { width: 0, height: 844 });
    expect(status).toBe(400);
    expect(body.error?.code).toBe('INVALID_INPUT');
  });
});

// ---------------------------------------------------------------------------
// component.list — detecção AST real do fixture
// ---------------------------------------------------------------------------

describe('component.* — list (fluxo HTTP real)', () => {
  it('component.list -> ComponentIdentity[] reais (App detectado via AST)', async () => {
    const { status, body } = await invoke<{ id: string; name: string; scope: string }[]>(
      'component.list',
      { projectId },
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.value)).toBe(true);
    expect(body.value!.some((c) => c.name === 'Button' && c.scope === 'Project')).toBe(true);
  });

  it('component.read com id inexistente -> erro estruturado (ComponentNotFound)', async () => {
    const { status, body } = await invoke('component.read', { projectId, componentId: 'nope' });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(body.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Probes de segurança M3 + canal de aprovação D17
// ---------------------------------------------------------------------------

describe('probes de segurança (M3 + D17)', () => {
  it('capability M3 desconhecida -> 404 NOT_FOUND', async () => {
    const { status, body } = await invoke('editor.source.delete', { projectId });
    expect(status).toBe(404);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('input inválido -> 400 INVALID_INPUT (media.upload sem contentBase64)', async () => {
    const { status, body } = await invoke('media.upload', { projectId, fileName: 'x.png' });
    expect(status).toBe(400);
    expect(body.error?.code).toBe('INVALID_INPUT');
  });

  it('input inválido -> 400 INVALID_INPUT (editor.source.open sem filePath)', async () => {
    const { status, body } = await invoke('editor.source.open', { projectId });
    expect(status).toBe(400);
    expect(body.error?.code).toBe('INVALID_INPUT');
  });

  it('mutação M3 sem approval -> 422 REQUIRE_APPROVAL com requiredCapability correto', async () => {
    for (const [id, input] of [
      ['component.delete', { projectId, componentId: 'x', confirm: true }],
      ['media.delete', { projectId, assetId: 'x' }],
      ['design.token.update', { projectId, tokenRef: '--color-primary', value: '#000000' }],
      ['theme.update', { projectId, theme: 'dark', patch: { '--color-primary': '#000000' } }],
      ['editor.change.undo', { projectId }],
      ['component.publish', { projectId, componentId: 'x' }],
    ] as const) {
      const { status, body } = await invoke(id, input);
      expect(status).toBe(422);
      expect(body.error?.code).toBe('REQUIRE_APPROVAL');
      expect(body.error?.requiresApproval).toBe(true);
      expect(body.error?.requiredCapability).toBe(id);
    }
  });

  it('approval com approver vazio -> 400 INVALID_INPUT (envelope D17)', async () => {
    const { status, body } = await invoke('editor.change.undo', {
      projectId,
      approval: { approver: '' },
    });
    expect(status).toBe(400);
    expect(body.error?.code).toBe('INVALID_INPUT');
  });

  it('approval NUNCA cria grant: ator sem grant + approval -> 403 FORBIDDEN', async () => {
    const { status, body } = await invoke(
      'editor.change.undo',
      { projectId, approval: { approver: 'human:reviewer' } },
      'agent:stranger',
    );
    expect(status).toBe(403);
    expect(body.error?.code).toBe('FORBIDDEN');
  });

  it('approval é POR INVOCAÇÃO: após save aprovado, novo save sem approval volta a 422', async () => {
    const { status } = await invoke('editor.source.save', {
      projectId,
      filePath: 'src/App.tsx',
      content: 'y\n',
    });
    expect(status).toBe(422);
  });

  it('leitura M3 com projeto inexistente -> 404 NOT_FOUND estruturado', async () => {
    const { status, body } = await invoke('editor.source.open', {
      projectId: 'nope',
      filePath: 'src/App.tsx',
    });
    expect(status).toBe(404);
    expect(body.error?.code).toBe('NOT_FOUND');
  });

  it('audit trail registra operação aprovada com approvedBy (D17/§65)', async () => {
    const events = runtime.storage.repos.audit.list();
    const approved = events.filter(
      (e) =>
        (e.details?.['approval'] as { approvedBy?: string } | undefined)?.approvedBy === 'human:reviewer',
    );
    // authorize (PolicyEngine) E invoke (Control Plane) registram a aprovação
    expect(approved.some((e) => e.what === 'authorize:editor.source.save' && e.decision === 'ALLOW')).toBe(true);
    expect(approved.some((e) => e.what === 'editor.source.save' && e.result === 'SUCCESS')).toBe(true);
    // requestedBy = ator que invocou
    const invokeEvent = approved.find((e) => e.what === 'editor.source.save');
    expect(invokeEvent?.who.id).toBe('cli:local');
  });
});
