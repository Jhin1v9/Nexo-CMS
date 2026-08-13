# NEXO CMS
## Product Principles

## 1. Propósito deste documento

Este documento define os princípios que devem orientar todas as decisões de produto e, posteriormente, todas as decisões de engenharia do Nexo CMS.

Os princípios existem para impedir que o produto se desvie de sua finalidade à medida que novas funcionalidades, tecnologias, adapters, agentes de IA, plugins e integrações forem adicionados.

Uma nova funcionalidade não deve ser considerada correta apenas porque funciona.

Ela também precisa estar de acordo com os princípios do Nexo.

Quando houver conflito entre conveniência de implementação e um princípio fundamental do produto, o princípio deverá ser tratado como uma restrição de projeto.

Este documento não determina a implementação de cada princípio.

Ele determina **o comportamento que a implementação deve preservar**.

---

# 2. Princípio 01 — O projeto é soberano

O projeto do usuário é a entidade principal.

O Nexo existe para trabalhar sobre o projeto, e não para substituir o projeto.

O Nexo não deve criar uma dependência artificial que faça o projeto perder sua utilidade fora da plataforma.

O projeto deve continuar sendo um projeto válido mesmo quando o Nexo não estiver presente.

Isso significa que:

- o código real continua existindo;
- os assets reais continuam existindo;
- o sistema de build continua existindo;
- o Git continua existindo;
- as dependências continuam sendo as do projeto;
- a arquitetura continua pertencendo ao projeto.

O Nexo deve adicionar capacidade de gerenciamento, edição e inteligência.

Não deve sequestrar a estrutura do projeto.

---

# 3. Princípio 02 — O Nexo se adapta ao projeto

Este é um dos princípios centrais de toda a plataforma.

> **O Nexo se adapta ao projeto. O projeto não se adapta ao Nexo.**

O Nexo deve respeitar:

- framework;
- linguagem;
- sistema de estilos;
- sistema de componentes;
- estrutura de arquivos;
- sistema de build;
- package manager;
- convenções existentes;
- arquitetura existente.

O Nexo não deve alterar uma arquitetura existente simplesmente porque possui uma maneira própria de fazer determinada coisa.

Uma abstração interna do Nexo é válida apenas quando ela consegue ser traduzida corretamente para o projeto por meio das estruturas adequadas.

---

# 4. Princípio 03 — Entender antes de alterar

O Nexo deve priorizar compreensão antes de modificação.

Isso se aplica especialmente a:

- edição automática;
- geração de código;
- refatoração;
- alteração de estilos;
- criação de componentes;
- correções feitas pela IA.

Antes de modificar algo, o sistema deve procurar compreender:

- o contexto;
- a origem;
- as dependências;
- os consumidores;
- as convenções;
- os efeitos esperados;
- os possíveis impactos.

Uma alteração não deve ser baseada apenas em uma correspondência textual quando houver contexto estrutural disponível.

---

# 5. Princípio 04 — Abstração sem apagar a realidade

O Nexo precisa ser universal, mas universalidade não significa fingir que todas as tecnologias são iguais.

O sistema poderá possuir conceitos universais como:

- Project;
- Page;
- Route;
- Component;
- Asset;
- Style;
- Property;
- Integration;
- Build;
- Deployment.

Entretanto, esses conceitos devem sempre poder ser relacionados à implementação real do projeto.

A abstração existe para facilitar o trabalho.

Ela não deve esconder informações necessárias para compreender ou controlar o projeto.

---

# 6. Princípio 05 — O código nunca deve ser um cidadão de segunda classe

O Nexo pode ter um editor visual poderoso, mas o código deve continuar acessível.

O usuário não deve ser obrigado a utilizar apenas a interface visual.

Deve ser possível:

- abrir arquivos;
- editar código;
- visualizar diffs;
- executar comandos;
- trabalhar com Git;
- inspecionar estruturas;
- investigar problemas;
- realizar alterações técnicas.

O Nexo deverá atender tanto usuários visuais quanto usuários técnicos.

---

# 7. Princípio 06 — Visual e código devem permanecer relacionados

Quando tecnicamente possível, uma alteração feita visualmente deve possuir correspondência identificável no projeto real.

Da mesma forma, uma alteração feita no código deve poder aparecer no preview.

O Nexo deve evitar criar uma separação artificial entre:

```text
Visual
```

e:

```text
Code
```

Essas duas representações devem trabalhar sobre a mesma realidade.

---

# 8. Princípio 07 — Alterações devem ser reais

Quando o usuário clicar em salvar, a alteração precisa existir no projeto real.

Não é suficiente atualizar apenas uma representação interna do Nexo.

Se um texto foi alterado, a origem correspondente deve ser alterada.

Se uma imagem foi substituída, o asset correspondente deve ser atualizado.

Se uma propriedade de um componente foi modificada, a implementação correspondente deve receber a alteração.

Se uma página foi criada, a estrutura correspondente deverá existir no projeto.

O Nexo não deve simular uma edição que não foi efetivamente persistida.

---

# 9. Princípio 08 — Nada de Frankenstein visual

O editor visual deve ser poderoso sem destruir a coerência do projeto.

O Nexo não deve incentivar a criação de:

- estilos duplicados desnecessários;
- regras CSS conflitantes;
- estruturas redundantes;
- componentes duplicados;
- overrides arbitrários;
- hacks para resolver problemas simples;
- alterações que contradizem o design existente.

Se um projeto utiliza um sistema de tokens, o Nexo deve preferir trabalhar com os tokens.

Se utiliza uma classe reutilizável, o Nexo deve preferir reutilizá-la.

Se existe um componente adequado, o Nexo deve preferir reutilizá-lo em vez de criar outro idêntico.

---

# 10. Princípio 09 — Respeitar a linguagem do projeto

Cada tecnologia possui uma maneira própria de resolver problemas.

O Nexo deve respeitar essa linguagem.

Exemplos:

### Tailwind

Preferir a forma de estilização utilizada pelo projeto em vez de introduzir CSS paralelo sem necessidade.

### CSS Modules

Modificar os módulos correspondentes, respeitando seus escopos.

### Styled Components

Preservar o padrão de componentes estilizados existente.

### CSS Variables

Preferir a alteração de variáveis quando essa for a fonte apropriada.

### HTML/CSS/JS

Respeitar a estrutura existente e não inventar um framework sem necessidade.

Esses são exemplos do princípio.

As regras específicas de cada tecnologia deverão ser definidas pelos adapters.

---

# 11. Princípio 10 — Git é parte do estado do projeto

O Nexo não deve tratar Git como um acessório.

O histórico de alterações é parte importante da segurança do projeto.

O Nexo deve trabalhar de forma que o usuário possa:

- saber o que mudou;
- revisar mudanças;
- identificar alterações feitas pela IA;
- criar commits;
- recuperar versões;
- comparar estados.

Alterações relevantes devem ser rastreáveis.

---

# 12. Princípio 11 — Tudo que pode ser revertido deve ser revertível

Uma ferramenta poderosa precisa ser segura.

Sempre que possível, operações destrutivas deverão possuir mecanismos de recuperação.

Isso inclui:

- histórico;
- Git;
- diff;
- snapshots quando apropriados;
- undo/redo;
- confirmação de operações perigosas.

A equipe deve poder experimentar sem sentir que uma alteração errada destruirá o projeto permanentemente.

---

# 13. Princípio 12 — A IA trabalha dentro de limites

A inteligência artificial não possui autoridade irrestrita.

Ela deve trabalhar dentro de:

- contexto;
- permissões;
- regras do projeto;
- regras do adapter;
- políticas do usuário;
- mecanismos de validação.

A IA deve ser capaz de trabalhar autonomamente quando autorizado, mas autonomia não significa ausência de controle.

---

# 14. Princípio 13 — IA primeiro entende, depois planeja, depois executa

O fluxo ideal para uma tarefa complexa de IA é:

```text
Understand
↓
Plan
↓
Modify
↓
Validate
↓
Review
↓
Apply
```

Dependendo do modo de operação, algumas etapas poderão ser automatizadas.

Entretanto, o princípio permanece:

> **A IA não deve modificar arquivos sem possuir contexto suficiente para justificar a alteração.**

---

# 15. Princípio 14 — A IA deve mostrar o trabalho importante

Quando uma alteração for relevante, o usuário deverá conseguir saber:

- o que foi alterado;
- por que foi alterado;
- quais arquivos foram envolvidos;
- quais efeitos foram previstos;
- se a validação passou;
- quais problemas foram encontrados.

A plataforma deve favorecer transparência.

Não queremos uma caixa preta dizendo:

> “Pronto, corrigi.”

Queremos algo mais próximo de:

> “Corrigi o problema no componente X. Alterei os arquivos A e B. O overflow horizontal foi eliminado no viewport de 375px. O build foi validado.”

---

# 16. Princípio 15 — Segurança antes de conveniência

O Nexo terá acesso a capacidades sensíveis:

- filesystem;
- terminal;
- Git;
- processos;
- secrets;
- deploy;
- IA.

Por isso, operações potencialmente perigosas devem possuir mecanismos de proteção.

Quanto maior o impacto potencial de uma operação, maior deverá ser o controle necessário.

O sistema deverá distinguir entre:

- ações seguras;
- ações modificadoras;
- ações destrutivas;
- ações críticas.

A implementação dessas categorias será definida posteriormente no modelo de segurança.

---

# 17. Princípio 16 — O usuário deve saber onde está alterando

O Nexo deve evitar ambiguidades.

Ao editar um elemento, o sistema deverá buscar deixar claro:

- em qual projeto o usuário está;
- qual página está sendo editada;
- qual componente está selecionado;
- qual origem está envolvida;
- qual asset está sendo alterado;
- qual ambiente está sendo usado.

Um usuário não deve poder confundir facilmente:

```text
Projeto A
```

com:

```text
Projeto B
```

ou:

```text
produção
```

com:

```text
desenvolvimento
```

---

# 18. Princípio 17 — Componentes são ativos reutilizáveis

O Nexo deve favorecer reutilização.

Quando um comportamento ou interface for suficientemente reutilizável, o sistema deverá permitir que se transforme em componente.

A biblioteca de componentes é um ativo estratégico.

Ela deverá facilitar:

- criação;
- documentação;
- versionamento;
- reutilização;
- atualização;
- compatibilidade.

---

# 19. Princípio 18 — Reutilização não pode causar acoplamento indevido

Nem todo componente deve ser global.

O Nexo precisa reconhecer a diferença entre:

```text
Project Component
```

e:

```text
Global Component
```

Um componente específico de um cliente não deve ser automaticamente distribuído para todos os outros projetos.

Promoção para biblioteca global deverá ser uma ação consciente.

---

# 20. Princípio 19 — Integrações devem ser extensíveis

O Nexo deverá permitir adicionar recursos externos sem precisar construir cada integração diretamente no núcleo.

Isso vale para:

- widgets;
- APIs;
- embeds;
- scripts;
- chats;
- mapas;
- formulários;
- serviços;
- AI providers;
- deploy providers.

Sempre que possível, novas integrações deverão utilizar contratos ou extensões apropriadas.

---

# 21. Princípio 20 — O núcleo deve permanecer pequeno e estável

O Nexo crescerá através de:

- adapters;
- plugins;
- providers;
- componentes;
- integrações;
- módulos.

O núcleo não deve receber toda nova funcionalidade diretamente.

Antes de adicionar algo ao core, deve-se avaliar se aquela capacidade realmente pertence ao núcleo ou se deve ser implementada como extensão.

---

# 22. Princípio 21 — Portabilidade é obrigatória

O Nexo não deve transformar um projeto em uma aplicação dependente do Nexo.

O projeto deverá continuar podendo ser:

- executado fora do Nexo;
- versionado fora do Nexo;
- transferido;
- exportado;
- publicado;
- mantido por outras ferramentas.

Essa regra é especialmente importante para a futura versão comercial do produto.

---

# 23. Princípio 22 — O Nexo deve ser agnóstico de provider

O Nexo não deve depender de:

- uma única IA;
- uma única plataforma Git;
- um único provedor de deploy;
- uma única tecnologia de projeto;
- uma única infraestrutura.

Quando houver necessidade de integração externa recorrente, o sistema deverá procurar uma abstração que permita futuras implementações alternativas.

---

# 24. Princípio 23 — Extensibilidade desde o início, complexidade controlada

O fato de o Nexo ser extensível não significa que tudo deve ser plugin.

Também não significa que o MVP precisa suportar todas as tecnologias existentes.

A arquitetura deve ser preparada para extensão sem obrigar a primeira versão a implementar todo o futuro.

Devemos separar:

```text
Preparado para suportar
```

de:

```text
Já suporta
```

Essa distinção deve aparecer claramente na documentação.

---

# 25. Princípio 24 — Não inventar capacidades silenciosamente

O Nexo deve distinguir entre:

```text
Supported
```

```text
Detected
```

```text
Unknown
```

```text
Unsupported
```

```text
Custom
```

Se o sistema não souber interpretar alguma parte de um projeto, ele não deve fingir que sabe.

É melhor informar:

> “Estrutura não reconhecida.”

do que modificar algo incorretamente.

Esse princípio é especialmente importante para agentes de IA.

---

# 26. Princípio 25 — Falhar com clareza

Quando alguma operação não puder ser realizada, o Nexo deve explicar:

- o que tentou fazer;
- onde falhou;
- qual foi a causa conhecida;
- qual parte foi modificada;
- qual parte não foi modificada;
- qual ação pode ser tomada em seguida.

Erros silenciosos são inaceitáveis em operações sobre projetos reais.

---

# 27. Princípio 26 — Preview não deve mentir

Quando o Nexo mostrar um preview, esse preview deve representar o estado real do projeto tanto quanto tecnicamente possível.

O sistema deve deixar claro quando um preview representa:

- estado salvo;
- alterações ainda não salvas;
- alterações temporárias;
- estado local;
- estado remoto;
- ambiente diferente.

A interface não deve apresentar uma prévia como se fosse o estado publicado quando não é.

---

# 28. Princípio 27 — Performance faz parte da qualidade

O Nexo não deve sacrificar desnecessariamente a performance do projeto apenas para facilitar sua própria implementação.

Ao modificar um projeto, o Nexo deve respeitar seus requisitos de performance sempre que possível.

O sistema também deve evitar:

- duplicação desnecessária de assets;
- dependências desnecessárias;
- scripts redundantes;
- componentes excessivamente pesados;
- alterações que aumentem custo sem necessidade.

---

# 29. Princípio 28 — Acessibilidade é parte do produto

O Nexo deve considerar acessibilidade tanto na própria interface quanto nas ferramentas de edição.

O produto deve ajudar a criar sites melhores, e não estimular práticas inacessíveis.

Quando tecnicamente possível, propriedades como:

- alt;
- labels;
- contraste;
- semântica;
- navegação por teclado;
- foco;
- estrutura de headings;

devem poder ser trabalhadas pelo sistema.

---

# 30. Princípio 29 — Mobile é uma realidade, não um estado secundário

O Nexo deve tratar responsividade desde o início.

Mobile não deve ser simplesmente uma versão reduzida do desktop.

O editor, o Responsive Lab, os componentes e os adapters devem considerar comportamento responsivo como parte da estrutura do projeto.

---

# 31. Princípio 30 — Automação deve reduzir trabalho, não esconder trabalho

Automatizar uma tarefa é bom quando isso reduz esforço.

Automatizar sem mostrar o que aconteceu pode gerar risco.

O Nexo deve procurar o equilíbrio:

```text
Automação
+
Transparência
+
Controle
```

---

# 32. Princípio 31 — A experiência deve ser poderosa sem ser confusa

O Nexo terá muitas capacidades.

Isso não significa que tudo deve aparecer ao mesmo tempo.

A interface deverá organizar complexidade.

Usuários menos técnicos devem conseguir executar tarefas comuns.

Usuários avançados devem conseguir acessar ferramentas profundas.

A complexidade deve estar disponível quando necessária, não imposta o tempo inteiro.

---

# 33. Princípio 32 — Convenções existentes têm prioridade

Quando um projeto já possui uma convenção coerente, o Nexo deve preferi-la.

Exemplos:

- nomenclatura;
- estrutura de pastas;
- componentes;
- estilos;
- tokens;
- padrões de código;
- organização de assets;
- comandos;
- scripts.

O Nexo não deve reorganizar um projeto apenas para deixá-lo parecido com um padrão interno do Nexo.

---

# 34. Princípio 33 — Novas funcionalidades precisam justificar sua existência

Uma funcionalidade nova deve responder pelo menos a três perguntas:

1. Qual problema real ela resolve?
2. Ela preserva os princípios do Nexo?
3. Ela pertence ao core ou deveria ser uma extensão?

Isso ajuda a evitar crescimento descontrolado do produto.

---

# 35. Princípio 34 — Documentação é parte da engenharia

O Nexo será construído com participação intensa de agentes de IA.

Por isso, documentação não é apenas material de consulta.

Ela é parte do mecanismo de controle do produto.

As decisões importantes deverão estar documentadas.

Os contratos deverão estar documentados.

As regras deverão estar documentadas.

As exceções deverão estar documentadas.

Agentes futuros deverão conseguir entender o projeto sem depender exclusivamente de conversas anteriores.

---

# 36. Princípio 35 — Agentes devem seguir contratos, não improvisar

Nenhum agente de IA deve assumir que pode inventar uma solução simplesmente porque não encontrou uma especificação.

Quando uma parte importante do comportamento não estiver definida, o agente deverá procurar:

1. documentação existente;
2. contrato correspondente;
3. princípio do produto;
4. decisão registrada;
5. requisito específico;
6. somente então propor uma solução compatível.

O agente não deve transformar uma lacuna documental em uma decisão arquitetural silenciosa.

---

# 37. Princípio 36 — O Nexo deve ser verificável

Sempre que possível, comportamentos importantes deverão possuir formas objetivas de verificação.

Por exemplo:

```text
Detecção de stack
→ resultado verificável

Build
→ resultado verificável

Git commit
→ commit verificável

Alteração de componente
→ diff verificável

Deploy
→ estado verificável
```

Isso é especialmente importante quando o Nexo utilizar IA.

---

# 38. Princípio 37 — Precisão é mais importante que aparência de inteligência

O Nexo não precisa parecer inteligente.

Ele precisa ser correto.

Quando o sistema não sabe alguma coisa, deve admitir.

Quando a IA não tem contexto suficiente, deve detectar isso.

Quando um adapter não suporta determinada operação, deve informar.

É preferível uma resposta limitada e correta a uma resposta completa e inventada.

---

# 39. Princípio 38 — O produto deve crescer sem perder sua identidade

À medida que o Nexo receber:

- novos adapters;
- novos componentes;
- novas IAs;
- novos plugins;
- novos providers;
- novos recursos;

ele deve continuar obedecendo aos mesmos fundamentos.

Novas funcionalidades devem ampliar o Nexo.

Não devem redefinir silenciosamente aquilo que o Nexo é.

---

# 40. Regra final

Todos os documentos futuros do projeto deverão ser avaliados contra estes princípios.

Quando uma especificação futura contradizer este documento, o conflito deverá ser identificado explicitamente.

Uma decisão arquitetural pode eventualmente justificar uma exceção, mas essa exceção deverá ser documentada e não deve surgir silenciosamente durante a implementação.

O objetivo destes princípios é simples:

> **Construir um Nexo CMS que permaneça universal, controlável, transparente, extensível e fiel aos projetos que administra, mesmo quando sua complexidade crescer.**

---

# 41. Resumo dos princípios fundamentais

Os princípios centrais podem ser resumidos como:

```text
01. O projeto é soberano.
02. O Nexo se adapta ao projeto.
03. Entender antes de alterar.
04. Abstrair sem apagar a realidade.
05. Código é cidadão de primeira classe.
06. Visual e código devem permanecer relacionados.
07. Alterações devem ser reais.
08. Nada de Frankenstein visual.
09. Respeitar a linguagem do projeto.
10. Git é parte do estado do projeto.
11. Alterações devem ser revertíveis.
12. A IA trabalha dentro de limites.
13. A IA entende antes de executar.
14. Alterações importantes devem ser transparentes.
15. Segurança vem antes de conveniência.
16. O usuário deve saber onde está alterando.
17. Componentes são ativos reutilizáveis.
18. Reutilização não pode gerar acoplamento indevido.
19. Integrações devem ser extensíveis.
20. O core deve permanecer estável.
21. Portabilidade é obrigatória.
22. O Nexo deve ser agnóstico de provider.
23. Extensibilidade não justifica complexidade desnecessária.
24. Não inventar capacidades silenciosamente.
25. Falhar com clareza.
26. Preview não deve mentir.
27. Performance faz parte da qualidade.
28. Acessibilidade faz parte do produto.
29. Mobile é uma realidade.
30. Automação deve reduzir trabalho sem esconder trabalho.
31. Poder sem confusão.
32. Convenções existentes têm prioridade.
33. Funcionalidades devem resolver problemas reais.
34. Documentação é parte da engenharia.
35. Agentes devem seguir contratos.
36. O Nexo deve ser verificável.
37. Precisão é mais importante que aparência de inteligência.
38. O produto deve crescer sem perder sua identidade.
```