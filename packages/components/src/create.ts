/**
 * Component Creation Flow (doc 08§20 — fluxo canonico):
 *   Request -> Resolve Project (service) -> Resolve Adapter Set (stack React —
 *   D6) -> Validate Definition -> Check Dependencies/Duplicata (08§79) ->
 *   Inspecionar Convencoes (08§21) -> Generate Source (adapter — NUNCA source
 *   framework-especifico gerado aqui, M3-CONTRACTS §2) -> Persist (scope
 *   guard) -> Re-analyze (re-parse REAL do arquivo escrito) -> Validate ->
 *   Register.
 *
 * Regras duras:
 *  - Stack nao-React => UNSUPPORTED honesto (D6; 08§90 item 24).
 *  - Duplicata de nome (mesmo escopo OU Library global) => CONFLICT (08§79).
 *  - 'Created' SOMENTE apos persistencia verificada + re-parse + registro
 *    (No Fake Success, M3 §8.4).
 *  - Limitacao documentada do adapter Wave 2a: o template gera named export
 *    e nao emite imports; prop Slot exigiria `import type { ReactNode }` —
 *    recusado com InvalidDefinition (nunca string-patching de source gerado).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ComponentPropSpec, CreateComponentInput as TransformerInput, DetectedTechnology, ReactTsxTransformer } from '@nexo/adapters';
import { err, ok, type Result } from '@nexo/shared';

import { inspectConventions, type ProjectConventions } from './conventions.js';
import { analyzeComponentFile, detectNativeComponents } from './detect.js';
import { componentError } from './errors.js';
import { guardPath, type ProjectFs } from './project-fs.js';
import type { ComponentRegistry } from './registry.js';
import type { ComponentSchema, ComponentScope, ComponentVariant, PropType } from './types.js';

export interface CreatePropInput {
  name: string;
  type: PropType;
  required?: boolean;
  /** Somente literais JSON (string/number/boolean); exige required:false. */
  default?: unknown;
  description?: string;
  validation?: string;
}

export interface CreateComponentInput {
  name: string;
  description?: string;
  props?: CreatePropInput[];
  variants?: ComponentVariant[];
  /** M3: somente 'Project' (08§20 e um fluxo de projeto). Demais => UNSUPPORTED. */
  scope?: ComponentScope;
}

export interface CreateComponentOutcome {
  componentId: string;
  filesChanged: string[];
  diagnostics: string[];
  status: 'Created';
  conventions: ProjectConventions;
}

export interface CreateDeps {
  fsCtx: ProjectFs;
  registry: ComponentRegistry;
  projectId: string;
  /** Tecnologias detectadas pela Project Intelligence (scanner M1). */
  technologies: readonly DetectedTechnology[];
  transformer: ReactTsxTransformer;
}

const NAME_RE = /^[A-Z][A-Za-z0-9]*$/;
const PROP_NAME_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Mapeamento PropType -> tipo TS (documentado): tipos semanticos sem
 * representacao TS distinta (URL/Color/Image/Video/RichText) viram `string`
 * e a semantica fica no SCHEMA (type original preservado). Enum com
 * validation 'oneOf:a|b' gera uniao de literais; sem valores => 'string'
 * com diagnostico. Slot => null (ver header: template nao emite import).
 */
function tsTypeFor(prop: CreatePropInput, diagnostics: string[]): string | null {
  switch (prop.type) {
    case 'String':
    case 'URL':
    case 'Color':
    case 'Image':
    case 'Video':
    case 'RichText':
    case 'ComponentReference':
      return 'string';
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Array':
      return 'unknown[]';
    case 'Object':
      return 'Record<string, unknown>';
    case 'Enum': {
      const m = /^oneOf:(.+)$/.exec(prop.validation ?? '');
      if (m !== null && m[1] !== undefined && m[1] !== '') {
        const values = m[1].split('|').filter((v) => v !== '');
        if (values.length > 0) return values.map((v) => JSON.stringify(v)).join(' | ');
      }
      diagnostics.push(
        `prop '${prop.name}': Enum sem validation 'oneOf:...' — tipo TS gerado como 'string' (valores preservados no schema)`,
      );
      return 'string';
    }
    case 'Slot':
      return null;
  }
}

function validateDefinition(
  input: CreateComponentInput,
): { props: ComponentPropSpec[]; diagnostics: string[] } | { error: ReturnType<typeof componentError> } {
  const diagnostics: string[] = [];
  if (!NAME_RE.test(input.name)) {
    return {
      error: componentError(
        'InvalidDefinition',
        `Nome de componente invalido (PascalCase /^[A-Z][A-Za-z0-9]*$/): '${input.name}'`,
        { resource: input.name },
      ),
    };
  }
  const specs: ComponentPropSpec[] = [];
  const seen = new Set<string>();
  for (const prop of input.props ?? []) {
    if (!PROP_NAME_RE.test(prop.name)) {
      return {
        error: componentError('InvalidDefinition', `Nome de prop invalido: '${prop.name}'`, {
          resource: input.name,
        }),
      };
    }
    if (seen.has(prop.name)) {
      return {
        error: componentError('InvalidDefinition', `Prop duplicado na definicao: '${prop.name}'`, {
          resource: input.name,
        }),
      };
    }
    seen.add(prop.name);
    const required = prop.required ?? true;
    if (prop.default !== undefined && required) {
      return {
        error: componentError(
          'InvalidDefinition',
          `Prop '${prop.name}': default exige required:false (validacao antes de mutar — 08§12)`,
          { resource: input.name },
        ),
      };
    }
    if (
      prop.default !== undefined &&
      !['string', 'number', 'boolean'].includes(typeof prop.default)
    ) {
      return {
        error: componentError(
          'InvalidDefinition',
          `Prop '${prop.name}': default nao-literal nao e determinavel — somente string/number/boolean`,
          { resource: input.name },
        ),
      };
    }
    const tsType = tsTypeFor(prop, diagnostics);
    if (tsType === null) {
      return {
        error: componentError(
          'InvalidDefinition',
          `Prop '${prop.name}' (Slot): o template do adapter Wave 2a nao emite imports (ReactNode); crie o componente sem Slot e componha via insertJsxChild, ou adicione suporte no adapter (limitacao documentada, nunca string-patch)`,
          { resource: input.name },
        ),
      };
    }
    specs.push({
      name: prop.name,
      type: tsType,
      required,
      ...(prop.default !== undefined
        ? { defaultValue: typeof prop.default === 'string' ? JSON.stringify(prop.default) : String(prop.default) }
        : {}),
      ...(prop.description !== undefined ? { description: prop.description } : {}),
    });
  }
  for (const variant of input.variants ?? []) {
    if (!PROP_NAME_RE.test(variant.name) || variant.values.length === 0) {
      return {
        error: componentError(
          'InvalidDefinition',
          `Variant invalida: '${variant.name}' (nome identificador + values nao vazio)`,
          { resource: input.name },
        ),
      };
    }
  }
  return { props: specs, diagnostics };
}

/** Validacao estrutural do schema pos-re-analise (08§73: Schema + Source). */
function validateSchema(schema: ComponentSchema): string | null {
  if (!NAME_RE.test(schema.identity.name)) return 'nome fora de PascalCase';
  for (const p of schema.props) {
    if (!PROP_NAME_RE.test(p.name)) return `prop '${p.name}' com nome invalido`;
  }
  return null;
}

export async function createComponent(
  deps: CreateDeps,
  input: CreateComponentInput,
): Promise<Result<CreateComponentOutcome>> {
  const diagnostics: string[] = [];

  // -- Resolve Adapter Set: stack first-class React+TSX (D6) -----------------
  const scope = input.scope ?? 'Project';
  if (scope !== 'Project') {
    return err(
      componentError(
        'UnsupportedScope',
        `component.create suporta scope 'Project' nesta wave (08§20 e fluxo de projeto); recebido '${scope}'`,
        { resource: input.name },
      ),
    );
  }
  const isReact = deps.technologies.some((t) => t.technology === 'react');
  if (!isReact) {
    return err(
      componentError(
        'UnsupportedStack',
        'component.create requer projeto React+TSX (stack first-class M3 — D6); stack atual nao tem React detectado',
        { resource: input.name, details: { detected: deps.technologies.map((t) => t.technology) } },
      ),
    );
  }

  // -- Validate Definition (08§12: antes de qualquer mutacao) ----------------
  const validated = validateDefinition(input);
  if ('error' in validated) return err(validated.error);
  diagnostics.push(...validated.diagnostics);

  // -- Check duplicata (08§79): detecta componentes existentes e confere -----
  const detection = await detectNativeComponents(deps.fsCtx.rootAbs);
  if (!detection.ok) return err(detection.error);
  const nameTaken =
    detection.value.components.some((c) => c.name === input.name) ||
    deps.registry.findByName(deps.projectId, 'Project', input.name) !== null ||
    deps.registry.findByName(null, 'Library', input.name) !== null;
  if (nameTaken) {
    return err(
      componentError(
        'DuplicateComponent',
        `Ja existe componente '${input.name}' no escopo Project ou Library (08§79 — reuse em vez de duplicar)`,
        { resource: input.name },
      ),
    );
  }

  // -- Convencoes do projeto (08§21) -----------------------------------------
  const conventions = inspectConventions(detection.value, deps.technologies);
  diagnostics.push(...conventions.evidence.map((e) => `convention: ${e}`));
  if (conventions.exportStyle === 'default') {
    diagnostics.push(
      'convention: projeto usa default exports, mas o template do adapter Wave 2a gera named export (limitacao documentada — schema registra a convencao detectada)',
    );
  }

  // -- Generate Source (adapter — NUNCA geracao local de source React) -------
  const genInput: TransformerInput = { name: input.name, props: validated.props };
  const generated = deps.transformer.createComponentSource(genInput);
  if (!generated.ok || generated.newContent === undefined) {
    return err(
      componentError('TransformFailed', 'createComponentSource falhou — nada foi persistido', {
        resource: input.name,
        details: { transformDiagnostics: generated.diagnostics },
      }),
    );
  }
  const content = generated.newContent;

  const targetRel = `${conventions.targetDir}/${input.name}${conventions.fileExtension}`;
  if (deps.registry.findBySourcePath(deps.projectId, targetRel) !== null) {
    return err(
      componentError('DuplicateComponent', `Arquivo de componente ja registrado: '${targetRel}'`, {
        resource: targetRel,
      }),
    );
  }
  const guarded = await guardPath(deps.fsCtx, targetRel);
  if (!guarded.ok) return err(guarded.error);

  // -- Persist (scope guard; overwrite NUNCA implicito) ----------------------
  try {
    await fs.mkdir(path.dirname(guarded.value), { recursive: true });
    await fs.writeFile(guarded.value, content, { encoding: 'utf8', flag: 'wx' });
  } catch (e) {
    const cause = e as NodeJS.ErrnoException;
    if (cause.code === 'EEXIST') {
      return err(
        componentError('DuplicateComponent', `Arquivo ja existe no projeto: '${targetRel}'`, {
          resource: targetRel,
        }),
      );
    }
    return err(
      componentError('PersistenceFailed', `Falha ao persistir '${targetRel}': ${cause.message}`, {
        resource: targetRel,
        details: { errno: cause.code },
      }),
    );
  }
  diagnostics.push(`persisted '${targetRel}' (${content.length} bytes)`);

  // -- Read/Verify + Re-analyze (re-parse REAL do arquivo escrito — 08§20) ---
  let written: string;
  try {
    written = await fs.readFile(guarded.value, 'utf8');
  } catch (e) {
    return err(
      componentError('VerificationFailed', `Nao foi possivel reler '${targetRel}' apos escrita`, {
        resource: targetRel,
        details: { cause: (e as Error).message },
      }),
    );
  }
  if (written !== content) {
    return err(
      componentError('VerificationFailed', `Conteudo relido difere do persistido em '${targetRel}'`, {
        resource: targetRel,
      }),
    );
  }
  const reanalyzed = analyzeComponentFile(targetRel, written);
  const found = reanalyzed.components.find((c) => c.name === input.name);
  if (!reanalyzed.parseOk || found === undefined) {
    return err(
      componentError(
        'VerificationFailed',
        `Re-analise pos-persist nao encontrou o componente '${input.name}' exportado em '${targetRel}' (arquivo NAO registrado)`,
        { resource: targetRel },
      ),
    );
  }
  diagnostics.push(
    `re-analyze: '${input.name}' exportado com ${found.props.length} prop(s), confidence ${found.propsConfidence}`,
  );

  // -- Validate (schema construido da FONTE re-analisada, nao do request) ----
  const now = new Date().toISOString();
  const componentId = crypto.randomUUID();
  const schema: ComponentSchema = {
    identity: {
      id: componentId,
      name: input.name,
      scope: 'Project',
      source: { kind: 'GeneratedSource', generator: '@nexo/components:component.create', path: targetRel },
      version: null,
    },
    props: found.props,
    variants: input.variants ?? [],
    slots: found.slots,
    events: found.events,
    assets: found.assets,
    styles: [],
    responsiveRules: [],
    metadata: {
      class: 'GeneratedProjectComponent',
      ...(input.description !== undefined ? { description: input.description } : {}),
      conventions: {
        source: conventions.source,
        targetDir: conventions.targetDir,
        exportStyle: conventions.exportStyle,
        propsPattern: conventions.propsPattern,
        styling: conventions.styling,
      },
      createdAt: now,
      updatedAt: now,
    },
  };
  const schemaProblem = validateSchema(schema);
  if (schemaProblem !== null) {
    return err(
      componentError('VerificationFailed', `Schema pos-re-analise invalido: ${schemaProblem}`, {
        resource: targetRel,
      }),
    );
  }

  // -- Register (registry via storage; verificado por re-leitura) ------------
  deps.registry.upsert(deps.projectId, schema);
  const persisted = deps.registry.getById(componentId);
  if (persisted === null || persisted.schema.identity.name !== input.name) {
    return err(
      componentError('VerificationFailed', 'Verificacao do registry falhou apos create', {
        resource: componentId,
      }),
    );
  }

  return ok({
    componentId,
    filesChanged: [targetRel],
    diagnostics,
    status: 'Created',
    conventions,
  });
}
