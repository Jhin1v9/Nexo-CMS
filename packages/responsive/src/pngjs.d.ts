/**
 * Declaração mínima para pngjs@7 (sem @types/pngjs no ambiente; deps fixas
 * pela Wave — sem pnpm install). Cobre apenas o que compare.ts usa.
 * API conferida contra pngjs 7.0.0 (lib/png.js): PNG, PNG.sync.read/write,
 * PNG.bitblt, .width/.height/.data (Buffer RGBA).
 */
declare module 'pngjs' {
  import type { Buffer } from 'node:buffer';

  export class PNG {
    constructor(options?: { width?: number; height?: number });
    width: number;
    height: number;
    data: Buffer;
    static bitblt(
      src: PNG,
      dst: PNG,
      srcX: number,
      srcY: number,
      width: number,
      height: number,
      deltaX: number,
      deltaY: number,
    ): void;
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };
  }
}
