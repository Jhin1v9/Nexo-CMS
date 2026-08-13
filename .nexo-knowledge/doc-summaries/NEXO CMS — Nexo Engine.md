# NEXO CMS
## Nexo Engine

## 1. Propósito

O **Nexo Engine** é o núcleo lógico responsável por transformar o Nexo CMS de uma interface de administração em uma plataforma capaz de operar sobre projetos reais.

O Engine deve concentrar as capacidades de domínio do Nexo e fornecer uma base comum para:

- UI;
- API;
- CLI;
- AI Agents;
- automações;
- plugins;
- integrações;
- jobs internos.

O Engine não deve ser confundido com:

- Nexo CMS UI;
- Nexo Runtime;
- Project Intelligence;
- Adapter;
- AI Provider;
- Storage;
- Deployment Provider.

O Engine coordena e aplica regras de domínio.

---

# 2. Responsabilidade central

O Nexo Engine deve responder:

> **“O que o Nexo sabe fazer com um projeto?”**

Enquanto o Runtime responde:

> **“Como executar isso neste ambiente?”**

E o Adapter responde:

> **“Como essa operação deve ser traduzida para esta tecnologia?”**

E o AI Engine responde:

> **“Como utilizar inteligência para planejar e executar essa operação?”**

A separação conceitual deve permanecer clara.

---

# 3. Posição do Engine na arquitetura

O Engine ocupa a camada central do sistema:

```text id="sl9b8h"
             CONSUMERS
                 │
     ┌───────────┼────────────┐
     │           │            │
     UI          API         CLI
     │           │            │
     └───────────┼────────────┘
                 │
          AI / AUTOMATION
                 │
                 ▼
            NEXO ENGINE
                 │
      ┌──────────┼──────────┐
      │          │          │
   Project    Component    Git
   Services    Services   Services
      │          │          │
      ├──────────┼──────────┤
      │          │          │
      ▼          ▼          ▼
 Intelligence  Adapters   Providers
      │                     │
      └──────────┬──────────┘
                 ▼
              RUNTIME
```

A representação é conceitual.

A implementação física poderá utilizar processos, pacotes ou módulos diferentes, desde que as responsabilidades permaneçam separadas.

---

# 4. O Engine não é uma UI

O Engine não deve possuir dependência direta da interface visual.

Não deve depender de:

- componentes React da UI;
- páginas do CMS;
- estado de navegador;
- DOM;
- eventos de clique;
- Playwright para operações internas.

Se uma capacidade do Engine só puder ser executada através da UI, a arquitetura estará excessivamente acoplada.

---

# 5. O Engine não é o Runtime

O Engine não deve executar diretamente:

```text id="9x6krj"
fs.writeFile
child_process.spawn
git process
network request
```

como regra de arquitetura de alto nível.

Ele solicita capabilities ao Runtime ou às abstrações de infraestrutura apropriadas.

Exemplo:

```text id="5a4y4c"
Engine
↓
Filesystem Capability
↓
Runtime
↓
Operating System
```

---

# 6. O Engine não é o Adapter

O Engine não deve conter conhecimento profundo de:

- Next.js;
- Vue;
- Svelte;
- Tailwind;
- CSS Modules;
- ferramentas específicas.

Esse conhecimento pertence aos adapters.

Exemplo conceitual:

```text id="e9xqtd"
Engine:
"Create Component"

Adapter:
"Representar esse componente neste projeto como?"
```

---

# 7. O Engine não é o AI Engine

O Nexo Engine deve permanecer funcional mesmo sem provider de IA.

O AI Engine utiliza o Nexo Engine.

O contrário não deve ser obrigatório.

Exemplo:

```text id="4j7d5f"
Human
→ Engine
→ Operation

AI
→ AI Engine
→ Engine
→ Operation
```

---

# 8. O Engine não é Storage

Storage persiste dados.

O Engine coordena comportamentos.

O Engine pode utilizar Storage para metadata, estados e registros, mas não deve assumir que Storage é o projeto real.

---

# 9. O Engine não é Deployment

Deployment é uma capacidade de domínio acessada pelo Engine.

O Engine deve coordenar:

- preflight;
- build;
- deployment;
- verification;
- rollback;

utilizando os componentes apropriados.

---

# 10. Objetivos do Nexo Engine

O Engine deve fornecer:

1. operações de domínio consistentes;
2. regras centrais do produto;
3. validação de contexto;
4. aplicação de invariantes;
5. integração com adapters;
6. integração com Runtime;
7. integração com providers;
8. estados explícitos;
9. erros estruturados;
10. capacidades programáveis;
11. execução auditável;
12. composição de operações complexas.

---

# 11. Domínios do Engine

O Engine deve possuir, conceitualmente, os seguintes domínios:

```text id="zggvm4"
Project
Project Intelligence
Component
Media
Design
Responsive
Git
Runtime
AI
Integration
Workspace
Deployment
Plugin
Audit
```

A divisão física poderá variar.

As responsabilidades não devem desaparecer.

---

# 12. Project Domain

O Project Domain deve tratar operações relacionadas à identidade e ciclo de vida do projeto.

Capacidades conceituais:

```text id="x5n0r7"
project.create
project.import
project.open
project.read
project.update
project.analyze
project.clone
project.export
project.archive
project.remove
project.refresh
```

---

# 13. Project Domain não deve editar arquivos arbitrariamente

O Project Domain deve coordenar operações.

Alterações de arquivos devem passar por mecanismos apropriados:

```text id="w9d5q2"
Project Operation
↓
Adapter / Edit Strategy
↓
Runtime Filesystem
```

O Engine não deve utilizar replace textual indiscriminado como regra universal.

---

# 14. Project Intelligence Domain

O Engine deve integrar capacidades de compreensão do projeto.

Pode coordenar:

- scan;
- detection;
- model update;
- graph update;
- stale detection;
- refresh.

---

# 15. Project Context

O Engine deve conseguir produzir contexto necessário para operações.

Exemplo:

```text id="2h1g3x"
Project Context
├── Identity
├── Stack
├── Adapter
├── Files
├── Routes
├── Components
├── Assets
├── Git
├── Build
└── Environment
```

O contexto deve ser proporcional à operação.

---

# 16. Context Freshness

O Engine deve saber quando seu contexto está:

```text id="u5c9m8"
FRESH
STALE
UNKNOWN
INVALID
```

Uma operação complexa não deve prosseguir com contexto conhecido como stale quando isso puder causar alterações incorretas.

---

# 17. Project State

O Engine deve possuir acesso a estado suficiente para saber:

- alterações não salvas;
- working tree;
- build;
- preview;
- branch;
- deployment;
- análise.

Os estados podem ser independentes.

Não condensar todos em uma única enumeração quando isso perder informação importante.

---

# 18. Component Domain

O Component Domain deve tratar:

- descoberta;
- identidade;
- criação;
- edição;
- propriedades;
- variantes;
- compatibilidade;
- dependências;
- versionamento;
- promoção;
- publicação.

---

# 19. Component Operation

Uma operação de componente deve seguir, quando aplicável:

```text id="9hx4z2"
Resolve Project
↓
Resolve Component
↓
Resolve Adapter
↓
Validate
↓
Transform
↓
Persist
↓
Re-analyze
↓
Validate Result
```

---

# 20. Media Domain

O Media Domain deve coordenar:

- assets;
- metadata;
- references;
- upload;
- replacement;
- editing;
- optimization;
- cleanup.

---

# 21. Design Domain

O Design Domain deve coordenar operações sobre:

- colors;
- gradients;
- typography;
- spacing;
- radius;
- borders;
- shadows;
- tokens;
- themes.

A implementação concreta será delegada à estratégia adequada ao projeto.

---

# 22. Responsive Domain

O Responsive Domain deve coordenar:

- viewport;
- render;
- diagnosis;
- stress testing;
- overflow;
- text wrapping;
- comparison.

---

# 23. Git Domain

O Git Domain deve coordenar operações versionadas.

Capacidades:

```text id="l7g5c8"
git.status
git.init
git.branch
git.commit
git.push
git.pull
git.fetch
git.merge
git.rebase
git.stash
git.reset
git.revert
git.cherryPick
git.history
git.diff
```

O conjunto final será definido pelo Git specification.

---

# 24. Git não deve ser executado diretamente pelo Consumer

A UI, AI ou CLI não deve construir comandos Git próprios.

Preferência:

```text id="4ry7t9"
Consumer
↓
Git Domain
↓
Git Adapter / Git Service
↓
Runtime
```

Isso permite:

- autorização;
- auditoria;
- validação;
- tratamento uniforme de erros.

---

# 25. Runtime Domain

O Engine deve possuir acesso a capabilities de Runtime.

Exemplos:

```text id="z8q3m5"
filesystem.read
filesystem.write
filesystem.delete
process.start
process.stop
command.execute
build.run
preview.start
```

Essas capacidades devem passar pelos mecanismos de segurança correspondentes.

---

# 26. Runtime Capability vs Runtime Implementation

O Engine deve depender da capacidade:

> “Executar comando.”

e não da implementação física:

> “Node child_process.”

Isso mantém liberdade para futuras implementações de Runtime.

---

# 27. Integration Domain

O Integration Domain deve coordenar:

- external scripts;
- widgets;
- embeds;
- APIs;
- third-party services;
- custom code.

Integrações podem possuir credentials e secrets, portanto devem atravessar Security.

---

# 28. Deployment Domain

Deployment Domain deve coordenar:

```text id="j8p6y4"
Preflight
↓
Build
↓
Deploy
↓
Verification
↓
Rollback
```

A implementação específica depende do Deployment Provider.

---

# 29. Provider Model

O Engine deverá trabalhar com providers através de contratos.

Exemplos:

```text id="p6t1q0"
AI Provider
Deployment Provider
Git Remote Provider
Storage Provider
Authentication Provider
```

Providers não devem possuir autoridade sobre o domínio.

Eles implementam capacidades.

---

# 30. Provider failure

Uma falha de provider não deve destruir o estado local do projeto.

Exemplo:

```text id="n4x7c2"
Deployment Provider unavailable
```

não pode resultar automaticamente em:

```text id="uwc8rk"
Project unavailable
```

---

# 31. Workspace Domain

O Workspace Domain coordena:

- usuários;
- memberships;
- roles;
- permissions;
- projects;
- shared resources;
- policies.

O Workspace Domain não deve possuir conhecimento de detalhes de framework do projeto.

---

# 32. Security Integration

Toda operação do Engine potencialmente protegida deve passar por autorização.

Conceitualmente:

```text id="gd7o9w"
Consumer
↓
Authentication Context
↓
Authorization
↓
Policy
↓
Engine Capability
```

---

# 33. Authorization deve acontecer antes da operação

Quando uma operação puder ser negada antes da execução, a autorização deve ocorrer antes de:

- filesystem write;
- command execution;
- Git mutation;
- deploy;
- secret access.

Não executar primeiro e verificar depois.

---

# 34. Resource Scope

O Engine deve conhecer o escopo do recurso.

Exemplo:

```text id="r7c9m1"
Workspace
↓
Project
↓
Component
```

Isso permite que as políticas sejam avaliadas corretamente.

---

# 35. Engine Commands

O Nexo pode utilizar comandos internos para representar operações.

Exemplo:

```text id="q2k6v8"
CreateProjectCommand
UpdateComponentCommand
CommitProjectCommand
DeployProjectCommand
```

Isso é uma opção arquitetural.

Não deve ser implementado apenas porque o nome parece sofisticado.

A necessidade deve ser avaliada de acordo com a complexidade do domínio.

---

# 36. Engine Queries

Consultas podem utilizar interfaces próprias quando necessário.

Exemplos:

```text id="n5h1w9"
GetProject
GetProjectStatus
GetComponent
GetGitStatus
GetCapabilities
```

A separação entre commands e queries deve existir apenas quando gerar benefício real.

---

# 37. Synchronous vs Asynchronous Operations

Operações pequenas podem ser síncronas.

Operações demoradas devem poder ser assíncronas.

Exemplos:

```text id="w8g4m0"
Project Analysis
Build
AI Task
Deploy
Large Media Processing
```

Essas operações devem utilizar Jobs quando apropriado.

---

# 38. Engine Jobs

Um Job deve possuir:

```text id="z3m7k2"
Job ID
Type
Owner
Context
Status
Progress
Started At
Completed At
Result
Error
```

A implementação final pertence ao Job/Runtime specification.

---

# 39. Engine Events

O Engine pode emitir eventos de domínio.

Exemplos:

```text id="x6v2m9"
project.created
project.updated
component.created
component.updated
git.committed
build.completed
deployment.completed
ai.task.completed
```

Eventos devem possuir payloads definidos por contratos.

---

# 40. Events não substituem chamadas necessárias

Eventos devem ser utilizados quando:

- desacoplamento for desejável;
- processamento assíncrono fizer sentido;
- múltiplos consumidores precisarem ser notificados.

Não utilizar eventos somente para evitar uma chamada direta simples.

---

# 41. Engine Errors

Erros do Engine devem ser estruturados.

Categorias conceituais:

```text id="m4n8r3"
ValidationError
AuthorizationError
NotFoundError
ConflictError
UnsupportedError
AdapterError
RuntimeError
ProviderError
BuildError
GitError
DeploymentError
```

Os nomes técnicos finais serão definidos em Error Contracts.

---

# 42. Conflict Handling

O Engine deve reconhecer conflitos quando:

- projeto mudou externamente;
- contexto está stale;
- recurso foi atualizado por outro processo;
- branch mudou;
- versão do componente mudou.

Conflitos não devem ser resolvidos silenciosamente.

---

# 43. Validation

O Engine deve possuir validações de pré-condição.

Exemplo:

```text id="g8p4x1"
Update Component
↓
Project Exists
↓
Adapter Available
↓
Component Exists
↓
Permission
↓
Valid Input
↓
Execute
```

---

# 44. Post-Operation Validation

Após operações relevantes, o Engine deve executar validações de resultado quando apropriado.

Exemplo:

```text id="k5q9n3"
Write
↓
Read Back
↓
Parse
↓
Build / Test
↓
Confirm
```

A profundidade depende da operação.

---

# 45. Transactions

Quando uma operação envolver múltiplas modificações, o Engine deverá possuir estratégia de atomicidade ou recuperação apropriada.

Não assumir que todas as operações de filesystem são transacionais.

Exemplo:

```text id="n4y7c6"
Modify 5 files
```

Se o terceiro falhar, o sistema deve possuir estratégia definida.

---

# 46. Partial Failure

O Engine deve representar operações parcialmente concluídas.

Exemplo:

```text id="u6c3m8"
3 files succeeded
2 files failed
```

A operação não deve ser apresentada simplesmente como SUCCESS.

---

# 47. Idempotency

O Engine deve favorecer operações idempotentes quando apropriado.

Especialmente para:

- create;
- publish;
- deploy;
- jobs;
- webhooks.

Não assumir idempotência quando a operação possuir semântica naturalmente não idempotente.

---

# 48. Audit Integration

Operações relevantes devem emitir informação necessária para auditoria.

O Engine deve possuir contexto como:

```text id="f1n8q4"
Actor
Project
Workspace
Operation
Resource
Result
Timestamp
```

---

# 49. Observability Integration

Operações devem poder gerar:

- logs;
- metrics;
- events;
- traces quando aplicável.

A implementação específica pertence ao Observability layer.

---

# 50. Engine and AI

A IA deve chamar o Engine através de:

- AI Tools;
- Domain Capabilities;
- Application Services.

Não deve possuir acesso direto indiscriminado ao filesystem quando uma capacidade do Engine puder encapsular a operação com segurança.

---

# 51. Engine and CLI

A CLI deve chamar capacidades do Engine.

Não deve reimplementar:

```text id="8n4vca"
Project Model
Git rules
Security policies
```

---

# 52. Engine and UI

A UI deve solicitar operações ao Engine através das APIs/aplicações apropriadas.

Exemplo:

```text id="7x2kq3"
Save Component
↓
UI
↓
Application Service
↓
Component Domain
↓
Adapter
↓
Runtime
```

---

# 53. Engine and Plugins

Plugins devem utilizar contratos públicos ou internos definidos para extensão.

Não devem acessar estruturas internas arbitrárias.

---

# 54. Engine and Adapters

O Engine deve selecionar ou receber o Adapter correto para o projeto.

A seleção deve considerar:

- stack;
- versão;
- configuração;
- compatibilidade;
- estado.

---

# 55. Adapter Failure

Se o Adapter estiver:

```text id="0q2xkm"
Unavailable
Unsupported
Partial
Error
```

o Engine deve respeitar esse estado.

Não deve executar uma operação como se o Adapter estivesse completamente disponível.

---

# 56. Engine and Project Model Freshness

Antes de operações complexas, o Engine deve considerar se o Project Model está atualizado.

Se estiver stale:

```text id="s7b1m8"
Refresh
Re-analyze
Reconcile
```

ou bloquear a operação quando necessário.

---

# 57. Engine and external modifications

Alterações feitas fora do Nexo devem ser detectadas quando possível.

O Engine deve atualizar seu contexto antes de modificar novamente o projeto.

---

# 58. Engine and Git state

Antes de determinadas operações, o Engine pode precisar conhecer:

- branch;
- working tree;
- merge state;
- conflicts.

Não deve assumir Git clean quando não verificou.

---

# 59. Engine and deployment state

Antes de deploy:

```text id="q9m4t6"
Project State
Build State
Git Policy
Environment
Provider
Authorization
```

devem ser considerados conforme as regras do Deployment Domain.

---

# 60. Engine and external research

O Engine em si não deve depender de pesquisas online em tempo de execução para operações normais.

Pesquisa externa é responsabilidade da implementação, desenvolvimento, adapters ou AI context quando necessária.

O produto em produção não deve assumir internet para descobrir como um framework funciona.

---

# 61. Version Awareness

O Engine deve trabalhar com o contexto de versão fornecido pelo Project Intelligence e Adapter.

Não assumir comportamento universal quando a versão influencia a operação.

---

# 62. Engine extensibility

O Engine deve permitir adicionar novos domínios através de boundaries claras.

Entretanto, uma nova feature não deve automaticamente entrar no Core.

Avaliar:

- domínio;
- extension;
- plugin;
- provider;
- adapter.

---

# 63. Core Stability

O Core Engine deve ser mantido relativamente pequeno.

Quanto mais uma capacidade depender de:

- fornecedor externo;
- framework;
- projeto específico;
- serviço opcional;

mais cuidadosamente deve ser avaliado se ela pertence ao Core.

---

# 64. Não criar abstração antecipada sem necessidade

O Engine deve possuir abstrações suficientes para resolver problemas reais.

Não criar camadas apenas porque parecem arquiteturalmente sofisticadas.

Toda abstração deve possuir:

- responsabilidade;
- consumidor;
- contrato;
- motivo.

---

# 65. Não criar Mega-Engine

O Nexo Engine não deve se tornar uma classe ou serviço gigante contendo:

- todos os domínios;
- todas as regras;
- todos os providers;
- todos os adapters.

A divisão deve ser modular.

---

# 66. Responsabilidade única

Cada serviço ou módulo do Engine deve possuir responsabilidade clara.

Exemplo:

```text id="6k7m3p"
ProjectService
ComponentService
MediaService
GitService
DeploymentService
```

A estrutura final dependerá das necessidades reais.

---

# 67. Domain Integrity

O Engine deve proteger invariantes do produto.

Uma operação não deve ser considerada válida apenas porque:

```text id="2t4r9m"
API request valid
```

Ela também deve respeitar:

- Core Invariants;
- project state;
- authorization;
- adapter;
- dependencies;
- policies.

---

# 68. Programmatic Parity Requirement

Toda capacidade do Engine que for disponibilizada a humanos através da UI e que for tecnicamente apropriada para automação deve possuir caminho programático correspondente.

Exemplo:

```text id="k0q8m2"
UI:
Create Component

AI:
component.create

CLI:
nexo component create
```

Os três devem convergir para o mesmo domínio.

---

# 69. Agent Capability Requirement

Agentes de IA devem poder consumir o Engine em nível de capacidade.

A IA não deve precisar:

- interpretar menus;
- clicar;
- extrair texto do DOM;
- usar Playwright;
- simular teclado;

quando uma capacidade programática oficial existir.

---

# 70. Human vs Agent

A diferença conceitual é:

```text id="f4n7x2"
Human:
Interactive consumer

Agent:
Programmatic consumer
```

Não:

```text id="m5k1q9"
Human:
Full system access

Agent:
Restricted imitation
```

As diferenças de acesso devem ser definidas por Security, Permissions e Policies.

---

# 71. Entry Point discoverability

O Nexo deverá documentar e, quando possível, tornar descobríveis os entry points.

Um agente deve conseguir descobrir:

- capacidade;
- parâmetros;
- autorização;
- resultado;
- erros;
- status;
- versionamento.

---

# 72. Engine API stability

Se uma capacidade for exposta como API pública, alterações incompatíveis deverão possuir estratégia de versionamento.

---

# 73. Engine and tests

Toda capacidade crítica deve possuir testes em nível de domínio.

Exemplos:

```text id="w7m3k8"
Permission denied
Project not found
Adapter unavailable
Runtime failure
External modification
Successful operation
Partial failure
```

---

# 74. Engine and fixture projects

Operações específicas de stack devem ser testadas contra fixtures representativos.

Isso será especialmente importante para:

- Components;
- Pages;
- Styles;
- Build;
- Routes.

---

# 75. Engine and documentation

Cada capability relevante deve possuir documentação correspondente.

A documentação deve indicar:

- objetivo;
- entrada;
- saída;
- dependências;
- autorização;
- erros;
- estado;
- validação;
- entry points.

---

# 76. Research Requirement

Quando houver dúvida sobre uma biblioteca, API, framework ou infraestrutura utilizada pelo Engine, o agente deverá consultar documentação oficial atual antes de implementar.

Prioridade:

```text id="9u3e5b"
Official Documentation
Official Specification
Official Repository
Primary Technical Source
```

Não inventar comportamento de terceiros.

---

# 77. Regra para K3 Swarm

Antes de implementar qualquer parte do Nexo Engine, o agente deve:

1. ler este documento;
2. ler Core Architecture;
3. identificar o domínio responsável;
4. ler o documento específico do domínio;
5. ler Core Invariants;
6. ler Security/Permissions;
7. ler contratos afetados;
8. verificar entry points programáticos;
9. verificar estados e erros;
10. pesquisar documentação externa quando necessário.

O agente não deve transformar uma escolha de implementação local em uma mudança na arquitetura do Engine sem registrar a decisão.

---

# 78. Critérios de aceitação

O Nexo Engine será considerado arquiteturalmente adequado quando:

1. possuir boundaries claras;
2. não depender da UI;
3. não depender de Playwright;
4. permitir acesso programático;
5. permitir acesso por IA;
6. respeitar authorization;
7. utilizar adapters para especificidades tecnológicas;
8. utilizar Runtime para execução;
9. preservar Source Project;
10. integrar Git;
11. integrar Component System;
12. integrar Media;
13. integrar AI;
14. integrar Deployment;
15. tratar estados;
16. tratar erros;
17. suportar partial failure;
18. possuir auditoria;
19. permitir testes de domínio;
20. continuar extensível.

---

# 79. Regra final

O Nexo Engine é o núcleo que transforma a visão do Nexo CMS em capacidades reais.

Ele deve permitir que diferentes consumidores utilizem o mesmo produto sem que cada consumidor precise reinventar suas próprias regras.

A arquitetura desejada é:

```text id="qv7z1p"
              NEXO ENGINE
                   │
       ┌───────────┼───────────┐
       │           │           │
     HUMAN         AI        AUTOMATION
       │           │           │
       └───────────┼───────────┘
                   │
            DOMAIN CAPABILITIES
                   │
       ┌───────────┼───────────┐
       │           │           │
    ADAPTER      RUNTIME      PROVIDERS
       │           │           │
       └───────────┼───────────┘
                   │
              REAL PROJECT
```

> **O Nexo Engine não deve ser a interface do produto. Deve ser a capacidade do produto.**