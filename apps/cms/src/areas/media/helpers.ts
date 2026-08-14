/**
 * Helpers PUROS da área /media (sem React — testáveis em node).
 * Regra dura (08§50, M3 §8.8): UsageState `Unknown` NUNCA é apresentado como
 * `Unused` — tom e texto próprios, com confidence do scan ao lado.
 */

import type { BadgeTone } from '../../components/ui';
import type { AssetIdentity, AssetType, UsageState } from '../../api/hooks';

/** Bytes -> texto legível (binário, 1024). Sem fração artificial em < 1KB. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'tamanho desconhecido';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'] as const;
  let value = bytes;
  let unit = 'B';
  for (const u of units) {
    if (value < 1024) break;
    value = value / 1024;
    unit = u;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

/** Tom do badge de uso — cor nunca é o único canal (texto sempre presente). */
export function usageTone(state: UsageState): BadgeTone {
  switch (state) {
    case 'Used':
      return 'success';
    case 'Unused':
      return 'neutral';
    case 'Unknown':
      return 'warning';
    case 'External':
      return 'primary';
    case 'Generated':
      return 'primary';
  }
}

/** Rótulo explícito do uso — Unknown diz "desconhecido", NUNCA "não usado". */
export function usageLabel(state: UsageState): string {
  switch (state) {
    case 'Used':
      return 'Em uso';
    case 'Unused':
      return 'Sem referências';
    case 'Unknown':
      return 'Uso desconhecido';
    case 'External':
      return 'Externo';
    case 'Generated':
      return 'Gerado';
  }
}

export function assetTypeTone(type: AssetType): BadgeTone {
  switch (type) {
    case 'Image':
    case 'SVG':
      return 'primary';
    case 'Video':
    case 'Audio':
      return 'success';
    default:
      return 'neutral';
  }
}

/** Preview visual somente para imagens/SVG locais com conteúdo incluído. */
export function isPreviewable(asset: AssetIdentity): boolean {
  return asset.type === 'Image' || asset.type === 'SVG';
}

/** data URL para preview — NUNCA despejar base64 como texto na UI (08§82). */
export function previewDataUrl(mime: string, contentBase64: string | undefined): string | undefined {
  if (contentBase64 === undefined || contentBase64.length === 0) return undefined;
  return `data:${mime};base64,${contentBase64}`;
}

/** Origem -> descrição curta honesta (08§43). */
export function originLabel(origin: AssetIdentity['source']['origin']): string {
  switch (origin) {
    case 'LocalProject':
      return 'Arquivo do projeto';
    case 'UploadedFile':
      return 'Upload';
    case 'GeneratedFile':
      return 'Gerado';
    case 'ExternalURL':
      return 'URL externa';
    case 'CDN':
      return 'CDN';
    case 'Library':
      return 'Library';
    case 'Integration':
      return 'Integração';
  }
}

/** Path/URL de origem para exibição. */
export function sourceLocationLabel(source: AssetIdentity['source']): string {
  return source.path ?? source.url ?? '—';
}

/** Lê um File como base64 (payload de media.upload/replace). Rejeita > maxBytes ANTES de ler. */
export function fileToBase64(file: { size: number; name: string }, maxBytes: number): { error: string } | { read: () => Promise<string> } {
  if (file.size > maxBytes) {
    return { error: `'${file.name}' excede o limite de ${formatBytes(maxBytes)} (08§45 Size).` };
  }
  return {
    read: () =>
      new Promise<string>((resolve, reject) => {
        if (typeof FileReader === 'undefined') {
          reject(new Error('FileReader indisponível neste ambiente'));
          return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`Falha ao ler '${file.name}'`));
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('Leitura não produziu data URL'));
            return;
          }
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.readAsDataURL(file as File);
      }),
  };
}

/** Referências com confidence — PARTIAL/UNKNOWN marcadas, nunca omitidas. */
export function referenceConfidenceTone(confidence: 'HIGH_CONFIDENCE' | 'PARTIAL' | 'UNKNOWN'): BadgeTone {
  switch (confidence) {
    case 'HIGH_CONFIDENCE':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'UNKNOWN':
      return 'neutral';
  }
}
