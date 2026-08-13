# NEXO CMS
## Core System Architecture

## 1. Propósito

Este documento define a arquitetura estrutural do Nexo CMS em nível de sistema.

Seu objetivo é estabelecer:

- quais são os principais subsistemas;
- quais responsabilidades pertencem a cada subsistema;
- como os subsistemas se comunicam;
- quais dependências são permitidas;
- quais responsabilidades não devem ser misturadas;
- como UI, API, CLI, IA, plugins e automações acessam o mesmo domínio;
- onde ficam Runtime, Project Intelligence, Adapters, Git, Components, Media, AI e Deployment.

Este documento não congela tecnologias específicas sem justificativa.

Quando uma decisão depender de uma tecnologia atual, o agente responsável deverá pesquisar documentação oficial e registrar a decisão no documento apropriado.

---

# 2. Princípio estrutural

O Nexo deve ser construído como uma plataforma de domínio com múltiplos consumidores.

A arquitetura conceitual é:

```text
                         NEXO CMS
                            │
                      EXPERIENCE LAYER
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
         UI                API              CLI
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                     AGENT / AI LAYER
                            │
                            ▼
                    APPLICATION LAYER
                            │
                  DOMAIN CAPABILITIES
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   Project Services   Component Services   Git Services
          │                 │                 │
          ├──────────┬──────┴──────┬──────────┤
          ▼          ▼             ▼          ▼
     Project      Media        Deployment   AI Services
    Intelligence
          │
          ▼
       ADAPTERS
          │
          ▼
       RUNTIME
          │
          ├── Filesystem
          ├── Processes
          ├── Terminal
          ├── Build
          ├── Preview
          └── External Environment
```

A representação acima é conceitual.

A implementação poderá dividir esses elementos em processos ou pacotes diferentes, desde que preserve suas responsabilidades e contratos.

---

# 3. Regra principal de arquitetura

Nenhuma interface deve ser a dona da lógica de domínio.

O seguinte é proibido como arquitetura principal:

```text
UI
↓
UI-specific business logic
↓
filesystem
```

Também é proibido:

```text
AI
↓
AI-specific implementation
↓
filesystem
```

ou:

```text
CLI
↓
CLI-specific implementation
↓
Git
```

A preferência é:

```text
Consumer
↓
Application / Domain Capability
↓
Infrastructure / Adapter / Runtime
```

---

# 4. Nexo Domain

O domínio representa as capacidades que o Nexo oferece.

Exemplos:

- Project;
- Component;
- Media;
- Git;
- Runtime;
- AI;
- Deployment;
- Workspace;
- Integration.

O domínio não deve depender desnecessariamente da UI.

---

# 5. Domain Capability

Uma Domain Capability representa uma operação real que o Nexo consegue executar.

Exemplos:

```text
project.analyze
project.create
project.read
project.write

component.create
component.update
component.publish

git.status
git.commit
git.push

runtime.execute
runtime.build

ai.task
ai.plan
ai.validate

deployment.preflight
deployment.deploy
deployment.verify
```

A nomenclatura final e os contratos deverão ser definidos nos documentos de API.

---

# 6. Application Layer

A Application Layer coordena operações completas utilizando capacidades de domínio.

Ela deve:

- receber contexto;
- validar requisitos;
- consultar autorização;
- coordenar serviços;
- produzir resultado;
- registrar eventos quando aplicável.

Ela não deve conter conhecimento específico de uma tecnologia de projeto que deveria pertencer a um Adapter.

---

# 7. Consumer Layers

O Nexo deve possuir múltiplos consumidores:

```text
Human UI
Programmatic API
CLI
AI Agents
Automation
Plugins
Internal Jobs
```

Todos devem convergir para Application/Domain capabilities apropriadas.

---

# 8. UI

A UI deve fornecer:

- visualização;
- interação;
- edição;
- aprovação;
- exploração;
- diagnóstico;
- configuração.

A UI não deve possuir uma implementação independente das operações centrais do domínio quando existir serviço correspondente.

---

# 9. API

A API deve fornecer acesso programático às capacidades do Nexo.

Ela será fundamental para:

- AI;
- CLI;
- automações;
- integrações;
- ferramentas externas.

A API não deve ser criada como cópia da UI.

Ela deve expor operações do domínio.

---

# 10. CLI

A CLI, caso implementada, deve ser outro consumidor das capacidades do Nexo.

Exemplo conceitual:

```text
nexo project analyze
nexo git status
nexo git commit
nexo build
nexo deploy
```

A CLI não deve implementar sua própria lógica de projeto.

---

# 11. AI Agents

Agentes de IA são consumidores de primeira classe.

Eles devem utilizar:

- API;
- Agent Tools;
- CLI;
- SDK;
- mecanismos internos apropriados.

Não devem precisar usar Playwright para controlar operações internas quando houver entry point programático equivalente.

---

# 12. Programmatic Control Plane

O Nexo deve possuir uma camada de controle programático.

Ela permite que:

```text
Human
AI
CLI
Automation
Plugin
```

acessem as mesmas capacidades do domínio.

A autorização deve ser diferente quando necessário.

A capacidade estrutural não deve ser artificialmente limitada por origem.

---

# 13. Authorization Boundary

Toda operação sensível deve passar por autorização.

Conceitualmente:

```text
Consumer
↓
Authentication
↓
Authorization
↓
Policy
↓
Application Capability
↓
Execution
```

Nenhum consumidor deve conseguir contornar essa fronteira.

---

# 14. Project Layer

O Project Layer representa operações específicas relacionadas aos projetos administrados.

Responsabilidades incluem:

- criar;
- importar;
- abrir;
- analisar;
- atualizar;
- clonar;
- exportar;
- arquivar;
- remover;
- consultar estado.

---

# 15. Project Intelligence Layer

Project Intelligence é responsável por compreender o projeto.

Responsabilidades:

- scanner;
- stack detection;
- route detection;
- component detection;
- style detection;
- asset detection;
- build detection;
- dependency analysis;
- Project Model;
- Project Graph.

Project Intelligence não deve executar alterações arbitrárias.

Seu papel principal é compreender e representar.

---

# 16. Project Model

O Project Model deve servir como representação intermediária.

Ele permite que:

```text
Nexo Concept
```

seja relacionado a:

```text
Project Implementation
```

O Project Model não deve substituir os arquivos reais.

---

# 17. Project Graph

O Project Graph representa relações.

Pode incluir:

```text
Page
→ Component
→ Asset
→ Style
→ Dependency
```

ou:

```text
Route
→ Page
→ Layout
```

O Graph deve ser utilizado quando relações estruturais forem necessárias para compreender impacto.

---

# 18. Adapter Layer

Adapters traduzem entre Nexo e tecnologias externas do projeto.

Exemplos:

```text
Next.js Adapter
React Adapter
Vue Adapter
Svelte Adapter
Astro Adapter
HTML/CSS/JS Adapter
Tailwind Adapter
CSS Modules Adapter
```

---

# 19. Adapter não é Domain Service

O Adapter não deve possuir responsabilidade por políticas gerais do Nexo.

Ele deve fornecer conhecimento específico da tecnologia.

Exemplo:

```text
Domain:
"Create Component"

Adapter:
"Como esse componente deve ser representado neste projeto?"
```

---

# 20. Adapter Responsibilities

Um Adapter pode ser responsável por:

- detectar;
- localizar;
- interpretar;
- transformar;
- criar;
- atualizar;
- validar;
- executar operações específicas do stack.

A capacidade exata dependerá do contrato de Adapter.

---

# 21. Runtime Layer

Runtime é a camada que possui acesso operacional ao ambiente.

Responsabilidades:

- filesystem;
- processes;
- shell;
- command execution;
- development server;
- build;
- preview;
- ambiente;
- ferramentas locais.

---

# 22. Runtime não deve possuir lógica de produto excessiva

Runtime deve saber:

> “como executar.”

Não deve decidir:

> “qual alteração o produto deseja.”

Exemplo:

```text
Project Service:
"Preciso executar build."

Runtime:
"Eu consigo executar o build solicitado."
```

---

# 23. Filesystem Boundary

Operações de arquivo devem passar por uma abstração apropriada.

Conceitualmente:

```text
Project Service
↓
Filesystem Capability
↓
Runtime
↓
Operating System
```

Isso permite que o Nexo funcione em ambientes diferentes sem alterar o domínio.

---

# 24. Process Boundary

Processos devem possuir:

- identificação;
- estado;
- stdout/stderr;
- exit code;
- lifecycle.

O Runtime deve possuir controle adequado sobre esses processos.

---

# 25. Command Execution Boundary

Comandos devem ser executados através de um mecanismo controlado.

O sistema deve conseguir aplicar:

- autorização;
- policy;
- logging;
- timeout;
- cancellation;
- result capture.

---

# 26. Git Layer

Git deve possuir seus próprios serviços.

Responsabilidades:

- repository;
- branch;
- commit;
- push;
- pull;
- fetch;
- merge;
- rebase;
- revert;
- reset;
- stash.

Git não deve estar embutido na UI.

---

# 27. Git Provider vs Git Engine

O Nexo deve diferenciar:

```text
Git Engine
```

de:

```text
Remote Provider
```

Git Engine representa operações Git.

GitHub, GitLab ou outros serviços representam providers remotos.

---

# 28. Component Layer

Component Layer representa o sistema de componentes.

Responsabilidades:

- Component Model;
- Component Schema;
- Props;
- Slots;
- Variants;
- compatibility;
- dependencies;
- versioning;
- promotion.

---

# 29. Component Studio

O Component Studio deve consumir o Component Layer.

Ele não deve criar sua própria representação incompatível de componentes.

---

# 30. Component Library

A biblioteca deve existir como serviço.

Ela deve permitir:

- armazenar;
- localizar;
- versionar;
- validar;
- publicar;
- consumir componentes.

---

# 31. Media Layer

Media Layer administra assets.

Responsabilidades:

- index;
- metadata;
- upload;
- editing;
- optimization;
- replacement;
- references;
- cleanup.

---

# 32. Design Layer

Design Layer trabalha sobre:

- colors;
- gradients;
- typography;
- spacing;
- borders;
- radius;
- shadows;
- themes;
- tokens.

A implementação deve utilizar o Adapter apropriado para modificar o projeto real.

---

# 33. Responsive Layer

Responsive Layer deve trabalhar com:

- viewport;
- preview;
- diagnostics;
- stress tests;
- overflow;
- text wrapping;
- visual comparison.

---

# 34. AI Layer

A AI Layer deve separar:

```text
AI Engine
AI Provider
AI Context
AI Tools
AI Tasks
AI Policies
AI Execution
```

Não misturar o provider com a lógica de produto.

---

# 35. AI Provider

Provider representa o modelo ou serviço de IA.

Exemplos:

```text
Kimi
Luna
OpenAI
Anthropic
Gemini
Local Model
Custom API
```

O Provider deve respeitar o contrato do Nexo.

---

# 36. AI Engine

AI Engine coordena:

- contexto;
- planejamento;
- ferramentas;
- execution;
- validation;
- reporting.

O AI Engine não deve assumir uma única IA.

---

# 37. AI Tools

Tools são capacidades programáticas disponíveis para a IA.

Exemplo:

```text
project.read
file.read
file.write
git.status
git.commit
runtime.execute
build.run
component.create
media.list
deployment.deploy
```

Tools devem chamar capacidades reais do Nexo.

Não devem duplicar domínio.

---

# 38. Luna Integration

Luna deve entrar no AI Provider/Agent Layer.

A integração deve permitir que Luna utilize o Nexo sem modificar o Core para cada operação da Luna.

---

# 39. Integration Layer

Integrações externas devem existir em uma camada própria.

Exemplos:

- WhatsApp;
- Maps;
- analytics;
- forms;
- external scripts;
- widgets;
- APIs.

---

# 40. Deployment Layer

Deployment deve possuir uma camada própria para:

- preflight;
- build coordination;
- deploy;
- verification;
- rollback.

Providers devem permanecer intercambiáveis.

---

# 41. Workspace Layer

Workspace coordena:

- users;
- roles;
- permissions;
- projects;
- global components;
- shared resources;
- policies.

Não deve possuir conhecimento profundo de implementação de framework.

---

# 42. Storage Layer

Storage é responsável por persistir dados próprios do Nexo.

Pode conter:

- metadata;
- users;
- memberships;
- projects metadata;
- component registry;
- media registry;
- snapshots;
- audit;
- configuration.

Storage do Nexo não substitui o filesystem do Source Project.

---

# 43. Source Project vs Nexo Storage

Esta separação é obrigatória.

```text
Source Project
→ código e recursos reais do cliente

Nexo Storage
→ informações necessárias para o funcionamento do Nexo
```

Não misturar os dois conceitos.

---

# 44. Event Layer

O Nexo deve possuir um sistema de eventos para comunicação entre partes quando necessário.

Eventos podem representar:

```text
project.updated
component.created
git.committed
build.completed
deployment.completed
ai.task.completed
```

Eventos não devem ser usados para esconder dependências obrigatórias ou substituir chamadas síncronas quando uma chamada direta for mais apropriada.

---

# 45. Job Layer

Operações longas podem utilizar Jobs.

Exemplos:

- scan;
- build;
- AI task;
- deployment;
- large upload.

Jobs devem possuir:

- ID;
- status;
- result;
- error;
- owner/context;
- lifecycle.

---

# 46. Application Orchestration

Operações complexas podem ser orquestradas pela Application Layer.

Exemplo:

```text
AI Request
↓
Load Project Context
↓
Authorization
↓
Plan
↓
Modify
↓
Build
↓
Test
↓
Diff
↓
Commit
```

Cada etapa deve utilizar serviços correspondentes.

---

# 47. Não criar um Mega-Service

O Nexo não deve possuir um único serviço com responsabilidade por:

- Project;
- Git;
- AI;
- Media;
- Deploy;
- Workspace.

Responsabilidades devem permanecer separadas.

---

# 48. Não criar microserviços prematuramente

Separar responsabilidades conceitualmente não significa obrigatoriamente criar dezenas de processos ou serviços físicos.

A implementação inicial pode utilizar módulos bem definidos dentro de um mesmo deployment quando isso reduzir complexidade.

A separação física deve ser decidida por requisitos reais de:

- isolamento;
- segurança;
- escalabilidade;
- deployment;
- performance.

---

# 49. Core Module Boundaries

As fronteiras conceituais mínimas devem existir mesmo que inicialmente sejam implementadas dentro de um monorepo ou processo:

```text
Project
Project Intelligence
Adapters
Runtime
Git
Components
Media
Design
Responsive
AI
Workspace
Security
Deployment
Integrations
```

---

# 50. Dependency Direction

A direção preferencial das dependências é:

```text
UI / API / CLI / AI
↓
Application / Domain
↓
Domain Services
↓
Contracts
↓
Adapters / Infrastructure / Runtime
```

Infrastructure não deve depender da UI.

Adapter não deve depender da UI.

Runtime não deve depender da UI.

---

# 51. Circular Dependencies

Dependências circulares entre domínios devem ser evitadas.

Se duas partes precisarem conversar:

- utilizar contrato;
- evento;
- interface;
- service boundary apropriada.

Não resolver ciclos simplesmente importando módulos mutuamente.

---

# 52. Contract First

Quando dois módulos dependerem fortemente um do outro, o contrato deve ser definido antes da implementação.

Exemplos:

- AI ↔ Project;
- Component ↔ Adapter;
- Deployment ↔ Runtime;
- UI ↔ Application;
- Plugin ↔ Core.

---

# 53. Programmatic API First-Class

A arquitetura deverá garantir que operações importantes tenham uma representação programática.

Não significa que toda função interna precise virar API pública.

Significa que capacidades de domínio destinadas a consumidores externos devem possuir contratos apropriados.

---

# 54. Internal vs External API

O Nexo deverá diferenciar:

```text
Internal Contract
External/Public Contract
```

Uma função utilizada internamente não precisa ser exposta externamente.

Quando uma capacidade for exposta, deve possuir segurança, versionamento e contrato próprios.

---

# 55. API Gateway / Entry Point

A implementação poderá possuir uma camada de entrada que receba requisições programáticas e faça:

- authentication;
- validation;
- authorization;
- routing;
- rate limiting;
- audit;
- execution dispatch.

A tecnologia específica será definida posteriormente.

---

# 56. Agent Entry Point

Agentes devem possuir entry points próprios, podendo utilizar:

- API;
- CLI;
- Agent Tools;
- SDK.

A implementação pode utilizar um ou vários mecanismos.

O requisito é que agentes não precisem simular interação humana para controlar o Nexo.

---

# 57. Capability Discovery

A arquitetura deverá possuir mecanismo para informar consumidores programáticos sobre capacidades disponíveis.

O mecanismo deverá respeitar:

- identity;
- permissions;
- project state;
- provider availability;
- environment.

---

# 58. Long-Running Operations

Operações longas devem poder ser executadas como Jobs quando apropriado.

Exemplo:

```text
POST task
↓
Job ID
↓
GET status
↓
GET result
```

Ou mecanismo equivalente.

---

# 59. Cancellation

Jobs e operações longas devem ser canceláveis quando tecnicamente possível.

Cancellation deve possuir estados explícitos.

---

# 60. Idempotency

Operações que podem ser repetidas involuntariamente devem possuir estratégia de idempotência quando aplicável.

Isso é particularmente importante para:

- create;
- deploy;
- publish;
- Git operations;
- webhooks.

---

# 61. Audit Boundary

Operações relevantes devem gerar eventos de auditoria em uma fronteira centralizada.

Isso evita que cada interface crie sua própria forma de histórico.

---

# 62. Error Boundary

Erros devem permanecer estruturados entre camadas.

Conceitualmente:

```text
Infrastructure Error
↓
Adapter / Runtime Error
↓
Domain Error
↓
Application Error
↓
API / UI representation
```

Não expor stack traces sensíveis diretamente para usuários.

---

# 63. Configuration Boundary

Configurações devem ter ownership claro:

```text
Platform
Workspace
Project
Environment
Provider
User
```

O sistema não deve resolver conflitos de configuração silenciosamente.

---

# 64. Secrets Boundary

Secrets devem permanecer fora de:

- logs;
- diffs;
- respostas da IA;
- metadata não protegida;
- UI desnecessária.

Apenas capacidades autorizadas devem acessar os valores.

---

# 65. External Network Boundary

Acesso à internet por:

- AI;
- plugins;
- integrations;
- runtime;

deve possuir políticas próprias.

Não assumir acesso irrestrito.

---

# 66. Plugin Boundary

Plugins devem operar através de contratos e permissões.

Plugin code não deve assumir acesso direto ao Core interno.

---

# 67. Provider Boundary

Providers devem implementar contratos claros.

Exemplo:

```text
AI Provider
Deployment Provider
Git Remote Provider
```

Trocar provider não deve exigir reescrever a Domain Layer.

---

# 68. Adapter Boundary

Adapters devem encapsular conhecimento específico do projeto.

O Core não deve importar diretamente arquivos específicos de um framework.

---

# 69. Persistence Boundary

Domain Services não devem depender diretamente de detalhes físicos de banco ou filesystem quando uma abstração é apropriada.

A implementação deve permitir evolução do Storage.

---

# 70. Caching Boundary

Cache é otimização.

Nunca deve ser tratado como fonte primária de verdade quando o source real estiver disponível.

Quando cache estiver desatualizado:

```text
Invalidate
↓
Refresh
```

não inventar resultado.

---

# 71. Reconciliation Boundary

Quando:

```text
Source Project
Nexo Model
Git
Preview
Deployment
```

divergirem, o sistema deverá possuir mecanismos de reconciliação.

---

# 72. Security Boundary

Security deve ser transversal, mas não espalhar regras inconsistentes.

Deve existir uma autoridade clara para:

- identity;
- authorization;
- policy;
- secret access;
- audit.

---

# 73. Observability Boundary

Logs, metrics e events devem possuir contexto suficiente para:

- Workspace;
- Project;
- User;
- Agent;
- Job;
- Provider.

---

# 74. Testing Architecture

Cada boundary importante deve possuir testes.

Exemplos:

```text
Project tests
Adapter tests
Runtime tests
Contract tests
API tests
AI tool tests
Git tests
Component tests
Deployment tests
Security tests
```

---

# 75. Adapter Test Fixtures

Cada adapter importante deve possuir projetos de referência.

O teste deve utilizar projetos reais ou fixtures representativas.

A suite deve verificar:

- detection;
- analysis;
- editing;
- creation;
- build;
- validation.

---

# 76. Contract Testing

Contratos entre:

- Core;
- Adapter;
- AI;
- Runtime;
- Plugin;
- Deployment;

devem possuir testes de compatibilidade.

---

# 77. Architecture Decision Rule

Quando uma decisão puder alterar uma boundary, ela deve ser documentada antes da implementação.

Exemplos:

- mover Runtime para processo separado;
- alterar protocolo da API;
- criar novo provider model;
- alterar Project Model;
- alterar Adapter Contract.

---

# 78. Research Rule

Quando a decisão arquitetural depender de tecnologia externa, o agente deve consultar fontes atuais e confiáveis.

Exemplos:

- runtime capabilities;
- browser APIs;
- filesystem security;
- GitHub API;
- Vercel API;
- Hostinger deployment;
- authentication;
- AI provider APIs;
- framework internals.

Preferência:

```text
Official Documentation
↓
Official Specifications
↓
Official Repository
↓
Primary Technical Sources
```

---

# 79. Version Awareness

A arquitetura deve levar em consideração que:

- frameworks mudam;
- APIs mudam;
- providers mudam;
- Node muda;
- package managers mudam.

Qualquer comportamento dependente de versão precisa ser investigado antes de implementação.

---

# 80. Portability

O projeto deve permanecer utilizável fora do Nexo.

A arquitetura do Nexo não deve inserir dependências obrigatórias no projeto apenas para facilitar a própria implementação.

---

# 81. Failure Isolation

Uma falha em:

```text
AI Provider
```

não deve inutilizar:

```text
Git
Editor
Project Files
```

Uma falha em:

```text
Deployment Provider
```

não deve destruir:

```text
Local Project
```

Uma falha de:

```text
Plugin
```

não deve comprometer o Core.

---

# 82. Graceful Degradation

Quando uma capacidade não estiver disponível, o Nexo deve continuar funcionando onde possível.

Exemplo:

```text
AI Provider unavailable
↓
Manual editing still available
```

ou:

```text
Deployment provider unavailable
↓
Local project still available
```

---

# 83. No Hidden Coupling

Não criar dependências invisíveis em que:

```text
Component Studio
```

exige secretamente:

```text
Deployment Provider
```

ou:

```text
Editor
```

precisa:

```text
AI Provider
```

para funcionar.

Dependências devem ser explícitas.

---

# 84. Architecture Test

Uma futura implementação deve permitir responder claramente:

```text
Quem é responsável por esta operação?
Onde ela executa?
Qual contrato utiliza?
Quem autoriza?
Qual adapter conhece a tecnologia?
Qual runtime executa?
Qual estado resulta?
Como a operação é auditada?
Como a operação é revertida?
```

Se não for possível responder, a boundary provavelmente está inadequadamente definida.

---

# 85. Regra para o K3 Swarm

Antes de implementar qualquer módulo, o agente deve:

1. localizar a responsabilidade do módulo;
2. verificar esta arquitetura;
3. abrir a especificação específica do domínio;
4. verificar contratos;
5. verificar Core Invariants;
6. verificar Security;
7. verificar dependências;
8. verificar entry points programáticos;
9. pesquisar fontes externas quando necessário;
10. implementar somente dentro das boundaries definidas.

O agente não deve mover responsabilidade de um módulo para outro apenas porque a implementação local ficou mais fácil.

Se precisar alterar uma boundary, isso deve ser tratado como decisão arquitetural.

---

# 86. Critérios de aceitação

A arquitetura será considerada coerente quando:

1. UI não possuir lógica exclusiva de domínio;
2. API não duplicar Domain Logic;
3. CLI não duplicar Domain Logic;
4. AI não duplicar Domain Logic;
5. Runtime permanecer separado de Product Logic;
6. Adapters encapsularem especializações tecnológicas;
7. Git possuir boundary própria;
8. Components possuírem boundary própria;
9. Media possuir boundary própria;
10. AI possuir providers substituíveis;
11. Deployment possuir providers substituíveis;
12. Security possuir autoridade clara;
13. APIs permitirem automação autorizada;
14. agentes puderem operar sem Playwright quando houver entry point programático;
15. Source Project continuar sendo a fonte real;
16. falhas externas não destruírem o Core;
17. contratos poderem ser testados;
18. novas tecnologias poderem entrar através de adapters.

---

# 87. Regra final

A arquitetura do Nexo CMS deve transformar uma ideia complexa em partes independentes, mas conectadas por contratos claros.

A regra central é:

```text
                NEXO DOMAIN
                     │
        ┌────────────┼────────────┐
        │            │            │
       UI           API          CLI
                     │
                    AI
                     │
                Automation
                     │
                  Plugins
```

Todas essas portas devem acessar o mesmo domínio.

O Runtime executa.

Os Adapters entendem tecnologias.

O Project Model representa o projeto.

O Security Model autoriza.

O Git versiona.

O AI Engine raciocina e coordena.

O Editor apresenta e modifica.

O Deployment publica.

Nenhuma dessas partes deve assumir o papel das outras.

> **O Nexo CMS deve ser uma plataforma modular de capacidades reais, e não uma interface monolítica que precisa ser reconstruída toda vez que um novo consumidor, framework ou provider surgir.**