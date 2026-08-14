/**
 * Component Update Flow (doc 08§22 — fluxo canonico):
 *   Resolve Component -> Resolve Source -> Validate Change -> Resolve Adapter
 *   -> Transform Source (APENAS via transformer Wave 2a — NUNCA string
 *   replacement) -> Persist -> Re-analyze -> Validate -> Return Diff.
 *
 * Dois planos de mutacao (independentes ou combinados):
 *  - patch de schema (registry): description/metadata/props/variants, com
 *    validacao previa (08§12). `identity` e imutavel por patch (08§6).
 *  - sourceEdits: operacoes AST do ReactTsxTransformer (setJsxProp,
 *    updateJsxText, insertJsxChild, removeJsxElement) sobre o arquivo-fonte
 *    do componente. Cada edit e persistido e verificado (read-back) antes do
 *    proximo (o transformer le do disco a cada operacao).
 *
 * Apos qualquer mutacao de source, o arquivo e re-analisado (re-parse real)
 * e props/events/slots/assets do schema sao reconciliados com a FONTE —
 * watcher nao e verdade; reconciliacao explicita (M3 §8.6).
 */

import { promises as fs } from 'node:fs';

import type { ElementSelector, ReactTsxTransformer, TransformResult } from '@nexo/adapters';
import { err, ok, type Result } from '@nexo/shared';

import { analyzeComponentFile } from './detect.js';
import { diffFiles } from './diff.js';
import { componentError } from './errors.js';
import { guardPath, type ProjectFs } from './project-fs.js';
import type { ComponentRegistry } from './registry.js';
import type { ComponentDiff, ComponentProp, ComponentSchema, ComponentVariant } from './types.js';

export type SourceEdit =
  | { op: 'setJsxProp'; elementSelector: ElementSelector; propName: string; value: string | number | boolean }
  | { op: 'updateJsxText'; elementSelector: ElementSelector; newText: string }
  | { op: 'insertJsxChild'; parentSelector: ElementSelector; childSource: string }
  | { op: 'removeJsxElement'; elementSelector: ElementSelector };

export interface ComponentPatch {
  description?: string;
  /** Merge raso em metadata; a chave reservada 'identity' e rejeitada (08§6). */
  metadata?: Record<string, unknown>;
  /** Substitui a lista de props do schema (validada antes de mutar — 08§12). */
  props?: ComponentProp[];
  variants?: ComponentVariant[];
}

export interface UpdateComponentInput {
  componentId: string;
  patch?: ComponentPatch;
  sourceEdits?: SourceEdit[];
}

export interface UpdateComponentOutcome {
  componentId: string;
  diff: ComponentDiff;
  diagnostics: string[];
  schema: ComponentSchema;
}

export interface UpdateDeps {
  fsCtx: ProjectFs;
  registry: ComponentRegistry;
  projectId: string;
  transformer: ReactTsxTransformer;
}

const PROP_NAME_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function validatePatch(patch: ComponentPatch): ReturnType<typeof componentError> | null {
  if (patch.metadata !== undefined && 'identity' in patch.metadata) {
    return componentError(
      'InvalidDefinition',
      "patch.metadata nao pode conter 'identity' (identidade e imutavel — 08§6)",
    );
  }
  for (const prop of patch.props ?? []) {
    if (!PROP_NAME_RE.test(prop.name)) {
      return componentError('InvalidDefinition', `Prop com nome invalido: '${prop.name}'`);
    }
    if (prop.default !== undefined && prop.required) {
      return componentError(
        'InvalidDefinition',
        `Prop '${prop.name}': default exige required:false (validacao antes de mutar — 08§12)`,
      );
    }
  }
  for (const variant of patch.variants ?? []) {
    if (!PROP_NAME_RE.test(variant.name) || variant.values.length === 0) {
      return componentError(
        'InvalidDefinition',
        `Variant invalida: '${variant.name}' (nome identificador + values nao vazio)`,
      );
    }
  }
  return null;
}

function sourcePathOf(schema: ComponentSchema): string | null {
  const source = schema.identity.source;
  if (source.kind === 'ProjectFile') return source.path;
  if (source.kind === 'GeneratedSource') return source.path;
  return null;
}

async function applyEdit(
  transformer: ReactTsxTransformer,
  absFile: string,
  edit: SourceEdit,
): Promise<TransformResult> {
  switch (edit.op) {
    case 'setJsxProp':
      return transformer.setJsxProp({
        file: absFile,
        elementSelector: edit.elementSelector,
        propName: edit.propName,
        value: edit.value,
      });
    case 'updateJsxText':
      return transformer.updateJsxText({
        file: absFile,
        elementSelector: edit.elementSelector,
        newText: edit.newText,
      });
    case 'insertJsxChild':
      return transformer.insertJsxChild({
        file: absFile,
        parentSelector: edit.parentSelector,
        childSource: edit.childSource,
      });
    case 'removeJsxElement':
      return transformer.removeJsxElement({ file: absFile, elementSelector: edit.elementSelector });
  }
}

export async function updateComponent(
  deps: UpdateDeps,
  input: UpdateComponentInput,
): Promise<Result<UpdateComponentOutcome>> {
  const diagnostics: string[] = [];

  // -- Resolve Component (isolamento de escopo: Project component do projeto) -
  const registered = deps.registry.getById(input.componentId);
  if (registered === null || (registered.projectId !== null && registered.projectId !== deps.projectId)) {
    return err(
      componentError('ComponentNotFound', `Componente nao encontrado: '${input.componentId}'`, {
        resource: input.componentId,
      }),
    );
  }
  const schema = structuredClone(registered.schema);

  // -- Validate Change (antes de qualquer mutacao — 08§12/§22) ----------------
  if (input.patch !== undefined) {
    const invalid = validatePatch(input.patch);
    if (invalid !== null) return err(invalid);
  }
  const edits = input.sourceEdits ?? [];
  if (input.patch === undefined && edits.length === 0) {
    return err(
      componentError('InvalidDefinition', 'component.update sem patch e sem sourceEdits (nada a fazer)', {
        resource: input.componentId,
      }),
    );
  }

  // -- Resolve Source + Transform/Persist (por edit, com verificacao) ---------
  const changes: Record<string, { before: string | null; after: string | null }> = {};
  if (edits.length > 0) {
    const rel = sourcePathOf(schema);
    if (rel === null) {
      return err(
        componentError(
          'UnsupportedSourceKind',
          `sourceEdits exigem source em arquivo do projeto; kind '${schema.identity.source.kind}' nao tem write-path (honesto, nao adivinhado)`,
          { resource: input.componentId },
        ),
      );
    }
    const guarded = await guardPath(deps.fsCtx, rel);
    if (!guarded.ok) return err(guarded.error);
    const absFile = guarded.value;

    for (const edit of edits) {
      let beforeContent: string;
      try {
        beforeContent = await fs.readFile(absFile, 'utf8');
      } catch (e) {
        return err(
          componentError('ComponentNotFound', `Arquivo-fonte ilegivel: '${rel}'`, {
            resource: rel,
            details: { cause: (e as Error).message },
          }),
        );
      }
      changes[rel] ??= { before: beforeContent, after: null };

      const result = await applyEdit(deps.transformer, absFile, edit);
      if (!result.ok || result.newContent === undefined) {
        return err(
          componentError('TransformFailed', `sourceEdit '${edit.op}' falhou — arquivo intocado nesta etapa`, {
            resource: rel,
            details: {
              op: edit.op,
              transformDiagnostics: result.diagnostics,
              ...(result.unsupported !== undefined ? { unsupported: result.unsupported } : {}),
            },
          }),
        );
      }
      try {
        await fs.writeFile(absFile, result.newContent, 'utf8');
      } catch (e) {
        return err(
          componentError('PersistenceFailed', `Falha ao persistir '${rel}': ${(e as Error).message}`, {
            resource: rel,
          }),
        );
      }
      const readBack = await fs.readFile(absFile, 'utf8');
      if (readBack !== result.newContent) {
        return err(
          componentError('VerificationFailed', `Read-back difere do transformado em '${rel}'`, {
            resource: rel,
          }),
        );
      }
      changes[rel] = { before: changes[rel]?.before ?? null, after: readBack };
      diagnostics.push(`sourceEdit '${edit.op}' aplicado e verificado em '${rel}'`);
    }

    // -- Re-analyze (re-parse real pos-mutacao) + reconciliacao do schema -----
    const finalContent = changes[rel]?.after ?? null;
    if (finalContent !== null) {
      const reanalyzed = analyzeComponentFile(rel, finalContent);
      if (!reanalyzed.parseOk) {
        return err(
          componentError('VerificationFailed', `Re-parse pos-mutacao falhou em '${rel}'`, {
            resource: rel,
          }),
        );
      }
      const refreshed = reanalyzed.components.find((c) => c.name === schema.identity.name);
      if (refreshed !== undefined) {
        schema.events = refreshed.events;
        schema.slots = refreshed.slots;
        schema.assets = refreshed.assets;
        if (input.patch?.props === undefined) {
          // props vem da FONTE quando o patch nao os substitui explicitamente
          schema.props = refreshed.props;
          schema.metadata['propsConfidence'] = refreshed.propsConfidence;
        }
      }
      diagnostics.push(`re-analyze: '${rel}' re-parseado com sucesso`);
    }
  }

  // -- Patch de schema (registry) ---------------------------------------------
  if (input.patch !== undefined) {
    if (input.patch.description !== undefined) {
      schema.metadata['description'] = input.patch.description;
      diagnostics.push('metadata.description atualizada');
    }
    if (input.patch.metadata !== undefined) {
      for (const [k, v] of Object.entries(input.patch.metadata)) {
        schema.metadata[k] = v;
      }
      diagnostics.push(`metadata merge: ${Object.keys(input.patch.metadata).join(', ')}`);
    }
    if (input.patch.props !== undefined) {
      schema.props = input.patch.props;
      diagnostics.push(`props substituidos (${input.patch.props.length})`);
    }
    if (input.patch.variants !== undefined) {
      schema.variants = input.patch.variants;
      diagnostics.push(`variants substituidas (${input.patch.variants.length})`);
    }
  }
  schema.metadata['updatedAt'] = new Date().toISOString();

  // -- Persist registry + Verify ----------------------------------------------
  deps.registry.upsert(registered.projectId, schema);
  const persisted = deps.registry.getById(input.componentId);
  if (persisted === null || persisted.schema.metadata['updatedAt'] !== schema.metadata['updatedAt']) {
    return err(
      componentError('VerificationFailed', 'Verificacao do registry falhou apos update', {
        resource: input.componentId,
      }),
    );
  }

  return ok({
    componentId: input.componentId,
    diff: diffFiles(changes),
    diagnostics,
    schema: persisted.schema,
  });
}
