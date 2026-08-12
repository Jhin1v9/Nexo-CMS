# NEXO CMS — OPEN QUESTIONS / UNKNOWN STATES
> Regra: UNKNOWN/UNSUPPORTED preferível a inventar. Itens aqui NÃO podem ser decididos silenciosamente.

## Resolvidos nesta sessão
- [x] Stack do Nexo: não especificada nos docs → seleção formal §51 executada → ver STACK-DECISION.md.

## Abertos (adiados pelos próprios docs — não inventar)
1. Protocolo do Control Plane (REST/RPC/GraphQL) — docs não fixam. M1 usa HTTP+JSON simples (justificativa: simplicidade, Inv. 41) documentada em STACK-DECISION.md. Revisitar quando Agent API formal for escrita.
2. Tecnologia de auth/policy engine definitiva — Permission Model adia para Security Architecture. M1: boundary de autorização interno com contexto explícito; tokens/sessões formais depois.
3. Schemas autoritativos de capabilities — pertencem ao doc 06 (contratos detalhados a extrair por domínio na implementação de cada um).
4. Lib Git concreta (isomorphic-git vs nodegit vs CLI) — decidir em M2 com pesquisa oficial; docs exigem Git real.
5. Merge de conflitos de edição (Editor) — "source-editing subsystem" não detalhado [AMBIGUO no doc 07].
6. SGBD: docs deixam aberto com Repository Pattern obrigatório → STACK-DECISION.md escolhe padrão local; remoto futuro sem reescrita do Domain.
7. Precedência Allow vs Deny em políticas compostas; jobs long-running pós-revogação; hierarquia definitiva de políticas — deferidos a Security Architecture [AMBIGUO nos docs].
8. PROMPT_EXECUCAO_KIMI_K3_LUNA_v3 — especifica correção do kernel Luna v3 legado; [REQUER CÓDIGO LEGADO NÃO ENVIADO] — não executável nesta sessão. Tratar como spec futura de integração Luna (doc 11).
9. Providers do primeiro release (deploy/AI) — não fixados.
10. Natureza exata da Luna (provider de modelo vs agente com execução própria) — [AMBIGUO no doc 11].

## Registro de decisões desta sessão
- D1: Stack — ver STACK-DECISION.md (processo §51, versões verificadas em docs oficiais).
