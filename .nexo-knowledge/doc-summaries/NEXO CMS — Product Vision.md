# NEXO CMS
## Product Vision

## 1. Propósito deste documento

Este documento define a **visão de produto** do Nexo CMS.

O Manifesto Humano explica por que o Nexo existe e quais ideias fundamentais orientam o projeto.

Este documento transforma essas ideias em uma visão mais precisa sobre:

- o produto que queremos construir;
- o problema que queremos resolver;
- a experiência que queremos oferecer;
- a posição do Nexo em relação às ferramentas existentes;
- o que significa, para nós, um Nexo CMS completo;
- quais características devem permanecer centrais enquanto o produto evolui.

Este documento **não define a implementação técnica definitiva**.

Detalhes como framework do próprio Nexo, banco de dados, protocolo de comunicação, estrutura de código, tecnologias específicas e mecanismos internos deverão ser definidos nos documentos de arquitetura correspondentes.

A função deste documento é evitar que futuras decisões técnicas façam o produto se afastar da sua finalidade original.

---

# 2. Visão central

A visão do Nexo CMS é criar uma plataforma capaz de **entrar em qualquer projeto web compatível, compreender sua estrutura, respeitar sua tecnologia e oferecer uma experiência centralizada para editar, desenvolver, versionar, testar, automatizar e publicar esse projeto**.

O usuário não deverá precisar pensar:

> “Qual CMS foi usado para construir este site?”

ou:

> “Qual ferramenta eu preciso aprender para editar este projeto?”

A pergunta deverá passar a ser:

> “Este projeto está dentro do Nexo?”

Se estiver, o objetivo é que o usuário possa trabalhar nele através da mesma experiência.

---

# 3. O problema que queremos eliminar

A manutenção de projetos web atualmente é fragmentada.

Um projeto pode exigir:

- uma IDE;
- terminal;
- Git;
- navegador;
- ferramentas de design;
- ferramentas de imagem;
- ferramentas de deploy;
- ferramentas de análise;
- serviços de IA;
- sistemas de CMS;
- serviços externos.

Quando existem muitos clientes, a equipe precisa alternar constantemente entre essas ferramentas.

Além disso, cada projeto pode possuir uma arquitetura completamente diferente.

O Nexo pretende reduzir essa fragmentação.

Não queremos eliminar as ferramentas externas quando elas forem necessárias.

Queremos criar uma **camada de trabalho central** capaz de coordená-las.

---

# 4. O que o Nexo deve representar para o usuário

Para o usuário, o Nexo deverá parecer um único ambiente.

O usuário abre um projeto e encontra, de forma coerente:

```text
Project
├── Visual Editor
├── Code
├── Pages
├── Components
├── Media
├── Design
├── Responsive Lab
├── Git
├── AI
├── Integrations
├── Terminal
├── Preview
└── Deploy
```

Essas capacidades não devem parecer produtos independentes colados em uma mesma interface.

Elas devem funcionar como partes de um mesmo fluxo de trabalho.

---

# 5. Visão de experiência

A experiência desejada pode ser descrita como:

```text
OPEN
  ↓
UNDERSTAND
  ↓
EXPLORE
  ↓
EDIT
  ↓
CREATE
  ↓
VALIDATE
  ↓
VERSION
  ↓
PUBLISH
```

O Nexo deve permitir que o usuário permaneça nesse ciclo sem precisar constantemente abandonar a plataforma para executar tarefas básicas.

---

# 6. Abrir um projeto deve ser o início da experiência

O Nexo não deve começar pela criação de um site vazio.

Seu principal caso de uso é também receber **projetos que já existem**.

O usuário poderá fornecer uma pasta de projeto.

O Nexo deverá analisar essa pasta e determinar, quando possível:

- qual é a tecnologia principal;
- quais tecnologias secundárias estão presentes;
- como o projeto é executado;
- como o projeto é construído;
- onde estão as páginas;
- onde estão os componentes;
- onde estão os estilos;
- onde estão os assets;
- como o projeto utiliza Git;
- quais características relevantes foram detectadas.

O resultado dessa análise deverá alimentar a representação interna do projeto.

---

# 7. Compreender antes de modificar

Uma das regras mais importantes da visão do produto é:

> **O Nexo deve compreender antes de modificar.**

Isso vale especialmente para operações realizadas pela IA, mas também orienta o editor.

O sistema não deverá modificar arquivos simplesmente porque encontrou uma string semelhante.

Ele deverá tentar entender:

- o contexto;
- a função do arquivo;
- a relação entre componentes;
- a origem do conteúdo;
- a forma de estilização;
- as dependências;
- o impacto da alteração.

Quanto mais complexa for a tarefa, maior deverá ser a profundidade de compreensão necessária antes da mudança.

---

# 8. O projeto continua sendo o projeto

O Nexo não deve criar uma abstração que substitua completamente a realidade do código.

O projeto real deve continuar existindo.

Se um site utiliza:

```text
Next.js + TypeScript + Tailwind
```

ele continuará sendo:

```text
Next.js + TypeScript + Tailwind
```

depois de ser administrado pelo Nexo.

O Nexo apenas acrescentará uma camada de compreensão e gerenciamento.

Essa distinção é fundamental.

---

# 9. Universalidade não significa simplificação excessiva

O objetivo não é criar uma ferramenta que faça todas as tecnologias parecerem iguais.

Isso seria perigoso.

As tecnologias possuem características próprias.

O Nexo deverá reconhecer essas diferenças.

Por exemplo, editar um componente em:

```text
React
```

não é necessariamente igual a editar:

```text
Vue
```

e editar:

```text
HTML/CSS/JS
```

não é igual a editar:

```text
Next.js + Tailwind
```

O Nexo deve oferecer uma experiência consistente **sem apagar as diferenças técnicas que precisam ser preservadas**.

---

# 10. O Adapter é o mecanismo dessa universalidade

A universalidade do Nexo deverá acontecer através da arquitetura de adapters.

O núcleo do produto trabalhará com conceitos universais.

Os adapters traduzirão esses conceitos para a linguagem específica de cada projeto.

A visão é:

```text
Nexo Concept
      ↓
Adapter
      ↓
Project Technology
```

e no sentido inverso:

```text
Project Technology
      ↓
Adapter
      ↓
Nexo Concept
```

Assim, o Nexo pode trabalhar com conceitos como:

- página;
- componente;
- propriedade;
- asset;
- estilo;
- rota;
- build;
- projeto.

Enquanto o adapter sabe como esses conceitos realmente são representados naquele stack.

---

# 11. O editor visual deve ser poderoso, mas não destrutivo

A visão do editor visual é permitir que o usuário faça alterações sem precisar editar código manualmente para cada pequena mudança.

Entretanto, o editor não deve se comportar como um construtor que substitui a estrutura do projeto.

Ele deverá atuar **sobre a estrutura existente**.

Se o projeto já possui um Hero, o editor deve permitir editá-lo.

Se já possui um Carousel, o editor deve permitir modificar suas propriedades.

Se o usuário quiser criar algo novo, o Nexo poderá fazer isso explicitamente.

O editor não deve introduzir estruturas invisíveis ou mágicas que o projeto não consiga compreender fora do Nexo.

---

# 12. O código deve continuar acessível

O Nexo deve ser adequado tanto para usuários que preferem interfaces visuais quanto para profissionais técnicos.

O código não deverá ser escondido.

O usuário deverá poder alternar entre:

```text
Visual
```

e

```text
Code
```

quando necessário.

A visão é criar uma relação coerente entre os dois.

Selecionar visualmente um elemento deve, quando tecnicamente possível, permitir identificar sua origem no código.

Editar no código deve refletir no preview.

Alterações visuais devem gerar alterações reais nos arquivos apropriados.

---

# 13. Componentes como patrimônio reutilizável

O Nexo deve permitir que a equipe deixe de pensar em componentes apenas como partes de um único projeto.

Um componente pode ser um ativo reutilizável.

Por isso, o produto deverá possibilitar:

```text
Create
↓
Edit
↓
Test
↓
Save
↓
Version
↓
Reuse
```

Um componente criado em um projeto poderá permanecer específico daquele projeto ou, quando compatível, ser promovido para a biblioteca da organização.

Isso permitirá que a Nexo Digital construa gradualmente uma biblioteca própria.

---

# 14. Component Studio deve permitir criação real

A visão do Component Studio é fornecer um espaço onde componentes possam ser construídos, configurados, visualizados e preparados para reutilização.

Um componente deverá poder possuir:

- estrutura;
- código;
- estilos;
- propriedades;
- variantes;
- comportamento responsivo;
- assets;
- dependências;
- documentação;
- preview.

O objetivo não é apenas armazenar snippets.

O objetivo é criar **componentes reutilizáveis e compreensíveis pelo Nexo**.

---

# 15. A biblioteca de componentes deve sobreviver aos projetos

Um dos valores estratégicos do Nexo é separar:

```text
Project Component
```

de:

```text
Nexo Library Component
```

Isso permitirá:

```text
Projeto A
   ↓
Componente útil
   ↓
Promover
   ↓
Nexo Library
   ↓
Projeto B
Projeto C
Projeto D
```

A biblioteca deverá possuir mecanismos próprios de versionamento e compatibilidade quando essa parte for especificada posteriormente.

---

# 16. Conteúdo deve ser simples de administrar

Um dos objetivos do CMS é reduzir o trabalho técnico necessário para alterações comuns.

O usuário deve conseguir alterar, quando o projeto permitir:

- textos;
- títulos;
- subtítulos;
- imagens;
- links;
- conteúdo de componentes;
- itens de carrosséis;
- dados de projetos;
- conteúdo de páginas;
- informações do blog.

Essas alterações devem utilizar a forma de armazenamento que fizer sentido para o projeto.

O Nexo não deve obrigar todos os sites a transformar conteúdo estático em banco de dados apenas para que o CMS funcione.

---

# 17. Media Library deve tratar assets como parte do projeto

Imagens e outros arquivos não devem ser tratados apenas como uploads.

O Nexo deve entender a relação entre assets e o projeto.

Por isso, a visão inclui:

```text
Asset
↓
Where is it?
↓
How is it used?
↓
Can it be replaced?
↓
What breaks if it is removed?
```

O objetivo é tornar manipulação de mídia segura e rastreável.

---

# 18. Design deve ser editável sem destruir a linguagem visual

O usuário deverá conseguir trabalhar com a identidade visual existente.

Isso inclui:

- cores;
- gradientes;
- fontes;
- espaçamentos;
- bordas;
- radius;
- sombras;
- containers;
- breakpoints;
- variáveis.

Mas o Nexo não deve simplesmente sobrescrever tudo com um sistema próprio.

A forma correta de editar deverá depender da maneira como o projeto implementa seus estilos.

---

# 19. Responsive Lab deve tratar bugs de layout como problemas de engenharia

A visão do Responsive Lab não é apenas oferecer diferentes tamanhos de preview.

Queremos uma ferramenta capaz de ajudar a investigar problemas reais.

Por exemplo:

```text
Viewport:
375 × 812

Problem:
CTA overflowing horizontally

Affected element:
Hero CTA group

Likely source:
Hero layout styles
```

O Nexo deve caminhar na direção de transformar problemas visuais em problemas identificáveis e solucionáveis.

A implementação dessa capacidade será especificada posteriormente.

---

# 20. Git deve fazer parte do fluxo normal

Versionamento não deve ser uma etapa separada.

O fluxo ideal deverá permitir:

```text
Edit
↓
Review
↓
Diff
↓
Commit
↓
Push
```

ou:

```text
AI Edit
↓
Diff
↓
Test
↓
Commit
↓
Push
```

O usuário deverá manter controle sobre o estado do projeto.

A integração com Git também deverá permitir recuperação quando uma alteração não produzir o resultado esperado.

---

# 21. IA deve atuar como engenheira, não como geradora aleatória

O Nexo AI Engineer deve ser orientado a tarefas.

A IA deverá poder:

- analisar;
- planejar;
- explicar;
- editar;
- testar;
- diagnosticar;
- corrigir;
- gerar;
- revisar.

Mas a IA deverá trabalhar dentro do contexto do projeto.

Uma instrução como:

> “Faça o header funcionar melhor no mobile.”

não deve resultar automaticamente em código genérico.

A IA deverá primeiro localizar:

- qual header existe;
- onde está implementado;
- qual tecnologia ele utiliza;
- como o estilo funciona;
- quais componentes dependem dele;
- quais breakpoints já existem.

Depois deverá propor e/ou executar uma alteração coerente com aquela arquitetura.

---

# 22. IA automática e manual

A visão do Nexo AI inclui dois comportamentos complementares.

## Automático

Indicado para tarefas em que o usuário deseja delegar a execução.

A IA poderá:

```text
analyze
→ plan
→ modify
→ validate
→ report
```

respeitando as permissões concedidas.

## Manual

Indicado para tarefas em que o usuário deseja supervisão mais próxima.

A IA poderá:

```text
analyze
→ explain
→ propose
→ show diff
→ wait for approval
```

A existência dos dois modos é parte da visão do produto.

---

# 23. A IA não deve determinar a arquitetura do projeto

Mesmo utilizando inteligência artificial, o Nexo não deverá tratar a saída da IA como autoridade absoluta.

A arquitetura existente do projeto, as regras dos adapters e as políticas do Nexo devem servir como restrições.

A IA deve trabalhar **dentro dessas restrições**.

Isso reduz a possibilidade de uma alteração aparentemente simples introduzir uma mudança arquitetural desnecessária.

---

# 24. Luna e outros providers

O Nexo deverá permanecer independente do fornecedor de inteligência artificial.

A visão é que Luna, Kimi e outros providers possam atuar dentro de uma mesma arquitetura de AI Provider.

Isso permite que a Nexo Digital utilize a ferramenta que fizer mais sentido para cada tarefa.

O produto não deverá nascer dependente de uma única empresa de IA.

---

# 25. Integrações devem ser cidadãs de primeira classe

Adicionar uma integração não deve exigir reconstruir uma página inteira.

O Nexo deverá permitir trabalhar com elementos externos como:

- WhatsApp;
- mapas;
- iframes;
- scripts;
- widgets;
- formulários;
- chats;
- calendários;
- analytics;
- embeds;
- códigos personalizados.

Esses recursos deverão ser tratados como elementos administráveis.

---

# 26. O Nexo deve permitir sair do caminho

Uma ferramenta profissional precisa saber quando não deve esconder a complexidade.

Se o usuário quiser executar um comando manualmente, ele deverá conseguir.

Se quiser abrir o código, deverá conseguir.

Se quiser trabalhar diretamente com Git, deverá conseguir.

Se quiser ignorar o editor visual e usar o terminal, deverá conseguir.

O Nexo não deve limitar profissionais experientes apenas para simplificar a experiência de iniciantes.

---

# 27. Deploy deve ser consequência de um projeto validado

A visão de deploy é:

```text
Project
↓
Validate
↓
Build
↓
Preview
↓
Deploy
↓
Verify
```

O sistema deve caminhar para garantir que o projeto esteja em uma condição conhecida antes de ser publicado.

A forma exata de implementação será definida no documento de Deployment.

---

# 28. Portabilidade é uma característica do produto

O Nexo deve adicionar inteligência, mas não propriedade sobre o projeto do cliente.

Um projeto não pode se tornar inutilizável porque o Nexo foi removido.

O código deve continuar sendo código.

Os assets devem continuar sendo assets.

O Git deve continuar funcionando.

O projeto deve poder ser exportado e continuar existindo fora do Nexo.

Essa característica é importante tanto tecnicamente quanto comercialmente.

---

# 29. Visão para uso interno

O primeiro ambiente real do Nexo será a própria Nexo Digital.

Isso permitirá utilizar o produto nos nossos próprios projetos e nos projetos dos clientes.

O objetivo inicial não será construir um SaaS perfeito para venda imediata.

O objetivo inicial será construir uma ferramenta que realmente resolva os problemas da equipe.

A validação interna deverá orientar as futuras versões do produto.

---

# 30. Visão de produto comercial

Depois de provar que o Nexo funciona internamente, a plataforma poderá evoluir para um produto comercial.

A visão futura inclui:

- contas;
- organizações;
- workspaces;
- múltiplos projetos;
- equipes;
- permissões;
- planos;
- limites;
- billing;
- biblioteca de componentes;
- marketplace;
- plugins;
- providers de IA;
- recursos empresariais.

Nada disso deve ser usado como justificativa para complicar o MVP sem necessidade.

A arquitetura deverá simplesmente evitar decisões que impeçam essa evolução.

---

# 31. O que significa sucesso

O Nexo estará caminhando na direção correta quando um desenvolvedor puder receber um projeto desconhecido, abrir a pasta no Nexo e rapidamente chegar a um estado em que consegue:

1. entender o stack;
2. visualizar a estrutura;
3. executar o projeto;
4. abrir o preview;
5. localizar componentes;
6. editar conteúdo;
7. editar código;
8. trabalhar com assets;
9. testar responsividade;
10. utilizar Git;
11. pedir ajuda à IA;
12. revisar alterações;
13. validar o build;
14. publicar o projeto.

Quanto menos troca de ferramentas for necessária para realizar esse ciclo, mais próximo estaremos da visão original.

---

# 32. Visão de longo prazo

No longo prazo, queremos que o Nexo CMS se torne uma camada universal para o trabalho sobre projetos web.

Não queremos que ele seja definido por uma tecnologia específica.

Queremos que ele seja definido pela capacidade de:

> **compreender um projeto, respeitar sua arquitetura e tornar sua evolução mais simples, segura e inteligente.**

O sucesso do Nexo não será medido pelo número de frameworks que ele afirma suportar.

Será medido pela qualidade com que ele consegue **entender, editar e preservar projetos reais**.

---

# 33. Frase de visão

> **O Nexo CMS pretende ser a camada universal entre pessoas e projetos web: uma plataforma capaz de compreender qualquer stack suportado, preservar sua arquitetura e centralizar edição, desenvolvimento, inteligência artificial, versionamento, testes e publicação em um único ambiente.**