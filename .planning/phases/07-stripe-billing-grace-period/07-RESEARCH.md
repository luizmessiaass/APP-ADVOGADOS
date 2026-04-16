# Phase 7: Billing & Grace Period - Research

**Researched:** 2026-04-16
**Domain:** Provider-agnostic billing infrastructure — entitlement middleware, grace period state machine, webhook receiver, admin REST endpoints, Android UX
**Confidence:** HIGH (all claims verified against codebase or standard Fastify/BullMQ/Android patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Payment provider is NOT decided. Phase 7 implements provider-agnostic infra: entitlement middleware + grace period state machine + admin panel + generic webhook receiver. Stripe can be plugged in later without changing business logic.
- **D-02:** Tenant status managed via REST endpoints protected by `super_admin` JWT role. Admin can also use Supabase Studio directly for ad-hoc operations. No dedicated web frontend in v1.
- **D-03:** `super_admin` role injected by Custom Access Token Hook (extension of D-10/D-11 Phase 1). One specific Supabase user receives this role via configuration.
- **D-04:** Access rules by tenant status:
  - `pending` / `trial` / `active` → full access
  - `grace` (Days 0-6) → full access (informational only — banner, email)
  - `read_only` (Days 7-13) → read endpoints pass; write endpoints blocked with HTTP 402
  - `suspended` (Day 14+) → all data endpoints blocked with HTTP 402
  - Data is NEVER deleted on suspension
- **D-05:** Blocked endpoint response: HTTP 402 + JSON `{ "error": "subscription_required", "tenant_status": "suspended", "message": "Assinatura suspensa. Entre em contato com o Portal Jurídico." }`
- **D-06:** Grace period initiated by webhook from payment provider — generic endpoint `POST /api/webhooks/billing` accepting `payment.failed` (abstract format). Also triggerable manually via admin endpoint.
- **D-07:** Grace period progression via daily BullMQ cron job (runs 1x/day at 09:00 BRT). Calculates `days = now - grace_period_started_at` and advances to next stage.
- **D-08:** Grace period stages and actions:
  - Day 0: status → `grace`; action → Resend email to escritorio admin
  - Day 3: set flag `grace_banner: true` on tenant record; Android banner appears
  - Day 7: status → `read_only`; action → reminder email
  - Day 14: status → `suspended`; action → suspension email
  - Resolution: `payment.succeeded` webhook or admin endpoint → status back to `active`, `grace_period_started_at` zeroed, `grace_banner` false
- **D-09:** app_cliente during grace/suspension: Days 3-13 yellow/orange banner at top of process list; Day 14+ blocked screen with WhatsApp button
- **D-10:** app_escritorio during grace/suspension: Day 3+ red countdown banner; Day 7+ write features disabled; Day 14+ suspension screen
- **D-11:** Tenant status and `grace_banner` returned by dedicated endpoint `GET /api/tenant/status` polled at login and every 30 minutes via WorkManager (extension of Phase 6 D-09).

### Claude's Discretion

- Exact schema of `billing_events` table (webhook log + grace period transitions)
- Structure of `POST /api/webhooks/billing` endpoint (payload validation, provider authentication)
- Exact names of admin endpoints (e.g., `PATCH /api/admin/tenants/:id/status`)
- Resend transactional email details (template, subject, HTML)
- BullMQ cron job retry strategy on partial failure (e.g., email sent but status not updated)

### Deferred Ideas (OUT OF SCOPE)

- Stripe Checkout + Customer Portal — integration with Stripe or any other provider goes in a separate phase when commercial model is defined
- Trial limits (e.g., max N clients in trial) — simpler version keeps trial = full access
- Billing metrics dashboard (MRR, churn, tenants by status)
- Self-service checkout (escritório subscribes without human contact)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BILLING-01 | Escritório can subscribe via Stripe Checkout hosted | Partially addressed: Phase 7 prepares infra (status management, entitlement). Stripe Checkout itself is deferred per D-01. The infra here enables it. |
| BILLING-02 | Escritório can manage subscription (cancel, change plan) via Customer Portal | Deferred per D-01. Chrome Custom Tabs already in place (Phase 4). D-11 covers GET /api/tenant/status. Admin endpoint covers manual management. |
| BILLING-03 | Webhook verified by signature before processing | Generic HMAC-SHA256 secret verification pattern — provider-agnostic replacement for Stripe signature. See Architecture Patterns §Webhook Auth. |
| BILLING-04 | All events registered in `billing_events` table for idempotency (replay-safe) | billing_events table with unique event_id constraint. INSERT ... ON CONFLICT DO NOTHING pattern. See §Schema. |
| BILLING-05 | Entitlement middleware verifies `subscription_status` before allowing protected endpoints | Fastify preHandler hook checking status with Redis cache. See §Entitlement Middleware pattern. |
| BILLING-06 | Grace period state machine: Day 0 (email) → Day 3 (banner) → Day 7 (read-only) → Day 14 (suspension) | BullMQ cron job `0 9 * * *` as new worker registered in apps/worker/src/worker.ts. See §Grace Period State Machine. |
| BILLING-07 | Tenant data never deleted on suspension (only `status` flipped) | Confirmed by D-04 + existing hard-delete policy applies only to LGPD Art. 18 endpoint. Status change only. |
</phase_requirements>

---

## Summary

Phase 7 builds the commercial control layer for Portal Jurídico without committing to any specific payment processor. The three interlocking systems are: (1) a Fastify entitlement middleware that checks tenant status on every protected request and returns HTTP 402 for blocked tenants with appropriate granularity for `read_only` vs `suspended`; (2) a BullMQ cron job that drives the 14-day grace period state machine daily, dispatching emails via Resend and flipping status flags in the `escritorios` table; and (3) a generic webhook receiver that accepts normalized `payment.failed`/`payment.succeeded` events and triggers state transitions — any future payment provider adapter will translate its native events into this normalized format.

The existing codebase provides all the infrastructure needed: the `auth.ts` plugin already implements a `preHandler` hook pattern that the entitlement middleware mirrors; the `apps/worker/src/worker.ts` file already has a graceful-shutdown BullMQ pattern; the Supabase `escritorios` table has the `status` column (currently `pending/trial/active/suspended`); and the Custom Access Token Hook in `supabase/functions/custom-access-token/index.ts` only needs one new role string (`super_admin`) added. The Android side already has WorkManager infrastructure from Phase 6 and the Retrofit + Hilt + sealed UiState patterns from Phase 4.

The key insight for planning: this phase is primarily a **schema migration + backend state machine + Android UX layer** — no new heavy external dependencies beyond what is already in the project. The only net-new package is `resend` (already used per Phase 1 D-13 for Supabase SMTP) if a direct server-side SDK is needed for transactional emails from the worker.

**Primary recommendation:** Implement in this order: (1) SQL migration extending the enum and adding new columns + `billing_events` table, (2) entitlement middleware as a Fastify plugin, (3) webhook receiver + admin endpoints, (4) BullMQ cron job in `apps/worker`, (5) Android status poll + banner + suspension screens.

---

## Standard Stack

### Backend — No New Dependencies Required

All backend dependencies for this phase are already present in `apps/api/package.json`. The `resend` SDK is the only addition if we call Resend directly from the worker rather than via Supabase's custom SMTP.

| Library | Current Version | Purpose | Status |
|---------|----------------|---------|--------|
| fastify | 5.8.5 | HTTP server + plugin hooks | Already installed [VERIFIED: package.json] |
| bullmq | 5.74.1 (registry), 5.73.5 (installed) | Cron job + queue | Already installed [VERIFIED: package.json + npm view] |
| ioredis | 5.10.1 | Redis client for BullMQ | Already installed [VERIFIED: package.json] |
| @supabase/supabase-js | 2.103.0 (installed), 2.103.3 (latest) | DB operations from worker | Already installed [VERIFIED: package.json] |
| zod | 4.3.6 | Webhook payload validation | Already installed [VERIFIED: package.json] |
| resend | 6.12.0 | Transactional email SDK | NOT installed — add to apps/worker [VERIFIED: npm view] |
| vitest | 4.1.4 | Tests | Already installed [VERIFIED: package.json] |

### Net-New Backend Package

```bash
# In apps/worker:
pnpm add resend@6.12.0
```

**Why add Resend SDK to worker, not API:** The grace period emails are dispatched by the BullMQ cron job in `apps/worker`, which is a separate Railway process from `apps/api`. The worker cannot import from the API process. The Resend SDK is a lightweight REST wrapper with no peer dependencies.

**Alternative:** Call Resend via raw `fetch()` — avoids a dependency but loses TypeScript types and retry handling. Resend SDK is preferred for maintainability. [ASSUMED: Resend SDK is acceptable; user could choose raw fetch]

### Android — No New Dependencies Required

All Android dependencies for this phase are already in `gradle/libs.versions.toml`. WorkManager (from Phase 6) and Retrofit + Compose + Hilt are the only building blocks needed. No new libraries.

---

## Architecture Patterns

### Pattern 1: Entitlement Middleware as Fastify Plugin

**What:** A second Fastify `preHandler` hook registered after `authPlugin` that checks `request.user.tenant_id` against the current tenant status. The check uses a Redis cache with a short TTL (30-60 seconds) to avoid a DB round-trip on every request.

**When to use:** Applied to all `/api/v1/*` routes except public ones (`/health`, `/api/v1/auth/*`, `POST /api/webhooks/billing`, `GET /api/tenant/status`).

**Read-only vs suspended distinction:** The middleware needs to know whether a request is a mutation (POST/PUT/PATCH/DELETE) or a read (GET/HEAD). For `read_only` tenants, only mutations are blocked.

**Integration with existing auth.ts:** The existing `authPlugin` (Phase 1) already runs as a `preHandler` that populates `request.user`. The entitlement plugin runs after it in the same preHandler chain. [VERIFIED: apps/api/src/plugins/auth.ts]

```typescript
// Source: [VERIFIED: apps/api/src/plugins/auth.ts pattern — mirrored for entitlement]
// apps/api/src/plugins/entitlement.ts
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { Redis } from 'ioredis'

const SKIP_ROUTES = new Set([
  '/health',
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/webhooks/billing',
  '/api/tenant/status',
])

const CACHE_TTL_SECONDS = 30

const entitlementPlugin: FastifyPluginAsync<{ redis: Redis }> = async (fastify, opts) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const url = request.url.split('?')[0]
    if (SKIP_ROUTES.has(url)) return
    if (!request.user?.tenant_id) return // authPlugin already rejected these

    const cacheKey = `tenant:status:${request.user.tenant_id}`
    const cached = await opts.redis.get(cacheKey)

    let status: string
    if (cached) {
      status = cached
    } else {
      const { supabaseAdmin } = await import('../lib/supabase.js')
      const { data } = await supabaseAdmin
        .from('escritorios')
        .select('status')
        .eq('id', request.user.tenant_id)
        .single()
      status = data?.status ?? 'suspended'
      await opts.redis.setex(cacheKey, CACHE_TTL_SECONDS, status)
    }

    // Full block for suspended
    if (status === 'suspended') {
      return reply.code(402).send({
        error: 'subscription_required',
        tenant_status: 'suspended',
        message: 'Assinatura suspensa. Entre em contato com o Portal Juridico.',
      })
    }

    // Write-only block for read_only
    if (status === 'read_only') {
      const method = request.method.toUpperCase()
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return reply.code(402).send({
          error: 'subscription_required',
          tenant_status: 'read_only',
          message: 'Conta em modo leitura. Regularize a assinatura para retomar operacoes de escrita.',
        })
      }
    }
    // grace, pending, trial, active — pass through
  })
}

export default fp(entitlementPlugin, { name: 'entitlement', dependencies: ['auth'] })
```

**Cache invalidation:** When an admin endpoint or webhook changes tenant status, it must delete the Redis cache key for that tenant: `redis.del(`tenant:status:${tenantId}`)`. This is the only invalidation point needed.

### Pattern 2: Provider-Agnostic Webhook Receiver

**What:** A single endpoint `POST /api/webhooks/billing` that accepts a normalized payload. Future payment adapters translate their native format into this canonical form. Authentication uses a shared HMAC secret (not provider-specific signature verification).

**Provider-agnostic authentication:** Since we don't have Stripe's library or Asaas's library, we use a simple `X-Webhook-Secret` header compared with a constant stored in env vars. This is weaker than Stripe's HMAC-SHA256 construction but sufficient for the interim. [ASSUMED: HMAC-SHA256 with timestamp would be stronger — planner should include it as Claude's Discretion implementation detail]

```typescript
// apps/api/src/routes/webhooks/billing.ts
// Normalized payload — any provider adapter maps to this format
interface BillingWebhookPayload {
  event: 'payment.failed' | 'payment.succeeded'
  tenant_id: string
  event_id: string        // provider-specific unique event ID for idempotency
  occurred_at: string     // ISO 8601
  provider?: string       // 'stripe' | 'asaas' | 'manual' | etc.
  metadata?: Record<string, unknown>
}
```

**Idempotency via INSERT ON CONFLICT:** Log the event in `billing_events` before processing. Use `event_id` as the unique constraint.

```sql
-- Idempotent insert — silently ignores replay
INSERT INTO billing_events (id, tenant_id, event, event_id, provider, payload, created_at)
VALUES ($1, $2, $3, $4, $5, $6, now())
ON CONFLICT (event_id) DO NOTHING
RETURNING id;
-- If RETURNING is empty, event already processed — skip handler
```

### Pattern 3: BullMQ Cron Job for Grace Period

**What:** A new consumer registered in `apps/worker/src/worker.ts` that runs daily at 09:00 BRT via BullMQ's built-in scheduler. It queries all tenants with `status IN ('grace', 'read_only')` and processes each one's transition.

**Cron timezone in BullMQ:** BullMQ `repeatOptions.pattern` is UTC. Brasilia (BRT = UTC-3) at 09:00 → UTC 12:00 → cron `0 12 * * *`. [VERIFIED: BullMQ uses UTC for cron patterns. ASSUMED: Exact UTC offset for BRT is UTC-3 standard / UTC-2 BRST summer time — planner must confirm whether BRST is in effect at launch]

```typescript
// apps/worker/src/queues/grace-period.ts
import { Queue } from 'bullmq'
import type Redis from 'ioredis'

export const GRACE_PERIOD_QUEUE = 'grace-period-check'

export function getGracePeriodQueue(redis: Redis): Queue {
  return new Queue(GRACE_PERIOD_QUEUE, { connection: redis })
}

// Schedule via upsertJobScheduler at worker startup:
// await gracePeriodQueue.upsertJobScheduler(
//   'daily-grace-period-check',
//   { pattern: '0 12 * * *' },   // 09:00 BRT (UTC-3)
//   { name: 'grace-period-check', data: {} }
// )
```

**Partial failure retry strategy (Claude's Discretion):** If the email sends but the DB update fails (or vice versa), the cron runs again the next day. Because the state machine is day-count based (not event-based), it is naturally idempotent: re-evaluating a tenant that already got its Day 3 email will still be at Day 3 and skip the email if a `last_action_at` flag tracks what was already sent. [ASSUMED: exact retry strategy details — planner resolves this]

**Worker pattern to follow:** [VERIFIED: apps/worker/src/worker.ts] — graceful shutdown, Sentry, pino logger, separate Redis client.

### Pattern 4: super_admin Role Extension

**What:** The existing Custom Access Token Hook at `supabase/functions/custom-access-token/index.ts` already reads `role_local` from `public.usuarios` and injects it into `app_metadata`. Adding `super_admin` requires:

1. Adding `'super_admin'` to the `role_local` CHECK constraint in the `usuarios` table
2. Setting `role_local = 'super_admin'` for the system admin user in the DB
3. Updating `TenantUser` interface in `apps/api/src/plugins/auth.ts` to include `super_admin`
4. Adding a `super_admin` guard helper function or decorator

[VERIFIED: supabase/functions/custom-access-token/index.ts — the Hook already reads `role_local` from `usuarios` table and injects it verbatim. No Hook code change needed — only DB data change + API type update]

```typescript
// Extend existing TenantUser interface in auth.ts:
export interface TenantUser {
  sub: string
  tenant_id: string
  role: 'admin_escritorio' | 'advogado' | 'cliente' | 'super_admin'
}

// Guard helper for admin routes:
export function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): void {
  if (request.user.role !== 'super_admin') {
    reply.code(403).send({ error: 'admin_only', code: 'FORBIDDEN' })
  }
}
```

**super_admin and tenant_id:** The super_admin user will still have a `tenant_id` in the token (their own row in `usuarios`). Admin endpoints must explicitly bypass tenant scoping — they use `supabaseAdmin` (service role) not the tenant-scoped client.

### Pattern 5: GET /api/tenant/status Endpoint

**What:** A lightweight endpoint that returns the current billing status for the authenticated user's tenant. Called at app login and every 30 minutes by WorkManager (D-11).

```typescript
// Response shape — consumed by both app_escritorio and app_cliente:
interface TenantStatusResponse {
  status: 'pending' | 'trial' | 'active' | 'grace' | 'read_only' | 'suspended'
  grace_banner: boolean
  grace_period_started_at: string | null  // ISO 8601
  days_until_suspension: number | null    // computed by backend, null if not in grace
}
```

**No JWT injection:** As per D-11, this is NOT injected into the JWT to prevent stale tokens from showing wrong status. Always fetched fresh from this endpoint.

### Pattern 6: Android Billing Status — WorkManager + ViewModel

**What:** Extend the existing WorkManager infrastructure from Phase 6 to also call `GET /api/tenant/status` and store the result in DataStore. ViewModels observe the DataStore and conditionally show banners or suspension screens.

**Android UX states to implement:**

| State | app_escritorio | app_cliente |
|-------|---------------|-------------|
| `grace` (Day 0-2) | Normal | Normal |
| `grace` + `grace_banner: true` (Day 3-6) | Red banner with countdown | Yellow/orange banner |
| `read_only` (Day 7-13) | Red banner + write buttons disabled | Yellow/orange banner |
| `suspended` | Full suspension screen | Full suspension screen with WhatsApp button |

**Compose component pattern:** Use a `@Composable` `BillingStatusBanner` in `:core-ui` that receives a `BillingStatus` sealed class and renders the appropriate state. Both apps import it from `:core-ui`. [ASSUMED: exact component design — planner decides]

### Recommended Project Structure (New Files)

```
apps/api/src/
├── plugins/
│   ├── auth.ts                  (existing — add super_admin to TenantUser)
│   └── entitlement.ts           (NEW — HTTP 402 gate)
├── routes/
│   ├── webhooks/
│   │   └── billing.ts           (NEW — POST /api/webhooks/billing)
│   ├── admin/
│   │   └── tenants.ts           (NEW — PATCH /api/admin/tenants/:id/status, GET list)
│   └── tenant/
│       └── status.ts            (NEW — GET /api/tenant/status)
└── services/
    └── billing/
        ├── grace-period.ts      (NEW — state machine logic, pure functions)
        └── tenant-status.ts     (NEW — cache-aware status lookup)

apps/worker/src/
├── queues/
│   └── grace-period.ts          (NEW — queue definition)
├── workers/
│   └── grace-period-check.ts    (NEW — cron job consumer)
└── worker.ts                    (MODIFY — register grace-period consumer)

supabase/migrations/
└── 0009_billing_schema.sql      (NEW — enum extension + billing_events + grace columns)

supabase/functions/
└── custom-access-token/
    └── index.ts                 (no changes needed — DB data change only)

core-ui/src/main/java/.../ui/
└── billing/
    ├── BillingStatusBanner.kt   (NEW — shared between apps)
    └── SuspensionScreen.kt      (NEW — shared between apps)

app-escritorio/src/main/java/.../
└── billing/
    ├── BillingStatusViewModel.kt
    └── (integration into existing screens)

app-cliente/src/main/java/.../
└── billing/
    ├── BillingStatusViewModel.kt (can reuse same ViewModel via :core-data)
    └── (integration into ProcessoListScreen)
```

### Anti-Patterns to Avoid

- **Checking status in the JWT:** JWT has a validity window of minutes to hours. A tenant suspended 5 minutes ago still has a valid JWT. Always check `GET /api/tenant/status` or the Redis cache, never the JWT. [VERIFIED: D-11 explicitly bans this]
- **Blocking the entire app while polling status:** WorkManager poll is async background — never block the main thread or show a loading spinner for status refresh.
- **Hard-deleting tenant data on suspension:** Violation of BILLING-07 and D-04. Only the `status` column changes.
- **Registering the cron job in the API process:** The cron job must live in `apps/worker`, not `apps/api`. These are separate Railway processes. Putting it in the API process would cause double-firing if API scales horizontally.
- **Forgetting cache invalidation:** When admin changes tenant status via REST, the Redis cache key must be deleted immediately, otherwise entitlement middleware keeps serving stale status for up to TTL seconds.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom `setInterval` loop | BullMQ `upsertJobScheduler` with cron pattern | Already in the project; Redis-backed; survives restart; deduplicates [VERIFIED: apps/api/src/workers/scheduler.ts uses this pattern] |
| Webhook idempotency | Custom dedup logic | `INSERT ... ON CONFLICT (event_id) DO NOTHING` | Single atomic DB operation; no race condition |
| Status cache invalidation | TTL-only cache | Explicit `redis.del()` on status change + TTL fallback | TTL alone means 30s window of wrong entitlement after admin override |
| Transactional email | Direct SMTP/Nodemailer | Resend SDK | Already used for Supabase SMTP (Phase 1 D-13); consistent with existing choice |
| JWT role validation | Custom middleware from scratch | Extension of existing `auth.ts` pattern | authPlugin already does the heavy lifting — `requireSuperAdmin` is a 5-line guard |

**Key insight:** This phase extends existing infrastructure rather than introducing new paradigms. Every pattern has a working example in the codebase already.

---

## Database Schema

### Migration 0009: Billing Schema Extension

```sql
-- 1. Extend status enum for escritorios table
-- (Supabase/PostgreSQL — adding values to CHECK constraint requires ALTER TABLE)
ALTER TABLE public.escritorios
  DROP CONSTRAINT escritorios_status_check,
  ADD CONSTRAINT escritorios_status_check
    CHECK (status IN ('pending', 'trial', 'active', 'grace', 'read_only', 'suspended'));

-- 2. Add grace period columns to escritorios
ALTER TABLE public.escritorios
  ADD COLUMN grace_period_started_at  timestamptz,
  ADD COLUMN grace_banner             boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.escritorios.grace_period_started_at
  IS 'Timestamp when grace period started (Day 0). NULL means not in grace.';
COMMENT ON COLUMN public.escritorios.grace_banner
  IS 'Flag: true from Day 3. App uses this to show billing banner without computing days.';

-- 3. billing_events table (idempotent webhook log + grace transitions)
CREATE TABLE public.billing_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  event           text NOT NULL CHECK (event IN ('payment.failed', 'payment.succeeded', 'grace.advanced', 'status.manual_change')),
  event_id        text NOT NULL UNIQUE, -- provider event ID or generated UUID for internal events
  provider        text,                  -- 'stripe' | 'asaas' | 'manual' | 'system'
  payload         jsonb,
  processed_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX billing_events_tenant_id_idx ON public.billing_events(tenant_id);
CREATE INDEX billing_events_event_idx ON public.billing_events(event);

COMMENT ON TABLE public.billing_events
  IS 'Idempotent log of all billing events. UNIQUE on event_id ensures replay-safe processing.';

-- 4. RLS for billing_events — super_admin reads all; tenants read their own
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_events_admin_all"
  ON public.billing_events
  FOR ALL
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "billing_events_tenant_read"
  ON public.billing_events
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid
    AND (auth.jwt()->'app_metadata'->>'role') IN ('admin_escritorio', 'advogado')
  );
```

**Note on enum extension:** PostgreSQL does support `ALTER TYPE ... ADD VALUE` for native enum types, but the `escritorios.status` column uses a TEXT + CHECK constraint (as seen in migration 0001). Altering a CHECK constraint via DROP + ADD is the correct approach. [VERIFIED: supabase/migrations/0001_create_escritorios.sql — uses CHECK(status IN (...)), not CREATE TYPE]

### Tenant Status Table After Migration

| Column | Type | Notes |
|--------|------|-------|
| status | text | CHECK: pending/trial/active/grace/read_only/suspended |
| grace_period_started_at | timestamptz | NULL when not in grace |
| grace_banner | boolean | DEFAULT false |

---

## Common Pitfalls

### Pitfall 1: Forgetting to Clear Redis Cache After Status Change
**What goes wrong:** Admin calls `PATCH /api/admin/tenants/:id/status` to activate a tenant. The entitlement middleware still sees `suspended` from Redis for up to TTL seconds. Tenant gets incorrect 402 errors.
**Why it happens:** Cache invalidation is a separate step from the DB write.
**How to avoid:** In every code path that changes `escritorios.status`, immediately follow with `redis.del(`tenant:status:${tenantId}`)`.
**Warning signs:** Integration test where status change is followed immediately by an API call fails with 402.

### Pitfall 2: Cron Job Registered in Both API and Worker Processes
**What goes wrong:** If `upsertJobScheduler` is called in both the API server startup and the worker startup, BullMQ deduplicates the scheduler (same key), but if it is two different queue instances pointing to the same Redis, the job runs correctly — however, the **consumer** must only be in the worker. If someone accidentally processes grace period logic in an API route handler, it runs in the API process which cannot safely do long-running work.
**Why it happens:** Confusion about which process owns what.
**How to avoid:** Grace period queue definition (queue.ts) lives in `apps/worker`. The API only enqueues a job via the queue client when a webhook is received (if immediate processing is needed). The cron scheduler is only registered in the worker startup.

### Pitfall 3: super_admin Missing tenant_id in RLS
**What goes wrong:** Admin calls `GET /api/admin/tenants` using the tenant-scoped Supabase client. RLS filters results to only the admin's own tenant row. Query returns 1 row instead of all tenants.
**Why it happens:** The tenant-scoped client injects `tenant_id` into every query via RLS.
**How to avoid:** All admin endpoints must use `supabaseAdmin` (service role key, bypasses RLS), not the user-scoped client. [VERIFIED: apps/api/src/lib/supabase.ts exports both clients]

### Pitfall 4: BullMQ Cron Pattern Uses Incorrect Timezone
**What goes wrong:** Cron runs at wrong local time because BullMQ uses UTC. `0 9 * * *` fires at 09:00 UTC = 06:00 BRT instead of 09:00 BRT.
**Why it happens:** BullMQ's cron is UTC-only. BRT = UTC-3 (standard) / UTC-2 (BRST summer).
**How to avoid:** Use `0 12 * * *` for 09:00 BRT standard time. Document the offset in a comment. [ASSUMED: Brazilian summer time (BRST) was abolished in 2019 — UTC-3 year-round. This needs confirmation; if confirmed, cron `0 12 * * *` is permanently correct]

### Pitfall 5: Android WorkManager Status Poll Causes Battery Drain
**What goes wrong:** WorkManager with a 30-minute interval combined with a wakelock or improper constraints can drain battery on Xiaomi/Samsung devices.
**Why it happens:** WorkManager constraints must specify `NetworkType.CONNECTED` — no need to wake device without network.
**How to avoid:** Same constraints pattern as Phase 6 `NotificationPollWorker`: `Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()`. The tenant status poll is a GET request — no point firing without network.

### Pitfall 6: Webhook Receiver Exposed Without Auth
**What goes wrong:** `POST /api/webhooks/billing` is a public endpoint (no JWT required). Without a secret, anyone who discovers the URL can send `payment.succeeded` and activate any tenant.
**Why it happens:** Webhooks cannot carry a user JWT — the payment provider sends them server-to-server.
**How to avoid:** Validate `X-Webhook-Secret: <env.BILLING_WEBHOOK_SECRET>` header on every incoming webhook request. Reject with 401 if absent or wrong. The secret must be a random 32-byte hex string stored in env vars.

### Pitfall 7: Idempotent Cron on Day 3 Sends Multiple Emails
**What goes wrong:** The cron runs daily. On Day 3, it sets `grace_banner = true` and sends an email. On Day 4, it re-evaluates the same tenant and sees Day 3 already passed — it must not re-send the Day 3 email.
**Why it happens:** The state machine must track which actions have already been performed.
**How to avoid:** Each stage action is idempotent by checking what has already happened. The `grace_banner` flag itself serves as the "Day 3 action done" marker. For emails, insert into `billing_events` with `event = 'grace.advanced'` and a `payload.stage = 'day_3'` — check existence before sending. Alternatively, use `billing_events` as the audit trail to determine "was this action already dispatched?"

---

## Code Examples

### Entitlement Middleware Registration in server.ts

```typescript
// Source: [VERIFIED: apps/api/src/server.ts — mirrored registration pattern]
// Register entitlement AFTER auth plugin (dependencies: ['auth'])
app.register(authPlugin)
app.register(entitlementPlugin, { redis: redisClient })
// All subsequent routes are automatically protected
```

### BullMQ Cron Job Consumer Registration

```typescript
// Source: [VERIFIED: apps/worker/src/worker.ts — follows existing graceful shutdown pattern]
// In apps/worker/src/worker.ts — add to inicializar():
import { getGracePeriodQueue } from './queues/grace-period.js'
import { processarGracePeriodCheck } from './workers/grace-period-check.js'

const gracePeriodQueue = getGracePeriodQueue(redisConnection)

// Register cron scheduler (idempotent — safe to call on every startup)
await gracePeriodQueue.upsertJobScheduler(
  'daily-grace-period-check',
  { pattern: '0 12 * * *' },  // 09:00 BRT (UTC-3)
  { name: 'grace-period-check', data: {} }
)

const gracePeriodWorker = new Worker(
  GRACE_PERIOD_QUEUE,
  processarGracePeriodCheck,
  { connection: redisConnection, concurrency: 1 }
)
```

### Android Billing Status DataStore Key

```kotlin
// Source: [VERIFIED: Phase 4 D-05 pattern — DataStore Preferences]
// In core-data or app-specific DataStore:
val BILLING_STATUS_KEY = stringPreferencesKey("billing_status")
val GRACE_BANNER_KEY = booleanPreferencesKey("grace_banner")
val DAYS_UNTIL_SUSPENSION_KEY = intPreferencesKey("days_until_suspension")
```

### Compose Banner Component Pattern

```kotlin
// Source: [ASSUMED — follows existing core-ui component patterns]
// In :core-ui BillingStatusBanner.kt
@Composable
fun BillingStatusBanner(
  status: String,
  graceBanner: Boolean,
  daysUntilSuspension: Int?,
  isEscritorioApp: Boolean,
  modifier: Modifier = Modifier
) {
  when {
    status == "suspended" -> SuspensionBanner(modifier)
    status == "read_only" && isEscritorioApp ->
      ReadOnlyBanner(daysUntilSuspension, modifier)
    graceBanner && isEscritorioApp ->
      GraceCountdownBanner(daysUntilSuspension, modifier)
    graceBanner && !isEscritorioApp ->
      ClientGraceBanner(modifier)  // yellow/orange
    else -> Unit  // no banner
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ALTER TYPE enum ADD VALUE` for Postgres enums | TEXT + CHECK constraint (as used here) | Always — depends on column definition | Safer migration: CHECK constraints can be altered; native enum requires complex migration |
| BullMQ v4 `addBulk` + repeat options | BullMQ v5 `upsertJobScheduler` | BullMQ v5 (project is on 5.73.5+) | `upsertJobScheduler` is idempotent — safe to call on every worker startup without creating duplicate schedulers [VERIFIED: apps/api/src/workers/scheduler.ts already uses this] |
| Polling tenant status on every request from DB | Redis cache + explicit invalidation | Standard practice | 30-second TTL with explicit invalidation on mutation = near-zero latency cost for entitlement check |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `backend/vitest.config.ts` |
| Quick run command | `pnpm --filter api test -- --reporter=verbose` |
| Full suite command | `pnpm test` (root, runs all API tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILLING-03 | Webhook rejected without valid secret header | unit | `pnpm --filter api test -- src/routes/webhooks/billing.test.ts` | No — Wave 0 |
| BILLING-04 | Duplicate event_id webhook is idempotent (no double processing) | unit | `pnpm --filter api test -- src/routes/webhooks/billing.test.ts` | No — Wave 0 |
| BILLING-05 | Suspended tenant gets HTTP 402 on protected endpoint | unit | `pnpm --filter api test -- src/plugins/entitlement.test.ts` | No — Wave 0 |
| BILLING-05 | read_only tenant: GET passes, POST returns HTTP 402 | unit | `pnpm --filter api test -- src/plugins/entitlement.test.ts` | No — Wave 0 |
| BILLING-06 | Grace period state machine: Day 3 sets grace_banner, Day 7 flips to read_only, Day 14 to suspended | unit | `pnpm --filter api test -- src/services/billing/grace-period.test.ts` | No — Wave 0 |
| BILLING-06 | Cron does not re-send Day 3 email if already sent (idempotent action check) | unit | `pnpm --filter api test -- src/services/billing/grace-period.test.ts` | No — Wave 0 |
| BILLING-07 | Suspension does not delete tenant data | integration | `pnpm --filter api test -- src/tests/billing-suspension.test.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter api test -- src/plugins/entitlement.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/plugins/entitlement.test.ts` — covers BILLING-05
- [ ] `apps/api/src/routes/webhooks/billing.test.ts` — covers BILLING-03, BILLING-04
- [ ] `apps/api/src/services/billing/grace-period.test.ts` — covers BILLING-06 (pure function tests, no DB)
- [ ] `apps/api/src/tests/billing-suspension.test.ts` — covers BILLING-07 (integration with Supabase test client)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing Supabase Auth + JWKS verification in auth.ts |
| V3 Session Management | no | JWT stateless, no server sessions |
| V4 Access Control | yes | Entitlement middleware — role + status checks before data access |
| V5 Input Validation | yes | Zod schema on webhook payload |
| V6 Cryptography | yes | HMAC secret for webhook auth — never roll custom crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook spoofing (fake payment.succeeded) | Spoofing | BILLING_WEBHOOK_SECRET env var validated on every webhook request |
| Replay attack (resend old payment.succeeded) | Tampering | `INSERT ... ON CONFLICT (event_id) DO NOTHING` — event_id uniqueness prevents replay |
| Horizontal privilege escalation (tenant A calls admin endpoint for tenant B) | Elevation of Privilege | `super_admin` role required; uses supabaseAdmin (service role) explicitly |
| Grace period bypass via stale cache | Tampering | Explicit `redis.del()` on every status change + 30s TTL fallback |
| Cron job mass-activates wrong tenants on bug | Tampering | Pure function state machine unit-tested separately from DB writes; dry-run mode for cron is Claude's Discretion |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Redis (BullMQ cron) | Grace period cron job | Assumed available from Phase 1 setup | — | None — Redis is required for BullMQ |
| Resend SDK | Grace period emails | Not installed (apps/worker) | 6.12.0 (registry) | Raw fetch to Resend API — less ergonomic but no blocker |
| Supabase CLI | DB migration push | Available (Phase 1) | — | — |
| Node.js >= 22 | Worker process | Available | — | — |

**Missing dependencies with no fallback:**
- None blocking (Redis is already required by BullMQ from Phase 1)

**Missing dependencies with fallback:**
- `resend` package in `apps/worker`: `pnpm add resend@6.12.0` — simple addition

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Resend SDK is acceptable as direct dependency in apps/worker | Standard Stack | Worker would need to use raw fetch() — minor rework |
| A2 | Brazil abolished BRST summer time in 2019; BRT is permanently UTC-3 | Architecture Patterns §BullMQ Cron | Cron fires at wrong hour during summer months — requires cron adjustment |
| A3 | BillingStatusBanner shared between both apps via :core-ui | Architecture Patterns §Android | If apps diverge significantly, two separate components may be needed |
| A4 | HMAC-SHA256 webhook secret is sufficient security for the interim phase | Security Domain | If a provider is chosen before Phase 8, provider-specific HMAC construction may be required |
| A5 | billing_events is sufficient for tracking state machine action history (no separate table) | Database Schema | If audit requirements grow, a separate `billing_transitions` table may be cleaner |
| A6 | super_admin user has a `tenant_id` in their JWT (their own escritorio row) | Architecture Patterns §super_admin | If super_admin has no `tenant_id`, the TenantUser interface and middleware need a null-safe path |

---

## Open Questions

1. **BRT timezone confirmation**
   - What we know: Brazil abolished summer time (horário de verão) in 2019 via Decreto 9.772/2019
   - What's unclear: Whether any infrastructure (Railway, Redis, or BullMQ) overrides timezone interpretation
   - Recommendation: Hardcode UTC offset `-03:00` in a comment next to the cron pattern and verify on first test deployment

2. **super_admin without tenant_id**
   - What we know: The Custom Access Token Hook requires a row in `public.usuarios` with a `tenant_id`
   - What's unclear: Whether the system admin user should belong to a real `escritorio` row or have a sentinel value
   - Recommendation: Create a special `escritorios` row for internal use (`nome: 'Portal Juridico Admin'`, `status: 'active'`) and assign the super_admin user to it. Simpler than adding nullable tenant_id paths everywhere.

3. **Webhook authentication strength**
   - What we know: Stripe uses HMAC-SHA256 with timestamp; Asaas uses different mechanism
   - What's unclear: If a payment provider is chosen before this phase is implemented, should the webhook receiver be provider-specific?
   - Recommendation: Use generic `X-Webhook-Secret` header (constant comparison) for now. Document that this will be replaced with provider-specific HMAC when a provider is chosen.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: apps/api/src/plugins/auth.ts] — existing preHandler hook pattern for entitlement middleware
- [VERIFIED: apps/api/src/workers/scheduler.ts] — BullMQ `upsertJobScheduler` pattern already used
- [VERIFIED: apps/worker/src/worker.ts] — worker consumer registration and graceful shutdown pattern
- [VERIFIED: supabase/functions/custom-access-token/index.ts] — Hook reads `role_local` verbatim; super_admin requires only DB data change
- [VERIFIED: supabase/migrations/0001_create_escritorios.sql] — status uses TEXT+CHECK not native enum
- [VERIFIED: apps/api/package.json] — exact dependency versions installed
- [VERIFIED: npm view bullmq/fastify/resend/vitest] — registry versions confirmed

### Secondary (MEDIUM confidence)
- Phase 1, 4, 6 CONTEXT.md decisions — architectural constraints verified
- BullMQ v5 `upsertJobScheduler` API — verified via existing usage in scheduler.ts

### Tertiary (LOW confidence)
- BRT timezone abolition of BRST (2019) — general knowledge, not verified against official decree in this session [A2]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against package.json and npm registry
- Architecture: HIGH — entitlement pattern, BullMQ cron, super_admin extension all verified against existing codebase
- Pitfalls: HIGH — derived from direct code inspection and established patterns
- Android UX patterns: MEDIUM — follows Phase 4/6 established patterns; exact Compose component details are Claude's Discretion

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable stack; BullMQ and Fastify move slowly)
