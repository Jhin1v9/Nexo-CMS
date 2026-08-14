/**
 * MIME sniffing por magic bytes (08§45, D16) + segurança SVG (08§67).
 */

import { describe, expect, it } from 'vitest';

import {
  extensionMatchesMime,
  inspectSvgActiveContent,
  readImageDimensions,
  sniffMime,
} from '../src/index.js';

import { makeGif, makeJpeg, makeMp4, makePdf, makePng, makeSvg, makeWebp } from './helpers.js';

describe('sniffMime — magic bytes, nunca extensão (08§45, D16)', () => {
  it('PNG detectado com dimensões reais do IHDR', () => {
    const buf = makePng(2, 3);
    const r = sniffMime(buf);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.mime).toBe('image/png');
      expect(r.value.type).toBe('Image');
      expect(r.value.canonicalExtension).toBe('png');
    }
    expect(readImageDimensions(buf, 'image/png')).toEqual({ width: 2, height: 3 });
  });

  it('JPEG detectado com dimensões reais do SOF0', () => {
    const buf = makeJpeg(5, 7);
    const r = sniffMime(buf);
    expect(r.ok && r.value.mime).toBe('image/jpeg');
    expect(readImageDimensions(buf, 'image/jpeg')).toEqual({ width: 5, height: 7 });
  });

  it('GIF detectado com dimensões reais do LSD', () => {
    const buf = makeGif(4, 6);
    const r = sniffMime(buf);
    expect(r.ok && r.value.mime).toBe('image/gif');
    expect(readImageDimensions(buf, 'image/gif')).toEqual({ width: 4, height: 6 });
  });

  it('WebP (VP8X) detectado com dimensões reais', () => {
    const buf = makeWebp(9, 11);
    const r = sniffMime(buf);
    expect(r.ok && r.value.mime).toBe('image/webp');
    expect(readImageDimensions(buf, 'image/webp')).toEqual({ width: 9, height: 11 });
  });

  it('SVG detectado como texto com <svg (com BOM e whitespace)', () => {
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('  \n' + makeSvg().toString('utf8'), 'utf8')]);
    const r = sniffMime(withBom);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.mime).toBe('image/svg+xml');
      expect(r.value.type).toBe('SVG');
    }
    expect(readImageDimensions(withBom, 'image/svg+xml')).toEqual({ width: 10, height: 20 });
  });

  it('PDF, MP4 (ftyp), WebM (EBML), WOFF e WOFF2 detectados', () => {
    expect(sniffMime(makePdf())).toMatchObject({ ok: true, value: { mime: 'application/pdf', type: 'PDF' } });
    expect(sniffMime(makeMp4())).toMatchObject({ ok: true, value: { mime: 'video/mp4', type: 'Video' } });
    expect(sniffMime(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01]))).toMatchObject({
      ok: true,
      value: { mime: 'video/webm', type: 'Video' },
    });
    expect(sniffMime(Buffer.from('wOFF' + 'x'.repeat(40), 'latin1'))).toMatchObject({
      ok: true,
      value: { mime: 'font/woff', type: 'Font' },
    });
    expect(sniffMime(Buffer.from('wOF2' + 'x'.repeat(40), 'latin1'))).toMatchObject({
      ok: true,
      value: { mime: 'font/woff2', type: 'Font' },
    });
  });

  it('MOV: ftyp com brand "qt  " -> video/quicktime', () => {
    const buf = makeMp4();
    buf.write('qt  ', 8, 'latin1');
    expect(sniffMime(buf)).toMatchObject({ ok: true, value: { mime: 'video/quicktime' } });
  });

  it('desconhecido -> UNSUPPORTED com mediaError UnsupportedMediaType', () => {
    const r = sniffMime(Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44]));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('UNSUPPORTED');
      expect(r.error.details?.['mediaError']).toBe('UnsupportedMediaType');
    }
  });

  it('texto XML que NÃO é SVG -> UnsupportedMediaType (não inventar)', () => {
    const r = sniffMime(Buffer.from('<?xml version="1.0"?><root/>', 'utf8'));
    expect(r.ok).toBe(false);
  });
});

describe('extensionMatchesMime — extensão nunca é autoridade (08§45)', () => {
  it('.png com conteúdo JPEG real -> mismatch detectado', () => {
    const sniffed = sniffMime(makeJpeg());
    expect(sniffed.ok).toBe(true);
    if (sniffed.ok) expect(extensionMatchesMime('fake.png', sniffed.value)).toBe(false);
  });

  it('.jpg/.jpeg com conteúdo JPEG -> ok; .svg com SVG -> ok', () => {
    const jpeg = sniffMime(makeJpeg());
    if (jpeg.ok) {
      expect(extensionMatchesMime('photo.jpg', jpeg.value)).toBe(true);
      expect(extensionMatchesMime('photo.jpeg', jpeg.value)).toBe(true);
    }
    const svg = sniffMime(makeSvg());
    if (svg.ok) expect(extensionMatchesMime('icon.svg', svg.value)).toBe(true);
  });
});

describe('inspectSvgActiveContent (08§67)', () => {
  it('<script detectado', () => {
    const issues = inspectSvgActiveContent('<svg><script>alert(1)</script></svg>');
    expect(issues.some((i) => i.kind === 'script')).toBe(true);
  });

  it('atributos on*= detectados (onload, onclick)', () => {
    const issues = inspectSvgActiveContent('<svg onload="run()"><rect onclick="run()"/></svg>');
    expect(issues.filter((i) => i.kind === 'event-handler')).toHaveLength(2);
  });

  it('javascript: URI detectada', () => {
    const issues = inspectSvgActiveContent('<svg><a xlink:href="javascript:alert(1)">x</a></svg>');
    expect(issues.some((i) => i.kind === 'javascript-uri')).toBe(true);
  });

  it('SVG inocuo -> zero issues', () => {
    expect(inspectSvgActiveContent(makeSvg().toString('utf8'))).toHaveLength(0);
  });
});
