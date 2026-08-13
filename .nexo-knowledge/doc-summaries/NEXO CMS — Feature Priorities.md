# NEXO CMS
## Feature Priorities

## 1. Propósito

Este documento define a prioridade de construção das capacidades do Nexo CMS.

Seu objetivo é estabelecer uma ordem de implementação coerente, identificar dependências fundamentais e impedir que agentes implementem recursos avançados antes de construir as bases necessárias.

A prioridade deve considerar:

- integridade do projeto;
- segurança;
- arquitetura;
- dependências;
- reutilização;
- automação;
- capacidade de extensão;
- experiência do usuário;
- capacidade de operação por humanos e máquinas;
- evolução futura do produto.

Este documento define **prioridade de produto e prioridade arquitetural**.

Ele não substitui as especificações técnicas individuais.

---

# 2. Princípio geral de priorização

O Nexo não deve ser construído começando pela interface.

A ordem preferencial é:

```text
FOUNDATION
↓
PROJECT UNDERSTANDING
↓
DOMAIN CAPABILITIES
↓
AUTHORIZATION
↓
PROGRAMMATIC CONTROL PLANE
↓
RUNTIME
↓
ADAPTERS
↓
GIT
↓
EDITOR
↓
COMPONENTS
↓
MEDIA / DESIGN / RESPONSIVE
↓
AI
↓
INTEGRATIONS
↓
PLUGINS
↓
DEPLOYMENT
↓
ADVANCED FEATURES
↓
COMMERCIAL PLATFORM
```

A arquitetura deve permitir que uma mesma capacidade seja utilizada por:

```text
Human
AI
CLI
Automation
Plugin
Integration
```

sem criar múltiplas implementações independentes da mesma lógica.

---

# 3. Níveis de prioridade

As capacidades devem ser classificadas em:

```text
P0 — Foundation
P1 — Core Product
P2 — Advanced Core
P3 — Extensions
P4 — Future Commercial / Advanced
```

---

# 4. P0 — Foundation

P0 representa capacidades que precisam existir como fundamento do sistema.

Sem elas, funcionalidades posteriores correm risco de nascer acopladas, inseguras ou incompatíveis com a visão do produto.

---

# 5. P0 — Runtime Foundation

O Nexo precisa possuir um Runtime capaz de operar no ambiente em que o projeto está localizado.

O Runtime deverá fornecer capacidades como:

- filesystem;
- processos;
- terminal;
- execução de comandos;
- ambiente;
- build;
- preview;
- Git;
- ferramentas relacionadas.

O Runtime será uma fundação transversal.

---

# 6. P0 — Project Import

Deve ser possível selecionar e abrir um projeto real.

O projeto deve poder existir em uma pasta acessível pelo Runtime.

A importação não deve modificar o projeto automaticamente.

---

# 7. P0 — Project Discovery

O Nexo deve ser capaz de analisar um projeto antes de operar sobre ele.

A análise deverá procurar compreender:

- stack;
- framework;
- linguagem;
- styling;
- package manager;
- build;
- rotas;
- componentes;
- assets;
- scripts;
- Git;
- configurações relevantes.

---

# 8. P0 — Stack Detection

O sistema deve detectar automaticamente o stack quando houver evidências suficientes.

A detecção deve possuir mecanismos para:

- indicar confiança;
- reconhecer ambiguidades;
- mostrar o que foi encontrado;
- permitir correção manual;
- permitir configuração personalizada.

---

# 9. P0 — Project Model

O Nexo deve possuir um modelo interno do projeto.

Esse modelo precisa permitir que o restante do sistema trabalhe com conceitos universais sem destruir as particularidades da implementação real.

---

# 10. P0 — Adapter Contract

A arquitetura de adapters deve existir antes do suporte profundo a tecnologias específicas.

O Core não deve acumular lógica específica de cada framework.

Os adapters serão a fronteira de especialização tecnológica.

---

# 11. P0 — Security Foundation

Segurança deve ser implementada antes da exposição de capacidades privilegiadas.

A fundação deve contemplar:

- identidade;
- autenticação;
- autorização;
- permissões;
- policies;
- Runtime permissions;
- machine identity;
- auditabilidade;
- operações perigosas.

---

# 12. P0 — Domain Capability Model

Antes da construção avançada da UI, o Nexo deve possuir uma definição clara de suas capacidades de domínio.

Exemplos:

```text
Project
Component
Media
Git
Runtime
AI
Deployment
Workspace
```

Cada capacidade deve possuir responsabilidade própria.

---

# 13. P0 — Programmatic Control Plane

Esta é uma decisão arquitetural fundamental.

O Nexo não deve ser construído como uma aplicação em que a interface visual é a única forma real de executar operações.

O produto deve possuir um **Control Plane programático**.

Conceitualmente:

```text
                    NEXO DOMAIN
                         │
          ┌──────────────┼──────────────┐
          │              │              │
         UI             API            CLI
          │              │              │
          └──────────────┼──────────────┘
                         │
                  AI / AUTOMATION
```

O domínio do Nexo pertence às capacidades internas do produto.

UI, API, CLI, AI e automações são consumidores dessas capacidades.

---

# 14. Human-Equivalent Agent Capability

Uma IA autorizada deve poder realizar, por meios programáticos, **qualquer operação que um humano autorizado consiga realizar através das capacidades do Nexo**, desde que a operação seja tecnicamente apropriada para execução programática.

Isso significa que o Nexo deve evitar criar uma diferença artificial entre:

```text
Human capability
```

e:

```text
Agent capability
```

A diferença deve estar em:

- identidade;
- permissões;
- políticas;
- aprovação;
- contexto;
- origem da execução.

Não deve existir uma limitação artificial simplesmente porque o consumidor é uma IA.

---

# 15. Paridade de capacidade

Quando uma capacidade do domínio puder ser executada programaticamente, deverá existir um entry point adequado para consumidores programáticos autorizados.

Exemplo:

```text
Human
↓
UI
↓
Create Project
↓
Domain Capability
```

e:

```text
AI
↓
API / Agent Tool / CLI
↓
Create Project
↓
Domain Capability
```

Os dois fluxos devem convergir para a mesma lógica de domínio sempre que possível.

---

# 16. No UI-Only Operations

O Nexo não deve possuir operações importantes que existam somente por meio de cliques, navegação visual ou automação de interface quando a própria plataforma puder executá-las programaticamente.

A interface pode possuir uma representação visual da operação.

Mas a capacidade real deve existir no domínio e possuir um entry point adequado.

---

# 17. Playwright não é Control Plane

Playwright pode ser utilizado para:

- testes de UI;
- visual regression;
- browser automation;
- validação visual;
- integração com páginas externas.

Porém, Playwright não deve ser o método principal para uma IA controlar o próprio Nexo.

Quando existir um entry point programático equivalente, agentes autorizados deverão utilizá-lo.

O objetivo é evitar:

```text
AI
↓
Browser
↓
Playwright
↓
Click
↓
Read UI
```

quando for possível:

```text
AI
↓
Nexo API / Agent Tool / CLI
↓
Domain Capability
```

---

# 18. No Artificial Agent Limitations

Se um humano autorizado puder, através do Nexo:

- criar projeto;
- importar projeto;
- abrir projeto;
- analisar projeto;
- editar arquivos;
- criar páginas;
- editar páginas;
- criar componentes;
- editar componentes;
- promover componentes;
- administrar mídia;
- editar design;
- testar responsividade;
- executar comandos;
- executar build;
- executar testes;
- trabalhar com Git;
- criar branch;
- commit;
- push;
- pull;
- fazer merge;
- fazer rebase;
- fazer revert;
- criar deployment;
- verificar deployment;
- fazer rollback;
- clonar;
- exportar;
- arquivar;
- remover projeto;

uma IA autorizada também deve poder executar essas operações através de entry points programáticos correspondentes, desde que:

- possua as permissões necessárias;
- a operação seja suportada programaticamente;
- as políticas permitam a ação;
- as aprovações necessárias sejam satisfeitas;
- os requisitos de segurança sejam atendidos.

---

# 19. Mesmo domínio, diferentes consumidores

O Nexo deve evitar implementar:

```text
UI Logic
+
AI Logic
+
CLI Logic
+
Plugin Logic
```

como quatro versões diferentes da mesma operação.

A arquitetura preferida é:

```text
                DOMAIN SERVICE
              /       |       \
            UI        API      CLI
                         \
                          AI
```

Os consumidores devem convergir para as mesmas capacidades fundamentais.

---

# 20. Machine Identity

Agentes e automações devem possuir identidade própria.

Exemplos:

```text
Human User
AI Agent
Automation Job
Plugin
Service Identity
```

Essa identidade deve ser utilizada para:

- autenticação;
- autorização;
- auditoria;
- controle de acesso.

Uma IA não deve precisar fingir ser um usuário humano para utilizar o Nexo.

---

# 21. Agent Authentication

A arquitetura deve possuir mecanismos seguros para autenticar consumidores programáticos.

A solução exata ainda será definida.

Possíveis mecanismos podem incluir:

- API keys;
- short-lived tokens;
- OAuth;
- service identities;
- signed requests;
- mecanismos equivalentes.

Nenhum mecanismo deve ser escolhido apenas por conveniência.

Quando a implementação depender de tecnologia externa, o agente deverá consultar documentação oficial atual.

---

# 22. Agent Authorization

Uma IA deve passar pelo sistema central de autorização.

Exemplo:

```text
Agent:
Kimi Code

Permission:
project.write

Project:
Client A

Policy:
Allowed

Result:
ALLOW
```

A API não deve oferecer um caminho privilegiado que ignore a autorização.

---

# 23. Capability Discovery

Consumidores programáticos devem poder descobrir quais capacidades possuem autorização para executar, quando apropriado.

Exemplo conceitual:

```text
Agent
↓
Discover Capabilities
↓
project.read
project.write
git.commit
build.run
deployment.preview
```

Essa descoberta deve respeitar as próprias regras de segurança e não revelar informações sensíveis desnecessárias.

---

# 24. Programmatic Contracts

Os entry points programáticos devem possuir contratos claros.

Os contratos deverão definir:

- entrada;
- saída;
- autenticação;
- autorização;
- estados;
- erros;
- requisitos;
- efeitos;
- idempotência quando aplicável;
- versionamento.

---

# 25. Machine-Readable Contracts

Sempre que apropriado, contratos devem possuir representação que possa ser interpretada por máquinas.

Isso permitirá uso por:

- IA;
- CLI;
- SDK;
- automações;
- IDEs;
- plugins.

O formato exato será definido posteriormente em API Contracts.

---

# 26. Agent-Friendly Errors

Erros programáticos devem ser estruturados e distinguir situações diferentes.

Exemplos:

```text
Unauthorized
Forbidden
Not Found
Conflict
Invalid Input
Unsupported Operation
Build Failure
Runtime Failure
Provider Failure
Validation Failure
Unknown Project State
```

O agente deve conseguir determinar o motivo da falha sem precisar interpretar uma mensagem visual.

---

# 27. P0 — Git Foundation

Git deverá existir como parte estrutural do produto.

O Nexo precisa ser capaz de:

- detectar repository;
- detectar branch;
- detectar remotes;
- detectar alterações;
- consultar histórico;
- realizar commits;
- sincronizar com remotes.

Operações avançadas poderão ficar para P2.

---

# 28. P0 — Programmatic Git

Todas as operações Git disponibilizadas ao humano e apropriadas para agentes devem possuir entry points programáticos correspondentes.

Exemplo:

```text
Human:
Git UI → Commit

AI:
git.commit entry point
```

Ambos devem utilizar a mesma capacidade de domínio.

---

# 29. P0 — Runtime e Agent Access

O Runtime deve poder ser utilizado por consumidores programáticos autorizados.

Exemplos:

```text
AI
CLI
Automation
Plugin
```

Isso inclui, quando permitido:

- read file;
- write file;
- create file;
- delete file;
- execute command;
- start process;
- stop process;
- run build;
- run tests;
- inspect output.

---

# 30. P1 — Visual Editor

Depois que as fundações estiverem estáveis, o Editor Visual pode ser construído.

Deve suportar:

- seleção;
- inspector;
- edição;
- preview;
- source mapping;
- save;
- undo;
- redo;
- diff.

---

# 31. P1 — Code Editor

O editor de código deve permitir edição direta do projeto.

Deve permanecer conectado ao Project Model e ao restante do sistema.

---

# 32. P1 — Component Model

O Nexo deve possuir o modelo de componentes antes de construir uma biblioteca avançada.

---

# 33. P1 — Component Studio

O Component Studio deverá permitir:

- criar;
- editar;
- configurar;
- visualizar;
- testar;
- salvar componentes.

---

# 34. P1 — Component Library

A biblioteca de componentes deverá suportar:

- global components;
- project components;
- versioning;
- compatibility;
- dependencies.

---

# 35. P1 — Media Library

A Media Library deverá permitir:

- upload;
- busca;
- edição;
- replace;
- metadata;
- references;
- cleanup.

---

# 36. P1 — Design Editing

O sistema deverá permitir:

- colors;
- gradients;
- typography;
- spacing;
- radius;
- shadows;
- borders;
- themes;
- tokens.

Sempre respeitando o styling system do projeto.

---

# 37. P1 — Responsive Lab

O Responsive Lab deverá existir como parte importante do produto.

Deve oferecer:

- viewport presets;
- custom viewport;
- overflow detection;
- text wrapping analysis;
- visual comparison;
- layout diagnosis.

---

# 38. P1 — Basic AI Engineer

A primeira versão útil da IA deverá possuir:

- project context;
- file access;
- planning;
- code analysis;
- code generation;
- patch generation;
- diff;
- validation.

---

# 39. P1 — Manual AI Mode

A IA deve poder:

```text
Analyze
↓
Plan
↓
Propose
↓
Diff
↓
Wait for Approval
↓
Apply
↓
Validate
```

---

# 40. P1 — AI Programmatic Access

O AI Engine deve utilizar os mesmos serviços de domínio utilizados por outros consumidores.

A IA não deve receber uma arquitetura paralela.

---

# 41. P1 — AI Tool Layer

As ferramentas disponíveis para IA devem representar capacidades reais do Nexo.

Exemplos:

```text
project.read
project.write
project.analyze
file.read
file.write
component.create
component.update
media.list
git.status
git.commit
runtime.command
runtime.build
runtime.test
preview.open
```

Essas ferramentas precisam passar por autorização.

---

# 42. P1 — AI Provider Abstraction

O Nexo não deve ficar preso a uma única IA.

A arquitetura deverá permitir providers como:

```text
Kimi
Luna
OpenAI
Anthropic
Gemini
Local Models
Custom API
```

A lista não é fechada.

---

# 43. P1 — Luna Integration Foundation

A Luna deverá possuir uma camada própria de integração.

O Nexo não deve reimplementar a Luna.

A integração deverá permitir que a Luna utilize os entry points e contratos do Nexo.

---

# 44. P1 — Integrations Foundation

Deve ser possível trabalhar com:

- HTML;
- CSS;
- JS;
- iframe;
- external scripts;
- widgets;
- embeds.

---

# 45. P2 — Advanced Editor Capabilities

Depois do editor básico:

- visual regression;
- advanced source mapping;
- advanced responsive diagnostics;
- structural editing;
- conflict resolution.

---

# 46. P2 — Advanced Git

Inclui:

- merge;
- rebase;
- stash;
- reset;
- revert;
- cherry-pick;
- advanced branch management.

Operações de alto risco devem possuir controles adicionais.

---

# 47. P2 — Advanced Component System

Inclui:

- component promotion;
- versioning;
- compatibility checks;
- dependency analysis;
- update workflows;
- component migration.

---

# 48. P2 — Autonomous AI Mode

O modo automático deve permitir:

```text
Request
↓
Context
↓
Permission
↓
Plan
↓
Execute
↓
Validate
↓
Report
```

A autonomia não remove:

- authorization;
- safety;
- validation;
- audit;
- approval requirements.

---

# 49. P2 — Advanced Agent Orchestration

Agentes poderão executar tarefas complexas utilizando múltiplas capacidades do Nexo.

Exemplo:

```text
Analyze Project
↓
Find Problem
↓
Modify Code
↓
Run Tests
↓
Build
↓
Commit
↓
Push
```

Esse fluxo deve utilizar os contratos reais do Nexo.

---

# 50. P2 — Plugin System

Plugins deverão permitir adicionar:

- adapters;
- components;
- AI providers;
- integrations;
- tools;
- deployment providers.

---

# 51. P2 — Deployment Engine

O sistema deverá possuir suporte para deployment através de providers.

Possíveis providers iniciais:

```text
Vercel
Hostinger
SSH
SFTP
FTP
Docker
```

A lista é extensível.

A implementação deve utilizar documentação oficial atualizada de cada fornecedor.

---

# 52. P2 — Deployment Verification

Após deploy, o Nexo deve possuir mecanismos para verificar o resultado quando o provider permitir.

---

# 53. P2 — Rollback

Rollback deve existir conforme as capacidades do provider e do projeto.

---

# 54. P3 — Advanced Integrations

Podem incluir:

- mais serviços externos;
- integrações personalizadas;
- integration marketplace;
- automações;
- webhooks.

---

# 55. P3 — Custom Adapters

Usuários ou administradores poderão criar adapters para novas tecnologias.

Isso deve acontecer através de contratos oficiais.

---

# 56. P3 — Advanced Agent Ecosystem

O Nexo poderá evoluir para um ambiente no qual terceiros construam:

- AI agents;
- automation agents;
- integrations;
- plugins;
- tools.

Todos devem utilizar os contratos e permissões do Nexo.

---

# 57. P4 — Commercial Platform

Recursos futuros:

- SaaS;
- multi-tenant;
- plans;
- billing;
- quotas;
- marketplace;
- enterprise management;
- advanced analytics.

Esses recursos não devem bloquear o primeiro produto.

---

# 58. Dependências principais

As dependências macro são:

```text
Runtime
↓
Project Discovery
↓
Project Model
↓
Adapter System
↓
Domain Services
↓
Authorization
↓
Programmatic Control Plane
↓
UI / AI / CLI
```

---

# 59. Component Dependency Chain

```text
Project Model
↓
Component Detection
↓
Component Model
↓
Component Services
↓
Component Studio
↓
Component Library
↓
Component Promotion
```

---

# 60. AI Dependency Chain

```text
Project Model
+
Runtime
+
Adapters
+
Authorization
+
Domain Services
↓
AI Context
↓
AI Planning
↓
AI Tools
↓
Patch
↓
Diff
↓
Validation
↓
Apply
```

---

# 61. Deployment Dependency Chain

```text
Project
↓
Known State
↓
Preflight
↓
Build
↓
Deployment Provider
↓
Deployment
↓
Verification
```

---

# 62. Regra de desenvolvimento

Nenhuma feature deve ser implementada como um módulo isolado quando suas dependências fundamentais ainda não estiverem definidas.

Exemplo:

Component Studio não deve ser construído como UI independente antes de existir um Component Model adequado.

AI Agent não deve receber ferramentas antes de existir:

- Authorization;
- Runtime;
- Domain Services;
- Contracts.

---

# 63. Regra de UI

A UI deve consumir capacidades de domínio.

Ela não deve ser a única implementação dessas capacidades.

Preferência:

```text
Domain Service
↓
API
↓
UI
```

e:

```text
Domain Service
↓
Agent Tool
↓
AI
```

---

# 64. Regra de API

A API deve expor capacidades do domínio.

Não deve ser apenas um conjunto de endpoints que reproduzem visualmente os botões da interface.

---

# 65. Regra de CLI

Caso exista CLI, ela deverá consumir os mesmos contratos fundamentais.

Não deve possuir uma implementação paralela da lógica de negócio.

---

# 66. Regra de AI

A IA deve ser tratada como consumidor de primeira classe.

Ela pode operar sobre o sistema inteiro dentro das permissões que lhe forem concedidas.

Não criar limitações artificiais somente porque a origem da operação é uma IA.

---

# 67. Regra de segurança

A equivalência de capacidades não significa equivalência de permissões.

Um humano pode ter:

```text
deployment.production.execute
```

e uma IA pode não ter.

Isso é uma decisão de autorização.

Mas não devemos criar uma limitação estrutural dizendo:

> “IA nunca pode fazer deploy.”

Se a política permitir e a capability existir, a IA deve poder executá-la.

---

# 68. Regra de aprovação

Da mesma forma, uma operação pode:

```text
Human → Require Approval
AI → Require Approval
```

ou:

```text
Human → Allow
AI → Require Approval
```

dependendo da política.

Essa diferença deve ser controlada pelo Authorization Model.

---

# 69. Regra de pesquisa externa

Quando a implementação depender de comportamento atual de terceiros, o agente deve pesquisar antes de decidir.

Isso inclui:

- APIs;
- autenticação;
- GitHub;
- Vercel;
- Hostinger;
- frameworks;
- browsers;
- runtimes;
- package managers;
- IA;
- serviços externos.

A preferência é:

1. documentação oficial;
2. especificação oficial;
3. repositório oficial;
4. documentação técnica primária;
5. fontes técnicas confiáveis.

O agente não deve inventar APIs ou parâmetros.

---

# 70. Regra de versões

Quando o comportamento depender da versão:

```text
Framework
Library
Runtime
API
Provider
Package
```

a versão deve fazer parte do contexto da decisão.

O agente deve consultar documentação compatível com a versão real sempre que possível.

---

# 71. Critério de sucesso do Control Plane

A fundação do Nexo será considerada correta quando um agente autorizado puder realizar um fluxo como:

```text
Select Workspace
↓
Create / Open Project
↓
Analyze
↓
Read Source
↓
Modify Source
↓
Run Build
↓
Run Tests
↓
Review Diff
↓
Commit
↓
Push
↓
Deploy
↓
Verify
```

sem precisar usar Playwright ou simular interação humana para operações que possuem capacidades programáticas equivalentes.

---

# 72. Critério de sucesso de paridade

O Nexo deverá caminhar para a seguinte equivalência:

```text
Human
   ↓
UI
   ↓
Domain Capability


AI
   ↓
API / Agent Tool / CLI
   ↓
Domain Capability
```

A principal diferença entre os consumidores deverá ser:

```text
Identity
Permissions
Policies
Approval
Context
```

e não a capacidade estrutural do sistema.

---

# 73. Critério de sucesso da arquitetura

A arquitetura será considerada alinhada quando:

- a UI puder ser substituída sem destruir o domínio;
- uma IA puder operar sem Playwright;
- uma CLI puder utilizar as mesmas capacidades;
- plugins puderem utilizar contratos oficiais;
- automações puderem executar operações autorizadas;
- Git puder ser controlado sem depender da UI;
- Runtime puder ser controlado por consumidores autorizados;
- operações importantes puderem ser auditadas;
- providers puderem ser substituídos.

---

# 74. O que não deve ser priorizado cedo

Não priorizar antes das fundações:

- marketplace;
- billing;
- planos comerciais avançados;
- efeitos visuais periféricos;
- grande quantidade de componentes decorativos;
- automações sofisticadas sem contratos;
- funcionalidades que dependam de abstrações ainda não definidas.

---

# 75. Regra de prioridade arquitetural

Quando houver duas funcionalidades e uma delas for dependência estrutural da outra, a fundação deve ser priorizada.

Exemplo:

```text
Component Library
```

não pode ser prioridade maior que:

```text
Component Model
```

Da mesma maneira:

```text
AI Autonomous Mode
```

não pode ser prioridade maior que:

```text
Authorization
AI Tool Contract
Runtime
Project Model
```

---

# 76. Regra de prioridade por impacto

Maior prioridade deve ser dada a capacidades que:

- suportam múltiplas áreas;
- reduzem duplicação;
- criam contratos estáveis;
- preservam segurança;
- permitem automação;
- permitem múltiplos consumidores;
- reduzem dependência da UI;
- protegem o projeto real.

---

# 77. Regra de prioridade por risco

Áreas que podem causar danos ao projeto devem receber engenharia e validação antes de receber automação ampla.

Exemplos:

- filesystem;
- terminal;
- Git;
- AI write access;
- secrets;
- deployment;
- rollback.

---

# 78. Regra de prioridade por reversibilidade

Operações que não possuem recuperação simples devem possuir prioridade de segurança superior à prioridade de conveniência.

---

# 79. Relação com o K3 Swarm

O K3 Swarm deverá utilizar este documento para entender:

- o que construir primeiro;
- quais módulos são dependências;
- quais capacidades podem ser paralelizadas;
- quais áreas não devem ser implementadas antes das fundações.

O Swarm não deve interpretar P0/P1/P2 como simples backlog de interface.

Essas prioridades representam **dependência e criticidade arquitetural**.

---

# 80. Regra para agentes de implementação

Antes de implementar uma feature, o agente deve:

1. identificar sua prioridade;
2. identificar dependências;
3. consultar os documentos relacionados;
4. consultar Core Invariants;
5. consultar contratos;
6. consultar Security;
7. verificar se a capacidade precisa de entry point programático;
8. verificar se AI/CLI/automation também precisam consumir a mesma capacidade;
9. pesquisar fontes externas quando necessário;
10. implementar;
11. validar;
12. documentar qualquer decisão nova.

---

# 81. Regra final

O Nexo CMS não deve ser construído como:

```text
Interface bonita
↓
lógica espalhada
↓
API adicionada depois
↓
IA adaptada depois
```

A visão correta é:

```text
Project
↓
Domain Model
↓
Domain Capabilities
↓
Contracts
↓
Authorization
↓
Programmatic Control Plane
├── UI
├── AI
├── CLI
├── Automation
└── Plugins
```

A IA deve possuir acesso programático a tudo o que um humano autorizado pode fazer no Nexo, sem necessidade de imitar interações humanas através da interface.

Playwright deve ser ferramenta de automação e teste de interface quando apropriado, **não o mecanismo de controle do próprio Nexo quando existir um entry point programático equivalente**.

> **O Nexo deve ser construído como uma plataforma controlável por humanos e por máquinas. A interface é uma porta de entrada; não é a arquitetura.**