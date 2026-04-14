# Architecture Patterns — Portal Jurídico (Brazilian Legal Tech SaaS)

**Domain:** Multi-tenant B2B SaaS with mobile clients, AI integration, legal data sync
**Researched:** 2026-04-14
**Confidence:** MEDIUM-HIGH (stable, well-established patterns; source verification constrained — see Sources section)

## Executive Summary

This is a classic **multi-tenant B2B SaaS architecture** with four distinctive characteristics:

1. **Strong tenant isolation** is non-negotiable — legal data is sensitive, and a cross-tenant leak would be existential. RLS-first design on Supabase with `tenant_id` (= `law_firm_id`) propagated in JWT claims.
2. **Two mobile clients, one backend** — `app_cliente` (end users) and `app_escritorio` (law firm staff) talk to the same Node.js API and the same Supabase database. They differ only in role-scoped UI and RLS policies.
3. **External dependency orchestration** — DataJud (CNJ), Claude API, Stripe, and FCM are all external systems with different failure modes. Treat each as an unreliable dependency behind a dedicated adapter.
4. **Scheduled sync + reactive notification** — DataJud has no webhooks, so the system pulls on a schedule, diffs movements, and fans out notifications. This is the hot loop of the product.

The **recommended architecture** is a three-tier system: Android clients (Clean Architecture + MVVM + Compose) → Node.js API (layered with controllers/services/repositories) → Supabase (Postgres + RLS + Auth + Storage). External integrations live as adapters inside the API layer. Background jobs run as separate Node.js workers (not inside the HTTP API process).

## Recommended Architecture

### System Diagram (text)

```
                         END USERS                        LAW FIRM STAFF
                            |                                    |
                            v                                    v
                   +-----------------+                 +-------------------+
                   |  app_cliente    |                 |  app_escritorio   |
                   |  (Android)      |                 |  (Android)        |
                   |  Clean Arch +   |                 |  Clean Arch +     |
                   |  MVVM + Compose |                 |  MVVM + Compose   |
                   +--------+--------+                 +---------+---------+
                            |                                    |
                            |  HTTPS + JWT (Supabase Auth)       |
                            |  FCM push <---+                    |
                            v               |                    v
                   +----------------------------------------------------+
                   |              Node.js API (Fastify/Express)         |
                   |  +------------------------------------------------+|
                   |  | Controllers (HTTP routes, JWT verification)    ||
                   |  +-----------------------+------------------------+|
                   |  | Services (business logic, orchestration)       ||
                   |  +-----------------------+------------------------+|
                   |  | Repositories (Supabase service-role client)    ||
                   |  +-----------------------+------------------------+|
                   |  | Adapters (DataJud, Claude, Stripe, FCM)        ||
                   |  +------------------------------------------------+|
                   +---+----+----+----+----+----+----+----+----+-------+
                       |    |    |    |    |    |    |    |    |
                       v    v    v    v    v    v    v    v    v
                    [Supabase]              [DataJud]  [Claude]  [Stripe]  [FCM]
                    Postgres+RLS            (CNJ API)  (Anthropic)         (Google)
                    Auth + Storage

                   +-----------------------------------------------+
                   |          Node.js Worker (separate process)    |
                   |  - DataJud sync job (cron)                    |
                   |  - Notification fan-out                       |
                   |  - Stripe reconciliation                      |
                   +-----------------------------------------------+
                                       |
                                       v
                                   [Supabase]
```

### Component Boundaries

| Component | Responsibility | Talks To | Does NOT Talk To |
|-----------|----------------|----------|------------------|
| **app_cliente** | End-user UI, process viewing, AI chat, push handling | Node.js API (HTTPS+JWT), FCM token registration, Supabase Auth (login only) | Supabase DB directly, DataJud, Claude, Stripe |
| **app_escritorio** | Staff UI, client CRUD, process assignment | Node.js API (HTTPS+JWT), Supabase Auth (login only) | Supabase DB directly, DataJud, Claude, Stripe |
| **API Controllers** | HTTP routes, request validation, JWT verification, rate limiting | Services layer | Database, external APIs |
| **API Services** | Business logic, orchestration, entitlement checks | Repositories, Adapters | HTTP layer, Supabase DB directly |
| **API Repositories** | Data access via Supabase client | Supabase (service-role key, RLS bypassed at this layer with explicit tenant scoping) | External APIs |
| **API Adapters** | External system integration (one per external system) | DataJud, Claude, Stripe, FCM | Business logic, database directly |
| **Worker (background)** | Scheduled DataJud sync, notification fan-out, Stripe reconciliation | Services layer (same as API), Supabase | HTTP clients |
| **Supabase (Postgres + RLS)** | Durable storage, tenant isolation, auth identities | — | External APIs |

**Critical rule:** Android apps never talk directly to Supabase Postgres for application data. They only use Supabase Auth for the login flow (to get a JWT). All reads/writes go through the Node.js API. Reasoning: (a) business logic centralization, (b) easier to audit, (c) Android app never handles service-role keys, (d) Claude API and DataJud adapters must never be exposed client-side.

### Data Flow

#### Flow 1: End user views a process

```
1. User opens app_cliente -> selects process
2. App calls GET /api/processes/:cnj with JWT
3. Controller verifies JWT, extracts user_id + tenant_id claim
4. Service checks: does this user have access to this process?
5. Repository queries Supabase with tenant_id filter
6. RLS double-checks: enforces tenant_id = JWT tenant_id
7. Service calls Claude adapter to translate raw movements -> simple PT-BR
   (first checks cache table 'movement_translations' for existing)
8. Response streamed or returned as JSON
9. App renders timeline
```

#### Flow 2: DataJud scheduled sync (the hot loop)

```
1. Cron (every N hours) triggers worker: syncAllActiveProcesses()
2. Worker fetches list of processes where status = 'active' in batches
3. For each process:
   a. DataJud adapter queries CNJ API by process number
   b. Service diffs returned movements vs stored movements
   c. If new movements:
      - Insert into 'movements' table
      - Call Claude adapter to translate each (batch if possible, use prompt caching)
      - Insert translation into 'movement_translations' table
      - Call notification service to enqueue push
4. Notification service batches FCM calls and records delivery in 'notifications' table
5. On error: record in 'sync_errors' with backoff metadata; retry on next cycle
```

#### Flow 3: Stripe subscription lifecycle

```
Sign-up:
  1. Law firm admin starts subscription via app_escritorio or web checkout
  2. Backend creates Stripe Customer + Subscription (service call)
  3. Stores stripe_customer_id + subscription_status on 'tenants' table

Webhook (Stripe -> backend):
  1. Stripe hits POST /webhooks/stripe with signed payload
  2. Controller verifies signature using STRIPE_WEBHOOK_SECRET
  3. Handler updates 'tenants.subscription_status', 'plan', 'seats', 'current_period_end'
  4. Emits domain event (optional) -> may disable features on entitlement check

Every protected request:
  1. Middleware reads tenant's subscription_status
  2. If 'past_due' > grace period -> return 402 or read-only mode
  3. If active -> proceed
```

#### Flow 4: AI chat about a process (streaming)

```
1. User sends message in app_cliente chat UI
2. App POSTs to /api/chat/:processId with message + JWT (streaming endpoint)
3. Controller verifies JWT, service confirms access
4. Service constructs prompt:
   - System message: process summary + movement history (cached via Claude prompt caching)
   - User message: current question
5. Service calls Claude adapter in streaming mode
6. Tokens streamed back to client over SSE (EventSource) or chunked HTTP
7. Full conversation stored in 'chat_messages' (tenant_id, process_id, user_id)
```

#### Flow 5: Push notification delivery

```
1. App_cliente registers FCM token on login / token refresh
   -> POST /api/devices with {fcm_token, platform}
2. Backend stores in 'device_tokens' table (user_id, tenant_id, fcm_token, last_seen)
3. When worker detects new movement:
   -> Query device_tokens WHERE user_id = process.client_user_id
   -> Send via FCM HTTP v1 API (Firebase Admin SDK) with data payload
4. On app open, app fetches latest via /api/processes/:cnj to show fresh data
```

## Patterns to Follow

### Pattern 1: Multi-Tenancy via Shared Schema + RLS

**What:** Single Postgres database, single schema, every tenant-scoped table has a `tenant_id` column, RLS policies enforce isolation.

**Why:** For B2B SaaS at 10-1000s of tenants, shared schema is the industry default. Schema-per-tenant creates a migration nightmare (1000 schemas to ALTER), connection pool fragmentation, and backup complexity. Database-per-tenant is even worse at this scale. RLS on Supabase is mature and purpose-built for exactly this.

**Implementation:**

```sql
-- Every tenant-scoped table has tenant_id
CREATE TABLE processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  cnj_number text NOT NULL,
  client_user_id uuid REFERENCES auth.users(id),
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cnj_number)
);

-- Index on tenant_id is critical for RLS performance
CREATE INDEX idx_processes_tenant ON processes(tenant_id);

-- Enable RLS
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their tenant's data
-- tenant_id must be in the JWT app_metadata (set at sign-up)
CREATE POLICY tenant_isolation ON processes
  FOR ALL
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Additional policy: end users see only their own processes
CREATE POLICY client_sees_own ON processes
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_escritorio', 'advogado')
      OR client_user_id = auth.uid()
    )
  );
```

**Key rules:**
- `tenant_id` goes in **`app_metadata`** (set server-side only), NEVER `user_metadata` (user-writable).
- Every tenant-scoped query MUST include `tenant_id` in both the WHERE clause AND rely on RLS. Belt and suspenders.
- Index `tenant_id` on every tenant-scoped table. Without it, RLS becomes O(n) on large tables.
- For RLS performance at scale, wrap JWT reads in `(SELECT ...)` to cache per-query: `USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid))`.

### Pattern 2: API-Mediated Supabase Access (NOT Direct Client Access)

**What:** Android apps talk only to the Node.js API, not directly to Supabase Postgres. Supabase Auth is used only for login/token refresh.

**Why:**
- Business logic centralization (Claude calls, DataJud orchestration, Stripe entitlement checks cannot live on device)
- Avoids leaking Supabase anon key / RLS surface to clients
- Single place to audit, rate-limit, and monitor
- Easier to evolve the data model without releasing a new APK

**How:**
- API uses Supabase **service-role key** (bypasses RLS).
- API explicitly scopes every query by `tenant_id` (extracted from verified JWT).
- RLS still exists in the database as a defense-in-depth safety net — if a bug in the service layer forgets to filter, RLS catches it (but only if the API uses a per-request Postgres role that has RLS enforced).

**Belt-and-suspenders setup:**
- Create a dedicated Postgres role `api_app` that has RLS enforced (not `service_role`).
- API uses `SET LOCAL jwt.claims` with the user's JWT payload before each query so RLS evaluates correctly.
- This gives you service-role power for cross-tenant admin operations AND RLS safety for normal user-scoped requests.

**Alternative (simpler, riskier):** API uses service_role key directly. Faster to implement, but a single missed `WHERE tenant_id = ?` becomes a cross-tenant leak. NOT recommended for legal data.

### Pattern 3: Clean Architecture + MVVM for Android Apps

**What:** Three layers per app — `data`, `domain`, `ui` — with Jetpack Compose + ViewModel + StateFlow.

**Why:** This is the **official Android recommendation** as of 2025-2026, verified via developer.android.com. It handles configuration changes, process death, and testability cleanly. MVI is a valid alternative (single immutable state + intents) but adds ceremony; for a CRUD-heavy app with moderate complexity, MVVM + UDF (unidirectional data flow) is simpler and equivalent in practice.

**Structure:**

```
app_cliente/
  data/
    remote/
      ApiService.kt          (Retrofit/Ktor interface)
      dto/                    (network DTOs)
    local/
      AppDatabase.kt          (Room, optional for offline cache)
      dao/
    repository/
      ProcessRepository.kt    (combines remote + local, exposes Flow)
  domain/
    model/                    (domain entities, no Android/network deps)
    usecase/
      GetProcessesUseCase.kt
      GetProcessDetailUseCase.kt
      SendChatMessageUseCase.kt
  ui/
    feature/
      login/
        LoginViewModel.kt
        LoginScreen.kt        (@Composable)
        LoginUiState.kt       (sealed class or data class)
      processes/
        ProcessListViewModel.kt
        ProcessListScreen.kt
      process_detail/
      chat/
    theme/
    navigation/
      AppNavHost.kt
  di/
    AppModule.kt              (Hilt modules)
```

**Key rules:**
- Each screen has its own ViewModel.
- ViewModel exposes `StateFlow<UiState>` (sealed class for Loading/Error/Success).
- Composables are stateless where possible; state hoisted to ViewModel.
- `ViewModel -> UseCase -> Repository -> DataSource` is the only legal call chain.
- UseCases are thin; skip them only for trivial pass-throughs.
- Hilt for DI; Retrofit or Ktor for HTTP; kotlinx.serialization for JSON; Coroutines + Flow for async.

**Navigation:** Jetpack Navigation Compose with `NavHost` and typed routes (`@Serializable` data classes as routes). Keep navigation logic in `AppNavHost.kt`; screens receive navigation callbacks as lambda parameters (not `NavController` directly — easier to test).

### Pattern 4: External Adapters with Circuit Breakers

**What:** Every external dependency (DataJud, Claude, Stripe, FCM) lives behind a dedicated adapter interface in the API layer.

**Why:** External systems fail. DataJud has been down for hours at a time historically. Claude has rate limits. Stripe webhooks can be duplicated. FCM tokens expire. The adapter pattern isolates these failure modes from business logic.

**Structure (Node.js):**

```
src/
  adapters/
    datajud/
      DataJudAdapter.ts       (interface)
      DataJudHttpClient.ts    (impl with retries, backoff, circuit breaker)
      DataJudMock.ts          (for tests)
    claude/
      ClaudeAdapter.ts
      ClaudeHttpClient.ts     (uses @anthropic-ai/sdk, prompt caching)
    stripe/
      StripeAdapter.ts
      StripeHttpClient.ts
    fcm/
      FcmAdapter.ts
      FcmFirebaseAdmin.ts
  services/
    ProcessSyncService.ts     (uses DataJud + Claude + FCM adapters)
    ChatService.ts            (uses Claude adapter)
    BillingService.ts         (uses Stripe adapter)
  repositories/
    ProcessRepository.ts      (Supabase queries)
    TenantRepository.ts
  controllers/
    processes.controller.ts
    chat.controller.ts
    webhooks/
      stripe.webhook.ts
  workers/
    datajud-sync.worker.ts    (separate entry point)
    notification-fanout.worker.ts
```

**Adapter requirements:**
- Timeout on every call (DataJud: 30s; Claude: 60s streaming; Stripe: 10s; FCM: 10s).
- Retry with exponential backoff for transient failures (HTTP 5xx, network errors).
- Circuit breaker (e.g., `opossum`): after N failures, fail fast for M seconds.
- Structured logging of every external call (duration, status, tenant_id).
- Metrics: call count, error rate, p50/p95/p99 latency.

### Pattern 5: DataJud Scheduled Pull (NOT Webhooks)

**What:** A dedicated worker polls DataJud on a schedule, diffs results against stored state, and emits domain events for new movements.

**Why:** DataJud (CNJ) does not provide webhooks. It is a read-only REST API. You MUST pull. The question is how often and how efficiently.

**Recommended design:**

```
Tier 1 (hot): Every 6 hours, for processes with activity in last 30 days
Tier 2 (warm): Every 24 hours, for processes with activity in last 90 days
Tier 3 (cold): Every 7 days, for processes with no activity in last 90 days
```

**Why tiered:** DataJud rate limits are not public but it is a shared government system — be a good citizen. Cost is bounded: 1000 active processes polled every 6 hours = 4000 requests/day. Manageable.

**Worker structure:**
- Runs as a **separate process** from the HTTP API (not on the same Node.js server). Reasoning: long-running batch work shouldn't block HTTP requests or share event loop.
- Uses BullMQ or similar (Redis-backed) or native cron (`node-cron`) for scheduling.
- **Idempotency:** diffing is by DataJud's movement ID. If a run is retried after partial failure, duplicates are avoided.
- **Checkpointing:** store `last_datajud_sync_at` and `last_datajud_sync_status` per process.
- **Backoff on failures:** process with 3 failed syncs moves to a retry queue with 1h/6h/24h backoff.

**Alternative considered:** Real-time pull triggered by user opening the app ("pull on open"). Useful as a UX enhancement (stale-while-revalidate), but not a replacement for the scheduled job — clients who don't open the app still need push notifications.

### Pattern 6: Claude API with Prompt Caching + Streaming

**What:** Long, stable context (process summary + movement history) is cached on Anthropic's side via prompt caching; chat responses stream to the client.

**Why:** Legal process context is long (dozens of movements, each with text). Sending it on every chat turn is expensive. Prompt caching (available on Claude API since 2024) gives ~90% cost reduction on cached tokens. Streaming is critical for chat UX — users expect to see tokens appearing.

**Implementation:**

```typescript
// services/ChatService.ts (Node.js)
async function streamChat(processId, tenantId, userId, userMessage) {
  const context = await buildProcessContext(processId, tenantId); // movements + summary

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-5",  // verify current model at integration time
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM_PROMPT }, // static, cached
      {
        type: "text",
        text: context,
        cache_control: { type: "ephemeral" } // prompt caching
      }
    ],
    messages: [
      ...previousMessages,
      { role: "user", content: userMessage }
    ],
  });

  for await (const chunk of stream) {
    yield chunk; // pipe to SSE/HTTP response
  }
}
```

**Rate limiting:**
- Per-tenant token budget enforced in middleware (`X-Tenant-Id` from JWT -> token counter in Redis).
- Global circuit breaker on Claude adapter.
- Chat has stricter limit than translation (e.g., 20 messages/hour per end user).

**Translation caching:**
- Movement translations are cached in Postgres (`movement_translations` table keyed on movement text hash).
- Translation is deterministic enough that cache hit rate should be very high for common movement types ("Remetidos os autos...", "Conclusos para decisão...").

### Pattern 7: Stripe Webhooks with Idempotency

**What:** Webhook handler at `/webhooks/stripe`, verifies signature, processes event idempotently, updates `tenants.subscription_status`.

**Why:** Stripe is the source of truth for subscription state. Webhooks can be duplicated or out-of-order. Entitlement checks happen on every request against the database (not against Stripe directly).

**Implementation requirements:**
- **Signature verification** via `STRIPE_WEBHOOK_SECRET` — reject unsigned requests with 401.
- **Raw body** — Stripe signs the raw bytes, so the webhook route must NOT have JSON body parsing middleware applied (use a raw body parser for this route only).
- **Idempotency:** store processed `event.id` in `stripe_events` table; check-and-skip on retry.
- **Async:** webhook handler acknowledges 200 quickly and pushes work onto a queue if processing is expensive.
- **Relevant events:** `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.

**Entitlement check middleware:**

```typescript
// Runs on every protected API request
async function requireActiveSubscription(req, res, next) {
  const tenantId = req.jwt.tenant_id;
  const tenant = await tenantRepo.get(tenantId);

  if (tenant.subscription_status === 'active' || tenant.subscription_status === 'trialing') {
    return next();
  }
  if (tenant.subscription_status === 'past_due' && inGracePeriod(tenant)) {
    return next(); // still allowed
  }
  return res.status(402).json({ error: 'subscription_required' });
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Supabase Access from Android

**What:** Android app uses `supabase-kt` client to query tables directly using anon key + RLS.

**Why bad:**
- Business logic (Claude calls, DataJud) cannot live client-side, so you end up with half the logic in the app and half in a backend — worst of both worlds.
- Harder to audit: every RLS bug becomes a data leak.
- Impossible to change schema without forcing app updates.
- Legal data is too sensitive to rely solely on client-enforced RLS.

**Instead:** Android calls Node.js API, which calls Supabase. Supabase Auth is used only for login.

### Anti-Pattern 2: Schema-per-Tenant

**What:** Create a separate Postgres schema for each law firm.

**Why bad:**
- At 100+ tenants, migrations become nightmarish (must apply to every schema).
- Connection pool fragmentation (each schema is effectively a different session context).
- Backup/restore complexity multiplies.
- Supabase tooling (dashboard, realtime, RLS) is designed for shared schema.

**Instead:** Single schema, `tenant_id` column, RLS policies. Industry standard for B2B SaaS at this scale.

### Anti-Pattern 3: Polling DataJud from the Android App

**What:** App makes DataJud requests directly when user opens process screen.

**Why bad:**
- DataJud API key / endpoint is exposed.
- Every user hitting DataJud = thundering herd.
- No caching layer.
- Cannot trigger push notifications on new movements.
- Translation via Claude would need to happen in-app (Claude key exposed).

**Instead:** Scheduled server-side sync, store results, serve from backend.

### Anti-Pattern 4: Running Background Sync Inside HTTP API Process

**What:** Node.js API process has a `setInterval` or `cron` that polls DataJud.

**Why bad:**
- Scaling HTTP horizontally (multiple instances) means the cron runs N times.
- Long-running jobs block the event loop, degrading HTTP latency.
- Deploy restarts interrupt in-flight batch work.

**Instead:** Separate worker process. Use a distributed lock (Redis, or `pg_try_advisory_lock` in Postgres) if multiple worker instances run.

### Anti-Pattern 5: Calling Claude API Without Caching

**What:** Every chat message and every movement translation hits Claude fresh.

**Why bad:**
- Cost balloons (movements repeat across processes — same boilerplate text).
- Latency is worse (full context re-processing).
- Hits rate limits faster.

**Instead:** Two caching layers:
1. **Prompt caching** (Anthropic-side) for the system prompt + process context on chat turns.
2. **Application cache** (Postgres table) for movement translations keyed on text hash.

### Anti-Pattern 6: Trusting `user_metadata` for Authorization

**What:** Storing `tenant_id` or `role` in `user_metadata` (user-writable) instead of `app_metadata` (server-only).

**Why bad:** Users can update `user_metadata` via the Supabase client. A malicious client rewrites their tenant_id and reads another firm's data.

**Instead:** `app_metadata` only, set via Admin API at sign-up. RLS policies read from `app_metadata`.

### Anti-Pattern 7: Two Activities or Fragments for Two Apps

**What:** Building `app_cliente` and `app_escritorio` as two activities in a single APK with runtime role switching.

**Why bad:** App stores (Play Store) reviews don't like conditional UI based on account types; the two audiences have very different UX expectations; bundle size suffers; onboarding is confusing.

**Instead:** Two separate APKs, two separate Play Store listings, sharing a common Kotlin module (`:shared-domain`, `:shared-data`) for models and repositories. Gradle multi-module project.

## Scalability Considerations

| Concern | At 10 tenants / 100 users | At 100 tenants / 10K users | At 1000 tenants / 100K users |
|---------|---------------------------|----------------------------|------------------------------|
| Database | Single Supabase Pro instance, shared schema | Supabase Pro w/ read replicas, connection pooler (PgBouncer/Supavisor) | Supabase Team/Enterprise, partitioning by `tenant_id` for `movements` table |
| API | Single Node.js instance | 2-4 instances behind load balancer, stateless | 4-16 instances, autoscaling, dedicated per-region |
| Worker | Single cron job on API host | Separate worker instance, Redis queue (BullMQ) | Multiple workers, partitioned by tenant_id hash |
| DataJud sync | 6h polling all | Tiered polling, prioritized | Tiered polling + "pull on app open" hint to re-prioritize |
| Claude cost | Pay-as-you-go, prompt caching | Volume discount, tenant-level rate limits | Negotiated Anthropic contract |
| Push notifications | FCM direct calls | FCM batched, async queue | Regional FCM endpoints, dedicated fan-out workers |
| RLS performance | Fine | Monitor index usage, wrap JWT in `(SELECT ...)` | Consider partition-pruning via declarative partitioning on `tenant_id` |

**Migration paths:** The shared-schema/RLS/Node.js architecture scales smoothly to ~1000 tenants. Above that, consider sharding by tenant (not urgent for v1).

## Build Order (Phase Dependencies)

This is the recommended order for roadmap phasing — each phase unlocks the next.

```
Phase 1: Foundation (no external deps)
  - Supabase project setup
  - Tables: tenants, users (auth.users), law_firms, clients, processes
  - RLS policies for tenant isolation
  - Supabase Auth with app_metadata (role, tenant_id)
  - Node.js API scaffold: Fastify/Express, JWT verification middleware, logging
  - Minimal controllers: /me, /tenants, /health
  - CI/CD pipeline (deploy API + migrate schema)

Phase 2: Core CRUD (API only, no mobile yet)
  - Tenant management endpoints
  - Law firm user CRUD (admin_escritorio role)
  - Client user CRUD (invite flow, Supabase Auth invite)
  - Process CRUD (no DataJud yet — manually entered data)
  - E2E integration tests with real Supabase

Phase 3: app_escritorio (first mobile client)
  - Android project: Clean Architecture scaffold
  - Hilt, Retrofit, Coroutines, Compose Navigation
  - Login flow (Supabase Auth)
  - Client list, client detail, process assignment screens
  - This validates the API design before building the second app

Phase 4: DataJud Integration
  - DataJud adapter in API (with mock for tests)
  - Sync service: one-shot sync per process
  - Movements table, idempotent diffing
  - Worker process scaffold (separate entry point)
  - Scheduled job: poll active processes
  - Manual test: trigger sync for a test process

Phase 5: Claude Integration (translation first)
  - Claude adapter with prompt caching
  - Translation service: movement -> simple PT-BR
  - Translation cache table
  - Extend sync flow: new movement -> translate -> store
  - Quality tests: sample 20 real movement texts, human-review translations

Phase 6: app_cliente (second mobile client)
  - Android project setup (shared module with app_escritorio for models)
  - Login flow
  - Process list + process detail screens (read-only view)
  - Timeline of translated movements
  - This is the end-user-visible MVP

Phase 7: Push Notifications
  - FCM setup (Firebase project, Admin SDK)
  - Device token registration endpoint
  - Notification service in API
  - Integration with sync worker: new movement -> fan-out push
  - app_cliente foreground + background handling

Phase 8: AI Chat
  - Chat endpoint (streaming SSE)
  - Chat service using Claude adapter
  - Chat messages table
  - app_cliente chat screen with streaming UI
  - Rate limiting per user

Phase 9: Stripe Billing
  - Stripe customer/subscription creation flow
  - Webhook endpoint with signature verification
  - Idempotency via stripe_events table
  - Entitlement middleware on protected routes
  - Trial period, grace period, past_due handling
  - Admin UI (or manual DB updates) for billing support

Phase 10: Polish + Production Readiness
  - Observability: structured logs, metrics, error tracking (Sentry)
  - Backups: Supabase automatic + manual test of restore
  - Runbooks for common failures (DataJud down, Claude rate limit)
  - Load testing, tune RLS indexes
  - Security review: RLS audit, secrets rotation policy
```

**Critical dependencies:**
- **DataJud before Claude** — Claude translates DataJud output, so DataJud must be working first.
- **API + Supabase before any Android** — never build a mobile client against a fake/mocked backend beyond a trivial smoke test.
- **app_escritorio before app_cliente** — the firm-side app is simpler and validates the API contract before building the more complex end-user app.
- **Stripe LAST** — don't gate feature development on billing; stripe comes in after MVP is proven.

## Critical Integration Points

These are the points where two subsystems meet and where most production bugs live. Each warrants explicit integration tests.

1. **JWT -> tenant_id propagation** — User logs in via Supabase Auth, receives JWT. Node.js API verifies JWT signature (via Supabase JWT secret) and extracts `app_metadata.tenant_id`. RLS policies in Postgres read the same claim. **Test:** cross-tenant access attempt must return 403.

2. **DataJud number format validation** — CNJ numbers follow `NNNNNNN-DD.AAAA.J.TT.OOOO` pattern. Validation must happen at the API boundary (client can send anything). Store normalized form.

3. **Claude streaming -> HTTP response** — SSE needs correct headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`). Nginx/proxy must not buffer. **Test:** user closes connection mid-stream -> Claude stream cancellation.

4. **FCM token lifecycle** — Tokens expire (months), get revoked on uninstall, get rotated. Backend must handle `UNREGISTERED` / `NOT_FOUND` FCM errors and mark tokens stale. **Test:** stale token cleanup.

5. **Stripe webhook replay** — Stripe retries webhooks. Must be idempotent. **Test:** replay the same webhook event twice, verify only one state change.

6. **Supabase service-role key exposure** — This key bypasses RLS. Must never appear in client code, logs, or error messages. **Test:** grep source for service_role references, audit logs for key leakage.

7. **Background worker + HTTP API sharing services layer** — If both import the same `ProcessService`, they must not share mutable state (e.g., in-memory caches). Use explicit dependency injection per-request in HTTP, per-job in worker.

8. **Mobile app session refresh** — Supabase JWTs expire (1h default). Android app must refresh via `supabase.auth.refreshSession()` before expiry. Interceptor in Retrofit/Ktor catches 401, refreshes, retries.

## Architecture Decision Records (ADR summaries)

These are decisions implicit in the recommendations above. The roadmap should surface each as an explicit decision point.

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | Shared schema + RLS for multi-tenancy | Standard for B2B SaaS at this scale; Supabase-native |
| ADR-002 | API-mediated Supabase access (not direct) | Business logic centralization; secret safety |
| ADR-003 | Clean Architecture + MVVM for Android | Official Android recommendation; test-friendly |
| ADR-004 | Two separate APKs for cliente/escritorio | Distinct audiences; cleaner UX; Gradle shared module |
| ADR-005 | Scheduled pull for DataJud (tiered) | DataJud has no webhooks; tiered cost control |
| ADR-006 | Separate worker process for sync | Don't block HTTP event loop; scale independently |
| ADR-007 | Prompt caching + translation cache for Claude | Cost and latency reduction |
| ADR-008 | Stripe webhook with idempotency table | Stripe retries; must be safe |
| ADR-009 | `app_metadata` (not `user_metadata`) for auth claims | `user_metadata` is user-writable = security hole |
| ADR-010 | Node.js + Fastify (or Express) for API | Team familiarity, Supabase JS client parity |

## Sources

**Note on source verification:** This research was conducted with limited external verification tooling (WebSearch, most WebFetch URLs, and Context7 were unavailable in this session). Conclusions below rely primarily on training-data knowledge of well-established, stable patterns, supplemented by the sources that were reachable. Confidence is flagged per area.

| Area | Confidence | Primary Source | Verified? |
|------|------------|----------------|-----------|
| Android Clean Architecture + Compose + MVVM | **HIGH** | developer.android.com (reachable) | Yes — official guidance fetched directly |
| Jetpack Compose state management, UDF | **HIGH** | developer.android.com/develop/ui/compose/architecture | Yes |
| Multi-module navigation | **HIGH** | developer.android.com/guide/navigation/design/encapsulate | Yes |
| Supabase RLS multi-tenant patterns | **MEDIUM** | Training data (stable since 2021); Supabase docs unreachable this session | Flag: recommend re-verification against current Supabase RLS docs before implementation |
| Node.js layered architecture | **HIGH** | Widely established pattern (Express/Fastify standard) | N/A — foundational pattern |
| Claude API prompt caching + streaming | **MEDIUM** | Training data (feature stable since mid-2024); docs.anthropic.com unreachable this session | Flag: verify current model names and caching API shape at integration time |
| Stripe webhook patterns (signature, idempotency) | **HIGH** | Training data from official Stripe docs (very stable pattern) | N/A — standard pattern |
| FCM + Node.js Firebase Admin SDK | **HIGH** | Training data (stable pattern) | Flag: verify HTTP v1 API (legacy API was deprecated) |
| DataJud (CNJ) integration specifics | **LOW-MEDIUM** | Training data is thin on DataJud specifics | Flag: requires dedicated pre-implementation research phase on DataJud rate limits, schema, stability |
| BullMQ / worker queue patterns | **HIGH** | Standard Node.js pattern | N/A |
| Multi-tenancy shared-schema vs schema-per-tenant | **HIGH** | Well-established industry consensus for SaaS at 10-1000 tenants | N/A — foundational decision |

**Recommendations for pre-implementation verification:**
1. Fetch current Supabase RLS documentation and confirm `app_metadata` claim syntax in policies (syntax has changed minor details across versions).
2. Fetch current Anthropic Claude API docs for prompt caching — confirm the `cache_control` parameter shape and current models.
3. Research DataJud API in depth (this research was not about DataJud specifically — Stack research should cover rate limits, auth, response shape, known outages).
4. Confirm Firebase Admin SDK HTTP v1 API (legacy API deprecated mid-2024).
5. Check current Supabase connection pooler (Supavisor replaced PgBouncer in 2023) for prod setup.

## Open Questions Flagged for Deeper Research

These remain unresolved and should be addressed in later phase-specific research:

1. **DataJud rate limits and SLA** — no public documentation found. Likely needs empirical testing or CNJ outreach.
2. **Translation consistency for legal Portuguese** — Claude quality on niche legal jargon varies. Needs evaluation with 50-100 real movement samples before committing UX copy.
3. **Offline support on app_cliente** — do users expect to view old process data without network? If yes, Room + sync strategy is needed. This adds complexity and should be an explicit product decision.
4. **Analytics / observability stack** — Sentry? Datadog? Supabase Logs? PostHog? Not covered in this research.
5. **Backup strategy beyond Supabase defaults** — for legal data, may need off-site backups and restore drills. Regulatory question (LGPD Brazil).
6. **LGPD compliance requirements** — Brazilian data protection law impacts data retention, deletion requests, consent records. Needs dedicated compliance research.
7. **Push notification localization** — Portuguese-only for v1? This affects FCM payload structure.
8. **Deep linking from push notifications** — app should open directly to the relevant process. Standard pattern but needs URL schema design.
