/**
 * Capabilities M3 (M3-CONTRACTS.md §3 — FROZEN): 35 capabilities sobre os
 * services da Wave 2a/2b (@nexo/editor, @nexo/media, @nexo/components,
 * @nexo/design, @nexo/responsive), seguindo o padrão exato de ./git.ts:
 * contracts zod + handlers + risk + timeout + delegação ao service.
 *
 * - Autorização NÃO é decidida aqui: o Control Plane faz o gate ANTES do
 *   handler (SPEC §8 short-circuit). Mutações DESTRUCTIVE -> REQUIRE_APPROVAL
 *   via risks do PolicyEngine (ver ../policy.ts; executáveis com aprovação
 *   por invocação, decisão D17). Permissão = capability id (D9).
 * - Services instanciados UMA vez (createM3Services, chamado no bootstrap) —
 *   filesystem scoping é resolvido por projeto DENTRO dos services (Scoped
 *   Filesystem de @nexo/runtime com allowedRoot = project.rootPath, mesmo
 *   invariante do executor scoped do git.ts).
 * - Erros: os services já retornam NexoError estáveis com details/nextAction
 *   — propagados SEM embrulhar (padrão git).
 * - Erros de projeto inexistente: media/component/design/responsive já
 *   resolvem projectId -> NOT_FOUND internamente; os handlers do editor
 *   validam via getProject (o EditorService recebe resolveProjectRoot sync
 *   e não consulta o storage por operação).
 * - Operações longas responsive (diagnose/stressTest/compare/snapshot):
 *   padrão M1/M2 é capability SYNC com timeout longo (runtime.command.execute
 *   usa o mesmo modelo; async:'job' existe no Control Plane mas nenhuma
 *   capability M1/M2 o usa). Seguimos sync com timeout 180s (documentado;
 *   browser real = Playwright, 09§46). Testes com browser real ficam para a
 *   Wave 6-7 (e2e).
 * - media.upload recebe contentBase64: limite default do service = 25MB
 *   (DEFAULT_MAX_UPLOAD_BYTES de @nexo/media, 08§45 Size) — declarado na
 *   description do contrato (payload grande fica sob o timeout de escrita).
 */

import { isAbsolute, join } from 'node:path';

import {
  createReactTsxTransformer,
  type ReactTsxTransformer,
  type TransformResult as AdapterTransformResult,
} from '@nexo/adapters';
import { createComponentService, type ComponentService } from '@nexo/components';
import type { CapabilityContract, ExecutionContext } from '@nexo/core';
import { createDesignService, type DesignService } from '@nexo/design';
import {
  createEditorService,
  type EditorService,
  type SelectionModel,
  type SourceMapper,
  type SourceTransformAdapter,
  type TransformRequest,
  type TransformResult as EditorTransformResult,
} from '@nexo/editor';
import { mapComponentSource, type ProjectScanner } from '@nexo/intelligence';
import { createMediaService, DEFAULT_MAX_UPLOAD_BYTES, type MediaService } from '@nexo/media';
import { createResponsiveService, type ResponsiveService, STRESS_PROFILES } from '@nexo/responsive';
import type { Result } from '@nexo/shared';
import { err, nexoError, ok } from '@nexo/shared';
import type { ProjectRegistration, Storage } from '@nexo/storage';
import ts from 'typescript';
import { z } from 'zod';

import { scanAndPersist, type ProjectCapabilityDeps } from './project.js';

/** Timeout das leituras M3 (operações locais rápidas — padrão git M2). */
export const M3_READ_TIMEOUT_MS = 30_000;
/** Timeout das mutações M3 (disco local + AST; upload até 25MB). */
export const M3_WRITE_TIMEOUT_MS = 60_000;
/**
 * Timeout das operações LONGAS responsive (browser real + dev server, 09§46)
 * e de responsive.preview (startup real do dev server). Padrão sync (ver
 * cabeçalho do módulo).
 */
export const M3_LONG_TIMEOUT_MS = 180_000;

const projectIdField = { projectId: z.string().min(1) } as const;

// ---------------------------------------------------------------------------
// Service wiring (services criados UMA vez no bootstrap)
// ---------------------------------------------------------------------------

export interface M3ServiceDeps {
  storage: Storage;
  /** dataDir do Nexo Home (artefatos responsive: snapshots/, compare/). */
  dataDir: string;
  /** Scanner M1 (Project Intelligence) — também alimenta o hook updateIntelligence. */
  scanner: ProjectScanner;
  /** Transformer React/TSX (write-path M3, D8). Default: createReactTsxTransformer(). */
  transformer?: ReactTsxTransformer;
}

export interface M3Services {
  editor: EditorService;
  media: MediaService;
  components: ComponentService;
  design: DesignService;
  responsive: ResponsiveService;
}

/** Raiz REAL do projeto (Project Root registrado, SPEC §5). Handlers pré-validam. */
function makeResolveProjectRoot(storage: Storage): (projectId: string) => string {
  return (projectId) => {
    const project = storage.repos.projects.getById(projectId);
    if (project === null) {
      throw new Error(`project not registered: '${projectId}' (resolveProjectRoot)`);
    }
    return project.rootPath;
  };
}

/**
 * Parser TSX real para a verificação pós-escrita (07§41 "Parser Succeeds"):
 * TypeScript compiler API (D8) — diagnósticos SINTÁTICOS via transpileModule
 * (sem semântica; suficiente para "arquivo parseia após a escrita").
 */
function parseTsx(content: string, filePath: string): boolean {
  const out = ts.transpileModule(content, {
    fileName: filePath,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
    },
  });
  return (out.diagnostics ?? []).every((d) => d.category !== ts.DiagnosticCategory.Error);
}

/**
 * SourceTransformAdapter do editor (M3-CONTRACTS §2/§4) sobre o
 * ReactTsxTransformer (write-path React+TSX first-class, D6/D8).
 *
 * Contrato do TransformRequest (editor/save-pipeline.ts): `instruction` nomeia
 * a operação ('setJsxProp' | 'updateJsxText' | 'insertJsxChild' |
 * 'removeJsxElement'); `context` carrega os campos da operação
 * (file/elementSelector/...) + `projectRoot` (absoluto) quando `file` é
 * relativo ao Project Root. Extensão fora de .tsx/.jsx (projetos não-React):
 * o transformer retorna UNSUPPORTED e propagamos — honesto, nunca adivinhado.
 *
 * NOTA: o save pipeline só executa esta etapa quando `transformRequest` é
 * fornecido; os fluxos atuais (editor.source.save/change.apply) são code-save
 * (conteúdo final fornecido) e documentam o skip (07§36).
 */
const elementSelectorSchema = z.object({
  componentName: z.string().min(1).optional(),
  jsxTag: z.string().min(1).optional(),
  propMatch: z.object({ name: z.string().min(1), value: z.string().optional() }).optional(),
});

const transformContextSchemas = {
  setJsxProp: z.object({
    file: z.string().min(1),
    projectRoot: z.string().min(1).optional(),
    elementSelector: elementSelectorSchema,
    propName: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  updateJsxText: z.object({
    file: z.string().min(1),
    projectRoot: z.string().min(1).optional(),
    elementSelector: elementSelectorSchema,
    newText: z.string(),
  }),
  insertJsxChild: z.object({
    file: z.string().min(1),
    projectRoot: z.string().min(1).optional(),
    parentSelector: elementSelectorSchema,
    childSource: z.string().min(1),
  }),
  removeJsxElement: z.object({
    file: z.string().min(1),
    projectRoot: z.string().min(1).optional(),
    elementSelector: elementSelectorSchema,
  }),
} as const;

type TransformInstruction = keyof typeof transformContextSchemas;

function toEditorTransformResult(relFile: string, r: AdapterTransformResult): EditorTransformResult {
  if (r.ok && typeof r.newContent === 'string') {
    return { status: 'OK', files: { [relFile]: r.newContent } };
  }
  // O contrato do editor só tem OK|UNSUPPORTED: falhas do transformer (incl.
  // diagnósticos reais de parse/alvo) são propagadas no `reason` — nunca
  // convertidas em sucesso.
  const reason =
    r.unsupported?.reason ??
    (r.diagnostics.length > 0
      ? r.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; ')
      : 'transformation failed without diagnostics');
  return { status: 'UNSUPPORTED', reason };
}

export function createReactSourceTransformAdapter(transformer: ReactTsxTransformer): SourceTransformAdapter {
  return {
    async transform(request: TransformRequest): Promise<EditorTransformResult> {
      const instruction = request.instruction as TransformInstruction;
      const schema = transformContextSchemas[instruction];
      if (schema === undefined) {
        return {
          status: 'UNSUPPORTED',
          reason: `unknown transform instruction: '${request.instruction}' (supported: ${Object.keys(transformContextSchemas).join(', ')})`,
        };
      }
      const parsed = schema.safeParse(request.context ?? {});
      if (!parsed.success) {
        return {
          status: 'UNSUPPORTED',
          reason: `invalid transform context for '${instruction}': ${parsed.error.issues.map((i) => i.message).join('; ')}`,
        };
      }
      const resolveFile = (file: string, projectRoot: string | undefined): string | undefined =>
        isAbsolute(file) ? file : projectRoot !== undefined ? join(projectRoot, file) : undefined;
      switch (instruction) {
        case 'setJsxProp': {
          const ctx = parsed.data as z.infer<typeof transformContextSchemas.setJsxProp>;
          const absFile = resolveFile(ctx.file, ctx.projectRoot);
          if (absFile === undefined) return relativeWithoutRoot(instruction, ctx.file);
          return toEditorTransformResult(
            ctx.file,
            await transformer.setJsxProp({
              file: absFile,
              elementSelector: ctx.elementSelector,
              propName: ctx.propName,
              value: ctx.value,
            }),
          );
        }
        case 'updateJsxText': {
          const ctx = parsed.data as z.infer<typeof transformContextSchemas.updateJsxText>;
          const absFile = resolveFile(ctx.file, ctx.projectRoot);
          if (absFile === undefined) return relativeWithoutRoot(instruction, ctx.file);
          return toEditorTransformResult(
            ctx.file,
            await transformer.updateJsxText({ file: absFile, elementSelector: ctx.elementSelector, newText: ctx.newText }),
          );
        }
        case 'insertJsxChild': {
          const ctx = parsed.data as z.infer<typeof transformContextSchemas.insertJsxChild>;
          const absFile = resolveFile(ctx.file, ctx.projectRoot);
          if (absFile === undefined) return relativeWithoutRoot(instruction, ctx.file);
          return toEditorTransformResult(
            ctx.file,
            await transformer.insertJsxChild({ file: absFile, parentSelector: ctx.parentSelector, childSource: ctx.childSource }),
          );
        }
        case 'removeJsxElement': {
          const ctx = parsed.data as z.infer<typeof transformContextSchemas.removeJsxElement>;
          const absFile = resolveFile(ctx.file, ctx.projectRoot);
          if (absFile === undefined) return relativeWithoutRoot(instruction, ctx.file);
          return toEditorTransformResult(
            ctx.file,
            await transformer.removeJsxElement({ file: absFile, elementSelector: ctx.elementSelector }),
          );
        }
      }
    },
  };
}

function relativeWithoutRoot(instruction: string, file: string): EditorTransformResult {
  return {
    status: 'UNSUPPORTED',
    reason: `transform '${instruction}': relative file '${file}' requires context.projectRoot (absolute) — não adivinhamos a raiz`,
  };
}

/**
 * SourceMapper do editor (07§13-15; mapping implementado por intelligence,
 * NUNCA pelo editor — 07§74). `nodeRef` que parece path de arquivo
 * (extensão de código ou contém '/') é tratado como filePath; demais casos
 * como componentName. Sem nodeRef -> UNKNOWN + alternativas (07§15).
 */
function makeSourceMapper(resolveProjectRoot: (projectId: string) => string): SourceMapper {
  return {
    async map({ projectId, route, nodeRef }) {
      const base = { projectId, ...(route !== undefined ? { route } : {}) };
      if (nodeRef === undefined || nodeRef.trim() === '') {
        return ok<SelectionModel>({
          ...base,
          confidence: 'UNKNOWN',
          alternatives: ['informe nodeRef (componente ou arquivo)', 'open page source', 'use Code View'],
        });
      }
      const rootPath = resolveProjectRoot(projectId);
      const looksLikePath = /\.[cm]?[jt]sx?$/.test(nodeRef) || nodeRef.includes('/');
      const mapped = await mapComponentSource(
        looksLikePath ? { rootPath, filePath: nodeRef } : { rootPath, componentName: nodeRef },
      );
      if (!mapped.ok) return mapped; // NexoError estável do intelligence propaga
      const m = mapped.value;
      const selection: SelectionModel = {
        ...base,
        nodeRef,
        ...(m.exportName !== null ? { component: m.exportName } : {}),
        ...(m.file !== null ? { sourceFile: m.file } : {}),
        ...(m.line !== null && m.column !== null ? { sourceLocation: { line: m.line, column: m.column } } : {}),
        confidence: m.confidence,
        // 07§15: mapping incerto -> alternativas seguras (evidência real do scan).
        ...(m.confidence === 'PARTIAL' || m.confidence === 'UNKNOWN'
          ? { alternatives: m.evidence.length > 0 ? m.evidence : ['open page source', 'use Code View'] }
          : {}),
      };
      return ok(selection);
    },
  };
}

/**
 * Cria os 5 services M3 UMA vez (composition root — bootstrap.ts).
 * ResponsiveService pode falhar na criação (registry sqlite) -> Result.
 */
export function createM3Services(deps: M3ServiceDeps): Result<M3Services> {
  const transformer = deps.transformer ?? createReactTsxTransformer();
  const resolveProjectRoot = makeResolveProjectRoot(deps.storage);

  // 07§36 "Update Project Intelligence": após persistência confirmada, a PI é
  // re-escaneada e persistida (mesmo scanAndPersist de project.refresh —
  // fingerprint + pi_snapshot). Falha NÃO desfaz o save: o save pipeline
  // captura e reporta em diagnostics (07§63).
  const updateIntelligence = async (projectId: string): Promise<void> => {
    const project = deps.storage.repos.projects.getById(projectId);
    if (project === null) return; // handlers pré-validam; defesa silenciosa aqui
    const piDeps: ProjectCapabilityDeps = { storage: deps.storage, scanner: deps.scanner };
    const persisted = await scanAndPersist(piDeps, project);
    if (!persisted.ok) throw new Error(persisted.error.message);
  };

  const editor = createEditorService({
    resolveProjectRoot,
    storage: deps.storage, // recovery de pending state (07§65)
    adapter: createReactSourceTransformAdapter(transformer),
    parseTsx,
    updateIntelligence,
    // updatePreview NÃO injetado: preview = runtime real gerenciado por
    // @nexo/responsive (09§27); o pipeline documenta o skip (honesto).
    sourceMapper: makeSourceMapper(resolveProjectRoot),
  });

  const media = createMediaService({ storage: deps.storage }); // 25MB default (08§45)
  const components = createComponentService({ storage: deps.storage, transformer });
  const design = createDesignService({ storage: deps.storage, scanner: deps.scanner });

  const responsive = createResponsiveService({
    storage: deps.storage,
    dataDir: deps.dataDir,
    // ProjectScanner (intelligence) é estruturalmente um ProjectScriptsScanner
    // (scan(root) -> { scripts }) — usado pelo preview para achar o dev server.
    scanner: deps.scanner,
    // sourceMapper NÃO injetado: SourceMapperFn do responsive é SÍNCRONO e
    // opera sobre ElementRef (DOM); mapComponentSource é async e opera por
    // componentName/filePath — não há correspondência honesta em M3. Ausente =
    // sourceMapping omitido dos issues (nunca adivinhado, 09§37/§50).
    // resolveProjectRoot: default do service (storage.repos.projects) — correto.
  });
  if (!responsive.ok) return responsive;

  return ok({ editor, media, components, design, responsive: responsive.value });
}

// ---------------------------------------------------------------------------
// Zod schemas (fiéis ao M3-CONTRACTS §3; refinamentos de defesa em profundidade
// ficam nos services — ex.: exactly-one do ElementSelector, MIME real no upload)
// ---------------------------------------------------------------------------

const changeOperationSchema = z.enum(['modify', 'create', 'delete', 'rename']);
const changeSourceSchema = z.enum(['visual', 'code', 'ai', 'external', 'generated']);
const changeOriginSchema = z.enum(['Human', 'AI', 'Visual Editor', 'Code Editor', 'External Change']);

const scopeSchema = z.enum(['Project', 'Workspace', 'Library']);

const propTypeSchema = z.enum([
  'String',
  'Number',
  'Boolean',
  'Image',
  'Video',
  'URL',
  'Color',
  'RichText',
  'Enum',
  'Array',
  'Object',
  'ComponentReference',
  'Slot',
]);

const assetTypeSchema = z.enum(['Image', 'SVG', 'Video', 'Audio', 'Font', 'PDF', 'Document', 'Other']);
const usageStateSchema = z.enum(['Used', 'Unused', 'Unknown', 'External', 'Generated']);

const propertySourceSchema = z.enum([
  'DirectValue',
  'CssVariable',
  'DesignToken',
  'TailwindUtility',
  'ThemeConfiguration',
  'ComponentProp',
  'StyledComponentRule',
  'InlineStyle',
  'Unknown',
]);

const themeMechanismSchema = z.enum(['CssVariables', 'Classes', 'Attributes', 'Configuration', 'ComponentState']);

const stressProfileSchema = z.enum(
  Object.keys(STRESS_PROFILES) as ['longHeading', 'longButtonText', 'manyItems', 'missingImage', 'extremeViewport'],
);

// ---- editor -----------------------------------------------------------------

const editorSourceOpenInput = z.object({ ...projectIdField, filePath: z.string().min(1) });

const editorSourceSaveInput = z.object({
  ...projectIdField,
  filePath: z.string().min(1),
  content: z.string(),
  expectedHash: z.string().min(1).optional(),
});

const editorSelectionReadInput = z.object({
  ...projectIdField,
  route: z.string().min(1).optional(),
  nodeRef: z.string().min(1).optional(),
});

// ChangeInput (M3-CONTRACTS §6/D7): `before` NUNCA vem do chamador — o
// ChangeManager captura o estado real do disco (07§30).
const changeInputSchema = z.object({
  files: z.array(z.string().min(1)).min(1),
  operation: changeOperationSchema,
  source: changeSourceSchema,
  origin: changeOriginSchema,
  after: z.record(z.string().min(1), z.string().nullable()),
  renameTo: z.string().min(1).optional(),
});

const editorChangeCreateInput = z.object({ ...projectIdField, change: changeInputSchema });
const editorChangeIdInput = z.object({ ...projectIdField, changeId: z.string().min(1) });
const editorChangeApplyInput = z.object({
  ...projectIdField,
  changeId: z.string().min(1),
  expectedHash: z.string().min(1).optional(),
});
const projectOnlyInput = z.object(projectIdField);

// ---- component ----------------------------------------------------------------

const createPropInputSchema = z.object({
  name: z.string().min(1),
  type: propTypeSchema,
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  description: z.string().optional(),
  validation: z.string().optional(),
});

const componentVariantSchema = z.object({ name: z.string().min(1), values: z.array(z.string()) });

const componentListInput = z.object({ ...projectIdField, scope: scopeSchema.optional() });
const componentReadInput = z.object({ ...projectIdField, componentId: z.string().min(1) });

const componentCreateInput = z.object({
  ...projectIdField,
  name: z.string().min(1),
  description: z.string().optional(),
  props: z.array(createPropInputSchema),
  variants: z.array(componentVariantSchema).optional(),
  scope: scopeSchema.optional(),
});

// ComponentProp (substituição de lista no patch — `required` obrigatório, 08§10).
const componentPropSchema = z.object({
  name: z.string().min(1),
  type: propTypeSchema,
  default: z.unknown().optional(),
  required: z.boolean(),
  description: z.string().optional(),
  validation: z.string().optional(),
});

const sourceEditSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('setJsxProp'),
    elementSelector: elementSelectorSchema,
    propName: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  }),
  z.object({
    op: z.literal('updateJsxText'),
    elementSelector: elementSelectorSchema,
    newText: z.string(),
  }),
  z.object({
    op: z.literal('insertJsxChild'),
    parentSelector: elementSelectorSchema,
    childSource: z.string().min(1),
  }),
  z.object({
    op: z.literal('removeJsxElement'),
    elementSelector: elementSelectorSchema,
  }),
]);

const componentUpdateInput = z.object({
  ...projectIdField,
  componentId: z.string().min(1),
  patch: z
    .object({
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      props: z.array(componentPropSchema).optional(),
      variants: z.array(componentVariantSchema).optional(),
    })
    .optional(),
  sourceEdits: z.array(sourceEditSchema).optional(),
});

const componentDeleteInput = z.object({
  ...projectIdField,
  componentId: z.string().min(1),
  confirm: z.boolean().optional(),
});

const componentPublishInput = z.object({
  ...projectIdField,
  componentId: z.string().min(1),
  version: z.string().min(1).optional(),
  changes: z.array(z.string().min(1)).optional(),
});

// ---- media --------------------------------------------------------------------

const mediaListInput = z.object({
  ...projectIdField,
  filter: z
    .object({
      type: assetTypeSchema.optional(),
      usageState: usageStateSchema.optional(),
      scope: scopeSchema.optional(),
    })
    .optional(),
});

const mediaReadInput = z.object({
  ...projectIdField,
  assetId: z.string().min(1),
  includeContent: z.boolean().optional(),
});

const mediaSearchInput = z.object({ ...projectIdField, query: z.string().min(1) });

const mediaUploadInput = z.object({
  ...projectIdField,
  fileName: z.string().min(1),
  contentBase64: z.string().min(1),
  targetPath: z.string().min(1).optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
});

const mediaUpdateInput = z.object({
  ...projectIdField,
  assetId: z.string().min(1),
  patch: z.object({
    name: z.string().min(1).optional(),
    altText: z.string().optional(),
    caption: z.string().optional(),
  }),
});

const mediaReplaceInput = z.object({
  ...projectIdField,
  assetId: z.string().min(1),
  fileName: z.string().min(1),
  contentBase64: z.string().min(1),
});

// 08§51: com referências conhecidas -> bloqueado ou exige confirm:true
// (refinamento no service; aqui confirm é opcional).
const mediaDeleteInput = z.object({
  ...projectIdField,
  assetId: z.string().min(1),
  confirm: z.boolean().optional(),
});

// ---- design -------------------------------------------------------------------

const designUpdateTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('token'), tokenRef: z.string().min(1) }),
  z.object({
    kind: z.literal('element'),
    file: z.string().min(1),
    elementSelector: elementSelectorSchema,
    propertySource: propertySourceSchema,
    classList: z.string().optional(),
    tokenRef: z.string().min(1).optional(),
    propName: z.string().min(1).optional(),
    explicitDetach: z.boolean().optional(),
  }),
]);

const designUpdateInputSchema = z.object({
  ...projectIdField,
  target: designUpdateTargetSchema,
  property: z.string().min(1),
  value: z.string(),
});

const designTokenReadInput = z.object({ ...projectIdField, tokenRef: z.string().min(1).optional() });
const designTokenUpdateInput = z.object({
  ...projectIdField,
  tokenRef: z.string().min(1),
  value: z.string(),
});
const themeUpdateInput = z.object({
  ...projectIdField,
  theme: z.string().min(1),
  mechanism: themeMechanismSchema.optional(),
  patch: z.record(z.string().min(1), z.string()),
});

// ---- responsive -----------------------------------------------------------------

// 09§24-26: viewports são um registry GLOBAL (condições, não dados do projeto);
// a tabela §3.5 omite projectId para viewport.create. Aceitamos projectId
// opcional (regra geral §3) sem exigir — o registry é cross-project.
const viewportCreateInput = z.object({
  projectId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dpr: z.number().positive().optional(),
  orientation: z.enum(['Portrait', 'Landscape']).optional(),
});

const responsiveTargetInput = z.object({
  ...projectIdField,
  route: z.string().min(1).optional(),
  viewportId: z.string().min(1),
});

const responsiveStressInput = z.object({
  ...projectIdField,
  route: z.string().min(1).optional(),
  viewportId: z.string().min(1),
  profile: stressProfileSchema,
});

const responsiveCompareInput = z.object({
  ...projectIdField,
  route: z.string().min(1).optional(),
  viewportIds: z.array(z.string().min(1)).min(1),
});

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

type M3Domain = 'editor' | 'component' | 'media' | 'design' | 'responsive';

function m3Contract(
  id: string,
  domain: M3Domain,
  description: string,
  inputSchema: z.ZodType<unknown>,
  risk: CapabilityContract['risk'],
  timeoutMs: number,
): CapabilityContract {
  return {
    id,
    version: 1,
    domain,
    description,
    inputSchema,
    resultSchema: z.unknown(),
    requiredPermission: id, // D9: permissão = capability id
    risk,
    sideEffects: risk !== 'SAFE',
    async: 'sync', // padrão M1/M2 (ver cabeçalho do módulo)
    timeoutMs,
  };
}

const SAFE_READ = { risk: 'SAFE', timeoutMs: M3_READ_TIMEOUT_MS } as const;
const MUTATION = { risk: 'DESTRUCTIVE', timeoutMs: M3_WRITE_TIMEOUT_MS } as const;
const LONG_SAFE = { risk: 'SAFE', timeoutMs: M3_LONG_TIMEOUT_MS } as const;

interface M3ContractSpec {
  id: string;
  domain: M3Domain;
  description: string;
  inputSchema: z.ZodType<unknown>;
  policy: { risk: CapabilityContract['risk']; timeoutMs: number };
}

/** Tabela única de contratos M3 (fonte única de verdade para o registro). */
export const M3_CONTRACT_SPECS: readonly M3ContractSpec[] = [
  // -- editor (10) — doc 07; M3-CONTRACTS §3.1 ---------------------------------
  { id: 'editor.source.open', domain: 'editor', description: 'Abre source real do projeto (content/encoding/hash/language/readOnly) — leitura SAFE', inputSchema: editorSourceOpenInput, policy: SAFE_READ },
  { id: 'editor.source.save', domain: 'editor', description: 'Save pipeline canônico 07§36 (Validate -> Conflict -> Adapter -> Persist -> Verify -> PI -> Saved); CONFLICT se expectedHash difere — DESTRUCTIVE: requer aprovação', inputSchema: editorSourceSaveInput, policy: MUTATION },
  { id: 'editor.selection.read', domain: 'editor', description: 'Selection Model (07§11) com confidence EXACT|HIGH_CONFIDENCE|PARTIAL|UNKNOWN via source mapping do intelligence (07§13-15) — leitura SAFE', inputSchema: editorSelectionReadInput, policy: SAFE_READ },
  { id: 'editor.change.create', domain: 'editor', description: 'Cria Change Object PENDENTE (07§31/D7); before capturado do disco real, nunca do chamador — SAFE (não toca source)', inputSchema: editorChangeCreateInput, policy: SAFE_READ },
  { id: 'editor.change.preview', domain: 'editor', description: 'Diff (07§42) de um change pendente SEM persistir — leitura SAFE', inputSchema: editorChangeIdInput, policy: SAFE_READ },
  { id: 'editor.change.apply', domain: 'editor', description: 'Aplica change pendente via save pipeline completo (07§36); expectedHash otimista opcional — DESTRUCTIVE: requer aprovação', inputSchema: editorChangeApplyInput, policy: MUTATION },
  { id: 'editor.change.reject', domain: 'editor', description: 'Descarta change pendente (não toca source) — SAFE', inputSchema: editorChangeIdInput, policy: SAFE_READ },
  { id: 'editor.change.list', domain: 'editor', description: 'Lista pending changes + estados (07§29-31) — leitura SAFE', inputSchema: projectOnlyInput, policy: SAFE_READ },
  { id: 'editor.change.undo', domain: 'editor', description: 'Reverte a última mudança Editor-managed aplicada (07§33); nunca toca mudança externa — DESTRUCTIVE: requer aprovação', inputSchema: projectOnlyInput, policy: MUTATION },
  { id: 'editor.change.redo', domain: 'editor', description: 'Reaplica se estado compatível (07§34); inseguro -> UNSUPPORTED — DESTRUCTIVE: requer aprovação', inputSchema: projectOnlyInput, policy: MUTATION },

  // -- component (6) — doc 08; M3-CONTRACTS §3.2 -------------------------------
  { id: 'component.list', domain: 'component', description: 'ComponentIdentity[] (08§6) com reconciliação explícita AST<->registry (M3 §8.6) — leitura SAFE', inputSchema: componentListInput, policy: SAFE_READ },
  { id: 'component.read', domain: 'component', description: 'Component Schema completo (08§9, contrato §7) com refresh da fonte — leitura SAFE', inputSchema: componentReadInput, policy: SAFE_READ },
  { id: 'component.create', domain: 'component', description: 'Cria componente respeitando convenções do projeto (08§21); fluxo Persist->Re-analyze->Validate->Register (08§20) — DESTRUCTIVE: requer aprovação', inputSchema: componentCreateInput, policy: MUTATION },
  { id: 'component.update', domain: 'component', description: 'Patch de schema e/ou sourceEdits AST com Diff retornado (08§22) — DESTRUCTIVE: requer aprovação', inputSchema: componentUpdateInput, policy: MUTATION },
  { id: 'component.delete', domain: 'component', description: 'Delete com impact analysis obrigatória (08§23); sem cascata silenciosa; confirm exigido com referências ativas — DESTRUCTIVE: requer aprovação', inputSchema: componentDeleteInput, policy: MUTATION },
  { id: 'component.publish', domain: 'component', description: 'Publish para escopo Library com validação 08§74 (Source Integrity, Dependencies, No Secret Leakage, No Private Refs, Schema, Compatibility) — DESTRUCTIVE: requer aprovação', inputSchema: componentPublishInput, policy: MUTATION },

  // -- media (7) — doc 08§41-58; M3-CONTRACTS §3.3 -----------------------------
  { id: 'media.list', domain: 'media', description: 'AssetIdentity[] (08§42) com usage state real (08§50; Unknown nunca = Unused) — leitura SAFE', inputSchema: mediaListInput, policy: SAFE_READ },
  { id: 'media.read', domain: 'media', description: 'Metadata completa do asset (08§82, sem secrets); binário só com includeContent:true e asset local — leitura SAFE', inputSchema: mediaReadInput, policy: SAFE_READ },
  { id: 'media.search', domain: 'media', description: 'Busca por nome/tipo/referência — leitura SAFE', inputSchema: mediaSearchInput, policy: SAFE_READ },
  { id: 'media.upload', domain: 'media', description: `Upload com validação real 08§45 (MIME por magic bytes, tamanho <= ${DEFAULT_MAX_UPLOAD_BYTES} bytes (25MB default), SVG seguro) + verificação pós-escrita (08§44) — DESTRUCTIVE: requer aprovação`, inputSchema: mediaUploadInput, policy: MUTATION },
  { id: 'media.update', domain: 'media', description: 'Patch de metadata (altText, caption, name de exibição — 08§82) com verificação do registry — DESTRUCTIVE: requer aprovação', inputSchema: mediaUpdateInput, policy: MUTATION },
  { id: 'media.replace', domain: 'media', description: 'Replace com reescrita de referências (08§48: resolve->find refs->validate->update refs->persist->re-analyze->verify) — DESTRUCTIVE: requer aprovação', inputSchema: mediaReplaceInput, policy: MUTATION },
  { id: 'media.delete', domain: 'media', description: 'Delete com inspeção de referências (08§51): com referências conhecidas -> bloqueado ou exige confirm:true; Unknown NUNCA tratado como Unused — DESTRUCTIVE: requer aprovação', inputSchema: mediaDeleteInput, policy: MUTATION },

  // -- design (6) — doc 09; M3-CONTRACTS §3.4 ----------------------------------
  { id: 'design.read', domain: 'design', description: 'Design Model: tokens por tipo (09§51), themes detectados (09§52), property sources — leitura SAFE', inputSchema: projectOnlyInput, policy: SAFE_READ },
  { id: 'design.update', domain: 'design', description: 'Update respeitando Property Source (09§7) e scope resolution (09§74-78); impact report antes de mutar selector compartilhado (09§79) — DESTRUCTIVE: requer aprovação', inputSchema: designUpdateInputSchema, policy: MUTATION },
  { id: 'design.token.read', domain: 'design', description: 'Tokens com origem exata (arquivo:linha) — leitura SAFE', inputSchema: designTokenReadInput, policy: SAFE_READ },
  { id: 'design.token.update', domain: 'design', description: 'Edita a FONTE do token (09§8) preservando representação (09§10); nunca desanexa sem intenção explícita (09§56) — DESTRUCTIVE: requer aprovação', inputSchema: designTokenUpdateInput, policy: MUTATION },
  { id: 'theme.read', domain: 'design', description: 'Temas Light/Dark/Brand/Custom + mecanismo de ativação detectado (09§53) — leitura SAFE', inputSchema: projectOnlyInput, policy: SAFE_READ },
  { id: 'theme.update', domain: 'design', description: 'Modifica o theme system existente (patch de variáveis declaradas); proibido introduzir tema paralelo (09§53) — DESTRUCTIVE: requer aprovação', inputSchema: themeUpdateInput, policy: MUTATION },

  // -- responsive (6) — doc 09§67; M3-CONTRACTS §3.5 (todas SAFE: nunca mutam source)
  { id: 'responsive.viewport.create', domain: 'responsive', description: 'Cria Viewport (09§24): dimensões arbitrárias obrigatórias (09§26); presets configuráveis (09§25); registry global — SAFE', inputSchema: viewportCreateInput, policy: SAFE_READ },
  { id: 'responsive.viewport.list', domain: 'responsive', description: 'Lista Viewports registrados (registry global Nexo-owned, 09§24-25) — SAFE (D19)', inputSchema: z.object({ projectId: z.string().min(1).optional() }).strict(), policy: SAFE_READ },
  { id: 'responsive.viewport.delete', domain: 'responsive', description: 'Remove Viewport do registry (Nexo-owned, reversível; nunca toca Source Project) — SAFE (D19)', inputSchema: z.object({ viewportId: z.string().min(1), projectId: z.string().min(1).optional() }).strict(), policy: SAFE_READ },
  { id: 'responsive.preview', domain: 'responsive', description: 'Estado do preview via runtime REAL do projeto (09§27; dev server de verdade) + URL — SAFE, timeout longo (startup real)', inputSchema: responsiveTargetInput, policy: LONG_SAFE },
  { id: 'responsive.diagnose', domain: 'responsive', description: 'Issues[] (09§34-36) com severity/certainty/evidence mensurável via browser real (09§46) — SAFE, operação LONGA (sync, timeout 180s — padrão M1/M2)', inputSchema: responsiveTargetInput, policy: LONG_SAFE },
  { id: 'responsive.stressTest', domain: 'responsive', description: 'Diagnóstico com conteúdo desafiador (09§32, perfis fixos D14); NUNCA persistido (09§33) — SAFE, operação LONGA (sync, timeout 180s)', inputSchema: responsiveStressInput, policy: LONG_SAFE },
  { id: 'responsive.compare', domain: 'responsive', description: 'Comparação multi-viewport (09§43; pixelmatch D14) — SAFE, operação LONGA (sync, timeout 180s)', inputSchema: responsiveCompareInput, policy: LONG_SAFE },
  { id: 'responsive.snapshot', domain: 'responsive', description: 'Snapshot (09§44) com prova de integridade do source; snapshots != Source Project — SAFE, operação LONGA (sync, timeout 180s)', inputSchema: responsiveTargetInput, policy: LONG_SAFE },
];

export function m3Contracts(): CapabilityContract[] {
  return M3_CONTRACT_SPECS.map((s) =>
    m3Contract(s.id, s.domain, s.description, s.inputSchema, s.policy.risk, s.policy.timeoutMs),
  );
}

// ---------------------------------------------------------------------------
// Handlers (delegação direta ao service; erros NexoError propagados sem embrulho)
// ---------------------------------------------------------------------------

/** Pré-validação de projeto para os handlers editor.* (o EditorService não consulta storage). */
function getProject(
  storage: Storage,
  projectId: string,
  ctx: ExecutionContext,
): Result<ProjectRegistration> {
  const project = storage.repos.projects.getById(projectId);
  if (project === null) {
    return err(
      nexoError('NOT_FOUND', `Project not registered: '${projectId}'`, {
        operationId: ctx.operationId,
        resource: projectId,
      }),
    );
  }
  return ok(project);
}

type M3Handler = (input: unknown, ctx: ExecutionContext) => Promise<Result<unknown>>;

function editorHandlers(services: M3Services, storage: Storage): Map<string, M3Handler> {
  const { editor } = services;
  const handlers = new Map<string, M3Handler>();

  handlers.set('editor.source.open', async (input, ctx) => {
    const { projectId, filePath } = editorSourceOpenInput.parse(input);
    const found = getProject(storage, projectId, ctx);
    if (!found.ok) return found;
    return editor.openSource(projectId, filePath);
  });

  handlers.set('editor.source.save', async (input, ctx) => {
    const parsed = editorSourceSaveInput.parse(input);
    const found = getProject(storage, parsed.projectId, ctx);
    if (!found.ok) return found;
    return editor.saveSource(
      parsed.projectId,
      parsed.filePath,
      parsed.content,
      parsed.expectedHash,
    );
  });

  handlers.set('editor.selection.read', async (input, ctx) => {
    const parsed = editorSelectionReadInput.parse(input);
    const found = getProject(storage, parsed.projectId, ctx);
    if (!found.ok) return found;
    return editor.readSelection(
      parsed.projectId,
      parsed.route,
      parsed.nodeRef,
    );
  });

  handlers.set('editor.change.create', async (input, ctx) => {
    const parsed = editorChangeCreateInput.parse(input);
    const found = getProject(storage, parsed.projectId, ctx);
    if (!found.ok) return found;
    return editor.createChange(parsed.projectId, parsed.change);
  });

  handlers.set('editor.change.preview', async (input, ctx) => {
    const parsed = editorChangeIdInput.parse(input);
    const found = getProject(storage, parsed.projectId, ctx);
    if (!found.ok) return found;
    return editor.previewChange(parsed.projectId, parsed.changeId);
  });

  handlers.set('editor.change.apply', async (input, ctx) => {
    const parsed = editorChangeApplyInput.parse(input);
    const found = getProject(storage, parsed.projectId, ctx);
    if (!found.ok) return found;
    return editor.applyChange(parsed.projectId, parsed.changeId, parsed.expectedHash);
  });

  handlers.set('editor.change.reject', async (input, ctx) => {
    const parsed = editorChangeIdInput.parse(input);
    const found = getProject(storage, parsed.projectId, ctx);
    if (!found.ok) return found;
    return editor.rejectChange(parsed.projectId, parsed.changeId);
  });

  handlers.set('editor.change.list', async (input, ctx) => {
    const { projectId } = projectOnlyInput.parse(input);
    const found = getProject(storage, projectId, ctx);
    if (!found.ok) return found;
    return ok(editor.listChanges(projectId));
  });

  handlers.set('editor.change.undo', async (input, ctx) => {
    const { projectId } = projectOnlyInput.parse(input);
    const found = getProject(storage, projectId, ctx);
    if (!found.ok) return found;
    return editor.undo(projectId);
  });

  handlers.set('editor.change.redo', async (input, ctx) => {
    const { projectId } = projectOnlyInput.parse(input);
    const found = getProject(storage, projectId, ctx);
    if (!found.ok) return found;
    return editor.redo(projectId);
  });

  return handlers;
}

function componentHandlers(services: M3Services): Map<string, M3Handler> {
  const { components } = services;
  const handlers = new Map<string, M3Handler>();

  handlers.set('component.list', async (input, ctx) =>
    components.list(ctx, componentListInput.parse(input)),
  );
  handlers.set('component.read', async (input, ctx) =>
    components.read(ctx, componentReadInput.parse(input)),
  );
  handlers.set('component.create', async (input, ctx) =>
    components.create(ctx, componentCreateInput.parse(input)),
  );
  handlers.set('component.update', async (input, ctx) =>
    components.update(ctx, componentUpdateInput.parse(input)),
  );
  handlers.set('component.delete', async (input, ctx) =>
    components.delete(ctx, componentDeleteInput.parse(input)),
  );
  handlers.set('component.publish', async (input, ctx) =>
    components.publish(ctx, componentPublishInput.parse(input)),
  );
  return handlers;
}

function mediaHandlers(services: M3Services): Map<string, M3Handler> {
  const { media } = services;
  const handlers = new Map<string, M3Handler>();

  handlers.set('media.list', async (input, ctx) => media.list(ctx, mediaListInput.parse(input)));
  handlers.set('media.read', async (input, ctx) => media.read(ctx, mediaReadInput.parse(input)));
  handlers.set('media.search', async (input, ctx) => media.search(ctx, mediaSearchInput.parse(input)));
  handlers.set('media.upload', async (input, ctx) => media.upload(ctx, mediaUploadInput.parse(input)));
  handlers.set('media.update', async (input, ctx) => media.update(ctx, mediaUpdateInput.parse(input)));
  handlers.set('media.replace', async (input, ctx) => media.replace(ctx, mediaReplaceInput.parse(input)));
  handlers.set('media.delete', async (input, ctx) => media.delete(ctx, mediaDeleteInput.parse(input)));
  return handlers;
}

function designHandlers(services: M3Services): Map<string, M3Handler> {
  const { design } = services;
  const handlers = new Map<string, M3Handler>();

  handlers.set('design.read', async (input, ctx) => design.read(ctx, projectOnlyInput.parse(input)));
  handlers.set('design.update', async (input, ctx) => design.update(ctx, designUpdateInputSchema.parse(input)));
  handlers.set('design.token.read', async (input, ctx) => design.tokenRead(ctx, designTokenReadInput.parse(input)));
  handlers.set('design.token.update', async (input, ctx) => design.tokenUpdate(ctx, designTokenUpdateInput.parse(input)));
  handlers.set('theme.read', async (input, ctx) => design.themeRead(ctx, projectOnlyInput.parse(input)));
  handlers.set('theme.update', async (input, ctx) => design.themeUpdate(ctx, themeUpdateInput.parse(input)));
  return handlers;
}

function responsiveHandlers(services: M3Services): Map<string, M3Handler> {
  const { responsive } = services;
  const handlers = new Map<string, M3Handler>();

  handlers.set('responsive.viewport.create', async (input) => {
    const parsed = viewportCreateInput.parse(input);
    // projectId (opcional) não faz parte do ViewportCreateInput — registry global.
    return responsive.viewportCreate({
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      width: parsed.width,
      height: parsed.height,
      ...(parsed.dpr !== undefined ? { dpr: parsed.dpr } : {}),
      ...(parsed.orientation !== undefined ? { orientation: parsed.orientation } : {}),
    });
  });
  handlers.set('responsive.viewport.list', async () => ok(responsive.viewportList()));
  handlers.set('responsive.viewport.delete', async (input) => {
    const parsed = z
      .object({ viewportId: z.string().min(1), projectId: z.string().min(1).optional() })
      .strict()
      .parse(input);
    return responsive.viewportDelete(parsed.viewportId);
  });
  handlers.set('responsive.preview', async (input) =>
    responsive.preview(responsiveTargetInput.parse(input)),
  );
  handlers.set('responsive.diagnose', async (input) =>
    responsive.diagnose(responsiveTargetInput.parse(input)),
  );
  handlers.set('responsive.stressTest', async (input) =>
    responsive.stressTest(responsiveStressInput.parse(input)),
  );
  handlers.set('responsive.compare', async (input) =>
    responsive.compare(responsiveCompareInput.parse(input)),
  );
  handlers.set('responsive.snapshot', async (input) =>
    responsive.snapshot(responsiveTargetInput.parse(input)),
  );
  return handlers;
}

/**
 * Registro das 35 capabilities M3 (bootstrap). Tabela derivada de
 * M3_CONTRACT_SPECS + mapa de handlers — divergência id-sem-handler vira
 * erro de boot (fail-fast, nunca registro parcial silencioso).
 */
export function m3CapabilityRegistrations(
  services: M3Services,
  storage: Storage,
): { contract: CapabilityContract; handler: M3Handler }[] {
  const handlers = new Map<string, M3Handler>([
    ...editorHandlers(services, storage),
    ...componentHandlers(services),
    ...mediaHandlers(services),
    ...designHandlers(services),
    ...responsiveHandlers(services),
  ]);
  return M3_CONTRACT_SPECS.map((spec) => {
    const handler = handlers.get(spec.id);
    if (handler === undefined) {
      throw new Error(`m3 capability without handler: '${spec.id}' (registration bug)`);
    }
    return {
      contract: m3Contract(spec.id, spec.domain, spec.description, spec.inputSchema, spec.policy.risk, spec.policy.timeoutMs),
      handler,
    };
  });
}
