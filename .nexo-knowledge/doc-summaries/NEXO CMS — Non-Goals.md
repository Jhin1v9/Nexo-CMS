# NEXO CMS
## Non-Goals

## 1. Propósito deste documento

Este documento define explicitamente aquilo que o Nexo CMS **não pretende ser, não deve fazer por padrão ou não deve considerar responsabilidade do seu núcleo**.

Os non-goals existem para controlar escopo, evitar expansão desnecessária do produto e impedir que agentes de IA, desenvolvedores ou decisões futuras interpretem o projeto de maneira diferente da visão original.

Um non-goal não significa necessariamente que determinada capacidade nunca poderá existir.

Significa que:

- ela não pertence ao objetivo central do Nexo;
- não deve ser adicionada sem uma decisão explícita;
- não deve ser inferida automaticamente por agentes;
- não deve ser implementada apenas porque tecnicamente é possível.

Quando uma capacidade futura se aproximar de um dos itens abaixo, deverá existir uma decisão documentada antes de incorporá-la ao produto.

---

# 2. O Nexo não é um framework para criar sites

O Nexo não deve se tornar um framework de frontend.

Ele não existe para substituir:

- React;
- Vue;
- Svelte;
- Next.js;
- Astro;
- HTML;
- CSS;
- JavaScript;
- ou qualquer outra tecnologia de desenvolvimento.

O Nexo trabalha **sobre projetos existentes e novos projetos**, mas não deve exigir que eles adotem uma tecnologia própria do Nexo para funcionar.

---

# 3. O Nexo não deve impor uma stack aos projetos

O Nexo não deve dizer:

> “Para funcionar corretamente, este projeto precisa ser convertido para X.”

A menos que o usuário tenha solicitado explicitamente uma migração, o Nexo deve preservar a tecnologia existente.

Uma nova funcionalidade do Nexo não pode justificar automaticamente uma conversão de stack.

---

# 4. O Nexo não é um substituto obrigatório de IDE

O Nexo possuirá editor de código e ferramentas técnicas, mas não tem como objetivo proibir o uso de:

- VS Code;
- JetBrains;
- Neovim;
- Sublime;
- outros editores.

O usuário deve continuar livre para abrir e editar o projeto com qualquer ferramenta externa.

O Nexo deve complementar o fluxo de desenvolvimento, não tornar outras IDEs impossíveis ou desnecessárias.

---

# 5. O Nexo não é uma plataforma fechada

O Nexo não deve transformar projetos em sistemas impossíveis de retirar da plataforma.

Não deve existir uma dependência estrutural em que:

> “Se remover o Nexo, o projeto deixa de funcionar.”

O projeto deve continuar podendo ser executado e mantido fora do Nexo.

---

# 6. O Nexo não deve substituir Git

O Nexo terá integração profunda com Git, mas Git continuará sendo Git.

O Nexo não deve criar um sistema proprietário que substitua:

- commits;
- branches;
- remotes;
- histórico;
- diff;
- merge;
- revert;
- outras operações essenciais.

A interface do Nexo facilita o uso do Git.

Ela não deve esconder a existência do Git.

---

# 7. O Nexo não é uma hospedagem obrigatória

O Nexo poderá oferecer recursos de deploy e integração com hospedagens, mas o Nexo em si não deve exigir que todos os projetos sejam hospedados em uma infraestrutura própria.

Um projeto poderá ser publicado através de fornecedores externos compatíveis.

A plataforma não deve assumir que:

> projeto Nexo = hospedagem Nexo.

---

# 8. O Nexo não deve exigir um único provedor de IA

O Nexo não deve depender exclusivamente de:

- Kimi;
- Luna;
- OpenAI;
- Anthropic;
- Gemini;
- qualquer outro fornecedor.

Nenhum provider de IA deve ser considerado estruturalmente indispensável ao núcleo do produto.

---

# 9. O Nexo não deve transformar Luna em dependência do core

A Luna é uma integração possível e estratégica, mas o Nexo não deve depender dela para existir.

A integração com Luna deve permanecer desacoplada.

A ausência da Luna não pode impedir o funcionamento das demais capacidades do Nexo.

---

# 10. O Nexo não é apenas um chatbot

Embora o Nexo possua inteligência artificial, ele não deve ser concebido como:

> uma interface de conversa que simplesmente gera código.

A IA deve estar integrada ao contexto do projeto, às ferramentas, aos adapters, ao Git, ao preview, à validação e às permissões.

Uma interface de chat pode existir, mas não define o produto.

---

# 11. O Nexo não deve permitir que a IA faça qualquer coisa sem controle

Não é objetivo do produto oferecer autonomia irrestrita à IA.

A IA não deve possuir acesso ilimitado ao sistema somente para facilitar implementação.

Operações com risco elevado deverão respeitar políticas, permissões e controles definidos posteriormente.

O objetivo é permitir automação poderosa sem eliminar segurança e rastreabilidade.

---

# 12. O Nexo não deve esconder o código

O Nexo não deve criar uma experiência em que o usuário só consiga trabalhar através de blocos visuais.

O código continuará sendo acessível.

A plataforma visual existe para facilitar tarefas, não para esconder a implementação.

---

# 13. O Nexo não deve substituir completamente desenvolvimento profissional

O Nexo pode reduzir trabalho técnico repetitivo, automatizar tarefas e auxiliar programadores.

Porém, não deve ser tratado como uma promessa de:

> “qualquer pessoa poderá construir qualquer software sem conhecimento técnico.”

Essa não é a finalidade do produto.

A plataforma deve atender desde tarefas simples de conteúdo até engenharia avançada, sem fingir que toda tarefa pode ser automatizada perfeitamente.

---

# 14. O Nexo não deve criar um construtor visual destrutivo

O Nexo não deve funcionar como um editor que simplesmente reescreve uma página inteira toda vez que o usuário muda uma propriedade.

Não deve gerar estruturas duplicadas ou incompatíveis apenas para facilitar uma alteração visual.

O objetivo é editar a implementação existente de maneira coerente.

---

# 15. O Nexo não deve transformar todo projeto em um “Nexo Project”

O Nexo não deve exigir uma estrutura proprietária obrigatória dentro do projeto do cliente.

Não deve existir um requisito geral como:

```text
Todo projeto precisa possuir:
Nexo/
NexoRuntime/
NexoComponent/
NexoDatabase/
```

simplesmente para o CMS funcionar.

Quando arquivos próprios do Nexo forem realmente necessários, isso deverá ser definido explicitamente por arquitetura.

---

# 16. O Nexo não deve converter automaticamente projetos desconhecidos

Se o sistema detectar uma tecnologia ou arquitetura que não compreende adequadamente, ele não deve:

- migrar;
- reestruturar;
- substituir;
- converter;
- reescrever.

sem uma instrução explícita e uma estratégia definida.

Em caso de desconhecimento, o comportamento correto é informar a limitação.

---

# 17. O Nexo não deve fingir suporte universal

O objetivo é ser universal em arquitetura, mas o produto não deve declarar suporte a uma tecnologia apenas porque conseguiu abrir os arquivos.

Deve existir diferença entre:

```text
Detectado
```

```text
Suportado
```

```text
Parcialmente suportado
```

```text
Desconhecido
```

```text
Não suportado
```

O Nexo não deve esconder essas diferenças.

---

# 18. O Nexo não deve inventar semântica de projeto

Encontrar um arquivo chamado:

```text
Header.tsx
```

não significa necessariamente que o Nexo sabe tudo sobre aquele componente.

Uma pasta chamada:

```text
components/
```

não garante que todos os arquivos ali tenham o mesmo papel.

O sistema não deve transformar convenções comuns em certezas absolutas.

Detecção e inferência devem possuir níveis de confiança quando necessário.

---

# 19. O Nexo não deve mover arquivos sem necessidade

A organização existente de um projeto não deve ser reorganizada simplesmente para atender às preferências internas do Nexo.

Movimentações estruturais devem possuir motivo real.

Especialmente quando podem quebrar:

- imports;
- rotas;
- builds;
- scripts;
- pipelines;
- referências;
- deploys.

---

# 20. O Nexo não deve adicionar dependências sem necessidade

Uma alteração simples não deve justificar automaticamente a instalação de uma nova biblioteca.

O sistema deve evitar:

- dependências redundantes;
- pacotes equivalentes;
- bibliotecas pesadas para tarefas simples;
- dependências não utilizadas;
- alterações desnecessárias no package manager.

Uma dependência nova deverá possuir justificativa apropriada.

---

# 21. O Nexo não deve reescrever componentes existentes sem necessidade

Se uma alteração puder ser feita de maneira localizada, o sistema não deve substituir um componente inteiro.

Alterações devem procurar preservar:

- estrutura;
- lógica;
- estilos;
- APIs;
- compatibilidade;
- comportamento existente.

---

# 22. O Nexo não deve transformar todos os estilos em um design system próprio

O Nexo poderá detectar e editar sistemas de design existentes.

Isso não significa que todo projeto deverá ser convertido para os tokens ou padrões do Nexo.

O Nexo não deve impor:

- palette própria;
- tipografia própria;
- sistema de spacing próprio;
- breakpoints próprios;
- componentes próprios;

a projetos que já possuem essas definições.

---

# 23. O Nexo não deve exigir banco de dados para todo conteúdo

Nem todo projeto precisa de um banco de dados.

Conteúdo pode estar em:

- arquivos;
- JSON;
- Markdown;
- código;
- CMS externo;
- banco de dados;
- API;
- outros sistemas.

O Nexo não deve transformar automaticamente qualquer projeto em um sistema baseado em banco.

---

# 24. O Nexo não deve substituir serviços externos sem motivo

Se um projeto utiliza:

- formulário externo;
- analytics;
- CRM;
- WhatsApp;
- mapas;
- calendário;
- serviço de email;
- API;
- sistema de autenticação;

o Nexo não deve substituir automaticamente esses serviços por equivalentes próprios.

Integração e substituição são operações diferentes.

---

# 25. O Nexo não deve criar páginas automaticamente sem intenção

A IA ou o editor não devem adicionar páginas apenas porque detectaram uma oportunidade.

A criação de uma nova página deve possuir uma origem clara:

- solicitação do usuário;
- configuração;
- automação explicitamente definida;
- processo documentado.

---

# 26. O Nexo não deve criar componentes duplicados indiscriminadamente

Antes de criar um componente novo, o sistema deverá procurar identificar se existe algo adequado já presente no projeto ou na biblioteca disponível.

Não deve existir proliferação desnecessária de componentes com diferenças mínimas.

---

# 27. O Nexo não deve transformar cada elemento em um componente

Nem todo:

```text
div
h1
button
span
```

precisa virar um componente independente.

A componentização deverá respeitar a arquitetura e o contexto do projeto.

O Nexo não deve criar granularidade artificial apenas para aumentar sua própria abstração.

---

# 28. O Nexo não deve exigir que todos os projetos usem os mesmos componentes

A biblioteca global existe para reutilização, não para obrigatoriedade.

Um projeto pode ter componentes completamente próprios.

Outro pode utilizar componentes globais.

Outro pode utilizar ambos.

---

# 29. O Nexo não deve esconder alterações da equipe

Não deve existir comportamento em que mudanças sejam realizadas silenciosamente e depois apresentadas como se fossem parte original do projeto.

Alterações relevantes deverão ser identificáveis através de:

- diff;
- histórico;
- logs;
- Git;
- estado do projeto.

---

# 30. O Nexo não deve publicar automaticamente alterações perigosas por padrão

Deploy automático poderá existir.

Porém, ele não deverá ser assumido como padrão universal.

O comportamento dependerá da configuração do ambiente, permissões e políticas do projeto.

---

# 31. O Nexo não deve tratar produção como ambiente descartável

Operações contra produção devem possuir um nível maior de cautela.

O sistema não deve presumir que:

```text
produção = ambiente de testes
```

Preview, desenvolvimento e produção devem ser claramente diferenciáveis quando o projeto possuir esses ambientes.

---

# 32. O Nexo não deve prometer compatibilidade perfeita

Ser universal é uma direção de produto, não uma promessa de que toda tecnologia existente no mundo será automaticamente compreendida.

Pode haver:

- tecnologias experimentais;
- arquiteturas proprietárias;
- código obfuscado;
- projetos incompletos;
- sistemas antigos;
- configurações atípicas;
- ferramentas desconhecidas.

O Nexo deverá lidar corretamente com essas limitações.

---

# 33. O Nexo não deve apagar limitações da documentação

Quando uma capacidade ainda não existir, a documentação não deve afirmar que existe.

Quando um adapter possuir suporte parcial, isso deverá permanecer explícito.

Quando uma decisão estiver aberta, ela não deverá ser apresentada como definitiva.

---

# 34. O Nexo não deve confundir preparação com implementação

A documentação poderá preparar a arquitetura para:

- plugins;
- SaaS;
- múltiplos providers;
- novos adapters;
- marketplace;
- deploys futuros.

Isso não significa que todos esses recursos precisam existir no primeiro release.

Preparado para suportar não significa implementado.

---

# 35. O Nexo não deve priorizar quantidade sobre qualidade

Não é objetivo medir evolução apenas pelo número de:

- frameworks suportados;
- componentes;
- plugins;
- providers;
- integrações;
- funcionalidades.

Um recurso mal implementado que quebra projetos é pior do que não possuir aquele recurso.

Compatibilidade, previsibilidade e confiança possuem prioridade.

---

# 36. O Nexo não deve ser construído para impressionar uma IA

As abstrações do produto devem existir para resolver problemas reais.

Não devemos criar:

- camadas;
- agentes;
- schemas;
- serviços;
- abstrações;
- plugins;

somente porque parecem sofisticados.

Toda abstração deve possuir uma finalidade clara.

---

# 37. O Nexo não deve ser governado por decisões silenciosas de agentes

Agentes de IA poderão propor soluções.

Eles não devem criar silenciosamente novas regras fundamentais do produto.

Mudanças importantes de arquitetura, segurança, produto ou comportamento deverão ser registradas e aprovadas através do processo definido posteriormente.

---

# 38. O Nexo não deve tratar desconhecimento como permissão

Quando o sistema não compreender alguma parte do projeto, isso não significa que ele pode escolher arbitrariamente uma interpretação.

A ausência de conhecimento não é autorização para inventar.

O comportamento esperado é:

```text
Detectar
↓
Avaliar confiança
↓
Informar incerteza
↓
Solicitar definição quando necessário
```

ou utilizar um procedimento explicitamente documentado.

---

# 39. O Nexo não deve criar dependência comercial artificial

O produto poderá futuramente possuir planos pagos e recursos comerciais.

Porém, a arquitetura não deve criar limitações artificiais que prejudiquem a portabilidade básica dos projetos simplesmente para impedir que o usuário saia da plataforma.

A estratégia comercial deve coexistir com a filosofia de portabilidade.

---

# 40. O Nexo não deve perder sua identidade por crescimento

Adicionar recursos ao produto não deve transformar o Nexo em uma coleção desorganizada de ferramentas.

Toda nova capacidade deverá continuar relacionada à missão central:

> **compreender, editar, desenvolver, versionar, testar, automatizar e publicar projetos web sem obrigá-los a abandonar sua própria tecnologia.**

---

# 41. Resumo dos Non-Goals

O Nexo não deve ser:

```text
01. Um framework obrigatório.
02. Uma stack própria imposta aos projetos.
03. Um substituto obrigatório de IDE.
04. Uma plataforma fechada.
05. Um substituto de Git.
06. Uma hospedagem obrigatória.
07. Um produto preso a uma única IA.
08. Um produto dependente da Luna.
09. Apenas um chatbot.
10. Uma automação sem controle.
11. Um construtor visual destrutivo.
12. Um sistema que esconde o código.
13. Um substituto completo do conhecimento técnico.
14. Um sistema que inventa suporte universal.
15. Um sistema que converte projetos sem autorização.
16. Um sistema que reorganiza projetos sem necessidade.
17. Um sistema que adiciona dependências sem justificativa.
18. Um design system imposto a todos os projetos.
19. Um CMS que exige banco de dados para tudo.
20. Um substituto automático de serviços externos.
21. Um gerador automático de páginas sem intenção.
22. Uma fábrica de componentes duplicados.
23. Um sistema que transforma cada elemento em componente.
24. Uma biblioteca obrigatória de componentes.
25. Uma caixa preta de alterações.
26. Um sistema que publica qualquer coisa automaticamente.
27. Um ambiente que trata produção como descartável.
28. Uma promessa de compatibilidade absoluta.
29. Uma documentação que inventa capacidades.
30. Uma arquitetura complexa apenas para parecer sofisticada.
31. Um produto governado silenciosamente por agentes.
32. Um sistema que transforma desconhecimento em invenção.
33. Uma prisão comercial para os projetos.
34. Uma coleção desorganizada de funcionalidades.
```

---

# 42. Regra final

Sempre que surgir uma nova funcionalidade, arquitetura ou proposta, deve-se verificar se ela contradiz algum non-goal.

Se contradizer, a implementação não deverá prosseguir silenciosamente.

Deverá existir uma decisão explícita sobre:

- manter o non-goal;
- alterar o non-goal;
- criar uma exceção;
- ou retirar a proposta.

O objetivo deste documento é manter o Nexo CMS focado enquanto ele cresce.

> **Saber o que o Nexo não deve ser é tão importante quanto saber o que ele deve ser.**