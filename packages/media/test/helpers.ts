/**
 * Helpers de teste do @nexo/media: projeto REAL em tmpdir (src/assets +
 * public/ + arquivos de imagem com magic bytes corretos gerados via Buffer)
 * e storage real (SQLite em tmpdir) com o projeto registrado.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Actor, ExecutionContext } from '@nexo/core';
import { newOperationId } from '@nexo/shared';
import { createStorage, type Storage } from '@nexo/storage';

import { createMediaRegistry, createMediaService, type MediaService } from '../src/index.js';
import type { AssetIdentity } from '../src/index.js';

export const TEST_ACTOR: Actor = { kind: 'SYSTEM', id: 'media-test' };

export function makeCtx(projectId?: string): ExecutionContext {
  return {
    operationId: newOperationId(),
    initiatedBy: TEST_ACTOR,
    executedBy: TEST_ACTOR,
    ...(projectId !== undefined ? { projectId } : {}),
  };
}

/** PNG 2x3 real: signature + IHDR com width=2 height=3 (CRCs ignorados pelo sniffer). */
export function makePng(width = 2, height = 3): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4, 'latin1');
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // bit depth
  ihdr.writeUInt8(2, 17); // color type
  return Buffer.concat([sig, ihdr, Buffer.from([0, 0, 0, 0])]);
}

/** JPEG 5x7 real: SOI + APP0 + SOF0 (height/width BE) + EOI. */
export function makeJpeg(width = 5, height = 7): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const sof0 = Buffer.alloc(19);
  sof0[0] = 0xff;
  sof0[1] = 0xc0;
  sof0.writeUInt16BE(17, 2); // segment length
  sof0[4] = 8; // precision
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  return Buffer.concat([soi, app0, sof0, Buffer.from([0xff, 0xd9])]);
}

/** GIF 4x6 real: header + LSD (width/height LE). */
export function makeGif(width = 4, height = 6): Buffer {
  const buf = Buffer.alloc(13);
  buf.write('GIF89a', 0, 'latin1');
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return Buffer.concat([buf, Buffer.from([0x3b])]);
}

/** WebP VP8X 9x11 real: RIFF + WEBP + VP8X (canvas-1 em 24-bit LE). */
export function makeWebp(width = 9, height = 11): Buffer {
  const vp8x = Buffer.alloc(18);
  vp8x.write('VP8X', 0, 'latin1');
  vp8x.writeUInt32LE(10, 4); // chunk size
  vp8x.writeUIntLE(width - 1, 12, 3);
  vp8x.writeUIntLE(height - 1, 15, 3);
  const riff = Buffer.alloc(12);
  riff.write('RIFF', 0, 'latin1');
  riff.writeUInt32LE(vp8x.length + 4, 4);
  riff.write('WEBP', 8, 'latin1');
  return Buffer.concat([riff, vp8x]);
}

/** SVG inocuo (sem conteúdo ativo). */
export function makeSvg(): Buffer {
  return Buffer.from(
    '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"><rect width="10" height="20"/></svg>\n',
    'utf8',
  );
}

export function makePdf(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n', 'utf8');
}

/** MP4: box ftyp com brand isom. */
export function makeMp4(): Buffer {
  const buf = Buffer.alloc(24);
  buf.writeUInt32BE(24, 0);
  buf.write('ftyp', 4, 'latin1');
  buf.write('isom', 8, 'latin1');
  return buf;
}

export function b64(buf: Buffer): string {
  return buf.toString('base64');
}

export interface Fixture {
  dir: string;
  storage: Storage;
  projectId: string;
  service: MediaService;
}

export function writeFixtureFile(dir: string, rel: string, content: string | Buffer): void {
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

/**
 * Projeto fixture real:
 *   package.json
 *   src/assets/hero.png        (PNG real 2x3)
 *   src/App.tsx                import '/src/assets/hero.png' + <img src=...>
 *   src/pages/About.tsx        <img src="/src/assets/hero.png">
 *   public/favicon.svg         (SVG inocuo)
 */
export function createFixtureProject(): { dir: string; storage: Storage; projectId: string; service: MediaService } {
  const dir = mkdtempSync(path.join(tmpdir(), 'nexo-media-'));
  writeFixtureFile(dir, 'package.json', JSON.stringify({ name: 'fixture-app', type: 'module' }));
  writeFixtureFile(dir, 'src/assets/hero.png', makePng());
  writeFixtureFile(
    dir,
    'src/App.tsx',
    [
      "import hero from '/src/assets/hero.png';",
      'export function App() {',
      '  return <img src="/src/assets/hero.png" alt="hero" />;',
      '}',
      '',
    ].join('\n'),
  );
  writeFixtureFile(
    dir,
    'src/pages/About.tsx',
    ['export function About() {', '  return <img src="/src/assets/hero.png" alt="about hero" />;', '}', ''].join('\n'),
  );
  writeFixtureFile(dir, 'public/favicon.svg', makeSvg());

  const dataDir = mkdtempSync(path.join(tmpdir(), 'nexo-media-db-'));
  const result = createStorage(dataDir);
  if (!result.ok) throw new Error('storage indisponível no fixture');
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
  const service = createMediaService({ storage });
  return { dir, storage, projectId, service };
}

/**
 * Registra um asset LocalProject já existente no disco (como uma análise de
 * projeto existente faria) — sem upload, sem referências preenchidas
 * (delete/replace fazem scan fresco).
 */
export function registerLocalAsset(
  fixture: { storage: Storage; projectId: string },
  relPath: string,
  size: number,
): AssetIdentity {
  const now = new Date().toISOString();
  const source = { origin: 'LocalProject' as const, path: relPath };
  const identity: AssetIdentity = {
    id: crypto.randomUUID(),
    type: 'Image',
    source,
    metadata: {
      name: path.posix.basename(relPath),
      type: 'Image',
      mime: 'image/png',
      dimensions: { width: 2, height: 3 },
      size,
      source,
      createdAt: now,
      updatedAt: now,
      references: [],
    },
    dimensions: { width: 2, height: 3 },
    references: [],
    scope: 'Project',
    usage: { state: 'Unknown', confidence: 'UNKNOWN' },
  };
  createMediaRegistry(fixture.storage.repos.mediaAssets).upsert(fixture.projectId, identity);
  return identity;
}

export function cleanupFixture(fixture: { dir: string; storage: Storage }): void {
  fixture.storage.close();
  rmSync(fixture.dir, { recursive: true, force: true });
}
