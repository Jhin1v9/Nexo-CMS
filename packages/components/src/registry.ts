/**
 * Component Registry (doc 08§6/§26 + D10): persistencia via
 * @nexo/storage ComponentRepository (Repository Pattern — "Nexo stores what
 * Nexo owns"; NADA de registry em JSON solto no projeto do usuario).
 * O ComponentSchema completo e serializado em schema_json; colunas
 * (name/scope/project_id) sao espelho para consulta.
 *
 * Identidade estavel DENTRO do escopo (08§6): o id e um uuid gerado no
 * primeiro registro e PRESERVADO em re-deteccoes (syncDetected casa por
 * source path / nome, nunca recomputa id). Project Component != Library
 * Component (08§87): publish cria NOVO id no escopo Library.
 */

import type { ComponentRepository } from '@nexo/storage';

import type { ComponentSchema, ComponentScope, ComponentVersion } from './types.js';

export interface RegisteredComponent {
  projectId: string | null;
  schema: ComponentSchema;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentRegistry {
  upsert(projectId: string | null, schema: ComponentSchema): void;
  getById(componentId: string): RegisteredComponent | null;
  /** Lista por projeto (projectId) ou por escopo global (scope Library/Workspace). */
  list(projectId: string, scope?: ComponentScope): RegisteredComponent[];
  listLibrary(): RegisteredComponent[];
  remove(componentId: string): boolean;
  /** Busca por nome DENTRO de um escopo (08§79 duplication prevention). */
  findByName(projectId: string | null, scope: ComponentScope, name: string): RegisteredComponent | null;
  /** Busca por source path (identidade estavel entre re-deteccoes). */
  findBySourcePath(projectId: string, path: string): RegisteredComponent | null;
  addVersion(version: ComponentVersion): void;
  versions(componentId: string): ComponentVersion[];
}

function toSchema(raw: Record<string, unknown>): ComponentSchema {
  // O schema foi escrito por este package (mesma versao do contrato §7);
  // campos desconhecidos futuros sao preservados pelo roundtrip do JSON.
  return raw as unknown as ComponentSchema;
}

function sourcePaths(schema: ComponentSchema): string[] {
  const source = schema.identity.source;
  switch (source.kind) {
    case 'ProjectFile':
      return [source.path];
    case 'MultipleProjectFiles':
      return [...source.paths];
    case 'GeneratedSource':
      return [source.path];
    default:
      return [];
  }
}

export function createComponentRegistry(repo: ComponentRepository): ComponentRegistry {
  function toRegistered(record: {
    projectId: string | null;
    schema: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }): RegisteredComponent {
    return {
      projectId: record.projectId,
      schema: toSchema(record.schema),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  function list(projectId: string, scope?: ComponentScope): RegisteredComponent[] {
    return repo
      .listByProject(projectId)
      .map(toRegistered)
      .filter((r) => scope === undefined || r.schema.identity.scope === scope);
  }

  return {
    upsert(projectId, schema) {
      const existing = repo.getById(schema.identity.id);
      const now = new Date().toISOString();
      repo.upsert({
        id: schema.identity.id,
        projectId,
        name: schema.identity.name,
        scope: schema.identity.scope,
        schema: schema as unknown as Record<string, unknown>,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    },
    getById(componentId) {
      const record = repo.getById(componentId);
      return record === null ? null : toRegistered(record);
    },
    list,
    listLibrary() {
      return repo.listByScope('Library').map(toRegistered);
    },
    remove(componentId) {
      return repo.remove(componentId);
    },
    findByName(projectId, scope, name) {
      const pool =
        scope === 'Library' || scope === 'Workspace'
          ? repo.listByScope(scope).map(toRegistered)
          : list(projectId ?? '', scope);
      return (
        pool.find(
          (r) =>
            r.schema.identity.scope === scope &&
            r.schema.identity.name === name &&
            (scope !== 'Project' || r.projectId === projectId),
        ) ?? null
      );
    },
    findBySourcePath(projectId, path) {
      return (
        list(projectId).find((r) => sourcePaths(r.schema).includes(path)) ?? null
      );
    },
    addVersion(version) {
      repo.insertVersion({
        id: version.id,
        componentId: version.componentId,
        version: version.version,
        record: version as unknown as Record<string, unknown>,
        publishedAt: version.publishedAt,
      });
    },
    versions(componentId) {
      return repo
        .listVersions(componentId)
        .map((row) => row.record as unknown as ComponentVersion);
    },
  };
}
