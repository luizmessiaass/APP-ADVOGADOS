---
phase: 8
slug: lgpd-hardening-production-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (backend) + JUnit4 / Compose UI Test (Android) |
| **Config file** | `apps/api/vitest.config.ts` (backend) |
| **Quick run command** | `cd apps/api && pnpm test --run` |
| **Full suite command** | `cd apps/api && pnpm test --run && cd ../.. && ./gradlew :app-escritorio:test` |
| **Estimated runtime** | ~30 seconds (backend) + ~60 seconds (Android unit tests) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm test --run`
- **After every plan wave:** Run full suite (backend + Android unit tests)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (backend), 60 seconds (Android)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | LGPD-05 | T-8-01 | DELETE cascade leaves no orphaned PII | unit | `pnpm test --run lgpd` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 1 | LGPD-05 | T-8-01 | Auth user deleted via supabaseAdmin | unit | `pnpm test --run deletion` | ❌ W0 | ⬜ pending |
| 8-01-03 | 01 | 1 | LGPD-05 | T-8-02 | BullMQ jobs cancelled after delete | unit | `pnpm test --run jobs` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | LGPD-05 | — | Consent re-gate triggers on version change | unit | `pnpm test --run consent` | ❌ W0 | ⬜ pending |
| 8-03-01 | 03 | 2 | LGPD-05 | T-8-03 | Cross-tenant leak gate passes | integration | `pnpm test --run cross-tenant` | ✅ | ⬜ pending |
| 8-03-02 | 03 | 2 | LGPD-05 | T-8-04 | PII redaction log gate passes | unit | `pnpm test --run lgpd` | ✅ | ⬜ pending |
| 8-03-03 | 03 | 2 | LGPD-05 | T-8-05 | Webhook idempotency replay passes | integration | `pnpm test --run billing` | ❌ W0 | ⬜ pending |
| 8-04-01 | 04 | 2 | LGPD-05 | — | Launch checklist LAUNCH-CHECKLIST.md exists | file | `test -f LAUNCH-CHECKLIST.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/tests/lgpd-deletion.test.ts` — stubs for Art. 18 delete cascade + BullMQ cancel (LGPD-05)
- [ ] `apps/api/src/tests/consent-regate.test.ts` — stubs for consent version comparison logic
- [ ] `apps/api/src/tests/billing-idempotency.test.ts` — implement webhook idempotency replay test (stubs exist with `expect.fail('not implemented')`)

*Existing `cross-tenant.test.ts` and `lgpd.test.ts` cover those tasks — no new stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Betterstack alert thresholds active | D-13 | External dashboard configuration | Log in to Betterstack, verify 4 alert rules exist with correct thresholds |
| Supabase Pro tier active | D-15 | Billing/account action | Check portaljuridico-prod project settings — tier must show "Pro" |
| Backup/restore rehearsed | D-15 | Requires actual DB restore test | Follow procedure in LAUNCH-CHECKLIST.md and mark checkbox |
| Anthropic ZDR status confirmed | D-08 | Requires Anthropic account check | Contact Anthropic sales or check API account settings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
