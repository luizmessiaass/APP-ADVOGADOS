# Technology Stack — Portal Jurídico SaaS

**Project:** Portal Jurídico — SaaS B2B para Escritórios de Advocacia
**Researched:** 2026-04-14
**Research mode:** Ecosystem (greenfield stack selection)
**Overall confidence:** MEDIUM

---

## Overview

This is a multi-tenant B2B legal-tech SaaS with a Node.js backend on Supabase, two distinct Android clients (end-client app + law-firm admin panel), DataJud (CNJ) integration, Claude API for PT-BR legal translation and chat, Stripe subscriptions, and FCM push notifications.

Because the non-negotiable constraints are already set in `PROJECT.md` (Kotlin/Compose + Node.js + Supabase + DataJud + Claude + Stripe + RLS multi-tenancy), this research does **not** re-litigate those decisions. Instead, it prescribes the specific libraries, versions, patterns, and anti-patterns that make those constraints work together in 2025/2026.

**Key architectural bets:**
1. **Supabase as source of truth for auth + data** — Node.js backend uses `service_role` key only for background jobs and server-only logic. Android apps talk to Supabase **directly** using the official Kotlin SDK (`supabase-kt`) for auth, queries, and realtime. RLS is the primary security boundary, not the Node backend.
2. **Node.js as orchestration layer, not CRUD proxy** — Node.js handles DataJud polling, Claude API calls (prompt caching, streaming), Stripe webhooks, and FCM dispatch. It is **not** a pass-through for Android→Postgres traffic.
3. **Two Android apps, one shared module** — Separate `:app-cliente` and `:app-escritorio` Gradle modules, plus a `:core` module with shared networking, auth, models, and DataJud types. Avoid a single-codebase "role-switch" app.
4. **RLS first, backend checks second** — Every tenant-scoped table has `tenant_id uuid not null` + restrictive RLS policies. Backend service-role code still checks tenant context explicitly as defense-in-depth.

> Confidence note: Web research tooling (WebSearch / WebFetch) was blocked at the time of this research. Version numbers below are pinned to what Claude's training data shows as the most recent stable releases as of late 2025 / early 2026. **Before phase execution, verify versions against Maven Central, npm registry, and official docs** — flagged explicitly in the Confidence Levels section.

---

## Recommended Stack

### Backend — Node.js + Supabase

#### Runtime & Language

| Technology | Version | Purpose | Why |
|---|---|---|---|
| **Node.js** | 22 LTS (22.11+) | JavaScript runtime | Current LTS line with stable native fetch, `node:test`, native `.env` loading, and permission model. 20 LTS also acceptable; avoid 21/23 (non-LTS). |
| **TypeScript** | 5.6+ | Type safety | Non-negotiable for a SaaS with multi-tenant isolation — types catch cross-tenant leaks at compile time. |
| **pnpm** | 9.x | Package manager | Faster installs, strict dependency resolution, better monorepo support than npm. Alternative: npm 10+ (ships with Node 22) if you want zero extra tooling. |

#### Supabase Integration

| Library | Version | Purpose | Why |
|---|---|---|---|
| `@supabase/supabase-js` | **2.45.x+** | Official Supabase JS client | Handles auth, postgrest queries, realtime, storage, and edge functions in one package. Use with `service_role` key on backend for admin ops (bypasses RLS). |
| `@supabase/ssr` | **0.5.x+** | Server-side session helpers | Use **only** if you add a Next.js/Remix web console later. Not needed for pure REST API. |

**Critical pattern:** Create two Supabase client instances in Node.js code:
- `supabaseAdmin` — uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS, used for background jobs, webhooks, admin endpoints.
- `supabaseAsUser(jwt)` — creates a new client with the user's JWT on every request, RLS enforced. Used for user-action endpoints where you want defense-in-depth beyond just trusting the service role.

**Do NOT** store the service role key in any client-facing bundle, env file checked into git, or Android app.

#### HTTP Framework

| Library | Version | Purpose | Why |
|---|---|---|---|
| **Fastify** | **5.x** (5.1+) | HTTP framework | Faster than Express, built-in schema validation via JSON Schema/TypeBox, first-class async/await, excellent TypeScript support, mature plugin ecosystem. Native support for `onRequest`/`preHandler` hooks for tenant extraction. |
| `@fastify/cors` | 10.x | CORS | Android apps don't need CORS, but admin/web panels might. |
| `@fastify/helmet` | 12.x | Security headers | Defense-in-depth. |
| `@fastify/rate-limit` | 10.x | Rate limiting | Essential for DataJud + Claude cost control. Per-tenant limits. |
| `@fastify/jwt` | 9.x | JWT verification | Verify Supabase-issued JWTs on every request. Use Supabase's JWKS endpoint or shared secret depending on project config. |

**Why not Express?** Express 5 finally shipped but is still catching up on async error handling, and its middleware model is weaker than Fastify's hook system for tenant-scoping. NestJS is too heavy — you'd spend weeks on decorators instead of shipping. Hono is viable but the ecosystem for Stripe/FCM plugins is thinner.

#### Authentication

| Library | Version | Purpose | Why |
|---|---|---|---|
| `@supabase/supabase-js` (auth module) | 2.45.x+ | Auth primitives | Supabase Auth is the constraint — don't roll your own. |
| `jose` | **5.x** | JWT verification | Lightweight, modern, supports JWKS. Prefer over `jsonwebtoken` (which is in maintenance mode and has a more awkward API for async JWKS flows). Used to verify Supabase JWT `Authorization: Bearer` headers in Fastify hooks. |

**Pattern:** Fastify `preHandler` hook extracts `Authorization: Bearer <jwt>`, verifies signature with `jose` against Supabase JWKS (cached), decodes `sub` (user_id) and `app_metadata.tenant_id` and `role` claims (set via Supabase Auth hooks), attaches to `request.user`. Every handler then has guaranteed tenant context.

#### Job Scheduling (DataJud polling)

| Library | Version | Purpose | Why |
|---|---|---|---|
| **BullMQ** | **5.x** (5.30+) | Queue + scheduler | Redis-backed job queue with repeatable jobs (cron), delayed jobs, retries with backoff, observability via Bull Board. The right choice for periodic DataJud polling that must survive restarts and scale horizontally. |
| `ioredis` | 5.x | Redis client | BullMQ peer dependency. Use Upstash Redis or Railway Redis in production to avoid hosting Redis yourself. |
| `@bull-board/fastify` | 6.x | Job dashboard (optional) | Admin-only route to inspect queues. |

**Why not `node-cron`?** `node-cron` runs in-process with no persistence, no retry, no distributed locking — if your Node process restarts during a DataJud poll, jobs are lost. For a SaaS polling thousands of processes per day on a rate-limited external API, this is unacceptable.

**Why not Supabase `pg_cron` alone?** `pg_cron` is fine for pure SQL maintenance (vacuum, stat rollups), but invoking external APIs from inside Postgres is awkward — you'd need `pg_net` and can't easily handle Claude/DataJud errors, retries, or streaming. Use BullMQ for anything that calls out over HTTP.

**Why not Supabase Edge Functions for polling?** See "Edge Functions vs Node.js" below.

#### Stripe Integration

| Library | Version | Purpose | Why |
|---|---|---|---|
| **stripe** | **17.x** (17.3+) | Official Stripe Node SDK | The only choice. TypeScript types ship natively. Pin `apiVersion: '2024-12-18.acacia'` (or current pinned version) explicitly — do **not** use the "latest" dynamic version in production. |
| `raw-body` (via `@fastify/raw-body`) | latest | Webhook signature verification | Stripe webhooks require the raw, unparsed body to verify `Stripe-Signature`. Fastify's JSON parser must be disabled for the `/webhooks/stripe` route only. |

**Critical:** Use Stripe's **Customer Portal** (`stripe.billingPortal.sessions.create`) for plan upgrades/downgrades/cancellations instead of building it yourself. Stripe **Checkout** (hosted) for initial subscription signup. You own the webhook handler that updates `tenants.subscription_status` in Supabase.

#### Claude API (Anthropic)

| Library | Version | Purpose | Why |
|---|---|---|---|
| **@anthropic-ai/sdk** | **0.30.x+** (or current 1.x line) | Official Anthropic SDK | Streaming support, prompt caching, tool use, and beta features are only reliable via the official SDK. |
| `tiktoken` or `@anthropic-ai/tokenizer` | latest | Token counting (optional) | Estimate costs before making requests, enforce per-tenant usage caps. |

**Critical patterns:**
1. **Prompt caching** — Mark the system prompt (PT-BR legal translation instructions + glossary) as `cache_control: { type: "ephemeral" }`. For 10K+ tokens of instructions reused across thousands of translation calls, this cuts cost by ~90% on cached reads.
2. **Streaming for chat** — Use the SDK's streaming API. Forward server-sent events through Fastify to the Android app via WebSocket or SSE — do **not** buffer the full response server-side.
3. **Tenant isolation for context** — Never put another tenant's process data in the prompt. Inject only the current user's process context.

#### Firebase Cloud Messaging (FCM)

| Library | Version | Purpose | Why |
|---|---|---|---|
| **firebase-admin** | **12.x** (12.7+) | Firebase Admin SDK for Node.js | Official SDK for sending FCM messages from the backend. Also gives you Firebase Auth verification if you ever need it, plus Firestore/RTDB access (not used here, but free). |

**Pattern:** `devices` table in Supabase stores `(user_id, fcm_token, platform, last_seen)`. On new DataJud movement, backend worker looks up the user's FCM tokens and calls `messaging.sendEachForMulticast`. Clean up invalid tokens returned in the response. **Do not** send FCM from Android (fan-out logic belongs on the backend).

#### HTTP Client (DataJud & outbound HTTP)

| Library | Version | Purpose | Why |
|---|---|---|---|
| **undici** | **6.x** (or Node 22 built-in `fetch`) | HTTP/1.1 + HTTP/2 client | Node 22's built-in `fetch` is backed by `undici`. Use `undici.request` directly when you need connection pooling, retries, or detailed timing. For DataJud polling where you may hit rate limits, `undici.Pool` with controlled concurrency is the right choice. |
| `p-retry` | **6.x** | Retry with backoff | Wrap DataJud calls with exponential backoff. DataJud returns 429 under load — must handle gracefully. |
| `zod` | **3.23.x+** | Runtime validation | Parse DataJud responses into typed, validated shapes. External API schemas change; Zod catches drift. |

#### Observability & Logging

| Library | Version | Purpose | Why |
|---|---|---|---|
| **pino** | **9.x** | Structured JSON logging | Fastify's default logger. Fastest Node logger. Pair with `pino-pretty` in dev. |
| `@sentry/node` | **8.x** | Error tracking | Catch uncaught exceptions in job workers, track Claude/Stripe/DataJud failures by tenant. Free tier is generous. |

#### Environment & Config

| Library | Version | Purpose | Why |
|---|---|---|---|
| `dotenv` (dev only) or Node 22 `--env-file` | — | Env loading | Node 22 has native `--env-file=.env` — prefer this over `dotenv` package. |
| `envalid` or `zod` | latest | Env validation at boot | Fail fast if `SUPABASE_SERVICE_ROLE_KEY` is missing, not at first request. |

---

### Android — Client Apps (both `app-cliente` and `app-escritorio`)

Baseline already in `gradle/libs.versions.toml`: Kotlin 2.2.10, Compose BOM 2024.09.00, AGP 9.1.1, compileSdk 36, minSdk 27. Keep these as the anchor — versions below are compatible additions.

#### Core Module Layout

```
:core-common        (pure Kotlin: models, errors, validators for CNJ numbers)
:core-network       (Ktor/Supabase clients, JWT refresh)
:core-data          (repositories, datasources, DataJud/Claude API adapters)
:core-ui            (shared Compose components, theme, typography)
:app-cliente        (end-user app)
:app-escritorio     (law firm admin app)
```

Shared code lives in `:core-*`. Each `:app-*` module wires its own DI graph and navigation but reuses all networking/data.

#### Supabase on Android — The Big Decision

**Recommendation: Use the official `supabase-kt` SDK, not raw HTTP.**

| Library | Version | Purpose | Why |
|---|---|---|---|
| `io.github.jan-tennert.supabase:auth-kt` | **3.0.x+** (supabase-kt v3 line) | Supabase Auth client | Handles token refresh, session storage, email/password, OTP, OAuth. Saves ~1500 LOC of token-handling code you would otherwise write. |
| `io.github.jan-tennert.supabase:postgrest-kt` | 3.0.x+ | PostgREST queries | Typed query builder. Enforces RLS automatically (uses user's JWT). |
| `io.github.jan-tennert.supabase:realtime-kt` | 3.0.x+ | Realtime subscriptions | **Optional for v1.** Useful later for live chat message streaming or live process status updates. |
| `io.github.jan-tennert.supabase:storage-kt` | 3.0.x+ | File storage | Only if you add document attachments later. Skip for v1. |
| `io.ktor:ktor-client-android` | **3.0.x+** | HTTP engine (peer dep) | supabase-kt uses Ktor under the hood. |

**Why supabase-kt over raw Retrofit against Supabase REST?**
1. **Token refresh is non-trivial** — Supabase JWTs expire every hour; refresh tokens need proper storage + race-condition-free refresh. supabase-kt handles this; Retrofit + OkHttp Authenticator gets you 80% but misses edge cases.
2. **Realtime channels** need a WebSocket layer; Retrofit doesn't do WebSockets cleanly — you'd pull in another library anyway.
3. **PostgREST filter syntax** (`?column=eq.value`) is tedious to build by hand; supabase-kt's DSL catches typos at compile time.
4. **The SDK is actively maintained** by Jan Tennert, the community maintainer, with Supabase team coordination.

**When you WOULD use raw Retrofit:** only for non-Supabase endpoints — your Node.js backend's `/api/datajud/refresh`, `/api/chat/stream`, `/api/stripe/portal-link`, etc.

#### HTTP Client for Your Node.js Backend

**Recommendation: Ktor Client, not Retrofit, for the v1 backend integration.**

| Library | Version | Purpose | Why |
|---|---|---|---|
| **Ktor Client** | **3.0.x+** (3.0.3) | HTTP client | supabase-kt already pulls Ktor 3 as a transitive dep — adding Retrofit on top means shipping **two** HTTP stacks (OkHttp + Ktor) and two JSON parsers. That's ~1.5 MB APK bloat for zero benefit. Standardize on Ktor. |
| `io.ktor:ktor-client-content-negotiation` | 3.0.x+ | JSON/protobuf negotiation | |
| `io.ktor:ktor-serialization-kotlinx-json` | 3.0.x+ | kotlinx.serialization glue | |
| `io.ktor:ktor-client-logging` | 3.0.x+ | HTTP log interceptor | Debug builds only. |
| `io.ktor:ktor-client-auth` | 3.0.x+ | Bearer token plumbing | Wires Supabase JWT into outbound requests. |

**Retrofit note:** If your team has strong existing Retrofit experience and you'd rather not learn Ktor Client, Retrofit 2.11.x + OkHttp 4.12.x + `kotlinx-serialization-converter` is a valid fallback. But you'll still ship Ktor because supabase-kt requires it. The clean path is Ktor-only.

**Do not use Volley, HttpURLConnection, or Fuel.** Legacy, unmaintained, or niche.

#### Serialization

| Library | Version | Purpose | Why |
|---|---|---|---|
| **kotlinx.serialization** | **1.7.x+** | JSON (de)serialization | Compile-time codegen, works with Ktor and supabase-kt out of the box. No reflection at runtime. |

**Do not use Gson or Moshi** for this project. Gson is in maintenance mode. Moshi is fine but requires KSP config and doesn't integrate as cleanly with Ktor/supabase-kt. kotlinx.serialization is the modern Kotlin default.

#### Architecture Libraries

| Library | Version | Purpose | Why |
|---|---|---|---|
| `androidx.lifecycle:lifecycle-viewmodel-compose` | **2.10.0+** (already in baseline) | ViewModel | Standard. Keep. |
| `androidx.navigation:navigation-compose` | **2.9.x+** | Navigation | Standard Compose navigation. Pair with type-safe routes using Kotlin Serialization (`NavType` for `@Serializable` routes — released in 2.8). |
| `androidx.hilt:hilt-navigation-compose` | 1.2.x+ | DI + Nav glue | If using Hilt. |
| **Hilt** (`com.google.dagger:hilt-android`) | **2.52+** | Dependency injection | Standard Google-blessed DI for Android. Works with Compose/ViewModel. Use `@HiltViewModel`. |
| **Koin** (alternative) | 4.x | DI (lightweight) | Choose if you want zero KAPT/KSP codegen. Koin 4 has compile-time verification now. Either is fine; **pick one and commit**. Recommendation: **Hilt** for larger teams, **Koin** for speed-of-setup. |
| `androidx.datastore:datastore-preferences` | 1.1.x+ | Persistent key-value | Replaces SharedPreferences. Store FCM token, user preferences, feature flags. |
| `androidx.paging:paging-compose` | 3.3.x+ | Paginated lists | For client's process list when they have >20 processes (rare but polite). |

#### Coroutines & Reactive

| Library | Version | Purpose | Why |
|---|---|---|---|
| `org.jetbrains.kotlinx:kotlinx-coroutines-android` | **1.9.x+** | Coroutines | Baseline Kotlin async. |
| `kotlinx-coroutines-play-services` | 1.9.x+ | `Task.await()` | Needed to bridge Firebase SDK's `Task<T>` into coroutines. |

**Flow** is the state stream primitive. `StateFlow` for UI state, `SharedFlow` for one-shot events. Don't use RxJava/LiveData in new code.

#### Firebase Cloud Messaging (Android side)

| Library | Version | Purpose | Why |
|---|---|---|---|
| `com.google.firebase:firebase-bom` | **33.7.x+** | Firebase BOM | Pin one BOM, let it manage all firebase-* versions. |
| `com.google.firebase:firebase-messaging-ktx` | via BOM | FCM client | Token registration, `FirebaseMessagingService` for foreground/background message handling. |
| `com.google.gms:google-services` (Gradle plugin) | 4.4.x+ | google-services.json processing | Required. |

**Pattern:** On app start (after login), call `FirebaseMessaging.getInstance().token.await()`, POST it to `/api/devices/register` on your Node backend. On logout, delete the token server-side and call `FirebaseMessaging.getInstance().deleteToken()` client-side.

**Notification permission** on Android 13+ (API 33+) — request `POST_NOTIFICATIONS` at the right moment (after user logs in and first sees value), not at app start. Remember: minSdk 27, so the permission is only relevant on 33+.

#### Claude API on Android — DO NOT Call Directly

**Anti-pattern:** Calling Anthropic API directly from Android apps.

**Why:** Embedding an Anthropic API key in an APK leaks it within minutes of release. Even with certificate pinning, key extraction is trivial with Frida. Route **all** Claude calls through your Node backend, which holds the key and enforces per-tenant rate/cost limits.

**Recommended client pattern:**
- `/api/translate` — Android POSTs a movement ID; backend fetches movement from DB, calls Claude, caches result, returns translation.
- `/api/chat` — Android opens an SSE or WebSocket to `/api/chat/stream?processo_id=...`, sends user message, receives streamed tokens. Use Ktor's SSE client (Ktor 3 has first-class SSE support) or the WebSocket client.

#### Stripe on Android — Redirect, Don't Embed

**Anti-pattern:** Shipping Stripe SDK in the firm-admin app for in-app checkout.

**Why:** Managing card collection in a B2B SaaS admin app is compliance overhead you don't need. Use Stripe **Checkout** (hosted) + **Customer Portal** (hosted). The Android admin app shows a "Manage Subscription" button that opens a `Custom Tab` (via `androidx.browser:browser`) to the portal session URL from your backend.

| Library | Version | Purpose | Why |
|---|---|---|---|
| `androidx.browser:browser` | **1.8.x+** | Chrome Custom Tabs | Open Stripe Checkout / Portal in a secure in-app browser. Better UX than full browser handoff, safer than WebView. |

**Do not use WebView** for Stripe flows — Stripe explicitly discourages it and it breaks SCA/3DS in some flows.

#### Testing

| Library | Version | Purpose | Why |
|---|---|---|---|
| `junit:junit` | 4.13.2 (already baseline) | Unit test framework | Baseline. |
| `io.mockk:mockk` | **1.13.13+** | Mocking | Kotlin-first; handles coroutines, objects, extension functions cleanly. Do not use Mockito for new Kotlin code. |
| `app.cash.turbine:turbine` | **1.2.x+** | Flow testing | Essential for testing `StateFlow`/`SharedFlow` in ViewModels. |
| `org.jetbrains.kotlinx:kotlinx-coroutines-test` | 1.9.x+ | Coroutine test dispatchers | |
| `androidx.compose.ui:ui-test-junit4` | via Compose BOM (baseline) | Compose UI tests | Baseline. |
| `com.google.truth:truth` or Kotest `shouldBe` | latest | Assertions | Optional but improves readability. |

#### DataJud Integration (Android side)

Do **not** call DataJud directly from Android. Always go through Node backend. Reason: DataJud responses are huge, need normalization into your schema, and must be cached/stored centrally so push notifications can diff against previous state.

---

### Database & Data Layer (Supabase / PostgreSQL)

| Technology | Version | Purpose | Why |
|---|---|---|---|
| **PostgreSQL** | **15 or 16** (Supabase default) | Primary DB | Supabase is the constraint. PG 16 if your Supabase project supports it, else PG 15. |
| **Row Level Security (RLS)** | Built-in | Multi-tenant isolation | **Non-negotiable per `PROJECT.md`.** Every tenant-scoped table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. |
| **Supabase CLI** | **1.200+** | Schema migrations | Use `supabase migration new`, version-control SQL migrations in `supabase/migrations/`. Do not use an ORM migration tool — it fights Supabase's `auth`/`storage` schemas. |
| `pg_trgm` | ext | Fuzzy search | Client name search in firm panel. |
| `pgcrypto` | ext | UUID generation, encryption | Tenant IDs as `uuid_generate_v7()` (time-ordered, better than v4 for index locality). |
| `pg_cron` | ext | In-DB cron (limited use) | Fine for Postgres-only maintenance. **Not** for DataJud/Claude calls. |

**RLS pattern (canonical):**

```sql
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stripe_customer_id text,
  subscription_status text not null default 'trialing',
  created_at timestamptz not null default now()
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  cpf text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table clientes enable row level security;

create policy clientes_tenant_isolation
  on clientes
  for all
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Critical:** `tenant_id` must be a **JWT claim** set via a Supabase Auth hook (Custom Access Token Hook) when the user signs in. Do not trust `tenant_id` sent from the client. Do not look it up per-request in a `users` table — that defeats RLS perf and has a race-condition window during tenant changes.

**Role hierarchy:**
- `auth.jwt() ->> 'role'` in `('admin_escritorio', 'advogado')` → can see all firm clients
- `auth.jwt() ->> 'role' = 'cliente'` → can only see their own `clientes.id`

Second policy layer for the `cliente` role:
```sql
create policy clientes_self_only
  on clientes
  for select
  using (
    (auth.jwt() ->> 'role') != 'cliente'
    or id = (auth.jwt() ->> 'cliente_id')::uuid
  );
```

---

### Infrastructure & Hosting

| Technology | Version | Purpose | Why |
|---|---|---|---|
| **Supabase Cloud** | — | Database, auth, storage | The constraint. Use Pro tier ($25/mo) when moving past dev — includes daily backups, 8 GB DB, better connection pooling. |
| **Railway** or **Render** or **Fly.io** | — | Node.js backend hosting | All three deploy from GitHub, support secrets, and autoscale. **Recommendation: Railway** for simplicity, **Fly.io** if you want multi-region (São Paulo edge). Avoid raw VPS for v1. |
| **Upstash Redis** | — | BullMQ backend | Serverless Redis, pay-per-request, no provisioning. Alternative: Railway's managed Redis. |
| **Cloudflare R2** (future) | — | Object storage (optional) | If/when you add document storage. Cheaper than Supabase Storage for large volumes. Skip for v1. |
| **GitHub Actions** | — | CI/CD | Free for public repos, generous private tier. Run Android builds, Node tests, Supabase migration dry-runs. |

**Why not Supabase Edge Functions for the backend?** See "Alternatives Considered" below — they have a role, but not as the primary backend.

---

### Developer Tooling

| Tool | Version | Purpose |
|---|---|---|
| **Biome** or **ESLint + Prettier** | Biome 1.9+ / ESLint 9+ | JS/TS lint + format. Biome is faster and simpler; ESLint has the broadest plugin ecosystem. |
| **ktlint** or **detekt** | 1.3+ / 1.23+ | Kotlin lint. Pick one. ktlint for pure formatting, detekt for deeper static analysis. |
| **Android Studio** | Ladybug (2024.2.1) or Meerkat (2024.3) | Android IDE. Latest stable. |
| **VS Code / Cursor / JetBrains Fleet** | — | Backend editor. |
| **Supabase CLI** | 1.200+ | Local Supabase dev, migrations. |

---

## Alternatives Considered

### Node.js Framework: Fastify vs Express vs NestJS vs Hono

| Framework | Verdict | Why Not (or Why) |
|---|---|---|
| **Fastify** | **Recommended** | Fast, TypeScript-native, excellent hook model for tenant extraction, mature plugin ecosystem, stable v5 API. |
| Express 5 | Viable fallback | Ubiquity, but weaker async error handling and middleware vs Fastify hooks. Choose only if team already knows it deeply. |
| NestJS | Too heavy | Decorator-heavy, steep ramp, opinionated structure slows greenfield velocity. Fine for 20+ dev teams; overkill for v1 solo/small team. |
| Hono | Interesting but thin ecosystem | Great for edge deployments, but Stripe/FCM/BullMQ integrations are less battle-tested than Fastify's. Revisit in 12 months. |

### Job Scheduler: BullMQ vs node-cron vs pg_cron vs Temporal vs Inngest

| Option | Verdict | Why Not (or Why) |
|---|---|---|
| **BullMQ** | **Recommended** | Redis-backed, repeatable jobs, retries, observability, horizontal scale. Standard in 2026. |
| `node-cron` | Rejected | In-process only, no persistence, no retry. Jobs lost on restart. |
| `pg_cron` | Partial use | OK for pure SQL maintenance; **bad** for HTTP callouts to DataJud/Claude. |
| **Temporal** | Overkill | Excellent workflow engine but requires its own cluster or paid cloud. For a CRUD SaaS polling an API, BullMQ is simpler. |
| **Inngest** | Worth watching | Step functions-as-a-service, free tier, great DX. Viable alternative if you want zero ops overhead and are willing to accept a vendor lock. **If you prefer zero Redis ops, Inngest is a reasonable substitute for BullMQ.** MEDIUM confidence — verify pricing/limits before committing. |

### Supabase Android SDK vs Raw REST

| Option | Verdict | Why |
|---|---|---|
| **supabase-kt (official Kotlin SDK)** | **Recommended** | Token refresh, typed queries, realtime, storage — all handled. Actively maintained. |
| Raw Retrofit + manual JWT | Rejected | ~1500 LOC of token refresh + PostgREST filter builder you have to write, test, and maintain. No benefit. |
| Apollo Android (GraphQL) | N/A | Supabase exposes PostgREST, not GraphQL (pg_graphql exists but is less used). |

### Android HTTP Client: Ktor vs Retrofit vs OkHttp-only

| Option | Verdict | Why |
|---|---|---|
| **Ktor Client 3.x** | **Recommended** | Already shipped transitively via supabase-kt; standardizing on one stack saves ~1.5 MB APK + mental overhead. Ktor 3 has SSE, WebSockets, content negotiation, logging, auth plugins — feature parity with Retrofit for REST, and **better** for streaming. |
| Retrofit 2.11 + OkHttp 4.12 | Viable fallback | Most mature Android HTTP stack, huge community. Use only if team has strong existing experience. You'll still ship Ktor via supabase-kt. |
| OkHttp directly | Rejected | Too low-level; you'd rebuild Retrofit/Ktor features. |
| Volley, Fuel, HttpURLConnection | Rejected | Legacy/niche. |

### Supabase Edge Functions vs Standalone Node.js Backend

| Option | Verdict | Why |
|---|---|---|
| **Standalone Node.js backend** | **Recommended as primary** | Persistent process for BullMQ workers, full npm ecosystem, long-running jobs, streaming, WebSockets, easy debugging. |
| **Supabase Edge Functions** | **Recommended for specific cases** | Use for: (1) Custom Access Token Hook to inject `tenant_id` and `role` claims into JWT at login — this **must** be an Edge Function since Supabase invokes it. (2) Lightweight webhook endpoints that just need to write to Postgres. (3) Short-lived tasks triggered by DB events via `pg_net`. |
| **Edge Functions as primary backend** | Rejected for v1 | Deno runtime (not Node.js), 150-second max execution, no persistent process for BullMQ, limited npm ecosystem (Deno compat layer is imperfect), debugging harder. Streaming Claude responses through Edge Functions works but hits timeout on long chat sessions. |

**Pragmatic split:**
- **Edge Functions:** Custom Access Token Hook (required), Stripe webhook fast path (optional — Node.js can do this too), DB-triggered side effects.
- **Node.js backend:** Everything else — DataJud polling, Claude API calls, chat streaming, FCM dispatch, admin endpoints, long-running jobs.

### Row Level Security: Postgres RLS vs Application-Layer Checks vs Schema-per-Tenant

| Option | Verdict | Why |
|---|---|---|
| **Postgres RLS with `tenant_id` JWT claim** | **Recommended (constraint)** | Defense at the database layer — even a bug in the Node backend can't leak cross-tenant data. Scales to thousands of tenants. Canonical Supabase pattern. |
| App-layer checks only | Rejected | One missed `WHERE tenant_id = ?` = data breach. Legal data is sensitive; defense-in-depth is non-negotiable. |
| Schema-per-tenant | Rejected | Doesn't scale past ~100 tenants, migrations become hellish, RLS is the modern answer. |
| Database-per-tenant | Rejected | Same scaling issues plus cost. Only for enterprise-tier "dedicated" offerings later. |

### Stripe Integration Pattern

| Option | Verdict | Why |
|---|---|---|
| **Stripe Checkout + Customer Portal + Webhooks** | **Recommended** | Zero PCI scope, Stripe owns the UI, you own webhook reconciliation. Gold standard. |
| Stripe Elements in a web console | Viable later | If you build a web admin panel, use Elements for polished inline checkout. Not needed for v1 Android-only. |
| Stripe SDK embedded in Android app | Rejected | Adds card compliance surface area, Android Stripe SDK is fine but unnecessary when Checkout redirect works. |

### Claude API: Direct vs Proxy vs LangChain

| Option | Verdict | Why |
|---|---|---|
| **Official `@anthropic-ai/sdk` directly from Node.js backend** | **Recommended** | Full control over prompt caching, streaming, cost tracking, tool use. |
| LangChain / LangGraph | Rejected for v1 | Abstraction tax not worth it for a focused 2-endpoint use case (translate + chat). Revisit only if chat becomes a multi-step agentic workflow. |
| Vercel AI SDK (`ai` package) | Worth considering | Nice streaming helpers, provider-agnostic. Usable if you might switch models later. **MEDIUM confidence** — evaluate vs direct SDK during Phase 1 prototype. |

### FCM vs OneSignal vs AWS SNS vs Pusher Beams

| Option | Verdict | Why |
|---|---|---|
| **Firebase Cloud Messaging (FCM)** | **Recommended (constraint)** | Free, standard, direct Android integration. |
| OneSignal | Fine but unnecessary | Adds a vendor for templating/segmentation you don't need at v1. |
| AWS SNS | Over-complex | You'd still need FCM underneath. Pointless intermediary. |
| Pusher Beams | Niche | Fine, but FCM is the default and is free. |

---

## Configuration Notes

### Node.js backend `package.json` (skeleton)

```json
{
  "name": "portal-juridico-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.11.0" },
  "scripts": {
    "dev": "node --env-file=.env --watch src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node --env-file=.env dist/server.js",
    "test": "node --test",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/helmet": "^12.0.0",
    "@fastify/jwt": "^9.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "bullmq": "^5.30.0",
    "fastify": "^5.1.0",
    "firebase-admin": "^12.7.0",
    "ioredis": "^5.4.0",
    "jose": "^5.9.0",
    "p-retry": "^6.2.0",
    "pino": "^9.5.0",
    "stripe": "^17.3.0",
    "undici": "^6.21.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/node": "^22.9.0",
    "typescript": "^5.6.0"
  }
}
```

### Android `libs.versions.toml` additions

Add these to the existing file (preserving current versions for Compose BOM, Kotlin, AGP):

```toml
[versions]
# ... existing versions ...
supabaseKt = "3.0.3"
ktor = "3.0.3"
kotlinxSerialization = "1.7.3"
kotlinxCoroutines = "1.9.0"
hilt = "2.52"
hiltNavigationCompose = "1.2.0"
navigationCompose = "2.9.0"
datastore = "1.1.1"
firebaseBom = "33.7.0"
mockk = "1.13.13"
turbine = "1.2.0"
browser = "1.8.0"
paging = "3.3.4"

[libraries]
# Supabase
supabase-auth = { group = "io.github.jan-tennert.supabase", name = "auth-kt", version.ref = "supabaseKt" }
supabase-postgrest = { group = "io.github.jan-tennert.supabase", name = "postgrest-kt", version.ref = "supabaseKt" }
supabase-realtime = { group = "io.github.jan-tennert.supabase", name = "realtime-kt", version.ref = "supabaseKt" }

# Ktor
ktor-client-android = { group = "io.ktor", name = "ktor-client-android", version.ref = "ktor" }
ktor-client-core = { group = "io.ktor", name = "ktor-client-core", version.ref = "ktor" }
ktor-client-content-negotiation = { group = "io.ktor", name = "ktor-client-content-negotiation", version.ref = "ktor" }
ktor-client-logging = { group = "io.ktor", name = "ktor-client-logging", version.ref = "ktor" }
ktor-client-auth = { group = "io.ktor", name = "ktor-client-auth", version.ref = "ktor" }
ktor-serialization-kotlinx-json = { group = "io.ktor", name = "ktor-serialization-kotlinx-json", version.ref = "ktor" }

# Serialization + coroutines
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerialization" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "kotlinxCoroutines" }
kotlinx-coroutines-play-services = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-play-services", version.ref = "kotlinxCoroutines" }

# Architecture
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
androidx-paging-compose = { group = "androidx.paging", name = "paging-compose", version.ref = "paging" }
androidx-browser = { group = "androidx.browser", name = "browser", version.ref = "browser" }

# DI
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }

# Firebase
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
firebase-messaging = { group = "com.google.firebase", name = "firebase-messaging-ktx" }

# Test
mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }
turbine = { group = "app.cash.turbine", name = "turbine", version.ref = "turbine" }
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "kotlinxCoroutines" }

[plugins]
# ... existing plugins ...
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version = "2.2.10-1.0.26" }
google-services = { id = "com.google.gms.google-services", version = "4.4.2" }
```

### Supabase Custom Access Token Hook (injects tenant_id)

```sql
-- In Supabase SQL editor (enable the hook in Auth → Hooks)
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_tenant_id uuid;
  user_role text;
begin
  select tenant_id, role into user_tenant_id, user_role
  from public.user_profiles
  where user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  if user_tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
  end if;
  if user_role is not null then
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
```

### Environment variables (Node backend)

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=   # or use JWKS fetch

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_BASIC=
STRIPE_PRICE_ID_PRO=

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# DataJud (no auth required for basic queries, but reserve the env var)
DATAJUD_BASE_URL=https://api-publica.datajud.cnj.jus.br

# Redis (BullMQ)
REDIS_URL=

# App
NODE_ENV=production
LOG_LEVEL=info
SENTRY_DSN=
```

### Do NOT Use List

A quick-reference list of libraries/patterns deliberately excluded and why:

| Do Not Use | Why |
|---|---|
| Express 4 | Unmaintained; use Express 5 or Fastify. |
| `jsonwebtoken` (npm) | Maintenance mode, awkward async API. Use `jose`. |
| Gson / Moshi (Android) | Use kotlinx.serialization (integrates with Ktor + supabase-kt). |
| RxJava / LiveData (Android) | Use Kotlin Flow + StateFlow. |
| Retrofit alongside Ktor | Two HTTP stacks = APK bloat. Pick Ktor (required by supabase-kt). |
| Mockito (Kotlin projects) | Use MockK. |
| `node-cron` / `cron` for external API polling | No persistence, no retries. Use BullMQ. |
| Raw PostgreSQL driver (`pg`) for application queries | Defeats RLS unless you juggle `set local role` per-request. Use `@supabase/supabase-js`. |
| Anthropic API key in Android APK | Key extraction is trivial. Always proxy through backend. |
| Stripe SDK embedded in Android | Use Checkout + Customer Portal via Custom Tabs. |
| WebView for Stripe/Supabase Auth flows | Stripe explicitly discourages; breaks 3DS in some cases. Use Custom Tabs. |
| `application-layer-only` tenant checks | Must have RLS as defense-in-depth. |
| `schema-per-tenant` multi-tenancy | Doesn't scale; RLS is the modern answer. |
| LangChain for Claude integration (v1) | Abstraction tax not justified for 2 endpoints. |
| Supabase Edge Functions as primary backend | Deno + 150s timeout + no long-running workers. Use for auth hooks and lightweight webhooks only. |
| `SharedPreferences` directly | Use DataStore. |
| Volley / HttpURLConnection / Fuel | Legacy or niche. Use Ktor. |

---

## Confidence Levels

**Overall research confidence: MEDIUM**, with per-item breakdown below.

> **Important caveat:** WebSearch and WebFetch tools were blocked at the time of this research. Version numbers reflect Claude's training data (cutoff mid-2025) and may have advanced since. **Before Phase 0/1 execution, the first action should be to verify each pinned version against the npm registry, Maven Central, and official docs.** A single `npm outdated` / Gradle `dependencyUpdates` run at project start will reconcile everything.

| Item | Confidence | Rationale |
|---|---|---|
| **Choosing Fastify over Express/NestJS** | HIGH | Fastify v5 stability and Express-vs-Fastify tradeoffs are well-established; this is an architectural decision, not version-sensitive. |
| **Supabase JS client choice** | HIGH | `@supabase/supabase-js` is the only sane option; API surface has been stable since v2. |
| **`@supabase/supabase-js` version 2.45+** | MEDIUM | Current as of late 2025. **Verify on npm before install** — minor version may have advanced. |
| **supabase-kt as the Android choice** | HIGH | The only actively maintained Kotlin Supabase SDK. Decision is sound regardless of exact version. |
| **supabase-kt 3.0.x version pin** | MEDIUM | 3.0 was the major-version jump in 2024. Verify latest 3.x on Maven Central / GitHub releases before install. |
| **Ktor 3.0.x on Android** | MEDIUM | Ktor 3 GA'd in late 2024. The "standardize on Ktor" argument holds independent of exact minor version. |
| **Retrofit as rejected** | MEDIUM | Rejection is conditional on "if you're already using supabase-kt". Valid fallback if team preference is strong. |
| **BullMQ 5.x for job scheduling** | HIGH | BullMQ v5 is the current major line; Redis-backed pattern is battle-tested. |
| **Stripe SDK 17.x** | MEDIUM | Stripe releases frequently; version may have moved to 18.x. Pin `apiVersion` in code regardless. |
| **`@anthropic-ai/sdk` 0.30+** | MEDIUM | SDK was still in 0.x line as of mid-2025 moving toward 1.0. **Verify latest version at project start.** Version choice doesn't affect architecture — prompt caching + streaming APIs are stable. |
| **Firebase Admin 12.x** | HIGH | firebase-admin 12 has been stable for a while; should still be current or 13.x. |
| **Node.js 22 LTS** | HIGH | Node 22 entered LTS in Oct 2024 and is the active LTS through 2027. |
| **Kotlin 2.2.10 / Compose BOM 2024.09** | HIGH | These are the project's existing versions (verified in `libs.versions.toml`). Keep unless team wants to upgrade. |
| **RLS-based multi-tenancy** | HIGH | Canonical Supabase pattern; extensive documentation and community usage. |
| **JWT custom claims via Auth Hooks** | HIGH | Official Supabase mechanism since early 2024. |
| **Edge Functions for Auth Hook only, Node.js for primary backend** | HIGH | Deno runtime + 150s timeout constraint is well-known; long-running BullMQ workers don't fit Edge Functions. |
| **DataJud is free and public** | HIGH | Confirmed in PROJECT.md context; CNJ publishes it as open data. |
| **Do NOT embed Anthropic/Stripe keys in Android** | HIGH | Universal mobile security rule. |
| **Hilt vs Koin recommendation (Hilt for larger teams)** | MEDIUM | Both are viable in 2026. The "pick one and commit" part is the key advice. |
| **Inngest as BullMQ alternative** | LOW | Inngest is growing but ecosystem is younger; pricing may change. Listed as a worth-watching option, not a primary recommendation. |
| **Vercel AI SDK vs direct Anthropic SDK** | LOW | Ecosystem is in flux; may want to prototype both. |
| **Specific Gradle plugin versions (KSP, google-services)** | MEDIUM | Plugin versions must match Kotlin version. Re-check on project setup. |

### Gaps / Needs Verification Before Phase Start

1. **All npm versions** — run `npm outdated` or check registry at Phase 0 kickoff.
2. **All Maven Central versions** — Android Studio's dependency inspector or `./gradlew dependencyUpdates` (via Ben Manes plugin).
3. **DataJud API current shape** — PROJECT.md says "no API key for basic queries", but rate limits, filter syntax, and response schemas should be verified against CNJ's current OpenAPI spec before Phase 1 coding.
4. **Supabase pricing changes** — Pro tier and Edge Functions billing have shifted; confirm current pricing before locking in.
5. **Stripe API version pin** — choose the latest stable `apiVersion` at project start and pin it.
6. **LGPD compliance review** — Brazil's LGPD (Lei Geral de Proteção de Dados) applies to legal data. A pre-launch legal review of data retention, consent flows, and the DPIA is required. Not a library choice, but a research flag for the roadmap's "launch readiness" phase.
7. **Android Studio version** — verify latest stable (Ladybug or Meerkat) at project start.

---

## Sources

Because web tools were unavailable during this research session, all claims are drawn from training data (cutoff mid-2025) combined with the project's own `PROJECT.md` constraints. Recommended primary sources for verification:

- **Supabase docs:** `https://supabase.com/docs` (JavaScript and Kotlin references)
- **supabase-kt GitHub:** `https://github.com/supabase-community/supabase-kt`
- **Fastify docs:** `https://fastify.dev/docs/latest/`
- **BullMQ docs:** `https://docs.bullmq.io/`
- **Anthropic SDK:** `https://docs.anthropic.com/en/api/client-sdks`
- **Stripe Node:** `https://github.com/stripe/stripe-node`
- **Firebase Admin Node:** `https://firebase.google.com/docs/admin/setup`
- **Ktor Client:** `https://ktor.io/docs/client-create-new-application.html`
- **Android Jetpack Compose:** `https://developer.android.com/jetpack/compose`
- **DataJud CNJ:** `https://www.cnj.jus.br/sistemas/datajud/` (API Pública)
- **LGPD (Brazilian GDPR):** `https://www.gov.br/anpd/pt-br`
