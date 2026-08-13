# NEXO CMS
## Product Requirements

## 1. Propósito

Este documento define os requisitos funcionais e comportamentais que o Nexo CMS deve atender como produto.

Ele descreve **o que o sistema precisa ser capaz de fazer**, sem definir prematuramente como cada requisito será implementado.

Os requisitos deste documento devem ser utilizados como referência pelos documentos de arquitetura, contratos, adapters, UI, testing e, posteriormente, pelos agentes responsáveis pela implementação.

Nenhum requisito aqui descrito deve ser interpretado como autorização para inventar uma implementação que não esteja especificada em documentos técnicos posteriores.

Quando um requisito depender de tecnologia de terceiros, versão específica ou comportamento externo, a implementação deverá consultar a documentação oficial correspondente antes da decisão final.

---

# 2. Escopo do produto

O Nexo CMS deve ser uma plataforma capaz de trabalhar sobre projetos web reais e oferecer um ambiente unificado para:

- importar projetos;
- analisar projetos;
- detectar tecnologia;
- compreender estrutura;
- editar conteúdo;
- editar código;
- editar componentes;
- criar componentes;
- reutilizar componentes;
- administrar assets;
- editar design;
- testar responsividade;
- executar comandos;
- trabalhar com Git;
- utilizar IA;
- integrar serviços externos;
- criar páginas;
- executar builds;
- gerar previews;
- validar alterações;
- publicar projetos;
- recuperar estados anteriores.

O produto deve ser extensível através de adapters, providers e plugins.

---

# 3. Requisito fundamental de projeto real

O Nexo deve operar sobre o projeto real.

A implementação não pode tratar uma cópia abstrata armazenada no Nexo como substituta permanente dos arquivos reais.

O sistema deve ser capaz de:

1. localizar o projeto;
2. analisar o projeto;
3. representar o projeto internamente;
4. aplicar alterações;
5. validar alterações;
6. persistir alterações no projeto;
7. refletir o novo estado na interface.

---

# 4. Importação de projeto

O sistema deve permitir iniciar um projeto através da seleção de uma pasta existente.

O fluxo deve suportar:

```text id="u2r4pt"
Select Folder
↓
Scan
↓
Analyze
↓
Detect
↓
Review
↓
Confirm
↓
Open Project
```

O sistema deve impedir que uma pasta seja considerada projeto totalmente compreendido antes da análise mínima necessária.

---

# 5. Descoberta automática de stack

Ao importar um projeto, o Nexo deve tentar detectar automaticamente:

- sistema operacional relevante ao runtime;
- linguagem;
- framework;
- bibliotecas relevantes;
- sistema de styling;
- package manager;
- build tool;
- scripts;
- Git;
- estrutura de rotas;
- sinais de componentes;
- configurações relevantes.

O resultado da detecção deve possuir níveis de confiança quando necessário.

---

# 6. Confirmação e edição manual do stack

O sistema não deve obrigar o usuário a aceitar a detecção automática.

O usuário deve poder:

- confirmar;
- corrigir;
- complementar;
- substituir;
- informar configuração personalizada.

Deve existir um modo de stack personalizado.

Esse modo deve permitir indicar informações que o detector não conseguiu identificar.

---

# 7. Análise de projeto

Depois da descoberta inicial, o Nexo deve construir contexto suficiente para permitir operação segura.

A análise deve procurar entender:

- estrutura de diretórios;
- arquivos relevantes;
- dependências;
- rotas;
- páginas;
- layouts;
- componentes;
- estilos;
- assets;
- scripts;
- build;
- Git;
- ferramentas existentes.

O nível de análise necessário deverá depender da operação solicitada.

O sistema não precisa necessariamente analisar tudo em profundidade antes de executar uma operação simples, mas operações complexas devem possuir contexto suficiente para serem seguras.

---

# 8. Project Model

O Nexo deve possuir uma representação interna do projeto.

Essa representação deve permitir ao sistema trabalhar com conceitos universais sem eliminar particularidades da tecnologia original.

O Project Model deve poder representar, conforme aplicável:

- Project;
- Route;
- Page;
- Component;
- Asset;
- Style;
- Dependency;
- Script;
- Build;
- Integration;
- Git;
- Environment.

A estrutura técnica do modelo será definida no documento de Project Model.

---

# 9. Editor visual

O Nexo deve possuir um editor visual capaz de apresentar o projeto e permitir interação com elementos identificáveis.

O usuário deve poder:

- visualizar;
- selecionar elementos;
- inspecionar propriedades;
- modificar propriedades suportadas;
- visualizar alterações;
- salvar alterações;
- desfazer alterações;
- refazer alterações.

O editor visual deve respeitar a arquitetura do projeto.

---

# 10. Editor de código

O Nexo deve possuir um editor de código integrado.

O editor deve permitir:

- abrir arquivos;
- editar arquivos;
- salvar;
- pesquisar;
- navegar;
- visualizar alterações;
- trabalhar com múltiplos arquivos quando necessário.

A tecnologia do projeto não deve determinar que o código será ocultado.

---

# 11. Relação entre visual e código

Quando tecnicamente possível, o Nexo deve relacionar o elemento visual selecionado com sua origem no projeto.

Exemplo conceitual:

```text id="a8o1c9"
Preview Element
↓
Component
↓
Source File
↓
Relevant Code
```

Essa relação deve permitir uma transição coerente entre visual e código.

---

# 12. Inspector

O Nexo deve possuir um Inspector que apresente propriedades relevantes do elemento selecionado.

As propriedades podem variar conforme:

- tipo de elemento;
- componente;
- adapter;
- estilo;
- projeto;
- capacidade detectada.

O Inspector não deve mostrar controles que impliquem suporte inexistente.

---

# 13. Propriedades editáveis

O sistema deve permitir editar propriedades suportadas, podendo incluir:

- texto;
- imagem;
- link;
- dimensão;
- espaçamento;
- alinhamento;
- cor;
- fundo;
- borda;
- radius;
- sombra;
- tipografia;
- comportamento responsivo;
- propriedades específicas do componente.

A disponibilidade dessas propriedades deve depender da estrutura real.

---

# 14. Salvamento

O sistema deve possuir uma operação explícita de salvamento.

Quando o usuário salvar uma alteração:

1. a mudança deve ser transformada em uma operação válida para o projeto;
2. a operação deve ser aplicada aos arquivos ou fontes correspondentes;
3. a persistência deve ser confirmada;
4. o estado interno deve ser atualizado;
5. a interface deve refletir o novo estado.

Falha em qualquer etapa deve impedir que a operação seja apresentada como concluída.

---

# 15. Undo e Redo

O editor deve possuir mecanismos de:

- undo;
- redo.

O comportamento deve considerar a natureza das alterações e evitar perda inesperada de trabalho.

Undo/Redo não substitui Git.

---

# 16. Diff

O Nexo deve permitir visualizar diferenças relevantes antes ou depois de alterações.

O Diff deve poder mostrar:

- arquivos alterados;
- linhas adicionadas;
- linhas removidas;
- mudanças estruturais quando possível;
- origem da mudança;
- autor da mudança;
- alterações geradas por IA.

---

# 17. Sistema de componentes

O Nexo deve possuir uma arquitetura de componentes reutilizáveis.

Deve ser possível:

- detectar componentes;
- inspecionar componentes;
- editar componentes;
- criar componentes;
- duplicar componentes quando apropriado;
- armazenar componentes;
- versionar componentes;
- reutilizar componentes.

---

# 18. Component Studio

O Nexo deve possuir uma área específica para criação e edição de componentes.

O Component Studio deve permitir trabalhar, conforme o tipo de componente:

- estrutura;
- código;
- estilos;
- props;
- slots;
- variants;
- comportamento responsivo;
- assets;
- dependências;
- documentação;
- preview.

---

# 19. Component Library

Deve existir uma biblioteca de componentes reutilizáveis.

A biblioteca deve possuir pelo menos dois níveis conceituais:

```text id="o9g2rs"
Global Library
Project Library
```

Os dois níveis não devem ser confundidos.

---

# 20. Promoção de componente

O sistema deve permitir, quando compatível, transformar um Project Component em componente global.

O processo deve considerar:

- dependências;
- compatibilidade;
- assets;
- tecnologia;
- versão;
- isolamento;
- reutilização.

A promoção não deve copiar silenciosamente dependências específicas de um projeto para todos os outros.

---

# 21. Componentes versionados

Componentes globais deverão possuir mecanismos de identidade e versionamento.

Uma alteração em uma versão global não deve atualizar automaticamente todos os projetos consumidores sem uma estratégia explícita.

---

# 22. Carrosséis

O Nexo deve possuir suporte específico para componentes Carousel.

O Carousel deve permitir, quando o componente suportar:

- adicionar slide;
- remover slide;
- reordenar slide;
- alterar imagem;
- alterar texto;
- alterar link;
- autoplay;
- velocidade;
- loop;
- transição;
- navegação;
- paginação;
- quantidade por viewport;
- espaçamento;
- configurações responsivas.

O editor deve persistir essas alterações no projeto real.

---

# 23. Biblioteca de componentes personalizados

O usuário deve poder criar componentes próprios.

Um componente personalizado pode ser:

- criado do zero;
- baseado em componente existente;
- importado;
- convertido em componente reutilizável;
- salvo na biblioteca.

A forma como isso será serializado tecnicamente deverá ser definida pelo Component Architecture e pelos adapters.

---

# 24. Media Library

O Nexo deve possuir uma Media Library.

Ela deve permitir:

- localizar assets;
- visualizar assets;
- pesquisar assets;
- filtrar assets;
- substituir assets;
- editar metadados;
- detectar referências;
- organizar assets;
- realizar upload;
- remover assets quando seguro.

---

# 25. Tipos de mídia

O produto deve ser preparado para trabalhar com pelo menos:

- JPEG;
- PNG;
- WebP;
- AVIF;
- SVG;
- GIF;
- vídeo;
- PDF;
- fontes.

A lista não é necessariamente fechada.

---

# 26. Referências de assets

O sistema deve tentar identificar onde um asset está sendo utilizado.

Exemplo:

```text id="2mv4vq"
hero.webp
├── Home / Hero
├── Home / Carousel
└── Projects / Project 03
```

Antes de excluir um asset referenciado, o sistema deve avisar o usuário.

---

# 27. Edição de mídia

Quando suportado, o Nexo deverá permitir operações como:

- substituir;
- crop;
- resize;
- conversão;
- otimização;
- alteração de metadados;
- atualização de alt;
- definição de focal point.

As operações deverão preservar o uso correto do asset no projeto.

---

# 28. Design System

O Nexo deve permitir identificar e trabalhar com elementos de design existentes.

Pode incluir:

- cores;
- gradients;
- typography;
- spacing;
- radius;
- shadows;
- borders;
- breakpoints;
- variables;
- tokens;
- themes.

---

# 29. Cores

O editor deve permitir trabalhar com:

- cores sólidas;
- transparência;
- gradientes lineares;
- gradientes radiais;
- outros mecanismos suportados pelo projeto.

A edição deve priorizar a fonte real da cor no projeto.

Se determinada cor for controlada por uma variável compartilhada, editar a variável deve ser preferível a espalhar valores hardcoded.

---

# 30. Responsividade

O Nexo deve fornecer ferramentas para visualizar e editar comportamento responsivo.

Deve suportar:

- desktop;
- tablet;
- mobile;
- viewport personalizada.

---

# 31. Responsive Lab

O Responsive Lab deve permitir:

- definir largura;
- definir altura;
- selecionar presets;
- criar presets personalizados;
- observar overflow;
- observar quebra de texto;
- detectar problemas visuais;
- comparar estados;
- investigar componentes quebrados.

---

# 32. Stress Testing de layout

O sistema deverá ser preparado para testar situações extremas.

Exemplos:

- títulos longos;
- botões longos;
- textos extensos;
- viewport muito estreita;
- viewport muito larga;
- imagens maiores;
- conteúdo inesperado.

O objetivo é identificar problemas de layout que não aparecem em conteúdo normal.

---

# 33. Project Pages

O Nexo deve permitir identificar e administrar páginas existentes.

Quando tecnicamente suportado, deve ser possível:

- localizar;
- abrir;
- editar;
- renomear;
- configurar;
- criar;
- remover, quando seguro.

---

# 34. Criação de páginas

O usuário deve poder criar páginas novas.

Quando uma nova página for criada, o Nexo deve utilizar a arquitetura e padrões do projeto.

A criação não deve forçar o projeto a mudar de tecnologia.

---

# 35. Conteúdo

O Nexo deve permitir editar conteúdo compatível com a fonte real utilizada pelo projeto.

O conteúdo pode estar em:

- código;
- arquivos;
- JSON;
- Markdown;
- CMS externo;
- API;
- banco de dados;
- outras fontes.

O Nexo deve identificar a fonte antes de decidir como persistir a alteração.

---

# 36. Conteúdo textual

Deve ser possível editar, quando suportado:

- H1;
- H2;
- H3;
- parágrafos;
- labels;
- botões;
- links;
- textos de cards;
- textos de carrossel;
- conteúdo de FAQ;
- outros elementos textuais.

---

# 37. Blog

O Nexo deve permitir administrar sistemas de blog quando o projeto possuir ou quando uma arquitetura compatível for definida.

O suporte deverá considerar:

- posts;
- títulos;
- conteúdo;
- imagem;
- slug;
- metadata;
- publicação;
- edição;
- exclusão;
- categorias;
- tags;

quando suportado pelo projeto.

---

# 38. Integrations

O Nexo deve permitir inserir e administrar integrações externas.

A categoria deve incluir:

- HTML;
- CSS;
- JavaScript;
- iframe;
- scripts;
- widgets;
- embeds;
- APIs;
- serviços externos.

---

# 39. Embeds e código externo

O usuário deve poder criar entradas para recursos externos quando permitido.

Deve ser possível armazenar:

- nome;
- tipo;
- código;
- localização;
- dependências;
- configuração;
- escopo;
- estado.

O sistema deve aplicar mecanismos de segurança apropriados.

---

# 40. WhatsApp

O Nexo deve permitir integrar elementos de WhatsApp através de componentes ou integrações compatíveis.

A implementação exata deverá ser definida posteriormente.

O requisito funcional é permitir que o projeto tenha um elemento de contato via WhatsApp administrável pelo Nexo.

---

# 41. Google Maps

O Nexo deve permitir integração com mapas quando o projeto precisar.

A implementação deverá respeitar APIs, políticas e formatos atuais do fornecedor.

Quando a implementação depender de informação externa atualizada, o agente deve consultar documentação oficial antes de decidir.

---

# 42. Código externo

O Nexo deve permitir inserir recursos externos sem exigir que cada integração seja incorporada ao Core.

Código externo deve ser identificado e tratado como uma entidade distinta de código nativo do projeto quando apropriado.

---

# 43. Terminal

O Nexo deve permitir ao usuário executar comandos dentro do ambiente do projeto através do Runtime.

O terminal deve:

- executar;
- mostrar saída;
- mostrar erro;
- indicar exit code;
- permitir encerramento de processos;
- preservar contexto necessário.

A execução deve respeitar as regras de segurança.

---

# 44. Process Management

O Nexo deve ser capaz de administrar processos relevantes do projeto.

Exemplos:

- dev server;
- build;
- testes;
- scripts;
- ferramentas auxiliares.

O sistema deve identificar processos e seus estados quando tecnicamente possível.

---

# 45. Desenvolvimento local do projeto

O Nexo deve conseguir iniciar o ambiente de desenvolvimento de um projeto de acordo com os comandos detectados ou configurados.

Não deve assumir que todos os projetos usam:

```text id="3t9fip"
npm run dev
```

O comando deve ser descoberto ou configurado.

---

# 46. Build

O Nexo deve conseguir executar o processo de build do projeto quando suportado.

O sistema deve:

- identificar comando;
- executar;
- capturar saída;
- capturar erro;
- informar sucesso ou falha;
- disponibilizar informações relevantes ao diagnóstico.

---

# 47. Preview

O Nexo deve ser capaz de iniciar ou utilizar um ambiente de preview compatível com o projeto.

O preview deve deixar claro qual estado está sendo mostrado.

---

# 48. Git obrigatório

Todo projeto gerenciado pelo Nexo deverá possuir Git configurado ou passar por um fluxo explícito de configuração.

O sistema deve detectar:

- repository;
- branch;
- remotes;
- working tree;
- estado de sincronização.

---

# 49. Operações Git

O Nexo deve permitir, quando suportado:

- init;
- repository creation;
- branch creation;
- checkout;
- switch;
- status;
- add;
- commit;
- push;
- pull;
- fetch;
- merge;
- rebase;
- stash;
- reset;
- revert;
- cherry-pick;
- history;
- diff.

Operações destrutivas devem possuir controles adicionais.

---

# 50. GitHub

O Nexo deverá estar preparado para integração com GitHub.

A integração poderá permitir:

- autenticação;
- seleção de usuário ou organização;
- criação de repository;
- associação de repository;
- leitura de branches;
- push;
- pull;
- operações autorizadas.

A implementação deve consultar a documentação oficial e as APIs atuais do GitHub antes de ser finalizada.

---

# 51. IA

O Nexo deve possuir um AI Engine desacoplado de providers específicos.

A IA deve poder trabalhar sobre:

- contexto do projeto;
- código;
- componentes;
- assets;
- Git;
- erros;
- preview;
- tarefas.

---

# 52. AI Engineer

O Nexo AI Engineer deve suportar tarefas como:

- análise de projeto;
- explicação;
- geração;
- edição;
- refatoração;
- diagnóstico;
- correção;
- criação de componentes;
- criação de páginas;
- melhoria de responsividade;
- investigação de erros;
- validação.

---

# 53. Modo automático

No modo automático, a IA poderá executar um fluxo inteiro dentro das permissões concedidas.

A IA deve:

1. interpretar;
2. analisar;
3. planejar;
4. modificar;
5. validar;
6. reportar.

---

# 54. Modo manual

No modo manual, a IA deve permitir maior intervenção humana.

Pode:

1. analisar;
2. explicar;
3. sugerir;
4. gerar diff;
5. aguardar aprovação;
6. aplicar;
7. validar.

---

# 55. AI Context

O AI Engine deve conseguir acessar contexto relevante do projeto.

Esse contexto pode incluir:

- stack;
- adapters;
- Project Model;
- Project Graph;
- arquivos;
- conteúdo;
- histórico;
- Git;
- erros;
- documentação local.

A profundidade do contexto deverá ser determinada pela tarefa.

---

# 56. AI Tools

A IA poderá utilizar ferramentas disponibilizadas pelo Nexo.

Exemplos:

- read file;
- write file;
- search;
- project scan;
- inspect component;
- run command;
- run build;
- run tests;
- git diff;
- git status;
- preview;
- media operations.

Cada ferramenta deverá possuir permissões e contratos próprios.

---

# 57. AI Diff

Alterações geradas pela IA deverão poder ser revisadas através de diff.

O usuário deve conseguir identificar:

- arquivos alterados;
- conteúdo alterado;
- adições;
- remoções;
- motivo ou contexto da mudança quando disponível.

---

# 58. AI Validation

Depois de alterações relevantes, o sistema deverá executar validações apropriadas.

A validação poderá envolver:

- typecheck;
- lint;
- tests;
- build;
- preview;
- adapter checks.

---

# 59. Luna

O Nexo deve permitir futuramente conectar a Luna como provider e/ou agente.

A integração não deve exigir reimplementação da Luna.

O contrato de integração será definido separadamente.

---

# 60. Plugins

O Nexo deve possuir arquitetura para plugins.

Plugins podem adicionar:

- adapters;
- AI providers;
- components;
- integrations;
- tools;
- deployment providers.

---

# 61. Plugin permissions

Plugins não devem possuir acesso ilimitado automaticamente.

O sistema deve definir permissões apropriadas para capacidades sensíveis.

---

# 62. Workspaces

O Nexo deve possuir conceito de Workspace.

Um Workspace poderá agrupar:

- usuários;
- projetos;
- componentes;
- mídia;
- configurações;
- permissões.

---

# 63. Usuários e papéis

O sistema deve ser preparado para papéis como:

- Owner;
- Admin;
- Developer;
- Designer;
- Editor;
- Viewer.

Os nomes podem ser ajustados posteriormente, mas o modelo deve suportar diferentes níveis de autoridade.

---

# 64. Permissões

Permissões devem poder controlar pelo menos:

- leitura;
- edição;
- Git;
- terminal;
- IA;
- deploy;
- gerenciamento de usuários;
- componentes;
- mídia;
- configurações.

---

# 65. Auditabilidade

O sistema deve registrar eventos relevantes.

Exemplos:

- login;
- alteração;
- ação de IA;
- comando;
- Git;
- deploy;
- operação administrativa;
- alteração de permissões.

---

# 66. Deployment

O Nexo deve suportar uma arquitetura de deploy extensível.

Provedores iniciais ou planejados podem incluir:

- Vercel;
- Hostinger;
- SSH;
- SFTP;
- FTP;
- Docker.

A implementação de cada provider deve ser especificada separadamente e atualizada conforme a documentação oficial de cada serviço.

---

# 67. Preflight

Antes de um deploy, o sistema deve ser capaz de executar verificações apropriadas.

Exemplos:

- working tree;
- build;
- configuração;
- variáveis necessárias;
- conexão;
- destino;
- permissões;
- artefatos.

O conjunto exato deverá depender do provider.

---

# 68. Rollback

Quando o ambiente permitir, o sistema deve possuir mecanismo de recuperação de uma versão anteriormente implantada.

Rollback não deve ser tratado como cópia improvisada de arquivos.

Deve considerar o mecanismo de versionamento e deploy utilizado pelo provider.

---

# 69. Segurança

O Nexo deve tratar como capacidades sensíveis:

- filesystem;
- terminal;
- processos;
- Git;
- secrets;
- ambiente;
- deploy;
- AI actions.

Essas capacidades deverão ser controladas por permissões e políticas adequadas.

---

# 70. Segredos

O Nexo não deve expor secrets desnecessariamente em:

- UI;
- logs;
- prompts;
- diff;
- respostas da IA;
- mensagens de erro.

A implementação deverá seguir boas práticas atuais e consultar documentação oficial quando depender de serviços externos.

---

# 71. Portabilidade

O projeto deverá permanecer utilizável fora do Nexo.

O usuário deve conseguir:

- copiar;
- exportar;
- versionar;
- publicar;
- abrir em outra ferramenta.

---

# 72. Observabilidade

O sistema deve fornecer informações suficientes para diagnosticar falhas.

Deve possuir mecanismos apropriados para:

- logs;
- erros;
- status;
- eventos;
- health checks;
- performance.

---

# 73. Testabilidade

Toda área importante do produto deve possuir estratégia de validação.

O sistema deve ser preparado para:

- unit tests;
- integration tests;
- adapter tests;
- runtime tests;
- component tests;
- AI tests;
- build validation;
- end-to-end;
- visual regression;
- recovery tests.

---

# 74. Pesquisa técnica obrigatória

Quando uma implementação depender de comportamento atual de uma tecnologia externa, o agente responsável deverá consultar fontes atuais.

Devem ser priorizadas:

1. documentação oficial;
2. especificações oficiais;
3. repositórios oficiais;
4. documentação do fornecedor;
5. fontes técnicas confiáveis.

Exemplos de áreas que exigirão confirmação externa:

- APIs do GitHub;
- APIs de deploy;
- frameworks;
- sistemas de build;
- package managers;
- serviços de autenticação;
- providers de IA;
- APIs de terceiros;
- comportamento específico de versões.

---

# 75. Compatibilidade baseada em evidência

O Nexo não deve declarar suporte completo a uma tecnologia apenas porque uma instalação simples funcionou.

Suporte deverá ser validado através de testes e casos representativos.

Quando suporte for parcial, deverá ser declarado como parcial.

---

# 76. Requisito de não-alucinação

Durante implementação, nenhuma parte do sistema deve ser construída com base em APIs, comportamentos, arquivos, comandos ou características inventadas.

Quando uma informação não estiver presente na documentação do projeto e depender de um sistema externo, deve-se pesquisar.

Quando uma estrutura do projeto for desconhecida, deve-se investigar.

Quando houver dúvida arquitetural, deve-se consultar os documentos oficiais antes de assumir.

---

# 77. Requisito de rastreabilidade

Operações importantes devem ser rastreáveis até sua origem.

Uma alteração deverá poder ser relacionada, quando aplicável, a:

```text id="9k0qv7"
User
AI
Plugin
Manual Edit
Git
System Process
```

---

# 78. Requisito de estado explícito

O sistema deve diferenciar estados como:

```text id="iufm3k"
Clean
Dirty
Unsaved
Saving
Saved
Build Running
Build Failed
Build Passed
Preview Running
Deploying
Deployed
Error
```

Os estados exatos serão definidos nas especificações de arquitetura e UI.

---

# 79. Requisito de extensibilidade

Nenhum requisito de produto deve tornar impossível a adição futura de:

- novos frameworks;
- novos styling systems;
- novos AI providers;
- novos deployment providers;
- novos plugins;
- novos components;
- novos integrations.

A extensibilidade não deve impedir o desenvolvimento simples do primeiro release.

---

# 80. Requisito de evolução

O produto deve poder começar com um conjunto controlado de adapters e providers.

Não é requisito do primeiro release suportar todas as tecnologias existentes.

É requisito que a arquitetura permita aumentar o suporte sem reconstruir o núcleo.

---

# 81. Critério geral de aceitação

O Nexo CMS somente poderá ser considerado funcional em uma determinada área quando:

1. o comportamento esperado estiver documentado;
2. a implementação estiver integrada à arquitetura;
3. a operação atuar sobre o projeto real;
4. os estados relevantes forem corretamente representados;
5. erros forem tratados;
6. alterações forem verificáveis;
7. os testes apropriados existirem;
8. nenhuma Core Invariant for violada.

---

# 82. Regra para documentação futura

Cada grande requisito deverá possuir, nos documentos técnicos correspondentes, detalhamento adicional de:

- entradas;
- saídas;
- estados;
- dependências;
- permissões;
- erros;
- edge cases;
- validação;
- contratos;
- integração;
- critérios de aceitação.

Este documento define o requisito de produto.

Os documentos especializados definirão a execução.

---

# 83. Definição de produto completo

Para fins desta documentação, o Nexo CMS será considerado um produto funcional quando possuir, de maneira integrada e coerente:

```text id="xymcp3"
Project Import
Project Intelligence
Stack Detection
Adapters
Runtime
Visual Editor
Code Editor
Component System
Component Library
Media Library
Design System
Responsive Lab
Git
AI Engine
Luna Integration
Integrations
Pages / Content
Plugins
Workspaces
Security
Testing
Observability
Deployment
```

Nenhum destes itens deve ser interpretado como exigência de implementação simultânea dentro de uma única etapa técnica.

A ordem de construção será definida posteriormente pelos documentos de arquitetura, dependências e K3 Swarm.

---

# 84. Regra final

Os requisitos deste documento representam o **contrato funcional de produto** do Nexo CMS.

Os documentos de arquitetura deverão explicar como atendê-los.

Os contratos deverão definir as interfaces entre módulos.

Os adapters deverão definir como os requisitos se aplicam a cada tecnologia.

Os testes deverão verificar se os requisitos foram realmente atendidos.

O K3 Swarm deverá utilizar este documento como referência de **o que deve existir**, enquanto os documentos técnicos posteriores definirão **como isso deve ser construído**.

> **Requisito de produto descreve o resultado. A arquitetura descreve o mecanismo. O código realiza ambos sem violar as invariantes.**