# NEXO CMS
## Human Manifest

## 1. O que é o Nexo CMS

O Nexo CMS é um produto da Nexo Digital criado para resolver um problema que encontramos constantemente ao trabalhar com sites e aplicações web de clientes:

cada projeto pode utilizar uma tecnologia diferente.

Um cliente pode possuir um site em Next.js. Outro pode utilizar React, Vue, Svelte, Astro ou simplesmente HTML, CSS e JavaScript. Cada projeto pode possuir uma arquitetura diferente, um sistema de estilos diferente, uma organização de componentes diferente e um processo de deploy diferente.

Nós não queremos que isso obrigue a equipe a aprender uma ferramenta diferente para cada projeto.

Também não queremos obrigar todos os projetos a serem reconstruídos utilizando uma única tecnologia.

O Nexo CMS nasce para funcionar como uma camada universal entre a equipe e os projetos.

A ideia central é:

> **O Nexo entende o projeto que já existe, respeita sua tecnologia e permite que a equipe trabalhe sobre ele sem precisar abandonar sua arquitetura.**

---

# 2. Por que estamos criando isso

Hoje, manter sites pode envolver muitas ferramentas diferentes.

É necessário abrir o projeto em uma IDE, procurar arquivos, entender a estrutura, descobrir onde determinado elemento está, encontrar imagens, editar CSS, executar comandos, trabalhar com Git, corrigir problemas de responsividade, testar o build e depois publicar o resultado.

Quando temos vários clientes, isso se torna repetitivo e consome muito tempo.

Também existe outro problema:

um CMS tradicional normalmente possui uma tecnologia própria.

Um construtor visual normalmente quer controlar a estrutura inteira do site.

Uma IDE oferece liberdade técnica, mas não foi criada para facilitar a manutenção visual e administrativa de todos os tipos de site.

O Nexo CMS deve unir essas experiências.

Queremos uma ferramenta na qual seja possível:

- abrir um projeto;
- entendê-lo;
- visualizá-lo;
- editar seu conteúdo;
- editar seu código;
- criar componentes;
- reutilizar componentes;
- trocar imagens;
- modificar estilos;
- testar responsividade;
- trabalhar com Git;
- utilizar inteligência artificial;
- executar comandos;
- criar páginas;
- adicionar integrações;
- fazer build;
- publicar;
- e voltar atrás quando necessário.

Tudo dentro de um único ambiente.

---

# 3. O princípio mais importante

## O Nexo se adapta ao projeto. O projeto não se adapta ao Nexo.

Este é o princípio fundamental do produto.

O Nexo CMS não deve destruir a arquitetura existente de um projeto apenas para torná-lo mais fácil para o próprio Nexo.

Se o projeto utiliza Tailwind, o Nexo deve respeitar Tailwind.

Se utiliza CSS Modules, o Nexo deve respeitar CSS Modules.

Se utiliza styled-components, o Nexo deve respeitar styled-components.

Se utiliza CSS variables, o Nexo deve trabalhar com CSS variables.

Se utiliza uma arquitetura personalizada, o Nexo deve tentar entendê-la.

O projeto não precisa aprender a linguagem do Nexo.

O Nexo precisa aprender a linguagem do projeto.

---

# 4. O Nexo não é apenas um CMS

Apesar do nome Nexo CMS, o produto não deve ser pensado como uma simples ferramenta para editar textos e imagens.

Ele será um ambiente completo de trabalho para projetos web.

O Nexo deverá reunir:

- CMS;
- editor visual;
- editor de código;
- Project Intelligence;
- Component Library;
- Component Studio;
- Media Library;
- Design System Editor;
- Responsive Lab;
- Git;
- terminal;
- execução de processos;
- build;
- preview;
- inteligência artificial;
- integrações;
- plugins;
- deploy.

Por isso, o Nexo deve ser pensado mais como uma **plataforma de engenharia e gerenciamento de projetos web** do que como um CMS tradicional.

---

# 5. O projeto é a fonte da verdade

O Nexo não deve criar uma cópia fictícia do site e fingir que aquela cópia é o projeto real.

Quando o Nexo estiver administrando um projeto, o projeto real continuará sendo a fonte da verdade.

O Nexo deve ser capaz de analisar o projeto, compreender sua estrutura e modificar os arquivos reais.

Quando alguém editar uma imagem de um carrossel, o projeto deve realmente receber a alteração.

Quando alguém alterar um texto, o código ou fonte de dados correspondente deve realmente ser atualizado.

Quando alguém criar um componente, ele deverá realmente existir no projeto.

Quando alguém fizer uma alteração de código, essa alteração deverá aparecer no Git.

O Nexo não deve esconder a realidade do projeto.

---

# 6. Universalidade

O Nexo deve nascer preparado para trabalhar com diferentes stacks modernos.

Entre os exemplos que queremos suportar estão:

- Next.js;
- React;
- Vue;
- Nuxt;
- Svelte;
- SvelteKit;
- Astro;
- Vite;
- HTML;
- CSS;
- JavaScript;
- TypeScript;
- Tailwind;
- CSS Modules;
- styled-components;
- outras tecnologias futuras.

Esses exemplos não representam uma lista fechada.

O produto deverá possuir uma arquitetura extensível que permita adicionar novas tecnologias sem reconstruir o núcleo do Nexo.

---

# 7. Adapters

Para conseguir trabalhar com diferentes tecnologias, o Nexo deverá utilizar adapters.

Um adapter será responsável por ensinar o Nexo a trabalhar com uma determinada tecnologia.

O adapter poderá entender coisas como:

- estrutura do projeto;
- arquivos;
- componentes;
- rotas;
- estilos;
- build;
- dependências;
- comandos;
- convenções da tecnologia.

O núcleo do Nexo não deverá assumir que todos os projetos são iguais.

O adapter será a camada que traduz entre:

> a forma como o projeto funciona

e

> a forma como o Nexo precisa entendê-lo.

---

# 8. Project Intelligence

Quando uma pasta de projeto for aberta no Nexo, ele deverá primeiro tentar compreender o que existe nela.

O Nexo deverá analisar, quando possível:

- stack;
- framework;
- linguagem;
- package manager;
- dependências;
- rotas;
- páginas;
- layouts;
- componentes;
- estilos;
- assets;
- scripts;
- configurações;
- Git;
- comandos de desenvolvimento;
- comandos de build.

Depois dessa análise, o Nexo deverá construir uma representação própria daquele projeto.

Essa representação será utilizada pelas diferentes partes do sistema.

A intenção é que a equipe não precise começar do zero toda vez que abrir um novo cliente.

---

# 9. Editor visual + código

O Nexo não deverá obrigar o usuário a escolher entre um editor visual e um editor de código.

Os dois devem existir juntos.

Um usuário poderá selecionar visualmente um elemento e editar suas propriedades.

Um usuário técnico poderá abrir diretamente o código responsável por aquele elemento.

O sistema deverá conseguir relacionar o elemento visual com sua origem no projeto.

Dessa maneira, o Nexo poderá servir tanto para tarefas simples de conteúdo quanto para tarefas técnicas avançadas.

---

# 10. Componentes são um dos principais pilares do produto

Um dos maiores diferenciais do Nexo deverá ser sua biblioteca de componentes.

Queremos poder criar componentes dentro do Nexo e reutilizá-los em diferentes projetos.

Por exemplo:

- Hero;
- Navbar;
- Footer;
- Carousel;
- Gallery;
- FAQ;
- Testimonials;
- Contact Form;
- WhatsApp;
- Google Maps;
- CTA;
- cards;
- banners;
- grids;
- widgets;
- componentes personalizados.

Um componente criado para um projeto poderá, quando apropriado, ser promovido para a biblioteca global da Nexo Digital.

Isso permitirá construir um patrimônio tecnológico próprio.

---

# 11. Componentes devem ser editáveis

Os componentes não devem ser pedaços de código sem contexto.

O Nexo precisa compreender as propriedades importantes de um componente.

Um carrossel, por exemplo, poderá possuir:

- imagens;
- ordem dos slides;
- autoplay;
- velocidade;
- animação;
- loop;
- navegação;
- paginação;
- quantidade de itens no desktop;
- quantidade de itens no tablet;
- quantidade de itens no mobile;
- espaçamento;
- links.

O usuário deverá conseguir editar essas propriedades através da interface.

Quando salvar, o projeto real deverá ser atualizado.

---

# 12. Componentes externos

O Nexo também deverá permitir adicionar recursos que não faziam parte originalmente do projeto.

Poderemos inserir:

- HTML;
- CSS;
- JavaScript;
- iframe;
- scripts externos;
- widgets;
- embeds;
- chats;
- WhatsApp;
- mapas;
- calendários;
- formulários externos;
- ferramentas de terceiros;
- snippets personalizados.

Esses recursos também poderão ser armazenados e reutilizados.

---

# 13. Media Library

O Nexo deverá possuir uma biblioteca de mídia universal.

Ela deverá permitir administrar:

- imagens;
- SVG;
- GIF;
- vídeos;
- WebP;
- AVIF;
- PDFs;
- fontes;
- outros tipos de assets.

O usuário deverá conseguir encontrar, editar, substituir e organizar esses arquivos.

O Nexo também deverá saber onde um asset está sendo utilizado.

Isso é importante para evitar apagar ou alterar um arquivo sem perceber as consequências.

---

# 14. Design System

O Nexo deverá conseguir trabalhar com o sistema visual de cada projeto.

Entre as propriedades que queremos poder editar estão:

- cores;
- gradientes;
- tipografia;
- espaçamento;
- bordas;
- radius;
- sombras;
- containers;
- breakpoints;
- variáveis;
- temas;
- tokens.

O sistema deverá respeitar a forma como o projeto implementa essas propriedades.

O objetivo não é impor um design system do Nexo a todos os sites.

O objetivo é permitir que o Nexo compreenda e edite o sistema visual existente.

---

# 15. Responsividade

Responsividade deverá ser tratada como uma parte própria do produto.

O Nexo deverá possuir um Responsive Lab que permita testar o projeto em diferentes dimensões.

Não queremos ficar limitados a três botões:

> Desktop  
> Tablet  
> Mobile

Queremos poder analisar tamanhos personalizados e situações problemáticas.

O Nexo deverá ajudar a encontrar:

- overflow;
- textos quebrados;
- botões quebrados;
- grids que não cabem;
- imagens deformadas;
- menus que estouram;
- elementos fora da viewport;
- problemas específicos de dispositivos.

Também deverá existir a possibilidade de testar cenários extremos propositalmente.

Queremos encontrar o bug antes do cliente.

---

# 16. Git é obrigatório

Git fará parte da estrutura do Nexo desde o início.

O projeto deverá possuir controle de versão adequado.

O Nexo deverá permitir trabalhar com:

- repositories;
- branches;
- remotes;
- commits;
- push;
- pull;
- fetch;
- merge;
- rebase;
- stash;
- revert;
- reset;
- cherry-pick;
- histórico;
- diff.

O usuário também deverá conseguir criar e conectar repositories quando necessário.

A ideia é tornar operações comuns de Git acessíveis pela interface, sem retirar o acesso ao terminal para quem precisa de controle completo.

---

# 17. Terminal e ferramentas do sistema

O Nexo precisará ter acesso às ferramentas necessárias do ambiente onde está executando.

Isso inclui, conforme as permissões e o ambiente:

- terminal;
- comandos;
- Node;
- package managers;
- Git;
- ferramentas de build;
- servidores de desenvolvimento;
- processos.

A interface será web, mas o Runtime do Nexo será responsável por permitir que o sistema opere o projeto real.

---

# 18. Inteligência artificial

O Nexo deverá possuir seu próprio sistema de inteligência artificial.

Essa camada será chamada:

## Nexo AI Engineer

A IA poderá ajudar a:

- entender um projeto;
- explicar código;
- criar componentes;
- editar componentes;
- corrigir problemas;
- melhorar responsividade;
- criar páginas;
- alterar estilos;
- trabalhar com conteúdo;
- executar tarefas técnicas;
- analisar erros;
- corrigir builds;
- sugerir melhorias.

A IA nunca deverá ser tratada como uma simples caixa preta que recebe um prompt e altera qualquer coisa.

Ela deve trabalhar com contexto, planejamento, diff e validação.

---

# 19. Automático e manual

O Nexo AI Engineer deverá possuir pelo menos dois modos:

### Modo automático

A IA pode realizar o fluxo completo da tarefa de acordo com as permissões concedidas.

### Modo manual

A IA analisa e propõe alterações, mas o usuário precisa aprovar as etapas importantes.

Em ambos os modos, alterações relevantes deverão poder ser revisadas antes de serem aplicadas.

---

# 20. IA não substitui controle humano

Uma IA trabalhando dentro de um projeto possui acesso potencialmente poderoso.

Por isso, o Nexo deverá trabalhar com:

- permissões;
- contexto limitado quando necessário;
- diff;
- validação;
- logs;
- histórico;
- Git;
- confirmação de operações perigosas.

A IA deve ajudar a equipe.

Ela não deve remover o controle da equipe.

---

# 21. Providers de IA

O Nexo não deverá ficar preso a uma única inteligência artificial.

A plataforma deverá possuir uma camada de providers.

Futuramente, poderemos conectar:

- Kimi;
- Luna;
- OpenAI;
- Anthropic;
- Gemini;
- modelos locais;
- APIs personalizadas;
- outros sistemas.

A plataforma deverá tratar essas integrações através de contratos próprios.

---

# 22. Luna

A Luna é um sistema independente da Nexo Digital e deverá continuar independente.

O Nexo deverá possuir uma integração oficial capaz de permitir que a Luna seja utilizada como provider e agente dentro do Nexo.

O Nexo não deverá precisar reescrever a Luna para isso.

Deverá existir uma ponte entre os dois sistemas.

---

# 23. Pages e Content

O Nexo deverá permitir administrar conteúdo existente e, quando apropriado, criar novas páginas.

Isso poderá incluir:

- páginas;
- rotas;
- títulos;
- textos;
- imagens;
- links;
- SEO;
- metadados;
- conteúdo estruturado;
- blog.

A criação de novas páginas deverá respeitar a arquitetura e os padrões do projeto.

---

# 24. Plugins e extensibilidade

O Nexo deverá ser extensível.

Novas capacidades deverão poder ser adicionadas através de plugins ou módulos apropriados.

Entre os possíveis tipos estão:

- adapters;
- providers de IA;
- integrações;
- componentes;
- ferramentas;
- serviços de deploy.

Queremos que o núcleo do Nexo seja estável enquanto o ecossistema ao redor dele continua crescendo.

---

# 25. Deploy

O Nexo deverá possuir mecanismos próprios para publicação.

A plataforma deverá ser preparada para trabalhar com diferentes destinos.

Entre os exemplos estão:

- Vercel;
- Hostinger;
- SSH;
- SFTP;
- FTP;
- GitHub;
- GitLab;
- Docker;
- destinos personalizados.

O Nexo deverá tratar deploy como um processo com validação, e não apenas como uma ação cega.

---

# 26. O Nexo deve ser portátil

O projeto do cliente nunca deve ficar preso ao Nexo.

Um projeto administrado pelo Nexo deverá continuar sendo um projeto comum.

Deverá ser possível:

- abrir;
- editar;
- fazer Git;
- exportar;
- mover;
- publicar;
- continuar trabalhando fora do Nexo.

O Nexo deve acrescentar capacidade ao projeto, não criar uma prisão tecnológica.

---

# 27. Futuro comercial

O Nexo CMS será inicialmente utilizado internamente pela Nexo Digital.

Porém, desde o início, a arquitetura deverá considerar que o produto poderá futuramente ser comercializado.

Poderão existir:

- contas;
- equipes;
- workspaces;
- projetos;
- permissões;
- planos;
- limites;
- billing;
- marketplace;
- biblioteca de componentes;
- plugins;
- serviços de IA.

A marca Nexo pertence à Nexo Digital.

O produto, entretanto, deverá ser suficientemente universal para ser utilizado por outras pessoas e organizações.

---

# 28. O que o Nexo não deve se tornar

O Nexo não deve se transformar em:

- um WordPress com outra aparência;
- um Elementor com outro nome;
- um editor de HTML limitado;
- um gerador de código que destrói projetos existentes;
- uma ferramenta presa a um único framework;
- uma ferramenta presa a uma única IA;
- um construtor visual que gera Frankenstein;
- uma plataforma que esconde o código;
- um sistema que simula alterações sem alterar o projeto real.

---

# 29. A visão

Queremos poder pegar um projeto web e abrir o Nexo.

Queremos que o Nexo consiga olhar para aquele projeto e compreender sua estrutura.

Depois queremos conseguir trabalhar nele através de uma única interface.

Queremos editar.

Queremos criar.

Queremos reutilizar.

Queremos corrigir.

Queremos testar.

Queremos versionar.

Queremos automatizar.

Queremos publicar.

E queremos fazer tudo isso sem precisar abandonar a tecnologia que já foi escolhida para aquele projeto.

Essa é a visão do Nexo CMS.

---

# 30. A ideia em uma frase

> **Nexo CMS é um ambiente universal de engenharia e gerenciamento de projetos web que entende a tecnologia existente, respeita sua arquitetura e permite editar, criar, versionar, automatizar, testar e publicar projetos através de uma única interface.**