# NEXO CMS
## Project Lifecycle

## 1. Propósito

Este documento define o ciclo de vida de um projeto dentro do Nexo CMS.

O objetivo é estabelecer os estados, transições, operações e condições que um projeto pode atravessar desde sua descoberta inicial até sua manutenção, versionamento, publicação, exportação ou remoção do Nexo.

O ciclo de vida deve ser entendido como um modelo operacional do produto.

Ele não deve presumir que todos os projetos possuirão exatamente os mesmos ambientes, frameworks, comandos ou sistemas de conteúdo.

---

# 2. Conceito central

O Nexo deve tratar um projeto como uma entidade que possui um ciclo de vida contínuo:

```text
DISCOVER
↓
IMPORT
↓
ANALYZE
↓
REGISTER
↓
INITIALIZE
↓
DEVELOP
↓
EDIT
↓
VALIDATE
↓
VERSION
↓
PUBLISH
↓
MAINTAIN
↓
UPDATE
↓
ARCHIVE / EXPORT / REMOVE
```

Nem todos os projetos atravessarão todas as etapas da mesma forma.

Algumas etapas podem ocorrer várias vezes.

---

# 3. Estados conceituais

O projeto deve possuir estados suficientemente claros para representar sua situação atual.

Estados conceituais iniciais:

```text
DISCOVERING
IMPORTING
ANALYZING
REVIEW_REQUIRED
READY
ACTIVE
DIRTY
VALIDATING
BUILDING
PREVIEWING
COMMIT_PENDING
COMMITTED
PUSHING
SYNCED
DEPLOYING
DEPLOYED
DEGRADED
ERROR
RECOVERY_REQUIRED
ARCHIVED
EXPORTED
REMOVED
```

A implementação poderá possuir estados internos adicionais, desde que não contradiga este modelo.

---

# 4. DISCOVERING

Representa o momento em que o Nexo encontra uma pasta ou fonte potencial de projeto e ainda não concluiu sua análise.

Durante esse estado:

- filesystem está sendo identificado;
- arquivos relevantes podem estar sendo indexados;
- sinais de stack podem estar sendo coletados;
- nenhuma alteração de projeto deve ser presumida.

O projeto ainda não deve ser considerado plenamente conhecido.

---

# 5. IMPORTING

Representa o processo de registrar um projeto no Nexo.

Durante essa etapa podem ocorrer:

- seleção de localização;
- criação de identidade interna;
- associação com Workspace;
- coleta de metadata inicial;
- vinculação ao Runtime.

Importação não deve significar alteração automática do projeto.

---

# 6. ANALYZING

Representa o processo de descoberta e compreensão do projeto.

Pode incluir:

- stack detection;
- framework detection;
- styling detection;
- package manager detection;
- build detection;
- route detection;
- component detection;
- asset indexing;
- Git detection;
- environment analysis.

---

# 7. REVIEW_REQUIRED

O projeto entra nesse estado quando a análise produziu informações que precisam de confirmação humana antes de determinadas operações.

Exemplos:

- stack ambíguo;
- build command incerto;
- estrutura parcialmente desconhecida;
- Git não configurado;
- adapter parcialmente compatível;
- configuração manual necessária.

O Nexo não deve esconder essas incertezas.

---

# 8. READY

O projeto está suficientemente compreendido para ser utilizado no Nexo dentro das capacidades atualmente disponíveis.

READY não significa:

> “Tudo do projeto é conhecido.”

Significa:

> “Existe contexto suficiente para o Nexo operar dentro das capacidades suportadas.”

---

# 9. ACTIVE

Representa um projeto aberto e operacionalmente ativo.

Pode haver:

- editor aberto;
- preview;
- processos;
- alterações;
- Git state;
- AI context.

---

# 10. DIRTY

Representa um projeto com alterações que ainda não estão refletidas em uma referência versionada considerada relevante.

O significado exato deve considerar:

- alterações no filesystem;
- alterações não salvas;
- Git working tree;
- estado do editor.

O sistema deve evitar usar DIRTY como sinônimo absoluto de qualquer tipo específico de alteração.

---

# 11. VALIDATING

Representa um projeto passando por verificações.

Podem ocorrer:

- syntax checks;
- typecheck;
- lint;
- tests;
- adapter validation;
- build preflight;
- preview validation.

---

# 12. BUILDING

Representa a execução do processo de build.

Durante BUILDING, o Nexo deve acompanhar:

- processo;
- saída;
- erros;
- exit code;
- artefatos quando aplicável.

---

# 13. PREVIEWING

Representa um estado em que uma versão do projeto está sendo renderizada para inspeção.

O preview deverá identificar:

- origem;
- estado;
- ambiente;
- branch, quando relevante;
- alterações ainda não persistidas, quando aplicável.

---

# 14. COMMIT_PENDING

Representa um estado no qual existem alterações prontas para revisão e potencial commit.

Não significa que um commit tenha ocorrido.

---

# 15. COMMITTED

Indica que o estado relevante foi registrado em um commit real.

O Nexo deve possuir evidência verificável do commit.

---

# 16. PUSHING

Representa a tentativa de sincronização com um remote.

O sistema deve distinguir:

```text
Commit Success
Push Success
```

de:

```text
Commit Success
Push Failed
```

---

# 17. SYNCED

Representa um estado no qual o projeto está sincronizado com o estado remoto relevante segundo as regras configuradas.

O significado exato depende do branch e remote utilizados.

---

# 18. DEPLOYING

Representa a execução de uma publicação.

Durante DEPLOYING:

- provider deve estar identificado;
- ambiente deve estar identificado;
- operação deve ser auditável;
- estado de execução deve estar disponível.

---

# 19. DEPLOYED

Indica que o Nexo recebeu confirmação suficiente de que o deploy foi concluído pelo provider.

Não significa necessariamente que todas as métricas de produção estão saudáveis.

Quando houver verificação pós-deploy, o resultado deverá ser registrado separadamente.

---

# 20. DEGRADED

Indica que o projeto continua disponível, mas alguma capacidade relevante está limitada.

Exemplos:

- adapter parcial;
- análise incompleta;
- preview indisponível;
- integração externa limitada;
- provider indisponível;
- parte da inteligência desatualizada.

DEGRADED não deve ser escondido do usuário quando afetar as operações.

---

# 21. ERROR

Representa uma falha identificada que impede uma operação ou parte do ciclo.

O erro deve possuir contexto suficiente para diagnóstico.

---

# 22. RECOVERY_REQUIRED

Representa situação em que o Nexo precisa de uma intervenção de recuperação antes de continuar com segurança.

Exemplos:

- estado inconsistente;
- alteração externa conflitante;
- falha parcial de escrita;
- operação interrompida;
- processo crítico terminado de forma inesperada.

---

# 23. ARCHIVED

Representa um projeto que deixou de fazer parte do fluxo ativo, mas ainda é mantido para referência, histórico ou recuperação.

Arquivado não significa automaticamente apagado.

---

# 24. EXPORTED

Representa um projeto que foi exportado para um destino externo.

O projeto continua existindo no Nexo, salvo quando uma operação posterior determinar o contrário.

---

# 25. REMOVED

Representa um projeto removido do Nexo.

A remoção do Nexo não deve ser interpretada automaticamente como exclusão dos arquivos reais.

A política exata deve distinguir:

```text
Remove from Nexo
```

de:

```text
Delete Source Project
```

As duas operações devem possuir riscos e confirmações diferentes.

---

# 26. Ciclo inicial

O fluxo mínimo esperado é:

```text
Candidate Folder
↓
Discover
↓
Import
↓
Analyze
↓
Review if Needed
↓
Ready
```

Somente depois o projeto entra no fluxo normal de trabalho.

---

# 27. Descoberta não altera o projeto

Uma análise inicial deve ser preferencialmente não destrutiva.

O Nexo não deve:

- reestruturar;
- instalar dependências;
- alterar código;
- inicializar framework;
- modificar Git;

apenas porque o projeto foi descoberto.

Operações de modificação devem ocorrer somente quando uma ação específica as exigir e quando houver autorização apropriada.

---

# 28. Registro do projeto

Ao registrar um projeto, o Nexo deverá associar informações suficientes para identificá-lo.

Conceitualmente:

```text
Project Identity
Workspace
Runtime
Source Location
Git Identity
Detected Stack
Adapter State
Project Status
```

A estrutura técnica será definida em Storage e Project Model.

---

# 29. Inicialização do projeto

Depois da análise, o Nexo pode preparar os elementos necessários para trabalhar com o projeto.

Exemplos:

- index;
- cache;
- project metadata;
- adapter state;
- preview configuration;
- Git information.

Esses elementos devem ser tratados como metadata do Nexo e não devem substituir os arquivos do projeto.

---

# 30. Desenvolvimento ativo

Quando o projeto estiver ACTIVE, o usuário poderá executar o ciclo:

```text
Open
↓
Run
↓
Preview
↓
Edit
↓
Validate
↓
Review
```

Esse ciclo pode acontecer repetidamente.

---

# 31. Alteração visual

Uma alteração visual deve seguir, quando aplicável:

```text
Select
↓
Inspect
↓
Edit
↓
Preview
↓
Persist
↓
Validate
```

A implementação específica depende do Editor e Adapter.

---

# 32. Alteração de código

Uma alteração direta de código deve seguir:

```text
Open File
↓
Edit
↓
Save
↓
Update Project Intelligence
↓
Validate Affected Areas
↓
Refresh Preview
```

O Nexo deve invalidar informações internas que tenham se tornado obsoletas.

---

# 33. Alteração pela IA

Uma alteração de IA deve seguir:

```text
Request
↓
Context
↓
Permission
↓
Plan
↓
Patch
↓
Diff
↓
Validation
↓
Apply
```

No modo automático, algumas etapas podem ser executadas sem intervenção manual, desde que o contexto e permissões permitam.

No modo manual, etapas críticas devem aguardar aprovação.

---

# 34. Alteração externa

O projeto pode ser alterado fora do Nexo.

Isso é comportamento válido.

Ferramentas externas podem incluir:

- IDE;
- terminal;
- scripts;
- Git;
- outros sistemas.

Quando mudanças externas forem detectadas, o Nexo deve:

```text
Detect
↓
Invalidate stale context
↓
Refresh
↓
Update state
```

---

# 35. Conflito de estado

Se o Nexo possuir alterações não salvas e detectar mudanças externas incompatíveis, deve existir um estado de conflito.

O sistema não deve:

- sobrescrever silenciosamente;
- descartar silenciosamente;
- escolher uma versão sem informar.

O fluxo deverá permitir inspeção e recuperação.

---

# 36. Validação

Validação pode ocorrer em diferentes momentos:

```text
After Edit
After AI Patch
Before Commit
Before Push
Before Deploy
After Deploy
```

A profundidade depende do risco e do contexto.

---

# 37. Versionamento

O ciclo de versionamento deve ser:

```text
Change
↓
Review
↓
Validate
↓
Commit
↓
Verify
```

Commit é uma mudança real no Git.

Não deve ser tratado como apenas um registro interno do Nexo.

---

# 38. Sincronização remota

Depois de um commit, o usuário pode sincronizar com um remote.

O Nexo deve representar separadamente:

- local commit;
- push;
- remote state.

---

# 39. Deploy

O deploy deve ocorrer a partir de um estado identificável.

Idealmente:

```text
Known Project State
↓
Preflight
↓
Build
↓
Deploy
↓
Verification
```

O sistema não deve publicar um estado que o usuário não consiga identificar.

---

# 40. Manutenção

Depois de publicado, o projeto entra em ciclo contínuo de manutenção.

```text
Production
↓
Issue / Change Request
↓
Edit
↓
Validate
↓
Version
↓
Deploy
↓
Verify
```

O projeto não possui um estado final permanente enquanto estiver sendo mantido ativamente.

---

# 41. Atualização de dependências

Dependências podem mudar fora ou dentro do Nexo.

Quando detectadas, o Nexo deve atualizar o contexto do projeto.

Dependências importantes podem exigir:

- nova análise;
- atualização de adapter;
- atualização de build;
- validação;
- testes.

O Nexo não deve atualizar dependências automaticamente apenas porque detectou que existe uma versão mais nova.

---

# 42. Mudança de framework ou arquitetura

Migração é uma operação especial.

Uma alteração como:

```text
React
↓
Vue
```

ou:

```text
CSS Modules
↓
Tailwind
```

não deve ser tratada como simples edição.

Deve entrar em uma jornada de Migration específica, caso essa capacidade exista.

---

# 43. Mudança de branch

Ao mudar branch:

```text
Checkout
↓
Filesystem Changes
↓
Refresh
↓
Re-analyze affected areas
↓
Refresh Git
↓
Refresh Preview
```

O Nexo não deve manter contexto antigo como se fosse válido quando o código mudou.

---

# 44. Clonagem

Ao clonar um projeto:

```text
Source Project
↓
Clone
↓
New Project Identity
↓
Configure Git
↓
Review Secrets
↓
Re-scan
↓
New Project
```

O Nexo deve evitar compartilhar acidentalmente:

- identidade;
- secrets;
- metadata privada;
- remote incorreto.

---

# 45. Exportação

A exportação deve produzir um projeto utilizável fora do Nexo.

Antes da exportação, o sistema deve verificar o que será exportado.

Se houver arquivos gerados apenas temporariamente pelo Nexo, eles não devem ser tratados automaticamente como parte necessária do projeto final.

---

# 46. Arquivamento

Ao arquivar:

```text
ACTIVE
↓
Archive
↓
ARCHIVED
```

O projeto deixa de aparecer como ativo por padrão, mas sua informação pode continuar disponível.

---

# 47. Remoção do Nexo

Ao remover um projeto do Nexo:

```text
Project
↓
Remove from Nexo
↓
Confirm Scope
↓
Detach Nexo Metadata
↓
Project Remains
```

A exclusão dos arquivos físicos deve ser uma operação separada e explicitamente confirmada.

---

# 48. Recuperação

Quando possível, um projeto em RECOVERY_REQUIRED deve oferecer:

- inspeção;
- comparação;
- recuperação Git;
- restauração de estado;
- reanálise;
- reexecução de processos.

Não existe uma estratégia universal de recuperação para todo tipo de falha.

A estratégia deve ser contextual.

---

# 49. Estado Git e ciclo de vida

O lifecycle do projeto deve manter relação com Git, mas não depender exclusivamente dele.

Exemplo:

```text
Project READY
Git clean

↓ Edit

Project DIRTY
Git dirty

↓ Save

Project dirty, changes persisted

↓ Commit

Project COMMITTED

↓ Push

Project SYNCED
```

Os estados exatos podem coexistir em dimensões diferentes.

---

# 50. Estado do Editor e estado Git não são a mesma coisa

O Nexo não deve assumir:

```text
Saved = Committed
```

nem:

```text
Dirty Editor = Dirty Git
```

São estados diferentes.

Um usuário pode salvar alterações no projeto e ainda não fazer commit.

---

# 51. Estado do Preview e estado do Deploy não são a mesma coisa

O fato de uma versão aparecer corretamente no preview não significa que foi publicada.

Da mesma forma, um deploy concluído não significa automaticamente que o preview local seja igual à produção.

O Nexo deve representar essas realidades separadamente.

---

# 52. Lifecycle multidimensional

O ciclo de vida do Nexo pode precisar representar múltiplos eixos de estado simultaneamente.

Exemplo:

```text
Project:
ACTIVE

Editor:
UNSAVED

Git:
DIRTY

Build:
NOT RUN

Preview:
RUNNING

Deployment:
PRODUCTION VERSION X
```

A implementação não deve tentar representar toda essa realidade através de uma única enumeração simplista.

O modelo técnico deverá definir os estados independentes necessários.

---

# 53. Lifecycle da inteligência

A compreensão do projeto também possui um ciclo:

```text
Unknown
↓
Detected
↓
Analyzed
↓
Modeled
↓
Updated
↓
Stale
↓
Re-analyzed
```

Quando o projeto mudar, o Project Model pode ficar obsoleto.

O Nexo deve possuir mecanismos para detectar e atualizar esse contexto.

---

# 54. Lifecycle do Adapter

Um adapter pode possuir estados como:

```text
Available
Detected
Loaded
Supported
Partial
Unavailable
Error
Updated
```

A ausência de um adapter não deve corromper o projeto.

---

# 55. Lifecycle de componente

Um componente pode possuir:

```text
Discovered
Draft
Project
Validated
Published
Versioned
Deprecated
Removed
```

O modelo definitivo será definido no Component System.

---

# 56. Lifecycle de AI Task

Uma tarefa de IA pode possuir:

```text
Requested
Contextualizing
Planning
Waiting Approval
Executing
Validating
Succeeded
Failed
Partially Completed
Cancelled
Rolled Back
```

A implementação deverá permitir identificar em qual estágio uma tarefa está.

---

# 57. Lifecycle de deployment

Um deployment pode possuir:

```text
Requested
Preflight
Building
Deploying
Verifying
Succeeded
Failed
Rolled Back
```

---

# 58. Operações interrompidas

Se um processo for interrompido:

```text
User Cancel
Process Failure
Runtime Failure
Network Failure
Provider Failure
```

o Nexo deve identificar o estado resultante.

Não deve converter uma operação interrompida em sucesso.

---

# 59. Fechamento de projeto

Antes de fechar um projeto, o Nexo deve considerar:

- alterações não salvas;
- processos ativos;
- tarefas de IA;
- operações Git;
- deploys;
- uploads;
- operações em andamento.

O usuário deve ser informado quando o fechamento puder causar perda ou interrupção relevante.

---

# 60. Reabertura

Quando um projeto for reaberto, o Nexo deve verificar:

- filesystem;
- Git;
- processos;
- configuração;
- Project Model;
- estado do preview;
- mudanças externas.

Não deve assumir que o estado da última sessão continua válido.

---

# 61. Lifecycle em caso de falha externa

Exemplos:

```text
GitHub unavailable
Vercel unavailable
Hostinger unavailable
AI Provider unavailable
Filesystem inaccessible
Network unavailable
```

O Nexo deve preservar estados locais sempre que possível.

Uma falha externa não deve automaticamente destruir o estado local do projeto.

---

# 62. Lifecycle em caso de Runtime restart

Se o Runtime reiniciar:

```text
Runtime Down
↓
Runtime Up
↓
Discover Active Projects
↓
Restore Metadata
↓
Check Filesystem
↓
Check Git
↓
Reconcile State
```

O Nexo deve reconstruir seu entendimento necessário a partir das fontes disponíveis.

Não deve assumir que memória volátil representa o estado verdadeiro.

---

# 63. Source of truth durante o lifecycle

A prioridade de referência deve seguir:

```text
Source Project
↓
Git / Remote State quando aplicável
↓
External Provider State
↓
Nexo Project Model
↓
Nexo Cache
↓
UI State
```

A ordem exata pode variar por operação, mas o Nexo não deve considerar a interface visual como autoridade superior ao projeto real.

---

# 64. Princípio de reconciliação

Sempre que existirem múltiplas representações do mesmo projeto, o sistema deve possuir mecanismo de reconciliação.

Exemplos:

```text
Filesystem
Git
Project Model
Editor
Preview
Deployment
```

Quando houver divergência, o Nexo deve detectar, classificar e resolver de acordo com regras explícitas.

---

# 65. Critérios de aceitação do lifecycle

O lifecycle será considerado corretamente definido quando o sistema conseguir:

1. identificar claramente projetos novos;
2. analisar projetos existentes;
3. registrar projetos;
4. detectar mudanças;
5. representar estados;
6. diferenciar estados do editor, Git, build e deployment;
7. recuperar de falhas quando possível;
8. impedir operações inseguras em estados inválidos;
9. reanalisar quando o contexto ficar obsoleto;
10. preservar o projeto real;
11. permitir exportação;
12. permitir remoção do Nexo sem exigir exclusão do projeto.

---

# 66. Regra para agentes de implementação

Antes de implementar uma operação relacionada ao ciclo de vida de um projeto, o agente deve consultar:

```text
Product Requirements
↓
Project Lifecycle
↓
Core Invariants
↓
Project Intelligence
↓
Runtime
↓
Git
↓
Security
↓
Contracts
```

Quando uma transição de estado não estiver especificada, o agente não deve inventá-la silenciosamente.

Deve procurar:

1. documentação especializada;
2. contrato;
3. decisão registrada;
4. fonte externa quando necessário.

---

# 67. Regra final

O lifecycle do Nexo não deve ser tratado como uma única sequência linear.

Projetos reais podem:

- mudar externamente;
- possuir múltiplos ambientes;
- possuir diferentes branches;
- ter alterações não salvas;
- falhar durante builds;
- possuir adapters parciais;
- depender de providers externos;
- entrar em recuperação;
- ser exportados;
- voltar ao ciclo ativo.

O Nexo deve representar essas situações sem simplificá-las de forma perigosa.

> **O ciclo de vida do Nexo existe para manter o projeto sincronizado com a realidade, não para obrigar a realidade a caber em um estado artificial.**