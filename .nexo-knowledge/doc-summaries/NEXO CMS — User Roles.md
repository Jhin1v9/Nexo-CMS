# NEXO CMS
## User Roles

## 1. Propósito

Este documento define os papéis de usuário do Nexo CMS, suas responsabilidades, capacidades esperadas e limites de autoridade.

Os papéis descritos aqui representam **funções dentro do produto**, não necessariamente implementações técnicas de autenticação ou autorização.

A implementação deverá posteriormente transformar estes papéis em permissões concretas, conforme definido em:

```text id="0f5n8y"
17-security/
18-workspaces-users/
24-api-contracts/
```

Este documento deve evitar ambiguidades sobre quem pode:

- visualizar;
- editar;
- executar comandos;
- utilizar IA;
- alterar Git;
- publicar;
- administrar usuários;
- administrar componentes;
- alterar configurações.

---

# 2. Princípio fundamental

O Nexo deve separar:

```text id="7i0d9m"
IDENTIDADE
    ↓
ROLE
    ↓
PERMISSIONS
    ↓
RESOURCE ACCESS
    ↓
OPERATION
```

Uma Role não deve, sozinha, representar toda a autorização do usuário.

O acesso final deverá considerar:

- identidade;
- workspace;
- projeto;
- recurso;
- operação;
- permissões;
- estado do ambiente;
- políticas de segurança.

---

# 3. Papéis oficiais

O modelo inicial deverá suportar pelo menos:

```text id="j6b1z4"
Owner
Admin
Developer
Designer
Editor
Viewer
```

Esses papéis representam o conjunto inicial de funções do produto.

A arquitetura deve permitir adicionar novos papéis futuramente sem reconstruir o sistema de autorização.

---

# 4. Owner

## Objetivo

Representar o responsável máximo por um Workspace.

O Owner possui autoridade administrativa ampla sobre a organização ou workspace ao qual pertence.

## Responsabilidades

O Owner pode administrar:

- workspace;
- usuários;
- papéis;
- projetos;
- permissões;
- configurações;
- integrações;
- providers;
- billing, quando disponível;
- componentes globais;
- plugins, quando permitido;
- políticas do workspace.

## Capacidades esperadas

O Owner deverá poder:

- criar workspace;
- alterar informações do workspace;
- convidar usuários;
- remover usuários;
- alterar roles;
- acessar projetos;
- definir permissões;
- configurar providers;
- configurar integrações;
- controlar recursos globais;
- administrar componentes globais;
- administrar configurações comerciais quando disponíveis.

## Limite

Mesmo o Owner deverá respeitar mecanismos de segurança para operações irreversíveis ou críticas.

Owner não significa:

> bypass absoluto de segurança.

---

# 5. Admin

## Objetivo

Representar um administrador operacional do Workspace.

O Admin possui grande autoridade administrativa, mas pode possuir restrições sobre:

- propriedade da organização;
- billing;
- transferência de ownership;
- algumas configurações críticas;
- ações definidas exclusivamente para Owner.

## Capacidades esperadas

O Admin deverá poder:

- administrar usuários;
- administrar projetos;
- configurar permissões dentro dos limites concedidos;
- administrar componentes globais;
- administrar mídia compartilhada;
- administrar integrações;
- visualizar logs;
- administrar configurações operacionais.

---

# 6. Developer

## Objetivo

Representar um profissional responsável pela implementação técnica dos projetos.

O Developer é um dos papéis mais importantes do Nexo porque possui acesso a capacidades profundas do projeto.

## Capacidades esperadas

O Developer poderá, conforme permissões do workspace/projeto:

- acessar código;
- editar arquivos;
- usar editor visual;
- usar terminal;
- executar comandos;
- executar builds;
- iniciar servidores;
- acessar Git;
- criar branches;
- fazer commits;
- fazer push/pull;
- utilizar AI Engineer;
- criar componentes;
- modificar componentes;
- administrar assets;
- diagnosticar problemas;
- acessar Responsive Lab;
- executar deploys permitidos.

## Operações sensíveis

Terminal, secrets, deploy e comandos destrutivos devem continuar sujeitos às políticas de segurança.

Ser Developer não deve significar acesso irrestrito a tudo.

---

# 7. Designer

## Objetivo

Representar profissional focado na interface, identidade visual, layout, componentes e responsividade.

## Capacidades esperadas

O Designer poderá, conforme permissões:

- utilizar Visual Editor;
- modificar propriedades visuais;
- editar cores;
- editar gradients;
- editar tipografia;
- editar spacing;
- editar radius;
- editar shadows;
- trabalhar com assets;
- editar componentes;
- usar Component Studio;
- trabalhar no Responsive Lab;
- criar e modificar layouts;
- revisar previews.

## Limitações esperadas

Por padrão, o Designer não deve precisar possuir:

- acesso irrestrito ao terminal;
- acesso irrestrito a secrets;
- autoridade administrativa;
- acesso irrestrito a deploy;
- operações Git destrutivas.

Essas capacidades podem ser concedidas através de permissões específicas quando necessário.

---

# 8. Editor

## Objetivo

Representar usuário responsável por conteúdo.

O Editor deve conseguir administrar conteúdo sem necessariamente possuir acesso profundo ao código.

## Capacidades esperadas

Conforme permissões do projeto, o Editor poderá:

- editar textos;
- alterar títulos;
- alterar descrições;
- editar links;
- editar imagens;
- editar conteúdo de carrosséis;
- reorganizar conteúdo suportado;
- editar blog;
- atualizar metadados;
- trabalhar com Media Library;
- visualizar preview;
- revisar alterações;
- salvar alterações.

## Limitações esperadas

O Editor não deve possuir por padrão:

- terminal;
- acesso irrestrito ao código;
- comandos de sistema;
- operações Git avançadas;
- gerenciamento de secrets;
- deploy;
- administração do workspace.

Essas capacidades podem ser concedidas explicitamente.

---

# 9. Viewer

## Objetivo

Representar usuário somente para consulta e acompanhamento.

## Capacidades esperadas

O Viewer poderá:

- visualizar projetos;
- visualizar preview;
- visualizar componentes;
- visualizar Media Library;
- visualizar Git status;
- visualizar histórico permitido;
- visualizar informações relevantes.

O Viewer não deve alterar o projeto.

---

# 10. Separação entre Role e Permission

O Nexo não deve implementar autorização exclusivamente com verificações simplistas como:

```text id="k2v8rh"
if role === "developer"
```

Esse modelo seria insuficiente.

A autorização deve considerar a permissão necessária para a operação.

Exemplo conceitual:

```text id="9j3q4u"
Role:
Developer

Permission:
project.files.write

Resource:
Project A

Environment:
Development

Result:
ALLOW
```

Enquanto:

```text id="n7c2px"
Role:
Developer

Permission:
deployment.production.execute

Resource:
Project A

Environment:
Production

Result:
MAY REQUIRE ADDITIONAL POLICY
```

---

# 11. Permissões por domínio

O sistema de permissões deverá ser organizado por domínio.

Exemplos conceituais:

```text id="s3m9y6"
project.read
project.write

files.read
files.write
files.delete

terminal.execute
process.manage

git.read
git.commit
git.push
git.branch
git.merge
git.rebase
git.reset

component.read
component.write
component.publish

media.read
media.write
media.delete

ai.use
ai.execute
ai.approve
ai.autonomous

integration.read
integration.write

deployment.read
deployment.execute
deployment.rollback

workspace.read
workspace.write

users.read
users.write

settings.read
settings.write
```

A nomenclatura definitiva deverá ser especificada no documento de Permission Model e nos contratos de autorização.

---

# 12. Recursos e escopo

Uma mesma permissão pode possuir diferentes escopos.

Exemplo:

```text id="8c4vm1"
Workspace
Project
Environment
Resource
```

Uma pessoa pode possuir:

```text id="03r4f2"
component.write
```

em um determinado projeto, mas não em outro.

Isso deverá ser suportado pela arquitetura.

---

# 13. Permissões de projeto

Projetos deverão poder possuir regras específicas.

Exemplo:

```text id="ep7x3d"
Junior Reformas
```

pode permitir:

```text
Developer → Deploy
Designer → Visual Edit
Editor → Content Edit
Viewer → Read
```

enquanto outro projeto pode possuir regras diferentes.

---

# 14. Permissões por ambiente

Quando um projeto possuir múltiplos ambientes, permissões poderão variar.

Exemplo:

```text id="3v1d8m"
Development
```

pode permitir mais operações do que:

```text id="k2h7s9"
Production
```

Um usuário pode editar livremente o ambiente de desenvolvimento e ainda precisar de aprovação para produção.

---

# 15. AI Permissions

As ações da IA devem possuir permissões próprias.

Exemplos conceituais:

```text id="93c5tj"
ai.read_context
ai.modify_files
ai.run_commands
ai.git_commit
ai.git_push
ai.deploy
```

A IA não deve herdar automaticamente todas as permissões do usuário apenas porque o usuário possui determinada Role.

O modelo exato de delegação deverá ser definido no AI Permissions e Security Model.

---

# 16. Terminal Permissions

Terminal deve ser tratado como capacidade privilegiada.

Permissões poderão distinguir:

```text id="r6n1e0"
terminal.read_output
terminal.execute_safe
terminal.execute
terminal.admin
```

A granularidade definitiva dependerá do modelo de segurança.

---

# 17. Git Permissions

Git deverá possuir permissões próprias.

É necessário diferenciar operações como:

```text id="z3b4c6"
Read
Commit
Push
Branch
Merge
Rebase
Reset
Force Push
```

Operações destrutivas ou de alto impacto deverão possuir proteção adicional.

---

# 18. Deployment Permissions

Deploy também deverá ser separado em permissões.

Exemplo:

```text id="f5k8s2"
deployment.read
deployment.preview
deployment.execute
deployment.production.execute
deployment.rollback
```

O objetivo é permitir políticas como:

> Developer pode publicar preview, mas somente Admin pode publicar produção.

---

# 19. Component Permissions

O sistema deverá distinguir:

```text id="w7v3h1"
Project Component
Global Component
```

Um usuário poderá possuir acesso para editar componentes dentro de um projeto sem possuir capacidade de publicar componentes globalmente.

Exemplo:

```text id="q9m2p6"
component.project.write
component.global.write
component.global.publish
```

---

# 20. Media Permissions

Deverá ser possível controlar:

- visualizar;
- adicionar;
- editar;
- substituir;
- excluir;
- administrar biblioteca global.

Excluir assets deverá ser tratado com maior cuidado quando houver referências.

---

# 21. Integration Permissions

Integrações externas poderão possuir dados sensíveis.

O sistema deve permitir diferenciar:

```text id="s9c2x8"
integration.read
integration.write
integration.credentials.write
integration.execute
```

O usuário que pode editar um texto não deve receber automaticamente acesso às credenciais de uma integração.

---

# 22. Secrets Permissions

Acesso a secrets deverá ser altamente restrito.

Poder visualizar uma integração não significa poder visualizar suas credenciais.

A arquitetura deverá separar:

```text id="v2k8m5"
Integration Configuration
```

de:

```text id="a5p3q9"
Secret Material
```

---

# 23. Audit Permissions

Acesso a logs e auditoria também deve ser controlável.

Um usuário pode realizar uma ação sem necessariamente poder visualizar todo o histórico administrativo do workspace.

---

# 24. Role Hierarchy

As roles podem possuir uma hierarquia conceitual:

```text id="q2v9c6"
Owner
  ↓
Admin
  ↓
Developer
  ↓
Designer / Editor
  ↓
Viewer
```

Essa hierarquia é conceitual, não deve ser utilizada como substituto do sistema de permissões.

Em determinadas capacidades, uma Role inferior pode possuir uma permissão específica que uma Role superior não possui por padrão.

O sistema deve sempre verificar a autorização real.

---

# 25. Custom Roles

A arquitetura deve permanecer preparada para Custom Roles no futuro.

Uma Custom Role deverá poder combinar permissões existentes sem exigir alteração no Core de autorização.

Exemplo:

```text id="m4r7z2"
Content Manager

project.read
content.write
media.write
blog.write
deployment.read
```

Custom Roles não precisam necessariamente fazer parte do primeiro release, mas a arquitetura não deve impedir sua inclusão futura.

---

# 26. Temporary Permissions

O sistema deverá ser preparado para permissões temporárias ou delegadas futuramente.

Exemplo:

> Permitir que um técnico faça deploy de produção durante uma janela específica.

Isso deverá sempre possuir controles de segurança apropriados.

---

# 27. Approval Model

Algumas operações podem exigir aprovação além da permissão.

Exemplo:

```text id="7x2k4m"
Developer
   ↓
Create Production Deployment
   ↓
Approval Required
   ↓
Admin / Owner
   ↓
Deploy
```

A existência de uma permissão não precisa significar que determinada operação poderá ocorrer imediatamente em todos os contextos.

O modelo de aprovação será especificado separadamente.

---

# 28. User Identity

Cada usuário deve possuir uma identidade única dentro do sistema.

A identidade deve ser independente da Role.

Uma pessoa pode mudar de:

```text id="6q9m1v"
Editor
```

para:

```text id="0s5t8x"
Developer
```

sem se tornar uma nova identidade.

---

# 29. Multiple Roles

A arquitetura deve permanecer preparada para um usuário possuir múltiplas funções ou combinações de permissões.

Exemplo:

```text id="c1w7n4"
Developer
+
Designer
```

Isso pode ser implementado inicialmente através de uma Role principal e permissões adicionais, ou de outra maneira definida posteriormente.

O requisito funcional é permitir combinações sem duplicar usuários.

---

# 30. Workspace Membership

O usuário deverá possuir uma relação explícita com cada Workspace ao qual pertence.

Exemplo conceitual:

```text id="q5d8r0"
User
├── Workspace A → Admin
├── Workspace B → Developer
└── Workspace C → Viewer
```

A Role pode variar por Workspace.

---

# 31. Project Membership

Além do Workspace, o sistema deverá permitir restringir acesso a projetos específicos quando necessário.

Exemplo:

```text id="m8c4v7"
User
Workspace → Developer

Project A → Write
Project B → Read
Project C → No Access
```

---

# 32. Least Privilege

O Nexo deverá aplicar o princípio de menor privilégio.

Usuários e agentes devem possuir apenas os poderes necessários para realizar seu trabalho.

Isso é especialmente importante para:

- terminal;
- secrets;
- Git;
- IA;
- deploy;
- filesystem.

---

# 33. Human Authority

Operações críticas deverão permanecer associadas a um usuário responsável.

Quando uma IA executar uma ação, o sistema deverá conseguir identificar:

```text id="v4s9m1"
Human Initiator
+
AI Provider
+
Action
+
Resource
+
Timestamp
+
Result
```

Isso permitirá auditoria posterior.

---

# 34. Agent Identity

A IA não deve ser tratada apenas como uma extensão invisível do usuário.

Quando possível, ações automatizadas deverão possuir identidade de execução própria.

Exemplo:

```text id="2z6m8q"
Requested by:
Abner

Executed by:
Nexo AI / Provider Kimi

Action:
Modify Hero.tsx
```

Isso será importante para auditoria e segurança.

---

# 35. Role Defaults

Os papéis devem possuir defaults seguros.

O sistema não deve conceder:

- terminal irrestrito;
- production deploy;
- secrets;
- operações Git destrutivas;

apenas porque um usuário foi classificado como Developer.

Os defaults devem ser definidos pelo princípio de menor privilégio.

---

# 36. Role Changes

Alterações de Role devem ser registradas em auditoria.

O sistema deve conseguir identificar:

- quem alterou;
- quem foi alterado;
- role anterior;
- nova role;
- timestamp;
- contexto;
- motivo quando disponível.

---

# 37. User Removal

Ao remover um usuário, o sistema deverá considerar os projetos, ações futuras e histórico associados à identidade.

A remoção do usuário não deve destruir o histórico de ações realizadas anteriormente.

Os dados históricos devem continuar atribuídos a uma identidade auditável, conforme a política de retenção definida posteriormente.

---

# 38. Ownership Transfer

A transferência de Ownership deve ser tratada como operação crítica.

Não deve ocorrer como simples mudança de Role sem confirmação e políticas apropriadas.

---

# 39. Papel do Viewer

O Viewer deve permanecer genuinamente somente leitura.

Não deve conseguir modificar o projeto indiretamente através de:

- IA;
- terminal;
- plugins;
- integrações;
- comandos especiais.

Todas as capacidades devem continuar passando pela autorização central.

---

# 40. Papel do Editor

O Editor deve possuir acesso simplificado às tarefas de conteúdo.

O produto deve evitar obrigá-lo a conhecer:

- Git;
- terminal;
- framework;
- package manager;

para editar conteúdo que já esteja preparado para administração.

---

# 41. Papel do Designer

O Designer deve conseguir trabalhar visualmente sem precisar de acesso irrestrito ao Runtime.

Entretanto, quando uma operação visual exigir alteração técnica complexa, o sistema deve poder:

- impedir a operação;
- solicitar permissão;
- solicitar ajuda da IA;
- encaminhar a um Developer.

---

# 42. Papel do Developer

O Developer é o principal perfil técnico, mas não deve receber autoridade administrativa automaticamente.

Acesso a Workspace, usuários ou billing deve ser separado de acesso técnico aos projetos.

---

# 43. Papel do Admin

Admin deve ser um papel administrativo, não simplesmente um Developer com poderes extras.

O sistema deverá permitir que funções técnicas e administrativas sejam separadas.

---

# 44. Papel do Owner

Owner representa autoridade máxima do Workspace, mas operações altamente sensíveis devem continuar sujeitas a mecanismos de segurança e auditoria.

---

# 45. Plugins e Roles

Plugins não devem criar papéis arbitrários que ignorem o sistema de autorização central.

Quando um plugin precisar de permissões especiais, deverá solicitar capacidades através do modelo oficial de autorização.

---

# 46. AI e Roles

A IA deve respeitar as permissões do contexto no qual está sendo executada.

Exemplo:

```text id="4j8m2k"
Editor
+
AI

não significa automaticamente:

Developer
+
AI
```

A IA deve operar com um conjunto de permissões efetivamente concedidas.

---

# 47. AI Elevation

Uma IA não deve elevar seus próprios privilégios.

Se uma tarefa exigir:

```text id="7x5p9q"
permission X
```

e ela não possuir essa permissão, deverá:

- bloquear;
- informar;
- solicitar intervenção humana apropriada.

---

# 48. API e autorização

Toda API interna deverá validar autorização.

Não é permitido confiar apenas na UI para impedir operações.

Se o botão de:

```text id="jp8n4r"
Deploy
```

não aparecer para um Editor, isso não é suficiente.

A API também deverá recusar a operação.

---

# 49. Terminal e autorização

O mesmo princípio vale para terminal.

Não é suficiente esconder o terminal da UI.

O Runtime deverá validar se o usuário ou agente possui autorização para executar a operação solicitada.

---

# 50. Git e autorização

Operações Git devem ser validadas pelo sistema.

Especialmente:

- force push;
- reset;
- rebase;
- branch deletion;
- operações em produção.

---

# 51. Deploy e autorização

Deploy deve verificar:

- identidade;
- workspace;
- projeto;
- ambiente;
- provider;
- permissão;
- política;
- aprovação, quando aplicável.

---

# 52. Princípio de não herança implícita

A autorização não deve assumir automaticamente que:

```text id="r9f3p6"
User Access
=
AI Access
=
Plugin Access
```

Esses contextos precisam ser controláveis individualmente.

---

# 53. Contexto mínimo de autorização

Uma operação deve ser avaliada, quando necessário, considerando:

```text id="u1m7x4"
WHO
WHAT
WHERE
ON WHAT
IN WHICH ENVIRONMENT
WITH WHICH PROVIDER
UNDER WHICH POLICY
```

Exemplo:

```text id="a7c4k9"
WHO:
Developer

WHAT:
Deploy

WHERE:
Workspace Nexo

ON WHAT:
Junior Reformas

ENVIRONMENT:
Production

PROVIDER:
Hostinger

POLICY:
Production requires approval

RESULT:
REQUIRE APPROVAL
```

---

# 54. Role não deve definir UX de forma absoluta

A interface pode adaptar-se às capacidades disponíveis.

Porém, Role não deve ser utilizada para assumir que determinado recurso sempre existe ou não existe.

A UI deve consultar as permissões efetivas quando necessário.

---

# 55. Compatibilidade futura com SaaS

O modelo de Roles deve ser compatível com futura operação multi-tenant.

Uma mesma identidade poderá participar de diferentes organizações com permissões diferentes.

A implementação não deve assumir que existe apenas um Workspace global.

---

# 56. Compatibilidade futura com Marketplace

Autores de componentes, plugins ou recursos futuros podem necessitar de capacidades especiais.

O sistema deve permitir que tais operações continuem dentro do modelo central de autorização.

---

# 57. Auditoria como requisito obrigatório

Toda alteração relevante de:

- Role;
- Permission;
- Workspace;
- Project Access;
- AI Access;
- Deployment Access;
- Secret Access;

deverá ser auditável.

---

# 58. Regra de implementação

Este documento define **papéis e expectativas funcionais**.

Ele não define ainda:

- banco de dados;
- tabelas;
- JWT;
- OAuth;
- sessões;
- RBAC técnico específico;
- ABAC técnico;
- middleware;
- mecanismo exato de policy engine.

Essas decisões pertencem aos documentos de:

```text id="e7t1vx"
17-security/
18-workspaces-users/
24-api-contracts/
16-storage/
```

---

# 59. Critérios de aceitação

O modelo de User Roles será considerado atendido quando o Nexo conseguir, através de seu sistema de autorização:

1. distinguir usuários;
2. associá-los a Workspaces;
3. atribuir Roles;
4. limitar acesso por projeto quando necessário;
5. controlar permissões por capacidade;
6. diferenciar ambientes;
7. controlar IA;
8. controlar terminal;
9. controlar Git;
10. controlar deploy;
11. controlar recursos sensíveis;
12. registrar mudanças relevantes;
13. impedir acesso indevido mesmo que a UI seja contornada.

---

# 60. Regra final

As Roles existem para organizar responsabilidades humanas.

As Permissions existem para controlar operações.

As Policies existem para decidir em qual contexto uma operação pode ocorrer.

O Nexo não deve transformar Role em autoridade absoluta.

> **Role define quem o usuário é dentro do contexto. Permission define o que ele pode fazer. Policy define quando e onde ele pode fazer.**