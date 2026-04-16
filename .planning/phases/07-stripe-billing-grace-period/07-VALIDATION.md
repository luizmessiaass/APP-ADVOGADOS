---
phase: 7
slug: stripe-billing-grace-period
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-16
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (backend) + JUnit4 + Espresso (Android) |
| **Config file** | `apps/api/vitest.config.ts` / `apps/worker/vitest.config.ts` |
| **Quick run command** | `pnpm --filter api test --run` |
| **Full suite command** | `pnpm --filter api test --run && pnpm --filter worker test --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter api test --run`
- **After every plan wave:** Run `pnpm --filter api test --run && pnpm --filter worker test --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BILLING-04 | T-7-01 | billing_events recorded before processing | unit | `pnpm --filter api test --run` | ✅ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | BILLING-03 | T-7-02 | webhook secret verified before processing | unit | `pnpm --filter api test --run` | ✅ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | BILLING-05 | T-7-03 | 402 returned for suspended tenant | unit | `pnpm --filter api test --run src/plugins/entitlement.test.ts 2>&1 \| tail -20` | ✅ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | BILLING-05 | T-7-03 | write endpoints return 402 in read_only | unit | `pnpm --filter api test --run src/plugins/entitlement.test.ts 2>&1 \| tail -20` | ✅ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | BILLING-06 | T-7-04 | grace period transitions correct days | unit | `pnpm --filter api test --run src/services/billing/grace-period.test.ts 2>&1 \| tail -20` | ✅ W0 | ⬜ pending |
| 07-03-02 | 03 | 2 | BILLING-06 | — | email sent on Day 0 | integration | `pnpm --filter api test --run src/routes/webhooks/billing.test.ts 2>&1 \| tail -20` | ✅ W0 | ⬜ pending |
| 07-04-01 | 04 | 2 | BILLING-07 | T-7-05 | data not deleted on suspension | unit | `pnpm --filter api test --run src/tests/billing-suspension.test.ts 2>&1 \| tail -20` | ✅ W0 | ⬜ pending |
| 07-05-01 | 05 | 3 | BILLING-01 | — | admin endpoints require super_admin role | unit | `pnpm --filter api test --run` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/api/src/plugins/entitlement.test.ts` — stubs for BILLING-05
- [x] `apps/api/src/routes/webhooks/billing.test.ts` — stubs for BILLING-03, BILLING-04
- [x] `apps/api/src/services/billing/grace-period.test.ts` — stubs for BILLING-06 (pure function tests)
- [x] `apps/api/src/tests/billing-suspension.test.ts` — stubs for BILLING-07

*Framework (vitest) already installed from Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| supabase db push migration 0009 | BILLING-04 | Requires live Supabase connection | Run `supabase db push` and verify tables in Supabase Studio |
| Android banner appears on Day 3+ | BILLING-06 | UI interaction test | Set `grace_banner: true` on test tenant, open app, verify banner visible |
| Android read-only mode on Day 7 | BILLING-06 | UI interaction test | Set status `read_only`, verify write buttons disabled (FAB, send, sincronizar) |
| Android suspension screen on Day 14 | BILLING-06 | UI interaction test | Set status `suspended`, verify ProcessoListScreen replaced |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
