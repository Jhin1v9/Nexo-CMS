# NEXO CMS
## Permission Model

## 1. Propósito

Este documento define o modelo conceitual de permissões do Nexo CMS.

O objetivo é estabelecer como o sistema determina se uma identidade possui autorização suficiente para executar uma operação sobre determinado recurso, projeto, ambiente ou Workspace.

Este documento complementa:

- User Roles;
- Workspace Model;
- Security Architecture;
- Runtime Permissions;
- AI Permissions;
- API Contracts.

Ele não define ainda a tecnologia específica utilizada para implementar autorização.

Não assumir previamente:

- RBAC puro;
- ABAC puro;
- ACL;
- policy engine específico;
- JWT;
- middleware específico;
- banco de dados específico.

A implementação deverá escolher o mecanismo mais adequado depois que os requisitos de segurança e arquitetura estiverem completamente especificados.

---

# 2. Princípio fundamental

O Nexo nunca deve decidir autorização apenas pela aparência da interface.

Esconder um botão não é segurança.

Desabilitar um menu não é segurança.

A autorização deve ser validada no ponto em que a operação realmente é executada.

A estrutura conceitual é:

```text
Identity
↓
Membership
↓
Role
↓
Effective Permissions
↓
Resource Scope
↓
Environment
↓
Policy
↓
Operation
↓
Authorization Decision
```

---

# 3. Authorization Decision

Toda operação protegida deve resultar em uma decisão explícita:

```text
ALLOW
DENY
REQUIRE_APPROVAL
UNKNOWN
```

## ALLOW

A operação pode prosseguir.

## DENY

A operação não pode prosseguir.

## REQUIRE_APPROVAL

O usuário possui autorização suficiente para solicitar a ação, mas uma política exige aprovação adicional.

## UNKNOWN

O sistema não possui contexto suficiente para tomar uma decisão segura.

UNKNOWN não deve ser tratado automaticamente como ALLOW.

---

# 4. Identidade

Toda operação protegida deve possuir uma identidade responsável.

Essa identidade pode representar:

- usuário humano;
- agente de IA;
- processo autorizado;
- operação administrativa interna.

Uma operação nunca deve ser considerada “sem autor” quando possuir impacto relevante.

---

# 5. Human Initiator

Quando uma operação for iniciada por uma pessoa, o sistema deve preservar a identidade humana responsável pela solicitação.

Exemplo:

```text
Human:
User A

Action:
Deploy Production
```

---

# 6. Agent Identity

Quando uma operação for executada por IA, o sistema deve ser capaz de distinguir:

```text
Requested By:
User A

Executed By:
Nexo AI / Kimi

Action:
Modify Hero.tsx
```

Isso é importante para autorização e auditoria.

---

# 7. Permission

Permission representa uma capacidade específica que uma identidade pode possuir.

Exemplos conceituais:

```text
project.read
project.write
files.read
files.write
terminal.execute
git.commit
git.push
deployment.execute
ai.execute
```

Permissões devem representar operações, não simplesmente páginas da interface.

---

# 8. Resource

Resource é aquilo sobre o qual uma operação é executada.

Pode ser:

- Workspace;
- Project;
- File;
- Component;
- Asset;
- Integration;
- Branch;
- Repository;
- Deployment;
- Environment;
- Provider;
- Secret.

---

# 9. Resource Scope

Todo recurso importante deve possuir um escopo claro.

Exemplo:

```text
Workspace
└── Project
    ├── Component
    ├── Asset
    ├── Integration
    └── Environment
```

A autorização deve considerar o escopo real do recurso.

---

# 10. Workspace Scope

Uma permissão pode aplicar-se a todo Workspace.

Exemplo:

```text
workspace.members.read
workspace.members.write
workspace.settings.write
```

Isso não implica automaticamente acesso equivalente a todos os recursos de todos os projetos.

---

# 11. Project Scope

Uma permissão pode estar limitada a um projeto específico.

Exemplo:

```text
Project A:
project.write = ALLOW

Project B:
project.write = DENY
```

---

# 12. Environment Scope

Permissões podem variar entre:

```text
Development
Preview
Staging
Production
```

Exemplo:

```text
deployment.execute
Development → ALLOW
Production → REQUIRE_APPROVAL
```

---

# 13. Resource Scope deve ser explícito

O sistema não deve assumir que uma autorização para:

```text
Project A
```

significa automaticamente:

```text
Todos os projetos
```

ou:

```text
Todos os Workspaces
```

Escopo deve ser explícito.

---

# 14. Role

Role é uma forma organizada de agrupar permissões.

Roles iniciais:

```text
Owner
Admin
Developer
Designer
Editor
Viewer
```

A Role não deve ser utilizada como substituto de autorização contextual.

---

# 15. Effective Permissions

As permissões efetivas de um usuário resultam da combinação entre:

```text
Role
+
Explicit Permissions
+
Workspace Membership
+
Project Access
+
Policies
+
Resource Scope
```

A fórmula técnica exata será definida na arquitetura de autorização.

---

# 16. Least Privilege

O Nexo deve aplicar princípio de menor privilégio.

Uma identidade deve receber apenas as permissões necessárias para realizar seu trabalho.

Isso vale especialmente para:

- filesystem;
- terminal;
- Git;
- secrets;
- AI;
- plugins;
- deployment.

---

# 17. Default Deny

Quando nenhuma regra aplicável conceder explicitamente uma operação protegida, o comportamento padrão deverá ser:

```text
DENY
```

O sistema não deve assumir ALLOW por ausência de uma regra de bloqueio.

---

# 18. Explicit Allow

Quando uma operação for autorizada por uma regra válida e seu contexto for compatível, o sistema poderá retornar:

```text
ALLOW
```

---

# 19. Explicit Deny

Uma regra explícita de negação deve impedir a operação quando o modelo de políticas assim determinar.

O comportamento exato de precedência entre Allow e Deny deverá ser definido na Security Architecture.

Agentes não devem inventar uma precedência diferente.

---

# 20. Approval

Algumas operações podem ser autorizadas apenas mediante aprovação.

Exemplos:

- Production deployment;
- Force Push;
- Reset de branch;
- alteração de secrets;
- instalação de plugin privilegiado;
- ação autônoma da IA com alto impacto.

O sistema deve distinguir:

```text
Permission to Request
```

de:

```text
Permission to Execute
```

---

# 21. Permissions por domínio

O modelo deve suportar permissões organizadas por domínio.

Estrutura conceitual:

```text
workspace.*
project.*
files.*
terminal.*
process.*
git.*
component.*
media.*
integration.*
ai.*
deployment.*
plugin.*
user.*
audit.*
settings.*
```

A nomenclatura definitiva deverá ser congelada nos contratos de autorização.

---

# 22. Project Permissions

Permissões relacionadas a projetos podem incluir:

```text
project.read
project.write
project.create
project.clone
project.export
project.archive
project.remove
project.settings.read
project.settings.write
```

As operações reais devem ser definidas pelo Project API.

---

# 23. Filesystem Permissions

Permissões relacionadas a arquivos podem incluir:

```text
files.read
files.write
files.create
files.delete
files.rename
files.move
```

Operações destrutivas podem exigir políticas adicionais.

---

# 24. Terminal Permissions

Terminal é uma capacidade privilegiada.

O sistema deve permitir diferenciar pelo menos conceitualmente:

```text
terminal.read
terminal.execute
terminal.execute_sensitive
terminal.manage_processes
```

A granularidade final deverá ser definida pela Security Architecture.

---

# 25. Process Permissions

Operações relacionadas a processos podem incluir:

```text
process.read
process.start
process.stop
process.restart
process.inspect
```

---

# 26. Git Permissions

O modelo deverá separar operações Git.

Exemplos:

```text
git.read
git.init
git.branch.create
git.branch.switch
git.commit
git.push
git.pull
git.fetch
git.merge
git.rebase
git.stash
git.revert
git.reset
git.cherry_pick
```

Operações potencialmente destrutivas devem possuir proteção adicional.

---

# 27. Force Push

Force Push deve ser tratado como operação de alto risco.

Mesmo quando um usuário possui:

```text
git.push
```

isso não deve significar automaticamente:

```text
git.force_push
```

A permissão deve ser separada.

---

# 28. Git Repository Creation

Criar repository remoto deve ser uma capacidade separada de fazer commits locais.

Exemplo:

```text
git.repository.create
```

Essa operação também pode depender de uma integração externa como GitHub.

---

# 29. Component Permissions

O sistema deve diferenciar componentes de projeto e globais.

Exemplos:

```text
component.project.read
component.project.write

component.global.read
component.global.write
component.global.publish
component.global.update
```

---

# 30. Component Promotion Permission

Promover um componente de projeto para a biblioteca global deve possuir autorização própria.

Exemplo:

```text
component.promote
```

A promoção não deve ocorrer apenas porque o usuário pode editar o componente local.

---

# 31. Media Permissions

Exemplos:

```text
media.read
media.upload
media.write
media.replace
media.delete
media.global.read
media.global.write
```

Excluir asset referenciado pode exigir confirmação adicional independentemente da permission básica.

---

# 32. Integration Permissions

Exemplos:

```text
integration.read
integration.create
integration.write
integration.delete
integration.execute
integration.credentials.read
integration.credentials.write
```

O acesso à configuração não implica acesso aos secrets.

---

# 33. Secret Permissions

Secrets são recursos altamente sensíveis.

O modelo deve ser capaz de separar:

```text
secret.exists
secret.use
secret.write
secret.read
```

A capacidade de usar um secret não deve obrigatoriamente significar poder visualizar seu valor.

---

# 34. AI Permissions

A IA deverá possuir permissões próprias.

Exemplos:

```text
ai.use
ai.read_context
ai.read_files
ai.write_files
ai.create_components
ai.create_pages
ai.run_commands
ai.run_tests
ai.run_build
ai.git_commit
ai.git_push
ai.deploy
ai.autonomous
```

Essa lista é conceitual e deverá ser refinada no AI Permissions.

---

# 35. AI não recebe permissões automaticamente

Quando um usuário possui:

```text
terminal.execute
```

isso não significa automaticamente que:

```text
AI.run_commands
```

seja permitido.

O acesso da IA deve ser uma decisão própria do sistema.

---

# 36. AI Delegation

Quando um usuário solicita que a IA execute uma operação, o sistema deve avaliar:

```text
User Permission
+
AI Permission
+
Project Policy
+
Operation Risk
```

A IA deve operar apenas dentro do conjunto efetivamente concedido.

---

# 37. AI Autonomous Permission

Modo automático deve possuir permissão específica.

Exemplo:

```text
ai.autonomous
```

A presença dessa permissão não remove outras restrições.

Uma IA autônoma ainda deve respeitar:

- filesystem policy;
- command policy;
- Git policy;
- deployment policy;
- approval requirements.

---

# 38. Plugin Permissions

Plugins devem solicitar capacidades explícitas.

Exemplos:

```text
plugin.read_project
plugin.write_project
plugin.execute_command
plugin.access_network
plugin.access_secrets
plugin.create_component
```

A nomenclatura final será definida no Plugin API.

---

# 39. Plugin não herda privilégios do usuário automaticamente

Um plugin instalado por um Admin não deve automaticamente possuir acesso irrestrito ao filesystem.

O plugin precisa operar dentro das permissões concedidas ao plugin e do contexto do usuário, conforme o modelo definitivo.

---

# 40. Deployment Permissions

Exemplos:

```text
deployment.read
deployment.configure
deployment.preview
deployment.execute
deployment.production.execute
deployment.rollback
```

---

# 41. Provider Scope

A autorização deve considerar o provider específico quando necessário.

Exemplo:

```text
deployment.execute
Project A
Provider Vercel
→ ALLOW

deployment.execute
Project A
Provider Production SSH
→ DENY
```

O mesmo tipo de operação pode possuir políticas diferentes dependendo do destino.

---

# 42. Environment Policies

Production pode exigir controles adicionais.

Exemplo:

```text
Development:
deployment.execute → ALLOW

Production:
deployment.execute → REQUIRE_APPROVAL
```

---

# 43. Workspace Policies

Policies podem restringir permissões efetivas.

Exemplos:

```text
Disable Autonomous AI
Disable Force Push
Require Production Approval
Restrict Plugin Installation
Restrict External Scripts
```

---

# 44. Project Policies

Um projeto pode possuir regras mais restritivas que o Workspace.

Exemplo:

```text
Workspace:
Production deployment allowed

Project A:
Production deployment requires Owner approval
```

A política mais restritiva deve prevalecer quando essa regra estiver definida pela Security Architecture.

---

# 45. Policy Context

Uma autorização pode depender de contexto adicional:

```text
Identity
Workspace
Project
Environment
Resource
Provider
Operation
Risk
Time
Policy
```

O sistema não deve reduzir todas as decisões a uma Role simples.

---

# 46. Time-Based Permissions

A arquitetura deve permanecer preparada para permissões dependentes de tempo.

Exemplo:

```text
Temporary production deployment
```

Esse recurso pode ser futuro e não precisa fazer parte do primeiro release.

---

# 47. Resource Ownership

O sistema deve respeitar ownership.

Exemplo:

```text
Global Component
→ Workspace

Project Component
→ Project

Project Secret
→ Project

Workspace Provider
→ Workspace
```

A autorização deve considerar o proprietário ou escopo do recurso.

---

# 48. Cross-Workspace Access

Acesso entre Workspaces deve ser explicitamente autorizado.

Não deve existir:

```text
User belongs to Workspace A
↓
automatic access to Workspace B
```

---

# 49. Cross-Project Access

Acesso entre projetos também deve ser explícito quando houver restrição de projeto.

---

# 50. API Authorization

Todas as operações protegidas executadas por APIs devem validar autorização no backend ou camada responsável pela execução.

A UI nunca deve ser considerada barreira de segurança suficiente.

---

# 51. Runtime Authorization

O Runtime deve validar operações sensíveis antes de executar:

- comandos;
- filesystem writes;
- deletes;
- processes;
- Git;
- deployment.

---

# 52. Git Authorization

Git operations iniciadas pela UI e pela IA devem passar pelo mesmo sistema de autorização.

Não pode existir:

```text
UI Git
→ Security

AI Git
→ bypass
```

Ambos devem obedecer às mesmas políticas fundamentais.

---

# 53. Terminal Authorization

Da mesma forma:

```text
UI Terminal
→ Authorization

AI Tool terminal.execute
→ Authorization
```

As duas entradas devem convergir para o mesmo mecanismo de segurança.

---

# 54. Deployment Authorization

Deploy iniciado manualmente e deploy iniciado pela IA devem estar sujeitos ao mesmo modelo de autorização.

---

# 55. Authorization não deve depender de esconder funcionalidade

Mesmo que determinado recurso não apareça na interface:

```text
POST /protected-operation
```

deve continuar sendo rejeitado sem a autorização necessária.

---

# 56. Permission Inheritance

O sistema poderá possuir herança de permissões, mas essa herança deve ser explicitamente definida.

Exemplo conceitual:

```text
Workspace Permission
↓
Project
↓
Resource
```

Nenhuma herança deve ser criada por conveniência de implementação sem definição documental.

---

# 57. Permission Revocation

Permissões removidas devem deixar de produzir autorização efetiva.

O sistema deve considerar sessões, caches, tokens e jobs em andamento para evitar que uma permissão revogada continue válida por tempo indefinido.

A implementação exata será definida em Security Architecture.

---

# 58. Long-Running Jobs

Jobs iniciados antes de uma mudança de permissão precisam possuir política explícita.

Exemplo:

```text
User starts deployment
↓
Permission revoked
↓
What happens?
```

Não assumir comportamento.

Essa decisão deve ser definida no Security/Jobs Model antes da implementação.

---

# 59. Background AI Jobs

O mesmo vale para tarefas de IA executadas em background.

Uma tarefa deve possuir:

- identidade iniciadora;
- contexto;
- permissões aplicáveis;
- política de revogação;
- resultado auditável.

---

# 60. Permission Cache

Se a implementação utilizar cache de autorização, ele deve respeitar:

- escopo;
- expiração;
- revogação;
- identidade;
- Workspace;
- Project;
- Environment.

Cache não pode causar autorização indevida.

---

# 61. Denied Operations

Quando uma operação for negada, a interface deve explicar o suficiente para o usuário compreender que:

- a operação foi bloqueada;
- qual capacidade está faltando;
- se precisa de aprovação;
- ou se a política do ambiente impede a ação.

Não expor detalhes sensíveis do sistema de autorização.

---

# 62. Unknown Authorization

Quando o sistema não possuir contexto suficiente para decidir com segurança, deve retornar:

```text
UNKNOWN
```

e bloquear a execução até que o contexto necessário exista.

UNKNOWN não equivale a ALLOW.

---

# 63. Permission Errors

Erros de autorização não devem modificar o recurso.

Exemplo:

```text
Attempt
↓
Authorization denied
↓
No filesystem write
No Git change
No deploy
```

---

# 64. Authorization and Audit

Cada operação sensível deve possuir registro suficiente para identificar:

```text
Who
What
Resource
Context
Decision
Result
Time
```

Quando aplicável:

```text
Approval
Policy
Provider
Environment
```

---

# 65. Approval Audit

Uma operação que exigiu aprovação deve registrar:

- quem solicitou;
- quem aprovou;
- quando;
- qual operação;
- qual recurso;
- qual resultado.

---

# 66. Role Changes and Permissions

Alterações que modifiquem permissões efetivas devem ser auditadas.

Exemplos:

- Role change;
- explicit grant;
- explicit revoke;
- project access;
- policy update.

---

# 67. Permission Evaluation Boundary

O sistema deve possuir um ponto claro responsável por transformar contexto em decisão de autorização.

A implementação não deve espalhar regras incompatíveis por dezenas de partes da aplicação.

Conceitualmente:

```text
Authorization Context
↓
Authorization Engine
↓
Decision
```

---

# 68. Policy Engine

Caso uma Policy Engine seja utilizada, ela deverá ser independente dos detalhes da UI.

A Policy Engine deverá receber contexto suficiente e retornar uma decisão determinística quando houver informação suficiente.

A tecnologia específica deve ser decidida posteriormente mediante pesquisa e comparação.

---

# 69. Security over convenience

Se existir conflito entre:

```text
Easy implementation
```

e:

```text
Safe authorization
```

segurança deve prevalecer.

---

# 70. Não assumir confiança por localização

O fato de uma operação acontecer:

```text
localhost
```

não significa automaticamente que ela seja confiável.

O fato de estar no:

```text
VPS
```

também não significa autorização automática.

O Runtime deve possuir modelo explícito de identidade e permissão conforme o ambiente.

---

# 71. Não assumir confiança por ferramenta

Operações provenientes de:

- UI;
- terminal;
- IA;
- plugin;
- API;
- processo interno;

devem respeitar os contratos de autorização correspondentes.

A origem técnica não deve ser utilizada como desculpa para bypass.

---

# 72. Permission Model para o K3 Swarm

Os agentes que implementarem autorização devem:

1. ler este documento;
2. ler User Roles;
3. ler Workspace Model;
4. ler Security Architecture;
5. ler Runtime Permissions;
6. ler AI Permissions;
7. ler API Contracts;
8. consultar as Core Invariants;
9. identificar decisões ainda abertas;
10. pesquisar documentação oficial quando uma tecnologia de segurança externa for escolhida.

Nenhum agente deve inventar um sistema de permissões baseado apenas em conveniência.

---

# 73. Pesquisa técnica obrigatória

Quando a implementação depender de:

- OAuth;
- OpenID Connect;
- GitHub authentication;
- browser security;
- filesystem permissions;
- process isolation;
- sandboxing;
- secret management;
- policy engines;
- session management;

o agente deve consultar documentação oficial e fontes técnicas primárias antes de implementar detalhes específicos.

Versões atuais e APIs atuais devem ser verificadas na data da implementação.

---

# 74. Critérios de aceitação

O Permission Model será considerado corretamente implementado quando o sistema conseguir:

1. identificar o autor da operação;
2. verificar Role;
3. verificar permissões efetivas;
4. verificar escopo;
5. verificar Project;
6. verificar Environment;
7. verificar Policy;
8. retornar decisão explícita;
9. bloquear operações não autorizadas;
10. diferenciar AI de usuário humano;
11. controlar terminal;
12. controlar Git;
13. controlar deploy;
14. controlar secrets;
15. controlar plugins;
16. registrar operações relevantes;
17. aplicar o mesmo modelo independentemente da origem da operação;
18. manter default deny quando não houver autorização suficiente.

---

# 75. Regra final

O modelo de permissão do Nexo deve responder a uma pergunta concreta:

> **“Esta identidade está autorizada a executar esta operação, sobre este recurso, neste contexto e neste ambiente?”**

A resposta nunca deve depender apenas de quem é o usuário.

Ela deve considerar o contexto completo.

> **Permission é capacidade. Scope é alcance. Policy é contexto. Approval é controle adicional. Authorization é a decisão final.**