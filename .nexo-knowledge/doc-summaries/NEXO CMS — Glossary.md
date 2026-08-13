# NEXO CMS
## Glossary

## 1. Propósito

Este documento define os termos oficiais utilizados na documentação do Nexo CMS.

Os termos abaixo devem possuir significado consistente em toda a documentação, no código, nas interfaces, nos contratos, nos adapters e nas instruções destinadas a agentes de IA.

Quando um documento futuro utilizar um termo definido aqui, ele deverá utilizar o significado oficial deste Glossário.

Um agente não deve criar uma interpretação diferente para um termo que já possua definição oficial.

Quando surgir um novo conceito importante, ele deverá ser acrescentado a este documento antes de se tornar um termo estrutural utilizado em várias áreas do projeto.

---

# 2. Nexo CMS

**Nexo CMS** é o produto da Nexo Digital responsável por permitir compreender, editar, criar, versionar, testar, automatizar e publicar projetos web através de uma interface unificada.

O Nexo CMS não é limitado a uma tecnologia específica.

---

# 3. Nexo

Forma curta de referência ao Nexo CMS quando o contexto deixar claro que estamos falando do produto.

---

# 4. Nexo Engine

Camada conceitual responsável pelas capacidades centrais de compreensão e operação sobre projetos.

O Engine não deve ser confundido com a interface do CMS.

---

# 5. Nexo Runtime

Ambiente de execução responsável por disponibilizar ao Nexo capacidades relacionadas ao ambiente onde o projeto está sendo trabalhado.

Entre essas capacidades podem estar:

- filesystem;
- terminal;
- processos;
- Git;
- build;
- preview;
- ferramentas do sistema;
- acesso a providers;
- deploy.

O Runtime representa o ambiente operacional do Nexo.

---

# 6. Project

Projeto web que o Nexo está administrando.

Pode conter:

- código;
- assets;
- dependências;
- configurações;
- páginas;
- componentes;
- estilos;
- scripts;
- Git;
- build;
- integrações.

Um Project é sempre o projeto real que existe no ambiente de trabalho.

---

# 7. Project Workspace

Representação operacional de um projeto dentro do Nexo.

O Workspace identifica o projeto que está sendo trabalhado e reúne o contexto necessário para o Nexo operar sobre ele.

Não significa necessariamente que o projeto foi convertido para um formato proprietário do Nexo.

---

# 8. Project Model

Representação interna do projeto utilizada pelo Nexo para compreender sua estrutura.

O Project Model pode representar conceitos como:

- arquivos;
- rotas;
- páginas;
- componentes;
- assets;
- estilos;
- dependências;
- scripts;
- configurações;
- build;
- Git.

O Project Model não deve substituir o projeto real.

Ele representa o que o Nexo compreende sobre o projeto.

---

# 9. Project Graph

Representação das relações entre elementos do projeto.

Pode representar relações como:

```text
Page
 ↓
Component
 ↓
Style
 ↓
Asset
```

ou:

```text
Component
 ↓
Dependency
 ↓
Component
```

O Project Graph deve ajudar o Nexo a compreender impacto, dependências e referências.

---

# 10. Project Intelligence

Conjunto de capacidades utilizadas pelo Nexo para analisar e compreender um projeto.

Inclui conceitos como:

- Project Discovery;
- Stack Detection;
- File System Intelligence;
- Route Detection;
- Component Detection;
- Style Detection;
- Asset Detection;
- Build Detection.

---

# 11. Project Discovery

Processo inicial de análise realizado quando um projeto é aberto ou importado.

Seu objetivo é descobrir o máximo possível sobre o projeto antes que o Nexo tente modificá-lo.

---

# 12. Project Scanner

Componente ou capacidade responsável por percorrer e analisar a estrutura física do projeto.

Pode analisar:

- arquivos;
- diretórios;
- configurações;
- dependências;
- scripts;
- padrões conhecidos.

---

# 13. Stack

Conjunto de tecnologias utilizadas por um projeto.

Exemplo:

```text
Next.js
TypeScript
Tailwind CSS
```

Stack não significa apenas framework.

Pode incluir linguagem, framework, styling, build tools e outras tecnologias relevantes.

---

# 14. Stack Detection

Processo de identificação automática do stack de um projeto.

A detecção pode utilizar:

- arquivos de configuração;
- package manifests;
- dependências;
- estrutura de pastas;
- scripts;
- padrões de código.

---

# 15. Adapter

Módulo responsável por ensinar o Nexo a compreender e operar sobre uma tecnologia, ferramenta ou convenção específica.

O Adapter traduz conceitos internos do Nexo para a realidade do projeto.

---

# 16. Adapter System

Arquitetura responsável por organizar e carregar adapters.

Seu objetivo é tornar o Nexo extensível para diferentes tecnologias sem alterar constantemente o núcleo do sistema.

---

# 17. Framework Adapter

Adapter especializado em um framework ou ecossistema de desenvolvimento.

Exemplos:

- Next.js Adapter;
- Vue Adapter;
- SvelteKit Adapter.

---

# 18. Styling Adapter

Adapter responsável por compreender como estilos são organizados ou aplicados no projeto.

Exemplos:

- Tailwind;
- CSS Modules;
- styled-components;
- CSS variables.

---

# 19. Build Adapter

Adapter responsável por compreender como o projeto é construído.

Pode identificar:

- comando de build;
- ferramenta de build;
- entradas;
- saídas;
- requisitos necessários para execução.

---

# 20. Package Manager Adapter

Adapter responsável por compreender o gerenciador de pacotes utilizado pelo projeto.

Exemplos:

- npm;
- pnpm;
- yarn;
- bun.

---

# 21. Git Adapter

Camada responsável por integrar o Nexo às operações Git do projeto.

---

# 22. Supported

Indica que o Nexo possui suporte documentado e validado para determinada tecnologia ou capacidade.

---

# 23. Partially Supported

Indica que o Nexo consegue trabalhar com determinada tecnologia ou capacidade apenas em um subconjunto definido de operações.

Suporte parcial não deve ser apresentado como suporte completo.

---

# 24. Detected

Indica que o Nexo identificou a presença de uma tecnologia ou característica no projeto.

Detecção não significa automaticamente que essa tecnologia seja totalmente suportada.

---

# 25. Unknown

Indica que o Nexo encontrou uma característica, tecnologia ou estrutura que não conseguiu identificar com confiança suficiente.

Unknown não significa necessariamente incompatibilidade.

Significa ausência de conhecimento suficiente.

---

# 26. Unsupported

Indica que o Nexo conhece a tecnologia ou operação, mas não oferece suporte para aquela situação específica.

---

# 27. Custom

Indica uma configuração ou implementação que não corresponde diretamente aos padrões conhecidos pelo Nexo.

Projetos Customizados devem poder existir sem que o sistema considere automaticamente que estão incorretos.

---

# 28. Page

Unidade de conteúdo ou interface acessível como uma página do projeto.

Uma Page pode estar relacionada a:

- rota;
- template;
- layout;
- conteúdo;
- componentes.

---

# 29. Route

Localização ou caminho utilizado pelo projeto para acessar uma página ou recurso.

Exemplo conceitual:

```text
/about
/contact
/services
```

A forma como Routes são implementadas depende do stack.

---

# 30. Component

Unidade reutilizável de interface ou comportamento dentro de um projeto.

Um Component pode possuir:

- estrutura;
- código;
- estilos;
- propriedades;
- variantes;
- comportamento;
- assets;
- dependências.

---

# 31. Project Component

Componente pertencente especificamente a um projeto.

Ele pode ser reutilizado dentro daquele projeto, mas não está necessariamente disponível globalmente.

---

# 32. Global Component

Componente disponibilizado pela biblioteca compartilhada do Nexo para utilização em múltiplos projetos.

---

# 33. Component Library

Biblioteca onde componentes reutilizáveis são armazenados, organizados, versionados e disponibilizados.

---

# 34. Component Studio

Ambiente do Nexo destinado à criação e edição de componentes.

Pode incluir:

- código;
- propriedades;
- variantes;
- preview;
- responsividade;
- assets;
- documentação;
- compatibilidade.

---

# 35. Component Schema

Estrutura que descreve como um componente deve ser interpretado e configurado pelo Nexo.

Pode descrever propriedades, tipos, variantes, controles e outros metadados.

---

# 36. Prop

Propriedade configurável de um componente.

Exemplos:

```text
title
image
speed
autoplay
variant
```

O conceito de Prop pode corresponder de forma diferente em cada framework.

---

# 37. Slot

Espaço ou ponto de extensão dentro de um componente destinado a receber conteúdo ou outros elementos.

O significado técnico exato dependerá do sistema adotado pelo projeto.

---

# 38. Variant

Variação definida de um componente.

Exemplo:

```text
Button
├── Primary
├── Secondary
└── Outline
```

---

# 39. Asset

Arquivo ou recurso utilizado pelo projeto.

Exemplos:

- imagem;
- vídeo;
- SVG;
- GIF;
- fonte;
- PDF;
- outros recursos.

---

# 40. Media Library

Sistema do Nexo destinado a visualizar, localizar, organizar e editar assets.

---

# 41. Asset Reference

Relação entre um asset e o local ou elemento que o utiliza.

Exemplo:

```text
logo.webp
→ Navbar
→ Footer
→ Home
```

---

# 42. Design System

Conjunto de regras e elementos visuais utilizados para manter consistência no projeto.

Pode incluir:

- cores;
- tipografia;
- espaçamento;
- radius;
- sombras;
- tokens;
- componentes;
- breakpoints.

O Design System de um projeto não precisa ser igual ao do Nexo.

---

# 43. Design Token

Valor nomeado utilizado para representar uma decisão visual reutilizável.

Exemplo:

```text
color.primary
spacing.large
radius.medium
```

---

# 44. Theme

Conjunto organizado de valores visuais que define uma aparência específica.

Um projeto poderá possuir um ou vários Themes.

---

# 45. Responsive Lab

Sistema do Nexo destinado à análise e teste de responsividade.

Permite trabalhar com:

- viewports;
- dispositivos;
- dimensões personalizadas;
- stress tests;
- diagnóstico de layout;
- problemas de overflow;
- problemas de quebra de texto.

---

# 46. Viewport

Área de visualização na qual o projeto é renderizado para fins de teste ou preview.

Pode ser:

- preset;
- dispositivo;
- dimensão personalizada.

---

# 47. Visual Editor

Interface do Nexo que permite editar aspectos do projeto através de interação visual.

---

# 48. Code Editor

Interface do Nexo destinada à edição direta do código do projeto.

---

# 49. Inspector

Área do editor que apresenta propriedades e controles do elemento selecionado.

---

# 50. Source Mapping

Mecanismo utilizado para relacionar elementos observados no preview com sua origem correspondente no projeto.

---

# 51. Preview

Representação renderizada do projeto para inspeção antes ou durante alterações.

Pode representar:

- estado salvo;
- alterações locais;
- estado temporário;
- ambiente específico.

---

# 52. Diff

Representação das diferenças entre dois estados de um projeto ou arquivo.

Exemplos:

```text
Before
versus
After
```

Diff é especialmente importante para alterações realizadas pela IA.

---

# 53. Patch

Conjunto estruturado de alterações destinadas a modificar o projeto.

Um Patch pode representar mudanças em um ou vários arquivos.

---

# 54. Save

Operação que persiste uma alteração no projeto real ou no estado apropriado definido pelo fluxo atual.

Salvar não deve significar apenas atualizar a interface do Nexo.

---

# 55. Git Repository

Repositório Git associado ao projeto.

---

# 56. Branch

Linha de desenvolvimento dentro do Git Repository.

---

# 57. Remote

Referência a um repositório Git remoto.

Pode apontar, por exemplo, para GitHub ou outro serviço compatível.

---

# 58. Commit

Registro versionado de alterações realizado no Git.

---

# 59. Deploy

Processo de disponibilização de uma versão do projeto em um ambiente de execução ou hospedagem.

---

# 60. Deployment Provider

Serviço ou mecanismo responsável por receber e publicar o projeto.

Exemplos possíveis:

- Vercel;
- Hostinger;
- SSH;
- SFTP;
- FTP;
- Docker.

---

# 61. Runtime

Ambiente que executa as operações necessárias para o Nexo trabalhar sobre o projeto.

---

# 62. Filesystem

Sistema de arquivos do ambiente onde o projeto está armazenado.

---

# 63. Process

Programa ou tarefa executada pelo Runtime.

Exemplos:

- dev server;
- build;
- testes;
- Git;
- package manager.

---

# 64. Command

Instrução executável enviada ao ambiente do Runtime.

Exemplo conceitual:

```text
git status
npm run build
```

---

# 65. Integration

Conexão entre o projeto e um recurso, serviço ou sistema externo.

Exemplos:

- WhatsApp;
- Google Maps;
- analytics;
- chat;
- formulário;
- calendário;
- API.

---

# 66. Embed

Conteúdo externo incorporado ao projeto.

Exemplos:

- iframe;
- widget;
- player;
- formulário externo.

---

# 67. Plugin

Extensão capaz de adicionar capacidades ao Nexo sem alterar diretamente o núcleo.

---

# 68. Provider

Implementação de um serviço externo ou mecanismo intercambiável utilizado pelo Nexo.

Exemplos:

- AI Provider;
- Deployment Provider.

---

# 69. AI Provider

Sistema de inteligência artificial conectado ao Nexo através do contrato de AI Provider.

Pode ser:

- API externa;
- Kimi;
- Luna;
- modelo local;
- endpoint personalizado.

---

# 70. Nexo AI Engineer

Sistema de inteligência artificial do Nexo dedicado a compreender, planejar, editar, validar, diagnosticar e auxiliar no desenvolvimento de projetos.

---

# 71. Autonomous Mode

Modo em que a IA pode executar uma sequência de tarefas dentro das permissões concedidas.

---

# 72. Manual Mode

Modo em que a IA realiza análise e propostas, mas depende de aprovação humana para determinadas etapas.

---

# 73. AI Context

Informações fornecidas à IA para que ela compreenda uma tarefa.

Pode incluir:

- projeto;
- arquivos;
- documentação;
- código;
- configuração;
- histórico;
- pedido do usuário;
- estado atual.

---

# 74. AI Task

Unidade de trabalho solicitada ou executada por um provider de IA.

---

# 75. AI Plan

Plano estruturado que descreve como a IA pretende realizar uma tarefa antes da execução.

---

# 76. AI Validation

Processo de verificar se uma alteração produzida pela IA é consistente e funcional.

Pode incluir:

- análise;
- build;
- testes;
- lint;
- preview;
- inspeções específicas.

---

# 77. Luna

Sistema de agentes e automações da Nexo Digital que poderá ser conectado ao Nexo CMS como AI Provider e/ou agente integrado.

A Luna é um sistema independente do Nexo CMS.

---

# 78. Luna Provider

Integração responsável por permitir que o Nexo utilize a Luna através de um contrato compatível.

---

# 79. Workspace

Unidade organizacional que agrupa usuários, projetos, recursos e configurações.

---

# 80. User

Pessoa que utiliza o Nexo.

---

# 81. Role

Conjunto de permissões associadas a um tipo de usuário.

Exemplos possíveis:

- Owner;
- Admin;
- Developer;
- Designer;
- Editor;
- Viewer.

---

# 82. Permission

Autorização para realizar determinada operação.

---

# 83. Audit Log

Registro de eventos relevantes realizados dentro do Nexo.

Pode incluir:

- alteração;
- operação Git;
- ação administrativa;
- ação de IA;
- deploy;
- operação sensível.

---

# 84. Snapshot

Representação de um estado específico de um projeto armazenada para referência ou recuperação.

Snapshot não substitui Git.

---

# 85. Source of Truth

Fonte considerada autoridade para determinado dado ou estado.

Para o projeto, a fonte de verdade principal é o próprio projeto real.

O Nexo Project Model não substitui essa autoridade.

---

# 86. Core

Parte central do Nexo responsável pelas capacidades fundamentais do sistema.

O Core deve permanecer relativamente pequeno, estável e independente de extensões específicas sempre que possível.

---

# 87. Extension

Capacidade adicional que pode ser adicionada ao Nexo sem modificar diretamente suas regras fundamentais.

Pode ser implementada através de:

- plugin;
- adapter;
- provider;
- integração;
- módulo.

---

# 88. Contract

Conjunto de regras que define como duas partes do sistema devem se comunicar ou se comportar.

Exemplos:

- Adapter Contract;
- AI Provider Contract;
- Plugin Contract.

---

# 89. Internal Contract

Contrato utilizado entre partes do próprio Nexo.

---

# 90. External Integration Contract

Contrato utilizado para conectar o Nexo a um sistema externo.

---

# 91. Detection Confidence

Nível de confiança associado a uma conclusão feita pelo Nexo ao analisar um projeto.

Esse conceito é importante quando a estrutura não permite certeza absoluta.

---

# 92. Project State

Estado atual de um projeto dentro do fluxo do Nexo.

Pode envolver:

- arquivos;
- alterações não salvas;
- Git;
- build;
- preview;
- deploy;
- estado remoto.

---

# 93. Working Tree

Estado atual dos arquivos do projeto em relação ao estado conhecido pelo Git.

---

# 94. Clean Working Tree

Estado em que não existem alterações pendentes detectadas pelo Git.

---

# 95. Dirty Working Tree

Estado em que existem alterações pendentes em relação ao estado versionado.

---

# 96. Local Project

Projeto armazenado no filesystem do ambiente em que o Nexo Runtime está executando.

“Local” descreve a localização relativa ao Runtime, não necessariamente o computador físico do usuário.

---

# 97. Remote Project

Projeto acessado ou armazenado em ambiente remoto ao contexto principal de trabalho.

A distinção exata dependerá da arquitetura do Runtime.

---

# 98. Environment

Contexto no qual um projeto está sendo executado ou publicado.

Exemplos:

- development;
- preview;
- staging;
- production.

---

# 99. Development Environment

Ambiente destinado ao desenvolvimento e teste durante a construção do projeto.

---

# 100. Preview Environment

Ambiente ou estado utilizado para visualizar uma versão antes de publicação definitiva.

---

# 101. Production

Ambiente destinado ao uso real do projeto por seus usuários finais.

---

# 102. Build

Processo que transforma o projeto em um artefato executável ou publicável conforme sua tecnologia.

O significado exato depende do stack.

---

# 103. Build Artifact

Resultado produzido por um processo de build.

A estrutura e o formato dependem do projeto.

---

# 104. Validation Gate

Ponto do fluxo em que uma condição precisa ser satisfeita antes de continuar.

Exemplo:

```text
Edit
↓
Validation Gate
↓
Commit
```

---

# 105. Safety Gate

Mecanismo que impede ou pausa uma operação até que condições de segurança sejam atendidas.

---

# 106. Dangerous Operation

Operação que pode causar perda de dados, quebra de projeto, exposição de informações sensíveis ou impacto relevante em infraestrutura.

---

# 107. Project Migration

Processo explícito de mudança de arquitetura, tecnologia ou estrutura de um projeto.

Migração não deve ser presumida como parte de uma edição comum.

---

# 108. Refactor

Alteração estrutural cujo objetivo é melhorar ou reorganizar código mantendo, quando pretendido, seu comportamento funcional.

---

# 109. Content

Informações exibidas pelo projeto e administráveis pelo Nexo.

Pode incluir:

- textos;
- títulos;
- imagens;
- links;
- dados;
- entradas de blog;
- conteúdo de componentes.

---

# 110. Content Source

Origem real de determinado conteúdo dentro do projeto.

Pode ser:

- arquivo;
- JSON;
- Markdown;
- código;
- API;
- banco de dados;
- CMS externo;
- outra fonte.

---

# 111. Component Promotion

Processo de transformar um Project Component em componente disponibilizado na biblioteca global.

---

# 112. Component Compatibility

Capacidade de um componente ser utilizado corretamente em determinada tecnologia ou projeto.

Compatibilidade deve considerar implementação, dependências e comportamento esperado.

---

# 113. Nexo Library

Conjunto de recursos reutilizáveis mantidos pelo Nexo ou por uma organização.

Pode conter:

- componentes;
- integrações;
- templates;
- assets;
- outras extensões compatíveis.

---

# 114. Global Library

Biblioteca compartilhada por múltiplos projetos dentro de uma organização ou instalação.

---

# 115. Project Library

Biblioteca específica de um determinado projeto.

---

# 116. SaaS

Modelo futuro em que o Nexo CMS será disponibilizado como serviço para múltiplos clientes ou organizações.

A possibilidade de SaaS influencia a arquitetura futura, mas não significa que todos os recursos SaaS façam parte do primeiro release.

---

# 117. Multi-Tenant

Arquitetura na qual diferentes organizações ou clientes podem utilizar a mesma plataforma com isolamento adequado.

Esse conceito pertence principalmente à futura evolução comercial do Nexo.

---

# 118. Marketplace

Possível ecossistema futuro para distribuição ou comercialização de:

- componentes;
- plugins;
- integrações;
- templates;
- outros recursos.

---

# 119. K3

Referência ao modelo de inteligência artificial da Kimi utilizado no contexto de desenvolvimento e, quando apropriado, como parte do Agent Swarm.

---

# 120. Agent Swarm

Sistema de coordenação de múltiplos agentes de IA para execução de tarefas complexas em paralelo ou em etapas coordenadas.

No projeto Nexo, o Agent Swarm será utilizado posteriormente para auxiliar na implementação da plataforma a partir da documentação consolidada.

---

# 121. Documentation Source of Truth

Conjunto de documentos oficiais utilizados como referência para decisões, arquitetura e implementação.

No desenvolvimento assistido por IA, a documentação deve funcionar como uma fonte explícita de contexto para evitar decisões inventadas.

---

# 122. Open Decision

Decisão ainda não finalizada.

Um Open Decision não deve ser tratado por agentes como uma decisão definitiva.

---

# 123. Proposal

Solução ou ideia sugerida, mas ainda não aprovada como regra oficial.

---

# 124. Decided

Decisão aprovada e considerada parte oficial do projeto.

---

# 125. Required

Regra ou comportamento considerado obrigatório.

---

# 126. Non-Goal

Algo que deliberadamente não faz parte do objetivo atual do produto ou não deve ser assumido como responsabilidade do núcleo.

---

# 127. Principle

Regra orientadora que deve influenciar decisões de produto e engenharia.

---

# 128. Master Specification

Documento futuro que consolidará as especificações oficiais do Nexo CMS.

Ele não deverá inventar informações novas.

Seu papel será consolidar o conteúdo definido nos documentos de origem.

---

# 129. Source Project

O projeto original ou real sobre o qual o Nexo está trabalhando.

Esse termo é utilizado para diferenciar o projeto real de representações internas como Project Model ou Project Graph.

---

# 130. Nexo-managed Project

Projeto que está sendo administrado pelo Nexo CMS.

Isso não significa que o projeto pertença ao Nexo ou dependa exclusivamente dele.

---

# 131. Runtime Capability

Capacidade disponibilizada pelo Nexo Runtime ao restante do sistema.

Exemplos:

- filesystem;
- process execution;
- terminal;
- Git;
- build;
- preview.

---

# 132. Provider Abstraction

Modelo através do qual o Nexo pode trabalhar com diferentes implementações de um mesmo tipo de serviço.

Exemplo:

```text
AI Provider
├── Kimi
├── Luna
├── OpenAI
└── Local Model
```

---

# 133. Adapter Abstraction

Modelo através do qual o Nexo pode interpretar diferentes tecnologias e arquiteturas através de implementações específicas.

---

# 134. Core Invariant

Regra estrutural que não deve ser quebrada sem uma decisão explícita de arquitetura ou produto.

---

# 135. Regra para novos termos

Novos termos estruturais deverão ser adicionados a este Glossário quando:

- aparecerem em múltiplos documentos;
- representarem um conceito oficial;
- puderem gerar interpretação ambígua;
- fizerem parte de contratos;
- forem usados por agentes;
- tiverem significado diferente do uso comum.

Um termo não deve receber múltiplas definições oficiais.

Quando houver necessidade de mudar uma definição existente, a alteração deverá ser tratada como uma decisão documentada.

---

# 136. Regra de nomenclatura

Sempre que possível, os termos oficiais devem ser utilizados com a mesma nomenclatura em:

- documentação;
- interface;
- APIs;
- código;
- contratos;
- agentes;
- logs;
- mensagens do sistema.

Diferenças de linguagem de interface podem existir por UX, mas não devem criar conceitos técnicos diferentes sem necessidade.

---

# 137. Regra final

Este documento é a referência oficial para a terminologia do Nexo CMS.

Quando um documento, agente ou implementação utilizar um termo definido aqui, deverá respeitar sua definição.

Quando houver dúvida sobre o significado de um termo, a primeira referência deve ser este Glossário.

> **No Nexo CMS, linguagem consistente é parte da arquitetura.**