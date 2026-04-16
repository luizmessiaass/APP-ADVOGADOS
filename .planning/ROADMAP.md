# Roadmap: Portal Jurídico — SaaS B2B para Escritórios de Advocacia

## Overview

Portal Jurídico is a multi-tenant SaaS platform where Brazilian law offices subscribe to a service so their end clients can understand their legal cases in plain Portuguese via Android apps. The journey goes bottom-up: first clean up the Android scaffold and establish a bulletproof multi-tenant backend foundation (Supabase + Fastify + RLS + LGPD basics). Then prove the two highest-risk integrations — DataJud (the free, SLA-less CNJ legal API) and Claude AI translation — before building any client-facing UI. The simpler admin app (app_escritorio) ships first to validate the API contract; then the consumer-facing app_cliente delivers the end-user MVP. Push notifications turn the app from "unopened" to "actively useful." Stripe billing gates commercial launch. Finally, LGPD hardening and production readiness close out v1 for safe release to Brazilian law offices.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, ...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 0: Android Bootstrap & Cleanup** - Rename package, upgrade deps, modularize, configure Hilt & CI baseline
- [ ] **Phase 1: Backend Foundation** - Supabase + Fastify + Auth + RLS + LGPD basics & observability
- [ ] **Phase 2: DataJud Integration & Sync Worker** - CNJ validation, BullMQ worker, tiered refresh, circuit breaker, diffing
- [ ] **Phase 3: Claude AI Translation** - Jargon-to-plain-PT translation with prompt caching, injection defense, token telemetry
- [ ] **Phase 4: app_escritorio (Admin Android Client)** - Advogado/admin flow: client CRUD, preview "as client sees", manual messages
- [ ] **Phase 5: app_cliente (End-user MVP)** - Process list, plain-language status, timeline, onboarding, LGPD consent gate
- [ ] **Phase 6: Push Notifications & In-app Center** - FCM high-priority dispatch + WorkManager fallback + notification center
- [ ] **Phase 7: Stripe Billing & Grace Period** - Checkout, Customer Portal, webhook idempotency, entitlement ladder
- [ ] **Phase 8: LGPD Hardening & Production Readiness** - Art. 18 deletion, Art. 33 disclosures, production drills, launch gates

## Phase Details

### Phase 0: Android Bootstrap & Cleanup
**Goal**: The existing Android scaffold is production-ready — renamed, modularized, with modern dependencies, Hilt DI, release minification, and baseline CI, so all subsequent Android work builds on a clean foundation instead of fighting legacy debt.
**Depends on**: Nothing (first phase)
**Requirements**: BOOT-01, BOOT-02, BOOT-03, BOOT-04, BOOT-05, BOOT-06
**Success Criteria** (what must be TRUE):
  1. Android project builds under a production package name (no `com.example.appteste`) and installs on an API 27+ device
  2. Release builds ship with R8/minification enabled and verified in build logs
  3. Multi-module layout exists with `:core-common`, `:core-network`, `:core-data`, `:core-ui`, `:app-cliente`, `:app-escritorio` and each module compiles independently
  4. Hilt is wired and a trivial `@Inject` sample resolves at runtime in at least one module
  5. Gradle dependency catalog is upgraded (Compose BOM current, Kotlin/AGP current) and `./gradlew build` passes locally
**Plans**: 5 plans
Plans:
- [ ] 00-01-PLAN.md — Multi-module scaffold: 6 module build.gradle.kts files + settings.gradle.kts + root build.gradle.kts
- [ ] 00-02-PLAN.md — Package rename + code migration: theme to :core-ui, MainActivity stubs, delete old :app
- [ ] 00-03-PLAN.md — Dependency catalog upgrade: Compose BOM 2026.03.00, Hilt 2.57.1, KSP 2.2.10-1.0.31
- [ ] 00-04-PLAN.md — Hilt DI wiring: @HiltAndroidApp Application classes + AppConfig @Inject sample + unit test
- [ ] 00-05-PLAN.md — R8 ProGuard rules + GitHub Actions CI workflow + final package name verification
**UI hint**: yes

### Phase 1: Backend Foundation (Supabase + Fastify + Auth + RLS + LGPD basics)
**Goal**: A Fastify + TypeScript API running against Supabase provides multi-tenant authentication, bulletproof Row Level Security, and baseline LGPD/observability hooks — enough infrastructure that no downstream feature work can accidentally leak data across tenants or leak PII to logs.
**Depends on**: Phase 0
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, LGPD-01, LGPD-03, LGPD-04, LGPD-06
**Success Criteria** (what must be TRUE):
  1. A Fastify server starts with validated env vars, structured `pino` logs including `tenant_id`/`user_id`/`request_id`, and Sentry attached
  2. An escritório admin and end client can both sign up/sign in via Supabase Auth and receive a JWT carrying `tenant_id` and `role` in `app_metadata`
  3. A CI integration test proves tenant A cannot read tenant B's data through any endpoint or Supabase query (cross-tenant leak gate passes)
  4. `/health` endpoint reports status of Supabase, Redis, and DataJud dependencies; BullMQ worker starts as a separate process
  5. LGPD consent records table persists opt-in with timestamp and terms version; logs and outbound Claude payloads strip CPF/PII by construction
**Plans**: 8 plans
Plans:
- [x] 01-01-PLAN.md — Monorepo scaffold + Fastify project init + dev tooling
- [x] 01-02-PLAN.md — Supabase CLI setup + SQL migrations + RLS policies
- [x] 01-03-PLAN.md — Custom Access Token Hook (Edge Function)
- [x] 01-04-PLAN.md — Fastify server core — logger, Sentry, tenant middleware
- [x] 01-05-PLAN.md — Auth routes + LGPD consent endpoint
- [x] 01-06-PLAN.md — Health endpoint + BullMQ worker process
- [x] 01-07-PLAN.md — [BLOCKING] Schema push + CI/CD GitHub Actions
- [x] 01-08-PLAN.md — Cross-tenant integration gate + LGPD PII redaction test
**UI hint**: no

### Phase 2: DataJud Integration & Sync Worker
**Goal**: The backend can reliably pull process data from the Brazilian CNJ DataJud API, validate CNJ numbers, schedule tiered refresh, detect new movimentações idempotently, and degrade gracefully when DataJud is down or rate-limited — without ever blocking UI or reprocessing from scratch.
**Depends on**: Phase 1
**Requirements**: DATAJUD-01, DATAJUD-02, DATAJUD-03, DATAJUD-04, DATAJUD-05, DATAJUD-06, DATAJUD-07, DATAJUD-08, DATAJUD-09
**Success Criteria** (what must be TRUE):
  1. Invalid CNJ numbers are rejected at the API boundary with a check-digit (mod-97) error before any DataJud call is issued
  2. Given a valid CNJ, the worker fetches process data, persists it under the correct tenant, and records the `ultima_sincronizacao` timestamp
  3. New movimentações are detected by diffing on stable IDs — rerunning the sync produces zero duplicates
  4. Repeated DataJud failures trip a circuit breaker that suspends calls; `sync_errors` rows capture the context; subsequent job runs resume from the checkpoint after restart without reprocessing from zero
  5. When DataJud is unavailable, API responses still return cached data with a "última atualização" freshness stamp — UI is never blocked by a failed sync
**Plans**: 6 plans
Plans:
- [ ] 02-01-PLAN.md — CNJ validator (mod-97) + tribunal map + DataJud adapter (HTTP + Zod)
- [x] 02-02-PLAN.md — Supabase migration 002: processos, movimentacoes, sync_errors + RLS
- [ ] 02-03-PLAN.md — [BLOCKING] supabase db push + verificação do schema no painel
- [ ] 02-04-PLAN.md — BullMQ worker: circuit breaker Redis + step-job checkpoint + tier scheduler + diff idempotente
- [x] 02-05-PLAN.md — Fastify routes: GET /processos/:id (staleness 72h) + POST /processos + Bull Board /admin/queues
- [x] 02-06-PLAN.md — Testes completos: checkpoint, idempotência, circuit breaker Redis, staleness limites
**UI hint**: no

### Phase 3: Claude AI Translation (Core Value Prop)
**Goal**: The backend can translate opaque legal movimentações into plain Portuguese via the Claude API with prompt caching, XML-tag-delimited input, schema-validated output, per-tenant token telemetry, and deduplication by text hash — turning the core value proposition into an observable, measurable service.
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):
  1. Posting a raw movimentação to the translation endpoint returns a schema-valid `{status, proxima_data, explicacao, impacto}` object in plain Portuguese
  2. Repeating the exact same movimentação text returns a cached translation without a fresh Claude API call (hash-keyed cache hit)
  3. Per-tenant Claude token consumption is tracked and alerts fire at 50/80/100% of the configured budget
  4. Untrusted DataJud text is delimited by XML tags inside the prompt, output is schema-validated before persistence, and every translation carries the "Explicação gerada por IA — confirme com seu advogado" disclaimer field
  5. Haiku is used for bulk translation per the model routing config, with the routing visible in logs/telemetry
**Plans**: 1 plan
Plans:
- [ ] 03-01-PLAN.md — Servico completo: glossario juridico, translation-service (Claude Haiku 4.5), worker BullMQ dedup por hash, budget por tenant com alertas, endpoint assincrono 202, migration token_usage
**UI hint**: no

### Phase 4: app_escritorio (Admin Android Client)
**Goal**: The admin Android app gives advogados/admins a working end-to-end flow — login, client CRUD with CPF+CNJ validation, searchable client list, read-only "as client sees" preview of translated movimentações, manual message send, and Stripe Customer Portal access — validating the backend API contract before the end-user app is built.
**Depends on**: Phase 3
**Requirements**: ESCR-01, ESCR-02, ESCR-03, ESCR-04, ESCR-05, ESCR-06, ESCR-07, ESCR-08, ESCR-09, ESCR-10, ESCR-11
**Success Criteria** (what must be TRUE):
  1. An advogado/admin can log in, register a new client with validated CPF and CNJ, and see the client appear in the list with DataJud sync status
  2. The advogado can search the client list by name, CPF, or CNJ number and results return correctly
  3. Tapping a client opens the read-only "as client sees" preview showing AI-translated movimentações exactly as app_cliente will render them
  4. The advogado can send a manual message/aviso to a specific client, and the message is persisted for eventual delivery
  5. The "gerenciar assinatura" button opens the Stripe Customer Portal via Chrome Custom Tabs (portal session acquired from backend), and CI runs lint + unit + UI tests on every commit to the app_escritorio module
**Plans**: 7 plans
Plans:
- [x] 04-01-PLAN.md — Version catalog + core-network Kotlin plugin fix + AuthInterceptor + ClienteApi + NetworkModule + TokenDataStore + JwtDecoder
- [x] 04-02-PLAN.md — CPF/CNJ validators com testes unitários (:core-common) + MovimentacaoCard + ProcessoStatusCard (:core-ui)
- [x] 04-03-PLAN.md — Auth flow: LoginScreen + LoginViewModel + EscritorioNavGraph (5 rotas @Serializable) + ClienteListScreen com search
- [x] 04-04-PLAN.md — CadastroClienteScreen + CadastroClienteViewModel com validação CPF/CNJ inline
- [x] 04-05-PLAN.md — ClienteDetalheScreen (sync status) + PreviewScreen (MovimentacaoCard + disclaimer)
- [x] 04-06-PLAN.md — MensagemBottomSheet (fire-and-forget) + Stripe Customer Portal via Chrome Custom Tabs
- [ ] 04-07-PLAN.md — HiltTestRunner + 5 UI tests instrumentados + CI workflow app-escritorio lint+test+assemble
**UI hint**: yes

### Phase 5: app_cliente (End-user MVP)
**Goal**: The end-user Android app delivers the MVP experience — login, a list of their own processes, plain-language status, translated timeline, next important date, process cadastral data, "last update" freshness indicator, onboarding, LGPD consent gate, and WhatsApp fallback to their advogado — so a leigo can understand their case without calling their lawyer.
**Depends on**: Phase 4
**Requirements**: APP-01, APP-02, APP-03, APP-04, APP-05, APP-06, APP-07, APP-08, APP-11, APP-12, APP-13, APP-15, APP-16, LGPD-02
**Success Criteria** (what must be TRUE):
  1. A cliente logs in and immediately sees a list of their own processes, bound to their CPF, with nothing from other tenants leaking through
  2. Opening a process shows: plain-language current status, translated movimentação timeline, next important date in a prominent card, and cadastral data (CNJ, vara, comarca, partes) with plain-language labels
  3. "Última sincronização há X horas" is visible on the process screen, and the "sem movimentação recente" state renders a reassuring message instead of a blank screen
  4. The 4-screen onboarding appears on first open (no skip) and the LGPD consent screen must be accepted before any process data is shown (consent gate; D-06: no AI disclaimers)
  5. A "Falar com meu advogado" button opens WhatsApp via deep-link with tel: fallback, and CI runs lint + unit tests on every commit to the app_cliente module
**Plans**: 5 plans
Plans:
- [ ] 05-01-PLAN.md — Backend gaps: migration cliente_usuario_id + RLS update + GET /processos list + GET /processos/:id/movimentacoes + telefone_whatsapp
- [ ] 05-02-PLAN.md — Foundation: libs.versions.toml deps + app-cliente build config + PortalJuridicoTheme + 8 core-ui components + nav graph + SplashViewModel + LoginScreen
- [ ] 05-03-PLAN.md — Process screens: ProcessoListScreen + ProcessoDetailScreen (single LazyColumn, D-01 to D-07) + repository + unit tests
- [ ] 05-04-PLAN.md — Onboarding (4 pages, no skip, D-09) + LGPD consent gate (scroll-detect, D-11 to D-13) + Compose UI tests
- [ ] 05-05-PLAN.md — HiltTestRunner + empty timeline test + CI workflow app-cliente lint+test+assembleDemoDebug
**UI hint**: yes

### Phase 6: Push Notifications & In-app Center
**Goal**: New movimentações reach the cliente reliably via FCM high-priority push, with an in-app notification center and WorkManager polling as safety nets against Brazilian OEM battery-optimizer drops — turning the app from "download and forget" into an actively useful channel.
**Depends on**: Phase 5
**Requirements**: NOTIFY-01, NOTIFY-02, NOTIFY-03, NOTIFY-04, NOTIFY-05, NOTIFY-06, NOTIFY-07, APP-09, APP-10
**Success Criteria** (what must be TRUE):
  1. After login, the app registers its FCM device token via `POST /api/devices/register` and the backend persists it tied to the user
  2. When a new movimentação is detected and translated, the backend sends a high-priority FCM push; the app opens the correct process via deep-link on tap, from both foreground and background
  3. The in-app notification center loads unread notifications from the backend and surfaces anything the FCM push may have missed
  4. WorkManager runs a periodic fallback poll for unread notifications, and the onboarding screen guides the user through disabling battery optimization on Xiaomi/Samsung/Motorola
  5. FCM 404 responses for invalid device tokens cause the backend to clean up the token so it is never retried
**Plans**: 6 plans
Plans:
- [ ] 06-01-PLAN.md — Migration SQL (device_tokens + notifications + RLS) + version catalog (Firebase BOM 34.12.0, WorkManager 2.11.2, hilt-work 1.2.0)
- [ ] 06-02-PLAN.md — Backend FCM: firebase.ts + FcmDispatchService (data-only, high-priority, token cleanup) + rotas /api/devices e /api/notifications
- [ ] 06-03-PLAN.md — [BLOCKING] supabase db push migration 007 + setup Firebase Console (google-services.json + service account)
- [ ] 06-04-PLAN.md — Android FCM: PortalMessagingService + ClienteApplication (HiltWorkerFactory + NotificationChannel) + NotificationPollWorker (@HiltWorker, 15min)
- [ ] 06-05-PLAN.md — Central de notificações: NotificationsViewModel + NotificationCenterScreen (BadgedBox, seções Não lidas/Lidas) + NavGraph integration
- [ ] 06-06-PLAN.md — Onboarding 4→5 telas: tela 3 POST_NOTIFICATIONS + tela 5 BatteryOptimizationScreen (OEM Xiaomi/Samsung/Motorola + botão Pular)
**UI hint**: yes

### Phase 7: Stripe Billing & Grace Period
**Goal**: Escritórios can subscribe, manage, and be gracefully suspended via Stripe with idempotent webhook handling, an entitlement middleware that gates protected endpoints, and a well-behaved grace-period state machine that never deletes tenant data — turning the platform from MVP to commercial-ready without putting clients at risk during payment hiccups.
**Depends on**: Phase 6
**Requirements**: BILLING-01, BILLING-02, BILLING-03, BILLING-04, BILLING-05, BILLING-06, BILLING-07
**Success Criteria** (what must be TRUE):
  1. An escritório can complete a Stripe Checkout flow (hosted), and the backend reflects the resulting `subscription_status` on the tenant record
  2. Stripe webhook events are signature-verified and recorded in `stripe_events` before being processed, making the handler safely idempotent on replay
  3. Entitlement middleware blocks protected endpoints for tenants whose subscription is not active, returning a clear "subscription required" error
  4. The grace-period state machine progresses through Day 0 email → Day 3 in-app banner → Day 7 escritório read-only → Day 14 suspension, and tenant data is never deleted — only `status` is flipped
  5. From app_escritorio, "Gerenciar assinatura" opens the Stripe Customer Portal via Custom Tabs and plan changes round-trip back to the tenant record
**Plans**: TBD
**UI hint**: no

### Phase 8: LGPD Hardening & Production Readiness
**Goal**: The platform closes the LGPD compliance loop — Art. 18 data deletion, Art. 33 sub-processor disclosure, consent lifecycle, and production launch gates — so Portal Jurídico can be safely offered to Brazilian law offices without exposing the company to ANPD sanctions or OAB ethics violations.
**Depends on**: Phase 7
**Requirements**: LGPD-05
**Success Criteria** (what must be TRUE):
  1. An escritório admin can invoke an Art. 18 "delete client" endpoint that cascades deletion across processos, movimentações, chat, consent records, and notifications, leaving no orphaned PII
  2. The privacy policy served in-app explicitly names Anthropic as an international sub-processor (Art. 33) and the LGPD consent screen versioning matches the stored `lgpd_consent` row
  3. Cross-tenant leak test, PII-redaction log test, and webhook idempotency replay drill all pass in CI before any production deploy is accepted
  4. Production monitoring dashboards (error rates, Claude spend, DataJud circuit state, FCM delivery rate) are live with on-call-safe alert thresholds
  5. A launch readiness checklist is signed off: backup/restore rehearsed, Supabase Pro tier active, secrets split between API and worker environments, and the "launch blockers" list (DataJud quota verified, Claude ZDR verified, Brazilian privacy lawyer review) is either green or explicitly accepted with mitigation
**Plans**: TBD
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Android Bootstrap & Cleanup | 0/5 | Not started | - |
| 1. Backend Foundation | 3/8 | In Progress|  |
| 2. DataJud Integration & Sync Worker | 0/6 | Not started | - |
| 3. Claude AI Translation | 0/1 | Not started | - |
| 4. app_escritorio | 6/7 | In Progress|  |
| 5. app_cliente | 0/5 | Not started | - |
| 6. Push Notifications & In-app Center | 0/6 | Not started | - |
| 7. Stripe Billing & Grace Period | 0/TBD | Not started | - |
| 8. LGPD Hardening & Production Readiness | 0/TBD | Not started | - |

## Research Flags

Phases flagged as needing extra research at the planning boundary (per research/SUMMARY.md):

| Phase | Research Flag | Open Questions |
|-------|---------------|----------------|
| 0 | standard | Q7 competitive positioning (strategy), Q12 Hilt vs. Koin final call |
| 1 | needs-research | Q6 Supabase RLS syntax, Supavisor config, Auth Hook docs (2026 state) |
| 2 | needs-research (CRITICAL) | Q1 DataJud 2026 rate limits, auth, response schema, tribunal coverage; Q10 segredo de justiça visibility |
| 3 | needs-research | Q2 Claude PT-BR legal jargon quality (50-100 real samples); Q3 Anthropic Zero Data Retention; Q5 OAB ethics on AI explicação vs aconselhamento |
| 4 | planned | stack verified: Retrofit 3.0.0, Navigation Compose 2.9.7, DataStore 1.2.1, jwtdecode 2.0.2, browser 1.10.0 |
| 5 | standard | — |
| 6 | planned | stack verified: Firebase BOM 34.12.0, firebase-admin 13.8.0, WorkManager 2.11.2, hilt-work 1.2.0 |
| 7 | needs-research | Q9 Stripe API version pin + Customer Portal options; Q13 willingness-to-pay por escritório |
| 8 | needs-research (LAUNCH BLOCKER) | Q4 LGPD enforcement precedents post-May 2025; Brazilian privacy lawyer review |

## Coverage Summary

**v1 requirements:** 88 total (BOOT: 6 + INFRA: 9 + AUTH: 9 + DATAJUD: 9 + AI: 8 + NOTIFY: 7 + BILLING: 7 + LGPD: 6 + ESCR: 11 + APP: 16)
**Mapped to phases:** 88
**Unmapped:** 0 ✓

**Coverage by category:**
- BOOT-01..06 → Phase 0 (all 6)
- INFRA-01..09 → Phase 1 (all 9)
- AUTH-01..09 → Phase 1 (all 9)
- LGPD-01, LGPD-03, LGPD-04, LGPD-06 → Phase 1 (4)
- LGPD-02 → Phase 5 (1)
- LGPD-05 → Phase 8 (1)
- DATAJUD-01..09 → Phase 2 (all 9)
- AI-01..08 → Phase 3 (all 8)
- ESCR-01..11 → Phase 4 (all 11)
- APP-01..08, APP-11..16 → Phase 5 (14, note: APP-14 removed by user D-06)
- APP-09, APP-10 → Phase 6 (2)
- NOTIFY-01..07 → Phase 6 (all 7)
- BILLING-01..07 → Phase 7 (all 7)

**Note:** LGPD is split across Phase 1 (basics baked into infra), Phase 5 (consent gate in app_cliente), and Phase 8 (hardening + Art. 18 deletion + launch gates) — spanning but never duplicating.
