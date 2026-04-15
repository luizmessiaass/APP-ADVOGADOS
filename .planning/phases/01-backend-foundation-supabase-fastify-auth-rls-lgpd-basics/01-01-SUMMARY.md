---
plan: 01-01
phase: 01
status: complete
tasks_completed: 2
tasks_total: 2
---

# Plan 01-01 Summary: Monorepo Scaffold + Fastify Project Init

## What Was Built

**Task 1 — Monorepo pnpm + dependências:**
- `pnpm-workspace.yaml` — workspaces `apps/*` e `supabase/functions/*`
- `package.json` (raiz) — scripts de workspace, husky, lint-staged
- `apps/api/package.json` — Fastify 5.8.5, supabase-js 2.103.0, jose 6.2.2, BullMQ 5.73.5, pino 10.3.1, Sentry 10.48.0, envalid 8.1.1, vitest 4.1.4
- `apps/worker/package.json` — BullMQ 5.73.5, ioredis 5.10.1, Sentry, envalid
- `apps/api/tsconfig.json` e `apps/worker/tsconfig.json` — TypeScript strict, target ES2022
- `.eslintrc.json` — @typescript-eslint/recommended, no-explicit-any: error
- `.prettierrc.json` — semi: false, singleQuote: true, printWidth: 100
- `docker-compose.yml` — redis:alpine na porta 6379
- `.gitignore` — node_modules, dist, .env excluídos (entradas Android preservadas)
- `pnpm-lock.yaml` — lockfile gerado por `pnpm install`

**Task 2 — Config + Vitest + Test stubs:**
- `apps/api/src/config.ts` — `cleanEnv()` com 8 variáveis; processo falha fast se ausentes
- `apps/api/.env.example` — template sem secrets reais
- `apps/worker/src/config.ts` — subset de variáveis para o worker
- `backend/vitest.config.ts` — config canonical Wave 0; `include: apps/api/src/**/*.test.ts`
- `apps/api/src/tests/setup.ts` — env vars de teste pré-configuradas
- `apps/api/src/tests/fixtures.ts` — TENANT_A, TENANT_B, USER_ADMIN_A, USER_ADMIN_B
- `apps/api/src/tests/cross-tenant.test.ts` — STUB para Plan 08
- `apps/api/src/tests/lgpd.test.ts` — STUB para Plan 05

## Verification Results

```
vitest run --config backend/vitest.config.ts
✓ cross-tenant.test.ts > STUB: tenant A nao consegue ler dados do tenant B
✓ lgpd.test.ts > STUB: CPF nao aparece em logs de request
Test Files: 2 passed (2)
Tests: 2 passed (2)
```

## Key Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Workspace root — fundação do monorepo |
| `apps/api/src/config.ts` | Env var validation — fail-fast na boot |
| `backend/vitest.config.ts` | Test runner config — Wave 0 para todas as plans |
| `apps/api/src/tests/fixtures.ts` | Shared test fixtures — tenants fictícios |

## Self-Check: PASSED

- ✅ pnpm install executou sem erros
- ✅ Versões do standard_stack corretas (Fastify 5.8.5, vitest 4.1.4, etc.)
- ✅ vitest reporta "2 passed, 0 failed"
- ✅ .gitignore inclui .env e node_modules/
- ✅ Nenhum arquivo Android tocado
