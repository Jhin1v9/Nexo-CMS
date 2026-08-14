/**
 * Helpers de teste do write-path M3: projetos REAIS em tempdir (arquivos
 * escritos de verdade — padrao do repo: git/test/helpers.ts usa git CLI real;
 * aqui usamos fs real). Fixtures cobrem a stack first-class de M3 (D6):
 * React+TSX + Tailwind (v4 @theme + v3 config) e Plain CSS (CSS variables).
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import ts from 'typescript';

export interface TempProject {
  root: string;
  /** Escreve arquivo (cria dirs). Retorna path absoluto. */
  write(rel: string, content: string): Promise<string>;
  /** Remove todo o tempdir. */
  cleanup(): Promise<void>;
}

export async function createTempProject(
  files: Record<string, string>,
  prefix = 'nexo-m3-',
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

/** Re-parse de verificacao nos testes: TSX valido? (espelha a invariante do transformer) */
export function parsesAsTsx(content: string): boolean {
  const sf = ts.createSourceFile('check.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const diags =
    (sf as ts.SourceFile & { readonly parseDiagnostics?: readonly ts.Diagnostic[] })
      .parseDiagnostics ?? [];
  return diags.length === 0;
}

// ---------------------------------------------------------------------------
// Fixture 1: React + TSX + Tailwind (v4 @theme e v3 config coexistindo)
// ---------------------------------------------------------------------------

export const BUTTON_TSX = `export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'ghost';
}

export function Button({ label, variant = 'primary' }: ButtonProps) {
  return (
    <button className="rounded-md px-4" data-variant={variant}>
      {label}
    </button>
  );
}
`;

export const APP_TSX = `import { Button } from './Button';

export function App() {
  return (
    <main className="app">
      <h1>Hello</h1>
      <Button label="Save" />
      <Button label="Cancel" />
      <footer>Footer text</footer>
    </main>
  );
}
`;

export const CARD_TSX = `export function Card() {
  return <div />;
}
`;

export const INDEX_CSS_TAILWIND_V4 = `@import "tailwindcss";

@theme {
  --color-primary: hsl(222 47% 11%);
  --color-accent: #ff0066;
  --spacing-md: 1rem;
  --radius-lg: 0.5rem;
}

.app {
  color: var(--color-primary);
}
`;

export const TAILWIND_CONFIG_JS = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#eeeeee',
          DEFAULT: '#123456',
        },
        accent: '#ff0066',
      },
      spacing: { '18': '4.5rem' },
      borderRadius: { xl: '1rem' },
    },
  },
};
`;

export function reactTailwindFixture(): Record<string, string> {
  return {
    'package.json': JSON.stringify({
      name: 'fixture-react-tailwind',
      dependencies: { react: '^19.1.0', 'react-dom': '^19.1.0' },
      devDependencies: { tailwindcss: '^4.0.0' },
    }),
    'src/App.tsx': APP_TSX,
    'src/Button.tsx': BUTTON_TSX,
    'src/Card.tsx': CARD_TSX,
    'src/index.css': INDEX_CSS_TAILWIND_V4,
    'tailwind.config.js': TAILWIND_CONFIG_JS,
  };
}

// ---------------------------------------------------------------------------
// Fixture 2: Plain CSS (CSS variables em :root + variavel local de componente)
// ---------------------------------------------------------------------------

export const TOKENS_CSS = `/* Design tokens */
:root {
  --brand-color: hsl(222 47% 11%);
  --gap: 1rem;
}

.card {
  --local: 2px;
  padding: var(--gap);
}
`;

export function plainCssFixture(): Record<string, string> {
  return {
    'package.json': JSON.stringify({ name: 'fixture-plain-css' }),
    'styles/tokens.css': TOKENS_CSS,
    'index.html': '<html><head><link rel="stylesheet" href="styles/tokens.css" /></head></html>\n',
  };
}
