# NEXO CMS
## Core Invariants

## 1. Propósito

Este documento define as **invariantes fundamentais do Nexo CMS**.

Uma invariante é uma condição que deve permanecer verdadeira independentemente de:

- framework utilizado;
- adapter utilizado;
- provider de IA utilizado;
- ambiente de execução;
- tipo de projeto;
- plugin instalado;
- modo de edição;
- modo de IA;
- fornecedor de deploy;
- evolução futura do produto.

Estas regras possuem prioridade elevada.

Um agente de implementação, incluindo agentes do Kimi Agent Swarm, **não deve alterar, reinterpretar ou ignorar uma invariante para simplificar a implementação**.

Quando uma implementação parecer incompatível com uma invariante, o comportamento correto é interromper a decisão, identificar o conflito e procurar a documentação correspondente.

Não é permitido resolver conflitos fundamentais através de uma decisão silenciosa.

---

# 2. Invariante: o projeto real é a fonte primária da verdade

O projeto administrado pelo Nexo continua sendo o projeto real.

Representações internas como:

- Project Model;
- Project Graph;
- caches;
- índices;
- metadata;
- snapshots;
- estados do editor;

não substituem o projeto real.

A implementação não pode assumir que o banco ou metadata do Nexo contém uma representação suficiente para reconstruir o projeto caso os arquivos reais sejam diferentes.

A regra é:

```text id="5u3w0v"
SOURCE PROJECT
      ↓
NEXO UNDERSTANDING
      ↓
NEXO OPERATIONS
      ↓
SOURCE PROJECT
```

O Project Model representa o entendimento do Nexo sobre o projeto.

Ele não se torna automaticamente autoridade superior ao código real.

---

# 3. Invariante: alterações persistidas devem atingir o projeto real

Quando uma operação for apresentada ao usuário como salva, a alteração correspondente deve ter sido efetivamente persistida no projeto real.

Não é permitido:

```text id="hm8wb1"
UI atualizada
mas
arquivo não atualizado
```

nem:

```text id="5q4kph"
Nexo Database atualizado
mas
Source Project permanece diferente
```

O sistema deverá definir estados claros para:

- draft;
- unsaved;
- pending;
- applied;
- failed;
- reverted.

A interface nunca deve apresentar uma alteração como concluída quando ela apenas existe em memória.

---

# 4. Invariante: o Nexo não pode assumir um único stack

Nenhuma camada central do produto pode assumir:

```text id="7j8f6g"
Next.js = Project
```

ou:

```text id="30sm2v"
React = Project
```

ou qualquer outra tecnologia como estrutura universal.

O Core deve operar sobre conceitos abstratos e depender dos adapters para particularidades tecnológicas.

Se uma implementação exige lógica específica de um framework dentro do Core, deverá ser avaliado se essa lógica pertence ao adapter.

---

# 5. Invariante: diferenças entre tecnologias devem ser preservadas

O Project Model pode representar conceitos comuns entre stacks.

Entretanto, a implementação não pode destruir diferenças importantes entre tecnologias apenas para produzir uma abstração aparentemente mais simples.

Exemplo:

```text id="2di2cv"
React Component
```

não deve ser tratado como se fosse exatamente equivalente ao conceito de:

```text id="kw9kav"
Vue Component
```

em todos os detalhes.

O adapter deve preservar as semânticas específicas necessárias.

---

# 6. Invariante: adapters são a fronteira da especialização tecnológica

Sempre que uma operação depender profundamente de determinada tecnologia, essa especialização deverá preferencialmente existir em um adapter apropriado.

Exemplos de conhecimento potencialmente específico:

- localização de componentes;
- sistema de rotas;
- padrão de styling;
- build;
- configuração;
- convenções;
- transformação de código;
- package manager.

O Core não deve acumular conhecimento específico de todos os frameworks.

---

# 7. Invariante: desconhecimento não autoriza invenção

Se o Nexo não conseguir compreender uma estrutura, o resultado deve ser explicitamente classificado como desconhecido ou incerto.

Nunca fazer:

```text id="8c0h7k"
Não reconheci
↓
vou assumir que é X
↓
vou modificar
```

O comportamento esperado deve ser:

```text id="ixso3f"
Detectar
↓
Avaliar
↓
Classificar confiança
↓
Decidir se a operação é segura
↓
Somente então modificar
```

Quando uma operação exigir conhecimento que o sistema não possui, ela deve ser bloqueada, limitada ou apresentada como ação manual, conforme a política definida posteriormente.

---

# 8. Invariante: não alterar arquitetura por conveniência

O Nexo não pode:

- migrar framework;
- trocar sistema de styling;
- reorganizar arquitetura;
- substituir bibliotecas;
- converter componentes;
- introduzir uma nova estrutura;

apenas porque isso tornaria uma operação interna mais fácil.

Mudanças arquiteturais são uma categoria distinta de operação.

Devem possuir intenção explícita e documentação própria.

---

# 9. Invariante: o Nexo deve respeitar a linguagem do projeto

O Nexo deve buscar modificar cada projeto utilizando as convenções que já existem nele.

Exemplo:

```text id="8w0q8e"
Projeto
→ Tailwind
```

A operação visual deve preferir modificações compatíveis com Tailwind.

Outro:

```text id="61vv5y"
Projeto
→ CSS Modules
```

O Nexo deve preservar esse modelo.

Outro:

```text id="bsv2x1"
Projeto
→ styled-components
```

O Nexo deve preservar esse modelo.

A implementação específica dessas regras pertence aos adapters.

---

# 10. Invariante: não criar duplicação desnecessária

Antes de criar:

- componente;
- estilo;
- asset;
- integração;
- dependência;
- página;
- configuração;

o Nexo deverá, quando tecnicamente possível, verificar se já existe algo utilizável.

Exemplo:

```text id="aexw3q"
Pedido:
Adicionar botão

Pesquisa:
Existe Button reutilizável?
Existe componente equivalente?
Existe token aplicável?
```

A criação de novo código deve ser preferível apenas quando reutilização não for adequada.

---

# 11. Invariante: o editor visual não possui autoridade sobre a arquitetura

A interface visual não pode transformar automaticamente qualquer alteração de layout em uma reestruturação completa do projeto.

O editor deve respeitar as regras do projeto.

O fato de uma operação ser possível visualmente não significa que ela seja válida tecnicamente.

---

# 12. Invariante: código e representação visual devem convergir

Quando uma parte do projeto estiver representada visualmente no editor, a representação visual deve corresponder ao estado real conhecido do projeto.

Não deve existir uma realidade visual permanentemente divergente do código.

Quando houver divergência:

```text id="umw4h4"
Project State
≠
Editor State
```

o sistema deve representar essa divergência explicitamente.

---

# 13. Invariante: preview deve representar um estado identificável

Todo preview deve possuir um estado identificável.

Exemplos:

```text id="k2t9st"
Saved Project
Unsaved Changes
Draft
Preview Build
Production
```

O usuário nunca deve precisar adivinhar qual estado está visualizando.

---

# 14. Invariante: operações destrutivas devem ser controladas

Operações com potencial de:

- apagar arquivos;
- perder código;
- modificar produção;
- alterar branches;
- resetar estado;
- remover dependências;
- sobrescrever assets;

devem possuir proteção apropriada.

A IA não recebe passe livre para executar operações perigosas.

---

# 15. Invariante: Git não pode ser falsificado

Se o Nexo apresentar uma operação como:

```text id="dyz8v5"
Commit created
```

deverá existir realmente um commit correspondente no Git.

Se apresentar:

```text id="wt9k62"
Push successful
```

a operação correspondente deverá ter sido executada e validada.

O Nexo não deve manter uma simulação proprietária de Git apresentada como se fosse Git.

---

# 16. Invariante: o Nexo deve preservar a capacidade de trabalhar fora dele

Um projeto administrado pelo Nexo deve continuar podendo ser aberto por ferramentas externas.

O projeto não deve depender de:

- uma sessão ativa no Nexo;
- um banco interno do Nexo;
- um serviço exclusivo do Nexo;

para executar sua lógica básica, exceto quando o próprio projeto explicitamente depender de um serviço externo.

---

# 17. Invariante: IA não pode ignorar o contexto do projeto

Uma instrução genérica não deve ser executada como código genérico quando o projeto oferece contexto adicional.

Antes de realizar alterações significativas, a IA deverá considerar, quando disponível:

- stack;
- adapter;
- estrutura;
- arquivo;
- componente;
- estilo;
- dependências;
- testes;
- convenções;
- estado Git;
- pedido do usuário.

---

# 18. Invariante: IA deve respeitar o mesmo contrato do editor

A IA não possui uma “rota especial” para quebrar as regras do Nexo.

Uma alteração feita pela IA deve respeitar:

- adapters;
- project model;
- segurança;
- Git;
- validação;
- estilo do projeto;
- arquitetura do projeto.

A IA é mais uma forma de operar o Nexo.

Não é uma exceção à arquitetura.

---

# 19. Invariante: provider de IA é substituível

Nenhum provider específico pode ser tratado pelo Core como obrigatório.

A arquitetura deve permitir que:

```text id="m8cr0e"
AI Provider A
```

seja substituído por:

```text id="jlx0v6"
AI Provider B
```

sem alterar a lógica principal do produto.

A mesma regra se aplica à futura integração com Luna.

---

# 20. Invariante: provider não pode controlar o produto inteiro

Um AI Provider, Deployment Provider ou outro provider não pode definir o comportamento interno do Nexo.

Providers implementam contratos.

Eles não definem os contratos.

---

# 21. Invariante: componentes reutilizáveis devem possuir identidade

Um componente armazenado na biblioteca deve possuir uma identidade estável.

O Nexo precisa ser capaz de diferenciar:

```text id="6l1rx8"
Component A
```

de:

```text id="n1y7v1"
Component B
```

mesmo que possuam aparência semelhante.

Identidade será fundamental para:

- versionamento;
- atualização;
- dependências;
- compatibilidade;
- promoção;
- reutilização.

A forma técnica dessa identidade será especificada posteriormente.

---

# 22. Invariante: componente global não deve contaminar projeto automaticamente

Um componente da biblioteca global não deve modificar projetos consumidores automaticamente apenas porque recebeu uma nova versão.

Atualizações de componentes precisam de uma estratégia explícita de versionamento e atualização.

---

# 23. Invariante: projeto deve poder possuir componentes próprios

O Nexo não pode obrigar um projeto a utilizar somente a biblioteca global.

Um projeto pode possuir:

```text id="4zq1ry"
Global Components
+
Project Components
```

e os dois precisam poder coexistir.

---

# 24. Invariante: assets devem ser rastreáveis

Quando tecnicamente possível, o Nexo deve saber:

```text id="1c3j0l"
Onde um asset está?
Quem o utiliza?
Quantas referências existem?
```

Isso é importante para substituição, exclusão, otimização e diagnóstico.

---

# 25. Invariante: nenhuma alteração deve apagar referências silenciosamente

Ao modificar ou excluir:

- componentes;
- assets;
- rotas;
- dependências;

o sistema deverá considerar referências existentes.

Se a alteração puder quebrar outras partes do projeto, isso deve ser detectado ou explicitamente indicado.

---

# 26. Invariante: o Nexo deve distinguir estado conhecido de estado inferido

O sistema pode possuir informações com diferentes graus de certeza.

Por exemplo:

```text id="bqqbsi"
Known
Detected
Inferred
Unknown
Unsupported
```

A implementação não deve tratar inferências como fatos absolutos quando a precisão for relevante.

---

# 27. Invariante: logs e auditoria não podem mentir

Se o sistema registrar:

```text id="2m0bj7"
AI modified Hero.tsx
```

essa operação deve ter ocorrido.

Logs devem representar eventos reais, não eventos desejados.

---

# 28. Invariante: falha parcial deve permanecer visível

Se uma operação executar parcialmente:

```text id="d0eijg"
3 arquivos alterados
2 falharam
```

o sistema não deve mostrar:

```text id="u8li3l"
Success
```

como se toda a operação tivesse sido concluída.

Estados parciais devem ser representados explicitamente.

---

# 29. Invariante: validação deve ocorrer após mudanças críticas

Quando uma alteração puder afetar execução do projeto, deverá existir um mecanismo de validação apropriado.

Dependendo da situação, isso poderá incluir:

- typecheck;
- lint;
- build;
- tests;
- preview;
- análise de dependências;
- validação específica do adapter.

A validação exata será definida por operação e adapter.

---

# 30. Invariante: build do projeto pertence ao projeto

O Nexo não pode presumir que existe uma única forma universal de gerar um build.

O adapter ou mecanismo de descoberta correspondente deve identificar:

- comando;
- ferramenta;
- ambiente;
- requisitos;
- saída.

---

# 31. Invariante: terminal e comandos devem respeitar o Runtime

Operações de terminal devem ser executadas através do Runtime responsável pelo projeto.

O CMS não deve simular comandos.

Quando um comando for apresentado como executado, deverá ter sido realmente enviado ao ambiente correspondente.

---

# 32. Invariante: ambiente do projeto deve ser explícito

O Nexo deverá distinguir adequadamente ambientes quando existirem.

Por exemplo:

```text id="hclq6i"
Development
Preview
Staging
Production
```

Uma ação destinada a um ambiente não deve ser executada silenciosamente em outro.

---

# 33. Invariante: deploy deve ser verificável

Quando um deploy for apresentado como concluído, deverá existir evidência suficiente para identificar que a operação foi executada.

Sempre que possível:

```text id="q1b1yh"
Build
→ Deploy
→ Verification
```

---

# 34. Invariante: plugins não podem quebrar arbitrariamente o Core

O sistema de plugins deverá possuir fronteiras claras.

Um plugin não deve obter automaticamente todos os poderes do sistema apenas por estar instalado.

Permissões e capacidades deverão ser explícitas.

---

# 35. Invariante: documentação deve acompanhar a implementação

Quando uma decisão estrutural for implementada, sua documentação correspondente deve poder refletir a realidade.

Não queremos:

```text id="h2f83w"
Documentation:
A

Implementation:
B
```

sem que a divergência esteja registrada.

---

# 36. Invariante: agentes devem respeitar a documentação existente

Agentes de IA trabalhando no Nexo devem tratar a documentação como contexto oficial.

Antes de inventar uma solução, devem procurar:

1. contrato correspondente;
2. princípio;
3. invariante;
4. decisão;
5. especificação da área;
6. documentação de adapter.

A ausência de uma resposta não deve ser interpretada automaticamente como autorização para criar qualquer solução.

---

# 37. Invariante: pesquisa externa deve ser baseada em fontes reais

Quando uma tarefa depender de comportamento de:

- framework;
- API;
- biblioteca;
- serviço;
- protocolo;
- ferramenta;
- plataforma;

o agente deverá consultar documentação oficial ou fontes técnicas confiáveis quando houver necessidade de confirmação.

Informações relacionadas a versões atuais não devem ser presumidas a partir de conhecimento antigo.

Quando uma decisão depender de comportamento de terceiros, o documento correspondente deverá registrar a fonte utilizada quando apropriado.

---

# 38. Invariante: versões importam

O comportamento de uma tecnologia pode variar entre versões.

O Nexo não deve tratar:

```text id="eaacpm"
Next.js
```

como uma especificação suficiente quando determinada operação depende de uma versão específica.

Sempre que a versão for relevante, ela deverá fazer parte do contexto.

O mesmo se aplica a:

- Node;
- package managers;
- bibliotecas;
- APIs;
- ferramentas de build;
- providers.

---

# 39. Invariante: compatibilidade deve ser declarada

Uma operação deve deixar claro quando depende de determinada combinação de:

- stack;
- versão;
- adapter;
- dependência;
- runtime.

Não deve ser apresentada como universal quando não é.

---

# 40. Invariante: desenvolvimento do Nexo não pode antecipar decisões não tomadas

Quando a documentação ainda não definiu:

- tecnologia;
- banco;
- framework;
- protocolo;
- provider;
- estrutura;

um agente não deve apresentar uma escolha arbitrária como arquitetura oficial.

Deve respeitar o status da decisão.

---

# 41. Invariante: decisões estruturais precisam de justificativa

Quando for necessário escolher uma tecnologia ou arquitetura, a decisão deverá ser acompanhada de justificativa baseada em:

- requisitos;
- trade-offs;
- compatibilidade;
- manutenção;
- segurança;
- performance;
- extensibilidade.

A implementação não deve ser decidida apenas por preferência pessoal do agente.

---

# 42. Invariante: simplicidade é preferível quando capacidades forem equivalentes

Se duas soluções satisfazem os mesmos requisitos e uma apresenta:

- menor complexidade;
- menor acoplamento;
- menor risco;
- menor manutenção;

ela deve ser considerada preferencial, salvo justificativa contrária.

---

# 43. Invariante: capacidade futura não é obrigação presente

A arquitetura pode ser preparada para:

- novos adapters;
- novos providers;
- SaaS;
- marketplace;
- novos ambientes;
- novas tecnologias.

Mas não se deve implementar complexidade futura sem necessidade atual apenas porque ela pode existir algum dia.

---

# 44. Invariante: o Core deve permanecer tecnologicamente neutro sempre que possível

O Core pode depender de tecnologias próprias do Nexo.

Porém, seus contratos e modelos conceituais não devem depender desnecessariamente de detalhes de um único projeto suportado.

A neutralidade deve ser preservada onde ela fizer sentido.

---

# 45. Invariante: o Nexo não deve ser uma máquina de sobrescrever arquivos

Operações de edição devem ser contextuais.

A estratégia:

```text id="vyp96l"
find text
replace text
write file
```

não pode ser considerada suficiente para operações complexas quando houver estrutura, AST, parser, component model ou outro mecanismo mais seguro disponível.

A tecnologia apropriada para cada operação deverá ser decidida posteriormente.

---

# 46. Invariante: a implementação deve preferir mecanismos semânticos quando disponíveis

Quando uma alteração depender de entendimento estrutural, deve-se preferir mecanismos capazes de representar estrutura.

Exemplos conceituais:

- AST;
- parser;
- component model;
- route graph;
- dependency graph;
- asset graph.

O uso desses mecanismos específicos deverá ser decidido nos documentos técnicos correspondentes.

---

# 47. Invariante: não adicionar capacidade ao projeto apenas para satisfazer o Nexo

O Nexo não deve modificar o projeto simplesmente para tornar sua própria implementação mais fácil.

Exemplo conceitual proibido:

```text id="t9v1df"
Nexo precisa de metadata
↓
injeta metadata no projeto automaticamente
↓
projeto passa a depender da metadata
```

sem uma decisão explícita de arquitetura.

Qualquer modificação auxiliar feita no projeto deverá possuir justificativa real e documentada.

---

# 48. Invariante: o usuário mantém autoridade sobre o projeto

O usuário ou equipe responsável pelo projeto deve manter controle sobre:

- arquivos;
- Git;
- integrações;
- ambiente;
- deploy;
- IA;
- permissões.

O Nexo é uma ferramenta de operação.

Não é proprietário do projeto.

---

# 49. Invariante: o sistema deve ser observável

Operações importantes devem produzir sinais observáveis suficientes para diagnóstico.

Isso inclui, conforme o caso:

- logs;
- eventos;
- histórico;
- diff;
- status;
- erros;
- resultados de validação.

Uma operação importante não deve desaparecer sem vestígio quando falhar.

---

# 50. Invariante: toda parte do sistema deve possuir uma responsabilidade clara

Cada módulo deve ter responsabilidade definida.

O mesmo comportamento não deve ser implementado duplicadamente em:

```text id="t4rbzr"
CMS
+
Engine
+
Runtime
+
Adapter
```

sem motivo.

A separação exata das responsabilidades será definida na arquitetura do sistema, mas a regra geral permanece:

> **uma responsabilidade deve possuir uma autoridade clara.**

---

# 51. Invariante: contratos devem ser estáveis

Quando duas partes do Nexo estiverem conectadas através de um contrato, mudanças nesse contrato deverão ser tratadas cuidadosamente.

Isso é especialmente importante para:

- adapters;
- providers;
- plugins;
- runtime;
- AI;
- components.

Alterações incompatíveis não devem ocorrer silenciosamente.

---

# 52. Invariante: o produto deve poder evoluir sem reescrever sua identidade

O Nexo poderá crescer muito.

Poderá ganhar:

- SaaS;
- marketplace;
- novos adapters;
- mais IAs;
- deploy providers;
- ferramentas;
- componentes.

Entretanto, as invariantes fundamentais deverão continuar orientando o produto.

---

# 53. Hierarquia de resolução de conflitos

Quando duas instruções ou decisões entrarem em conflito, o agente deve seguir esta ordem de prioridade:

```text id="t2fl2m"
1. Segurança e integridade do projeto
2. Core Invariants
3. Decisões arquiteturais aprovadas
4. Contratos
5. Requisitos do produto
6. Especificação da área
7. Preferências de implementação
8. Conveniência local
```

Uma preferência de implementação nunca deve superar uma invariante.

---

# 54. Regra especial para agentes do K3 Swarm

Os agentes responsáveis pela implementação do Nexo devem tratar este documento como um conjunto de **restrições de preservação**, e não como sugestões.

Antes de implementar uma solução estrutural, o agente deverá verificar:

```text id="jl4n26"
A solução:
✓ preserva o projeto real?
✓ respeita o adapter?
✓ mantém portabilidade?
✓ preserva Git?
✓ não inventa suporte?
✓ não quebra a arquitetura do projeto?
✓ mantém rastreabilidade?
✓ respeita segurança?
✓ mantém a possibilidade de substituição de providers?
```

Se alguma resposta for negativa, a solução deve ser reconsiderada.

---

# 55. Regra para pesquisa técnica durante implementação

Quando uma implementação depender de informação externa que possa variar ou que seja suficientemente específica para gerar risco de erro, o agente deverá pesquisar antes de decidir.

A pesquisa deve priorizar:

1. documentação oficial;
2. especificações oficiais;
3. documentação do fornecedor;
4. repositórios oficiais;
5. fontes técnicas confiáveis.

O agente não deve inventar APIs, parâmetros, comportamentos de versões ou capacidades de ferramentas.

Quando uma decisão depender dessa pesquisa, a implementação deverá registrar a informação necessária para permitir sua verificação posteriormente.

---

# 56. Estado deste documento

As regras deste documento são consideradas **CORE INVARIANTS**.

Elas devem ser preservadas enquanto o produto evolui.

Uma futura alteração em uma destas regras deverá possuir:

- motivo;
- impacto;
- justificativa;
- decisão registrada;
- atualização desta documentação;
- análise das partes afetadas.

Nenhum agente deve alterar uma Core Invariant silenciosamente.

---

# 57. Princípio final

O Nexo CMS será uma plataforma poderosa porque terá acesso ao projeto real, ao Git, ao Runtime, à IA e às ferramentas de desenvolvimento.

Essa mesma capacidade torna fundamental possuir limites claros.

As invariantes existem para garantir que poder não se transforme em imprevisibilidade.

> **O Nexo pode modificar profundamente um projeto quando isso for solicitado e permitido. Ele nunca deve modificar silenciosamente os princípios que tornam esse projeto confiável, portátil e compreensível.**