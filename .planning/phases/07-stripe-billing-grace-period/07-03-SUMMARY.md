---
phase: 07-stripe-billing-grace-period
plan: 03
subsystem: billing
tags: [tdd, webhook, grace-period, admin, redis-cache, security]
dependency_graph:
  requires:
    - apps/api/src/plugins/entitlement.ts (from 07-02)
    - supabase/migrations/0009_billing_schema.sql (from 07-01)
    - apps/api/src/routes/webhooks/billing.test.ts (from 07-01 — stubs)
    - apps/api/src/services/billing/grace-period.test.ts (from 07-01 — stubs)
    - apps/api/src/tests/billing-suspension.test.ts (from 07-01 — stubs)
  provides:
    - apps/api/src/services/billing/grace-period.ts
    - apps/api/src/routes/webhooks/billing.ts
    - apps/api/src/routes/admin/tenants.ts
  affects:
    - apps/api/src/config.ts (BILLING_WEBHOOK_SECRET adicionado)
    - apps/api/src/plugins/auth.ts (requireSuperAdmin helper)
    - apps/api/src/server.ts (rotas admin e webhook registradas)
tech_stack:
  added:
    - grace-period.ts — pure state machine para transições Day 0/3/7/14
    - webhookBillingRoutes — POST /api/webhooks/billing com timingSafeEqual (T-7-08)
    - adminTenantsRoutes — 3 endpoints super_admin gated com supabaseAdmin
    - requireSuperAdmin — helper de guard para routes super_admin-only
  patterns:
    - TDD GREEN phase (stubs do Plan 01 viram testes reais e passam)
    - crypto.timingSafeEqual para constant-time secret comparison
    - ON CONFLICT DO NOTHING (idempotency) via RETURNING vazio
    - Redis cache invalidation explícita após cada mudança de status
key_files:
  created:
    - apps/api/src/services/billing/grace-period.ts
    - apps/api/src/routes/webhooks/billing.ts
    - apps/api/src/routes/admin/tenants.ts
  modified:
    - apps/api/src/config.ts
    - apps/api/src/plugins/auth.ts
    - apps/api/src/server.ts
    - apps/api/src/routes/webhooks/billing.test.ts
    - apps/api/src/services/billing/grace-period.test.ts
    - apps/api/src/tests/billing-suspension.test.ts
decisions:
  - UUID nos testes deve ser RFC 4122 válido (ex 'a0000000-0000-4000-8000-000000000001') — Zod z.string().uuid() rejeita UUIDs com octetos fora do padrão hex
  - timingSafeEqual requer buffers de mesmo tamanho — secret com tamanho diferente retorna 401 sem comparação
  - resolveGracePeriod() sempre retorna o conjunto completo de reset — pagamento bem-sucedido sempre reseta completamente
metrics:
  duration_minutes: 35
  completed_date: "2026-04-16T14:10:00Z"
  tasks_completed: 2
  files_created: 3
  files_modified: 6
---

# Phase 07 Plan 03: Webhook Billing Receiver + Admin Tenant Endpoints Summary

Webhook receiver POST /api/webhooks/billing com validação de secret por timingSafeEqual e idempotência por ON CONFLICT, mais 3 endpoints super_admin-gated para gestão de tenants, mais serviço puro de transições grace period — completando a camada de API de billing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | grace-period.ts + webhook receiver | 7cf3ba2 | grace-period.ts, billing.ts, config.ts, billing.test.ts, grace-period.test.ts |
| 2 | admin tenants endpoints | 0f55dc0 | admin/tenants.ts, auth.ts, server.ts, billing-suspension.test.ts |

## What Was Built

### Task 1: grace-period.ts + Webhook Receiver

**`apps/api/src/services/billing/grace-period.ts`** — Serviço puro (zero I/O):

- `GracePeriodState`: `{ status, graceBanner, gracePeriodStartedAt, daysSinceStart }`
- `gracePeriodStateTransition(state)` — retorna array de ações por dia:
  - Day 0: `set_status(grace)` + `send_email(day_0)` — só se não estiver já em grace+
  - Day 3: `set_grace_banner(true)` — sem email no dia 3 (per D-08)
  - Day 7: `set_status(read_only)` + `send_email(day_7)`
  - Day 14: `set_status(suspended)` + `send_email(day_14)`
  - Idempotência: guards verificam `state.status` e `state.graceBanner` antes de emitir ações
- `resolveGracePeriod()` — retorna `[set_status(active), set_grace_banner(false), clear_grace_period_started_at]`

**`apps/api/src/routes/webhooks/billing.ts`** — POST /api/webhooks/billing:

- `skipAuth: true` — server-to-server, sem JWT
- T-7-08: `crypto.timingSafeEqual` para comparação constant-time do X-Webhook-Secret
- Secret ausente ou de tamanho diferente → 401 `INVALID_WEBHOOK_SECRET`
- Validação Zod do payload (event enum, tenant_id UUID, event_id, occurred_at)
- T-7-09: INSERT `billing_events` com `.select('id')` — RETURNING vazio = duplicata → 200 `already_processed`
- `payment.failed`: UPDATE `escritorios` status→grace onde NOT IN (grace, read_only, suspended)
- `payment.succeeded`: UPDATE `escritorios` status→active + grace_period_started_at=null + grace_banner=false
- Invalida Redis cache via `invalidateTenantStatusCache` em todos os caminhos

**`apps/api/src/config.ts`**: `BILLING_WEBHOOK_SECRET: str({ default: '' })` adicionado ao `cleanEnv`.

### Task 2: Admin Tenant Endpoints

**`apps/api/src/routes/admin/tenants.ts`** — 3 rotas super_admin-only:

- `GET /api/v1/admin/tenants` — lista todos com `supabaseAdmin` (bypass RLS intencional + guard explícito — T-7-10)
- `PATCH /api/v1/admin/tenants/:id/status` — muda status + loga `billing_events` (audit trail) + invalida Redis
  - T-7-11: Zod enum validation rejeita status fora do conjunto válido
- `POST /api/v1/admin/tenants/:id/grace/resolve` — resolve grace manualmente + loga `payment.succeeded` em `billing_events`
- BILLING-07: nenhum endpoint deleta linhas de processos, movimentacoes ou usuarios — suspensão é flag em `escritorios`

**`apps/api/src/plugins/auth.ts`**: `requireSuperAdmin(request, reply)` helper exportado.

**`apps/api/src/server.ts`**: `webhookBillingRoutes` e `adminTenantsRoutes` registrados com prefixos corretos, reutilizando `entitlementRedis`.

### Testes (TDD GREEN)

- `grace-period.test.ts`: 6/6 — Day 0/3/7/14 + resolveGracePeriod + idempotência
- `billing.test.ts`: 4/4 — BILLING-03 (secret ausente/errado→401), BILLING-04 (idempotência→already_processed)
- `billing-suspension.test.ts`: 2/2 — BILLING-07 (sem deleção de dados, super_admin vê tenant suspenso)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UUID inválido em VALID_PAYLOAD nos testes**
- **Found during:** Task 1 — testes retornavam 400 inesperado
- **Issue:** `'00000000-0000-0000-0000-000000000001'` não passa na validação `z.string().uuid()` do Zod — o Zod v3 usa regex UUID RFC 4122 estrita
- **Fix:** Alterado para `'a0000000-0000-4000-8000-000000000001'` (UUID válido)
- **Files modified:** `apps/api/src/routes/webhooks/billing.test.ts`
- **Commit:** 7cf3ba2

**2. [Observation] vi.clearAllMocks() em beforeEach**
- **Found during:** Task 1 — análise dos testes
- **Issue:** `clearAllMocks` limpa implementações de mocks inline; mocks de módulos via `vi.mock()` factory permanecem — comportamento correto documentado
- **Action:** Nenhuma mudança necessária — comportamento é o esperado

## Known Stubs

Nenhum stub remanescente neste plano. Os 3 arquivos de teste stub do Plan 01 foram todos convertidos para TDD GREEN:

| Arquivo | Status |
|---------|--------|
| billing.test.ts | Verde — 4/4 |
| grace-period.test.ts | Verde — 6/6 |
| billing-suspension.test.ts | Verde — 2/2 |

O arquivo `grace-period.test.ts` (que o Plan 01 marcou para Plan 04) foi adiantado para este plano pois a implementação do módulo foi feita aqui conforme o plano 03 define.

## Threat Flags

Nenhuma nova superfície de segurança além do planejado no threat model do plano.

Mitigações aplicadas conforme threat register:
- T-7-08: `timingSafeEqual` presente em `billing.ts` — verificado
- T-7-09: RETURNING vazio = idempotência em nível de handler — verificado
- T-7-10: `supabaseAdmin` com guard `super_admin` explícito em 3 handlers — verificado
- T-7-11: Zod enum validation em PATCH status — verificado

## Self-Check: PASSED

Arquivos criados:
- FOUND: apps/api/src/services/billing/grace-period.ts
- FOUND: apps/api/src/routes/webhooks/billing.ts
- FOUND: apps/api/src/routes/admin/tenants.ts

Commits verificados:
- 7cf3ba2: feat(07-03): grace-period service + webhook billing receiver (Task 1)
- 0f55dc0: feat(07-03): admin tenants endpoints + requireSuperAdmin helper (Task 2)
