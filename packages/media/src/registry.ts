/**
 * Media Asset Registry (doc 08§42 + D10): persistência via
 * @nexo/storage MediaAssetRepository (Repository Pattern — "Nexo stores what
 * Nexo owns"; NADA de registry em JSON solto no projeto do usuário).
 * A identidade completa é serializada em identity_json; colunas indexáveis
 * (name/type) são espelho para consulta. projectId é contexto do registry
 * (não faz parte de AssetIdentity, 08§42).
 */

import type { MediaAssetRepository } from '@nexo/storage';

import type { AssetIdentity } from './types.js';

export interface MediaRegistry {
  upsert(projectId: string, identity: AssetIdentity): void;
  getById(projectId: string, assetId: string): AssetIdentity | null;
  list(projectId: string): AssetIdentity[];
  remove(assetId: string): boolean;
  findByPath(projectId: string, relPath: string): AssetIdentity | null;
  /** Diretórios (relativos ao root) já usados por assets locais registrados. */
  localAssetDirs(projectId: string): string[];
}

function toIdentity(raw: Record<string, unknown>): AssetIdentity {
  // A identidade foi escrita por este package (mesma versão do schema);
  // campos desconhecidos futuros são preservados pelo roundtrip do JSON.
  return raw as unknown as AssetIdentity;
}

export function createMediaRegistry(repo: MediaAssetRepository): MediaRegistry {
  function list(projectId: string): AssetIdentity[] {
    return repo.listByProject(projectId).map((r) => toIdentity(r.identity));
  }

  return {
    upsert(projectId, identity) {
      repo.upsert({
        id: identity.id,
        projectId,
        name: identity.metadata.name,
        type: identity.type,
        identity: identity as unknown as Record<string, unknown>,
        createdAt: identity.metadata.createdAt,
        updatedAt: identity.metadata.updatedAt,
      });
    },
    getById(projectId, assetId) {
      const record = repo.getById(assetId);
      if (record === null || record.projectId !== projectId) return null;
      return toIdentity(record.identity);
    },
    list,
    remove(assetId) {
      return repo.remove(assetId);
    },
    findByPath(projectId, relPath) {
      return list(projectId).find((a) => a.source.path === relPath) ?? null;
    },
    localAssetDirs(projectId) {
      const dirs = new Set<string>();
      for (const asset of list(projectId)) {
        const p = asset.source.path;
        if (p !== undefined) {
          const idx = p.lastIndexOf('/');
          dirs.add(idx === -1 ? '.' : p.slice(0, idx));
        }
      }
      return [...dirs].sort();
    },
  };
}
