---
phase: 02-datajud-integration-sync-worker
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - apps/api/src/datajud/cnj-validator.ts
  - apps/api/src/datajud/tribunal-map.ts
  - apps/api/src/datajud/types.ts
  - apps/api/src/datajud/adapter.ts
  - apps/api/src/datajud/circuit-breaker.ts
  - apps/api/src/workers/datajud-sync.ts
  - apps/api/src/workers/scheduler.ts
  - apps/api/src/queues/datajud-queue.ts
  - apps/api/src/routes/processos.ts
  - apps/api/src/server.ts
  - apps/api/src/lib/__tests__/circuit-breaker.test.ts
  - apps/api/src/routes/__tests__/processos.test.ts
  - apps/api/src/workers/__tests__/datajud-worker.test.ts
  - apps/api/src/workers/__tests__/diff.test.ts
  - supabase/migrations/0006_datajud_schema.sql
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the full DataJud integration layer: CNJ validator, tribunal map, Zod type schemas, adapter error types, circuit breaker, step-job worker, tier scheduler, BullMQ queue, processos routes, server bootstrap, and the complete test suite (4 test files), plus the Supabase migration.

The core architecture is sound — the step-job checkpoint pattern, circuit breaker with Redis persistence, idempotent diff via `datajud_id`/`hash_conteudo`, and RLS policies are all correctly designed. The migration SQL is solid. The test suite covers the important happy paths and edge cases well.

Issues found cluster in two areas: (1) error detection in the worker's DB operations is incomplete, which can lead to silent data inconsistency; (2) Redis connections are created per-request in route handlers without ever being closed, which is a connection leak.

---

## Critical Issues

### CR-01: Duplicate error detection uses fragile string match instead of error code

**File:** `apps/api/src/workers/datajud-sync.ts:172`
**Issue:** The ON CONFLICT duplicate check uses `error.message.includes('duplicate')` to detect unique-constraint violations. Supabase/PostgREST returns PostgreSQL error code `23505` for unique violations. The error message varies across locales and PostgreSQL versions and could change without notice. This can cause the worker to re-throw a duplicate-key error as a fatal failure and exhaust the BullMQ retry budget for a job that is actually idempotent.

**Fix:**
```typescript
// Before (fragile):
if (error && !error.message.includes('duplicate')) {
  throw new Error(`Erro ao inserir movimentações: ${error.message}`);
}

// After (correct — Supabase surfaces the PostgreSQL code directly):
if (error && (error as { code?: string }).code !== '23505') {
  throw new Error(`Erro ao inserir movimentações: ${error.message}`);
}
```

---

## Warnings

### WR-01: PERSIST step silently ignores DB update failure on processos table

**File:** `apps/api/src/workers/datajud-sync.ts:185-193`
**Issue:** The `supabaseAdmin.from('processos').update(...)` call that sets `ultima_sincronizacao`, `sincronizado`, and `dados_brutos` does not await or check the result. If this update fails (network blip, RLS mismatch, constraint error), the job silently advances to `CLASSIFY_TIER` and returns success, leaving the process marked as unsynchronized in the DB while the job is marked complete in BullMQ. The next scheduled run will re-sync correctly, but the staleness flag and `dados_brutos` will be wrong until then.

**Fix:**
```typescript
const { error: updateError } = await supabaseAdmin
  .from('processos')
  .update({
    ultima_sincronizacao: new Date().toISOString(),
    sincronizado: true,
    dados_brutos: dados,
    updated_at: new Date().toISOString(),
  })
  .eq('id', processoId)
  .eq('tenant_id', tenantId);

if (updateError) {
  throw new Error(`Erro ao atualizar processo após persist: ${updateError.message}`);
}
```

### WR-02: CLASSIFY_TIER step missing tenant_id filter in processos update

**File:** `apps/api/src/workers/datajud-sync.ts:211-213`
**Issue:** The `processos` update in CLASSIFY_TIER only filters by `id`:
```typescript
.eq('id', processoId)
```
The PERSIST step immediately above (line 191-192) correctly includes `.eq('tenant_id', tenantId)` as a defense-in-depth guard. Since the worker uses the service-role key (which bypasses RLS), an incorrect `processoId` — e.g., from a corrupted job payload — could update the `tier_refresh` of a process belonging to a different tenant. The CLASSIFY_TIER update should include the same tenant guard.

**Fix:**
```typescript
await supabaseAdmin
  .from('processos')
  .update({ tier_refresh: novoTier, updated_at: new Date().toISOString() })
  .eq('id', processoId)
  .eq('tenant_id', tenantId); // add tenant guard — consistent with PERSIST step
```

### WR-03: Redis connection leaked on every POST request in processos routes

**File:** `apps/api/src/routes/processos.ts:168-169` and `apps/api/src/routes/processos.ts:213`
**Issue:** `createRedisClient()` is called inside both `POST /processos` and `POST /processos/:id/sync` route handlers, creating a new Redis TCP connection on every HTTP request. Neither handler closes or returns that connection to a pool. Under any realistic load this exhausts available file descriptors or Redis max-connections. The `getDatajudQueue` singleton partially mitigates the Queue object creation, but the underlying Redis client is new each time.

**Fix:** Inject a shared Redis client at server startup and pass it (or the queue) into the route plugin, rather than calling `createRedisClient()` per request:

```typescript
// In server.ts — create once at startup:
const redis = createBullMQRedisClient();
const datajudQueue = getDatajudQueue(redis);

// Pass to route plugin:
app.register(processosRoutes, { prefix: '/api/v1', datajudQueue });

// In processos.ts — accept from options, remove createRedisClient() calls:
export const processosRoutes: FastifyPluginAsync<{ datajudQueue: Queue<SyncJobData> }> =
  async (fastify, opts) => {
    const queue = opts.datajudQueue;
    // ...use queue directly in handlers
  };
```

### WR-04: Movimentos not sorted before selecting ultima_movimentacao in PERSIST step

**File:** `apps/api/src/workers/datajud-sync.ts:179`
**Issue:** `ultimaMovimentacaoAt` is derived from `novas[novas.length - 1].data`, assuming the last element is the most recent. DataJud responses are not guaranteed to return movements in chronological order (several tribunals return them in descending or insertion order). This means the tier classifier may receive a stale timestamp, computing an incorrect tier that under-refreshes or over-refreshes the process.

**Fix:**
```typescript
const ultimaMovimentacaoAt = novas.length > 0
  ? new Date(
      novas.reduce((latest, m) =>
        m.data > latest ? m.data : latest,
        novas[0].data
      )
    )
  : null;
```

### WR-05: Tribunal map is incomplete for TRE courts (J=7)

**File:** `apps/api/src/datajud/tribunal-map.ts:85-86`
**Issue:** Only two entries exist for J=7 (electoral justice):
```
'7.01': 'api_publica_tse'   // TSE
'7.02': 'api_publica_tre'   // only TRE-AL?
```
Brazil has 27 TRE tribunals (7.01–7.27 with TSE at a separate index in some CNJ schemes). A CNJ number for any TRE court other than the one mapped at `7.02` will throw `TribunalNaoSuportadoError`, rejecting a valid CNJ number with a misleading "Tribunal não suportado" error. This is a data completeness bug for users with electoral-court processes.

**Fix:** Audit the DataJud public API endpoints for all TRE aliases and add the missing entries, or document explicitly which courts are intentionally excluded and return a more descriptive error message distinguishing "not yet supported" from "invalid CNJ".

---

## Info

### IN-01: ADMIN_TOKEN read directly via process.env instead of validated env config

**File:** `apps/api/src/server.ts:81`
**Issue:** `process.env.ADMIN_TOKEN` is accessed directly, bypassing the `env` config module (imported at line 7) that provides validated, type-safe environment variables. If `ADMIN_TOKEN` is accidentally missing in production the check at line 83 (`if (!adminToken || ...)`) handles the null case by rejecting all requests, but the absence of the variable is never caught during startup validation. A typo in the env var name would silently disable the admin interface.

**Fix:** Add `ADMIN_TOKEN` to the env config schema so it is validated at startup:
```typescript
// In config.ts — add to schema:
ADMIN_TOKEN: z.string().min(32, 'ADMIN_TOKEN must be at least 32 chars'),

// In server.ts — use env.ADMIN_TOKEN instead of process.env.ADMIN_TOKEN:
const adminToken = env.ADMIN_TOKEN;
```

### IN-02: Empty string token used as Supabase credential when Authorization header is absent

**File:** `apps/api/src/routes/processos.ts:41-42`, `105`, `193`
**Issue:** `request.headers.authorization?.slice(7) ?? ''` produces an empty string when the header is missing. This empty string is passed to `supabaseAsUser('')`, creating an unauthenticated Supabase client. While RLS will prevent data access in practice, the route still hits the database before returning an error, rather than failing fast. Additionally, the auth plugin should already block unauthenticated requests before reaching route handlers — if it does, this is dead code; if it does not, the empty-string path is a silent degradation.

**Fix:** Assert the token is non-empty before using it, or rely entirely on the auth plugin guard and remove the defensive fallback:
```typescript
const token = request.headers.authorization?.slice(7);
if (!token) {
  return reply.status(401).send({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
}
```

### IN-03: Test file duplicates calcularDesatualizado logic instead of importing from source

**File:** `apps/api/src/routes/__tests__/processos.test.ts:12-17`
**Issue:** The test file re-implements `calcularDesatualizado` verbatim instead of importing it from `processos.ts`. Since the function is not exported, the test cannot easily verify the actual production function. If the implementation changes in `processos.ts`, the tests will continue to pass without detecting the regression. This also means the test is testing the copy, not the code.

**Fix:** Export `calcularDesatualizado` from `processos.ts` (even as `export` with a `/* @internal */` comment for documentation purposes), then import and test it directly:
```typescript
// In processos.ts:
export function calcularDesatualizado(ultimaSincronizacao: string | null): boolean { ... }

// In processos.test.ts:
import { calcularDesatualizado } from '../processos.js'
```

---

_Reviewed: 2026-04-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
