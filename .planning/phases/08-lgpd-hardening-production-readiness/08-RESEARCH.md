# Phase 8: LGPD Hardening & Production Readiness — Research

**Researched:** 2026-04-16
**Domain:** LGPD compliance hardening, Supabase cascade delete, BullMQ job cancellation, Betterstack/Sentry alerting, Anthropic ZDR, production launch gates
**Confidence:** HIGH (stack verified against live codebase; ZDR and ANPD enforcement MEDIUM due to external dependency)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Art. 18 — Deleção em Cascata**
- D-01: Deleção total — `supabase.auth.admin.deleteUser()` + CASCADE remove todos os registros em `public.*`. Sem anonimização parcial.
- D-02: UX de confirmação no app_escritorio: AlertDialog Material3 simples — "Deletar [Nome]? Todos os dados serão removidos permanentemente." + Cancelar / Deletar (vermelho destrutivo). Sem digitação de nome.
- D-03: Jobs BullMQ ativos para processos do cliente deletado são cancelados ativamente após o DELETE.
- D-04: Endpoint backend: `DELETE /api/v1/clientes/:clienteId` (role `admin_escritorio` ou `advogado` do mesmo tenant). Retorna 204. RLS garante isolamento de tenant.

**Consent Re-gate**
- D-05: Re-exibição obrigatória da tela de consentimento LGPD quando versão dos termos muda, no próximo login ou abertura do app.
- D-06: Constante `TERMS_VERSION = "2026-04-16"` no código do app + backend retorna `termos_versao_atual` em `GET /api/v1/tenant/status`. App compara com DataStore local.
- D-07: `GET /api/v1/tenant/status` deve incluir campo `termos_versao_atual` na resposta.

**Art. 33 — Anthropic como Sub-processador**
- D-08: Política de privacidade menciona Anthropic (EUA) como sub-processador internacional com ZDR, base legal Art. 33 LGPD.
- D-09: Phase 8 entrega o texto da seção Art. 33 e atualiza a URL da política. Apenas Anthropic mencionado em v1.

**CI Production Gates**
- D-10: Três gates blocking no CI: cross-tenant leak, PII-redaction log, webhook idempotency replay drill.
- D-11: Todos os três são blocking — pipeline falha se qualquer um não passar.

**Monitoring & Alertas**
- D-12: Betterstack (Logtail + Uptime) + Sentry. Sem Grafana.
- D-13: Quatro métricas obrigatórias: (1) error rate API >1% 5xx/5min, (2) Claude spend 50/80/100% budget, (3) DataJud circuit open >30min, (4) FCM >5% tokens inválidos.

**Launch Readiness Checklist**
- D-15: Quatro hard-blockers: backup/restore rehearsed, Supabase Pro ativo, secrets split API vs worker, DataJud quota verificado.
- D-16: Revisão de advogado LGPD = risco aceito com mitigação (30-60 dias). Não é hard-blocker.

### Claude's Discretion

- Schema exato da migração SQL para CASCADE constraints (verificar FKs existentes vs. necessidade de adicionar)
- Implementação do cancelamento de jobs BullMQ (Queue methods disponíveis em v5)
- Estrutura exata da resposta de `GET /api/v1/tenant/status` com `termos_versao_atual`
- Estratégia de testes para o Art. 18 endpoint (mock do `supabase.auth.admin.deleteUser()` em Vitest)
- Posicionamento do botão "Deletar cliente" no app_escritorio

### Deferred Ideas (OUT OF SCOPE)

- OpenTelemetry/distributed tracing
- Lista completa de sub-processadores (Railway, Supabase, Resend, Firebase) na política
- Dashboard Grafana
- Limites de trial por número de clientes
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LGPD-05 | Escritório consegue deletar cliente e todos os seus dados via endpoint (Art. 18 LGPD) com cascade | Covered by §Supabase Cascade Delete, §BullMQ Job Cancellation, §Art. 18 Endpoint Pattern |
| LGPD-06 | Política de privacidade menciona Anthropic como sub-processador internacional (Art. 33) | Covered by §Anthropic ZDR Status, §Art. 33 Compliance Text |
</phase_requirements>

---

## Summary

Phase 8 closes the LGPD compliance loop and gates production readiness. The phase has six workstreams: (1) a backend `DELETE /api/v1/clientes/:clienteId` endpoint that calls `supabase.auth.admin.deleteUser()` followed by BullMQ job cleanup, (2) a consent re-gate mechanism comparing a `TERMS_VERSION` constant with the stored consent version via `GET /api/v1/tenant/status`, (3) updating the privacy policy URL to include an Art. 33 section naming Anthropic as a sub-processor, (4) three blocking CI gates (cross-tenant, PII redaction, webhook idempotency), (5) Betterstack + Sentry alert threshold configuration for four mandatory metrics, and (6) a `LAUNCH-CHECKLIST.md` file with four hard-blocker items.

The good news: the existing schema already has `ON DELETE CASCADE` on all critical tables. The `usuarios` table has `REFERENCES auth.users(id) ON DELETE CASCADE` (migration 0002). `processos`, `movimentacoes`, `sync_errors`, `lgpd_consentimentos` all cascade from `usuarios`. This means calling `supabase.auth.admin.deleteUser(userId)` will cascade-delete everything automatically — no manual cascade logic is needed in the endpoint handler.

**Primary recommendation:** Build the Art. 18 endpoint with a three-step transaction: (1) find and cancel BullMQ jobs for the client's processos, (2) call `supabase.auth.admin.deleteUser(userId)` which triggers CASCADE on all public.* tables, (3) return 204. The FK chain already guarantees complete deletion.

**Anthropic ZDR caveat:** ZDR for the Claude Messages API requires a contract arrangement with Anthropic (contact sales team). It is NOT automatically active on a standard API key. This must be confirmed and arranged before the Art. 33 text can state "ZDR ativado" authoritatively. If ZDR is not yet arranged, the Art. 33 text should reference the 7-day data deletion policy (reduced from 30 days as of September 2025) as the data retention mechanism instead.

---

## Standard Stack

### Core — Already in Codebase

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@supabase/supabase-js` | 2.103.0 | `supabase.auth.admin.deleteUser()` + CASCADE | [VERIFIED: package.json] |
| `bullmq` | 5.73.5 | Job cancellation after client delete | [VERIFIED: package.json] |
| `pino` | 10.3.1 | PII redaction via `redact` config | [VERIFIED: package.json] |
| `@sentry/node` | 10.48.0 | Error tracking + alert thresholds | [VERIFIED: package.json] |
| `vitest` | 4.1.4 | Test framework for CI gates | [VERIFIED: vitest run --version] |
| Betterstack (Logtail) | via `pino-logtail` | Log drain + threshold alerts | [VERIFIED: Phase 1 D-28] |

### Android (app_escritorio)

| Library | Purpose | Status |
|---------|---------|--------|
| Material3 `AlertDialog` | Destructive confirmation UX (D-02) | [VERIFIED: already used in app_escritorio] |
| Retrofit `DELETE` verb | `DELETE /api/v1/clientes/:id` | [VERIFIED: ClienteApi.kt pattern] |
| DataStore | `TERMS_VERSION` comparison for consent re-gate | [VERIFIED: Phase 5 D-13] |

### No New Dependencies Required

Phase 8 introduces **zero new npm dependencies**. All required libraries are already present. Android side also requires no new dependencies — only new Retrofit endpoint and existing Material3 AlertDialog.

---

## Architecture Patterns

### Pattern 1: Art. 18 Cascade Delete — Three-Step Sequence

**What:** Backend endpoint that safely deletes a client, their BullMQ jobs, and all their data.

**When to use:** When `admin_escritorio` or `advogado` invokes `DELETE /api/v1/clientes/:clienteId`

**Verified FK chain** (from migrations — all CASCADE confirmed):
```
auth.users
  └── public.usuarios (ON DELETE CASCADE — migration 0002)
        ├── public.lgpd_consentimentos (ON DELETE CASCADE — migration 0003)
        └── public.processos (ON DELETE CASCADE via tenant_id — migration 0006)
              ├── public.movimentacoes (ON DELETE CASCADE — migration 0006)
              └── public.sync_errors (ON DELETE CASCADE — migration 0006)
```

**Important:** `processos.cliente_usuario_id` references `usuarios(id) ON DELETE SET NULL` (migration 0008), NOT CASCADE. This is intentional — a processo is a tenant asset, not a cliente asset. The processo row remains, but `cliente_usuario_id` becomes NULL. This is correct LGPD behavior: the processo data belongs to the escritório, not the client.

**Endpoint pattern:**
```typescript
// Source: established pattern from processos.ts + lgpd/index.ts
fastify.delete('/clientes/:clienteId', {
  schema: { params: Type.Object({ clienteId: Type.String({ format: 'uuid' }) }) }
}, async (req, reply) => {
  const { clienteId } = req.params as { clienteId: string }

  // Step 1: Verify ownership (RLS via supabaseAsUser + manual check)
  const token = req.headers.authorization?.slice(7) ?? ''
  const db = supabaseAsUser(token)
  const { data: usuario, error: fetchError } = await db
    .from('usuarios')
    .select('id, role_local')
    .eq('id', clienteId)
    .single()

  if (fetchError || !usuario) return reply.code(404).send({ success: false, error: 'Cliente não encontrado' })
  if (usuario.role_local !== 'cliente') return reply.code(400).send({ success: false, error: 'Somente clientes podem ser deletados' })

  // Step 2: Cancel BullMQ jobs for this client's processos
  // (see BullMQ section below for implementation detail)
  await cancelarJobsDoCliente(clienteId)

  // Step 3: Delete from auth.users — CASCADE deletes all public.* records
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(clienteId)
  if (deleteError) {
    req.tenantLogger.error({ error: deleteError.message }, 'Erro ao deletar usuario do auth')
    return reply.code(500).send({ success: false, error: 'Erro ao deletar cliente', code: 'DELETE_ERROR' })
  }

  req.tenantLogger.info({ clienteId }, 'Cliente deletado — Art. 18 LGPD')
  return reply.code(204).send()
})
```

**Why supabaseAdmin for deleteUser:** [VERIFIED: supabase.com/docs/reference/javascript/auth-admin-deleteuser] — Only the service role can delete auth.users. The `supabaseAdmin` instance (with SUPABASE_SERVICE_ROLE_KEY) is already set up in `apps/api/src/lib/supabase.ts`. The user must be verified as belonging to the authenticated tenant first (done via supabaseAsUser RLS check before calling admin).

### Pattern 2: BullMQ v5 Job Cancellation

**What:** Find and remove pending/delayed jobs for a specific clienteId before deleting the user.

**BullMQ v5 API** (verified from docs.bullmq.io): There is NO built-in filter by payload. The approach is:

```typescript
// Source: [CITED: docs.bullmq.io/guide/queues/removing-jobs]
// Source: [CITED: api.docs.bullmq.io/classes/v5.Queue.html]
async function cancelarJobsDoCliente(clienteId: string): Promise<void> {
  const queue = getDatajudQueue()

  // Get all non-active jobs (waiting + delayed — can be removed safely)
  const [waiting, delayed] = await Promise.all([
    queue.getWaiting(0, -1),   // all waiting jobs
    queue.getDelayed(0, -1),   // all delayed jobs
  ])

  const jobsDoCliente = [...waiting, ...delayed].filter(
    job => job.data?.clienteId === clienteId || job.data?.tenantClienteId === clienteId
  )

  await Promise.all(jobsDoCliente.map(job => job.remove()))
}
```

**Active jobs (in-progress):** Active jobs CANNOT be removed (`job.remove()` throws for locked jobs). For active jobs, the worker should handle 404 gracefully when the processo no longer has a valid `cliente_usuario_id`. This is a self-healing behavior — the worker will encounter `cliente_usuario_id = NULL` (from ON DELETE SET NULL) and can skip notification dispatch.

**Alternative `worker.cancelJob(jobId, reason)`:** This is for signaling an AbortController inside a running worker processor — not the same as removing from queue. Use `job.remove()` for pre-deletion cleanup of queued jobs.

**Key pitfall:** `queue.drain()` removes ALL waiting/delayed jobs, not just for one client. Never use `drain()` for per-client cleanup.

### Pattern 3: Consent Re-gate — Version Comparison

**What:** On app launch, compare `TERMS_VERSION` constant with stored DataStore value. If different, block with consent screen before process list.

**Android implementation (app_cliente):**
```kotlin
// Source: Phase 5 D-06/D-07 + established DataStore pattern
const val TERMS_VERSION = "2026-04-16"  // ISO date — update + re-deploy to force re-gate

// In SplashViewModel or login flow:
val storedVersion = dataStore.data.map { it[TERMS_VERSION_KEY] }.firstOrNull()
val serverVersion = tenantStatusApi.getTenantStatus().termos_versao_atual

val needsReConsent = when {
  storedVersion == null -> true  // first time
  storedVersion != TERMS_VERSION -> true  // local constant changed
  storedVersion != serverVersion -> true  // server version changed (extra safety)
  else -> false
}
```

**Backend — `GET /api/v1/tenant/status` extension:**
The endpoint already exists (Phase 7 D-11). Phase 8 adds `termos_versao_atual` to the response:

```typescript
// Extend existing tenant status response
return reply.send({
  tenant_status: escritorio.status,
  grace_banner: escritorio.grace_banner,
  termos_versao_atual: env.TERMS_VERSION,  // new env var — matches app constant
})
```

`TERMS_VERSION` should be in the backend's `config.ts` as an env var (or hardcoded constant matching the app). When the policy changes, update both the app constant and backend env var.

### Pattern 4: Webhook Idempotency Replay Drill (CI Gate)

**What:** Vitest integration test that replays a billing webhook with the same `event_id` twice and asserts only one `billing_events` row exists.

```typescript
// Pattern: send duplicate event, assert idempotent result
// Source: established pattern from webhooks/billing.test.ts (Wave 0 stubs)
it('replay de event_id duplicado — idempotente, retorna 200 sem reprocessar', async () => {
  const payload = {
    event: 'payment.failed',
    tenant_id: TEST_TENANT_ID,
    event_id: `test-event-${Date.now()}`,
  }
  const headers = { 'x-webhook-secret': env.WEBHOOK_SECRET }

  // First delivery
  const res1 = await app.inject({ method: 'POST', url: '/api/webhooks/billing', payload, headers })
  expect(res1.statusCode).toBe(200)

  // Replay — same event_id
  const res2 = await app.inject({ method: 'POST', url: '/api/webhooks/billing', payload, headers })
  expect(res2.statusCode).toBe(200)  // NOT 409 — idempotent 200

  // Assert only one row in billing_events
  const { count } = await supabaseAdmin
    .from('billing_events')
    .select('*', { count: 'exact' })
    .eq('event_id', payload.event_id)
  expect(count).toBe(1)
})
```

The `billing_events` table already has `CONSTRAINT billing_events_event_id_unique UNIQUE (event_id)` (migration 0009). The handler must use an upsert or check-before-insert to handle duplicates gracefully (return 200, not 409).

### Pattern 5: Betterstack Log-Based Alerting

**How Betterstack alerting works** [CITED: betterstack.com/docs/logs/dashboards/alerts/]:
1. Create a Dashboard in Betterstack Telemetry
2. Create a Chart using SQL on log data (e.g., `count(*) WHERE status >= 500`)
3. Add threshold alert to the chart (triangle icon in chart editor)
4. Configure: threshold value, evaluation period, confirmation period, notification channels

**Four mandatory alert configurations:**

| Metric | Betterstack Query | Threshold | Tool |
|--------|-------------------|-----------|------|
| Error rate API | `count(*) where level='error' and status_code >= 500` / `count(*) total` > 1% | 5-minute window | Betterstack |
| DataJud circuit open | `count(*) where message like '%circuit_open%'` for 30 consecutive minutes | >0 for 30min | Betterstack |
| FCM delivery rate | `count(*) where message like '%token_invalid%'` / `count(*) where message like '%fcm%'` > 5% | 5% | Betterstack |
| Claude spend budget | Per-tenant spend tracking (Phase 3 AI-07) — verify alerts active in production | 50/80/100% | Sentry custom metric |

**Betterstack on-call integration:** Betterstack Uptime (separate product from Logtail/Telemetry) handles on-call scheduling and escalation. Log-based alerts integrate with Uptime incidents for on-call notifications. The free tier supports basic email alerts; on-call requires Betterstack Uptime paid plan.

### Pattern 6: Art. 33 Privacy Policy Text

**LGPD Art. 33 requirements** [VERIFIED: ANPD Resolution 19/2024]:
- International transfer is permitted when: (a) destination country has adequate protection per ANPD assessment, (b) standard contractual clauses approved by ANPD, (c) consent of the data subject, (d) necessary for contract performance.
- USA does NOT have an ANPD adequacy decision as of 2026. Therefore the legal basis is either standard contractual clauses (CPCs from Resolution 19/2024) or consent.
- The ANPD grace period for incorporating CPCs expired August 22, 2025. New contracts must already include them.

**Recommended Art. 33 section text** [ASSUMED — needs Brazilian privacy lawyer review per D-16]:
```
## Transferência Internacional de Dados — Anthropic (Art. 33 LGPD)

Para disponibilizar a tradução de movimentações processuais em linguagem acessível,
o Portal Jurídico utiliza a API Claude da Anthropic (Anthropic PBC, USA).

Garantias de proteção:
- Os dados enviados à API Claude NÃO incluem CPF, nome completo, ou outros dados
  de identificação do titular (data minimization — Art. 46 LGPD)
- A Anthropic adota retenção mínima de 7 dias para inputs/outputs de API
  (reduzida de 30 dias em setembro de 2025)
- [SE ZDR CONTRATADO]: O Portal Jurídico possui acordo Zero Data Retention (ZDR)
  com a Anthropic — dados não são armazenados após retorno da resposta da API
- Base legal: Art. 33, VIII LGPD — transferência com garantias adequadas

Contato para dúvidas: [email de DPO/contato de privacidade]
```

### Anti-Patterns to Avoid

- **Calling `supabase.auth.admin.deleteUser()` WITHOUT first verifying tenant ownership via RLS:** The admin client bypasses RLS. Always use `supabaseAsUser` to confirm the client belongs to the requesting tenant before calling admin.deleteUser.
- **Using `queue.drain()` for per-client job cleanup:** Drains ALL jobs from the queue. Use `getWaiting()` + `getDelayed()` filtered by payload.clienteId.
- **Removing active (locked) BullMQ jobs:** `job.remove()` throws for jobs in active state. Handle this gracefully — active jobs will self-resolve when they encounter `cliente_usuario_id = NULL`.
- **Blocking the CI pipeline before gates are merged:** The three gates must be added to the CI workflow BEFORE merging any production-bound PR. Add a `production-gates` job to `ci.yml` that runs all three.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cascade deletion across tables | Manual `DELETE FROM` per table | FK `ON DELETE CASCADE` (already in schema) | Schema already correct; manual cascade risks missing tables |
| Auth user deletion | Custom auth.users DELETE | `supabase.auth.admin.deleteUser()` | Handles sessions, refresh tokens, MFA records automatically |
| Webhook replay detection | Custom dedup logic | `UNIQUE (event_id)` constraint (already in billing_events) | DB-level constraint is atomic and handles race conditions |
| TERMS_VERSION comparison | Complex version parsing | ISO date string comparison (`"2026-04-16" > "2026-01-01"`) | Lexicographic sort works for ISO dates; already established pattern |
| Log-based alerting | Custom metrics server | Betterstack dashboard + SQL alerts | Already configured in production; no code needed |

---

## Runtime State Inventory

This is NOT a rename/refactor phase. No runtime state inventory needed.

---

## Common Pitfalls

### Pitfall 1: `processos.cliente_usuario_id` Uses SET NULL, Not CASCADE

**What goes wrong:** Developer expects `supabase.auth.admin.deleteUser(clienteId)` to remove all processos. But `processos` have `tenant_id → escritorios(id) ON DELETE CASCADE`, not `cliente_usuario_id → usuarios(id) ON DELETE CASCADE`. Migration 0008 explicitly sets `ON DELETE SET NULL` for `processos.cliente_usuario_id`.

**Why it happens:** Processos are tenant assets (owned by the escritório), not personal data of the client. The processo row remains; only the client link becomes NULL.

**How to avoid:** Understand the data model. After deleteUser(), a processo with `cliente_usuario_id = NULL` is correct and expected. The processo's CONTENT (movimentacoes, translações) was the personal data — those cascade via `movimentacoes.processo_id → processos.id ON DELETE CASCADE`.

**Verification in endpoint test:** Assert that `processos` count for the tenant DOES NOT decrease after deletion, but `processos.cliente_usuario_id` becomes NULL.

### Pitfall 2: Active BullMQ Jobs Cannot Be Removed

**What goes wrong:** `job.remove()` throws `Error: Cannot remove locked job` for jobs currently being processed by a worker.

**Why it happens:** BullMQ uses Redis locks to prevent double-processing. Active jobs hold a lock.

**How to avoid:** Wrap `job.remove()` in try/catch. Log the active job ID but don't fail the deletion. The active job's worker will encounter `cliente_usuario_id = NULL` or a missing user and should gracefully skip non-critical side effects (e.g., FCM notification dispatch).

### Pitfall 3: Betterstack Free Tier Has No On-Call

**What goes wrong:** Alerts fire but only send email. No on-call SMS/phone escalation on free tier.

**Why it happens:** Betterstack on-call scheduling is part of Betterstack Uptime (separate product, requires paid plan).

**How to avoid:** For v1 launch, email alerts may be sufficient. If on-call escalation is needed, either upgrade Betterstack Uptime or use Sentry's alert routing (Sentry has on-call features). Document this limitation in the launch checklist.

### Pitfall 4: ZDR Is NOT Automatic — Requires Anthropic Contract

**What goes wrong:** Privacy policy states "ZDR ativado" but no ZDR contract exists with Anthropic.

**Why it happens:** ZDR requires contacting Anthropic sales and having a specific arrangement. Standard API keys do NOT have ZDR automatically.

**How to avoid:** The Art. 33 text must accurately reflect the actual arrangement. If ZDR is not contracted: (a) do not claim ZDR, (b) instead reference the 7-day retention policy (reduced from 30 days as of September 14, 2025), (c) add ZDR negotiation to the launch checklist as a near-term action item. The privacy policy text provided in this research has conditional ZDR language for this reason.

### Pitfall 5: ANPD Standard Contractual Clauses (CPCs) Required for Art. 33

**What goes wrong:** Portal Jurídico relies on "consent" as the Art. 33 basis, but LGPD consent cannot be used as the sole basis for international transfer when there are other legal bases available.

**Why it happens:** ANPD Resolution 19/2024 established that for B2B data processors, contractual clauses are the primary mechanism. The grace period for incorporating CPCs ended August 22, 2025.

**How to avoid:** The service agreement between Portal Jurídico and Anthropic should incorporate or reference ANPD-approved standard contractual clauses. This is part of the "Brazilian privacy lawyer review" accepted risk (D-16). For v1, acknowledging this gap and committing to resolution within 60 days is the documented mitigation.

### Pitfall 6: Consent Re-gate Logic Must Run Before DataStore Session Check

**What goes wrong:** App checks DataStore for existing session (stays logged in), then loads process list WITHOUT re-checking consent version. User never sees the updated consent screen.

**Why it happens:** The existing login flow in Phase 5 checks consent gate only after the full login flow.

**How to avoid:** The consent version check must happen on EVERY app open, not just after fresh login. In the navigation graph, the splash/session-restoration path must also call `GET /api/v1/tenant/status` and compare `termos_versao_atual` against DataStore before routing to the process list.

### Pitfall 7: CI Gates Must Run in Correct Environment

**What goes wrong:** Cross-tenant test and webhook idempotency test run against a test Supabase instance that doesn't have the Phase 8 migration applied. Tests fail with schema errors.

**Why it happens:** Missing `supabase db push` step in CI before running integration tests.

**How to avoid:** The CI workflow (`ci.yml`) already injects `SUPABASE_URL` from secrets. Ensure the test Supabase project has all migrations applied (including Phase 8 SQL migration for Art. 18). Add a migration check or `supabase db push --linked` step if using Supabase CLI in CI.

---

## Code Examples

### DELETE /api/v1/clientes/:clienteId — Full Endpoint

```typescript
// Source: established patterns from processos.ts + lgpd/index.ts + supabase.ts
// Register under /api/v1/clientes prefix in server.ts

fastify.delete('/clientes/:clienteId', {
  schema: {
    params: Type.Object({ clienteId: Type.String({ format: 'uuid' }) }),
  },
}, async (req, reply) => {
  const { clienteId } = req.params as { clienteId: string }
  const token = req.headers.authorization?.slice(7) ?? ''
  const db = supabaseAsUser(token)

  // 1. Verify client exists AND belongs to this tenant (RLS guarantees tenant isolation)
  const { data: usuario, error: fetchError } = await db
    .from('usuarios')
    .select('id, role_local, nome')
    .eq('id', clienteId)
    .single()

  if (fetchError || !usuario) {
    return reply.code(404).send({ success: false, error: 'Cliente não encontrado', code: 'NOT_FOUND' })
  }
  if (usuario.role_local !== 'cliente') {
    return reply.code(400).send({ success: false, error: 'Apenas clientes podem ser deletados', code: 'INVALID_ROLE' })
  }

  // 2. Cancel BullMQ jobs for this client's processos
  try {
    await cancelarJobsDoCliente(clienteId)
  } catch (err) {
    req.tenantLogger.warn({ err, clienteId }, 'Erro ao cancelar jobs — prosseguindo com deleção')
    // Non-fatal: proceed with deletion even if job cancellation partially fails
  }

  // 3. Delete from auth.users (CASCADE deletes all public.* records)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(clienteId)
  if (deleteError) {
    req.tenantLogger.error({ error: deleteError.message, clienteId }, 'Falha ao deletar usuario auth')
    return reply.code(500).send({ success: false, error: 'Erro ao deletar cliente', code: 'DELETE_ERROR' })
  }

  req.tenantLogger.info({ clienteId, nome: usuario.nome }, 'Cliente deletado — Art. 18 LGPD compliant')
  return reply.code(204).send()
})
```

### BullMQ Job Cancellation Helper

```typescript
// Source: [CITED: docs.bullmq.io/guide/queues/removing-jobs]
// Source: [CITED: api.docs.bullmq.io/classes/v5.Queue.html]
import { getDatajudQueue } from '../queues/datajud-queue.js'

export async function cancelarJobsDoCliente(clienteId: string): Promise<void> {
  const queue = getDatajudQueue()

  const [waiting, delayed] = await Promise.all([
    queue.getWaiting(0, -1),
    queue.getDelayed(0, -1),
  ])

  const jobsAlvo = [...waiting, ...delayed].filter(
    job => job.data?.clienteId === clienteId
  )

  await Promise.allSettled(
    jobsAlvo.map(async (job) => {
      try {
        await job.remove()
      } catch (err) {
        // Active (locked) jobs cannot be removed — log and continue
        console.warn(`Job ${job.id} não pôde ser removido (provavelmente ativo):`, err)
      }
    })
  )
}
```

### Vitest Test for Art. 18 Endpoint

```typescript
// Pattern: mock supabaseAdmin.auth.admin.deleteUser + supabaseAsUser
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  },
  supabaseAsUser: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'test-client-id', role_local: 'cliente', nome: 'Test User' },
      error: null,
    }),
  }),
}))

it('DELETE /api/v1/clientes/:clienteId retorna 204 e chama deleteUser', async () => {
  const res = await app.inject({
    method: 'DELETE',
    url: '/api/v1/clientes/test-client-id',
    headers: { authorization: 'Bearer valid-token' },
  })
  expect(res.statusCode).toBe(204)
  expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('test-client-id')
})
```

### Android — AlertDialog Destructivo (Material3)

```kotlin
// Source: established Material3 AlertDialog pattern from app_escritorio
// Place in ClienteDetalheScreen.kt
if (showDeleteDialog) {
  AlertDialog(
    onDismissRequest = { showDeleteDialog = false },
    title = { Text("Deletar cliente?") },
    text = {
      Text("Todos os dados de ${uiState.nome} serão removidos permanentemente e não podem ser recuperados.")
    },
    confirmButton = {
      Button(
        onClick = { viewModel.deletarCliente(); showDeleteDialog = false },
        colors = ButtonDefaults.buttonColors(
          containerColor = MaterialTheme.colorScheme.error
        )
      ) { Text("Deletar") }
    },
    dismissButton = {
      OutlinedButton(onClick = { showDeleteDialog = false }) { Text("Cancelar") }
    }
  )
}
```

### Android — DELETE Retrofit Endpoint Addition

```kotlin
// Add to ClienteApi.kt
@DELETE("api/v1/clientes/{id}")
suspend fun deletarCliente(@Path("id") clienteId: String): Response<Unit>
```

### CI Production Gates — GitHub Actions Addition

```yaml
# Add to .github/workflows/ci.yml
production-gates:
  name: Production Gates (blocking)
  runs-on: ubuntu-latest
  needs: [test]  # run after unit tests pass
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    REDIS_URL: redis://localhost:6379
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with: { node-version: '22', cache: 'pnpm' }
    - run: pnpm install --frozen-lockfile
    - name: Gate 1 — Cross-tenant isolation
      run: pnpm --filter api exec vitest run src/tests/cross-tenant.test.ts
    - name: Gate 2 — PII redaction log test
      run: pnpm --filter api exec vitest run src/tests/lgpd.test.ts
    - name: Gate 3 — Webhook idempotency replay drill
      run: pnpm --filter api exec vitest run src/routes/webhooks/billing.test.ts
```

---

## Anthropic ZDR Status

[VERIFIED: platform.claude.com/docs/en/build-with-claude/api-and-data-retention]

**ZDR IS available for Claude Messages API** but requires:
1. Explicit contract arrangement with Anthropic (contact Anthropic sales team)
2. Enrollment in a "Commercial organization" (API key organization type)
3. ZDR does NOT apply automatically to any API key

**What ZDR covers for Portal Jurídico:**
- Claude Messages API (`/v1/messages`) — YES, ZDR eligible [VERIFIED: feature eligibility table]
- Batch API (`/v1/messages/batches`) — NO, 29-day retention (not used by Portal Jurídico)
- Prompt caching — YES, ZDR eligible (KV cache representations held in memory for TTL, then deleted)

**If ZDR is NOT yet arranged** (likely at v1 launch):
- As of September 14, 2025, Anthropic reduced API log retention to **7 days** (down from 30 days) [VERIFIED: search results]
- API inputs/outputs are automatically deleted after 7 days
- This is still a meaningful data protection measure — disclose it accurately in the Art. 33 text
- Add ZDR contract as a near-term action item in the launch checklist

**Action required before writing Art. 33 text:** Confirm with Anthropic account team whether ZDR is active on the Portal Jurídico API key. If not, proceed with "7-day deletion" language instead of "ZDR ativado."

---

## LGPD Art. 33 Compliance — Sub-processor Disclosure

**ANPD enforcement context** [VERIFIED: IAPP, Baker McKenzie, ComplianceHub — 2025 data]:
- ANPD imposed BRL 98 million in fines (2023-2025)
- ANPD regulatory agenda 2025-2026 explicitly includes AI and high-risk data processing
- Key precedent: ANPD ordered Meta to stop using Brazilian data to train AI (July 2024)
- Failure to disclose international transfers is an active enforcement priority

**Standard Contractual Clauses (CPCs) — August 2025 deadline passed:**
[CITED: mayerbrown.com/insights/publications/2025/08/end-of-grace-period]
- ANPD Resolution 19/2024 established CPCs
- Grace period to incorporate CPCs into existing contracts ended August 22, 2025
- **Impact on Portal Jurídico:** The agreement with Anthropic (or the ToS acceptance) should reference ANPD CPCs for Art. 33 compliance. This is a key deliverable of the "privacy lawyer review" in D-16.

**Minimal compliant approach for v1 launch:**
- Disclose Anthropic as sub-processor in privacy policy (D-08 — this is required)
- State data minimization (no CPF/PII in prompts — already implemented via D-26)
- State retention period (7 days default, or "ZDR" if contracted)
- Note that full CPC incorporation is in progress (accepted risk D-16)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend endpoint | Yes | v24.14.0 | — |
| pnpm | Build/test | Yes | 10.33.0 | — |
| Vitest | CI gates | Yes | 4.1.4 | — |
| Supabase CLI | Migration push | No | — | Use Supabase dashboard SQL editor |
| Betterstack account | Alert setup | Unknown (config required) | — | Manual log monitoring |
| Sentry DSN | Error tracking | Yes (env var in CI) | — | Already wired |
| Anthropic ZDR contract | Art. 33 text accuracy | Unknown | — | Use "7-day deletion" language |

**Missing dependencies with no fallback:**
- None that block code implementation.

**Missing dependencies with fallback:**
- Supabase CLI: migration can be run via Supabase dashboard SQL editor (Plan 07-04 pattern — `supabase db push` from local machine works if Supabase project is linked)
- Anthropic ZDR: privacy policy text has conditional language handling both cases

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `pnpm --filter api exec vitest run src/tests/lgpd.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LGPD-05 | Art. 18 DELETE endpoint returns 204 and cascades | unit (mocked) | `vitest run src/routes/clientes.test.ts` | No — Wave 0 |
| LGPD-05 | deleteUser called with correct clienteId | unit (mocked) | same | No — Wave 0 |
| LGPD-05 | DELETE returns 404 if clienteId not in tenant | unit (mocked) | same | No — Wave 0 |
| LGPD-05 | BullMQ jobs for client are removed | unit (mocked queue) | same | No — Wave 0 |
| AUTH-06 | Cross-tenant isolation gate | integration | `vitest run src/tests/cross-tenant.test.ts` | Yes |
| LGPD-04 | PII redaction log gate | unit | `vitest run src/tests/lgpd.test.ts` | Yes |
| BILLING-04 | Webhook idempotency replay | integration (mocked DB) | `vitest run src/routes/webhooks/billing.test.ts` | Yes (stubs) |

### Sampling Rate

- Per task commit: `pnpm --filter api exec vitest run --reporter=dot`
- Per wave merge: `pnpm test` (full suite)
- Phase gate: Full suite green + all three CI production gates green

### Wave 0 Gaps

- [ ] `apps/api/src/routes/clientes.test.ts` — covers LGPD-05 (Art. 18 endpoint)
- [ ] `apps/api/src/routes/webhooks/billing.test.ts` — stubs exist but need real implementation (Wave 0 `expect.fail('not implemented')` stubs from billing test)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not changing auth |
| V3 Session Management | No | Not changing sessions |
| V4 Access Control | Yes | RLS + role check before admin.deleteUser |
| V5 Input Validation | Yes | TypeBox UUID validation on `:clienteId` param |
| V6 Cryptography | No | Not adding crypto |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — delete another tenant's client | Elevation of Privilege | `supabaseAsUser` RLS check before `supabaseAdmin.deleteUser()` |
| Role escalation — advogado deletes admin | Tampering | Check `role_local === 'cliente'` before deletion |
| LGPD consent bypass — skip re-gate | Tampering | Server-side `termos_versao_atual` comparison, not only local constant |
| Webhook replay for privilege escalation | Spoofing | `billing_events.event_id` UNIQUE constraint + X-Webhook-Secret header |
| PII leaking via deletion log | Information Disclosure | Use `req.tenantLogger.info({ clienteId })` — do NOT log `nome` or `cpf` in deletion confirmation |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Anthropic 30-day API log retention | 7-day API log retention | September 14, 2025 | Shorter retention window for Art. 33 disclosure |
| ANPD: guidance phase only | ANPD: active enforcement (BRL 98M in fines) | 2023-2025 | Privacy lawyer review is genuine risk, not just formality |
| LGPD international transfers: no specific mechanism | ANPD Resolution 19/2024 — Standard Contractual Clauses (CPCs) | August 2024/2025 | CPCs are the required mechanism for Anthropic sub-processor |
| BullMQ job cancellation: `worker.cancelJob()` | Active jobs: signal-based (AbortController); Queued jobs: `job.remove()` | v5 | Two different APIs for different job states |

**Deprecated/outdated:**
- "30-day Anthropic retention": This was the pre-September 2025 policy. Current is 7 days.
- "LGPD international transfer via consent only": Resolution 19/2024 makes CPCs the standard mechanism for B2B data processors.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `processos.cliente_usuario_id ON DELETE SET NULL` is the intended behavior and not a gap | §Architecture Patterns Pitfall 1 | If SET NULL is wrong, processos would retain PII links — requires CASCADEing movimentacoes differently |
| A2 | Anthropic ZDR has not been contracted yet by Portal Jurídico (standard API key) | §Anthropic ZDR Status | If ZDR IS already active, can use stronger language in Art. 33 text |
| A3 | BullMQ job payload contains `clienteId` field for filtering | §BullMQ Job Cancellation | If payload structure differs, the filter `job.data?.clienteId === clienteId` won't work |
| A4 | Art. 33 text drafted here satisfies ANPD requirements without formal CPC incorporation | §Art. 33 Compliance | ANPD may require explicit CPC reference — lawyer review (D-16) will confirm |
| A5 | Betterstack Logtail SQL alerts can query structured pino logs with status_code field | §Betterstack Alerting | If pino log fields differ, SQL alert queries need adjustment |

---

## Open Questions

1. **Is ZDR active on the Portal Jurídico Anthropic account?**
   - What we know: ZDR is available for the Messages API under a contract arrangement with Anthropic
   - What's unclear: Whether Portal Jurídico has or will get this arrangement before launch
   - Recommendation: Contact Anthropic sales team BEFORE writing the final Art. 33 text. Add to launch checklist D-15.

2. **What is the exact BullMQ job payload structure for DataJud sync jobs?**
   - What we know: The scheduler in `apps/api/src/workers/scheduler.ts` adds jobs; the payload presumably contains `processoId`, `tenantId`, possibly `clienteId`
   - What's unclear: Whether `clienteId` is in the payload directly (it may only have `processoId`)
   - Recommendation: Planner should read `apps/api/src/workers/scheduler.ts` and confirm the payload structure before finalizing the BullMQ cancellation implementation. Alternative: cancel jobs by looking up the client's `processoId`s first, then filter by `processoId`.

3. **Does app_cliente have a `clientes` route endpoint pattern yet?**
   - What we know: `ClienteApi.kt` has `GET /api/v1/clientes/{id}` but NOT `DELETE`
   - What's unclear: Whether the backend has a `/api/v1/clientes` route handler (vs. inline in server.ts)
   - Recommendation: The planner should check `apps/api/src/server.ts` to find where clientes routes are registered.

---

## Sources

### Primary (HIGH confidence)
- Supabase migrations 0001-0009 — FK cascade chain verified directly from source
- `apps/api/package.json` — BullMQ 5.73.5, @supabase/supabase-js 2.103.0 confirmed
- `apps/api/vitest.config.ts` + vitest run output — Vitest 4.1.4 confirmed
- `apps/api/src/lib/supabase.ts` — supabaseAdmin and supabaseAsUser patterns confirmed
- [CITED: platform.claude.com/docs/en/build-with-claude/api-and-data-retention] — ZDR scope and eligibility table
- [CITED: docs.bullmq.io/guide/queues/removing-jobs] — Queue drain/clean/job.remove() APIs
- [CITED: docs.bullmq.io/guide/workers/cancelling-jobs] — worker.cancelJob() for active jobs
- [CITED: betterstack.com/docs/logs/dashboards/alerts/] — alert types and configuration

### Secondary (MEDIUM confidence)
- [CITED: iapp.org + bakermckenzie.com] — ANPD BRL 98M enforcement figure, 2024-2025 actions
- [CITED: mayerbrown.com/insights] — ANPD CPC grace period August 22, 2025 deadline
- [CITED: api.docs.bullmq.io/classes/v5.Queue.html] — Queue.getWaiting(), getDelayed(), getJobs() signatures
- [CITED: supabase.com/docs/guides/platform/backups] — Supabase Pro daily backups (7 days) and PITR procedure

### Tertiary (LOW confidence)
- ANPD BRL 98M fine total — from secondary legal sources, not ANPD official press release directly
- Art. 33 compliance text template — ASSUMED, requires Brazilian privacy lawyer review (D-16)

---

## Metadata

**Confidence breakdown:**
- Art. 18 delete endpoint: HIGH — FK cascade chain verified in migrations, supabaseAdmin API verified in docs
- BullMQ job cancellation: HIGH — API verified, but job payload structure ASSUMED (Open Question 2)
- Anthropic ZDR: HIGH for what ZDR is; MEDIUM for whether it's active on this account
- Betterstack alerts: MEDIUM — alert configuration is dashboard-based, requires manual setup
- LGPD enforcement risk: MEDIUM — based on verified secondary sources, not ANPD official stats
- Art. 33 text: ASSUMED — needs lawyer review per D-16

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days — stable domain except Anthropic ZDR status which should be confirmed before launch)
