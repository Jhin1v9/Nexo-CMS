# GRUPO E — ENGINEERING: EDITOR / COMPONENT+MEDIA / DESIGN+RESPONSIVE LAB

> Resumo dos documentos `07-EDITOR.md`, `08-COMPONENT-AND-MEDIA-ENGINE.md` e `09-DESIGN-AND-RESPONSIVE-LAB.md` (Nexo CMS). Todos são "Engineering Specification" para a equipe Nexo Digital, K3 Agent Swarm e AI Coding Agents. Regra transversal: nenhum subsistema cria um modelo falso dentro do Nexo — toda operação termina em mutação real, validada, do Source Project.

---

## 07 — NEXO CMS — EDITOR

- **Responsabilidade e fronteiras**
  - Define arquitetura e comportamento do editor visual, editor de código, inspector, source mapping, change tracking e workflow de persistência. O Editor é **consumidor** das capabilities do Nexo; não pode virar uma implementação independente de manipulação de projeto.
  - **Editor possui:** seleção visual; interface de edição de código; inspector; navegação de source; sincronização visual/código; estado local de edição; change review; apresentação de diff; undo/redo; interação de save; interação de preview.
  - **Editor NÃO possui:** parsing de framework; segurança de filesystem; lógica de negócio de Git; deployment; autorização de IA; implementação de adapter; source of truth do projeto.
  - Modos: `Visual, Code, Split, Preview, Inspector, Diff` — representações do **mesmo** estado de projeto, nunca modelos independentes.
  - Princípio central: "What the user sees and edits must remain connected to the real source of the project."

- **Stack/tecnologias**
  - **[NÃO ESPECIFICADO]** — o documento não cita nenhuma biblioteca concreta: sem editor de código (Monaco/CodeMirror), sem parser/AST libs, sem biblioteca de preview, sem versões. O protocolo K3 manda "inspecionar o frontend stack real selecionado para o Nexo" e "verificar documentação oficial das bibliotecas de editor/runtime escolhidas" (§81, itens 7–8). Menciona apenas que operações privilegiadas e edição via IA **não devem depender de Playwright** (§80 item 20, §81 item 14).

- **Contratos (tipos, interfaces, eventos, esquemas, source mapping, diff/save/undo)**
  - **Selection** (§11): `Project ID, Route, Node/Element, Component, Source File, Source Location, Confidence` — nem todo campo presente em toda seleção.
  - **Selection Confidence** (§12): enum `EXACT | HIGH_CONFIDENCE | PARTIAL | UNKNOWN`. UI não pode apresentar mapping incerto como exato.
  - **Source Mapping** (§13–15): conecta `Rendered Element ↔ Project Node ↔ Source File ↔ Line/Column/Structure`; identifica quando possível `Project, Route, Component, File, Node, Export, Line, Column`. Falha de mapping deve ser representada como `Unknown` e oferecer alternativas seguras (abrir source da página, componente relacionado, estrutura, Code View) — nunca adivinhar silenciosamente. Deve usar Project Intelligence + Adapters; o Editor **não implementa parsers próprios**.
  - **Change Object** (§31): `Change ID, Project, File(s), Operation, Source, Before State, After State, Origin, Timestamp`. Origens: `Human, AI, Visual Editor, Code Editor, External Change` (§31) e, em §32: `Visual Editor, Code Editor, AI, External Tool, Git Checkout, Branch Switch, Generated Component`.
  - **Estados de save** (§29): `Saved, Unsaved, Saving, Save Failed, Conflict`. UI não pode reportar `Saved` antes da persistência ter sucesso.
  - **Diff** (§42): suporta `File, Before, After, Added, Removed, Modified, Moved`; identifica origem `Human, AI, Visual, Generated`. Diff é a fronteira de segurança para edição por IA (§43): `AI Task → Generated Changes → Diff → Review → Approve/Reject`.
  - **Undo/Redo** (§33–35): undo reverte a mudança Editor-managed mais recente; não toca mudanças externas; redo é invalidado se o projeto mudou externamente. Undo ≠ Git; undo nunca cria commits.
  - **Save contract** (§36, §79): `Pending Changes → Validate → Check Conflict → Adapter Transformation if required → Filesystem Persistence → Read/Verify → Update Project Intelligence → Update Preview → Mark Saved`. Save bem-sucedido = `Source Project + Expected Modification + Persistence Confirmed`.
  - **Verificação pós-escrita** (§41): `File Exists, Content Updated, Parser Succeeds, Project Model Updated, Build remains valid when required`.
  - **Conflito** (§38–40): mudança externa + mudança local não salva = `CONFLICT`; resolução: `Keep Local, Keep External, Compare, Merge, Reload, Cancel`. Sem edits locais: detectar → refresh → atualizar preview.
  - **Erros de preview** (§48): distinguir `Source Error, Build Error, Runtime Error, Preview Error, Network Error`.
  - **Capabilities conceituais** (§78): `editor.selection.read, editor.change.create, editor.change.preview, editor.change.apply, editor.change.reject, editor.source.open, editor.source.save` — conceituais; o Control Plane final deve expor operações de domínio, não API específica de UI.
  - Fluxos de edição nomeados: texto (§17), props de componente com Adapter Transformation + Re-analyze (§18), estilos via Styling Adapter (§19), design tokens (§20), mídia via Media Library (§21), links preservando semântica (§22), inserção de componente (§23), remoção com inspeção de referências (§24), reordenação condicional (§25), criação/duplicação de página via Page Capability (§26–27).

- **Capabilities expostas**
  - Acesso programático para IA via `AI → Control Plane → Engine → Editor-related Domain Capability` (§58) — "Editor is a user experience layer, not a required execution mechanism." Toda operação importante do Editor deve ter capability de domínio correspondente (§77).

- **Dependências**
  - Depende de: Nexo Engine, Adapter System, Runtime, Project Intelligence (Project Model), Component Domain, Media Domain, Design Domain/Styling Adapters, Responsive Domain, Control Plane, Git Domain (`git.commit` → `GitService` → Real Git, §68), sistema de permissões.
  - Nada "depende dele": o Editor é camada de experiência; IA e consumidores programáticos operam sem ele.

- **Invariantes**
  - Nunca exibir `Saved/Published/Deployed/Fixed/Validated` sem a operação real ter sucedido (§64 "No Fake Success").
  - Nenhuma cópia-sombra do código pode virar fonte autoritativa (§8); nenhum estado de UI é o Source Project (§80 item 22).
  - Editor não contém `if React / if Vue / if Svelte` para transformação de source (§75); não lança processos de SO diretamente (§76); não cria parser/scanner semântico paralelo (§13, §74); não mantém status Git falso (§67).
  - Preview usa o runtime real do projeto (§45); hot reload é opcional com fallback para refresh (§47); breakpoints derivados do projeto, nunca assumir 640/768/1024/1280 (§50).
  - Não aprovar silenciosamente mudanças de IA (§69); recuperação de crash não confunde drafts com source persistido (§65); watchers são otimização, não fonte de verdade (§60).
  - Controles só aparecem como funcionais quando a capability subjacente existe (§56); permissões por papel (Viewer/Editor/Designer/Developer) avaliadas de verdade (§57); browser sem acesso irrestrito a filesystem/comandos (§66).

- **Ordem de implementação (K3 Swarm Protocol, §81)**
  1. Ler docs 01–06; 2. inspecionar stack frontend real; 3. verificar docs oficiais das libs escolhidas; 4. implementar Visual e Code Editor como consumidores de capabilities do Engine; 5. implementar Source Mapping sobre Project Intelligence; 6. testar edições reais em fixture projects; 7. testar modificação externa e conflitos; 8. testar mudanças de IA pelas mesmas domain capabilities; 9. verificar que nenhuma operação privilegiada depende de Playwright.

- **Acceptance criteria / validação (§80, 22 itens — síntese)**
  Edição visual e de código alteram o Source Project real; inspector corresponde a capabilities reais; source mapping confiável com incerteza representada; views compartilham o mesmo estado; undo/redo não sobrescrevem mudanças externas; save confirma persistência real e falhas são recuperáveis; mudanças externas detectadas; conflitos representados; diff mostra mudanças reais; IA revisável; preview renderiza o projeto real; comportamento de framework delegado a Adapters; Git real; Runtime dentro de fronteiras; permissões aplicadas; operações não suportadas não aparecem como funcionais; IA opera sem Playwright; projetos grandes com lazy loading/virtualização; nenhum estado de UI é autoritativo.

- **[AMBIGUO]/[NÃO ESPECIFICADO]**
  - Sem nenhuma tecnologia nomeada (editor de código, parser, AST, diff lib, preview engine) — adiado para decisão de stack + docs oficiais.
  - Implementação exata de merge "depends on the source-editing subsystem" (§39) — subsistema não detalhado.
  - Técnicas de escala (lazy/virtualização) "selecionadas após profiling" (§61).
  - API pública final fica com o Control Plane (§78); formato do Change Object é conceitual, sem tipos formais.

---

## 08 — NEXO CMS — COMPONENT AND MEDIA ENGINE

- **Responsabilidade e fronteiras**
  - Define o Component Engine universal, Component Library, integração com Component Studio e o Media Engine: como o Nexo representa, cria, modifica, armazena, valida e reutiliza componentes e mídia em projetos de tecnologias diferentes.
  - Requisito fundamental: "Components and media must be reusable through Nexo without forcing the source project into a Nexo-specific technology." O sistema **não pode virar um segundo framework** (proibido impor Nexo Component Runtime / Nexo JSX / Nexo CSS / Nexo Component Syntax, §4).
  - "Nexo controls the concept; the project controls the implementation" (§92). Definição universal → Project Adapter → representação real do projeto.

- **Stack/tecnologias**
  - **[NÃO ESPECIFICADO]** em termos de bibliotecas/versões. Referências conceituais a stacks-alvo: Next.js, React, Vue, Svelte, HTML/CSS/JS puro, Tailwind, CSS Modules, styled-components; exemplos de assets `hero.webp`, `photo.png → photo.webp`. Protocolo K3 exige pesquisar documentação oficial de frameworks antes de implementar comportamento específico (§91 itens 19–20).

- **Contratos (tipos, esquemas, eventos)**
  - **Tipos de componente** (§5): `Native Project Component`, `Nexo Library Component`, `Generated Project Component`, `External Component` (custom code/embed/widget/iframe/script/third-party), `Composite Component` (ex.: `Hero ├── Heading ├── Paragraph ├── Button └── Image`).
  - **Component Identity** (§6): `ID, Name, Scope, Source, Version, Schema, Capabilities, Metadata`; escopos `Project | Workspace | Library`. Ownership explícito (§7): Project→Project, Global→Workspace, External→Integration/Provider.
  - **Component Source** (§8): `Project File, Multiple Project Files, Generated Source, External Script, External Widget, Library Package, Integration` — referência rastreável.
  - **Component Schema** (§9): `Identity, Props, Variants, Slots, Events, Assets, Styles, Responsive Rules, Metadata` — serializável e machine-readable.
  - **Props** (§10–11): cada prop tem `Name, Type, Default, Required, Description, Validation`; tipos: `String, Number, Boolean, Image, Video, URL, Color, Rich Text, Enum, Array, Object, Component Reference, Slot`. Validação **antes** da mutação de source (§12).
  - **Variants** (§13, ex.: Button `primary/secondary/outline/ghost`); **Slots** (§14) distinguem `Fixed Prop` de `Composable Slot`; **Responsive Properties** (§15) usam o mecanismo real do projeto, sem breakpoint universal.
  - **Compatibility result** (§16): `COMPATIBLE | PARTIAL | INCOMPATIBLE | UNKNOWN`, avaliando framework, styling, runtime, dependências, assets, build, versões.
  - **Versioning** (§26): `Component, Version, Source, Dependencies, Compatibility, Changes, Published At`; projeto na versão X não migra silenciosamente para Y. Update é operação explícita: `Update Available → Compatibility Check → Impact Analysis → Diff → Approve → Apply → Validate` (§27).
  - **Deprecation states** (§28): `Current, Deprecated, Unsupported, Removed`.
  - **Portability** (§63): `Portable, Partially Portable, Project-Specific, Non-Portable`.
  - **Asset identity** (§42): `ID, Type, Source, Metadata, Dimensions when applicable, References, Scope`; origens (§43): `Local Project, Uploaded File, Generated File, External URL, CDN, Library, Integration`. Estados de uso (§50): `Used, Unused, Unknown, External, Generated` — `Unknown` nunca tratado como `Unused`. Distinção `Original / Processed / Derived` (§47).
  - **AI capabilities** (§33, §57): `component.list/read/create/update/delete/publish`; `media.list/read/search/upload/replace`. Tool `component.create` (§34): input `{name, description, props, variants, layout, assets}` → output `{componentId, filesChanged, diagnostics, status}` — schema final pertence ao Control Plane.
  - Fluxos: criação (§20), update com `Return Diff` (§22), deleção com inspeção de referências (§23), duplicação com nova identidade (§24), promoção `Project Component → Dependency Analysis → Compatibility Analysis → Remove/Resolve Private References → Review Metadata → Version → Publish` (§25), instalação de library component como mutação real (§68), migração de schema v1→v2 (`buttonText`→`label`, §71).

- **Capabilities expostas**
  - Library: `Search, Filter, Preview, Compatibility, Version, Dependencies, Scope, Tags, Documentation` (§29); busca estruturada por `Framework, Category, Version, Tags, Scope, Compatibility, Source` (§30). Preview renderiza a implementação real (§31). Documentação acessível a humanos e IA (§32). AI: recomendação de reuso antes de criar (§78), prevenção de duplicação (`Carousel, Carousel2, CarouselNew...`, §79).
  - Built-in components iniciais (§35): `Hero, Section, Container, Heading, Text, Button, Image, Gallery, Carousel, Card, Grid, Form, FAQ, Testimonials, Pricing, Video, Map, WhatsApp, Social Links, Footer, Custom Embed`. Casos especiais: Carousel (§36 — props viram source/config real, não metadado Nexo), Custom Embed passa por Integration e Security (§37), WhatsApp (§38), Form exige submission path real e validado (§39), Map distingue Static/Iframe/Provider/API-backed (§40).

- **Dependências**
  - Depende de: Nexo Engine, Project Adapters (geração de source framework-específica), Runtime, Project Intelligence (convenções, paths de assets), Integration/Security controls (Custom Embed, uploads), Control Plane (schemas de tools), Design Domain (tokens/tema de componentes), Media↔Component (relação de referências preservada, §59).
  - Consumido por: Editor (inserção/remoção/configuração de componentes, Media Library), Component Studio UI (opcional — IA não precisa dela, §33), AI agents.

- **Invariantes**
  - Sem compatibilidade forçada: componente Tailwind não injeta Tailwind em projeto CSS Modules (§17).
  - Criação segue convenções existentes do projeto: naming, diretórios, imports, formatação, styling, padrões, testes, exports (§21).
  - Nenhuma deleção em cascata automática sem regras explícitas (§23); deleção de asset com referências exige confirmação/bloqueio (§51); deletar asset não pode deixar componente referenciando arquivo inexistente (§59).
  - Promoção não vaza segredos/recursos privados (§25, §65); validação de publicação exige `Source Integrity, Dependency Resolution, No Secret Leakage, No Private Project References, Schema Validity, Compatibility` (§74).
  - Upload de mídia: validar tipo/MIME/tamanho/dimensões/encoding/segurança/nome/path — não confiar só na extensão (§45); SVG pode conter conteúdo ativo (§67); mídia é untrusted input até validada.
  - Substituição de mídia atualiza referências reais, não URL de preview (§48); migração de mídia não pode ser metadata-only (§72).
  - Paths de assets vêm de Project Intelligence/adapters — não assumir `/public` ou `/src/assets` (§53); nomes determinísticos respeitando convenções (§52); otimização png→webp atualiza todas as referências e mantém fallback (§54).
  - Mídia externa: gerencia a referência, nunca deleta/modifica o recurso remoto como se fosse local (§55).
  - Componentes com código executável são tratados como código (§66); instalação é mutação real, não metadado (§68); instalação removível da library não remove cópias instaladas; linked components futuros devem ser explícitos e nunca silenciosos (§69–70).
  - IA não bypassa o Component Domain para gerar source arbitrário (§75); mídia gerada por IA entra pelo Media Engine com identidade/metadata/referências (§76).
  - Minimização de dependências: carousel simples não justifica biblioteca pesada (§85–86); Library Template ≠ Installed Project Source (§87); instalações reversíveis (review/diff/revert/remove; Git como recuperação final, §88–89).

- **Ordem de implementação (K3 Swarm Protocol, §91)**
  Ler docs 01–06 → inspecionar convenções reais do projeto/framework → definir Component Model e schema → definir Media Model → implementar compatibility checks → source generation via adapters → persistência real → re-análise pós-mutação → fixture projects → testar stacks suportadas e não suportadas → testar referências de assets e dependências de componentes → testar acesso de IA pelas mesmas capabilities → pesquisar docs oficiais → nunca substituir comportamento desconhecido por implementação genérica inventada.

- **Acceptance criteria / validação (§90, 26 itens — síntese)**
  Identidades estáveis; distinção projeto/global; schemas estruturados; props validadas; variants e slots; compatibility check pré-instalação; geração delegada a adapters; versionamento; promoção com análise de dependências; mídia com identidade; uploads validados; replace atualiza referências reais; deleção checa referências; externo ≠ local; instalação/operações alteram o Source Project real; IA programática; UI dispensável; convenções e styling systems preservados; sem dependências silenciosas; operações não suportadas reportadas; operações auditáveis; mudanças reviewáveis.

- **[AMBIGUO]/[NÃO ESPECIFICADO]**
  - Formato concreto de serialização do Component Schema (JSON? arquivo? banco?) — apenas "serializable and machine-readable" e "não depender de browser ao vivo" (§62).
  - Schema exato das tools (ex.: `component.create`) pertence ao Control Plane (§34).
  - Mecanismo exato de sanitização/serving de mídia "definido pela especificação de Runtime/Security" (§56, §67).
  - Linked components são comportamento futuro, sem contrato definido (§70).
  - Política de updates automáticos exige policy explícita, não especificada (§27).

---

## 09 — NEXO CMS — DESIGN AND RESPONSIVE LAB

- **Responsabilidade e fronteiras**
  - Define o Design Engine e o Responsive Lab: styling visual, design tokens, inspeção responsiva, teste de viewports e diagnósticos de layout.
  - **Design Engine possui:** `Colors, Gradients, Typography, Spacing, Borders, Radius, Shadows, Tokens, Variables, Themes, Visual States`. **NÃO possui:** parsing de framework, execução de filesystem, Git, deployment, autenticação, implementação de renderização de browser.
  - Regra central: "Nexo must adapt itself to the project's design language instead of forcing every project into a Nexo design language" (Tailwind→Tailwind, CSS Modules→CSS Modules, CSS Variables→variables, styled-components→styled-components, plain CSS→estrutura existente).

- **Stack/tecnologias**
  - Sistemas de styling nomeados conceitualmente: Tailwind, CSS Modules, CSS Variables, styled-components, CSS puro, Google Fonts/web fonts/fontes locais. Formatos de cor: `HEX, RGB, RGBA, HSL, HSLA, OKLCH`, CSS variables, theme tokens. Responsive Lab exige "real browser rendering environment" via "appropriate browser automation/rendering technology" (§46) — **biblioteca específica [NÃO ESPECIFICADO]**; algoritmo de image-diff "selecionado com base em confiabilidade e performance" (§45); protocolo K3 manda verificar docs oficiais da ferramenta de browser/rendering escolhida (§81 item 8). Browser automation renderiza/testa — **não é o Control Plane** (§46).

- **Contratos (tipos, modelos, eventos)**
  - **Design Property Model** (§6): `color, background, backgroundGradient, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, padding, margin, gap, width, height, border, borderRadius, boxShadow, opacity`.
  - **Design Property Source** (§7): `Direct Value, CSS Variable, Design Token, Tailwind Utility, Theme Configuration, Component Prop, Styled Component Rule, Inline Style, Unknown`.
  - **Token types** (§51): `Color, Spacing, Typography, Radius, Shadow, Breakpoint, Container Width`. Temas: `Light, Dark, Brand Theme, Custom Theme` representados via `CSS Variables, Classes, Attributes, Configuration, Component State` (§52).
  - **Viewport Model** (§24): `Width, Height, Device Pixel Ratio when supported, Orientation` + opcionais `User Agent, Touch Capability, Reduced Motion, Color Scheme`. Presets configuráveis (`Mobile, Tablet, Laptop, Desktop, Wide Desktop`, §25) e dimensões arbitrárias (§26, ex.: 375×812, 1366×768); orientação Portrait/Landscape (§28).
  - **Responsive Diagnostic Result** (§34): `Issue ID, Severity, Viewport, Element, Source Mapping when available, Description, Evidence, Suggested Fixes when available`. Severidade (§35): `INFO, WARNING, ERROR, CRITICAL`. Certeza (§36): `Confirmed Issue, Potential Issue, Unknown`.
  - **Categorias de diagnóstico** (§29): `Horizontal/Vertical Overflow, Content Clipping, Text Overflow, Unwanted Wrapping, Broken Grid, Broken Flex Layout, Fixed Element Overflow, Viewport-Dependent Bugs`; overflow identifica `Element, Bounding Box, Viewport, Overflow Amount, Potential Source` (§30). Layout diagnostics (§58): fixed width > viewport, flex child overflow, grid min-width, unbreakable text, absolute overflow, viewport-dependent margin, intrinsic image overflow.
  - **Snapshot Model** (§44): `Project, Viewport, Source State, Timestamp, Preview URL/Reference, Image, Diagnostics` — snapshots **não** são o Source Project.
  - **Browser Capability Detection** (§47): `Viewport Resize, Screenshots, DOM Inspection, Bounding Boxes, Computed Styles, Console Logs, Network Information, Performance Data`.
  - **Design API** (§66): `design.read, design.update, design.token.read, design.token.update, theme.read, theme.update`. **Responsive API** (§67): `responsive.viewport.create, responsive.preview, responsive.diagnose, responsive.stressTest, responsive.compare, responsive.snapshot` — contratos públicos exatos definidos pelo Control Plane.
  - **Permissões** (§68–69): `design.read, design.write, design.tokens.write, theme.write`; `responsive.read, responsive.modify` distinguíveis de `responsive.diagnose`.
  - Fluxos: color edit (§11), AI fix loop `Diagnose → AI Analysis → Proposed Fix → Diff → Apply → Re-render → Re-diagnose` (§39), verificação mensurável (`overflow 27px → 0px`, §40), repair automático `Detect → Understand → Propose → Authorize → Modify → Validate` (§60), modo autônomo `Diagnose → Plan → Modify → Build/Render → Validate → Retry if authorized` (§61).

- **Capabilities expostas**
  - Inspeção/edição de cores, gradientes (linear/radial/conic/stops/ângulo/posição/opacidade), tipografia, fontes, spacing, bordas, radius, sombras; detecção de breakpoints a partir de `CSS Media Queries, Tailwind Configuration, Theme Configuration, Framework System, CSS Variables, Component Logic` (§22); detecção de design system existente (§54); stress testing (§32); comparação visual Side-by-Side/Overlay/Difference (§43); visual regression Baseline→New Render→Comparison→Difference (§45); matriz de regressão configurável (§42); impact analysis (`Affected Components/Pages/Tokens/Viewports/Instances`, §79).

- **Dependências**
  - Depende de: Nexo Engine, Styling Adapter (+ Framework Adapter para responsive, §23), Runtime (preview real, §27), Project Intelligence + Source Mapping (mapear diagnósticos de DOM para source, §37, §50), Control Plane (APIs públicas), Security/Control Plane (nomes de permissões), browser/rendering environment real (§46).
  - Consumido por: Editor (integração com Responsive Lab, viewport no estado do editor — Editor §49–50), AI agents (diagnósticos estruturados em vez de screenshots, §38), Component Model (component-level design, §72–73).

- **Invariantes**
  - Sem conversão forçada de cor (HSL→HEX só porque o picker prefere HEX, §10); representação UI ≠ representação source.
  - Preferir modificar a fonte de verdade compartilhada (token `--primary-color`, `--hero-gradient`, `--space-md`) em vez de valores hardcoded (§8, §13, §17); não desconectar elemento de token compartilhado sem intenção explícita (§56).
  - Não assumir breakpoints genéricos 640/768/1024/1280 (§22); não criar segunda design system nem tema paralelo Nexo (§53, §55); sequência obrigatória `Detect Existing → Understand → Reuse → Modify` (§55).
  - Stress content é dado de teste — nunca persistido no Source Project automaticamente (§32–33); operar em `Temporary Test State / Preview Environment / Non-Persistent Rendering`.
  - Diagnósticos baseados em comportamento renderizado real; hipóteses não verificadas apresentadas como hipóteses (§59); falso positivo nunca reportado como fato (§36); comportamento observado ≠ causa inferida (§58).
  - Computed style ≠ source style (§48); DOM ≠ source code (§49); ordem do DOM ≠ ordem do source (§50); cascata CSS considerada (regra herdada, especificidade, inline, classe, media query, pseudo-classe, variável — §76–77).
  - Scope resolution antes de mutar: o que está selecionado, de onde vem o valor, herdado/tokenizado/component-level/global (§75); distinguir `Global Style, Theme, Token, Component Style, Instance Style` (§74); avisar impacto global de edit aparentemente local (ex.: `.button` com 17 usos, §78).
  - Sem fix cego automático: proibido `Problem → Guess → Write CSS` como default (§60); fix verificado contra a issue original e sem regressão em outros viewports (§40–41).
  - Design changes são mudanças Git ordinárias — sem histórico de design falso (§70); diagnósticos não viram commits, só fixes de source (§71).
  - Presets de device não implicam simulação perfeita de hardware (§62); não clamar compatibilidade universal de browser a partir de um engine (§63); consultar docs oficiais de compatibilidade de features CSS (§64); não expandir escopo do Lab indefinidamente — performance diagnostics são extensão futura (§65).

- **Ordem de implementação (K3 Swarm Protocol, §81)**
  Ler docs 01–06 → inspecionar convenções de styling dos fixture projects → verificar docs oficiais do tooling de browser/rendering → implementar design operations via Styling Adapters → responsive rendering via Runtime real → testar viewports arbitrários → testar diagnósticos de overflow/wrapping → testar preservação de tokens → testar escopo global-vs-local → testar mudanças externas de source → testar workflows de IA (diagnóstico e reparo) → nunca inventar comportamento de styling framework-específico.

- **Acceptance criteria / validação (§80, 25 itens — síntese)**
  Styling systems detectados; edição na linguagem real do projeto; cores sem conversão forçada; gradientes/tipografia/spacing/bordas/radius/sombras editáveis; tokens detectados e preservados; temas detectados/editáveis; breakpoints derivados do projeto; viewports arbitrários; preview real; overflow e wrapping detectáveis; stress testing disponível e não persistido; diagnósticos com evidência e incerteza representada; source mapping usado; IA consome diagnósticos e valida fixes via re-render; mudanças alteram source real; escopos global/local distinguidos; sem segunda design system silenciosa; UI e IA usam as mesmas capabilities.

- **[AMBIGUO]/[NÃO ESPECIFICADO]**
  - Tecnologia de browser automation/rendering não nomeada (§46) — decisão adiada.
  - Algoritmo de image-diff não escolhido (§45).
  - Contratos públicos exatos das APIs Design/Responsive pertencem ao Control Plane (§67); nomes exatos de permissões pertencem a Security/Control Plane (§68).
  - Performance diagnostics (large images, long tasks, layout shift, DOM excessivo, render blocking) são "future versions", opcionais (§65).
  - Profundidade exata de simulação (UA, touch, reduced motion, color scheme) depende do ambiente de preview (§24).

---

# SÍNTESE DO GRUPO

## (1) Pipeline de edição (visual → source mapping → write → re-analyze → validate)

Os três documentos convergem para um único pipeline canônico, sempre atravessando `Editor/Design/Component UI → Nexo Engine → Adapter (Styling/Framework) → Runtime → Source Project`:

1. **Seleção/resolução**: elemento visual → Project Node → Source File → Line/Column, com confidence `EXACT | HIGH_CONFIDENCE | PARTIAL | UNKNOWN`; falha de mapping vira `Unknown` com alternativas seguras — nunca palpite silencioso.
2. **Change tracking**: Change Manager registra `Change ID, Project, File(s), Operation, Source, Before/After State, Origin (Human/AI/Visual/Code/External/Git Checkout/Branch Switch/Generated), Timestamp`; undo/redo só sobre mudanças Editor-managed, invalidados por mudança externa.
3. **Escrita**: `Pending Changes → Validate → Check Conflict → Adapter Transformation → Filesystem Persistence → Read/Verify → Update Project Intelligence → Update Preview → Mark Saved`. Save = `Source Project + Expected Modification + Persistence Confirmed`; verificação inclui `File Exists, Content Updated, Parser Succeeds, Project Model Updated, Build valid`.
4. **Re-analyze + validate**: toda mutação (texto, prop, componente, mídia, estilo) termina em re-análise do Project Model e validação; preview atualiza via runtime real (hot reload opcional, fallback refresh).
5. **Conflitos**: mudança externa + edit local = `CONFLICT` com `Keep Local/Keep External/Compare/Merge/Reload/Cancel`; sem edits locais, apenas refresh. Estados `Saved/Unsaved/Saving/Save Failed/Conflict`; "No Fake Success" absoluto.
6. **IA**: nunca opera pela UI — `AI → Control Plane → Engine → Domain Capability`; mudanças de IA aparecem como diff com `Approve/Reject`; diffs são a fronteira de segurança da edição por IA; nenhuma operação privilegiada depende de Playwright.

## (2) Modelo de Component + Media (schemas, biblioteca)

- **Component Schema**: `Identity (ID, Name, Scope[Project|Workspace|Library], Source, Version, Capabilities, Metadata)` + `Props (Name, Type, Default, Required, Description, Validation)`, `Variants`, `Slots (Fixed Prop vs Composable Slot)`, `Events`, `Assets`, `Styles`, `Responsive Rules`. Tipos de prop: String/Number/Boolean/Image/Video/URL/Color/Rich Text/Enum/Array/Object/Component Reference/Slot.
- **Classes**: Native Project, Nexo Library, Generated, External, Composite. Compatibilidade `COMPATIBLE|PARTIAL|INCOMPATIBLE|UNKNOWN` avaliada antes de inserção; sem migração forçada de stack.
- **Library**: versionada (`Version, Dependencies, Compatibility, Changes, Published At`), estados `Current/Deprecated/Unsupported/Removed`, portabilidade `Portable/Partially Portable/Project-Specific/Non-Portable`, busca estruturada, preview da implementação real, docs para humanos e IA. Promoção exige dependency analysis + remoção de referências privadas + `No Secret Leakage`. Built-ins: Hero, Section, Carousel, Form, Map, WhatsApp, Custom Embed (este passa por Security) etc.
- **Media**: identidade `ID, Type, Source, Metadata, Dimensions, References, Scope`; origens Local/Upload/Generated/External URL/CDN/Library/Integration; estados `Used/Unused/Unknown/External/Generated` (Unknown ≠ Unused); validação por MIME real (não extensão; SVG é risco); replace atualiza referências reais; deleção checa referências; externo nunca modificado como local; paths via Project Intelligence (não assumir `/public`); `Original/Processed/Derived` distintos.
- **APIs**: `component.list/read/create/update/delete/publish`; `media.list/read/search/upload/replace`; tool `component.create` → `{componentId, filesChanged, diagnostics, status}` (schema final no Control Plane).

## (3) Design tokens + Responsive Lab (contratos)

- **Design Property Model** com ~17 propriedades (color…opacity) e **Property Source** tipada (`Direct Value, CSS Variable, Design Token, Tailwind Utility, Theme Configuration, Component Prop, Styled Component Rule, Inline Style, Unknown`) — o sistema edita a camada correta, preferindo tokens compartilhados (`--primary-color`) a valores hardcoded, sem desconectar elementos de tokens sem intenção explícita.
- **Tokens**: tipos Color/Spacing/Typography/Radius/Shadow/Breakpoint/Container Width; temas Light/Dark/Brand/Custom via CSS Variables/Classes/Attributes/Config/Component State; proibido criar segunda design system ou converter representações (HSL→HEX).
- **Escopo**: `Global Style | Theme | Token | Component Style | Instance Style`; scope resolution obrigatória antes de mutar; impact analysis reporta usos afetados (ex.: 17 usages).
- **Responsive Lab**: viewport arbitrário (`Width, Height, DPR, Orientation` + opcionais), presets configuráveis, breakpoints detectados do projeto (media queries, Tailwind config, theme, CSS vars) — nunca 640/768/1024/1280 por padrão. Diagnósticos estruturados `{Issue ID, Severity[INFO..CRITICAL], Viewport, Element, Source Mapping, Description, Evidence, Suggested Fixes}` com certeza `Confirmed/Potential/Unknown`; stress testing isolado e não persistente; snapshots não são source; fix loop `Diagnose→Propose→Diff→Apply→Re-render→Re-diagnose` com verificação mensurável (27px→0px) e matriz anti-regressão.
- **APIs**: `design.read/update`, `design.token.read/update`, `theme.read/update`; `responsive.viewport.create/preview/diagnose/stressTest/compare/snapshot`; permissões `design.*`, `responsive.read/diagnose/modify` (nomes finais no Control Plane/Security). Browser automation renderiza e mede, mas não é o Control Plane.

## (4) Dependências cruzadas com Runtime/Engine/Adapters/Intelligence/Control Plane

- **Todos os três subsistemas** são consumidores de capabilities: nenhum implementa parsing de framework, acesso a filesystem, processos de SO, Git ou lógica de segurança. Editor não tem `if React/Vue/Svelte`; Component Engine delega representação real ao Adapter; Design Engine delega ao Styling Adapter.
- **Project Intelligence** é a única fonte semântica: Project Model (pages, routes, components, assets, styles, dependencies), convenções do projeto, paths de assets, breakpoints, tokens — Editor/Design/Responsive não constroem scanners paralelos; Source Mapping usa Intelligence + Adapters.
- **Engine + Control Plane**: toda operação de UI tem capability de domínio espelhada acessível à IA (editor.*, component.*, media.*, design.*, responsive.*); contratos públicos exatos e schemas de tools pertencem ao Control Plane; autorização e nomes de permissões pertencem a Security.
- **Runtime**: preview, builds, testes e diagnósticos de browser passam pelo Runtime real do projeto; hot reload opcional; erros classificados (Source/Build/Runtime/Preview/Network).
- **Git**: undo ≠ Git; commits via Git Domain (`git.commit → GitService`); design changes são source changes ordinários; diagnósticos não entram no Git.
- **Mídia/Componente/Design entre si**: componentes dependem de assets (relação preservada em deleções), de tokens/tema (Design) e de integrações externas (Security para embeds/uploads/SVG).
- **Leitura obrigatória anterior (todos os K3 protocols)**: docs 01–06 (`01-SYSTEM-ARCHITECTURE`, `02-PROJECT-INTELLIGENCE`, `03-ADAPTER-SYSTEM`, `04-RUNTIME-AND-SECURITY`, `05-NEXO-ENGINE`, `06-CONTROL-PLANE-AND-AGENT-API`) + fixture projects + documentação oficial atual das tecnologias escolhidas. Regra final transversal: **nunca inventar comportamento de framework desconhecido; nunca substituir o real por uma ilusão de editor.**
