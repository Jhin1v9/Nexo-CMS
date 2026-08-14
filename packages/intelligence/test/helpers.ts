/**
 * Helpers de teste do @nexo/intelligence M3: projetos REAIS em tempdir
 * (arquivos escritos de verdade — mesmo padrao de packages/adapters/test).
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export interface TempProject {
  root: string;
  write(rel: string, content: string): Promise<string>;
  cleanup(): Promise<void>;
}

export async function createTempProject(
  files: Record<string, string>,
  prefix = 'nexo-intel-',
): Promise<TempProject> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const write = async (rel: string, content: string): Promise<string> => {
    const abs = join(root, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, 'utf8');
    return abs;
  };
  for (const [rel, content] of Object.entries(files)) {
    await write(rel, content);
  }
  return { root, write, cleanup: () => rm(root, { recursive: true, force: true }) };
}

/**
 * Fixture React+TSX para source mapping:
 *  - Button: named export (EXACT) + usado em App.tsx
 *  - About: export default function (EXACT via filePath)
 *  - Ghost: USADO em App.tsx mas nao definido (HIGH_CONFIDENCE no uso)
 *  - Dupe: exportado em DOIS arquivos (PARTIAL por ambiguidade)
 *  - Widget: arquivo com basename igual, mas exporta nome diferente (PARTIAL heuristico)
 */
export function mappingFixture(): Record<string, string> {
  return {
    'package.json': JSON.stringify({
      name: 'fixture-mapping',
      dependencies: { react: '^19.1.0' },
    }),
    'src/components/Button.tsx': `export interface ButtonProps {
  label: string;
}

export function Button({ label }: ButtonProps) {
  return <button>{label}</button>;
}
`,
    'src/App.tsx': `import { Button } from './components/Button';

export function App() {
  return (
    <main>
      <Button label="Save" />
      <Ghost />
    </main>
  );
}
`,
    'src/pages/About.tsx': `export default function About() {
  return <h1>About</h1>;
}
`,
    'src/Dupe.tsx': `export function Dupe() {
  return <div>a</div>;
}
`,
    'src/other/Dupe.tsx': `export function Dupe() {
  return <div>b</div>;
}
`,
    'src/Widget.tsx': `export function helperWidget() {
  return 42;
}
`,
  };
}

/** Fixture com asset + referencias variadas (para references.ts). */
export function assetFixture(): Record<string, string> {
  return {
    'package.json': JSON.stringify({ name: 'fixture-assets' }),
    'public/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
    'src/App.tsx': `import logoUrl from '../public/logo.svg';

export function App() {
  return <img src={logoUrl} alt="logo" />;
}
`,
    'src/Card.tsx': `export function Card() {
  return <img src="/assets/logo.svg" alt="logo" />;
}
`,
    'src/note.ts': `export const NOTE = 'o arquivo logo.svg esta em public/';
`,
    'README.md': `# Projeto\n\nO icone e public/logo.svg.\n`,
    'index.html': `<html><head><link rel="icon" href="/logo.svg" /></head></html>\n`,
    // ignorados pela varredura (cobertura declarada):
    'node_modules/some-lib/index.js': `export const x = 'logo.svg';\n`,
    'dist/bundle.js': `var x = 'logo.svg';\n`,
    '.git/hooks/x': 'logo.svg\n',
  };
}
