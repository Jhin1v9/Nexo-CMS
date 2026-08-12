# NEXO CMS — M1 FOUNDATION

Monorepo pnpm workspaces. Contratos e regras: ver [SPEC.md](./SPEC.md) e [.nexo-knowledge/STACK-DECISION.md](./.nexo-knowledge/STACK-DECISION.md).

## Stack

Node >= 20 · TypeScript ^6 (strict, ESM/NodeNext) · Vitest 4 · zod 4 · pnpm 10.

## Layout (M1)

- `packages/shared` — tipos puros: `Result`, `NexoError`, `ErrorCode`, `Confidence`, `SupportLevel`, `OpStatus`, `Detection<T>` + helpers `ok()/err()/newOperationId()`. Zero deps de runtime.
- `packages/core` — `CapabilityContract`, `CapabilityId`, `DomainEvent`, `ExecutionContext`, `Actor`. Deps: `@nexo/shared`, `zod`.

Demais packages/apps (security, runtime, storage, adapters, intelligence, control-plane, apps/*) chegam nas Waves 2–4 conforme SPEC.

## Comandos

```bash
pnpm install
pnpm -r build       # tsc project references -> dist/
pnpm -r test        # vitest run (consome src diretamente, sem build)
pnpm -r typecheck   # tsc --noEmit (src + test)
```
