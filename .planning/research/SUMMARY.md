# Research Summary — Portal Jurídico SaaS B2B

**Synthesized:** 2026-04-14
**Overall confidence:** MEDIUM

> **Critical caveat:** All four upstream research files were produced with WebSearch/WebFetch disabled. Versions, competitor specifics, DataJud rate limits, and LGPD/OAB enforcement specifics draw from training data (cutoff mid-2025). Re-verify version pins and live-volatile claims at the start of each phase.

---

## 1. Recommended Stack

### Backend (Node.js + Supabase)

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js 22 LTS + TypeScript 5.6+** | Current LTS; TS catches cross-tenant leaks at compile time |
| HTTP framework | **Fastify 5.x** | Faster than Express; hook model ideal for tenant extraction; mature plugin ecosystem |
| Auth | **Supabase Auth + `jose` for JWT** | Supabase constraint; `jose` > `jsonwebtoken` (maintenance mode) |
| Database | **Postgres via Supabase + RLS** | Constraint; canonical multi-tenant pattern |
| Job scheduler | **BullMQ 5.x + Redis (Upstash)** | Persistent, retryable, survives restart; rejects `node-cron`/`pg_cron` for HTTP callouts |
| Stripe | **`stripe` 17.x + Checkout + Customer Portal + webhooks** | Zero PCI scope; hosted Checkout/Portal |
| Claude | **`@anthropic-ai/sdk` direct, no LangChain** | Full control of prompt caching + streaming |
| Push | **`firebase-admin` 12.x (FCM)** | Backend does fan-out, not Android |
| HTTP client (outbound) | **`undici` 6.x + `p-retry` + `zod`** | Connection pooling for DataJud; runtime schema validation |
| Logging | **`pino` 9.x + `@sentry/node` 8.x** | Structured JSON logs with tenant_id |

**Critical backend rules:**
- Two Supabase clients: `supabaseAdmin` (service_role, jobs/webhooks only) vs. `supabaseAsUser(jwt)` (RLS-enforced, per-request)
- Supabase Edge Functions **only** for Custom Access Token Hook. All other logic in persistent Node.js.
- Node.js is **not a CRUD proxy** — it orchestrates DataJud polling, Claude calls, Stripe webhooks, FCM dispatch

### Android (two apps, shared core)

| Area | Choice | Rationale |
|---|---|---|
| Architecture | **Clean Architecture + MVVM + UDF + Compose** | Official Android recommendation; test-friendly |
| Module layout | **`:core-common`, `:core-network`, `:core-data`, `:core-ui`, `:app-cliente`, `:app-escritorio`** | Two APKs; no conditional-UI role switching |
| Supabase client | **`supabase-kt` 3.0.x+** | Handles token refresh, typed queries |
| HTTP client | **Ktor Client 3.0.x** | supabase-kt ships Ktor transitively; standardize to avoid APK bloat |
| Serialization | **kotlinx.serialization 1.7.x** | Compile-time; integrates with Ktor + supabase-kt |
| DI | **Hilt 2.52+** | Standard; pick and commit before Phase 0 |
| State | **StateFlow + `rememberSaveable` + `SavedStateHandle`** | Survives process death |
| Persistence | **DataStore 1.1.x** | SharedPreferences rejected |
| FCM | **Firebase BOM 33.7.x** | Pin BOM, derive versions |
| Stripe on Android | **Chrome Custom Tabs → Checkout/Portal URL** | Never embed Stripe SDK or use WebView |
| Testing | **MockK 1.13 + Turbine 1.2 + coroutines-test + Compose UI test** | MockK mandatory for Kotlin |

**Critical client-side rules:**
- **Android NEVER calls Claude, DataJud, or Stripe directly** — keys would leak
- **Android uses Supabase Auth for login only**. All application data flows through Node.js API

### Infrastructure

| Area | Choice |
|---|---|
| Hosting | Railway (primary), Fly.io for multi-region |
| Redis | Upstash (serverless, BullMQ backing) |
| Supabase tier | Pro ($25/mo) past dev |
| CI/CD | GitHub Actions |
| Pooler | Supavisor (transaction mode) |
| Migrations | Supabase CLI |

---

## 2. Table Stakes Features (v1)

### Backend
1. Supabase multi-tenant schema + RLS + `tenant_id` in JWT `app_metadata` + Custom Access Token Hook
2. Supabase Auth with roles (`admin_escritorio`, `advogado`, `cliente`) + role-aware RLS
3. Tenant context middleware on every request; rejects untenanted requests
4. DataJud adapter with CNJ check-digit validation, tiered refresh, circuit breaker, exponential backoff
5. BullMQ worker process (separate from API server) for DataJud sync jobs with idempotent diffing
6. Movement translation cache keyed on text hash
7. Claude translation endpoint with prompt caching + XML-tag-delimited input
8. FCM dispatch service with invalid-token cleanup
9. Stripe webhook handler with signature verification + `stripe_events` idempotency + grace period state machine
10. LGPD consent records table with timestamped opt-in/withdrawal
11. Observability: pino logs with `tenant_id`/`request_id`, Sentry, per-tenant Claude token telemetry
12. Cross-tenant leak integration test as CI gate

### app_cliente
1. Login (Supabase Auth, email/senha)
2. Lista de processos vinculados ao CPF
3. Tela do processo com status atual em linguagem simples (IA)
4. Timeline das movimentações traduzidas
5. Próxima data importante (audiência, prazo, perícia)
6. Dados cadastrais do processo (número CNJ, vara, comarca, partes)
7. Indicador "última atualização" (freshness trust signal)
8. Estado "sem movimentação recente" com explicação
9. Push notifications + in-app notification center (safety net)
10. Botão "falar com meu advogado" (WhatsApp deep-link)
11. Onboarding de 3-4 slides para leigos
12. Política de privacidade + LGPD consent screen

### app_escritorio
1. Login com role-aware UX
2. Cadastro de cliente (nome, CPF, email, número CNJ) com validação
3. Lista de clientes com status dos processos
4. "Ver como o cliente vê" (read-only preview)
5. Envio de mensagem/aviso manual
6. Busca por cliente (nome, CPF, nº processo)
7. Status da última sincronização DataJud por processo
8. Log de acesso/notificações enviadas
9. "Gerenciar assinatura" → Stripe Customer Portal via Custom Tabs

---

## 3. Differentiating Features

1. **AI que traduz jargão jurídico → linguagem do leigo** — core value. "Despacho saneador" → "o juiz organizou o processo"
2. **Resumo do processo em 1 parágrafo** — at-a-glance comprehension
3. **Chat IA contextualizado por processo** (v1.1) — "isso é ruim pra mim?"
4. **Notificação inteligente com triagem de impacto** (crítico / importante / rotineiro)
5. **Indicador visual de fase do processo** (v1.1)
6. **Glossário contextual** — tap técnico → explicação inline (v1.1)
7. **Métricas de "ligações evitadas"** — ROI justification for B2B sale
8. **Convite do cliente via magic link** (WhatsApp/email — leigos live on WhatsApp)

---

## 4. Anti-features (explicit NOT in v1)

**Regulatory / liability no-gos:**
- AI que dá conselho jurídico ("você deve recorrer") — OAB unauthorized practice
- AI que estima prazo final do processo — falso positivo destrói confiança
- AI que calcula valor esperado da causa
- Chat IA sem disclaimers ou fora do contexto do processo
- Upload de documentos pelo cliente
- Cadastro self-service do cliente final (breaks B2B2C)
- Alertas proativos de prazo (liability review needed — flag for v2)

**Scope creep:**
- Integração com SAJ/Themis/Projuris
- Portal web para cliente (v1)
- iOS (v1)
- Videoconferência integrada
- Assinatura digital ICP-Brasil
- Cálculos trabalhistas automáticos
- Avaliação pública do escritório

**Tone/UX:**
- Gamificação
- Notificação sem triagem (fadiga → desinstalação)
- Histórico/busca pública de processos de terceiros
- Schema-per-tenant multi-tenancy

---

## 5. Architecture in a Nutshell

1. **Three-tier:** Android (Clean Arch + MVVM + Compose) → Node.js API (Fastify) → Supabase (Postgres + RLS + Auth)
2. **Two Android APKs, one shared core** — two Play listings, shared `:core-*` modules
3. **API-mediated Supabase access** — Android never touches Supabase Postgres directly; uses Supabase Auth for login only
4. **Multi-tenancy = shared schema + `tenant_id` + RLS + JWT `app_metadata` claim**
5. **Separate worker process** for DataJud sync, FCM fan-out, Stripe reconciliation (BullMQ + Redis)
6. **DataJud = scheduled pull** — tiered refresh (6h/24h/7d), circuit breaker, idempotent diffing
7. **Claude = direct SDK + prompt caching + streaming** — Haiku for bulk translation, Sonnet for chat
8. **Claude prompt injection defense is non-negotiable** — XML-delimited input, schema-validated output, "AI disclaimer" on every response
9. **Stripe = Checkout + Customer Portal + webhooks + grace period state machine**
10. **FCM + in-app notification center safety net** — push reliability on Brazilian Android fleet is unreliable

---

## 6. Critical Pitfalls (top 7)

### P1. RLS Bypass via Service Role Key (CRITICAL)
Service role key must ONLY be used in worker + webhook contexts. Tenant A reading Tenant B's data = LGPD + OAB sigilo catastrophe.
**Prevention:** Split secrets (service key only in worker env), tenant middleware on every request, cross-tenant CI gate from Phase 1.

### P2. LGPD Violations in Legal Data (CRITICAL)
ANPD fines up to R$ 50M; data minimization for Claude calls (strip CPF); Art. 33 disclosure for Anthropic as US sub-processor.
**Prevention:** DPO designation, privacy policy, LGPD consent screen, Claude Zero Data Retention option exploration, Art. 18 deletion workflow. Blocks launch.

### P3. Claude Prompt Injection via Movimentação Text (HIGH)
Malicious text in DataJud output → client sees false legal information → malpractice exposure.
**Prevention:** XML-tag-delimited untrusted input, schema-validated output, guardrail second-pass classifier, "AI disclaimer" on every output. Non-negotiable.

### P4. Claude API Cost Runaway (HIGH)
One heavy chat user = $0.15/message; 100 daily users = $450/day vs. ~R$500/month subscription.
**Prevention:** Prompt caching mandatory, Haiku for translation/Sonnet for chat, per-turn context budget ≤20k tokens, per-tenant rate limits (100 chat messages/day), billing alerts at 50/80/100%.

### P5. DataJud Rate Limits + Downtime (HIGH)
Silent data staleness; quota exhausted on invalid CNJ numbers; product appears broken.
**Prevention:** CNJ check-digit validation at input (mod-97), circuit breaker, tiered refresh, graceful degradation with "última atualização" timestamp, health-status UI banner.

### P6. Stripe Payment Race Conditions (HIGH)
Tenant deactivated while paying; or active while 3 months behind; clientes locked mid-audiência.
**Prevention:** Stripe as source of truth, idempotency table, grace-period ladder (0→3→7→14 days), soft-disable never delete, webhook replay drill.

### P7. FCM Unreliability on Brazilian Android Fleet (HIGH)
Xiaomi/Samsung/Motorola battery optimizers kill FCM → client misses prazo notification.
**Prevention:** High-priority FCM, in-app notification center safety net, OEM battery-optimization onboarding, WorkManager backup poll, real-device QA on Moto G/Samsung A/Xiaomi Redmi.

---

## 7. Phase Order Recommendation

| # | Phase | Rationale | Research Flag |
|---|-------|-----------|---------------|
| 0 | **Cleanup & Baseline Upgrade** | Package rename, Compose BOM upgrade, minification, DI shell, CI | STANDARD |
| 1 | **Backend Foundation** (Supabase + Node.js + Auth + RLS) | Nothing works until tenant isolation is bulletproof | NEEDS RESEARCH (Supabase RLS, Supavisor, Auth Hook) |
| 2 | **Core CRUD API** (API-only, no mobile) | Validate API contract before building any Android client | STANDARD |
| 3 | **app_escritorio** (first mobile client) | Simpler admin-side first; establishes Android patterns | NEEDS RESEARCH (supabase-kt 3.x, Ktor 3) |
| 4 | **DataJud Integration** | Must be proven before Claude translates anything | **NEEDS RESEARCH — CRITICAL** (rate limits, schema, coverage) |
| 5 | **Claude Translation** | Core value prop; human-review quality gate on 50-100 real samples | NEEDS RESEARCH (API current state, ZDR for LGPD) |
| 6 | **app_cliente** (end-user MVP) | Visible MVP; backend + translation are real | STANDARD |
| 7 | **Push Notifications** (FCM + in-app center) | Without push, app becomes unopened | NEEDS RESEARCH (FCM HTTP v1, POST_NOTIFICATIONS) |
| 8 | **Stripe Billing** | After MVP loop proven; don't gate features on billing | NEEDS RESEARCH (API version) |
| 9 | **Chat IA** | High-risk differentiator; ship after translation is stable | NEEDS RESEARCH (streaming API, Ktor SSE) |
| 10 | **LGPD + Hardening + Launch Readiness** | Non-optional compliance + production drills | NEEDS RESEARCH (ANPD 2025, OAB AI opinions) |

**Critical ordering constraints:**
- Backend before any mobile
- app_escritorio before app_cliente (validates API contract)
- DataJud before Claude (Claude translates DataJud output)
- Translation before app_cliente (the whole value prop)
- Stripe after MVP proven
- LGPD spans all phases but **blocks launch**

---

## 8. Open Questions

| # | Question | Blocks Phase |
|---|----------|--------------|
| Q1 | DataJud 2026 rate limits, auth, response schema, tribunal coverage | Phase 4 — **CRITICAL** |
| Q2 | Claude translation quality on PT-BR legal jargon (50-100 real samples) | Phase 5 — **value prop gate** |
| Q3 | Anthropic Zero Data Retention option (availability + cost for LGPD Art. 33) | Phase 5 + Phase 10 |
| Q4 | LGPD enforcement precedents post-May 2025 (ANPD sanctions, legal-tech guidance) | Phase 10 — **launch blocker** |
| Q5 | OAB ethics on client-facing legal AI (AI opinion on "explicação" vs "aconselhamento") | Phase 5 + Phase 9 |
| Q6 | Supabase RLS syntax, Supavisor config, Auth Hook docs (2026 state) | Phase 1 |
| Q7 | Competitive feature set (Projuris, Advbox, ADVWin client portals in 2026) | Phase 0 (strategy) |
| Q8 | FCM HTTP v1 API state + Android 13+ POST_NOTIFICATIONS flow | Phase 7 |
| Q9 | Stripe API version pin + Customer Portal options | Phase 8 |
| Q10 | Segredo de justiça visibility rules (Brazilian privacy lawyer review) | Phase 4 |
| Q11 | Notification triage: how to classify movimentação impact reliably | Phase 7 |
| Q12 | Hilt vs. Koin final choice | Phase 0 |
| Q13 | Willingness-to-pay per escritório (customer discovery) | Phase 8 |

---

## 9. Confidence Summary

| Area | Confidence | Caveat |
|---|---|---|
| Stack (architectural choices) | **HIGH** | Well-established patterns |
| Stack (version pins) | **MEDIUM** | Training data mid-2025; reconcile at Phase 0 |
| Table stakes features | **HIGH** | Domain reasoning + Brazilian legal market |
| Anti-features | **HIGH** | OAB boundaries stable and well-understood |
| Architecture | **MEDIUM-HIGH** | Core patterns standard; Supabase specifics may have minor changes |
| Critical pitfalls | **HIGH** (C1, C4, C5, H1, H3-H7) | Version details re-verify per phase |
| Competitive positioning | **LOW** | Training data only; not verified 2026 |
| DataJud specifics | **LOW-MEDIUM** | Rate limits volatile — biggest single unknown |
| LGPD / OAB enforcement | **MEDIUM** | Statutes stable; AI guidance evolving |

**Three things that can sink this project:**
1. DataJud API 2026 shape doesn't meet tiered-refresh assumptions
2. Claude translates PT-BR legalese poorly (hallucinations / wrong direction)
3. LGPD/OAB compliance gap (Brazilian privacy lawyer required before launch)

---

*Source files: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, PROJECT.md*
*Synthesized: 2026-04-14*
