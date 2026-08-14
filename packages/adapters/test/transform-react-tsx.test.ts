/**
 * ReactTsxTransformer — write-path M3 (D8: AST via TS compiler).
 * Fixture: projeto React+TSX REAL em tempdir (test/helpers.ts). Toda saida
 * e re-parseada aqui tambem (a invariante do transformer e verificada de fora).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createReactTsxTransformer, type ReactTsxTransformer } from '../src/index.js';

import {
  createTempProject,
  parsesAsTsx,
  reactTailwindFixture,
  type TempProject,
} from './helpers.js';

let project: TempProject;
let transformer: ReactTsxTransformer;

beforeEach(async () => {
  project = await createTempProject(reactTailwindFixture());
  transformer = createReactTsxTransformer();
});
afterEach(async () => {
  await project.cleanup();
});

const appFile = (): string => join(project.root, 'src/App.tsx');
const buttonFile = (): string => join(project.root, 'src/Button.tsx');
const cardFile = (): string => join(project.root, 'src/Card.tsx');

describe('createComponentSource (arquivo NOVO — template permitido so aqui)', () => {
  it('gera componente com props tipadas; saida parseia como TSX valido', () => {
    const r = transformer.createComponentSource({
      name: 'Card',
      props: [
        { name: 'title', type: 'string', description: 'titulo do card' },
        { name: 'size', type: '"sm" | "md"', required: false, defaultValue: '"md"' },
      ],
      style: { className: 'rounded-lg p-4' },
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toBeDefined();
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).toContain('export interface CardProps {');
    expect(content).toContain('/** titulo do card */');
    expect(content).toContain('title: string;');
    expect(content).toContain('size?: "sm" | "md";');
    expect(content).toContain('export function Card({ title, size = "md" }: CardProps)');
    expect(content).toContain('<div className="rounded-lg p-4">');
  });

  it('sem props: assinatura vazia, sem interface; parseia', () => {
    const r = transformer.createComponentSource({ name: 'Empty' });
    expect(r.ok).toBe(true);
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).toContain('export function Empty() {');
    expect(content).not.toContain('Props');
  });

  it('nome invalido -> INVALID_INPUT, sem conteudo', () => {
    const r = transformer.createComponentSource({ name: 'card' });
    expect(r.ok).toBe(false);
    expect(r.newContent).toBeUndefined();
    expect(r.diagnostics[0]?.code).toBe('INVALID_INPUT');
  });

  it('defaultValue com required:true -> INVALID_INPUT', () => {
    const r = transformer.createComponentSource({
      name: 'Bad',
      props: [{ name: 'x', type: 'string', defaultValue: '"a"' }],
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('INVALID_INPUT');
  });

  it('tipo de prop invalido e detectado pelo re-parse (template nunca sai quebrado)', () => {
    const r = transformer.createComponentSource({
      name: 'Bad',
      props: [{ name: 'x', type: 'string =' }],
    });
    expect(r.ok).toBe(false);
    expect(r.newContent).toBeUndefined();
  });
});

describe('setJsxProp (AST + printer; formato do resto preservado)', () => {
  it('modifica atributo existente no range AST exato', async () => {
    const r = await transformer.setJsxProp({
      file: buttonFile(),
      elementSelector: { jsxTag: 'button' },
      propName: 'className',
      value: 'rounded-xl px-6',
    });
    expect(r.ok).toBe(true);
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).toContain('<button className="rounded-xl px-6" data-variant={variant}>');
    // resto do arquivo byte a byte preservado
    expect(content).toContain("variant = 'primary'");
    // NUNCA escreve em disco
    expect(await readFile(buttonFile(), 'utf8')).toContain('rounded-md px-4');
  });

  it('adiciona atributo string apos a tag quando ausente', async () => {
    const r = await transformer.setJsxProp({
      file: buttonFile(),
      elementSelector: { jsxTag: 'button' },
      propName: 'aria-label',
      value: 'acao',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('<button aria-label="acao" className=');
    expect(parsesAsTsx(r.newContent ?? '')).toBe(true);
  });

  it('valores number/boolean viram expression container', async () => {
    const r = await transformer.setJsxProp({
      file: buttonFile(),
      elementSelector: { jsxTag: 'button' },
      propName: 'tabIndex',
      value: 2,
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('tabIndex={2}');
    const r2 = await transformer.setJsxProp({
      file: buttonFile(),
      elementSelector: { jsxTag: 'button' },
      propName: 'disabled',
      value: true,
    });
    expect(r2.ok).toBe(true);
    expect(r2.newContent).toContain('disabled={true}');
  });

  it('seletor ambiguo -> AMBIGUOUS_TARGET com candidatos (nunca adivinha)', async () => {
    const r = await transformer.setJsxProp({
      file: appFile(),
      elementSelector: { componentName: 'Button' },
      propName: 'variant',
      value: 'ghost',
    });
    expect(r.ok).toBe(false);
    expect(r.newContent).toBeUndefined();
    expect(r.diagnostics[0]?.code).toBe('AMBIGUOUS_TARGET');
    expect(r.diagnostics.length).toBeGreaterThanOrEqual(3); // erro + 2 candidatos
  });

  it('propMatch desambigua (value de string literal)', async () => {
    const r = await transformer.setJsxProp({
      file: appFile(),
      elementSelector: { componentName: 'Button', propMatch: { name: 'label', value: 'Save' } },
      propName: 'variant',
      value: 'ghost',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('<Button variant="ghost" label="Save" />');
    expect(r.newContent).toContain('<Button label="Cancel" />');
    expect(parsesAsTsx(r.newContent ?? '')).toBe(true);
  });

  it('alvo ausente -> TARGET_NOT_FOUND', async () => {
    const r = await transformer.setJsxProp({
      file: appFile(),
      elementSelector: { componentName: 'Dialog' },
      propName: 'open',
      value: true,
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('TARGET_NOT_FOUND');
  });

  it('seletor invalido (ambos/nenhum) -> INVALID_INPUT', async () => {
    const r = await transformer.setJsxProp({
      file: appFile(),
      elementSelector: { componentName: 'Button', jsxTag: 'div' },
      propName: 'x',
      value: 'y',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('INVALID_INPUT');
    const r2 = await transformer.setJsxProp({
      file: appFile(),
      elementSelector: {},
      propName: 'x',
      value: 'y',
    });
    expect(r2.ok).toBe(false);
    expect(r2.diagnostics[0]?.code).toBe('INVALID_INPUT');
  });

  it('arquivo .ts (fora do write-path) -> UNSUPPORTED honesto', async () => {
    const f = await project.write('src/util.ts', 'export const x = 1;\n');
    const r = await transformer.setJsxProp({
      file: f,
      elementSelector: { jsxTag: 'div' },
      propName: 'x',
      value: 'y',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('UNSUPPORTED');
    expect(r.unsupported).toBeDefined();
  });

  it('arquivo inexistente -> INVALID_INPUT; arquivo quebrado -> PARSE_ERROR (nada produzido)', async () => {
    const missing = await transformer.setJsxProp({
      file: join(project.root, 'src/Nope.tsx'),
      elementSelector: { jsxTag: 'div' },
      propName: 'x',
      value: 'y',
    });
    expect(missing.ok).toBe(false);
    expect(missing.diagnostics[0]?.code).toBe('INVALID_INPUT');

    const broken = await project.write('src/Broken.tsx', 'export function X() { return <div>;');
    const r = await transformer.setJsxProp({
      file: broken,
      elementSelector: { jsxTag: 'div' },
      propName: 'x',
      value: 'y',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('PARSE_ERROR');
  });
});

describe('updateJsxText', () => {
  it('substitui o texto de um elemento com filhos', async () => {
    const r = await transformer.updateJsxText({
      file: appFile(),
      elementSelector: { jsxTag: 'h1' },
      newText: 'Bem-vindo',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('<h1>Bem-vindo</h1>');
    expect(r.newContent).not.toContain('Hello');
    expect(parsesAsTsx(r.newContent ?? '')).toBe(true);
  });

  it('converte self-closing em aberto/fechado (conversao documentada)', async () => {
    const r = await transformer.updateJsxText({
      file: cardFile(),
      elementSelector: { jsxTag: 'div' },
      newText: 'conteudo',
    });
    expect(r.ok).toBe(true);
    expect(r.newContent).toContain('<div>conteudo</div>');
    expect(parsesAsTsx(r.newContent ?? '')).toBe(true);
  });

  it("newText com '<' ou '{' -> INVALID_INPUT (texto JSX puro)", async () => {
    const r = await transformer.updateJsxText({
      file: appFile(),
      elementSelector: { jsxTag: 'h1' },
      newText: '{title}',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('INVALID_INPUT');
  });
});

describe('insertJsxChild', () => {
  it('insere apos o ultimo filho elemento, com indentacao do irmao', async () => {
    const r = await transformer.insertJsxChild({
      file: appFile(),
      parentSelector: { jsxTag: 'main' },
      childSource: '<aside>Side</aside>',
    });
    expect(r.ok).toBe(true);
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).toContain('      <footer>Footer text</footer>\n      <aside>Side</aside>\n');
  });

  it('elemento vazio -> filho aninhado com indentacao derivada do fechamento', async () => {
    const f = await project.write(
      'src/Panel.tsx',
      'export function Panel() {\n  return (\n    <section>\n    </section>\n  );\n}\n',
    );
    const r = await transformer.insertJsxChild({
      file: f,
      parentSelector: { jsxTag: 'section' },
      childSource: '<p>Inner</p>',
    });
    expect(r.ok).toBe(true);
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).toContain('<section>\n      <p>Inner</p>\n    </section>');
  });

  it('parent self-closing -> convertido em aberto/fechado com o filho', async () => {
    const r = await transformer.insertJsxChild({
      file: cardFile(),
      parentSelector: { jsxTag: 'div' },
      childSource: '<span>Inner</span>',
    });
    expect(r.ok).toBe(true);
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).toContain('<div>\n    <span>Inner</span>\n  </div>');
  });

  it('childSource invalido ou com mais de um elemento -> INVALID_INPUT', async () => {
    const bad = await transformer.insertJsxChild({
      file: appFile(),
      parentSelector: { jsxTag: 'main' },
      childSource: '<div>',
    });
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics[0]?.code).toBe('INVALID_INPUT');

    const two = await transformer.insertJsxChild({
      file: appFile(),
      parentSelector: { jsxTag: 'main' },
      childSource: '<a /><b />',
    });
    expect(two.ok).toBe(false);
    expect(two.diagnostics[0]?.code).toBe('INVALID_INPUT');
  });

  it('parent ambiguo -> AMBIGUOUS_TARGET', async () => {
    const r = await transformer.insertJsxChild({
      file: appFile(),
      parentSelector: { componentName: 'Button' },
      childSource: '<i />',
    });
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('AMBIGUOUS_TARGET');
  });
});

describe('removeJsxElement', () => {
  it('remove o elemento sem deixar linha fantasma; resto preservado', async () => {
    const before = await readFile(appFile(), 'utf8');
    const r = await transformer.removeJsxElement({
      file: appFile(),
      elementSelector: { jsxTag: 'footer' },
    });
    expect(r.ok).toBe(true);
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).not.toContain('footer');
    // remocao exata: equivale ao original sem a linha do footer
    expect(content).toBe(before.replace('      <footer>Footer text</footer>\n', ''));
  });

  it('remove elemento JSX aninhado com expressao (Button com propMatch)', async () => {
    const r = await transformer.removeJsxElement({
      file: appFile(),
      elementSelector: { componentName: 'Button', propMatch: { name: 'label', value: 'Cancel' } },
    });
    expect(r.ok).toBe(true);
    const content = r.newContent ?? '';
    expect(parsesAsTsx(content)).toBe(true);
    expect(content).not.toContain('Cancel');
    expect(content).toContain('Save');
  });
});
