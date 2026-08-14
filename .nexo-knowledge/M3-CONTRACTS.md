# NEXO CMS — M3 CONTRACTS (FROZEN)
> Wave 1 do M3. Fontes: doc 07 (EDITOR), doc 08 (COMPONENT AND MEDIA ENGINE),
> doc 09 (DESIGN AND RESPONSIVE LAB), CAPABILITY-MAP.md, INVARIANTS.md,
> briefs de Wave 0. Nada aqui contradiz os docs; lacunas marcadas nos docs
> foram decididas em OPEN-QUESTIONS.md (D6+). Proibido fork privado de contrato.

## 1. Escopo M3 (DEPENDENCY-GRAPH §M3 + Feature Priorities P1)
Editor core (save pipeline real, source mapping) + Components/Media Engine +
Design/Responsive Lab + UI `apps/cms` (React+Vite+Tailwind+Lucide) como
consumidor puro do Control Plane. Stack first-class de M3 (fixture e adapter
write-path): **React+TSX + Tailwind + Plain CSS**. Demais stacks detectadas
reportam PARTIAL/UNSUPPORTED honestamente (Inv. 6/25) — nunca fake support.

## 2. Novos pacotes e fronteiras

| Pacote | Dono de | Pode depender de | NUNCA faz |
|---|---|---|---|
| `packages/editor` | Change Object, ChangeManager, save pipeline, undo/redo de edição, source open/save, seleção | shared, core, security, runtime, storage, intelligence, adapters | parser de framework próprio; shadow copy autoritativa; Git; processos de SO diretos |
| `packages/components` | Component Schema, Registry, detection (via PI), create/update/delete/publish | shared, core, security, runtime, storage, intelligence, adapters | scanner semântico paralelo; geração de source framework-específica (delega ao adapter) |
| `packages/media` | Asset registry, upload/validate (MIME real), replace (atualiza referências), delete (checa referências), metadata | shared, core, security, runtime, storage, intelligence | processamento de imagem (M3: fora — ver D13); deletar recurso remoto |
| `packages/design` | Design tokens read/update, themes, property source identification | shared, core, security, runtime, storage, intelligence, adapters | criar design system paralela; converter formatos de cor por preferência |
| `packages/responsive` | Viewport registry, diagnose/stressTest/compare/snapshot via browser real | shared, core, security, runtime, storage, intelligence | mutar source (fixes vão por editor/design capabilities); persistir stress content |
| `apps/cms` | UI consumidora (React+Vite+Tailwind+Lucide) | HTTP Control Plane apenas | lógica de domínio; fetch fora do client tipado; alert()/confirm()/prompt(); emojis |

Extensões em pacotes existentes:
- `packages/adapters`: write-path M3 — React/TSX source transformation via AST
  (TypeScript compiler API — ver D8); Styling Adapter Tailwind (ler/escrever
  config + utilities) e Plain CSS (CSS Variables). Contrato novo:
  `transform(request): TransformResult | UNSUPPORTED`.
- `packages/intelligence`: source mapping (componente/elemento →
  file:line:col, confidence EXACT|HIGH_CONFIDENCE|PARTIAL|UNKNOWN) e busca de
  referências de assets (texto/AST, confidence marcada).

## 3. Capabilities M3 (35) — todas via `POST /v1/capabilities/:id/invoke` (D4)

Permissão = capability id (padrão D3/D9). Risco: leituras SAFE; mutações
DESTRUCTIVE (REQUIRE_APPROVAL por policy, igual M2). Input sempre inclui
`projectId`. Erros: NexoError estável + `details` + `nextAction`.

### 3.1 Editor (dono: packages/editor) — doc 07
| Capability | Risco | Contrato (resumo) |
|---|---|---|
| `editor.source.open` | SAFE | in `{projectId, filePath}` → out `{content, encoding, hash, language, readOnly}` |
| `editor.source.save` | DESTRUCTIVE | in `{projectId, filePath, content, expectedHash?}` → pipeline §4; out `{saved, hash, verified, diagnostics[]}`; CONFLICT se hash difere |
| `editor.selection.read` | SAFE | in `{projectId, route, nodeRef}` → out Selection Model (07§11) com `confidence` |
| `editor.change.create` | SAFE | in `{projectId, change: ChangeInput}` → Change Object pendente (07§31) |
| `editor.change.preview` | SAFE | in `{projectId, changeId}` → Diff (07§42) sem persistir |
| `editor.change.apply` | DESTRUCTIVE | in `{projectId, changeId, expectedHash?}` → save pipeline completo |
| `editor.change.reject` | SAFE | in `{projectId, changeId}` → descarta pendente (não toca source) |
| `editor.change.list` | SAFE | in `{projectId}` → pending changes + estados |
| `editor.change.undo` | DESTRUCTIVE | reverte última mudança Editor-managed aplicada (07§33); nunca toca mudança externa não relacionada |
| `editor.change.redo` | DESTRUCTIVE | reaplica se estado compatível (07§34); inseguro → UNSUPPORTED |

### 3.2 Components (dono: packages/components) — doc 08§33
| Capability | Risco | Contrato (resumo) |
|---|---|---|
| `component.list` | SAFE | in `{projectId, scope?}` → ComponentIdentity[] (08§6) |
| `component.read` | SAFE | in `{projectId, componentId}` → Component Schema completo (08§9) |
| `component.create` | DESTRUCTIVE | in `{name, description?, props[], variants?, scope}` → `{componentId, filesChanged[], diagnostics[], status}` (08§34); convenções do projeto inspecionadas (08§21); fluxo §20 Persist→Re-analyze→Validate→Register |
| `component.update` | DESTRUCTIVE | in `{componentId, patch}` → Diff retornado (08§22) |
| `component.delete` | DESTRUCTIVE | impact analysis obrigatória (08§23: References/Routes/Pages/Components/Assets/Exports/Tests); sem cascata silenciosa |
| `component.publish` | DESTRUCTIVE | pipeline 08§25 com validação §74 (Source Integrity, Dependency Resolution, No Secret Leakage, No Private Refs, Schema Validity, Compatibility); escopo Library |

### 3.3 Media (dono: packages/media) — doc 08§57 + CM
| Capability | Risco | Contrato (resumo) |
|---|---|---|
| `media.list` | SAFE | in `{projectId, filter?}` → AssetIdentity[] (08§42) com usage state (08§50) |
| `media.read` | SAFE | in `{projectId, assetId}` → metadata completa (08§82, sem secrets); binário só se `includeContent:true` |
| `media.search` | SAFE | in `{projectId, query}` → matches por nome/tipo/referência |
| `media.upload` | DESTRUCTIVE | in `{fileName, contentBase64, targetPath?}` → fluxo 08§44; validação 08§45 (MIME real, não extensão); path por PI (08§53) |
| `media.update` | DESTRUCTIVE | in `{assetId, metadata patch}` (alt text, caption, name — 08§82) |
| `media.replace` | DESTRUCTIVE | fluxo 08§48: resolve→find refs→validate→update refs→persist→re-analyze→verify |
| `media.delete` | DESTRUCTIVE | 08§51: com referências conhecidas → bloqueado ou exige `confirm:true`; `Unknown` NUNCA tratado como `Unused` |

### 3.4 Design (dono: packages/design) — doc 09§66
| Capability | Risco | Contrato (resumo) |
|---|---|---|
| `design.read` | SAFE | in `{projectId}` → Design Model: tokens por tipo (09§51), themes detectados (09§52), property sources |
| `design.update` | DESTRUCTIVE | in `{target, property, value}` → respeita Property Source (09§7) e scope resolution (09§74-78); impact report antes de mutar selector compartilhado (09§79) |
| `design.token.read` | SAFE | in `{projectId, tokenRef?}` → tokens com origem exata (arquivo:linha) |
| `design.token.update` | DESTRUCTIVE | in `{tokenRef, value}` → edita a FONTE do token (09§8), preserva representação (09§10); nunca desanexa sem intenção explícita (09§56) |
| `theme.read` | SAFE | in `{projectId}` → temas `Light/Dark/Brand/Custom` + mecanismo de ativação detectado (09§53) |
| `theme.update` | DESTRUCTIVE | in `{theme, patch}` → modifica theme system existente; proibido introduzir tema paralelo (09§53) |

### 3.5 Responsive (dono: packages/responsive) — doc 09§67
| Capability | Risco | Contrato (resumo) |
|---|---|---|
| `responsive.viewport.create` | SAFE | in `{name?, width, height, dpr?, orientation?}` → Viewport (09§24); presets configuráveis (09§25); dimensões arbitrárias obrigatórias (09§26) |
| `responsive.viewport.list` | SAFE | (D19) lista viewports do registry global Nexo-owned |
| `responsive.viewport.delete` | SAFE | (D19) remove viewport do registry (reversível; nunca toca Source Project) |
| `responsive.preview` | SAFE | in `{projectId, route?, viewportId}` → estado do preview via runtime real (09§27) + URL |
| `responsive.diagnose` | SAFE | in `{projectId, route?, viewportId}` → Issues[] (09§34-36) com severity, certainty, evidence; browser real (09§46) |
| `responsive.stressTest` | SAFE | in `{projectId, viewportId, profile}` → diagnóstico com conteúdo desafiador (09§32); NUNCA persistido (09§33) |
| `responsive.compare` | SAFE | in `{projectId, viewportIds[]}` → comparação multi-viewport (09§43) |
| `responsive.snapshot` | SAFE | in `{projectId, route?, viewportId}` → Snapshot (09§44); snapshots ≠ Source Project |

## 4. Save Pipeline (07§36 — canônico, obrigatório)
```
Pending Changes → Validate → Check Conflict → Adapter Transformation (se requerida)
→ Filesystem Persistence → Read/Verify → Update Project Intelligence
→ Update Preview → Mark Saved
```
- Estados de save (07§29): `Saved | Unsaved | Saving | Save Failed | Conflict`.
- Sucesso = `Source Project + Expected Modification + Persistence Confirmed` (07§79).
- Falha → `Save Failed`, pending recuperável, NUNCA vira `Saved` (07§37).
- Conflito (07§38): detecção via hash baseline + mtime; resoluções
  `Keep Local | Keep External | Compare | Reload | Cancel`; `Merge` = UNSUPPORTED
  explícito (D12 — OQ #5).
- Verificação pós-escrita (07§41): File Exists, Content Updated, Parser Succeeds,
  Project Model Updated; profundidade proporcional (Inv. 28).

## 5. Source Mapping (07§13-15)
- Cadeia `Rendered Element ↔ Project Node ↔ Source File ↔ Line/Column/Structure`.
- Confidence: `EXACT | HIGH_CONFIDENCE | PARTIAL | UNKNOWN` — mapping incerto
  NUNCA apresentado como exato (07§12).
- Falha → `Unknown` + alternativas seguras (07§15); proibido adivinhar.
- Implementação: intelligence (AST via TS compiler para TSX) + adapters;
  editor consome, não implementa parser (07§74).

## 6. Change Object (07§31 — tipagem concreta = D7)
```ts
interface ChangeObject {
  id: string; projectId: string;
  files: string[];                      // relativos ao Project Root
  operation: 'modify' | 'create' | 'delete' | 'rename';
  source: 'visual' | 'code' | 'ai' | 'external' | 'generated';
  origin: 'Human' | 'AI' | 'Visual Editor' | 'Code Editor' | 'External Change';
  before: Record<string, string | null>;  // filePath -> conteúdo (null = não existia)
  after: Record<string, string | null>;   // filePath -> conteúdo (null = removido)
  state: 'PENDING' | 'APPLIED' | 'REJECTED' | 'FAILED' | 'REVERTED';
  createdAt: string; appliedAt: string | null;
}
```

## 7. Component Schema (08§9 — concreto)
```ts
interface ComponentSchema {
  identity: { id: string; name: string; scope: 'Project'|'Workspace'|'Library';
    source: ComponentSource; version: string | null };       // 08§6/§8
  props: Array<{ name: string; type: PropType; default?: unknown;
    required: boolean; description?: string; validation?: string }>; // 08§10-12
  variants: Array<{ name: string; values: string[] }>;       // 08§13
  slots: Array<{ name: string; kind: 'FixedProp'|'ComposableSlot' }>; // 08§14
  events: string[]; assets: string[]; styles: PropertySource[];
  responsiveRules: unknown[]; metadata: Record<string, unknown>;
}
type PropType = 'String'|'Number'|'Boolean'|'Image'|'Video'|'URL'|'Color'
  |'RichText'|'Enum'|'Array'|'Object'|'ComponentReference'|'Slot';
```

## 8. Regras transversais (não negociáveis)
1. UI é consumidora pura — mesma capability para humano, CLI e IA (07§77, Inv. 17).
2. Preview = runtime real do projeto (07§45); proibido renderer aproximado.
3. Nenhuma operação privilegiada depende de Playwright (07§80.20); Playwright
   só para diagnósticos responsive (09§46).
4. Zero fake success: "Saved"/"Published"/"Uploaded" só após verificação real.
5. Zero emojis; ícones Lucide; sem alert()/confirm()/prompt() — diálogos acessíveis.
6. Watcher é otimização, não verdade (07§60); reconciliação explícita.
7. Operações caras (scan, diff grande, diagnose) via Jobs assíncronos (07§62).
8. `Unknown` nunca tratado como `Unused` (08§50); `UNSUPPORTED` reportado, nunca adivinhado.
