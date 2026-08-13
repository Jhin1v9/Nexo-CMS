# NEXO CMS
## Workspace Model

## 1. Propósito

Este documento define o modelo conceitual de **Workspace** do Nexo CMS.

O Workspace é a unidade organizacional responsável por agrupar:

- usuários;
- projetos;
- componentes;
- recursos compartilhados;
- configurações;
- permissões;
- integrações;
- providers;
- políticas.

O Workspace deve permitir que o Nexo funcione inicialmente para uma equipe interna da Nexo Digital e, posteriormente, para organizações independentes que utilizem o Nexo CMS como produto.

Este documento define comportamento e relacionamento entre entidades.

Ele não define ainda banco de dados, schema físico, tecnologia de autenticação ou implementação de multi-tenancy.

---

# 2. Conceito de Workspace

Um Workspace representa um ambiente organizacional dentro do Nexo.

Ele é uma fronteira lógica para:

- identidade;
- recursos;
- projetos;
- permissões;
- configurações;
- auditoria.

Conceitualmente:

```text
Workspace
├── Members
├── Projects
├── Component Library
├── Media Resources
├── Integrations
├── AI Providers
├── Deployment Providers
├── Plugins
├── Policies
├── Settings
└── Audit
```

---

# 3. Workspace não é um projeto

Workspace e Project são entidades diferentes.

```text
Workspace
    ↓
Project A
Project B
Project C
```

Um Workspace pode conter vários projetos.

Um Project pertence ao contexto de um Workspace, mas mantém identidade própria.

---

# 4. Workspace não é o filesystem

O Workspace representa organização dentro do Nexo.

Ele não deve ser confundido com:

- uma pasta do computador;
- um repositório Git;
- um diretório do VPS;
- um bucket;
- uma hospedagem.

Um Workspace pode administrar projetos armazenados em diferentes localizações compatíveis com o Runtime.

---

# 5. Identidade do Workspace

Todo Workspace deve possuir uma identidade estável.

A identidade deve ser diferente do nome exibido.

Conceitualmente:

```text
Workspace
├── ID
├── Name
├── Slug / Identifier
├── Created At
├── Created By
└── State
```

O ID deve permanecer estável mesmo que o nome do Workspace seja alterado.

---

# 6. Nome

O Workspace deve possuir um nome amigável.

O nome é utilizado principalmente para identificação humana.

Ele não deve ser tratado como identificador técnico permanente.

---

# 7. Estado do Workspace

O Workspace poderá possuir estados conceituais como:

```text
ACTIVE
SUSPENDED
ARCHIVED
DELETING
DELETED
```

A lista técnica definitiva poderá ser ampliada posteriormente.

---

# 8. ACTIVE

Workspace operacional.

Usuários autorizados podem acessar projetos e recursos conforme suas permissões.

---

# 9. SUSPENDED

Workspace temporariamente limitado.

Pode ocorrer por:

- política;
- billing futuro;
- ação administrativa;
- segurança;
- manutenção.

Um Workspace suspenso não deve necessariamente perder seus dados.

---

# 10. ARCHIVED

Workspace desativado para uso ativo, mas preservado.

---

# 11. DELETED

Estado lógico em que o Workspace deixou de existir operacionalmente.

A política de retenção e exclusão física será definida posteriormente pelo sistema de Storage.

---

# 12. Owner do Workspace

Todo Workspace deve possuir pelo menos um responsável com autoridade de Ownership.

O Owner:

- administra o Workspace;
- gerencia membros;
- controla configurações;
- controla recursos globais;
- pode transferir Ownership conforme regras específicas.

O sistema não deve permitir um estado inválido sem Owner quando a arquitetura exigir Ownership obrigatório.

---

# 13. Membros

Um usuário torna-se membro de um Workspace através de uma associação explícita.

Conceitualmente:

```text
User
   ↓
Workspace Membership
   ├── Role
   ├── Permissions
   ├── Status
   └── Project Scope
```

Membership não deve ser inferida apenas pelo fato de o usuário conhecer uma URL ou possuir acesso ao projeto em outro contexto.

---

# 14. Membership Status

Uma associação de usuário ao Workspace pode possuir estados como:

```text
INVITED
ACTIVE
SUSPENDED
REMOVED
```

O usuário não deve receber acesso completo enquanto a associação não estiver ativa.

---

# 15. Convites

Um Workspace deve permitir convidar usuários.

Fluxo conceitual:

```text
Owner / Admin
↓
Invite User
↓
Define Role
↓
Optional Project Scope
↓
Send Invitation
↓
User Accepts
↓
Membership ACTIVE
```

Convites devem ser auditáveis.

---

# 16. Role do Workspace

O membro deve possuir uma Role dentro do Workspace.

Exemplos iniciais:

- Owner;
- Admin;
- Developer;
- Designer;
- Editor;
- Viewer.

A Role do Workspace não precisa determinar automaticamente todas as permissões de todos os projetos.

---

# 17. Project Scope

O Workspace deve permitir restringir acesso a projetos específicos.

Exemplo:

```text
Workspace
├── Project A → Developer
├── Project B → Viewer
└── Project C → No Access
```

O modelo deve permitir esse nível de granularidade.

---

# 18. Recursos compartilhados

O Workspace pode possuir recursos que não pertencem exclusivamente a um projeto.

Exemplos:

- Global Components;
- Integration Definitions;
- AI Providers;
- Deployment Providers;
- Plugins;
- Design Resources;
- Media Resources;
- Templates.

Cada tipo de recurso deverá possuir sua própria política de acesso.

---

# 19. Global Component Library

A biblioteca global pertence ao contexto do Workspace.

Conceitualmente:

```text
Workspace
└── Global Component Library
    ├── Component A
    ├── Component B
    └── Component C
```

Projetos podem utilizar componentes globais quando forem compatíveis e autorizados.

---

# 20. Project Component Library

Cada projeto pode possuir sua própria biblioteca.

```text
Workspace
├── Global Components
└── Project
    └── Project Components
```

Componentes de projeto não devem ser publicados globalmente automaticamente.

---

# 21. Component Promotion

Um usuário autorizado poderá promover um componente de projeto para a biblioteca global.

A promoção deve considerar:

- dependências;
- assets;
- compatibilidade;
- tecnologia;
- secrets;
- imports;
- configurações;
- versão.

---

# 22. Media compartilhada

O Workspace poderá possuir mídia compartilhada.

Isso não significa que todos os projetos devam ter acesso automático a todos os assets.

O acesso deve ser controlável.

---

# 23. AI Providers no Workspace

Providers de IA podem ser configurados em nível de Workspace.

Exemplo:

```text
Workspace
├── Kimi
├── Luna
└── Custom Provider
```

Projetos podem utilizar providers disponíveis conforme permissões e configurações.

---

# 24. Segredos dos providers

Credenciais e secrets dos providers devem pertencer a um armazenamento protegido.

O Workspace pode possuir configuração de provider sem que todos os membros possam visualizar as credenciais.

Separar:

```text
Provider Configuration
```

de:

```text
Secret Material
```

é obrigatório.

---

# 25. Deployment Providers no Workspace

O Workspace pode possuir providers de deployment compartilhados.

Exemplo:

```text
Workspace
├── Vercel
├── Hostinger
└── SSH
```

Projetos deverão selecionar quais providers podem utilizar.

---

# 26. Project Binding

Um projeto deve possuir uma associação explícita com o Workspace.

Conceitualmente:

```text
Project
├── Workspace ID
├── Runtime
├── Source Location
├── Git
└── Configuration
```

Um projeto não deve aparecer como pertencente a múltiplos Workspaces simultaneamente sem uma regra explícita para isso.

---

# 27. Transferência de projeto

O sistema deve ser preparado para transferir um projeto de um Workspace para outro.

Isso é uma operação sensível.

Deve verificar:

- autorização;
- componentes globais utilizados;
- integrações;
- providers;
- secrets;
- políticas;
- usuários;
- histórico;
- Git;
- referências.

---

# 28. Transferência de projeto não deve duplicar o projeto automaticamente

Mover um projeto entre Workspaces é diferente de clonar um projeto.

```text
Transfer
→ mesma entidade Project
```

```text
Clone
→ nova entidade Project
```

Esses comportamentos não devem ser confundidos.

---

# 29. Clonagem dentro do Workspace

O Workspace pode permitir clonar projetos.

O clone deve possuir:

- nova identidade;
- novo contexto;
- revisão de Git;
- revisão de secrets;
- revisão de integrations;
- nova configuração de deployment.

---

# 30. Workspace Settings

O Workspace deve possuir uma área de configurações.

Pode incluir:

- nome;
- identidade visual;
- membros;
- roles;
- permissões;
- providers;
- integrações;
- componentes;
- plugins;
- políticas;
- segurança;
- auditoria;
- billing futuro.

A implementação detalhada será dividida entre os documentos especializados.

---

# 31. Workspace Policies

O Workspace poderá possuir políticas que afetam todos os projetos sob ele.

Exemplos conceituais:

```text
Production deploy requires approval
AI autonomous mode disabled
Force push disabled
External scripts require approval
Plugin installation restricted
```

Políticas de Workspace não devem ignorar regras de segurança global.

---

# 32. Hierarquia de políticas

Quando múltiplas políticas existirem, o sistema deverá determinar qual possui precedência.

Conceitualmente:

```text
Platform Safety
↓
Workspace Policy
↓
Project Policy
↓
Environment Policy
↓
User Permission
↓
Operation
```

A ordem definitiva deverá ser definida no Security e Permission Model.

O agente não deve inventar essa hierarquia durante implementação.

---

# 33. Projects Dashboard

O Workspace deve possuir uma visão dos projetos acessíveis ao usuário.

Cada projeto poderá mostrar:

- nome;
- status;
- stack;
- branch;
- Git state;
- environment;
- último update;
- possíveis problemas;
- provider;
- estado do projeto.

Usuários devem visualizar apenas projetos aos quais possuem acesso.

---

# 34. Project Discovery dentro do Workspace

Ao importar um projeto, ele deve ser associado a um Workspace antes de ser administrado como recurso do Workspace.

O Runtime pode estar no computador ou ambiente onde o projeto existe, mas isso não altera sua associação organizacional.

---

# 35. Runtime e Workspace

O Workspace não deve assumir que todos os projetos utilizam o mesmo Runtime.

Um Workspace pode possuir projetos operando em diferentes ambientes compatíveis.

Exemplo:

```text
Workspace
├── Project A → Runtime Local
├── Project B → Runtime VPS
└── Project C → Runtime Remote
```

A arquitetura do Runtime é independente da organização do Workspace.

---

# 36. Git e Workspace

O Workspace pode possuir configurações ou integrações Git compartilhadas.

Porém, cada Project continua possuindo sua própria identidade Git.

Não deve existir um único repository Git obrigatório para todo Workspace.

---

# 37. Audit do Workspace

O Workspace deverá possuir auditoria de eventos relevantes.

Exemplos:

- criação;
- alteração;
- convite;
- remoção;
- mudança de Role;
- criação de projeto;
- transferência;
- acesso a secrets;
- configuração de provider;
- plugin installation;
- deployment policy;
- operações críticas.

---

# 38. Isolamento

Projetos de um Workspace não devem possuir acesso implícito aos dados privados de outros projetos.

Exemplo:

```text
Project A
```

não deve conseguir ler:

```text
Project B Secrets
```

apenas porque ambos pertencem ao mesmo Workspace.

Recursos compartilhados devem possuir autorização explícita.

---

# 39. Isolamento de componentes

Da mesma forma:

```text
Global Component
```

pode ser compartilhado.

Mas:

```text
Project Component
```

não deve ser acessível automaticamente por outros projetos.

---

# 40. Isolamento de mídia

Media Library pode possuir:

```text
Workspace Media
Project Media
```

Os níveis não devem ser misturados.

---

# 41. Workspace e plugins

Plugins instalados em Workspace podem fornecer capacidades para vários projetos.

Mesmo assim, o plugin não deve receber automaticamente acesso aos projetos.

O plugin deve receber apenas as permissões necessárias conforme seu contrato.

---

# 42. Workspace e AI

O Workspace pode estabelecer:

- providers permitidos;
- models permitidos;
- modo automático permitido;
- uso de ferramentas;
- limites;
- políticas;
- acesso a internet;
- acesso a terminal.

A implementação dessas políticas será definida na área de AI e Security.

---

# 43. Workspace e SaaS

O Workspace é a unidade mais importante para futura evolução multi-tenant.

Na versão comercial, a arquitetura deverá permitir:

```text
Organization
└── Workspace(s)
    ├── Users
    ├── Projects
    └── Resources
```

ou outro modelo que seja tecnicamente mais adequado.

O design atual não deve impedir evolução para multi-tenancy.

---

# 44. Workspace não deve ser acoplado ao billing

Billing é uma capacidade futura.

O Workspace deve funcionar como unidade organizacional mesmo sem um sistema comercial ativo.

Quando billing existir, poderá ser associado ao Workspace sem alterar sua identidade central.

---

# 45. Workspace deletion

A exclusão de um Workspace deve ser uma operação crítica.

O sistema deve apresentar claramente o impacto potencial:

- projetos;
- componentes;
- mídia;
- integrações;
- providers;
- membros;
- auditoria;
- configurações.

A exclusão não deve automaticamente apagar os Source Projects sem confirmação específica e regras próprias.

---

# 46. Workspace archive

Arquivar deve ser uma alternativa menos destrutiva que excluir.

Um Workspace arquivado pode continuar armazenando informações para recuperação ou auditoria.

---

# 47. Workspace recovery

O sistema deve possuir estratégia para recuperação de Workspace quando tecnicamente necessário.

A natureza da recuperação dependerá do Storage e das políticas de retenção.

---

# 48. Estado consistente

Um Workspace só deve ser considerado READY/ACTIVE quando suas estruturas fundamentais estiverem consistentes.

Exemplos de inconsistência:

- projeto órfão;
- membro sem identidade válida;
- role inválida;
- componente global corrompido;
- provider inválido.

O comportamento exato deverá ser definido nas áreas de Storage e Security.

---

# 49. Workspace context no AI Engine

Quando a IA trabalhar dentro de um Workspace, seu contexto deve possuir escopo claro.

A IA deve saber, quando relevante:

```text
Workspace
Project
Environment
User
Permissions
Policies
```

Ela não deve receber automaticamente informações de todos os projetos do Workspace para qualquer tarefa.

---

# 50. Workspace context no Editor

O Editor deve operar dentro de um Workspace explicitamente selecionado.

A UI deve mostrar contexto suficiente para reduzir risco de editar o projeto errado.

---

# 51. Workspace context no Deployment

Deploy deve sempre possuir contexto explícito:

```text
Workspace
Project
Environment
Provider
Target
```

Uma operação não deve depender de memória da sessão para descobrir onde publicar.

---

# 52. Workspace context no Git

Git é propriedade operacional do projeto.

O Workspace pode armazenar integrações e políticas, mas não deve substituir a identidade Git do projeto.

---

# 53. Workspace switching

Um usuário que pertença a vários Workspaces deve poder trocar de contexto.

Ao trocar de Workspace:

- projetos devem ser atualizados;
- recursos devem ser recalculados;
- permissões devem ser reavaliadas;
- providers disponíveis podem mudar;
- configurações devem mudar.

A UI não deve manter recursos do Workspace anterior como se pertencessem ao novo.

---

# 54. Workspace boundaries

Toda operação que acessar recursos do sistema deve determinar seu Workspace quando o recurso for Workspace-scoped.

Isso é especialmente importante para APIs e Runtime integrations.

---

# 55. Resource ownership

Cada recurso persistente importante deve possuir uma relação clara de ownership ou scope.

Exemplos:

```text
Project → Workspace
Global Component → Workspace
Project Component → Project
Workspace Provider → Workspace
Project Integration → Project
User → Platform Identity
Membership → Workspace
```

---

# 56. Compartilhamento entre Workspaces

O compartilhamento entre Workspaces deve ser tratado como caso especial.

Não deve existir compartilhamento implícito.

Um recurso compartilhado entre organizações deverá possuir mecanismo explícito e auditável.

---

# 57. Templates

Workspaces poderão possuir templates no futuro.

Templates não devem ser confundidos com projetos.

Um Template serve como origem reutilizável.

Um Project é uma instância real.

---

# 58. Component Library como patrimônio do Workspace

A biblioteca global deve ser considerada um ativo estratégico do Workspace.

Ela deve possuir:

- identidade;
- versões;
- dependências;
- compatibilidade;
- ownership;
- permissões;
- auditoria.

---

# 59. Workspace onboarding

Um novo Workspace deverá possuir fluxo de configuração inicial.

Conceitualmente:

```text
Create Workspace
↓
Configure Identity
↓
Invite Team
↓
Configure Providers
↓
Configure Policies
↓
Create / Import Project
```

O onboarding não deve exigir que todos os recursos futuros sejam configurados imediatamente.

---

# 60. Workspace observability

O Workspace deve possuir indicadores relevantes para:

- projetos;
- erros;
- deployments;
- jobs;
- AI usage futuro;
- membros;
- segurança.

A forma exata será definida no sistema de Observability.

---

# 61. Workspace quotas

No futuro, o Workspace poderá possuir limites associados ao plano SaaS.

Exemplos:

- quantidade de projetos;
- armazenamento;
- usuários;
- IA;
- deployments;
- componentes.

Esses limites não devem contaminar a arquitetura fundamental do Workspace.

---

# 62. Workspace billing futuro

Billing deverá poder se associar ao Workspace sem transformar billing em requisito para funcionamento interno.

O modelo comercial será documentado em `28-commercial-saas`.

---

# 63. Workspace e multi-tenancy

A arquitetura deve ser capaz de isolar adequadamente diferentes Workspaces.

Um erro de autorização não deve permitir que uma requisição destinada a:

```text
Workspace A
```

acesse:

```text
Workspace B
```

Essa regra deverá ser validada especialmente nos testes de segurança.

---

# 64. Workspace e cache

Caches não devem vazar recursos entre Workspaces.

Se um dado possuir escopo de Workspace, o cache deverá respeitar esse escopo.

---

# 65. Workspace e logs

Logs administrativos devem possuir contexto de Workspace quando aplicável.

Exemplo:

```text
Workspace
Project
User
Action
Resource
Result
Timestamp
```

---

# 66. Workspace e eventos

Eventos internos deverão possuir contexto suficiente para identificar a qual Workspace pertencem quando aplicável.

Isso é importante para:

- autorização;
- auditoria;
- observabilidade;
- processamento assíncrono.

---

# 67. Workspace e jobs

Jobs assíncronos devem carregar seu contexto de Workspace quando a operação for Workspace-scoped.

Um job não deve depender apenas de estado global em memória.

---

# 68. Critérios de aceitação

O Workspace Model será considerado corretamente atendido quando o sistema conseguir:

1. criar Workspaces;
2. identificar Workspaces;
3. adicionar membros;
4. atribuir Roles;
5. restringir acesso;
6. associar projetos;
7. compartilhar recursos explicitamente;
8. isolar projetos;
9. isolar secrets;
10. controlar providers;
11. aplicar políticas;
12. registrar auditoria;
13. suportar diferentes Runtimes;
14. permitir troca de Workspace;
15. preparar futura evolução para SaaS;
16. impedir vazamento de recursos entre Workspaces.

---

# 69. Regra para agentes

Ao implementar qualquer recurso relacionado a Workspace, o agente deve consultar:

```text
Product Requirements
User Roles
Workspace Model
Permission Model
Security Architecture
Storage Architecture
API Contracts
Core Invariants
```

Se houver necessidade de escolher uma tecnologia para multi-tenancy, autenticação, banco ou autorização:

- não presumir;
- verificar documentos existentes;
- pesquisar documentação oficial atual quando necessário;
- registrar a decisão no documento apropriado.

---

# 70. Regra final

Workspace é a fronteira organizacional do Nexo CMS.

Ele deve permitir administrar projetos e recursos compartilhados sem transformar todos os recursos em um único espaço sem isolamento.

> **Workspace organiza pessoas, projetos e recursos. Project representa um projeto real. Permission controla o acesso. Policy controla o contexto. O Runtime executa a operação.**