# NEXO CMS — INVARIANT LIST (51 Core Invariants)
> Fonte: Core Invariants doc (seções 2–52) via GROUP-A summary. Qualquer código que viole uma invariante está errado por definição. Hierarquia de conflitos: Segurança/integridade > Core Invariants > Decisões arquiteturais > Contratos > Requisitos > Especificação > Preferências > Conveniência.

1. O projeto real é a fonte primária da verdade.
2. Alterações persistidas devem atingir o projeto real (draft/unsaved/pending/applied/failed/reverted).
3. O Nexo não pode assumir um único stack.
4. Diferenças entre tecnologias devem ser preservadas.
5. Adapters são a fronteira da especialização tecnológica.
6. Desconhecimento não autoriza invenção.
7. Não alterar arquitetura por conveniência.
8. Respeitar a linguagem do projeto.
9. Não criar duplicação desnecessária.
10. Editor visual não tem autoridade sobre arquitetura.
11. Código e representação visual devem convergir.
12. Preview deve representar estado identificável.
13. Operações destrutivas devem ser controladas.
14. Git não pode ser falsificado.
15. Preservar capacidade de trabalhar fora do Nexo.
16. IA não pode ignorar contexto do projeto.
17. IA respeita o mesmo contrato do editor (sem rota especial).
18. Provider de IA é substituível.
19. Provider não controla o produto.
20. Componentes reutilizáveis têm identidade estável.
21. Componente global não contamina projeto automaticamente.
22. Projeto pode ter componentes próprios.
23. Assets devem ser rastreáveis.
24. Nenhuma alteração apaga referências silenciosamente.
25. Distinguir conhecido de inferido (Known/Detected/Inferred/Unknown/Unsupported).
26. Logs e auditoria não podem mentir.
27. Falha parcial permanece visível.
28. Validação após mudanças críticas.
29. Build do projeto pertence ao projeto.
30. Terminal/comandos respeitam o Runtime (sem simulação).
31. Ambiente explícito (dev/preview/staging/production).
32. Deploy verificável (Build→Deploy→Verification).
33. Plugins não quebram o Core.
34. Documentação acompanha implementação.
35. Agentes respeitam documentação existente.
36. Pesquisa externa em fontes reais.
37. Versões importam.
38. Compatibilidade declarada.
39. Não antecipar decisões não tomadas.
40. Decisões estruturais precisam justificativa.
41. Simplicidade preferível em capacidades equivalentes.
42. Capacidade futura ≠ obrigação presente.
43. Core tecnologicamente neutro.
44. Não ser máquina de sobrescrever arquivos.
45. Preferir mecanismos semânticos (AST/parser/graphs).
46. Não adicionar capacidade ao projeto para satisfazer o Nexo.
47. Usuário mantém autoridade sobre o projeto.
48. Sistema observável.
49. Toda parte tem responsabilidade/autoridade clara.
50. Contratos estáveis.
51. Evoluir sem reescrever a identidade.

## Checklist K3 (antes de solução estrutural)
Preserva o projeto real? Respeita o adapter? Mantém portabilidade? Preserva Git? Não inventa suporte? Não quebra arquitetura do projeto? Mantém rastreabilidade? Respeita segurança? Mantém substituibilidade de providers? Qualquer "não" → reconsiderar.

## Regras operacionais supremas (docs 13/15 + guia)
- No Fake Success / No Fake Validation: HTTP 200, "model said done", arquivo existe ≠ prova. Validar condição real.
- Definition of Done: capability + programmatic path + authorization + errors + tests + real-project validation + zero corruption path conhecido.
- Definition of Done de área (§81): documentação + integração à arquitetura + operação sobre projeto real + estados + erros + verificabilidade + testes + zero Core Invariant violada.
- Gates de merge: typecheck + tests + lint + contract + review.
