/**
 * Helpers de teste do @nexo/components: projeto React+TSX+Tailwind REAL em
 * tmpdir (2+ componentes existentes para convencoes 08§21, barrel de exports,
 * pagina, teste, referencias cruzadas) + projeto nao-React (HTML) + storage
 * real (SQLite em tmpdir) com o projeto registrado.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Actor, ExecutionContext } from '@nexo/core';
import { newOperationId } from '@nexo/shared';
import { createStorage, type Storage } from '@nexo/storage';

import { createComponentService, type ComponentService } from '../src/index.js';

export const TEST_ACTOR: Actor = { kind: 'SYSTEM', id: 'components-test' };

export function makeCtx(projectId?: string): ExecutionContext {
  return {
    operationId: newOperationId(),
    initiatedBy: TEST_ACTOR,
    executedBy: TEST_ACTOR,
    ...(projectId !== undefined ? { projectId } : {}),
  };
}

export interface Fixture {
  dir: string;
  storage: Storage;
  projectId: string;
  service: ComponentService;
}

export function writeFixtureFile(dir: string, rel: string, content: string): void {
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

export const BUTTON_SOURCE = [
  'export interface ButtonProps {',
  '  /** Texto exibido no botao */',
  '  label: string;',
  "  variant?: 'primary' | 'secondary';",
  '  disabled?: boolean;',
  '  onClick?: () => void;',
  '}',
  '',
  'export function Button({ label, variant = \'primary\', disabled }: ButtonProps) {',
  '  return (',
  '    <button className="px-4 py-2 rounded" disabled={disabled}>',
  '      {label}',
  '    </button>',
  '  );',
  '}',
  '',
].join('\n');

export const CARD_SOURCE = [
  "import { Button } from './Button';",
  '',
  'export interface CardProps {',
  '  title: string;',
  '  children?: ReactNode;',
  '}',
  '',
  'export function Card({ title, children }: CardProps) {',
  '  return (',
  '    <section className="rounded-lg border">',
  '      <h2 className="text-lg">{title}</h2>',
  '      {children}',
  '      <Button label="Open" />',
  '    </section>',
  '  );',
  '}',
  '',
].join('\n');

export const BADGE_SOURCE = [
  'export interface BadgeProps {',
  '  text?: string;',
  '}',
  '',
  "export function Badge({ text = 'new' }: BadgeProps) {",
  '  return <span className="badge">{text}</span>;',
  '}',
  '',
].join('\n');

/** Componente com referencia PRIVADA (fora dos dirs compartilhados — 08§25). */
export const LEGACY_SOURCE = [
  "import { privateHelper } from '../utils/private';",
  '',
  'export interface LegacyProps {',
  '  title: string;',
  '}',
  '',
  'export function Legacy({ title }: LegacyProps) {',
  '  return <div>{title}{privateHelper()}</div>;',
  '}',
  '',
].join('\n');

/** Componente com SEGREDO no source (08§74 No Secret Leakage). */
export const LEAKY_SOURCE = [
  'const apiUrl = process.env.API_KEY;',
  '',
  'export function Leaky() {',
  '  return <div>{apiUrl}</div>;',
  '}',
  '',
].join('\n');

/**
 * Projeto fixture React+TSX+Tailwind:
 *   package.json (react + tailwindcss declarados)
 *   tailwind.config.js
 *   src/components/Button.tsx   (interface Props, named export, default literal)
 *   src/components/Card.tsx     (importa Button; prop children ReactNode)
 *   src/components/Badge.tsx    (sem deps locais — candidato a publish limpo)
 *   src/components/Legacy.tsx   (import privado ../../utils/private equivalente)
 *   src/components/Leaky.tsx    (process.env.API_KEY)
 *   src/components/index.ts     (barrel de exports)
 *   src/components/Button.test.tsx
 *   src/App.tsx                 (importa e usa Button)
 *   src/pages/Home.tsx          (importa e usa Card)
 *   src/utils/private.ts
 */
export function createReactFixture(): Fixture {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-components-'));
  writeFixtureFile(
    dir,
    'package.json',
    JSON.stringify({
      name: 'fixture-app',
      type: 'module',
      dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
      devDependencies: { typescript: '^6.0.3', tailwindcss: '^4.0.0' },
    }),
  );
  writeFixtureFile(dir, 'tailwind.config.js', "export default { content: ['./src/**/*.tsx'] };\n");
  writeFixtureFile(dir, 'src/components/Button.tsx', BUTTON_SOURCE);
  writeFixtureFile(dir, 'src/components/Card.tsx', CARD_SOURCE);
  writeFixtureFile(dir, 'src/components/Badge.tsx', BADGE_SOURCE);
  writeFixtureFile(dir, 'src/components/Legacy.tsx', LEGACY_SOURCE);
  writeFixtureFile(dir, 'src/components/Leaky.tsx', LEAKY_SOURCE);
  writeFixtureFile(
    dir,
    'src/components/index.ts',
    [
      "export { Button } from './Button';",
      "export { Card } from './Card';",
      "export { Badge } from './Badge';",
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/components/Button.test.tsx',
    [
      "import { Button } from './Button';",
      '',
      "describe('Button', () => {",
      "  it('renders label', () => {",
      '    const el = <Button label="Hi" />;',
      '    void el;',
      '  });',
      '});',
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/App.tsx',
    [
      "import { Button } from './components/Button';",
      '',
      'export function App() {',
      '  return <Button label="Hello" />;',
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/pages/Home.tsx',
    [
      "import { Card } from '../components/Card';",
      '',
      'export function Home() {',
      '  return <Card title="Welcome" />;',
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(dir, 'src/utils/private.ts', "export const privateHelper = (): string => 'internal';\n");

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nexo-components-db-'));
  const result = createStorage(dataDir);
  if (!result.ok) throw new Error('storage indisponivel no fixture');
  const storage = result.value;
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();
  storage.repos.projects.insert({
    id: projectId,
    name: 'fixture-app',
    rootPath: dir,
    fingerprint: 'fp-fixture',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
  return { dir, storage, projectId, service: createComponentService({ storage }) };
}

/** Projeto NAO-React (HTML estatico) — stack fora do write-path M3 (D6). */
export function createHtmlFixture(): Fixture {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-components-html-'));
  writeFixtureFile(dir, 'package.json', JSON.stringify({ name: 'plain-html' }));
  writeFixtureFile(dir, 'index.html', '<html><body><h1>static</h1></body></html>\n');

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nexo-components-db-'));
  const result = createStorage(dataDir);
  if (!result.ok) throw new Error('storage indisponivel no fixture');
  const storage = result.value;
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();
  storage.repos.projects.insert({
    id: projectId,
    name: 'plain-html',
    rootPath: dir,
    fingerprint: 'fp-fixture-html',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
  return { dir, storage, projectId, service: createComponentService({ storage }) };
}

export function cleanupFixture(fixture: { dir: string; storage: Storage }): void {
  fixture.storage.close();
  rmSync(fixture.dir, { recursive: true, force: true });
}
