/**
 * MIME sniffing por MAGIC BYTES (doc 08§45 "Do not trust only the filename
 * extension"; D16: sem dependência nova — magic bytes implementados aqui).
 *
 * Conjunto suportado (D16): PNG, JPEG, GIF, WebP, SVG (texto), PDF,
 * MP4/MOV (ftyp), WebM, WOFF, WOFF2. Desconhecido -> erro UnsupportedMediaType
 * (UNSUPPORTED + details.mediaError='UnsupportedMediaType').
 *
 * SVG é tratado como input não-confiável (08§67): inspectSvgActiveContent
 * detecta <script, atributos on*= e URIs javascript: — presença => rejeição.
 */

import { err, ok, type Result } from '@nexo/shared';

import { mediaError } from './errors.js';
import type { AssetDimensions, AssetType } from './types.js';

export interface SniffResult {
  mime: string;
  type: AssetType;
  /** Extensão canônica para o tipo real detectado (nunca derivada do nome). */
  canonicalExtension: string;
}

function startsWith(buf: Buffer, sig: readonly number[]): boolean {
  if (buf.length < sig.length) return false;
  return sig.every((b, i) => buf[i] === b);
}

function asciiAt(buf: Buffer, offset: number, text: string): boolean {
  if (buf.length < offset + text.length) return false;
  return buf.subarray(offset, offset + text.length).toString('latin1') === text;
}

/** Decodifica como texto candidato a SVG/PDF: strip BOM + whitespace inicial. */
function asText(buf: Buffer): string | null {
  let b = buf;
  if (startsWith(b, [0xef, 0xbb, 0xbf])) b = b.subarray(3);
  // UTF-8 estrito: bytes inválidos => não é texto (08§45 Encoding).
  const decoded = new TextDecoder('utf-8', { fatal: true });
  try {
    return decoded.decode(b);
  } catch {
    return null;
  }
}

/** SVG: inicia com '<' após trim/BOM e contém '<svg' (case-insensitive). */
function looksLikeSvg(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith('<') && text.toLowerCase().includes('<svg');
}

/** Sniffing por magic bytes. NUNCA usa extensão de arquivo. */
export function sniffMime(buf: Buffer, resource?: string): Result<SniffResult> {
  // Imagens raster
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return ok({ mime: 'image/png', type: 'Image', canonicalExtension: 'png' });
  }
  if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    return ok({ mime: 'image/jpeg', type: 'Image', canonicalExtension: 'jpg' });
  }
  if (asciiAt(buf, 0, 'GIF87a') || asciiAt(buf, 0, 'GIF89a')) {
    return ok({ mime: 'image/gif', type: 'Image', canonicalExtension: 'gif' });
  }
  if (asciiAt(buf, 0, 'RIFF') && asciiAt(buf, 8, 'WEBP')) {
    return ok({ mime: 'image/webp', type: 'Image', canonicalExtension: 'webp' });
  }
  // Fontes
  if (asciiAt(buf, 0, 'wOF2')) {
    return ok({ mime: 'font/woff2', type: 'Font', canonicalExtension: 'woff2' });
  }
  if (asciiAt(buf, 0, 'wOFF')) {
    return ok({ mime: 'font/woff', type: 'Font', canonicalExtension: 'woff' });
  }
  // Vídeo: ISO BMFF (MP4/MOV) tem box 'ftyp' nos bytes 4..8
  if (asciiAt(buf, 4, 'ftyp')) {
    const brand = buf.subarray(8, 12).toString('latin1');
    if (brand === 'qt  ') {
      return ok({ mime: 'video/quicktime', type: 'Video', canonicalExtension: 'mov' });
    }
    return ok({ mime: 'video/mp4', type: 'Video', canonicalExtension: 'mp4' });
  }
  // WebM: EBML header
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
    return ok({ mime: 'video/webm', type: 'Video', canonicalExtension: 'webm' });
  }
  // Texto: PDF / SVG
  const text = asText(buf);
  if (text !== null) {
    if (text.trimStart().startsWith('%PDF-')) {
      return ok({ mime: 'application/pdf', type: 'PDF', canonicalExtension: 'pdf' });
    }
    if (looksLikeSvg(text)) {
      return ok({ mime: 'image/svg+xml', type: 'SVG', canonicalExtension: 'svg' });
    }
  }
  return err(
    mediaError(
      'UnsupportedMediaType',
      'Tipo de mídia não suportado ou irreconhecível pelos magic bytes (PNG/JPEG/GIF/WebP/SVG/PDF/MP4/MOV/WebM/WOFF/WOFF2)',
      {
        ...(resource !== undefined ? { resource } : {}),
        details: {
          firstBytesHex: buf.subarray(0, 16).toString('hex'),
        },
      },
    ),
  );
}

export interface SvgSafetyIssue {
  kind: 'script' | 'event-handler' | 'javascript-uri';
  /** Trecho (truncado) que evidencia o problema — diagnóstico, nunca o arquivo inteiro. */
  evidence: string;
}

const SVG_MAX_EVIDENCE = 80;

function evidenceAt(text: string, index: number): string {
  return text.slice(Math.max(0, index - 20), index + SVG_MAX_EVIDENCE).replace(/\s+/g, ' ').trim();
}

/**
 * Conteúdo ativo em SVG (08§67): tags <script, atributos on*= (onclick=,
 * onload=, ...) e URIs javascript:. Comentários CDATA não são tratados de
 * forma especial nesta wave — presença do padrão => rejeição (fail-closed).
 */
export function inspectSvgActiveContent(text: string): SvgSafetyIssue[] {
  const issues: SvgSafetyIssue[] = [];
  const lower = text.toLowerCase();

  for (const m of lower.matchAll(/<script[\s>]/g)) {
    issues.push({ kind: 'script', evidence: evidenceAt(text, m.index ?? 0) });
  }
  for (const m of lower.matchAll(/<script$/g)) {
    issues.push({ kind: 'script', evidence: evidenceAt(text, m.index ?? 0) });
  }
  // atributos on*= (onload=, onclick=, ...) — exige '=' opcionalmente com espaço/aspas
  for (const m of lower.matchAll(/\son[a-z]+\s*=\s*["']?/g)) {
    issues.push({ kind: 'event-handler', evidence: evidenceAt(text, m.index ?? 0) });
  }
  for (const m of lower.matchAll(/javascript:/g)) {
    issues.push({ kind: 'javascript-uri', evidence: evidenceAt(text, m.index ?? 0) });
  }
  return issues;
}

/** Dimensões reais lidas do header (08§45 Dimensions) — nunca estimadas. */
export function readImageDimensions(buf: Buffer, mime: string): AssetDimensions | undefined {
  try {
    switch (mime) {
      case 'image/png':
        // signature(8) + length(4) + 'IHDR'(4) + width(4 BE) + height(4 BE)
        if (buf.length >= 24 && asciiAt(buf, 12, 'IHDR')) {
          return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
        }
        return undefined;
      case 'image/gif':
        if (buf.length >= 10) {
          return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
        }
        return undefined;
      case 'image/jpeg':
        return readJpegDimensions(buf);
      case 'image/webp':
        return readWebpDimensions(buf);
      case 'image/svg+xml': {
        const text = asText(buf);
        return text === null ? undefined : readSvgDimensions(text);
      }
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

function readJpegDimensions(buf: Buffer): AssetDimensions | undefined {
  // Varre segmentos até um SOF (Start Of Frame): FF C0-CF exceto C4/C8/CC.
  let offset = 2; // pula SOI (FF D8)
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return undefined;
    const marker = buf[offset + 1];
    if (marker === undefined) return undefined;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segLen = buf.readUInt16BE(offset + 2);
    if (segLen < 2) return undefined;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (offset + 9 > buf.length) return undefined;
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + segLen;
  }
  return undefined;
}

function readWebpDimensions(buf: Buffer): AssetDimensions | undefined {
  if (buf.length < 30) return undefined;
  const chunk = buf.subarray(12, 16).toString('latin1');
  if (chunk === 'VP8X') {
    // canvas width-1 / height-1: 24-bit LE nos bytes 24..30
    const width = 1 + buf.readUIntLE(24, 3);
    const height = 1 + buf.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === 'VP8 ') {
    // frame tag(3) + start code(3) => width/height 14-bit LE nos bytes 26..30
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    if (width > 0 && height > 0) return { width, height };
    return undefined;
  }
  if (chunk === 'VP8L') {
    // signature 0x2F no byte 20; dims empacotadas nos bytes 21..25
    if (buf[20] !== 0x2f) return undefined;
    const b0 = buf[21] ?? 0;
    const b1 = buf[22] ?? 0;
    const b2 = buf[23] ?? 0;
    const b3 = buf[24] ?? 0;
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  return undefined;
}

/** Dimensões de SVG via width/height ou viewBox (best-effort; ausente => undefined). */
function readSvgDimensions(text: string): AssetDimensions | undefined {
  const svgTag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (svgTag === undefined) return undefined;
  const num = (v: string | undefined): number | undefined => {
    if (v === undefined) return undefined;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const width = num(/\bwidth\s*=\s*"([^"]+)"/i.exec(svgTag)?.[1]);
  const height = num(/\bheight\s*=\s*"([^"]+)"/i.exec(svgTag)?.[1]);
  if (width !== undefined && height !== undefined) return { width, height };
  const viewBox = /\bviewBox\s*=\s*"([^"]+)"/i.exec(svgTag)?.[1];
  if (viewBox !== undefined) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number.parseFloat);
    const w = parts[2];
    const h = parts[3];
    if (parts.length === 4 && w !== undefined && h !== undefined && w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }
  return undefined;
}

/**
 * Extensões coerentes com o MIME real (08§45). Um nome cuja extensão
 * contradiz o conteúdo detectado é rejeitado (MimeExtensionMismatch).
 */
export function extensionMatchesMime(fileName: string, sniffed: SniffResult): boolean {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return false;
  const ext = fileName.slice(dot + 1).toLowerCase();
  const allowed: Record<string, readonly string[]> = {
    'image/png': ['png'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
    'application/pdf': ['pdf'],
    'video/mp4': ['mp4', 'm4v'],
    'video/quicktime': ['mov', 'qt'],
    'video/webm': ['webm'],
    'font/woff': ['woff'],
    'font/woff2': ['woff2'],
  };
  return (allowed[sniffed.mime] ?? []).includes(ext);
}
