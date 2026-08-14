/**
 * Helpers de teste do Responsive Lab.
 *
 * Fixture: projeto React+Vite REAL (test/fixtures/react-app) copiado para um
 * tempdir por teste; node_modules é SYMLINK do template (deps instaladas uma
 * vez via `pnpm install --ignore-workspace` no dir da fixture). O hash de
 * integridade exclui node_modules,
 * então o symlink não afeta a prova de zero mutação do stress test.
 *
 * Chromium: testes de browser exigem o binário do Playwright. Se ausente
 * (ex.: ambiente sem rede para `playwright install`), os testes de browser
 * são skipados via chromiumAvailable() — JUSTIFICATIVA: D14 exige browser
 * real e proíbe fake; skip honesto > verde fingido. No CI da Wave o binário
 * é instalado no setup (ver relatório).
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { newOperationId } from '@nexo/shared';
import { createStorage, type Storage } from '@nexo/storage';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_TEMPLATE = path.join(HERE, 'fixtures', 'react-app');

export interface FixtureProject {
  root: string;
  dataDir: string;
  storage: Storage;
  projectId: string;
  cleanup: () => Promise<void>;
}

export function fixtureDepsInstalled(): boolean {
  return (
    existsSync(path.join(FIXTURE_TEMPLATE, 'node_modules', '.bin', 'vite')) &&
    existsSync(path.join(FIXTURE_TEMPLATE, 'node_modules', 'react'))
  );
}

export function chromiumAvailable(): boolean {
  try {
    const out = execSync('node -e "import(\'playwright\').then(async p => console.log(p.chromium.executablePath()))"', {
      cwd: path.resolve(HERE, '..'),
      encoding: 'utf8',
      timeout: 30_000,
    }).trim();
    return existsSync(out);
  } catch {
    return false;
  }
}

/** Copia o source do fixture (sem node_modules) e symlinqa node_modules. */
export async function createFixtureProject(): Promise<FixtureProject> {
  if (!fixtureDepsInstalled()) {
    throw new Error(
      'fixture deps ausentes: rode "pnpm install --ignore-workspace" em packages/responsive/test/fixtures/react-app',
    );
  }
  const root = await mkdtemp(path.join(tmpdir(), 'nexo-fixture-'));
  const dataDir = await mkdtemp(path.join(tmpdir(), 'nexo-data-'));

  for (const entry of ['package.json', 'vite.config.js', 'index.html']) {
    await fs.copyFile(path.join(FIXTURE_TEMPLATE, entry), path.join(root, entry));
  }
  await fs.cp(path.join(FIXTURE_TEMPLATE, 'src'), path.join(root, 'src'), { recursive: true });
  await fs.cp(path.join(FIXTURE_TEMPLATE, 'public'), path.join(root, 'public'), { recursive: true });
  await fs.symlink(path.join(FIXTURE_TEMPLATE, 'node_modules'), path.join(root, 'node_modules'), 'dir');

  const storageResult = createStorage(dataDir);
  if (!storageResult.ok) throw new Error(`storage indisponível: ${storageResult.error.message}`);
  const storage = storageResult.value;

  const projectId = newOperationId();
  const now = new Date().toISOString();
  storage.repos.projects.insert({
    id: projectId,
    name: 'nexo-responsive-fixture',
    rootPath: root,
    fingerprint: 'fixture',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });

  return {
    root,
    dataDir,
    storage,
    projectId,
    async cleanup() {
      storage.close();
      await fs.rm(root, { recursive: true, force: true });
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}
