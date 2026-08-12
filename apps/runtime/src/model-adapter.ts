/**
 * Adaptador tipado ProjectModel (@nexo/intelligence) -> ProjectModelSnapshot
 * (@nexo/storage: Record<string, unknown>) — convergência de tipos da Wave 3.
 *
 * O storage guarda o snapshot como Record<string, unknown> por contrato (SPEC §5:
 * sem dependência cruzada storage->intelligence). O spread abaixo produz um
 * object literal fresco (implicit index signature), portanto a adaptação
 * compila SEM casts; se o shape de ProjectModel deixar de ser serializável
 * em JSON o typecheck falha aqui.
 */

import type { ProjectModel } from '@nexo/intelligence';
import type { ProjectModelSnapshot } from '@nexo/storage';

export function toSnapshotModel(model: ProjectModel): ProjectModelSnapshot {
  return { ...model };
}
