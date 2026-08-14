/**
 * Wave 4 — E2E "No-Playwright Control Plane Test" (SPEC.md §11, doc 13).
 *
 * Verificação INDEPENDENTE (No Fake Validation): sobe apps/runtime REAL em
 * porta efêmera com NEXO_HOME em tmpdir e exerce TODAS as rotas via fetch
 * puro (sem browser, sem mocks, sem Playwright). Fixtures versionados em
 * tests/fixtures (root do repo, SPEC §11).
 *
 * Cobertura:
 *  a-n: fluxo do agente (health, capabilities, import/open/refresh, fs.read,
 *       command.execute SAFE/BLOCKED/RESTRICTED, audit allow+deny, projeto
 *       desconhecido, ator desconhecido DEFAULT DENY);
 *  security probes: path traversal (../, ..%2f, absolute, symlink real),
 *       metacaracteres de shell, git alias injection, header ausente/vazio,
 *       JSON malformado, capability inexistente, null byte.
 *
 * Regra de ouro: NUNCA mutar os fixtures versionados (cópias em tmpdir para
 * os cenários de escrita: staleness, git init, symlink).
 */

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// dep: @hono/node-server — servidor real em porta efêmera (SPEC §11: sem Playwright).
import { serve, type ServerType } from '@hono/node-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createStorage } from '@nexo/storage';

import { createRuntime, type RuntimeInstance } from '../../apps/runtime/src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const FIXTURES = join(REPO_ROOT, 'tests', 'fixtures');
const FIXTURE_REACT = join(FIXTURES, 'react-vite-tailwind');
const FIXTURE_HTML = join(FIXTURES, 'html-static');
const FIXTURE_UNKNOWN = join(FIXTURES, 'unknown-empty');

interface NexoErrorJson {
  code: string;
  message: string;
  retryable: boolean;
  requiresApproval?: boolean;
  requiredCapability?: string;
  details?: Record<string, unknown>;
}
interface ApiResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: NexoErrorJson;
}
interface DetectedTechJson {
  technology: string;
  confidence: string;
  support: string;
  evidence: string[];
}
interface ProjectModelJson {
  projectId: string;
  rootPath: string;
  technologies: DetectedTechJson[];
  packageManager: { value: { name: string; version: string | null } | null; confidence: string; evidence: string[] };
  scripts: { value: Record<string, string> | null; confidence: string; evidence: string[] };
  support: string;
  confidence: string;
  [k: string]: unknown;
}
interface ProjectJson {
  id: string;
  name: string;
  rootPath: string;
  fingerprint: string;
  status: string;
}
interface CommandResultJson {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  classification: string;
  timedOut: boolean;
}

let workDir: string;
let nexoHome: string;
let runtime: RuntimeInstance;
let server: ServerType;
let base: string;

/**
 * Wave 5 (FIX 2): clientes legítimos enviam `x-nexo-actor` EXPLICITAMENTE —
 * default 'cli:local' aqui espelha a CLI oficial. `actor: null` OMITE o
 * header (cenário anonymous:unknown -> DEFAULT DENY).
 */
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

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'nexo-wave4-e2e-'));
  nexoHome = join(workDir, 'nexo-home');
  process.env['NEXO_HOME'] = nexoHome; // SPEC §5: dataDir default = NEXO_HOME
  const created = createRuntime(); // sem dataDir explícito: prova que NEXO_HOME é honrado
  if (!created.ok) throw new Error(`bootstrap falhou: ${created.error.message}`);
  runtime = created.value;
  server = serve({ fetch: runtime.app.fetch, hostname: '127.0.0.1', port: 0 });
  await new Promise<void>((resolveListen) => server.on('listening', resolveListen));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('sem porta efêmera');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.close();
  runtime.close();
  rmSync(workDir, { recursive: true, force: true });
});

describe('agent flow M1 (a-n) — servidor real + fetch puro', () => {
  // ---- (a) health ---------------------------------------------------------
  it('a. GET /v1/health -> ok', async () => {
    const res = await fetch(`${base}/v1/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; version: string };
    expect(body.status).toBe('ok');
    expect(typeof body.version).toBe('string');
  });

  // ---- (b) capabilities ----------------------------------------------------
  it('b. GET /v1/capabilities -> 19 capabilities (M1+M2 git) com decisão allowed', async () => {
    const { status, body } = await api<{ capabilities: { id: string; allowed: string; risk: string }[] }>(
      'GET',
      '/v1/capabilities',
    );
    expect(status).toBe(200);
    const caps = body.value!.capabilities;
    expect(caps.map((c) => c.id).sort()).toEqual([
      'git.branch.create',
      'git.branch.delete',
      'git.branch.list',
      'git.branch.switch',
      'git.commit',
      'git.diff',
      'git.fetch',
      'git.history',
      'git.pull',
      'git.push',
      'git.status',
      'project.import',
      'project.list',
      'project.open',
      'project.read',
      'project.refresh',
      'runtime.command.execute',
      'runtime.filesystem.list',
      'runtime.filesystem.read',
    ]);
    // ator local: ALLOW em M1 + leituras git; REQUIRE_APPROVAL nas 7 mutações
    // git (risk DESTRUCTIVE no PolicyEngine — handoff M2/doc 10 §16/§47).
    const GIT_READS = ['git.status', 'git.diff', 'git.history', 'git.branch.list'];
    for (const c of caps) {
      const gitMutation = c.id.startsWith('git.') && !GIT_READS.includes(c.id);
      expect(c.allowed).toBe(gitMutation ? 'REQUIRE_APPROVAL' : 'ALLOW');
    }
    // ator desconhecido: mesma listagem, decisão DENY (discovery filtrado por authorize)
    const denied = await api<{ capabilities: { allowed: string }[] }>(
      'GET',
      '/v1/capabilities',
      undefined,
      'agent:foreign',
    );
    for (const c of denied.body.value!.capabilities) expect(c.allowed).toBe('DENY');
  });

  // ---- (c,d,e) import / re-import / open sobre o fixture VERSIONADO --------
  // Importar o fixture versionado diretamente prova também que o discovery é
  // read-only (INVARIANTS: discovery nunca muta) — asserção ao final.
  let projectA: ProjectJson;
  let modelA: ProjectModelJson;

  it('c. project.import react-vite-tailwind -> detecções reais com evidência', async () => {
    const { status, body } = await invoke<{
      project: ProjectJson;
      model: ProjectModelJson;
      alreadyRegistered: boolean;
    }>('project.import', { rootPath: FIXTURE_REACT });
    expect(status).toBe(200);
    expect(body.ok).toBe(true); // status SUCCESS (Result ok; nunca success em parcial)
    const v = body.value!;
    expect(v.alreadyRegistered).toBe(false);
    expect(v.project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); // uuid estável
    expect(v.project.rootPath).toBe(FIXTURE_REACT);
    expect(v.project.fingerprint).toMatch(/^[0-9a-f]{64}$/);

    const techBy = (name: string): DetectedTechJson | undefined =>
      v.model.technologies.find((t) => t.technology === name);
    for (const name of ['react', 'typescript', 'tailwind']) {
      const tech = techBy(name);
      expect(tech, `tecnologia ${name} detectada`).toBeDefined();
      expect(['CONFIRMED', 'HIGH']).toContain(tech!.confidence);
      expect(tech!.evidence.length).toBeGreaterThan(0); // evidence obrigatória
    }
    expect(techBy('react')!.evidence.join(' ')).toContain('package.json');

    // PM pnpm (lockfile pnpm-lock.yaml + campo packageManager)
    expect(v.model.packageManager.value?.name).toBe('pnpm');
    expect(['CONFIRMED', 'HIGH']).toContain(v.model.packageManager.confidence);

    // Scripts REAIS do package.json — exatamente como declarados (nunca assumir dev/build)
    const realScripts = (
      JSON.parse(readFileSync(join(FIXTURE_REACT, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      }
    ).scripts;
    expect(v.model.scripts.value).toEqual(realScripts);

    projectA = v.project;
    modelA = v.model;

    // DB real persistido em NEXO_HOME (No Fake Success: arquivo existe)
    expect(existsSync(join(nexoHome, 'nexo.db'))).toBe(true);
  });

  it('d. re-import do mesmo path -> alreadyRegistered:true, MESMO id', async () => {
    const { status, body } = await invoke<{ project: ProjectJson; alreadyRegistered: boolean }>('project.import', {
      rootPath: FIXTURE_REACT,
    });
    expect(status).toBe(200);
    expect(body.value!.alreadyRegistered).toBe(true);
    expect(body.value!.project.id).toBe(projectA.id);
  });

  it('e. project.open -> model IGUAL ao snapshot persistido em pi_snapshots', async () => {
    const { status, body } = await invoke<{ project: ProjectJson; model: Record<string, unknown>; analyzedAt: string }>(
      'project.open',
      { projectId: projectA.id },
    );
    expect(status).toBe(200);
    const snapshot = runtime.storage.repos.piSnapshots.latest(projectA.id);
    expect(snapshot).not.toBeNull();
    // model retornado == snapshot persistido (byte a byte, após round-trip JSON)
    expect(body.value!.model).toEqual(JSON.parse(JSON.stringify(snapshot!.model)));
    expect(body.value!.analyzedAt).toBe(snapshot!.analyzedAt);
    // e consistente com o model do import (projectId estável)
    expect(body.value!.model['projectId']).toBe(modelA.projectId);
    expect(body.value!.project.id).toBe(projectA.id);
  });

  // ---- (f) ciclo staleness real numa CÓPIA --------------------------------
  it('f. modificar package.json da CÓPIA -> open STALE_CONTEXT -> refresh -> open OK', async () => {
    const staleCopy = join(workDir, 'react-stale');
    cpSync(FIXTURE_REACT, staleCopy, { recursive: true });
    const imported = await invoke<{ project: ProjectJson }>('project.import', { rootPath: staleCopy });
    const pid = imported.body.value!.project.id;

    writeFileSync(
      join(staleCopy, 'package.json'),
      JSON.stringify({ name: 'react-stale', dependencies: { react: '^19.1.0', axios: '^1.7.0' } }, null, 2),
    );

    const stale = await invoke('project.open', { projectId: pid });
    expect(stale.status).toBe(409);
    expect(stale.body.error!.code).toBe('STALE_CONTEXT');
    expect(stale.body.error!.retryable).toBe(true);
    expect(String(stale.body.error!.details?.['hint'])).toContain('project.refresh');

    const refresh = await invoke('project.refresh', { projectId: pid });
    expect(refresh.status).toBe(200);

    const open = await invoke<{ model: ProjectModelJson }>('project.open', { projectId: pid });
    expect(open.status).toBe(200);
    // refresh re-escaneou de verdade: scripts do NOVO package.json (ausentes -> null)
    expect(open.body.value!.model.scripts.value).toBeNull();
  });

  // ---- (f2) staleness de projeto ESTÁTICO (Wave 5 FIX 4) ------------------
  it('f2. html-static: editar index.html da CÓPIA -> fingerprint muda -> STALE_CONTEXT -> refresh resolve', async () => {
    // Antes do FIX 4 o fingerprint ignorava index.html (cego para estáticos
    // sem package.json) e o open NUNCA detectava a mudança.
    const staticCopy = join(workDir, 'html-stale');
    cpSync(FIXTURE_HTML, staticCopy, { recursive: true });
    const imported = await invoke<{ project: ProjectJson; model: ProjectModelJson }>('project.import', {
      rootPath: staticCopy,
    });
    expect(imported.status).toBe(200);
    const pid = imported.body.value!.project.id;
    // html-static detectado de verdade (adapter html-static, SPEC §6)
    expect(imported.body.value!.model.technologies.some((t) => t.technology === 'html-static')).toBe(true);

    writeFileSync(
      join(staticCopy, 'index.html'),
      `${readFileSync(join(staticCopy, 'index.html'), 'utf8')}\n<!-- wave5 -->\n`,
    );

    const stale = await invoke('project.open', { projectId: pid });
    expect(stale.status).toBe(409);
    expect(stale.body.error!.code).toBe('STALE_CONTEXT');

    const refresh = await invoke('project.refresh', { projectId: pid });
    expect(refresh.status).toBe(200);
    const open = await invoke('project.open', { projectId: pid });
    expect(open.status).toBe(200);
  });

  // ---- (g,h) filesystem scoped --------------------------------------------
  it('g. runtime.filesystem.read -> conteúdo REAL do package.json do fixture', async () => {
    const { status, body } = await invoke<{ path: string; content: string }>('runtime.filesystem.read', {
      projectId: projectA.id,
      path: 'package.json',
    });
    expect(status).toBe(200);
    expect(body.value!.content).toBe(readFileSync(join(FIXTURE_REACT, 'package.json'), 'utf8'));
  });

  it('h. runtime.filesystem.read ../../etc/passwd -> SCOPE_VIOLATION', async () => {
    const { status, body } = await invoke('runtime.filesystem.read', {
      projectId: projectA.id,
      path: '../../etc/passwd',
    });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('SCOPE_VIOLATION');
  });

  // ---- (i,j,k) command.execute --------------------------------------------
  let gitProjectId: string;

  it('i. command.execute `git status` num repo git REAL -> exitCode 0, branch real', async () => {
    const gitCopy = join(workDir, 'react-git');
    cpSync(FIXTURE_REACT, gitCopy, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: gitCopy });

    const imported = await invoke<{ project: ProjectJson }>('project.import', { rootPath: gitCopy });
    gitProjectId = imported.body.value!.project.id;

    const { status, body } = await invoke<CommandResultJson>('runtime.command.execute', {
      projectId: gitProjectId,
      command: 'git',
      args: ['status'],
    });
    expect(status).toBe(200);
    expect(body.value!.classification).toBe('SAFE');
    expect(body.value!.exitCode).toBe(0);
    expect(body.value!.timedOut).toBe(false);
    expect(body.value!.stdout).toContain('On branch main');

    const branch = await invoke<CommandResultJson>('runtime.command.execute', {
      projectId: gitProjectId,
      command: 'git',
      args: ['branch', '--show-current'],
    });
    expect(branch.body.value!.stdout.trim()).toBe('main'); // branch REAL, não falsificado
  });

  it('j. command.execute BLOCKED (sudo / rm -rf /) -> COMMAND_BLOCKED e NADA executou', async () => {
    const sentinel = join(workDir, 'pwned-by-sudo');
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: projectA.id,
      command: 'sudo',
      args: ['touch', sentinel],
    });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('COMMAND_BLOCKED');
    expect(existsSync(sentinel)).toBe(false); // prova: nada executou

    const rmRoot = await invoke('runtime.command.execute', {
      projectId: projectA.id,
      command: 'rm',
      args: ['-rf', '/'],
    });
    expect(rmRoot.status).toBe(403);
    expect(rmRoot.body.error!.code).toBe('COMMAND_BLOCKED');
    expect(existsSync(FIXTURE_REACT)).toBe(true); // projeto intacto
  });

  it('k. command.execute RESTRICTED (touch) -> REQUIRE_APPROVAL e NADA executou', async () => {
    const target = join(FIXTURE_REACT, 'should-not-exist.txt');
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: projectA.id,
      command: 'touch',
      args: ['should-not-exist.txt'],
    });
    expect(status).toBe(422);
    expect(body.error!.code).toBe('REQUIRE_APPROVAL');
    expect(body.error!.requiresApproval).toBe(true);
    expect(existsSync(target)).toBe(false); // approval gate segurou a execução
  });

  // ---- (l) audit via AuditRepository independente (mesmo NEXO_HOME) --------
  it('l. audit trail: allow E deny com who/what/decision/result (storage independente)', async () => {
    const second = createStorage(nexoHome); // conexão NOVA ao mesmo DB — prova persistência real
    expect(second.ok).toBe(true);
    const events = second.ok ? second.value.repos.audit.list() : [];
    if (second.ok) second.value.close();

    expect(events.length).toBeGreaterThan(0);
    const allows = events.filter((e) => e.decision === 'ALLOW' && e.result === 'SUCCESS');
    const denies = events.filter((e) => e.decision === 'DENY' && e.result === 'FAILED');
    const approvals = events.filter((e) => e.decision === 'REQUIRE_APPROVAL');

    expect(allows.some((e) => e.what === 'project.import')).toBe(true);
    expect(allows.some((e) => e.what === 'runtime.command.execute')).toBe(true);
    expect(denies.length).toBeGreaterThan(0); // COMMAND_BLOCKED/FORBIDDEN/SCOPE registrados
    expect(approvals.length).toBeGreaterThan(0); // RESTRICTED -> REQUIRE_APPROVAL auditado

    for (const e of events) {
      expect(e.who.id.length).toBeGreaterThan(0); // who
      expect(typeof e.what).toBe('string'); // what
      expect(['ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'UNKNOWN', undefined]).toContain(e.decision); // decision
      expect(['SUCCESS', 'PARTIAL', 'FAILED']).toContain(e.result); // result
      expect(typeof e.at).toBe('string'); // time
    }
    // deny específico do comando BLOCKED
    expect(denies.some((e) => e.what === 'runtime.command.execute' && String(e.resource).includes('sudo'))).toBe(
      true,
    );
  });

  // ---- (m) projeto desconhecido --------------------------------------------
  it('m. import unknown-empty -> support UNKNOWN, zero tecnologias inventadas', async () => {
    const before = readdirSync(FIXTURE_UNKNOWN).sort();
    const { status, body } = await invoke<{ model: ProjectModelJson; alreadyRegistered: boolean }>('project.import', {
      rootPath: FIXTURE_UNKNOWN,
    });
    expect(status).toBe(200);
    expect(body.value!.model.technologies).toEqual([]); // nunca inventar (Inv. 6/25)
    expect(body.value!.model.support).toBe('UNKNOWN');
    expect(body.value!.model.confidence).toBe('UNKNOWN');
    expect(body.value!.model.scripts.value).toBeNull();
    expect(body.value!.model.packageManager.value).toBeNull();
    expect(readdirSync(FIXTURE_UNKNOWN).sort()).toEqual(before); // discovery não mutou nada
  });

  // ---- (n) ator desconhecido -> DEFAULT DENY -------------------------------
  it('n. ator desconhecido (x-nexo-actor: agent:foreign) -> FORBIDDEN em invoke', async () => {
    const { status, body } = await invoke('project.list', {}, 'agent:foreign');
    expect(status).toBe(403);
    expect(body.error!.code).toBe('FORBIDDEN');
    const openForeign = await invoke('project.open', { projectId: projectA.id }, 'agent:foreign');
    expect(openForeign.status).toBe(403);
    expect(openForeign.body.error!.code).toBe('FORBIDDEN');
  });

  // ---- asserção final: fixture versionado NÃO foi mutado pelo discovery ----
  it('fixtures versionados permanecem intactos após todo o fluxo', async () => {
    expect(readdirSync(FIXTURE_REACT).sort()).toEqual(
      ['index.html', 'package.json', 'pnpm-lock.yaml', 'src', 'tailwind.config.ts', 'tsconfig.json', 'vite.config.ts'].sort(),
    );
    expect(existsSync(join(FIXTURE_REACT, 'node_modules'))).toBe(false);
    expect(existsSync(join(FIXTURE_REACT, '.git'))).toBe(false);
    expect(existsSync(join(FIXTURE_REACT, 'should-not-exist.txt'))).toBe(false);
  });
});

describe('security probes (tentativa de REFUTAR o sistema)', () => {
  let probeProjectId: string;
  let probeDir: string;

  beforeAll(async () => {
    probeDir = join(workDir, 'probe-proj');
    cpSync(FIXTURE_REACT, probeDir, { recursive: true });
    const imported = await invoke<{ project: ProjectJson }>('project.import', { rootPath: probeDir });
    probeProjectId = imported.body.value!.project.id;
  });

  it('probe fs: path absoluto /etc/passwd -> SCOPE_VIOLATION', async () => {
    const { status, body } = await invoke('runtime.filesystem.read', { projectId: probeProjectId, path: '/etc/passwd' });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('SCOPE_VIOLATION');
  });

  it('probe fs: ..%2f NÃO é decodificado (sem double-decode) -> nunca vaza conteúdo', async () => {
    const { body } = await invoke<{ content?: string }>('runtime.filesystem.read', {
      projectId: probeProjectId,
      path: '..%2f..%2fetc%2fpasswd',
    });
    expect(body.ok).toBe(false); // NOT_FOUND (nome literal) ou SCOPE_VIOLATION — nunca conteúdo
    expect(body.error!.code === 'NOT_FOUND' || body.error!.code === 'SCOPE_VIOLATION').toBe(true);
  });

  it('probe fs: symlink REAL apontando para fora do root -> SCOPE_VIOLATION', async () => {
    symlinkSync('/etc/passwd', join(probeDir, 'pwn-link'));
    const file = await invoke('runtime.filesystem.read', { projectId: probeProjectId, path: 'pwn-link' });
    expect(file.status).toBe(403);
    expect(file.body.error!.code).toBe('SCOPE_VIOLATION');

    symlinkSync('/etc', join(probeDir, 'etc-link'));
    const dir = await invoke('runtime.filesystem.read', { projectId: probeProjectId, path: 'etc-link/passwd' });
    expect(dir.status).toBe(403);
    expect(dir.body.error!.code).toBe('SCOPE_VIOLATION');
  });

  it('probe fs: null byte no path -> INVALID_INPUT', async () => {
    const { status, body } = await invoke('runtime.filesystem.read', {
      projectId: probeProjectId,
      path: 'package.json\0.txt',
    });
    expect(status).toBe(400);
    expect(body.error!.code).toBe('INVALID_INPUT');
  });

  it('probe cmd: metacaracteres (; && | backtick $()) são LITERAIS sem shell -> nada executa', async () => {
    const sentinel = join(workDir, 'pwned-by-metachar');
    const payloads = [
      `x; touch ${sentinel}`,
      `x && touch ${sentinel}`,
      `x | touch ${sentinel}`,
      `\`touch ${sentinel}\``,
      `$(touch ${sentinel})`,
    ];
    for (const p of payloads) {
      const { status, body } = await invoke<CommandResultJson>('runtime.command.execute', {
        projectId: probeProjectId,
        command: 'echo',
        args: [p],
      });
      expect(status).toBe(200); // echo SAFE executa...
      expect(body.value!.stdout).toContain(p.slice(0, 4)); // ...mas o payload é literal
    }
    expect(existsSync(sentinel)).toBe(false); // PROVA: nenhum metacaractere executou
  });

  it('probe cmd: comando com espaço embutido não vira comando+args', async () => {
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'cat /etc/passwd',
      args: [],
    });
    expect(body.ok).toBe(false);
    // NUNCA executa: 'cat /etc/passwd' é tratado como UM nome de comando
    // (basename 'passwd' -> DANGEROUS -> COMMAND_BLOCKED aqui; UNKNOWN ->
    // REQUIRE_APPROVAL e spawn NOT_FOUND também são desfechos seguros).
    expect([400, 403, 404, 422]).toContain(status);
    expect(body.error!.code).not.toBe('INTERNAL');
  });

  it('probe cmd: git -c alias.status=!cmd status -> NÃO executa o alias (RESTRICTED -> approval)', async () => {
    const sentinel = join(workDir, 'pwned-by-git-alias');
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'git',
      args: ['-c', `alias.status=!touch ${sentinel}`, 'status'],
    });
    expect(status).toBe(422);
    expect(body.error!.code).toBe('REQUIRE_APPROVAL');
    expect(existsSync(sentinel)).toBe(false);
  });

  // ---- Wave 5 (FIX 1 — HIGH, CORRIGIDA): scope escape via args SAFE -------
  // Antes do fix, `cat /etc/passwd` (SAFE) vazava arquivos arbitrários do
  // host (a classificação ignorava args; o executor só guardava o cwd).
  // Causa-raiz eliminada: TODO arg-path de comando SAFE é validado contra o
  // root permitido (mesma lógica do ScopedFilesystem) ANTES do spawn.
  it('probe cmd [FIX 1]: `cat /etc/passwd` (SAFE) -> SCOPE_VIOLATION, NADA vaza', async () => {
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'cat',
      args: ['/etc/passwd'],
    });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('SCOPE_VIOLATION');
  });

  it('probe cmd [FIX 1]: `cat ../../../etc/passwd` (escape relativo) -> SCOPE_VIOLATION', async () => {
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'cat',
      args: ['../../../etc/passwd'],
    });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('SCOPE_VIOLATION');
  });

  it('probe cmd [FIX 1]: `grep root /etc/passwd` -> SCOPE_VIOLATION (pattern ok, path não)', async () => {
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'grep',
      args: ['root', '/etc/passwd'],
    });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('SCOPE_VIOLATION');
  });

  it('probe cmd [FIX 1]: `head -n 5 /etc/passwd` -> SCOPE_VIOLATION (valor de flag não-path ok)', async () => {
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'head',
      args: ['-n', '5', '/etc/passwd'],
    });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('SCOPE_VIOLATION');
  });

  it('probe cmd [FIX 1]: `cat <symlink para fora>` -> SCOPE_VIOLATION (realpath do arg)', async () => {
    // pwn-link (-> /etc/passwd) foi criado no probe fs de symlink acima.
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'cat',
      args: ['pwn-link'],
    });
    expect(status).toBe(403);
    expect(body.error!.code).toBe('SCOPE_VIOLATION');
  });

  it('probe cmd [FIX 1]: `cat package.json` (DENTRO do root) -> 200, conteúdo real', async () => {
    const { status, body } = await invoke<CommandResultJson>('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'cat',
      args: ['package.json'],
    });
    expect(status).toBe(200);
    expect(body.value!.classification).toBe('SAFE');
    expect(body.value!.exitCode).toBe(0);
    expect(body.value!.stdout).toContain('react'); // conteúdo REAL do projeto
  });

  it('probe cmd [FIX 1]: SAFE com arg não analisável (~) -> REQUIRE_APPROVAL (rebaixado a RESTRICTED)', async () => {
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'cat',
      args: ['~/secret'],
    });
    expect(status).toBe(422);
    expect(body.error!.code).toBe('REQUIRE_APPROVAL');
    expect(body.error!.requiresApproval).toBe(true);
  });

  // ---- Wave 5 (FIX 2 — MEDIUM, CORRIGIDA): ator default fail-closed -------
  // Antes do fix, header ausente/vazio assumia cli:local (TODOS os grants).
  it('probe http [FIX 2]: header x-nexo-actor AUSENTE -> anonymous:unknown (DEFAULT DENY)', async () => {
    const { status, body } = await api<{ capabilities: { allowed: string }[] }>(
      'GET',
      '/v1/capabilities',
      undefined,
      null, // omite o header
    );
    expect(status).toBe(200);
    for (const c of body.value!.capabilities) expect(c.allowed).toBe('DENY');

    const inv = await invoke('project.list', {}, null);
    expect(inv.status).toBe(403);
    expect(inv.body.error!.code).toBe('FORBIDDEN');
  });

  it('probe http [FIX 2]: header x-nexo-actor VAZIO -> anonymous:unknown (DEFAULT DENY)', async () => {
    const res = await fetch(`${base}/v1/capabilities`, { headers: { 'x-nexo-actor': '' } });
    const body = (await res.json()) as ApiResult<{ capabilities: { allowed: string }[] }>;
    for (const c of body.value!.capabilities) expect(c.allowed).toBe('DENY');
  });

  it('probe http [FIX 2]: ator arbitrário (equivale a NEXO_ACTOR=outro) -> FORBIDDEN', async () => {
    const { status, body } = await invoke('project.list', {}, 'outro');
    expect(status).toBe(403);
    expect(body.error!.code).toBe('FORBIDDEN');
  });

  it('probe http: body JSON malformado -> 400 INVALID_INPUT estruturado', async () => {
    const res = await fetch(`${base}/v1/capabilities/project.list/invoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiResult;
    expect(body.error!.code).toBe('INVALID_INPUT');
  });

  it('probe http: capability inexistente -> 404 NOT_FOUND estruturado', async () => {
    const { status, body } = await invoke('project.definitely-not-real', {});
    expect(status).toBe(404);
    expect(body.error!.code).toBe('NOT_FOUND');
  });

  it('probe cmd: timeoutMs acima do cap -> INVALID_INPUT (cap 120s enforced)', async () => {
    const { status, body } = await invoke('runtime.command.execute', {
      projectId: probeProjectId,
      command: 'git',
      args: ['status'],
      timeoutMs: 999_999,
    });
    expect(status).toBe(400);
    expect(body.error!.code).toBe('INVALID_INPUT');
  });
});
