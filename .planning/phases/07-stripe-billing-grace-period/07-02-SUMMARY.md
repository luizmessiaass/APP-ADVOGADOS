---
phase: 07-stripe-billing-grace-period
plan: 02
subsystem: billing
tags: [entitlement, middleware, fastify-plugin, redis-cache, tdd]
dependency_graph:
  requires:
    - apps/api/src/plugins/entitlement.test.ts (from 07-01)
  provides:
    - apps/api/src/plugins/entitlement.ts
    - apps/api/src/plugins/auth.ts (super_admin role)
    - apps/api/src/server.ts (entitlementPlugin registered)
  affects:
    - All protected API endpoints (gated by HTTP 402 on suspended/read_only)
tech_stack:
  added:
    - entitlement.ts Fastify plugin with Redis 30s TTL cache
    - invalidateTenantStatusCache() export for webhook + admin use
    - super_admin added to TenantUser.role union
  patterns:
    - Fail-closed: DB error treated as suspended (T-7-05)
    - ENTITLEMENT_SKIP_ROUTES for public endpoints (health, auth, webhook, tenant/status)
    - Redis setex cache miss → supabaseAdmin query → cache set
key_files:
  created:
    - apps/api/src/plugins/entitlement.ts
  modified:
    - apps/api/src/plugins/auth.ts
    - apps/api/src/server.ts
    - apps/api/src/plugins/entitlement.test.ts
commits:
  - a6fc723 feat(07-02): entitlement plugin — HTTP 402 gate with Redis cache + fail-closed DB fallback
  - ccf4760 feat(07-02): extend TenantUser with super_admin + register entitlementPlugin in server.ts
tests_status: 10/10 entitlement tests + 15/15 auth tests passing
---

## Plan 07-02: Entitlement Middleware Plugin

### O que foi entregue

**Task 1 — entitlement.ts plugin (TDD GREEN):**
- `entitlement.ts` Fastify plugin com gate HTTP 402 para endpoints protegidos
- Status `suspended` → bloqueia TODOS os métodos com `{ error: 'subscription_required' }`
- Status `read_only` → bloqueia apenas POST/PUT/PATCH/DELETE; GET passa
- Status `active`, `grace`, `trial`, `pending` → passam sem bloqueio
- Cache Redis 30s via `setex`; cache miss → consulta `supabaseAdmin.from('escritorios')` → cacheia
- Fail-closed: erro de DB ou linha ausente tratado como `suspended` (thread T-7-05)
- `ENTITLEMENT_SKIP_ROUTES`: health, auth, webhook, tenant/status excluídos do gate
- Exporta `invalidateTenantStatusCache(escritorioId)` para uso no webhook handler e endpoint admin

**Task 2 — TenantUser + server.ts:**
- `auth.ts`: `super_admin` adicionado à union `TenantUser.role` (referência T-7-06)
- `server.ts`: `entitlementPlugin` registrado após `authPlugin` com `createBullMQRedisClient()`
- Comentários STRIDE IDs T-7-04 e T-7-06 presentes

### Testes
- 10/10 testes `entitlement.test.ts` passando (todos os comportamentos BILLING-05)
- 15/15 testes `auth.test.ts` passando

### Requisitos cobertos
- BILLING-05: Gate de entitlement implementado via plugin Fastify

## Self-Check: PASSED
