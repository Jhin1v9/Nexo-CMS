# NEXO CMS
## Manifesto Humano do Projeto

### A ideia

O Nexo CMS nasceu de uma necessidade muito simples da Nexo Digital: nós trabalhamos com sites diferentes, criados em tecnologias diferentes, e não queremos ficar presos à tecnologia que foi usada para construir cada projeto.

Um cliente pode chegar com um site em Next.js. Outro pode ter um projeto em React, Vue, Svelte, Astro ou simplesmente HTML, CSS e JavaScript. Amanhã pode aparecer outro projeto utilizando uma tecnologia que nem existia quando começamos a construir o Nexo.

Nós não queremos criar uma ferramenta que obrigue todos os sites a serem reconstruídos dentro de uma tecnologia específica.

Queremos construir uma ferramenta que **entre no projeto que já existe, entenda como ele funciona, respeite a tecnologia que ele utiliza e permita que a equipe edite, evolua, mantenha e publique esse projeto com muito mais facilidade.**

Esse produto será chamado de **Nexo CMS**.

Mas o Nexo CMS não será apenas um CMS.

Ele será uma plataforma própria da Nexo Digital para trabalhar com projetos web.

---

# O que queremos construir

Queremos criar uma espécie de ambiente de trabalho completo para desenvolvimento e manutenção de sites.

Algo que una em um único lugar:

- CMS;
- editor visual;
- editor de código;
- biblioteca de componentes;
- biblioteca de mídia;
- sistema de Git;
- preview;
- laboratório de responsividade;
- integrações externas;
- inteligência artificial;
- automações;
- publicação;
- deploy;
- gerenciamento de projetos.

A inspiração inicial vem de ferramentas como WordPress, Joomla, Webflow, Elementor, Figma e IDEs modernas.

Mas o Nexo não deve simplesmente copiar nenhuma delas.

A ideia é pegar as melhores partes dessas ferramentas e criar algo próprio, moderno e adaptado ao modo como a Nexo Digital realmente trabalha.

---

# O problema que queremos resolver

Hoje, administrar sites de clientes pode significar entrar em diferentes projetos, abrir diferentes IDEs, descobrir frameworks diferentes, localizar arquivos diferentes, entender sistemas de CSS diferentes, procurar onde determinada imagem está sendo usada, editar código manualmente, configurar Git, executar comandos, gerar builds, corrigir problemas de responsividade e depois publicar tudo novamente.

Cada projeto possui uma realidade diferente.

Isso gera tempo perdido.

Também aumenta a possibilidade de erros.

O Nexo CMS deve transformar essa experiência.

Queremos abrir um projeto e fazer o Nexo dizer, essencialmente:

> “Entendi o projeto. Sei qual tecnologia ele usa. Sei onde estão as páginas, componentes, estilos, imagens e configurações. Agora você pode trabalhar nele.”

---

# O princípio mais importante

## O Nexo se adapta ao projeto. O projeto não se adapta ao Nexo.

Essa é uma regra fundamental.

O Nexo CMS nunca deve tentar transformar automaticamente um projeto em outra arquitetura apenas porque essa arquitetura é mais conveniente para ele.

Se o projeto utiliza Tailwind, o Nexo deve respeitar Tailwind.

Se utiliza CSS Modules, o Nexo deve respeitar CSS Modules.

Se utiliza styled-components, o Nexo deve respeitar styled-components.

Se utiliza CSS variables, o Nexo deve trabalhar com CSS variables.

Se utiliza uma arquitetura própria, o Nexo deve aprender a trabalhar com ela.

O objetivo não é obrigar o projeto a falar a linguagem do Nexo.

O objetivo é fazer o Nexo entender a linguagem do projeto.

---

# O Nexo Project Model

Para conseguir isso, o Nexo precisará de uma camada interna própria de compreensão de projetos.

Quando um projeto for aberto, o Nexo deverá analisá-lo.

Ele deverá procurar e identificar, entre outras coisas:

- framework;
- linguagem;
- sistema de build;
- package manager;
- dependências;
- rotas;
- páginas;
- layouts;
- componentes;
- estilos;
- assets;
- imagens;
- fontes;
- scripts;
- integrações;
- configurações;
- sistema de autenticação, quando existir;
- banco de dados, quando identificável;
- Git;
- branch;
- remote;
- ferramentas de desenvolvimento;
- comandos de build;
- comandos de desenvolvimento.

Depois dessa análise, o projeto será representado internamente pelo Nexo através de um modelo próprio.

Esse modelo será o que o editor, a IA e as ferramentas do Nexo utilizarão.

Assim, o restante da plataforma não precisa conhecer profundamente cada framework.

Quem precisa conhecer a tecnologia específica é o **Adapter** daquela tecnologia.

---

# Sistema de Adapters

O Nexo terá uma arquitetura baseada em adapters.

Cada adapter será responsável por entender uma tecnologia ou uma família de tecnologias.

Exemplos de adapters planejados:

- Next.js;
- React;
- Vue;
- Nuxt;
- Svelte;
- SvelteKit;
- Astro;
- Vite;
- HTML/CSS/JavaScript;
- Tailwind;
- CSS Modules;
- Styled Components;
- outras tecnologias que forem adicionadas no futuro.

Também deverá existir a possibilidade de criar adapters personalizados.

Isso é importante porque o Nexo não deve ser limitado pelas tecnologias que conhecemos hoje.

No futuro, uma pessoa deve poder criar um novo adapter e ensinar o Nexo a trabalhar com outra tecnologia sem precisar reconstruir todo o produto.

---

# O projeto começa pela pasta

Um dos comportamentos centrais do Nexo será abrir um projeto através de uma pasta.

O usuário poderá selecionar uma pasta do computador ou do ambiente onde o Nexo estiver sendo executado.

O Nexo irá analisar aquela pasta.

Depois poderá:

- detectar automaticamente o stack;
- mostrar o que detectou;
- pedir confirmação;
- permitir escolher manualmente;
- permitir definir uma tecnologia personalizada.

Por exemplo:

> Stack detectado: Next.js + TypeScript + Tailwind.

O usuário poderá confirmar.

Ou poderá dizer:

> Não. Esse projeto utiliza uma configuração personalizada.

O Nexo deverá aceitar isso.

---

# O Nexo será executado como uma aplicação web local

Nós não queremos depender de um aplicativo desktop tradicional instalado no computador.

A interface do Nexo será web.

O usuário abrirá o Nexo através de um endereço local, por exemplo:

`http://localhost:...`

O Nexo Runtime será responsável por fornecer à interface acesso real às capacidades necessárias:

- filesystem;
- terminal;
- Git;
- processos;
- build;
- preview;
- ferramentas;
- inteligência artificial;
- deploy.

O mesmo conceito poderá ser utilizado quando o Nexo estiver rodando em um servidor.

Não precisamos criar dois produtos diferentes.

O Nexo possui um **Runtime**.

Esse Runtime roda na máquina ou ambiente onde o projeto está.

---

# Git faz parte do Nexo

Git será obrigatório.

O Nexo não deve tratar versionamento como uma função opcional escondida em algum menu.

Git será parte da experiência principal.

Ao abrir um projeto, o Nexo deverá verificar:

- se Git está instalado;
- se existe um repositório;
- qual é a branch atual;
- quais são os remotes;
- se existem alterações pendentes;
- se existem commits recentes;
- se o projeto está sincronizado.

O usuário poderá realizar operações Git diretamente do Nexo.

Entre elas:

- criar repositório;
- conectar GitHub;
- criar repositório remoto;
- selecionar repository;
- selecionar branch;
- criar branch;
- mudar branch;
- pull;
- push;
- fetch;
- commit;
- commit + push;
- merge;
- rebase;
- stash;
- revert;
- reset;
- cherry-pick;
- visualizar histórico;
- visualizar diff.

Operações perigosas deverão ter proteção e confirmação adequadas.

---

# O Nexo CMS terá edição visual e edição de código

Não queremos escolher entre um construtor visual e uma IDE.

Queremos os dois.

O usuário poderá selecionar um elemento visualmente e editá-lo.

Também poderá abrir o código responsável por aquele elemento.

O Nexo deverá conseguir relacionar as duas coisas.

Por exemplo:

Uma pessoa seleciona um H1 no preview.

O Nexo sabe que aquele H1 pertence à Home, dentro do Hero, e consegue localizar o arquivo ou componente responsável.

O usuário poderá então editar:

- texto;
- estilo;
- tamanho;
- espaçamento;
- cor;
- comportamento responsivo;
- conteúdo;
- atributos;
- código.

E poderá também abrir diretamente o arquivo de origem.

---

# A IA poderá editar o projeto

O Nexo terá um sistema chamado:

## Nexo AI Engineer

A IA poderá receber instruções como:

> “Melhore o layout mobile.”

> “O botão está quebrando em telas pequenas.”

> “Adicione um CTA de WhatsApp no hero.”

> “Crie uma nova página de contato usando os componentes existentes.”

> “Corrija esse erro de build.”

> “Faça o título caber sem quebrar o design.”

A IA deverá analisar o projeto antes de alterar qualquer coisa.

Ela não deverá simplesmente escrever código aleatório.

O processo ideal será:

1. entender o pedido;
2. analisar o projeto;
3. identificar os arquivos relevantes;
4. planejar a alteração;
5. gerar um patch;
6. mostrar o diff;
7. validar;
8. construir o projeto;
9. gerar preview;
10. aguardar aprovação;
11. aplicar a alteração;
12. testar novamente.

O usuário deverá poder escolher entre:

**Modo Automático**

A IA analisa, planeja e executa as mudanças dentro das regras definidas pelo usuário.

**Modo Manual**

A IA propõe as alterações, mas o usuário decide cada etapa antes da execução.

---

# A IA não estará presa a um único provedor

O Nexo deverá possuir uma camada própria de AI Provider.

Isso permitirá trabalhar com diferentes sistemas de inteligência artificial.

Poderão existir providers para:

- APIs externas;
- Kimi;
- Luna;
- outros provedores futuros;
- modelos locais;
- endpoints personalizados.

A Luna deverá poder ser conectada ao Nexo sem que o restante do sistema precise depender dela.

A ideia é que o Nexo conheça um contrato de inteligência artificial, e não uma IA específica.

---

# Luna dentro do Nexo

A Luna já possui uma arquitetura própria de agente e automação.

O Nexo deverá deixar espaço para que ela seja conectada como um provider oficial.

A intenção é que futuramente seja possível dizer:

> “Use Luna para executar essa tarefa.”

ou:

> “Use Kimi.”

ou:

> “Use outro provider.”

Sem precisar modificar o núcleo do CMS.

Assim, o Nexo se torna independente de fornecedor.

---

# A Biblioteca de Componentes será um dos principais diferenciais

Essa será uma das maiores funções do produto.

O Nexo deverá permitir criar componentes e salvar esses componentes em uma biblioteca reutilizável.

Exemplos:

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
- Pricing;
- CTA;
- cards;
- grids;
- banners;
- galerias;
- componentes próprios da Nexo.

Um componente poderá ser criado dentro do próprio Nexo.

Depois poderá ser salvo na:

## Nexo Component Library

A biblioteca poderá ser utilizada novamente em outros projetos.

Assim, a Nexo Digital poderá construir uma biblioteca própria de componentes profissionais.

---

# Componentes poderão possuir inteligência própria

Um componente não deve ser apenas um pedaço de HTML.

O Nexo deverá saber quais propriedades esse componente possui.

Por exemplo, um Carousel poderá possuir:

- quantidade de slides;
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
- imagens;
- textos;
- links.

Assim o editor poderá criar automaticamente os controles adequados.

O usuário não precisa abrir código toda vez que quiser alterar uma propriedade.

---

# Carrosséis serão editáveis de verdade

O Nexo deverá permitir adicionar um componente Carousel a partir da biblioteca.

Depois será possível editar as propriedades desse Carousel.

Também deverá ser possível editar as imagens utilizadas por ele.

Isso significa:

- trocar imagem;
- adicionar imagem;
- remover imagem;
- alterar ordem;
- editar texto;
- editar links;
- editar tempo;
- alterar velocidade;
- alterar animação;
- alterar número de elementos;
- ajustar responsividade.

Quando o usuário clicar em salvar, as alterações deverão ser realmente persistidas no projeto.

Não queremos um editor que apenas “lembra” a alteração dentro do próprio CMS.

O projeto real deverá ser atualizado.

---

# Componentes externos

O Nexo também permitirá adicionar coisas que não fazem parte originalmente do projeto.

O usuário poderá inserir elementos externos, como:

- HTML;
- CSS;
- JavaScript;
- iframe;
- widgets;
- scripts externos;
- embeds;
- códigos de terceiros;
- chat;
- WhatsApp;
- mapas;
- calendários;
- formulários externos;
- integrações;
- snippets personalizados.

Esses elementos poderão ser salvos e reutilizados.

Isso permitirá ao usuário criar uma biblioteca própria de integrações.

---

# Media Library

O Nexo terá uma biblioteca universal de mídia.

Ela deverá permitir trabalhar com:

- imagens;
- SVG;
- GIF;
- vídeos;
- WebP;
- AVIF;
- PDFs;
- fontes;
- outros arquivos relevantes.

O usuário deverá poder:

- visualizar;
- trocar;
- substituir;
- editar metadados;
- definir alt;
- alterar dimensões;
- redimensionar;
- converter;
- organizar;
- pesquisar.

O Nexo deverá também saber onde determinado asset está sendo utilizado.

Por exemplo:

> `hero.webp` está sendo usado em 4 lugares.

Antes de excluir um asset utilizado, o sistema deverá alertar o usuário.

---

# Design System Editor

O Nexo deverá possuir ferramentas para modificar o sistema visual do projeto sem destruí-lo.

O usuário poderá trabalhar com:

- cores;
- gradientes;
- tipografia;
- espaçamento;
- border radius;
- sombras;
- bordas;
- containers;
- breakpoints;
- variáveis;
- tokens.

As cores poderão ser sólidas ou gradientes.

Gradientes poderão possuir:

- tipo;
- direção;
- ângulo;
- stops;
- opacidade.

O sistema deverá respeitar a maneira como aquele projeto implementa seus estilos.

---

# Responsividade

O Nexo não deve considerar apenas “desktop / tablet / mobile”.

Deverá possuir um laboratório de responsividade.

O usuário poderá testar diferentes larguras e alturas.

Também deverá ser possível configurar visualizações personalizadas.

A intenção é conseguir encontrar problemas como:

- texto quebrando;
- botão quebrando;
- overflow;
- containers ultrapassando a viewport;
- imagens deformadas;
- grids quebrando;
- elementos desaparecendo;
- menus estourando;
- títulos grandes demais.

O Nexo deverá possuir ferramentas para ajudar a identificar e corrigir esses problemas.

---

# Responsive Lab

A ideia é transformar essa parte em uma ferramenta própria.

O usuário poderá simular diferentes dimensões de tela.

Também poderá testar casos extremos propositalmente.

Por exemplo:

- títulos muito grandes;
- textos longos;
- nomes grandes;
- botões extensos;
- imagens diferentes;
- viewport muito pequena;
- viewport muito larga.

O objetivo é encontrar bugs antes do cliente encontrar.

---

# Criar páginas novas

O Nexo não deverá apenas editar páginas existentes.

Ele também deverá permitir criar novas páginas.

Por exemplo:

> Criar página “Reformas de Cocinas”.

O usuário poderá escolher a estrutura existente, reutilizar componentes e criar a nova rota de acordo com a arquitetura do projeto.

A criação deverá respeitar o framework e a organização do projeto.

---

# O Nexo não criará estruturas desnecessárias

Existe uma regra importante herdada das necessidades da Nexo Digital:

O CMS não deve inventar elementos sem necessidade.

Se um projeto possui:

- um Hero;
- três carrosséis;
- um formulário;
- um CTA;

o CMS pode editar esses elementos.

Mas não deve simplesmente decidir:

> “Vou criar cinco novos carrosséis aqui porque posso.”

A criação de novas estruturas deverá ser uma ação consciente do usuário ou da IA com aprovação.

---

# Nexo Project Cloning

Um projeto poderá ser:

- importado;
- clonado;
- duplicado;
- sincronizado;
- exportado.

Também queremos poder criar um novo projeto a partir de outro.

Por exemplo:

> Projeto base Nexo → novo site de cliente.

Isso permitirá construir rapidamente sites a partir de uma infraestrutura já existente.

---

# Deploy

O Nexo deverá possuir uma camada própria de Deploy.

No futuro poderão existir vários destinos, como:

- Vercel;
- Hostinger;
- FTP;
- SFTP;
- SSH;
- GitHub;
- GitLab;
- Docker;
- ambientes personalizados.

O deploy deverá seguir um fluxo seguro:

> Build → Validation → Preview → Deploy → Verification

Não queremos que publicar uma alteração seja simplesmente apertar um botão e torcer.

---

# O Nexo CMS será universal

O objetivo de longo prazo não é construir uma ferramenta exclusiva da Nexo Digital para nossos próprios projetos.

Inicialmente, o Nexo será utilizado internamente.

Mas a arquitetura deve nascer preparada para ser transformada em produto.

No futuro, o Nexo CMS poderá ser vendido como SaaS.

Poderão existir planos diferentes.

O nome continuará pertencendo à Nexo Digital, mas o produto deverá ser suficientemente universal para outras equipes, freelancers, agências e desenvolvedores utilizarem.

---

# Sistema de usuários e equipes

O produto deverá estar preparado para trabalhar com múltiplos usuários.

No futuro poderemos ter papéis como:

- Owner;
- Admin;
- Developer;
- Designer;
- Editor;
- Viewer.

Também deverá existir a possibilidade de organizar projetos por workspace.

Uma organização poderá ter:

- vários usuários;
- vários projetos;
- componentes globais;
- componentes privados;
- configurações;
- permissões.

---

# Biblioteca global e biblioteca do projeto

O sistema deverá distinguir entre:

## Nexo Global Library

Componentes e recursos disponíveis para diversos projetos.

## Project Library

Componentes específicos de um determinado projeto.

Também queremos permitir que um componente criado dentro de um projeto seja promovido para a biblioteca global.

Assim, um componente pode nascer como solução de um cliente e depois virar parte do patrimônio tecnológico da Nexo.

---

# Plugins e extensibilidade

O Nexo deverá nascer preparado para extensões.

No futuro deverá ser possível adicionar:

- novos adapters;
- novas integrações;
- novos providers de IA;
- novos serviços de deploy;
- novos componentes;
- novas ferramentas;
- novos sistemas de autenticação;
- novas fontes de dados.

O núcleo do Nexo não deve precisar ser reescrito sempre que uma nova tecnologia surgir.

---

# Filosofia do produto

O Nexo CMS deverá ser:

**Universal**  
Porque não deve depender de um único stack.

**Modular**  
Porque novas capacidades devem poder ser adicionadas.

**Extensível**  
Porque queremos adapters, plugins e providers.

**Visual**  
Porque editar um site deve ser intuitivo.

**Técnico**  
Porque profissionais precisam ter acesso ao código real.

**Seguro**  
Porque alterações destrutivas precisam de proteção e versionamento.

**Reversível**  
Porque Git, histórico e snapshots devem permitir voltar atrás.

**Inteligente**  
Porque a IA deve ajudar a compreender, editar, testar e evoluir projetos.

**Portátil**  
Porque o projeto não pode ficar preso ao Nexo.

**Independente**  
Porque o Nexo não deve depender de uma única IA, framework ou fornecedor.

---

# O que o Nexo CMS não deve se tornar

O Nexo não deve virar:

- um WordPress com outra aparência;
- um Elementor com outro nome;
- um editor de HTML limitado;
- um gerador de código que destrói a arquitetura existente;
- um sistema que obriga todos os projetos a usar a mesma tecnologia;
- um CMS que guarda uma cópia fictícia do projeto sem modificar o código real;
- um sistema completamente dependente de uma única IA;
- um construtor que cria Frankenstein visual;
- uma ferramenta que esconde o código de quem precisa trabalhar tecnicamente.

---

# A visão final

A visão do Nexo CMS é simples:

Queremos abrir qualquer projeto web, independentemente de como ele foi criado, e transformar a manutenção daquele projeto em uma experiência organizada, visual, técnica e inteligente.

Queremos poder:

> abrir o projeto;

> entender o projeto;

> visualizar o projeto;

> editar o conteúdo;

> editar o código;

> editar componentes;

> criar componentes;

> salvar componentes;

> reutilizar componentes;

> trocar imagens;

> organizar mídia;

> alterar cores;

> alterar layouts;

> corrigir responsividade;

> adicionar integrações;

> usar Git;

> chamar uma IA;

> revisar alterações;

> testar;

> criar páginas;

> fazer commit;

> fazer push;

> publicar;

> voltar atrás;

> e continuar trabalhando.

Tudo dentro de um único ambiente.

O Nexo CMS não pretende substituir a tecnologia utilizada pelos projetos.

Ele pretende ser a camada que permite **trabalhar sobre qualquer tecnologia moderna sem ficar refém dela.**

---

# A ideia em uma frase

**Nexo CMS é um ambiente universal de engenharia e gerenciamento de projetos web que entende a tecnologia existente, respeita sua arquitetura e permite editar, criar, versionar, automatizar, testar e publicar projetos através de uma única interface.**

---

# O primeiro objetivo

O primeiro Nexo CMS será construído para uso interno da Nexo Digital.

A prioridade será criar uma ferramenta realmente útil para nossos próprios projetos e clientes.

Depois que a base estiver sólida, a mesma arquitetura poderá evoluir para um produto SaaS.

A Nexo Digital não quer apenas administrar sites com o Nexo.

Queremos construir uma ferramenta capaz de mudar a maneira como administramos sites.

E, eventualmente, permitir que outras pessoas façam o mesmo.

**NEXO CMS**

_One workspace. Any stack. Complete control._