# NEXO CMS
## Nexo CMS Application

## 1. Propósito

Este documento define a responsabilidade da aplicação **Nexo CMS** dentro da arquitetura geral do produto.

Nexo CMS é a camada de aplicação responsável por fornecer a experiência de gerenciamento do Nexo através de uma interface adequada para usuários humanos e por integrar essa experiência às capacidades programáticas do Nexo Engine.

O Nexo CMS deve ser tratado como um consumidor e coordenador da plataforma, e não como a implementação principal do domínio.

Sua responsabilidade é transformar as capacidades do Nexo em uma experiência coerente de:

- navegação;
- gerenciamento;
- edição;
- inspeção;
- aprovação;
- monitoramento;
- configuração.

---

# 2. Posição arquitetural

A aplicação Nexo CMS ocupa a camada de experiência do produto.

```text
                        NEXO CMS APPLICATION
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
         Human Interface     Application       Programmatic
                              Services            Access
               │                 │                 │
               └─────────────────┼─────────────────┘
                                 │
                           NEXO ENGINE
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   Project Domain          Component Domain          Git Domain
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                             ADAPTERS
                                 │
                              RUNTIME
                                 │
                         SOURCE PROJECT
```

A representação é conceitual.

A implementação pode dividir a aplicação em módulos, pacotes ou processos diferentes, desde que as responsabilidades sejam preservadas.

---

# 3. O que o Nexo CMS é

O Nexo CMS é:

- a interface principal do produto;
- o ambiente visual de trabalho;
- o ponto de navegação entre projetos;
- o ponto de inspeção de estados;
- o editor visual;
- o acesso visual ao código;
- o centro de gerenciamento de componentes;
- o centro de gerenciamento de mídia;
- o centro de integração com Git;
- o centro de interação com AI Engineer;
- o centro de configuração;
- o ambiente de aprovação de operações;
- a superfície principal de observabilidade para o usuário.

---

# 4. O que o Nexo CMS não é

O Nexo CMS não deve ser:

- a fonte única da lógica de domínio;
- a implementação do Runtime;
- o responsável por compreender diretamente todos os frameworks;
- o responsável por implementar a lógica específica de cada adapter;
- o responsável por executar diretamente comandos de sistema;
- o responsável por implementar providers externos;
- o mecanismo exclusivo de controle do Nexo;
- o substituto do Nexo Engine;
- o substituto do Git;
- o substituto do projeto real.

---

# 5. Regra fundamental

A aplicação Nexo CMS deve consumir capacidades.

Ela não deve reinventá-las.

Exemplo:

```text
Usuário:
"Commit"

Nexo CMS:
→ solicita git.commit ao domínio

Nexo Engine:
→ valida
→ autoriza
→ executa

Runtime / Git layer:
→ realiza operação real
```

Não deve existir:

```text
Nexo CMS
→ constrói comando Git diretamente
→ executa shell
→ atualiza sua própria representação
```

como arquitetura principal.

---

# 6. UI como consumidor

A interface visual deve utilizar as capacidades disponibilizadas pelo Engine e pelas APIs internas apropriadas.

A UI deve ser responsável por:

- apresentar;
- coletar entrada;
- indicar estado;
- permitir interação;
- solicitar operações;
- mostrar resultados;
- mostrar erros;
- solicitar aprovação.

A UI não deve decidir regras profundas de negócio por conta própria.

---

# 7. Aplicação deve conhecer o contexto

O Nexo CMS deve manter contexto explícito para o usuário.

O contexto pode incluir:

```text
Workspace
Project
Environment
Branch
Runtime
Adapter
Provider
User
Permissions
```

A interface deve comunicar esse contexto de maneira clara.

---

# 8. Workspace Context

O Workspace ativo deve ser identificável.

A aplicação não deve permitir que o usuário altere operações de um Workspace sem que o contexto seja claramente atualizado.

Quando o Workspace mudar:

- projetos acessíveis devem ser recalculados;
- permissões devem ser recalculadas;
- providers disponíveis podem mudar;
- recursos globais devem mudar;
- configurações devem mudar;
- contexto anterior deve ser invalidado quando necessário.

---

# 9. Project Context

O Projeto ativo deve ser claramente identificável.

A interface deve disponibilizar, conforme aplicável:

- nome;
- localização;
- stack;
- branch;
- Git state;
- environment;
- adapter;
- estado da análise;
- estado do build;
- estado do preview.

---

# 10. Environment Context

Quando houver múltiplos ambientes, a UI deverá comunicar claramente qual ambiente está em foco.

Exemplo:

```text
Development
Preview
Staging
Production
```

Operações destinadas a um ambiente não devem depender de contexto implícito ou memória da interface.

---

# 11. Branch Context

A branch atual deve ser visível quando relevante.

Ao ocorrer mudança de branch:

1. o Engine atualiza o projeto;
2. a aplicação recebe o novo estado;
3. a UI invalida informações antigas;
4. o preview é atualizado quando necessário;
5. o Git status é atualizado.

---

# 12. Estado da aplicação

A aplicação deve distinguir pelo menos conceitualmente:

```text
Loading
Ready
Saving
Saved
Unsaved
Validating
Building
Previewing
Deploying
Error
Conflict
Blocked
```

Esses estados devem representar operações reais.

A UI não deve mostrar `Saved` antes da persistência real.

---

# 13. Estado visual não é estado do projeto

A aplicação pode possuir estado temporário de interface.

Exemplo:

```text
Selected Element
Open Panel
Viewport
Active Tab
```

Esses estados não devem ser confundidos com:

```text
Project State
Git State
Deployment State
Source State
```

---

# 14. Editor visual

O Nexo CMS deve fornecer um editor visual.

O editor deve permitir, conforme capacidade do projeto:

- visualizar página;
- selecionar elementos;
- abrir Inspector;
- editar propriedades;
- adicionar componentes;
- remover componentes;
- reorganizar conteúdo suportado;
- visualizar mudanças;
- salvar.

---

# 15. Editor visual não deve ser universalmente igual

A experiência deve ser consistente, mas os controles disponíveis devem depender daquilo que o projeto e o adapter realmente suportam.

Se uma propriedade não puder ser determinada ou editada com segurança, o Nexo não deve fabricar um controle fictício para ela.

---

# 16. Inspector

O Inspector deve ser baseado em contexto.

Quando um elemento for selecionado:

```text
Selection
↓
Resolve Element
↓
Resolve Component / Node
↓
Resolve Properties
↓
Render Inspector
```

Os controles apresentados devem vir das capacidades reais disponíveis.

---

# 17. Dynamic Inspector

O Inspector deve poder mudar de acordo com:

- tipo de elemento;
- componente;
- schema;
- adapter;
- propriedades disponíveis;
- responsividade;
- estado atual.

Isso permite que a mesma interface seja utilizada para diferentes projetos sem exigir uma estrutura visual fixa para cada stack.

---

# 18. Code View

O Nexo CMS deve possuir uma experiência de código.

O usuário deve conseguir:

- abrir arquivos;
- editar;
- pesquisar;
- navegar;
- visualizar diff;
- salvar;
- retornar ao preview.

A Code View deve trabalhar sobre o código real.

---

# 19. Visual ↔ Code

Quando o Source Mapping permitir, a aplicação deve oferecer navegação entre:

```text
Visual Element
↕
Component / Node
↕
Source
```

Quando o relacionamento não puder ser estabelecido com confiança suficiente, a aplicação deve comunicar a limitação.

---

# 20. Navigation

A aplicação deve possuir uma navegação clara entre os principais domínios.

Conceitualmente:

```text
Project
├── Overview
├── Pages
├── Components
├── Media
├── Design
├── Responsive
├── Git
├── AI
├── Integrations
├── Terminal
├── Preview
├── Deploy
└── Settings
```

A implementação final da navegação será definida posteriormente pela especificação de UI/UX.

---

# 21. Project Dashboard

O Dashboard do projeto deve servir como ponto central de orientação.

Pode apresentar:

- stack;
- Git status;
- current branch;
- build state;
- preview state;
- deployment state;
- analysis state;
- warnings;
- errors;
- recent activity;
- active jobs.

---

# 22. Project Explorer

O usuário deve conseguir explorar o projeto.

A exploração pode incluir:

- files;
- routes;
- pages;
- components;
- assets;
- integrations.

A aplicação não deve simplesmente duplicar a árvore de arquivos do filesystem quando uma visão semântica for mais útil.

Sempre que possível, o usuário deve poder alternar entre:

```text
File View
```

e:

```text
Semantic View
```

---

# 23. Semantic Project View

Uma visão semântica pode organizar:

```text
Pages
Components
Layouts
Assets
Styles
Integrations
```

independentemente da estrutura física dos diretórios.

Essa visão deve ser construída a partir do Project Model.

---

# 24. File View

A visão física do projeto deve continuar disponível.

O usuário técnico deve poder visualizar:

- diretórios;
- arquivos;
- nomes;
- extensões;
- tamanho;
- status Git.

O Nexo não deve esconder o filesystem real.

---

# 25. Component Studio UI

A aplicação deve possuir uma experiência dedicada para criação e edição de componentes.

Ela deve permitir, conforme o Component Contract:

- estrutura;
- props;
- variants;
- slots;
- styles;
- responsive behavior;
- assets;
- preview;
- dependencies;
- compatibility;
- documentation.

---

# 26. Component Library UI

A biblioteca deve possuir:

- busca;
- filtros;
- categorias;
- versões;
- compatibilidade;
- origem;
- dependências;
- preview.

Deve distinguir visualmente:

```text
Global Component
```

de:

```text
Project Component
```

---

# 27. Media Library UI

A Media Library deve permitir:

- grid;
- list;
- busca;
- filtros;
- preview;
- metadata;
- referências;
- replace;
- upload.

Não deve esconder o local ou origem de assets quando essa informação for relevante.

---

# 28. Media Reference View

Ao selecionar um asset, o usuário deve conseguir descobrir, quando disponível:

```text
Used By
├── Home Hero
├── Carousel
└── Project Card
```

Isso ajuda a prevenir exclusões acidentais.

---

# 29. Design Editor UI

O sistema deve fornecer uma interface visual para trabalhar com:

- color;
- gradient;
- typography;
- spacing;
- radius;
- shadows;
- borders;
- themes;
- tokens.

Os controles devem refletir a implementação real do projeto.

---

# 30. Responsive Lab UI

O Responsive Lab deve permitir:

- presets;
- viewport personalizado;
- rotação;
- comparação;
- stress test;
- diagnostics;
- preview.

---

# 31. Git UI

A interface Git deve permitir, conforme permissões:

- status;
- diff;
- history;
- branch;
- commit;
- push;
- pull;
- fetch;
- merge;
- rebase;
- stash;
- revert;
- reset;
- cherry-pick.

Operações perigosas devem possuir proteção própria.

---

# 32. AI UI

A aplicação deve possuir uma interface para interação com o Nexo AI Engineer.

Ela deve permitir:

- selecionar provider;
- selecionar contexto;
- definir tarefa;
- revisar plano;
- revisar diff;
- aprovar;
- rejeitar;
- observar progresso;
- cancelar;
- consultar resultado.

---

# 33. AI Activity

Uma tarefa de IA deve poder mostrar:

```text
Requested
Planning
Executing
Validating
Waiting Approval
Completed
Failed
Cancelled
```

A UI não deve inventar progresso.

O progresso mostrado deve derivar do estado real da tarefa.

---

# 34. Manual AI Mode

No modo manual, o usuário deve visualizar:

- intenção;
- plano;
- arquivos afetados;
- alterações;
- validações;
- resultado.

A aplicação deve impedir aplicação automática quando o fluxo exigir aprovação.

---

# 35. Autonomous AI Mode

No modo automático, o usuário deve conseguir saber:

- qual provider está executando;
- qual projeto está sendo utilizado;
- quais permissões estão disponíveis;
- qual tarefa está ativa;
- quais operações foram executadas;
- qual resultado foi obtido.

---

# 36. Agent Access UI

O Nexo CMS deve fornecer administração de agentes e identidades programáticas.

A UI poderá permitir:

- visualizar agents;
- criar credentials;
- revogar credentials;
- definir permissions;
- revisar activity;
- consultar last usage.

Os valores secretos das credenciais devem ser exibidos somente dentro das regras de segurança.

---

# 37. Programmatic Access Documentation

A aplicação deve possuir uma área de referência ou acesso à documentação das capabilities programáticas quando essa função fizer parte do produto.

Agentes externos devem conseguir compreender:

- quais operações existem;
- quais permissões são necessárias;
- como autenticar;
- quais parâmetros existem;
- quais resultados são retornados.

---

# 38. Capability Explorer

O produto deve ser preparado para futuramente oferecer uma visão de capabilities disponíveis.

Exemplo:

```text
Project
  ✓ read
  ✓ write
  ✓ analyze

Git
  ✓ status
  ✓ commit
  ✕ force-push

Deployment
  ✓ preview
  ✕ production
```

Essa visão deve refletir as permissões reais do contexto.

---

# 39. Terminal UI

O Terminal deve permitir:

- comando;
- output;
- error;
- exit code;
- processo;
- cancelamento.

Não deve fornecer poderes acima dos concedidos pelo Authorization Layer.

---

# 40. Process Manager UI

A aplicação pode apresentar processos ativos:

```text
Dev Server
Build
Test
AI Job
Deployment
```

Cada processo deve possuir estado real.

---

# 41. Preview UI

O preview deve possuir controles para:

- viewport;
- refresh;
- open externally;
- device preset;
- responsive;
- compare state.

O usuário deve saber qual estado está sendo visualizado.

---

# 42. Diff UI

O Diff deve ser uma ferramenta central do produto.

Deve ser capaz de apresentar:

- file diff;
- multiple files;
- operation source;
- AI source;
- Git relation;
- validation result.

---

# 43. Approval UI

Quando uma operação exigir aprovação:

```text
Pending Approval
↓
Review
↓
Approve
or
Reject
```

A UI deve exibir impacto suficiente para permitir decisão informada.

---

# 44. Error UI

Erros devem ser apresentados com:

- operação;
- estado;
- motivo;
- impacto;
- possibilidade de recuperação.

Evitar mensagens genéricas como:

```text
Something went wrong.
```

quando informações úteis estiverem disponíveis.

---

# 45. Conflict UI

Quando houver conflito de estado, a interface deve apresentar:

- origem;
- versão atual;
- versão externa;
- diferença;
- opções de recuperação.

Nunca descartar mudanças silenciosamente.

---

# 46. Project Import UI

A importação deve permitir:

```text
Select Folder
↓
Scan
↓
Analysis
↓
Review
↓
Confirm
```

Durante a análise, o usuário deve ver informações relevantes sem transformar o processo em uma saída técnica incompreensível.

---

# 47. Stack Confirmation UI

Após detecção, a interface deve mostrar:

```text
Detected
Confirmed
Manual
Unknown
Unsupported
Partial
```

O usuário deve poder corrigir a detecção.

---

# 48. Adapter Status UI

Quando um projeto possuir suporte parcial ou limitado, o usuário deve ser informado.

Exemplo conceitual:

```text
Next.js Adapter
Supported

Custom Build
Partial

Unknown CMS Data Layer
Unknown
```

---

# 49. Workspace UI

Workspace deve possuir interface para:

- projects;
- members;
- roles;
- permissions;
- global components;
- providers;
- plugins;
- settings;
- audit.

---

# 50. Permission-Aware UI

A UI deve adaptar-se às permissões efetivas.

Porém:

**UI permission checks não substituem backend/API authorization.**

A interface pode:

- esconder;
- desabilitar;
- explicar.

Mas a execução deve ser bloqueada também pela camada de autorização.

---

# 51. Role-Aware UI

A UI pode apresentar experiências diferentes para:

- Owner;
- Admin;
- Developer;
- Designer;
- Editor;
- Viewer.

Mas o comportamento real deve depender das permissões efetivas.

---

# 52. Responsive UI do próprio Nexo

O Nexo CMS deve possuir uma interface responsiva.

Contudo, por ser uma ferramenta profissional com alta densidade de informação, a experiência pode utilizar layouts diferentes conforme viewport.

Não forçar a mesma interface reduzida em todos os tamanhos.

---

# 53. Iconography

O Nexo CMS não deve utilizar emojis genéricos como ícones de interface.

Não utilizar símbolos textuais como substitutos de ícones profissionais.

A iconografia deverá utilizar:

- Lucide;
- ícones próprios;
- SVGs personalizados;

conforme necessário.

Cada ícone deve possuir significado semântico claro.

---

# 54. Visual Language

A interface do Nexo não deve utilizar cores genéricas apenas para “deixar bonito”.

Cores devem possuir intenção semântica.

Exemplos conceituais:

```text
Primary
Surface
Background
Border
Text
Muted
Success
Warning
Error
Info
```

Os valores concretos deverão ser definidos no Design System do Nexo.

Não utilizar uma paleta arbitrária repetida em cada componente.

---

# 55. Design Engineering Rules

A implementação da interface deve:

- evitar estilos duplicados;
- evitar valores mágicos;
- utilizar tokens;
- manter consistência;
- respeitar acessibilidade;
- respeitar contraste;
- manter estados claros;
- manter feedback de interação;
- evitar animações desnecessárias;
- preservar performance.

---

# 56. Componentização da UI do Nexo

Componentes da própria interface do Nexo também devem possuir arquitetura organizada.

A UI não deve possuir cópias independentes do mesmo comportamento.

Exemplos:

```text
Button
Modal
Dialog
Dropdown
Tabs
Panel
Inspector
Tree
Table
Toast
Command Palette
```

devem utilizar uma biblioteca ou sistema consistente definido posteriormente.

---

# 57. Command Palette

O Nexo deve ser preparado para uma Command Palette.

Ela pode permitir acesso rápido a:

- projetos;
- páginas;
- componentes;
- Git;
- comandos;
- ações;
- IA;
- navegação.

A Command Palette não deve contornar autorização.

---

# 58. Keyboard Shortcuts

Atalhos devem ser consistentes e configuráveis quando necessário.

Exemplos:

- salvar;
- undo;
- redo;
- search;
- command palette;
- preview;
- Git;
- navigation.

---

# 59. Accessibility

A aplicação deve considerar:

- keyboard navigation;
- focus management;
- semantic structure;
- screen readers;
- contrast;
- labels;
- error communication;
- reduced motion.

A implementação deve consultar padrões atuais de acessibilidade quando necessário.

---

# 60. No decorative complexity

A interface não deve adicionar:

- gradientes decorativos sem função;
- animações excessivas;
- efeitos 3D desnecessários;
- elementos visuais sem significado;

apenas para parecer sofisticada.

A estética deve reforçar a produtividade.

---

# 61. Feedback

A UI deve fornecer feedback para operações.

Exemplos:

```text
Saving
Saved
Build Running
Build Failed
Push Successful
Deploying
Deploy Failed
```

Feedback deve refletir estado real.

---

# 62. Loading

Estados de carregamento devem ser específicos.

Evitar uma única tela de loading genérica para todas as operações.

Exemplo:

```text
Analyzing Project...
Building...
Loading Components...
Fetching Git History...
```

---

# 63. Long-Running Operations

Quando uma operação demorar:

- mostrar estado;
- permitir observação;
- permitir cancelamento quando suportado;
- evitar congelar a interface;
- preservar o contexto.

---

# 64. Notification System

O Nexo pode possuir notificações para:

- job completed;
- build failed;
- deployment complete;
- AI task complete;
- Git operation result;
- approval required.

Notificações não devem substituir detalhes necessários da operação.

---

# 65. Audit UI

Usuários autorizados devem poder visualizar eventos relevantes.

Filtros podem incluir:

- user;
- agent;
- project;
- action;
- date;
- provider;
- result.

---

# 66. Settings Architecture

Configurações devem ser organizadas por escopo:

```text
User
Workspace
Project
Environment
Provider
```

A UI deve deixar claro em qual nível uma configuração está sendo alterada.

---

# 67. Data Ownership in UI

A interface deve indicar quando um recurso pertence a:

```text
Global
Workspace
Project
External Provider
```

Isso ajuda a evitar alterações incorretas.

---

# 68. External Provider UI

Quando um provider estiver indisponível, a interface deve mostrar:

```text
Available
Unavailable
Not Configured
Unauthorized
Error
```

sem esconder o motivo operacional relevante.

---

# 69. Agent Operations UI

Quando um agente executar uma operação importante, a interface deve permitir consultar:

- agente;
- usuário iniciador;
- projeto;
- operação;
- status;
- arquivos afetados;
- resultado;
- erro.

---

# 70. Programmatic Access não deve depender da UI

O fato de existir uma área visual de API ou Agent Access não significa que operações programáticas dependam dessa tela.

A API e os contracts existem independentemente da interface.

---

# 71. UI e API devem utilizar o mesmo authorization model

O sistema deve impedir:

```text
UI
→ Authorization

API
→ Different Rules
```

Ambos devem convergir para o mesmo modelo de segurança.

---

# 72. UI e AI devem utilizar os mesmos Domain Capabilities

Preferência:

```text
UI
↓
Application Service
↓
Domain Capability

AI
↓
Tool
↓
Application Service
↓
Domain Capability
```

Não criar uma implementação especial apenas para a AI.

---

# 73. Application State Recovery

Caso a aplicação recarregue ou o Runtime reinicie, a UI deve reconstruir seu estado a partir de fontes confiáveis.

Não depender apenas de memória local para afirmar:

> “o projeto está salvo.”

---

# 74. Browser Restart

Ao abrir novamente o Nexo:

- Workspace deve ser reavaliado;
- Project deve ser reavaliado;
- Git deve ser consultado;
- filesystem pode ter mudado;
- Jobs podem possuir estado;
- preview pode precisar ser reiniciado.

---

# 75. UI Performance

A interface deve ser capaz de trabalhar com projetos grandes sem tentar renderizar tudo simultaneamente.

Pode utilizar:

- lazy loading;
- virtualization;
- incremental indexing;
- progressive rendering;

quando apropriado.

A escolha deve ser baseada em necessidade real.

---

# 76. Large Project Handling

Projetos grandes devem possuir mecanismos para:

- evitar scan visual completo;
- carregar árvores incrementalmente;
- limitar contexto;
- priorizar áreas relevantes.

Isso é especialmente importante para AI Context.

---

# 77. Application and Project Intelligence

A UI deve aproveitar a inteligência do Project Model.

Não construir uma segunda lógica independente para detectar páginas ou componentes apenas para desenhar a interface.

---

# 78. Application and Runtime

A UI deve solicitar Runtime operations através de serviços apropriados.

Não criar acesso direto ao sistema operacional no frontend.

---

# 79. Application and Source Project

A UI deve refletir o Source Project.

Quando o projeto mudar externamente, a interface deve ser atualizada.

---

# 80. Application and Git

A UI deve consultar Git real.

Não manter um histórico fictício.

---

# 81. Application and AI

A UI deve mostrar o estado real das AI Tasks.

Não mostrar:

```text
100%
```

antes da conclusão real.

---

# 82. Application and Deployment

A UI deve refletir o estado real do Deployment Job/Provider.

Não marcar:

```text
Deployed
```

antes da confirmação necessária.

---

# 83. Application Error Recovery

Toda operação relevante deve possuir caminho de erro.

A UI deve comunicar:

- o que falhou;
- onde falhou;
- se o projeto foi alterado;
- se existe recuperação;
- se uma ação está pendente.

---

# 84. Architecture for Future Agent Control

O Nexo CMS deve permanecer preparado para que uma IA externa opere o sistema sem navegar pela interface.

A UI não deve ser considerada o contrato operacional oficial.

A operação oficial deve ser a capability do domínio.

---

# 85. Example — Human

```text
Human
↓
Nexo CMS UI
↓
project.create
↓
Authorization
↓
Project Service
↓
Runtime
```

---

# 86. Example — Kimi Code

```text
Kimi Code
↓
Nexo API / Agent Tool
↓
project.create
↓
Authorization
↓
Project Service
↓
Runtime
```

---

# 87. Example — Luna

```text
Luna
↓
Nexo Agent Provider
↓
project.create
↓
Authorization
↓
Project Service
↓
Runtime
```

---

# 88. Example — CLI

```text
nexo project create
↓
CLI
↓
project.create
↓
Authorization
↓
Project Service
↓
Runtime
```

Os quatro consumidores devem utilizar a mesma capacidade de domínio.

---

# 89. Critérios de aceitação

A aplicação Nexo CMS será considerada arquiteturalmente adequada quando:

1. não possuir lógica central exclusiva da UI;
2. utilizar Nexo Engine;
3. respeitar Authorization;
4. respeitar Project Model;
5. respeitar Adapters;
6. respeitar Runtime;
7. possuir editor visual;
8. possuir editor de código;
9. possuir Component Studio;
10. possuir Media Library;
11. possuir Design controls;
12. possuir Responsive Lab;
13. possuir Git UI;
14. possuir AI UI;
15. refletir estados reais;
16. permitir aprovação;
17. apresentar conflitos;
18. preservar o Source Project;
19. permitir operações programáticas equivalentes;
20. não depender de Playwright para controlar operações internas programáveis.

---

# 90. Regra para implementação

Antes de implementar qualquer parte da aplicação Nexo CMS, o agente deve consultar:

```text
Core System Architecture
Nexo Engine
Product Requirements
Feature Map
User Journeys
Core Invariants
User Roles
Permission Model
Design System
UI/UX
API Contracts
Runtime
```

Quando houver dúvida sobre uma tecnologia visual ou de plataforma:

1. verificar a documentação local;
2. pesquisar documentação oficial atual;
3. verificar compatibilidade com a versão utilizada;
4. somente então implementar.

---

# 91. Regra final

O Nexo CMS deve ser a experiência central do produto, mas não deve se tornar o centro da lógica.

A arquitetura correta é:

```text
Human
  ↓
UI
  ↓
Application
  ↓
Nexo Engine

AI
  ↓
API / Agent Tools
  ↓
Application
  ↓
Nexo Engine

CLI
  ↓
API / Application
  ↓
Nexo Engine
```

A interface deve tornar o Nexo poderoso e compreensível para humanos.

As interfaces programáticas devem tornar o mesmo Nexo controlável por máquinas.

> **Nexo CMS é a superfície de trabalho. Nexo Engine é a capacidade. Runtime é a execução. Adapters compreendem a tecnologia. Nenhuma dessas responsabilidades deve ser confundida.**