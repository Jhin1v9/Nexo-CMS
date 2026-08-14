/**
 * Media Upload (doc 08§44):
 *   Select File → Validate → Security Check → Process → Store/Copy → Index → Register
 *
 * Validação (08§45): File Type (magic bytes), MIME real (nunca extensão),
 * Size (limite configurável, default 25MB), Dimensions (header real para
 * PNG/JPEG/GIF/WebP/SVG), Encoding (UTF-8 estrito para SVG), Name, Path
 * (08§53 via paths.ts + scope guard).
 *
 * Security Check (08§56/§67): SVG com conteúdo ativo é rejeitado com
 * diagnóstico; nenhum conteúdo é executado.
 *
 * Process (08§46): M3 NÃO processa imagem (D13) — o arquivo é armazenado
 * como está. "Sucesso" = o asset existe de verdade no destino (08§44):
 * verificação pós-escrita por re-leitura + hash SHA-256 (No Fake Success).
 */

import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { err, ok, type Result } from '@nexo/shared';

import { mediaError } from './errors.js';
import {
  extensionMatchesMime,
  inspectSvgActiveContent,
  readImageDimensions,
  sniffMime,
  type SniffResult,
} from './mime.js';
import { guardPath, resolveUploadDestination, type ProjectFs } from './paths.js';
import { scanAssetReferences } from './references.js';
import type { MediaRegistry } from './registry.js';
import type { AssetIdentity, AssetUsage } from './types.js';

export const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

export interface UploadInput {
  fileName: string;
  contentBase64: string;
  /** Path de destino explícito (arquivo ou diretório), relativo ao Project Root. */
  targetPath?: string;
  altText?: string;
  caption?: string;
}

export interface UploadOutcome {
  asset: AssetIdentity;
  /** Path real onde o asset foi gravado (relativo ao Project Root). */
  storedPath: string;
  /** Verificação pós-escrita: re-leitura com hash idêntico (08§44, M3 §8.4). */
  verified: boolean;
  sha256: string;
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/** Deriva o estado de uso a partir de um scan fresco (08§50; scan incompleto => Unknown). */
export function usageFromScan(
  scan: { references: unknown[]; complete: boolean },
  origin: 'local' | 'remote',
): AssetUsage {
  const scannedAt = new Date().toISOString();
  if (origin === 'remote') return { state: 'External', confidence: 'HIGH_CONFIDENCE', scannedAt };
  if (!scan.complete) return { state: 'Unknown', confidence: 'UNKNOWN', scannedAt };
  if (scan.references.length > 0) return { state: 'Used', confidence: 'HIGH_CONFIDENCE', scannedAt };
  return { state: 'Unused', confidence: 'HIGH_CONFIDENCE', scannedAt };
}

/**
 * Validação completa de um payload de upload (08§45 + 08§67).
 * Compartilhada por upload e replace (Validate Compatibility, 08§48).
 */
export function validateUploadPayload(
  input: { fileName: string; contentBase64: string },
  maxBytes: number,
): Result<{ buf: Buffer; sniffed: SniffResult }> {
  if (typeof input.contentBase64 !== 'string' || input.contentBase64.length === 0) {
    return err(mediaError('InvalidFileName', 'contentBase64 vazio ou ausente', { resource: input.fileName }));
  }
  const buf = Buffer.from(input.contentBase64, 'base64');
  if (buf.length === 0) {
    return err(mediaError('InvalidFileName', 'contentBase64 não decodifica para conteúdo', { resource: input.fileName }));
  }
  // Size (08§45)
  if (buf.length > maxBytes) {
    return err(
      mediaError('FileTooLarge', `Arquivo excede o limite de ${maxBytes} bytes (${buf.length} bytes)`, {
        resource: input.fileName,
        details: { size: buf.length, maxBytes },
      }),
    );
  }
  // File Type + MIME real (08§45 — magic bytes, nunca a extensão)
  const sniffed = sniffMime(buf, input.fileName);
  if (!sniffed.ok) return sniffed;
  // Extensão do nome coerente com o conteúdo real
  if (!extensionMatchesMime(input.fileName, sniffed.value)) {
    return err(
      mediaError(
        'MimeExtensionMismatch',
        `Extensão de '${input.fileName}' contradiz o conteúdo real detectado (${sniffed.value.mime})`,
        {
          resource: input.fileName,
          details: { detectedMime: sniffed.value.mime, detectedType: sniffed.value.type },
        },
      ),
    );
  }
  // Security Check (08§67): SVG com conteúdo ativo é rejeitado com diagnóstico
  if (sniffed.value.type === 'SVG') {
    const text = buf.toString('utf8');
    const issues = inspectSvgActiveContent(text);
    if (issues.length > 0) {
      return err(
        mediaError('UnsafeSvgActiveContent', 'SVG rejeitado: conteúdo ativo detectado (08§67)', {
          resource: input.fileName,
          details: { issues: issues.map((i) => ({ kind: i.kind, evidence: i.evidence })) },
        }),
      );
    }
  }
  return ok({ buf, sniffed: sniffed.value });
}

export interface UploadDeps {
  fsCtx: ProjectFs;
  registry: MediaRegistry;
  projectId: string;
  maxUploadBytes?: number;
}

/** Fluxo de upload 08§44 completo. */
export async function uploadAsset(deps: UploadDeps, input: UploadInput): Promise<Result<UploadOutcome>> {
  const maxBytes = deps.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  // Validate + Security Check
  const validated = validateUploadPayload(input, maxBytes);
  if (!validated.ok) return validated;
  const { buf, sniffed } = validated.value;

  // Path (08§53) + Naming (08§52)
  const destination = await resolveUploadDestination(
    deps.fsCtx,
    input.fileName,
    input.targetPath,
    deps.registry.localAssetDirs(deps.projectId),
  );
  if (!destination.ok) return destination;
  const { relPath, absPath } = destination.value;

  // Store / Copy — escopo revalidado no path final; overwrite NUNCA no upload
  // (colisões já foram resolvidas por sufixo determinístico; 'wx' falha se uma
  // corrida criou o arquivo entre a resolução e a escrita).
  const finalGuard = await guardPath(deps.fsCtx, relPath);
  if (!finalGuard.ok) return finalGuard;
  try {
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buf, { flag: 'wx' });
  } catch (e) {
    const cause = e as NodeJS.ErrnoException;
    if (cause.code === 'EEXIST') {
      return err(
        mediaError('IncompatibleReplacement', `Conflito de escrita: '${relPath}' já existe`, {
          resource: relPath,
        }),
      );
    }
    return err(
      mediaError('VerificationFailed', `Falha ao gravar '${relPath}': ${cause.message}`, {
        resource: relPath,
      }),
    );
  }

  // Verificação pós-escrita (08§44: sucesso = asset existe no destino)
  const hash = sha256(buf);
  try {
    const reread = await fs.readFile(absPath);
    if (sha256(reread) !== hash) {
      return err(
        mediaError('VerificationFailed', `Verificação pós-escrita falhou para '${relPath}' (hash diverge)`, {
          resource: relPath,
        }),
      );
    }
  } catch (e) {
    return err(
      mediaError('VerificationFailed', `Verificação pós-escrita falhou para '${relPath}'`, {
        resource: relPath,
        details: { cause: (e as Error).message },
      }),
    );
  }

  // Index (08§49): scan fresco de referências => estado de uso honesto
  const scan = await scanAssetReferences(deps.fsCtx, relPath);
  if (!scan.ok) return scan;
  const usage = usageFromScan(scan.value, 'local');

  // Register (D10: registry via storage Repository)
  const now = new Date().toISOString();
  const dimensions = readImageDimensions(buf, sniffed.mime);
  const source = { origin: 'UploadedFile' as const, path: relPath };
  const identity: AssetIdentity = {
    id: randomUUID(),
    type: sniffed.type,
    source,
    metadata: {
      name: path.posix.basename(relPath),
      type: sniffed.type,
      mime: sniffed.mime,
      ...(dimensions !== undefined ? { dimensions } : {}),
      size: buf.length,
      source,
      ...(input.altText !== undefined ? { altText: input.altText } : {}),
      ...(input.caption !== undefined ? { caption: input.caption } : {}),
      createdAt: now,
      updatedAt: now,
      references: scan.value.references,
    },
    ...(dimensions !== undefined ? { dimensions } : {}),
    references: scan.value.references,
    scope: 'Project',
    usage,
  };
  deps.registry.upsert(deps.projectId, identity);

  return ok({ asset: identity, storedPath: relPath, verified: true, sha256: hash });
}
