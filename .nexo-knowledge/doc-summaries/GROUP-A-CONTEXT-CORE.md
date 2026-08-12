# GROUP A — CONTEXT-core (Resumos de Documentos)

> Grupo de contexto fundamental do NEXO CMS. Fontes: Human Manifest, Product Vision, Product Principles, Core Invariants, Non-Goals, Glossary (em /mnt/agents/upload/). Este resumo é fiel aos documentos; nada aqui foi inferido além do texto. Ambiguidades marcadas com [AMBIGUO].

---

## NEXO CMS — Human Manifest

- **Responsabilidade:** Documento fundacional ("por quê"). Explica o problema que motiva o produto (fragmentação de ferramentas e stacks diferentes por cliente), a ideia central (camada universal entre a equipe e os projetos) e o escopo aspiracional de cada grande capacidade (componentes, mídia, design, responsividade, Git, IA, deploy, plugins, portabilidade, futuro comercial).

- **Decisões/regras-chave:**
  - Ideia central: "O Nexo entende o projeto que já existe, respeita sua tecnologia e permite que a equipe trabalhe sobre ele sem precisar abandonar sua arquitetura."
  - Princípio mais importante (§3): **"O Nexo se adapta ao projeto. O projeto não se adapta ao Nexo."** Se o projeto usa Tailwind / CSS Modules / styled-components / CSS variables, o Nexo deve respeitar/trabalhar com isso.
  - O Nexo não é "apenas um CMS": é uma **plataforma de engenharia e gerenciamento de projetos web** reunindo CMS, editor visual, editor de código, Project Intelligence, Component Library, Component Studio, Media Library, Design System Editor, Responsive Lab, Git, terminal, build, preview, IA, integrações, plugins e deploy (§4).
  - O projeto é a fonte da verdade: edições devem atingir os arquivos reais; alterações de código aparecem no Git; "O Nexo não deve esconder a realidade do projeto" (§5).
  - Universalidade: suportar stacks modernos (Next.js, React, Vue, Nuxt, Svelte, SvelteKit, Astro, Vite, HTML/CSS/JS, TS, Tailwind, CSS Modules, styled-components, "outras tecnologias futuras") — lista NÃO fechada; arquitetura extensível sem reconstruir o núcleo (§6).
  - Adapters: camada que traduz entre "a forma como o projeto funciona" e "a forma como o Nexo precisa entendê-lo"; o núcleo não assume que todos os projetos são iguais (§7).
  - Project Intelligence: ao abrir uma pasta, analisar stack, framework, linguagem, package manager, dependências, rotas, páginas, layouts, componentes, estilos, assets, scripts, configurações, Git, comandos de dev/build; construir representação própria do projeto (§8).
  - Editor visual + código coexistem; o sistema deve relacionar elemento visual à sua origem no projeto (§9).
  - Componentes são pilar do produto: biblioteca reutilizável (Hero, Navbar, Footer, Carousel, Gallery, FAQ, Testimonials, Contact Form, WhatsApp, Google Maps, CTA, cards...); componente de projeto pode ser **promovido** à biblioteca global da Nexo Digital (§10). Componentes devem ser editáveis via propriedades compreendidas pelo Nexo (ex.: carrossel com imagens, ordem, autoplay, velocidade, itens por breakpoint etc.) e salvar atualiza o projeto real (§11).
  - Componentes externos: inserir HTML/CSS/JS, iframe, scripts, widgets, embeds, chats, mapas, formulários, snippets — também armazenáveis e reutilizáveis (§12).
  - Media Library universal (imagens, SVG, GIF, vídeos, WebP, AVIF, PDFs, fontes); o Nexo deve saber onde um asset está sendo utilizado (§13).
  - Design System: editar cores, gradientes, tipografia, espaçamento, bordas, radius, sombras, containers, breakpoints, variáveis, temas, tokens — respeitando a implementação do projeto; o objetivo NÃO é impor um design system do Nexo (§14).
  - Responsividade como parte própria do produto: Responsive Lab com tamanhos personalizados, detecção de overflow, textos/botões quebrados, grids que não cabem, menus que estouram, cenários extremos; "Queremos encontrar o bug antes do cliente" (§15).
  - Git é obrigatório desde o início: repositories, branches, remotes, commits, push/pull/fetch, merge, rebase, stash, revert, reset, cherry-pick, histórico, diff; interface acessível sem retirar o terminal (§16).
  - Runtime: a interface é web, mas o Runtime do Nexo permite operar o projeto real (terminal, Node, package managers, build, processos) (§17).
  - IA própria chamada **Nexo AI Engineer**: ajuda a entender projeto, explicar código, criar/editar componentes, corrigir builds etc.; nunca "caixa preta" — trabalha com contexto, planejamento, diff e validação (§18).
  - Dois modos de IA: **automático** (fluxo completo conforme permissões) e **manual** (propõe, usuário aprova etapas importantes); em ambos, alterações relevantes devem poder ser revisadas antes de aplicadas (§19).
  - IA não substitui controle humano: permissões, contexto limitado, diff, validação, logs, histórico, Git, confirmação de operações perigosas (§20).
  - Providers de IA: camada de providers com contratos próprios; futuros: Kimi, Luna, OpenAI, Anthropic, Gemini, modelos locais, APIs personalizadas (§21).
  - Luna: sistema independente da Nexo Digital; deve haver integração oficial/ponte para uso como provider e agente, sem reescrever a Luna (§22).
  - Pages e Content: administrar conteúdo existente e criar páginas respeitando arquitetura/padrões do projeto (§23).
  - Plugins/extensibilidade: adapters, providers de IA, integrações, componentes, ferramentas, serviços de deploy; núcleo estável com ecossistema crescente (§24).
  - Deploy como processo com validação (Vercel, Hostinger, SSH, SFTP, FTP, GitHub, GitLab, Docker, destinos personalizados) (§25).
  - Portabilidade: "O projeto do cliente nunca deve ficar preso ao Nexo"; abrir, editar, Git, exportar, mover, publicar e continuar fora do Nexo (§26).
  - Futuro comercial: uso interno primeiro; arquitetura deve considerar contas, equipes, workspaces, planos, billing, marketplace etc. Marca Nexo pertence à Nexo Digital (§27).

- **Invariantes:**
  - "O Nexo se adapta ao projeto. O projeto não se adapta ao Nexo."
  - "O projeto não precisa aprender a linguagem do Nexo. O Nexo precisa aprender a linguagem do projeto."
  - "O Nexo não deve esconder a realidade do projeto."
  - "Git fará parte da estrutura do Nexo desde o início."
  - "A IA nunca deverá ser tratada como uma simples caixa preta que recebe um prompt e altera qualquer coisa."
  - "O Nexo deve acrescentar capacidade ao projeto, não criar uma prisão tecnológica."

- **Vocabulário oficial (introduzido/afrimado aqui):** Nexo AI Engineer (camada de IA do produto); Adapter (ensina o Nexo a trabalhar com uma tecnologia); Project Intelligence (análise inicial do projeto); Responsive Lab; Component Studio; Media Library; Modo automático / Modo manual (IA); Luna (sistema independente, integrável via ponte).

- **Non-goals (§28, "O que o Nexo não deve se tornar"):** um WordPress com outra aparência; um Elementor com outro nome; um editor de HTML limitado; um gerador de código que destrói projetos existentes; ferramenta presa a um único framework; ferramenta presa a uma única IA; construtor visual que gera Frankenstein; plataforma que esconde o código; sistema que simula alterações sem alterar o projeto real.

- **Implicações para implementação:**
  - O core NÃO pode conter lógica específica de framework — tudo que é específico de stack vai para adapters.
  - Toda operação de "salvar" precisa persistir no projeto real (não em cópia fictícia).
  - A relação visual↔código exige mecanismo de mapeamento (origem do elemento no código).
  - Git, terminal e processos reais devem ser acessíveis via Runtime — nada de simulação.
  - IA precisa de modos automático/manual, diff, validação e confirmação de operações perigosas.
  - Componentes precisam de modelo de propriedades compreensível e caminho de promoção projeto→biblioteca global.
  - Extensibilidade (plugins/providers/adapters) é requisito arquitetural desde o início, assim como portabilidade e a não-dependência de providers (incluindo Luna).

---

## NEXO CMS — Product Vision

- **Responsabilidade:** Transforma o Manifesto em visão de produto precisa: o produto a construir, o problema, a experiência, o posicionamento, o que é um "Nexo completo" e o que deve permanecer central. Explicitamente **não define implementação técnica** (framework do Nexo, banco, protocolo etc. ficam para docs de arquitetura). Serve para impedir que decisões técnicas afastem o produto de sua finalidade.

- **Decisões/regras-chave:**
  - Visão central: "entrar em qualquer projeto web compatível, compreender sua estrutura, respeitar sua tecnologia e oferecer uma experiência centralizada para editar, desenvolver, versionar, testar, automatizar e publicar". A pergunta do usuário deve ser "Este projeto está dentro do Nexo?" (§2).
  - Objetivo: reduzir fragmentação criando uma **camada de trabalho central** que coordena ferramentas externas (não eliminá-las) (§3).
  - Um único ambiente coerente: Project → Visual Editor, Code, Pages, Components, Media, Design, Responsive Lab, Git, AI, Integrations, Terminal, Preview, Deploy — como partes de um mesmo fluxo, não produtos colados (§4).
  - Ciclo de experiência: OPEN → UNDERSTAND → EXPLORE → EDIT → CREATE → VALIDATE → VERSION → PUBLISH (§5).
  - Caso de uso principal inclui receber projetos existentes: análise da pasta alimenta a representação interna (§6).
  - Regra: **"O Nexo deve compreender antes de modificar"** — não modificar por mera correspondência de string; entender contexto, função do arquivo, relações, origem do conteúdo, estilização, dependências, impacto; quanto mais complexa a tarefa, maior a compreensão necessária (§7).
  - "O projeto continua sendo o projeto": Next.js+TS+Tailwind continua Next.js+TS+Tailwind depois do Nexo; o Nexo só acrescenta camada de compreensão/gerenciamento (§8).
  - Universalidade ≠ simplificação excessiva: experiência consistente **sem apagar diferenças técnicas** (React ≠ Vue ≠ HTML/CSS/JS) (§9).
  - Adapter é o mecanismo da universalidade: `Nexo Concept ↔ Adapter ↔ Project Technology`; conceitos universais: página, componente, propriedade, asset, estilo, rota, build, projeto (§10).
  - Editor visual poderoso mas não destrutivo: atua **sobre a estrutura existente**; não introduz estruturas invisíveis/mágicas incompreensíveis fora do Nexo (§11).
  - Código acessível: alternância Visual↔Code; seleção visual identifica origem no código (quando possível); edição de código reflete no preview; alterações visuais geram alterações reais (§12).
  - Componentes como patrimônio: fluxo Create → Edit → Test → Save → Version → Reuse; distinção `Project Component` vs `Nexo Library Component`; biblioteca sobrevive aos projetos (Projeto A → promover → Nexo Library → Projetos B/C/D), com versionamento/compatibilidade próprios a especificar (§13, §15).
  - Component Studio: componentes reais com estrutura, código, estilos, propriedades, variantes, responsividade, assets, dependências, documentação, preview — não só snippets (§14).
  - Conteúdo simples de administrar usando o armazenamento que fizer sentido ao projeto; **o Nexo não deve obrigar conteúdo estático a virar banco de dados** (§16).
  - Media Library: Asset → Where is it? → How is it used? → Can it be replaced? → What breaks if removed? (§17).
  - Design editável sem destruir a linguagem visual existente; a forma correta de editar depende de como o projeto implementa estilos (§18).
  - Responsive Lab trata bugs de layout como problemas de engenharia (viewport, problema, elemento afetado, provável origem) (§19).
  - Git no fluxo normal: Edit → Review → Diff → Commit → Push; ou AI Edit → Diff → Test → Commit → Push; Git permite recuperação (§20).
  - IA como engenheira, não geradora aleatória: orientada a tarefas (analisar, planejar, explicar, editar, testar, diagnosticar, corrigir, gerar, revisar); exemplo: "Faça o header funcionar melhor no mobile" exige localizar header, tecnologia, estilos, dependentes, breakpoints antes de propor/executar (§21).
  - Modos de IA: Automático = analyze → plan → modify → validate → report (respeitando permissões); Manual = analyze → explain → propose → show diff → wait for approval (§22).
  - **A IA não determina a arquitetura do projeto**: arquitetura existente, regras dos adapters e políticas do Nexo são restrições; a IA trabalha dentro delas (§23).
  - Independência de provider de IA: Luna, Kimi e outros sob a mesma arquitetura de AI Provider (§24).
  - Integrações como cidadãs de primeira classe, administráveis (§25).
  - "O Nexo deve permitir sair do caminho": comando manual, código, Git direto, terminal — não limitar profissionais experientes (§26).
  - Deploy = consequência de projeto validado: Project → Validate → Build → Preview → Deploy → Verify (§27).
  - Portabilidade como característica do produto: projeto não pode se tornar inutilizável se o Nexo for removido (§28).
  - Estratégia: primeiro uso interno na Nexo Digital (não SaaS perfeito imediato); visão comercial futura (contas, orgs, workspaces, billing, marketplace...) **sem complicar o MVP** — arquitetura apenas evita decisões que impeçam a evolução (§29–30).
  - Sucesso = desenvolvedor recebe projeto desconhecido e consegue as 14 capacidades listadas (entender stack ... publicar) com mínima troca de ferramentas (§31). Sucesso medido pela "qualidade com que ele consegue entender, editar e preservar projetos reais", não pelo nº de frameworks (§32).

- **Invariantes:**
  - "O Nexo deve compreender antes de modificar."
  - "O Nexo apenas acrescentará uma camada de compreensão e gerenciamento" (o projeto real continua existindo).
  - "Experiência consistente sem apagar as diferenças técnicas que precisam ser preservadas."
  - "O código não deverá ser escondido."
  - "A IA deve trabalhar dentro dessas restrições" (arquitetura do projeto, adapters, políticas).
  - "O produto não deverá nascer dependente de uma única empresa de IA."

- **Vocabulário oficial:** AI Provider (arquitetura de providers de IA); Project Component vs Nexo Library Component; ciclo OPEN→...→PUBLISH; fluxos de Git com Diff/Commit/Push; Validate→Build→Preview→Deploy→Verify.

- **Non-goals implícitos/explícitos:** não criar abstração que substitua a realidade do código; não fazer tecnologias parecerem iguais; não introduzir estruturas "mágicas"; não obrigar banco de dados para conteúdo estático; não sobrescrever o design com sistema próprio; não depender de um único fornecedor de IA; não complicar o MVP com visão comercial.

- **Implicações para implementação:**
  - Este doc é a referência para validar decisões de UX/produto; detalhes técnicos ficam para outros docs (não decidir stack do Nexo a partir daqui).
  - Source mapping visual↔código é requisito ("quando tecnicamente possível").
  - Ciclo de deploy exige gates de validação antes de publicar.
  - IA precisa de pipeline analyze→plan→modify→validate→report e analyze→explain→propose→diff→approval.
  - Modelo de componentes precisa separar escopo projeto vs biblioteca e prever versionamento de biblioteca (especificação posterior).
  - Responsive Lab deve diagnosticar (elemento afetado, origem provável), não apenas redimensionar preview.

---

## NEXO CMS — Product Principles

- **Responsabilidade:** Define os 38 princípios que orientam todas as decisões de produto e engenharia. Funciona como restrição de projeto: em conflito entre conveniência de implementação e princípio, o princípio vence. Determina "o comportamento que a implementação deve preservar", não a implementação. Regra final (§40): toda especificação futura deve ser avaliada contra estes princípios; contradições devem ser identificadas explicitamente e exceções documentadas.

- **Decisões/regras-chave (os 38 princípios, nomes fiéis):**
  1. **O projeto é soberano** — o projeto continua válido sem o Nexo (código, assets, build, Git, dependências, arquitetura pertencem ao projeto).
  2. **O Nexo se adapta ao projeto** — respeitar framework, linguagem, estilos, componentes, estrutura, build, package manager, convenções; abstração interna só é válida se traduzível corretamente ao projeto.
  3. **Entender antes de alterar** — contexto, origem, dependências, consumidores, convenções, efeitos, impactos; não basear alteração só em correspondência textual quando houver contexto estrutural.
  4. **Abstração sem apagar a realidade** — conceitos universais (Project, Page, Route, Component, Asset, Style, Property, Integration, Build, Deployment) sempre relacionáveis à implementação real.
  5. **O código nunca deve ser cidadão de segunda classe** — abrir arquivos, editar código, diffs, comandos, Git, inspeção.
  6. **Visual e código devem permanecer relacionados** — alteração visual com correspondência identificável; código reflete no preview.
  7. **Alterações devem ser reais** — salvar = persistir no projeto real; proibido simular edição não persistida.
  8. **Nada de Frankenstein visual** — evitar estilos duplicados, CSS conflitante, estruturas redundantes, overrides arbitrários, hacks; preferir tokens, classes e componentes existentes.
  9. **Respeitar a linguagem do projeto** — Tailwind: não introduzir CSS paralelo; CSS Modules: respeitar escopos; styled-components: preservar padrão; CSS Variables: alterar variáveis quando apropriado; HTML/CSS/JS: não inventar framework. Regras específicas pertencem aos adapters.
  10. **Git é parte do estado do projeto** — saber o que mudou, revisar, identificar alterações da IA, commits, recuperação, comparação; alterações relevantes rastreáveis.
  11. **Tudo que pode ser revertido deve ser revertível** — histórico, Git, diff, snapshots, undo/redo, confirmação de operações perigosas.
  12. **A IA trabalha dentro de limites** — contexto, permissões, regras do projeto/adapter, políticas do usuário, validação.
  13. **IA primeiro entende, depois planeja, depois executa** — Understand → Plan → Modify → Validate → Review → Apply; "A IA não deve modificar arquivos sem possuir contexto suficiente para justificar a alteração."
  14. **A IA deve mostrar o trabalho importante** — o quê, por quê, arquivos, efeitos previstos, validação, problemas; anti-caixa-preta.
  15. **Segurança antes de conveniência** — capacidades sensíveis (filesystem, terminal, Git, processos, secrets, deploy, IA); categorias: ações seguras / modificadoras / destrutivas / críticas (modelo de segurança posterior); quanto maior o impacto, maior o controle.
  16. **O usuário deve saber onde está alterando** — projeto, página, componente, origem, asset, ambiente; não confundir Projeto A com B nem produção com desenvolvimento.
  17. **Componentes são ativos reutilizáveis** — biblioteca facilita criação, documentação, versionamento, reutilização, atualização, compatibilidade.
  18. **Reutilização não pode causar acoplamento indevido** — Project Component ≠ Global Component; promoção à biblioteca global é ação consciente.
  19. **Integrações devem ser extensíveis** — via contratos/extensões, não no núcleo.
  20. **O núcleo deve permanecer pequeno e estável** — crescimento via adapters, plugins, providers, componentes, integrações, módulos; avaliar se algo pertence ao core ou é extensão.
  21. **Portabilidade é obrigatória** — executar, versionar, transferir, exportar, publicar e manter fora do Nexo.
  22. **O Nexo deve ser agnóstico de provider** — não depender de uma única IA, plataforma Git, provedor de deploy, tecnologia ou infraestrutura.
  23. **Extensibilidade desde o início, complexidade controlada** — separar "Preparado para suportar" de "Já suporta" (distinção explícita na documentação).
  24. **Não inventar capacidades silenciosamente** — classificações: Supported / Detected / Unknown / Unsupported / Custom; melhor "Estrutura não reconhecida" do que modificar incorretamente; crítico para agentes de IA.
  25. **Falhar com clareza** — explicar o que tentou, onde falhou, causa conhecida, o que foi/não foi modificado, próxima ação; erros silenciosos são inaceitáveis.
  26. **Preview não deve mentir** — deixar claro se representa estado salvo, não salvo, temporário, local, remoto ou ambiente diferente.
  27. **Performance faz parte da qualidade** — evitar duplicação de assets, dependências desnecessárias, scripts redundantes, componentes pesados.
  28. **Acessibilidade é parte do produto** — alt, labels, contraste, semântica, teclado, foco, headings; na interface do Nexo e nas ferramentas de edição.
  29. **Mobile é uma realidade, não um estado secundário** — responsividade desde o início, não desktop reduzido.
  30. **Automação deve reduzir trabalho, não esconder trabalho** — Automação + Transparência + Controle.
  31. **A experiência deve ser poderosa sem ser confusa** — complexidade disponível quando necessária, não imposta.
  32. **Convenções existentes têm prioridade** — nomenclatura, pastas, componentes, estilos, tokens, padrões, assets, comandos, scripts do projeto prevalecem sobre padrões internos do Nexo.
  33. **Novas funcionalidades precisam justificar sua existência** — 3 perguntas: qual problema real resolve? preserva os princípios? pertence ao core ou é extensão?
  34. **Documentação é parte da engenharia** — decisões, contratos, regras e exceções documentados; agentes futuros devem entender o projeto sem depender de conversas anteriores.
  35. **Agentes devem seguir contratos, não improvisar** — ordem de busca: documentação existente → contrato → princípio → decisão registrada → requisito específico → só então propor solução; lacuna documental ≠ decisão arquitetural silenciosa.
  36. **O Nexo deve ser verificável** — detecção de stack, build, commit, alteração de componente, deploy → todos com resultado verificável.
  37. **Precisão é mais importante que aparência de inteligência** — admitir o que não sabe; resposta limitada e correta > completa e inventada.
  38. **O produto deve crescer sem perder sua identidade** — novas capacidades ampliam o Nexo, não o redefinem silenciosamente.

- **Invariantes:** o doc inteiro é um conjunto de restrições; textualmente: "Uma alteração não deve ser baseada apenas em uma correspondência textual quando houver contexto estrutural disponível" (P03); "O Nexo não deve simular uma edição que não foi efetivamente persistida" (P07); "A IA não deve modificar arquivos sem possuir contexto suficiente para justificar a alteração" (P13); "Erros silenciosos são inaceitáveis em operações sobre projetos reais" (P25); "É preferível uma resposta limitada e correta a uma resposta completa e inventada" (P37).

- **Vocabulário oficial:** conceitos universais (Project, Page, Route, Component, Asset, Style, Property, Integration, Build, Deployment); classificações Supported/Detected/Unknown/Unsupported/Custom; Project Component vs Global Component; categorias de ação (segura/modificadora/destrutiva/crítica); "Preparado para suportar" vs "Já suporta".

- **Non-goals abordados:** Frankenstein visual; esconder código; depender de provider único; fingir suporte; complexidade desnecessária; respostas inventadas.

- **Implicações para implementação:**
  - Estados de classificação de suporte (Supported/Detected/Unknown/Unsupported/Custom) devem existir no modelo de dados e na UI.
  - Sistema de permissões deve distinguir ações seguras/modificadoras/destrutivas/críticas (detalhe em doc de segurança posterior).
  - Pipeline de IA deve implementar Understand→Plan→Modify→Validate→Review→Apply.
  - Preview precisa de rótulo de estado; falhas parciais/erros precisam de superfície explícita.
  - Processo de engenharia: toda nova feature passa pelas 3 perguntas do P33; decisões e exceções são documentadas (P34, P40).
  - Adapters detêm as regras por tecnologia (P09) — o core não as contém.

---

## NEXO CMS — Core Invariants

- **Responsabilidade:** Define as invariantes fundamentais — condições que devem permanecer verdadeiras independentemente de framework, adapter, provider de IA, ambiente, tipo de projeto, plugin, modo de edição/IA, fornecedor de deploy ou evolução futura. Possuem prioridade elevada; agentes (incluindo Kimi Agent Swarm / K3) não podem alterar, reinterpretar ou ignorar uma invariante para simplificar implementação. Conflitos fundamentais não podem ser resolvidos silenciosamente.

- **Decisões/regras-chave:**
  - 51 invariantes numeradas (seções 2–52) — ver lista completa na SÍNTESE DO GRUPO abaixo. Destaques de mecanismo:
  - Fluxo de verdade: `SOURCE PROJECT → NEXO UNDERSTANDING → NEXO OPERATIONS → SOURCE PROJECT`; Project Model não é autoridade superior ao código real (Inv. 1).
  - Estados obrigatórios de alteração: **draft, unsaved, pending, applied, failed, reverted**; UI nunca apresenta como concluída alteração que só existe em memória (Inv. 2).
  - Pipeline para o desconhecido: Detectar → Avaliar → Classificar confiança → Decidir se a operação é segura → Somente então modificar (Inv. 6).
  - Estados de certeza: **Known, Detected, Inferred, Unknown, Unsupported** (Inv. 25).
  - Estados de preview: Saved Project / Unsaved Changes / Draft / Preview Build / Production (Inv. 12).
  - Ambientes: Development / Preview / Staging / Production — ação para um ambiente não executa silenciosamente em outro (Inv. 31).
  - Deploy: Build → Deploy → Verification (Inv. 32).
  - Edição: estratégia "find text / replace text / write file" não é suficiente para operações complexas quando houver AST, parser, component model etc. (Inv. 44); preferir mecanismos semânticos: AST, parser, component model, route graph, dependency graph, asset graph (Inv. 45).
  - **Hierarquia de resolução de conflitos (§53):** 1. Segurança e integridade do projeto; 2. Core Invariants; 3. Decisões arquiteturais aprovadas; 4. Contratos; 5. Requisitos do produto; 6. Especificação da área; 7. Preferências de implementação; 8. Conveniência local. "Uma preferência de implementação nunca deve superar uma invariante."
  - **Checklist K3 Swarm (§54):** antes de solução estrutural verificar: preserva o projeto real? respeita o adapter? mantém portabilidade? preserva Git? não inventa suporte? não quebra a arquitetura do projeto? mantém rastreabilidade? respeita segurança? mantém substituibilidade de providers? Qualquer "não" → reconsiderar.
  - Pesquisa técnica (§55): priorizar documentação oficial > especificações oficiais > doc do fornecedor > repositórios oficiais > fontes técnicas confiáveis; não inventar APIs/parâmetros/comportamentos de versão; registrar fonte para verificação posterior.
  - Alteração de uma Core Invariant exige: motivo, impacto, justificativa, decisão registrada, atualização da documentação, análise das partes afetadas (§56).

- **Invariantes:** todo o documento é o conjunto canônico de invariantes (lista numerada completa na seção SÍNTESE). Formulação final (§57): "O Nexo pode modificar profundamente um projeto quando isso for solicitado e permitido. Ele nunca deve modificar silenciosamente os princípios que tornam esse projeto confiável, portátil e compreensível."

- **Vocabulário oficial:** Project Model, Project Graph, Source Project, Core, Adapter, Runtime, AI Provider, Deployment Provider, draft/unsaved/pending/applied/failed/reverted, Known/Detected/Inferred/Unknown/Unsupported, K3 / Kimi Agent Swarm, "uma responsabilidade deve possuir uma autoridade clara".

- **Non-goals reforçados:** não assumir stack único; não falsificar Git; não simular comandos; não ser "máquina de sobrescrever arquivos"; não injetar metadata/dependências no projeto para satisfazer o Nexo; não antecipar decisões não tomadas; não implementar complexidade futura sem necessidade presente.

- **Implicações para implementação:**
  - Este é o doc de mais alta prioridade para engenharia: qualquer código que viole uma invariante está errado por definição.
  - Exige: máquina de estados de alteração (draft→applied/failed/reverted), níveis de confiança em detecção, rastreio de referências de assets/componentes, gates de validação pós-mudança crítica, logs fiéis, contratos estáveis e versionados entre partes.
  - IA e editor seguem o mesmo contrato; IA não tem rota especial.
  - Providers são substituíveis e implementam contratos (não os definem); Luna segue a mesma regra.
  - Build/comandos pertencem ao projeto e executam via Runtime real.
  - Componentes de biblioteca precisam de identidade estável; atualização de componente global não propaga automaticamente.
  - Hierarquia de conflitos e checklist K3 devem ser aplicados por qualquer agente de implementação antes de decisões estruturais.

---

## NEXO CMS — Non-Goals

- **Responsabilidade:** Define explicitamente o que o Nexo **não pretende ser, não deve fazer por padrão ou não deve considerar responsabilidade do núcleo**. Controla escopo e impede que agentes/devs inferam capacidades. Um non-goal não é proibição eterna: exige decisão explícita e documentada antes de ser incorporado; não deve ser inferido automaticamente nem implementado "porque é possível".

- **Decisões/regras-chave / Non-goals (itens 2–40 do doc, condensados fielmente):**
  - Não é um framework para criar sites nem substituto de React/Vue/Svelte/Next/Astro/HTML/CSS/JS (§2); não impõe stack nem conversão de stack sem solicitação explícita (§3).
  - Não é substituto obrigatório de IDE (VS Code, JetBrains, Neovim, Sublime continuam usáveis) (§4).
  - Não é plataforma fechada: "Se remover o Nexo, o projeto deixa de funcionar" não pode existir (§5).
  - Não substitui Git nem cria sistema proprietário de versionamento apresentado como Git (§6).
  - Não é hospedagem obrigatória ("projeto Nexo ≠ hospedagem Nexo") (§7).
  - Não depende de um único provedor de IA (Kimi, Luna, OpenAI, Anthropic, Gemini...) (§8); Luna não é dependência do core — sua ausência não pode impedir o Nexo (§9).
  - Não é apenas um chatbot; interface de chat pode existir mas não define o produto (§10).
  - Não permite IA sem controle: sem autonomia irrestrita nem acesso ilimitado (§11).
  - Não esconde o código (§12); não promete que "qualquer pessoa construirá qualquer software sem conhecimento técnico" (§13).
  - Não é construtor visual destrutivo (não reescreve página inteira a cada mudança de propriedade) (§14).
  - Não transforma projeto em "Nexo Project" com estrutura proprietária obrigatória (Nexo/, NexoRuntime/, NexoComponent/, NexoDatabase/); arquivos próprios só por decisão explícita de arquitetura (§15).
  - Não converte/migra/reescreve projetos desconhecidos sem instrução explícita; em caso de desconhecimento, informar a limitação (§16).
  - Não finge suporte universal: distinguir Detectado / Suportado / Parcialmente suportado / Desconhecido / Não suportado (§17).
  - Não inventa semântica de projeto (Header.tsx ou pasta components/ não são certezas); detecção/inferência com níveis de confiança (§18).
  - Não move arquivos sem necessidade (risco a imports, rotas, builds, scripts, pipelines, referências, deploys) (§19).
  - Não adiciona dependências sem justificativa (§20); não reescreve componentes existentes quando alteração localizada basta (§21).
  - Não impõe design system próprio (paleta, tipografia, spacing, breakpoints, componentes) a projetos que já os possuem (§22).
  - Não exige banco de dados para todo conteúdo (arquivos, JSON, Markdown, código, CMS externo, API são fontes válidas) (§23).
  - Não substitui serviços externos sem motivo (formulário, analytics, CRM, WhatsApp, mapas, auth); "Integração e substituição são operações diferentes" (§24).
  - Não cria páginas automaticamente sem intenção (origem clara: solicitação, configuração, automação explícita, processo documentado) (§25).
  - Não cria componentes duplicados indiscriminadamente (§26); não transforma cada div/h1/button/span em componente (§27); biblioteca global não é obrigatória (§28).
  - Não esconde alterações da equipe: mudanças identificáveis via diff, histórico, logs, Git, estado (§29).
  - Não publica automaticamente alterações perigosas por padrão; deploy automático depende de configuração/permissões/políticas (§30).
  - Não trata produção como ambiente descartável; preview/dev/produção claramente diferenciados (§31).
  - Não promete compatibilidade perfeita (tecnologias experimentais, código obfuscado, sistemas antigos etc.) (§32).
  - Não apaga limitações da documentação (suporte parcial explícito; decisão aberta não é definitiva) (§33).
  - Não confunde preparação com implementação: "Preparado para suportar não significa implementado" (§34).
  - Não prioriza quantidade sobre qualidade: "Um recurso mal implementado que quebra projetos é pior do que não possuir aquele recurso" (§35).
  - Não é construído para impressionar uma IA: toda abstração precisa de finalidade clara (§36).
  - Não é governado por decisões silenciosas de agentes (§37).
  - Não trata desconhecimento como permissão: Detectar → Avaliar confiança → Informar incerteza → Solicitar definição quando necessário (§38).
  - Não cria dependência comercial artificial (portabilidade básica preservada mesmo com planos pagos) (§39).
  - Não perde identidade por crescimento: missão central = "compreender, editar, desenvolver, versionar, testar, automatizar e publicar projetos web sem obrigá-los a abandonar sua própria tecnologia" (§40).
  - Regra final (§42): nova proposta que contradiga non-goal não prossegue silenciosamente — decisão explícita: manter, alterar, criar exceção ou retirar a proposta. "Saber o que o Nexo não deve ser é tão importante quanto saber o que ele deve ser."

- **Invariantes:** ver non-goals acima (o doc é integralmente uma lista de proibições/restrições).

- **Vocabulário oficial:** classificações Detectado/Suportado/Parcialmente suportado/Desconhecido/Não suportado; "Integração ≠ substituição"; "Preparado para suportar ≠ implementado".

- **Non-goals:** o documento inteiro (34 itens no resumo oficial do §41).

- **Implicações para implementação:**
  - Funciona como checklist de rejeição: qualquer feature/implementação que se aproxime destes itens exige decisão documentada prévia.
  - UI/modelo devem suportar os 5 estados de suporte e níveis de confiança de detecção.
  - Deploy automático nunca é padrão; produção tem proteção elevada.
  - Proibido criar estrutura proprietária obrigatória dentro do projeto do cliente.
  - Agentes de IA não podem transformar ausência de especificação em decisão silenciosa.

---

## NEXO CMS — Glossary

- **Responsabilidade:** Referência oficial de terminologia (134 termos). Termos devem ter significado consistente em documentação, código, interfaces, contratos, adapters e instruções a agentes. Agente não pode reinterpretar termo definido; novos conceitos estruturais devem ser adicionados ao glossário antes de uso amplo. "No Nexo CMS, linguagem consistente é parte da arquitetura."

- **Decisões/regras-chave:**
  - Regra para novos termos (§135): adicionar quando aparecerem em múltiplos documentos, forem conceito oficial, puderem gerar ambiguidade, fizerem parte de contratos, forem usados por agentes ou tiverem significado diferente do uso comum. Um termo não deve receber múltiplas definições oficiais; mudança de definição = decisão documentada.
  - Regra de nomenclatura (§136): mesma nomenclatura em documentação, interface, APIs, código, contratos, agentes, logs e mensagens do sistema; diferenças de idioma de UI por UX não criam conceitos técnicos diferentes.
  - Em dúvida sobre um termo, a primeira referência é este Glossário (§137).

- **Invariantes:** "Project Model não deve substituir o projeto real" (termo Project Model); "Snapshot não substitui Git"; "Salvar não deve significar apenas atualizar a interface do Nexo" (Save); "Suporte parcial não deve ser apresentado como suporte completo" (Partially Supported); "Um Open Decision não deve ser tratado por agentes como uma decisão definitiva".

- **Vocabulário oficial (seleção essencial, termo = definição curta):**
  - **Nexo CMS** = produto da Nexo Digital para compreender, editar, criar, versionar, testar, automatizar e publicar projetos web via interface unificada.
  - **Nexo Engine** = camada conceitual das capacidades centrais de compreensão e operação sobre projetos (≠ interface do CMS).
  - **Nexo Runtime / Runtime** = ambiente de execução que disponibiliza filesystem, terminal, processos, Git, build, preview, providers, deploy.
  - **Runtime Capability** = capacidade exposta pelo Runtime (filesystem, process execution, terminal, Git, build, preview).
  - **Project / Source Project** = projeto web real administrado; sempre o projeto real, fonte de verdade.
  - **Nexo-managed Project** = projeto administrado pelo Nexo (não pertence nem depende exclusivamente dele).
  - **Project Workspace** = representação operacional do projeto dentro do Nexo (não implica formato proprietário).
  - **Project Model** = representação interna do entendimento do Nexo sobre o projeto; não substitui o projeto real.
  - **Project Graph** = relações entre elementos (Page→Component→Style→Asset; Component→Dependency→Component) para impacto/dependências/referências.
  - **Project Intelligence** = conjunto de capacidades de análise: Project Discovery, Stack Detection, File System Intelligence, Route/Component/Style/Asset/Build Detection.
  - **Project Discovery** = análise inicial ao abrir/importar projeto, antes de modificar.
  - **Project Scanner** = percorre/analisa a estrutura física do projeto.
  - **Stack** = conjunto de tecnologias (linguagem, framework, styling, build tools...); **Stack Detection** = identificação automática do stack.
  - **Adapter** = módulo que ensina o Nexo a compreender/operar uma tecnologia; traduz conceitos internos ↔ realidade do projeto. Tipos: **Framework Adapter**, **Styling Adapter**, **Build Adapter**, **Package Manager Adapter**, **Git Adapter**; **Adapter System** = organiza/carrega adapters; **Adapter Abstraction** = modelo de interpretação de tecnologias.
  - **Supported / Partially Supported / Detected / Unknown / Unsupported / Custom** = classificações oficiais de suporte/detecção (Custom = fora dos padrões conhecidos, não necessariamente incorreto).
  - **Detection Confidence** = nível de confiança de uma conclusão de análise.
  - **Page / Route / Component / Prop / Slot / Variant** = unidades de interface; Component tem estrutura, código, estilos, propriedades, variantes, comportamento, assets, dependências.
  - **Project Component vs Global Component**; **Component Library**; **Component Studio** (ambiente de criação/edição de componentes); **Component Schema** (como o componente é interpretado/configurado); **Component Promotion** (projeto→biblioteca global); **Component Compatibility**.
  - **Asset / Media Library / Asset Reference** (ex.: logo.webp → Navbar → Footer → Home).
  - **Design System / Design Token / Theme** (o Design System do projeto não precisa ser igual ao do Nexo).
  - **Responsive Lab / Viewport** (preset, dispositivo, dimensão personalizada).
  - **Visual Editor / Code Editor / Inspector / Source Mapping** (relaciona elemento do preview à origem no projeto).
  - **Preview / Diff / Patch / Save** (Save persiste no projeto real).
  - **Git Repository / Branch / Remote / Commit / Working Tree / Clean/Dirty Working Tree**.
  - **Deploy / Deployment Provider** (Vercel, Hostinger, SSH, SFTP, FTP, Docker).
  - **Filesystem / Process / Command** (ex.: `git status`, `npm run build`).
  - **Integration / Embed / Plugin / Provider / Provider Abstraction**.
  - **AI Provider** (Kimi, Luna, OpenAI, modelo local, endpoint personalizado, via contrato de AI Provider); **Nexo AI Engineer** (IA do Nexo: compreender, planejar, editar, validar, diagnosticar).
  - **Autonomous Mode / Manual Mode**; **AI Context / AI Task / AI Plan / AI Validation**.
  - **Luna** = sistema independente de agentes/automações da Nexo Digital, conectável como AI Provider/agente; **Luna Provider** = integração via contrato compatível.
  - **Workspace / User / Role (Owner, Admin, Developer, Designer, Editor, Viewer) / Permission / Audit Log**.
  - **Snapshot** (não substitui Git); **Source of Truth** (para o projeto, é o próprio projeto real).
  - **Core** (pequeno, estável, independente de extensões); **Extension** (plugin, adapter, provider, integração, módulo).
  - **Contract / Internal Contract / External Integration Contract** (Adapter Contract, AI Provider Contract, Plugin Contract).
  - **Project State / Environment / Development Environment / Preview Environment / Production**.
  - **Build / Build Artifact / Validation Gate / Safety Gate / Dangerous Operation**.
  - **Project Migration** (mudança explícita de arquitetura/tecnologia; não presumida em edição comum); **Refactor**.
  - **Content / Content Source** (arquivo, JSON, Markdown, código, API, banco, CMS externo).
  - **Nexo Library / Global Library / Project Library**.
  - **SaaS / Multi-Tenant / Marketplace** (evolução comercial futura; não implicam primeiro release).
  - **K3** (modelo Kimi usado no desenvolvimento/Agent Swarm); **Agent Swarm** (coordenação de múltiplos agentes de IA para implementar a plataforma a partir da documentação consolidada).
  - **Documentation Source of Truth / Open Decision / Proposal / Decided / Required / Non-Goal / Principle / Core Invariant / Master Specification** (doc futuro que consolidará specs sem inventar informação nova).

- **Non-goals:** glossário não define non-goals próprios, mas reforça: Project Model ≠ substituto do projeto real; Snapshot ≠ Git; SaaS/Marketplace ≠ obrigação do primeiro release; suporte parcial ≠ suporte completo.

- **Implicações para implementação:**
  - Nomenclatura de código, APIs, contratos e logs deve usar estes termos oficiais (ex.: classes/módulos `ProjectModel`, `Adapter`, `RuntimeCapability`, `ValidationGate`, `SafetyGate`...).
  - Enumerações naturais já definidas: estados de suporte, Roles, estados de Working Tree, modos de IA.
  - Qualquer termo novo estrutural precisa entrar no glossário antes de se propagar; divergência de definição é violação.
  - Distinções críticas de modelagem: Engine vs interface do CMS; Project vs Project Model vs Project Graph vs Workspace; Project Component vs Global Component; Provider vs Adapter vs Plugin.

---

# SÍNTESE DO GRUPO

**Identidade do produto:**
- O NEXO CMS é uma plataforma/camada universal de engenharia e gerenciamento de projetos web — não um CMS tradicional — que entra em projetos existentes de qualquer stack suportado, compreende sua estrutura e centraliza edição visual + código, componentes, mídia, design, responsividade, Git, IA, build, preview e deploy em um único ambiente.
- Princípio fundador: "O Nexo se adapta ao projeto. O projeto não se adapta ao Nexo." O projeto real é soberano e é a fonte da verdade; o Nexo só acrescenta compreensão e operação.
- Sucesso medido pela qualidade em entender/editar/preservar projetos reais, não pela quantidade de frameworks declarados.
- Estratégia: uso interno na Nexo Digital primeiro; SaaS/marketplace/billing são futuro — a arquitetura prepara, mas o MVP não implementa ("Preparado para suportar ≠ Já suporta").

**Princípios que afetam diretamente arquitetura/código:**
- Universalidade via Adapters: o Core opera sobre conceitos abstratos (Project, Page, Route, Component, Asset, Style, Property, Integration, Build, Deployment); toda especialização tecnológica vive em adapters (Framework/Styling/Build/Package Manager/Git). Core pequeno, estável e tecnologicamente neutro.
- Toda alteração "salva" persiste no projeto real; proibida simulação (UI ou banco do Nexo divergente do Source Project). Máquina de estados: draft/unsaved/pending/applied/failed/reverted.
- Compreender antes de modificar: nada de find/replace cego; preferir AST, parser, component model, route/dependency/asset graphs; classificar confiança (Known/Detected/Inferred/Unknown/Unsupported) e suporte (Supported/Partially Supported/Detected/Unknown/Unsupported/Custom); desconhecimento bloqueia/limita operação, nunca autoriza invenção.
- Visual↔código convergem via Source Mapping; preview sempre rotulado com estado identificável; falhas parciais visíveis; erros nunca silenciosos; logs/auditoria não podem mentir.
- Git real e obrigatório (não falsificado, não substituído); operações destrutivas com Safety Gates; reversibilidade (undo, snapshots, histórico) sempre que possível; ambientes (dev/preview/staging/production) explícitos; deploy = Build→Deploy→Verification, nunca automático-perigoso por padrão.
- IA (Nexo AI Engineer) é engenheira dentro de restrições: pipeline Understand→Plan→Modify→Validate→Review→Apply; modos Autonomous/Manual; mesmo contrato do editor; permissões, diff, validação, logs; providers de IA substituíveis via contratos (providers implementam contratos, não os definem); Luna é integração desacoplada, nunca dependência do core.
- Componentes: identidade estável, distinção Project Component vs Global Component, promoção consciente, sem propagação automática de atualizações, reutilização antes de criar, sem duplicação/Frankenstein; assets rastreáveis (onde está, quem usa, quantas referências); nunca apagar referências silenciosamente.
- Governança de engenharia: documentação é fonte de verdade e parte do mecanismo de controle; agentes seguem contratos e a hierarquia de conflitos (Segurança > Core Invariants > Decisões arquiteturais > Contratos > Requisitos > Especificação > Preferências > Conveniência); pesquisa externa em fontes oficiais; versões importam; compatibilidade declarada; decisões estruturais justificadas; simplicidade preferida; nada de decisões silenciosas.
- Anti-escopo (Non-Goals): não é framework, não impõe stack, não substitui IDE/Git/hospedagem, não é chatbot, não exige banco de dados, não impõe design system, não cria estrutura proprietária no projeto, não promete compatibilidade perfeita, não cria prisão comercial.

**Lista completa das Core Invariants (numeração deste resumo; seções 2–52 do doc):**
1. O projeto real é a fonte primária da verdade (Project Model/caches/snapshots não substituem o Source Project).
2. Alterações persistidas devem atingir o projeto real (estados draft/unsaved/pending/applied/failed/reverted).
3. O Nexo não pode assumir um único stack (nenhuma camada central assume Next.js/React/etc. como universal).
4. Diferenças entre tecnologias devem ser preservadas (React Component ≠ Vue Component em todos os detalhes).
5. Adapters são a fronteira da especialização tecnológica (Core não acumula conhecimento de frameworks).
6. Desconhecimento não autoriza invenção (Detectar→Avaliar→Classificar confiança→Decidir segurança→Só então modificar).
7. Não alterar arquitetura por conveniência (migração de framework/styling/estrutura exige intenção explícita e documentação).
8. O Nexo deve respeitar a linguagem do projeto (Tailwind, CSS Modules, styled-components...; regras específicas nos adapters).
9. Não criar duplicação desnecessária (verificar reutilização antes de criar componente/estilo/asset/dependência/página).
10. O editor visual não possui autoridade sobre a arquitetura (possível visualmente ≠ válido tecnicamente).
11. Código e representação visual devem convergir (divergência Project State ≠ Editor State deve ser explícita).
12. Preview deve representar um estado identificável (Saved/Unsaved/Draft/Preview Build/Production).
13. Operações destrutivas devem ser controladas (apagar arquivos, produção, branches, reset, dependências, sobrescrever assets; IA sem passe livre).
14. Git não pode ser falsificado (commit/push apresentados devem existir e ter sido validados).
15. O Nexo deve preservar a capacidade de trabalhar fora dele (sem dependência de sessão/banco/serviço exclusivo do Nexo).
16. IA não pode ignorar o contexto do projeto (stack, adapter, estrutura, arquivo, componente, estilo, dependências, testes, convenções, Git, pedido).
17. IA deve respeitar o mesmo contrato do editor (sem rota especial; mesma arquitetura, segurança, Git, validação).
18. Provider de IA é substituível (A→B sem alterar a lógica principal; vale para Luna).
19. Provider não pode controlar o produto inteiro (providers implementam contratos; não os definem).
20. Componentes reutilizáveis devem possuir identidade (estável; base de versionamento, promoção, compatibilidade).
21. Componente global não deve contaminar projeto automaticamente (atualizações exigem estratégia explícita de versionamento).
22. Projeto deve poder possuir componentes próprios (Global + Project Components coexistem).
23. Assets devem ser rastreáveis (onde está, quem usa, quantas referências).
24. Nenhuma alteração deve apagar referências silenciosamente (impacto detectado ou explicitamente indicado).
25. O Nexo deve distinguir estado conhecido de estado inferido (Known/Detected/Inferred/Unknown/Unsupported).
26. Logs e auditoria não podem mentir (registram eventos reais, não desejados).
27. Falha parcial deve permanecer visível (3 alterados/2 falharam ≠ "Success").
28. Validação deve ocorrer após mudanças críticas (typecheck, lint, build, tests, preview, validação do adapter).
29. Build do projeto pertence ao projeto (adapter/descoberta identifica comando, ferramenta, ambiente, requisitos, saída).
30. Terminal e comandos devem respeitar o Runtime (comandos realmente enviados ao ambiente; sem simulação).
31. Ambiente do projeto deve ser explícito (Development/Preview/Staging/Production; sem execução silenciosa em ambiente errado).
32. Deploy deve ser verificável (Build→Deploy→Verification).
33. Plugins não podem quebrar arbitrariamente o Core (fronteiras claras; permissões e capacidades explícitas).
34. Documentação deve acompanhar a implementação (divergência doc↔implementação deve estar registrada).
35. Agentes devem respeitar a documentação existente (contrato→princípio→invariante→decisão→especificação→doc de adapter; ausência de resposta ≠ autorização).
36. Pesquisa externa deve ser baseada em fontes reais (documentação oficial; não presumir versões por conhecimento antigo; registrar fonte).
37. Versões importam (versão faz parte do contexto quando relevante: framework, Node, package managers, bibliotecas, APIs, providers).
38. Compatibilidade deve ser declarada (stack+versão+adapter+dependência+runtime; não apresentar como universal o que não é).
39. Desenvolvimento do Nexo não pode antecipar decisões não tomadas (respeitar status da decisão; Open Decision não é definitiva).
40. Decisões estruturais precisam de justificativa (requisitos, trade-offs, compatibilidade, manutenção, segurança, performance, extensibilidade).
41. Simplicidade é preferível quando capacidades forem equivalentes (menor complexidade/acoplamento/risco/manutenção).
42. Capacidade futura não é obrigação presente (preparar para SaaS/marketplace/novos adapters ≠ implementar).
43. O Core deve permanecer tecnologicamente neutro sempre que possível.
44. O Nexo não deve ser uma máquina de sobrescrever arquivos (find/replace/write insuficiente quando houver mecanismo estrutural mais seguro).
45. A implementação deve preferir mecanismos semânticos quando disponíveis (AST, parser, component model, route graph, dependency graph, asset graph).
46. Não adicionar capacidade ao projeto apenas para satisfazer o Nexo (ex.: injetar metadata sem decisão explícita de arquitetura).
47. O usuário mantém autoridade sobre o projeto (arquivos, Git, integrações, ambiente, deploy, IA, permissões).
48. O sistema deve ser observável (logs, eventos, histórico, diff, status, erros, validações; operação importante não desaparece sem vestígio).
49. Toda parte do sistema deve possuir uma responsabilidade clara (sem duplicação CMS/Engine/Runtime/Adapter; "uma responsabilidade deve possuir uma autoridade clara").
50. Contratos devem ser estáveis (adapters, providers, plugins, runtime, AI, components; mudanças incompatíveis não ocorrem silenciosamente).
51. O produto deve poder evoluir sem reescrever sua identidade (SaaS, marketplace, novos adapters/providers sob as mesmas invariantes).

**Regras operacionais anexas às invariantes:**
- Hierarquia de conflitos (8 níveis): Segurança e integridade do projeto > Core Invariants > Decisões arquiteturais aprovadas > Contratos > Requisitos do produto > Especificação da área > Preferências de implementação > Conveniência local.
- Checklist K3 Swarm antes de soluções estruturais (projeto real, adapter, portabilidade, Git, sem suporte inventado, arquitetura do projeto, rastreabilidade, segurança, substituibilidade de providers).
- Alterar uma Core Invariant exige motivo, impacto, justificativa, decisão registrada, atualização documental e análise de impacto.
