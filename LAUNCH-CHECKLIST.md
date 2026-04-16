# Portal Jurídico — Launch Readiness Checklist

**Status:** Work in progress
**Last updated:** 2026-04-16
**Version:** v1.0

> This checklist must be fully signed off before accepting production traffic from real law offices.
> Items marked [HARD BLOCKER] cannot be bypassed. Items marked [ACCEPTED RISK] have documented mitigations.

---

## Hard Blockers (must be green before launch)

- [ ] **[HARD BLOCKER] Backup/restore rehearsed**
  - Trigger a manual Supabase backup in the `portaljuridico-prod` project dashboard
  - Restore to a temporary project following the Supabase PITR restore procedure
  - Verify all tables are intact with correct row counts
  - Document the recovery time observed
  - Sign off: _____ / Date: _____

- [ ] **[HARD BLOCKER] Supabase Pro tier active**
  - Upgrade `portaljuridico-prod` project to Supabase Pro plan
  - Verify: Project settings → Billing shows "Pro" tier
  - Confirms: SLA, point-in-time recovery, no auto-pause on inactivity
  - Sign off: _____ / Date: _____

- [ ] **[HARD BLOCKER] Secrets split: API service vs Worker service (Railway)**
  - API service (`portal-api`) secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SENTRY_DSN, BETTERSTACK_SOURCE_TOKEN, WEBHOOK_SECRET, TERMS_VERSION, PRIVACY_POLICY_URL
  - Worker service (`portal-worker`) secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL, SENTRY_DSN, DATAJUD_API_KEY (if applicable)
  - Worker does NOT have BETTERSTACK_SOURCE_TOKEN or WEBHOOK_SECRET
  - API does NOT have DATAJUD_API_KEY if not needed by API process
  - Verify in Railway dashboard each service has only its required secrets
  - Sign off: _____ / Date: _____

- [ ] **[HARD BLOCKER] DataJud quota verified**
  - Confirm rate limits: requests/minute and requests/day for DataJud CNJ API
  - Verify circuit breaker thresholds (current: opens after 5 consecutive failures) are calibrated to real limits
  - Confirm authentication requirements for CNJ API in 2026 (Q1 from STATE.md)
  - Document verified limits in `.planning/STATE.md` (resolves Q1 blocker)
  - Sign off: _____ / Date: _____

---

## Accepted Risk Items (launch with documented mitigation)

- [ ] **[ACCEPTED RISK] Brazilian LGPD privacy lawyer review**
  - Status: Deferred — accepted risk per D-16
  - Commitment: Contract a Brazilian privacy lawyer specializing in LGPD within **60 days of first paying customer**
  - Scope of review: Art. 33 sub-processor disclosure (Anthropic), ANPD Standard Contractual Clauses (CPCs) incorporation, consent flow adequacy, DPO appointment requirement assessment
  - Responsible: [Business owner name]
  - Target date: Within 60 days of first paying customer
  - Reminder set: _____ / Date: _____

---

## Betterstack Alert Configuration

Configure these 4 alerts in Betterstack Telemetry (Logtail) dashboard before launch.
Betterstack account: Log in at betterstack.com with Portal Jurídico credentials.

### Alert 1: API Error Rate > 1%

1. Open Betterstack → Telemetry → Dashboards → Create Chart
2. SQL query:
   ```sql
   SELECT count(*) as error_count
   FROM logs
   WHERE level = 'error'
     AND dt >= now() - interval '5 minutes'
     AND (body->>'statusCode')::int >= 500
   ```
3. Add threshold alert: value > 1% of total requests in 5-minute window
4. Notification: on-call channel or email to [ops email]
5. Confirmation period: 5 minutes (avoid false positives on transient spikes)

### Alert 2: Claude Spend per Tenant (via Sentry custom metric)

- Phase 3 AI-07 already sets up spend tracking and alerts at 50/80/100% of budget per tenant
- Verify in Sentry dashboard: Alerts → [project] → check for "claude_spend_budget_*" alert rules
- If not present: create Sentry metric alerts on `claude.tokens.used` custom metric
- Threshold levels: 50% (warning), 80% (high), 100% (critical — block further calls)

### Alert 3: DataJud Circuit Breaker Open > 30 minutes

1. Open Betterstack → Telemetry → Dashboards → Create Chart
2. SQL query:
   ```sql
   SELECT count(*) as circuit_open_events
   FROM logs
   WHERE body LIKE '%circuit_open%'
     AND dt >= now() - interval '30 minutes'
   ```
3. Add threshold alert: value > 0 for 30 consecutive minutes
4. Notification: on-call channel (this indicates DataJud is down — manual investigation required)

### Alert 4: FCM Invalid Token Rate > 5%

1. Open Betterstack → Telemetry → Dashboards → Create Chart
2. SQL query:
   ```sql
   SELECT
     count(case when body LIKE '%token_invalid%' then 1 end) as invalid,
     count(case when body LIKE '%fcm_dispatch%' then 1 end) as total
   FROM logs
   WHERE dt >= now() - interval '10 minutes'
   ```
3. Add threshold alert: invalid/total ratio > 5%
4. Notification: email alert (not on-call — investigate during business hours)

---

## Art. 33 LGPD — Anthropic Sub-processor Disclosure

**Status:** Draft text below — requires update to privacy policy URL before launch.
**Action required:** Add this section to the privacy policy hosted at `env.PRIVACY_POLICY_URL`.

> **Note on ZDR:** Before publishing this text, confirm with Anthropic account team whether
> Zero Data Retention (ZDR) is active on the Portal Jurídico API key. If ZDR IS active,
> use the [ZDR CONTRATADO] text. If NOT yet arranged, use the [ZDR NÃO CONTRATADO] text.
> Add ZDR negotiation to the near-term roadmap.

### Privacy Policy Section Text (to be added to Notion/landing page)

---

## Transferência Internacional de Dados — Anthropic (Art. 33 LGPD)

Para disponibilizar a tradução de movimentações processuais em linguagem acessível,
o Portal Jurídico utiliza a API Claude da Anthropic (Anthropic PBC, 375 Alabama Street,
San Francisco, CA 94110, EUA).

**Garantias de proteção:**

- Os dados enviados à API Claude **NÃO incluem CPF, nome completo, ou outros dados
  de identificação do titular** (minimização de dados — Art. 46 LGPD). Somente o
  texto das movimentações processuais é enviado, sem qualquer dado pessoal associado.

- [SE ZDR CONTRATADO]: O Portal Jurídico possui acordo **Zero Data Retention (ZDR)**
  com a Anthropic — os dados não são armazenados após o retorno da resposta da API.

- [SE ZDR NÃO CONTRATADO]: A Anthropic adota política de retenção mínima de **7 dias**
  para inputs e outputs de API (reduzida de 30 dias em setembro de 2025). Após esse
  prazo, os dados são excluídos automaticamente dos sistemas da Anthropic.

- **Base legal:** Art. 33, inciso VIII da LGPD — transferência internacional com
  garantias adequadas de proteção de dados.

- **Cláusulas contratuais padrão (CPCs):** A incorporação das CPCs aprovadas pela ANPD
  (Resolução CD/ANPD nº 19/2024) ao contrato com a Anthropic está em andamento como
  parte da revisão jurídica programada (ver compromisso acima).

**Dúvidas sobre transferência internacional de dados:**
Contato: [email do DPO ou responsável pela privacidade]

---

---

## Production Gates (automated — must be green in CI)

These gates run automatically in GitHub Actions `production-gates` job before any deploy:

- [ ] Gate 1: Cross-tenant isolation test (`src/tests/cross-tenant.test.ts`) — PASSING
- [ ] Gate 2: PII redaction log test (`src/tests/lgpd.test.ts`) — PASSING
- [ ] Gate 3: Webhook idempotency replay drill (`src/routes/webhooks/billing.test.ts`) — PASSING

Verify: `gh run list --workflow=ci.yml` shows all gates green on the latest commit.

---

## Sign-off

| Item | Status | Signed by | Date |
|------|--------|-----------|------|
| Backup/restore rehearsed | Pending | | |
| Supabase Pro tier active | Pending | | |
| Secrets split verified | Pending | | |
| DataJud quota verified | Pending | | |
| LGPD lawyer review commitment | Pending | | |
| Betterstack alerts configured | Pending | | |
| Art. 33 text published to privacy policy URL | Pending | | |
| All 3 CI production gates green | Pending | | |

---

*Created: 2026-04-16*
*Phase: 08-lgpd-hardening-production-readiness*
*Maintained by: Portal Jurídico engineering team*
