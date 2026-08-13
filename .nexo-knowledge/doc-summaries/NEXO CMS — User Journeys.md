# NEXO CMS
## User Journeys

## 1. Propósito

Este documento define os principais fluxos de utilização do Nexo CMS.

O objetivo é descrever, de forma operacional, **como diferentes tipos de usuário interagem com o produto para realizar tarefas reais**, desde a abertura de um projeto até edição, versionamento, validação e publicação.

Os User Journeys devem servir como referência para:

- Product;
- UX;
- arquitetura;
- runtime;
- editor;
- Git;
- AI Engine;
- adapters;
- segurança;
- testes;
- agentes de implementação.

Este documento descreve **comportamento e fluxo**, não a implementação técnica definitiva da interface.

---

# 2. Regras gerais de jornada

Todas as jornadas devem respeitar os seguintes princípios:

1. O usuário deve saber em qual Workspace está.
2. O usuário deve saber qual Projeto está aberto.
3. Operações relevantes devem possuir estado visível.
4. Alterações devem permanecer rastreáveis.
5. A interface não deve apresentar sucesso antes da operação real ser concluída.
6. Operações críticas devem respeitar permissões.
7. A IA deve respeitar as permissões efetivas do contexto.
8. O sistema deve preservar o projeto original.
9. O sistema deve indicar incerteza quando não compreender alguma estrutura.
10. A jornada deve poder ser interrompida sem deixar estado inconsistente sempre que tecnicamente possível.

---

# 3. Jornada A — Primeiro acesso

## Objetivo

Permitir que um usuário autenticado entre no Nexo e chegue ao contexto correto de trabalho.

## Fluxo

```text id="0xqz8c"
Open Nexo
↓
Authenticate
↓
Resolve user
↓
Load Workspaces
↓
Select Workspace
↓
Load accessible Projects
↓
Project Dashboard
```

## Resultado esperado

O usuário deve chegar a um Workspace conhecido e visualizar somente os recursos aos quais possui acesso.

## Regras

- Usuário sem Workspace acessível não deve visualizar projetos de outros usuários.
- Permissões devem ser aplicadas antes de expor operações.
- Falhas de autenticação não devem revelar informações internas.
- A última seleção do usuário pode ser restaurada se essa capacidade for suportada pela política de sessão.

---

# 4. Jornada B — Criar ou conectar Workspace

## Objetivo

Permitir que um usuário autorizado tenha um ambiente organizacional para armazenar projetos, membros e configurações.

## Fluxo

```text id="f4g6px"
Create Workspace
↓
Define Name
↓
Configure Basic Settings
↓
Create
↓
Workspace Ready
```

## Resultado esperado

O Workspace deve existir e o usuário responsável deve possuir a Role apropriada.

## Regras

- A criação deve ser auditável.
- O nome do Workspace deve ser validado.
- A identidade criadora deve ser registrada.
- O sistema não deve criar automaticamente usuários adicionais.

---

# 5. Jornada C — Importar projeto local

## Objetivo

Permitir que o usuário abra um projeto existente no ambiente em que o Nexo Runtime está executando.

## Fluxo

```text id="r5g8yn"
New Project
↓
Select Folder
↓
Filesystem Access
↓
Project Scanner
↓
Stack Detection
↓
Git Detection
↓
Build Detection
↓
Project Analysis
↓
Analysis Summary
↓
User Review
↓
Open Project
```

## Tela de análise conceitual

O usuário deve conseguir visualizar informações como:

```text id="4j5k92"
Project
Path
Detected Stack
Framework
Language
Styling
Package Manager
Build Command
Development Command
Git Status
Confidence
Warnings
Unsupported Areas
```

## Resultado esperado

O projeto é aberto como Project Workspace e o Nexo possui um estado inicial de compreensão.

## Regras

- O projeto não deve ser modificado apenas por ser analisado.
- A análise não deve instalar dependências automaticamente sem autorização.
- A análise não deve converter o projeto.
- O usuário deve conseguir revisar detecções importantes.
- Desconhecimento deve ser representado explicitamente.

---

# 6. Jornada D — Corrigir stack detectado

## Objetivo

Permitir que o usuário corrija informações detectadas automaticamente.

## Fluxo

```text id="b9m1pc"
Project Analysis
↓
Detected Stack
↓
Edit Configuration
↓
Confirm / Override
↓
Re-analyze
↓
Save Project Configuration
```

## Resultado esperado

O Project Context passa a utilizar as configurações confirmadas.

## Regras

- A configuração manual deve prevalecer sobre detecções conflitantes quando explicitamente confirmada.
- O sistema deve registrar a origem da configuração quando necessário.
- Mudanças devem ser reversíveis.

---

# 7. Jornada E — Abrir projeto já conhecido

## Objetivo

Permitir reabrir um projeto previamente analisado sem repetir desnecessariamente toda a análise.

## Fluxo

```text id="u7c2sk"
Projects
↓
Select Project
↓
Load Metadata
↓
Check Project State
↓
Check Filesystem Changes
↓
Refresh Required Intelligence
↓
Open Project
```

## Regras

O Nexo deve verificar se o projeto mudou desde a última análise.

Exemplos:

- arquivos novos;
- arquivos removidos;
- dependências alteradas;
- branch alterada;
- Git changes;
- configuração modificada.

O sistema não deve assumir que o Project Model continua perfeitamente atualizado.

---

# 8. Jornada F — Iniciar ambiente de desenvolvimento

## Objetivo

Permitir iniciar o projeto dentro do Runtime.

## Fluxo

```text id="1j8r3b"
Open Project
↓
Start Development
↓
Resolve Command
↓
Validate Environment
↓
Start Process
↓
Monitor Output
↓
Detect Ready State
↓
Open Preview
```

## Regras

- O comando deve vir da configuração detectada ou confirmada.
- O Nexo não deve assumir `npm run dev`.
- O processo deve possuir identidade.
- Logs devem ser acessíveis.
- Falhas devem ser apresentadas claramente.
- O usuário deve conseguir encerrar o processo.

---

# 9. Jornada G — Abrir preview

## Objetivo

Visualizar o projeto em execução.

## Fluxo

```text id="k0r5q9"
Start Preview
↓
Resolve Running Environment
↓
Load Preview
↓
Select Viewport
↓
Interact
```

## O preview deve informar

- Projeto;
- ambiente;
- estado;
- viewport;
- alterações salvas ou não salvas;
- versão ou commit quando aplicável.

---

# 10. Jornada H — Selecionar elemento visual

## Objetivo

Permitir que o usuário encontre a origem de um elemento a partir do preview.

## Fluxo

```text id="m3q7cs"
Preview
↓
Select Element
↓
Resolve Element
↓
Identify Component / Node
↓
Resolve Source
↓
Open Inspector
```

## Resultado esperado

O Inspector apresenta somente propriedades realmente suportadas.

Quando Source Mapping não for confiável, o Nexo deve informar a limitação.

---

# 11. Jornada I — Editar texto visualmente

## Objetivo

Alterar conteúdo textual existente.

## Fluxo

```text id="s8n2zx"
Select Text
↓
Inspector
↓
Edit Content
↓
Preview Update
↓
Save
↓
Persist Source
↓
Validate
↓
Updated State
```

## Regras

- O sistema deve identificar a fonte real do texto.
- Não deve salvar apenas no estado do editor.
- A alteração deve resultar em diff quando aplicável.
- Falha de persistência deve ser apresentada como erro.

---

# 12. Jornada J — Editar código

## Objetivo

Permitir alterar diretamente a implementação do projeto.

## Fluxo

```text id="v5p9lm"
Open Code
↓
Select File
↓
Edit
↓
Save
↓
Update Project State
↓
Reanalyze Affected Areas
↓
Refresh Preview
```

## Regras

- O editor deve trabalhar sobre o arquivo real.
- O Nexo deve detectar efeitos relevantes quando possível.
- Alterações externas ao editor devem poder invalidar estado previamente carregado.

---

# 13. Jornada K — Editar propriedade de componente

## Objetivo

Modificar uma propriedade estruturada de um componente.

## Fluxo

```text id="x2f7mq"
Select Component
↓
Inspector
↓
Select Property
↓
Change Value
↓
Preview
↓
Save
↓
Adapter Transform
↓
Persist
↓
Validate
```

---

# 14. Jornada L — Criar componente

## Objetivo

Criar um novo componente reutilizável.

## Fluxo

```text id="c8j3rd"
Component Studio
↓
New Component
↓
Define Identity
↓
Define Structure
↓
Define Props
↓
Define Variants
↓
Define Responsive Behavior
↓
Add Assets
↓
Preview
↓
Validate
↓
Save
```

## Resultado esperado

O componente deve possuir uma definição que possa ser utilizada pelo projeto de acordo com sua tecnologia.

---

# 15. Jornada M — Salvar componente no projeto

## Fluxo

```text id="p7v4ks"
Component Studio
↓
Save to Project
↓
Resolve Adapter
↓
Generate / Modify Source
↓
Validate Dependencies
↓
Persist
↓
Register Component
```

O Nexo deve impedir que o componente seja considerado salvo quando o código real não tiver sido atualizado.

---

# 16. Jornada N — Publicar componente na biblioteca global

## Fluxo

```text id="d5r8wm"
Project Component
↓
Promote
↓
Analyze Dependencies
↓
Check Compatibility
↓
Review Metadata
↓
Select Version
↓
Publish
↓
Global Library
```

## Regras

A promoção deve verificar dependências específicas do projeto.

Não deve publicar automaticamente:

- imports privados;
- assets inacessíveis;
- APIs proprietárias do projeto;
- configurações específicas;
- secrets.

---

# 17. Jornada O — Inserir componente existente

## Fluxo

```text id="j9q2px"
Select Location
↓
Add Component
↓
Search Library
↓
Select Component
↓
Check Compatibility
↓
Configure Props
↓
Preview
↓
Insert
↓
Validate
```

Se o componente não for compatível, a operação deve ser bloqueada ou explicitamente classificada como incompatível.

---

# 18. Jornada P — Editar carrossel

## Fluxo

```text id="r4v8cy"
Select Carousel
↓
Open Component Inspector
↓
Slides
↓
Edit Media / Content
↓
Configure Behavior
↓
Preview
↓
Save
↓
Persist
↓
Validate
```

O usuário deve conseguir administrar, quando suportado:

- slides;
- imagens;
- ordem;
- texto;
- links;
- autoplay;
- velocidade;
- transição;
- loop;
- navigation;
- pagination;
- quantidade por viewport.

---

# 19. Jornada Q — Substituir imagem

## Fluxo

```text id="n6x3jb"
Select Image
↓
Replace
↓
Media Library
↓
Select Asset / Upload
↓
Preview
↓
Confirm
↓
Persist Reference
↓
Validate
```

O sistema deve preservar o relacionamento da imagem com o componente.

---

# 20. Jornada R — Adicionar mídia

## Fluxo

```text id="g2m7vk"
Media Library
↓
Upload
↓
Validate File
↓
Process
↓
Store
↓
Index
↓
Available for Project
```

A operação deve respeitar limites, formatos e políticas de segurança.

---

# 21. Jornada S — Editar design

## Fluxo

```text id="w9p4lc"
Select Element / Token
↓
Open Design Inspector
↓
Choose Property
↓
Edit
↓
Preview
↓
Apply
↓
Persist
↓
Validate
```

O Nexo deve preferir alterar a fonte real do design.

Exemplo:

```text id="z5r8m2"
Shared CSS Variable
```

deve ter prioridade sobre inserir uma nova cor hardcoded quando apropriado.

---

# 22. Jornada T — Testar responsividade

## Fluxo

```text id="b3x9nk"
Open Responsive Lab
↓
Select Preset / Custom Viewport
↓
Render
↓
Inspect
↓
Detect Issues
↓
Edit
↓
Re-render
```

---

# 23. Jornada U — Stress test

## Objetivo

Forçar situações capazes de revelar problemas de layout.

## Fluxo

```text id="m7q2fd"
Responsive Lab
↓
Stress Testing
↓
Select Scenario
↓
Inject Test Content
↓
Render
↓
Detect Overflow / Wrapping / Layout Issues
↓
Review
```

Exemplos de cenários:

```text id="6p4x9c"
Long Title
Long Button
Long Paragraph
Narrow Viewport
Wide Viewport
Large Image
Multiple Items
Unexpected Content
```

O conteúdo utilizado no teste não deve ser confundido com conteúdo real salvo no projeto.

---

# 24. Jornada V — Corrigir problema com IA

## Fluxo

```text id="q8m5rd"
Identify Problem
↓
Ask Nexo AI Engineer
↓
Gather Project Context
↓
Analyze
↓
Plan
↓
Generate Patch
↓
Review Diff
↓
Validate
↓
Preview
↓
Approve / Reject
↓
Apply
```

---

# 25. Jornada W — IA em modo manual

## Fluxo

```text id="k4n7yb"
User Request
↓
AI Analysis
↓
Proposed Plan
↓
Affected Files
↓
Proposed Diff
↓
Human Review
↓
Approve
↓
Apply
↓
Validate
```

O sistema não deve aplicar alterações automaticamente antes da aprovação quando estiver nesse modo.

---

# 26. Jornada X — IA em modo automático

## Fluxo

```text id="p1v6zt"
User Request
↓
Permission Check
↓
AI Context
↓
Plan
↓
Execute
↓
Validate
↓
Generate Report
↓
Update Project State
```

O modo automático não elimina:

- permissões;
- segurança;
- validação;
- rastreabilidade.

---

# 27. Jornada Y — IA encontra incerteza

## Fluxo

```text id="v3k8mq"
AI Task
↓
Analyze
↓
Insufficient Context
↓
Classify Uncertainty
↓
Request Additional Information
OR
Use Explicitly Safe Fallback
```

A IA não deve inventar uma estrutura quando não possui contexto suficiente.

---

# 28. Jornada Z — Executar comando no terminal

## Fluxo

```text id="r7m2xc"
Terminal
↓
Enter Command
↓
Permission Check
↓
Risk Evaluation
↓
Execute
↓
Stream Output
↓
Exit Code
↓
Record Result
```

---

# 29. Jornada AA — Ação de terminal bloqueada

## Fluxo

```text id="j4v9kp"
Command
↓
Permission / Policy Check
↓
Denied
↓
Explain Reason
↓
Do Not Execute
```

O comando nunca deve ser executado apenas porque a interface permitiu digitá-lo.

---

# 30. Jornada AB — Git status

## Fluxo

```text id="t6n8yr"
Open Git
↓
Read Repository
↓
Get Status
↓
Display Branch
↓
Display Changes
↓
Display Remote State
```

---

# 31. Jornada AC — Commit

## Fluxo

```text id="x9q3mb"
Review Changes
↓
Enter Commit Message
↓
Validate Working Tree
↓
Stage
↓
Commit
↓
Verify Commit
↓
Update Git State
```

---

# 32. Jornada AD — Commit + Push

## Fluxo

```text id="c5m8vx"
Review Changes
↓
Commit
↓
Verify Commit
↓
Push
↓
Verify Remote Result
↓
Update Status
```

Se o commit funcionar e o push falhar, o sistema deve representar:

```text id="g2d9rp"
Commit: SUCCESS
Push: FAILED
```

Não deve apresentar a operação inteira como sucesso.

---

# 33. Jornada AE — Criar repositório GitHub

## Fluxo

```text id="n8x4ql"
Git
↓
Create Remote Repository
↓
Authenticate GitHub
↓
Select Owner
↓
Define Repository
↓
Create
↓
Add Remote
↓
Push Initial Branch
↓
Verify
```

A implementação deve consultar a documentação atual e oficial do GitHub antes de definir APIs ou fluxos específicos.

---

# 34. Jornada AF — Criar branch

## Fluxo

```text id="p4m7sk"
Git
↓
New Branch
↓
Enter Name
↓
Validate
↓
Create
↓
Switch
↓
Update Project State
```

---

# 35. Jornada AG — Operação Git perigosa

Exemplos:

- reset;
- force push;
- rebase complexo;
- remoção de branch;
- checkout sobre alterações;
- operações equivalentes.

## Fluxo

```text id="k3w8fz"
Request
↓
Risk Detection
↓
Show Impact
↓
Require Confirmation
↓
Execute
↓
Verify
↓
Audit
```

---

# 36. Jornada AH — Criar página

## Fluxo

```text id="y5r2mc"
Pages
↓
New Page
↓
Define Route
↓
Select Existing Structure / Template
↓
Configure Content
↓
Preview
↓
Validate
↓
Create
↓
Update Project Model
```

A página deve ser criada conforme as convenções do projeto.

---

# 37. Jornada AI — Editar conteúdo

## Fluxo

```text id="f7n3kx"
Select Content
↓
Identify Content Source
↓
Edit
↓
Preview
↓
Save
↓
Persist
↓
Validate
```

A origem pode ser:

- código;
- arquivo;
- JSON;
- Markdown;
- API;
- banco;
- serviço externo.

O sistema deve evitar assumir uma única origem.

---

# 38. Jornada AJ — Adicionar integração

## Fluxo

```text id="q2v9md"
Add Integration
↓
Select Type
↓
Configure
↓
Validate Permissions
↓
Preview
↓
Save
↓
Persist
```

Tipos podem incluir:

- HTML;
- CSS;
- JavaScript;
- iframe;
- external script;
- widget;
- service integration;
- custom embed.

---

# 39. Jornada AK — Instalar plugin

## Fluxo

```text id="m8c4yp"
Plugin Registry
↓
Select Plugin
↓
Review Metadata
↓
Review Permissions
↓
Install
↓
Validate Compatibility
↓
Activate
```

Plugin não deve receber permissões elevadas sem consentimento adequado.

---

# 40. Jornada AL — Deploy

## Fluxo

```text id="x6k2qr"
Open Deploy
↓
Select Environment
↓
Select Provider
↓
Preflight
↓
Build
↓
Review
↓
Deploy
↓
Verify
↓
Report
```

---

# 41. Jornada AM — Deploy bloqueado

```text id="c9r5vn"
Deploy
↓
Preflight
↓
Failure
↓
Stop
↓
Explain
↓
Do Not Deploy
```

Exemplos:

- build falhou;
- credencial inválida;
- ambiente incorreto;
- provider indisponível;
- working tree incompatível com política;
- configuração ausente.

---

# 42. Jornada AN — Rollback

## Fluxo

```text id="v7m3px"
Deployment History
↓
Select Version
↓
Review
↓
Confirm
↓
Rollback
↓
Verify
↓
Audit
```

A estratégia de rollback dependerá do Deployment Provider.

---

# 43. Jornada AO — Adicionar usuário

## Fluxo

```text id="j3x8km"
Workspace Settings
↓
Invite User
↓
Enter Identity
↓
Select Role
↓
Optional Project Scope
↓
Send Invitation
↓
User Accepts
↓
Membership Active
```

---

# 44. Jornada AP — Alterar Role

```text id="q5n9rc"
Workspace Members
↓
Select User
↓
Change Role
↓
Review Impact
↓
Confirm
↓
Apply
↓
Audit
```

---

# 45. Jornada AQ — Conceder acesso específico a projeto

```text id="m7d2vx"
User
↓
Project Access
↓
Select Project
↓
Select Permissions
↓
Confirm
↓
Apply
↓
Audit
```

---

# 46. Jornada AR — Ação com permissão insuficiente

## Fluxo

```text id="w4p8ks"
User Action
↓
Authorization Check
↓
Denied
↓
Explain Missing Permission
↓
Do Not Execute
```

A operação não pode continuar apenas porque o frontend ocultou ou desabilitou um botão.

---

# 47. Jornada AS — Detectar alteração externa

## Cenário

O projeto foi modificado fora do Nexo.

Exemplo:

```text id="6c9m2t"
VS Code
Terminal
Git
External Tool
```

## Fluxo

```text id="r2v7qx"
Nexo Detects External Change
↓
Compare Project State
↓
Identify Affected Areas
↓
Invalidate Stale Context
↓
Refresh
↓
Notify User
```

O Nexo não deve sobrescrever alterações externas silenciosamente.

---

# 48. Jornada AT — Projeto alterado externamente durante edição

## Fluxo

```text id="n8q4ym"
Editor Has Unsaved State
↓
External Modification Detected
↓
Conflict
↓
Preserve Current State
↓
Show Options
```

Possíveis opções futuras:

- compare;
- reload;
- merge;
- discard local;
- keep local.

A implementação exata será definida pelo Change Tracking e Conflict Model.

---

# 49. Jornada AU — Falha durante salvamento

## Fluxo

```text id="y5m8kc"
Save
↓
Persistence Error
↓
Do Not Mark Saved
↓
Keep Recoverable State
↓
Show Error
↓
Offer Recovery Path
```

O sistema não deve perder silenciosamente uma edição porque uma operação de escrita falhou.

---

# 50. Jornada AV — Falha durante operação da IA

```text id="f3x9rp"
AI Task
↓
Execution
↓
Failure
↓
Capture State
↓
Show Partial Result
↓
Preserve Project
↓
Offer Retry / Review / Revert
```

---

# 51. Jornada AW — Atualizar Project Intelligence

O sistema deve ser capaz de reanalisar partes do projeto sem obrigatoriamente reconstruir toda a análise.

## Fluxo

```text id="j7m2vq"
Project Changed
↓
Identify Affected Areas
↓
Re-scan
↓
Update Model
↓
Update Graph
↓
Invalidate Stale Cache
```

---

# 52. Jornada AX — Reabrir após Git checkout

## Fluxo

```text id="p4k9nm"
Git Checkout
↓
Branch Changed
↓
Refresh Filesystem
↓
Invalidate Affected Intelligence
↓
Re-analyze
↓
Refresh Preview
↓
Refresh Editor
```

O Nexo não deve continuar apresentando informações da branch anterior como se ainda fossem válidas.

---

# 53. Jornada AY — Atualização de componente global

Quando uma versão global estiver disponível:

```text id="x8r5mv"
Global Component Update Available
↓
Identify Projects
↓
Check Compatibility
↓
Show Impact
↓
Choose Update
↓
Preview Diff
↓
Apply
↓
Validate
```

Atualização automática silenciosa não deve ser assumida.

---

# 54. Jornada AZ — Exportar projeto

## Fluxo

```text id="d6q2ks"
Project
↓
Export
↓
Choose Destination
↓
Prepare Files
↓
Validate
↓
Export
↓
Verify
```

O exportado deve continuar sendo um projeto utilizável fora do Nexo.

---

# 55. Jornada BA — Clonar projeto

## Fluxo

```text id="m9v3xc"
Select Project
↓
Clone
↓
Choose Destination
↓
Choose Git Strategy
↓
Copy / Clone
↓
Update Project Identity
↓
Scan
↓
Open New Project
```

O clone não deve compartilhar acidentalmente:

- secrets;
- identidade Git;
- dados exclusivos;
- configurações privadas;

do projeto de origem.

---

# 56. Jornada BB — Configurar IA

## Fluxo

```text id="q4y7mn"
AI Settings
↓
Select Provider
↓
Authenticate / Configure
↓
Test Connection
↓
Select Model
↓
Configure Permissions
↓
Save
```

O sistema deve deixar claro qual provider está ativo.

---

# 57. Jornada BC — Trocar provider de IA

```text id="v6m2rx"
AI Provider
↓
Select Different Provider
↓
Validate Configuration
↓
Test
↓
Activate
```

A troca não deve alterar o restante do projeto.

---

# 58. Jornada BD — Usar Luna

```text id="k8p4yz"
AI Provider
↓
Select Luna
↓
Validate Luna Bridge
↓
Connect
↓
Grant Required Permissions
↓
Run Task
```

A implementação específica da ponte será definida em Luna Integration.

---

# 59. Jornada BE — Pesquisa técnica pela IA

Quando uma tarefa depender de informação externa desconhecida ou potencialmente desatualizada:

```text id="r5x9qc"
Task
↓
Identify Missing Knowledge
↓
Check Local Documentation
↓
Check Project Context
↓
Search Official External Source
↓
Validate Version
↓
Update Plan
↓
Continue
```

A IA não deve preencher uma lacuna técnica com uma suposição apresentada como fato.

---

# 60. Jornada BF — Adicionar componente externo reutilizável

## Fluxo

```text id="c7m2wp"
Add Component
↓
Choose Custom Embed
↓
Define Identity
↓
Insert HTML/CSS/JS/iframe/etc.
↓
Define Placement
↓
Preview
↓
Save to Project
↓
Optional Save to Library
```

---

# 61. Jornada BG — Criar integração reutilizável

```text id="n3q8vf"
Integration Library
↓
New Integration
↓
Define Type
↓
Define Configuration
↓
Define Inputs
↓
Define Permissions
↓
Test
↓
Save
```

---

# 62. Jornada BH — Revisão antes de Commit

```text id="p8k4ym"
Git
↓
Changes
↓
Review Diff
↓
Inspect Files
↓
Run Validation
↓
Enter Commit Message
↓
Commit
```

O Nexo deve favorecer a revisão antes do commit.

---

# 63. Jornada BI — Estado inconsistente detectado

Se o Nexo detectar que seus modelos internos não correspondem ao projeto:

```text id="x5r7mq"
Detect Inconsistency
↓
Stop Unsafe Operation
↓
Report Inconsistency
↓
Refresh / Re-scan
↓
Rebuild Affected Context
↓
Resume
```

O sistema não deve continuar executando alterações complexas sobre contexto conhecido como obsoleto.

---

# 64. Jornada BJ — Viewer tentando modificar

```text id="m2v8kc"
Action Requested
↓
Authorization
↓
Denied
↓
Read-Only Explanation
```

Nenhuma API interna deve depender da UI para impedir a ação.

---

# 65. Jornada BK — Editor tentando executar comando

```text id="q9n4rx"
Terminal Action
↓
Authorization
↓
Denied
↓
Explain Required Permission
```

---

# 66. Jornada BL — Developer solicitando deploy de produção

Quando a política exigir aprovação:

```text id="c4y7mz"
Developer
↓
Deploy Production
↓
Permission Check
↓
Approval Required
↓
Create Approval Request
↓
Admin / Owner Approves
↓
Preflight
↓
Build
↓
Deploy
↓
Verify
```

---

# 67. Jornada BM — Auditoria

## Objetivo

Permitir consultar eventos relevantes.

## Fluxo

```text id="v8m3qp"
Audit
↓
Filter
↓
Date
User
Project
Action
Provider
Result
↓
Open Event
↓
Inspect Details
```

O sistema deve preservar a integridade dos registros.

---

# 68. Jornada BN — Recuperar projeto após erro

```text id="j5r9xc"
Project Error
↓
Inspect State
↓
Check Git
↓
Check Unsaved Changes
↓
Identify Last Known Good State
↓
Review Recovery Options
↓
Recover
↓
Validate
```

A estratégia exata dependerá da natureza do erro.

---

# 69. Jornada BO — Encerrar projeto

Quando o usuário sair do projeto:

```text id="q7m2vz"
Close Project
↓
Check Unsaved Changes
↓
Check Running Processes
↓
Warn if Needed
↓
Save / Discard / Cancel
↓
Close
```

O sistema não deve encerrar silenciosamente um projeto com alterações não salvas.

---

# 70. Jornada BP — Projeto com stack não suportado

```text id="x4n8mc"
Import
↓
Detection
↓
Unknown / Unsupported
↓
Explain
↓
Offer Manual Configuration
↓
Offer Custom Adapter if available
↓
Restricted Project Mode OR Cancel
```

O Nexo não deve fingir suporte.

---

# 71. Jornada BQ — Projeto parcialmente suportado

```text id="m9q5rp"
Import
↓
Detection
↓
Partial Support
↓
Show Supported Areas
↓
Show Unsupported Areas
↓
Open Project
```

O usuário deverá saber quais capacidades possuem limitações.

---

# 72. Jornada BR — Adicionar novo adapter

Fluxo conceitual futuro:

```text id="k3v7mx"
Adapter Development
↓
Define Adapter Contract
↓
Implement
↓
Validate
↓
Test Against Fixture Projects
↓
Register
↓
Detect
↓
Enable
```

---

# 73. Jornada BS — Fixture Project para adapter

Cada adapter importante deverá possuir projetos de referência que representem casos reais.

Fluxo:

```text id="r8m2qv"
Fixture Project
↓
Scan
↓
Detect
↓
Edit
↓
Build
↓
Test
↓
Validate
```

Esses fixtures deverão ser utilizados para reduzir regressões.

---

# 74. Jornada BT — Atualização do projeto pelo usuário fora do Nexo

```text id="p5x8mc"
External Tool
↓
Modify Project
↓
Nexo Detects Change
↓
Refresh Context
↓
Update Git Status
↓
Update Preview / Editor
```

O Nexo deve tratar ferramentas externas como parte válida do fluxo de desenvolvimento.

---

# 75. Jornada BU — Ciclo principal de trabalho

A jornada mais importante do produto pode ser resumida em:

```text id="g7m4zk"
OPEN PROJECT
      ↓
UNDERSTAND
      ↓
RUN
      ↓
PREVIEW
      ↓
EDIT
      ↓
VALIDATE
      ↓
REVIEW
      ↓
COMMIT
      ↓
PUSH
      ↓
DEPLOY
      ↓
VERIFY
```

A IA pode participar de diferentes pontos:

```text id="v2q9mx"
UNDERSTAND
EDIT
VALIDATE
REVIEW
```

mas não deve quebrar o fluxo de segurança.

---

# 76. Regras de experiência transversal

Todas as jornadas deverão manter:

## Contexto

O usuário deve saber:

- Workspace;
- Project;
- Environment;
- Branch;
- Provider relevante.

## Estado

O usuário deve saber se uma operação está:

- pending;
- running;
- success;
- failed;
- blocked;
- partially completed.

## Recuperação

Quando uma operação falhar, o sistema deve oferecer um caminho de recuperação apropriado.

## Rastreabilidade

Mudanças importantes devem possuir origem identificável.

## Transparência

O sistema deve explicar o suficiente para o usuário compreender o que está acontecendo sem exigir acesso direto aos logs técnicos em todas as situações.

---

# 77. Regras de implementação para agentes

Os agentes que implementarem qualquer jornada devem consultar:

1. Product Requirements;
2. Product Principles;
3. Core Invariants;
4. documento funcional da feature;
5. arquitetura correspondente;
6. contratos;
7. segurança;
8. testes;
9. documentação externa necessária.

Uma jornada não deve ser implementada apenas pela leitura deste documento.

Este documento define o **fluxo esperado**.

Os documentos especializados definem a **implementação correta**.

---

# 78. Critérios gerais de aceitação

Uma jornada será considerada corretamente implementada quando:

1. todas as etapas necessárias estiverem presentes;
2. permissões forem verificadas;
3. operações reais ocorrerem sobre o projeto;
4. estados forem atualizados corretamente;
5. falhas forem representadas corretamente;
6. alterações puderem ser rastreadas;
7. operações críticas possuírem proteção;
8. a jornada respeitar adapters;
9. a jornada respeitar Core Invariants;
10. os testes correspondentes forem aprovados.

---

# 79. Regra final

Os User Journeys descrevem a experiência operacional desejada do Nexo CMS.

Eles devem ser utilizados para verificar se as partes do produto realmente se encaixam como uma plataforma única.

> **O usuário não deve sentir que está usando dez ferramentas diferentes. Deve sentir que está trabalhando em um único ambiente que entende o projeto e acompanha seu ciclo completo.**