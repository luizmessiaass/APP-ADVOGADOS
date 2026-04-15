---
phase: 3
slug: claude-ai-translation-core-value-prop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `backend/vitest.config.ts` (or "none — Wave 0 installs") |
| **Quick run command** | `pnpm --filter backend test --run` |
| **Full suite command** | `pnpm --filter backend test --run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test --run`
- **After every plan wave:** Run `pnpm --filter backend test --run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | AI-01 | T-03-01 | Translation endpoint rejects requests without valid tenant JWT | unit | `pnpm --filter backend test --run src/ai/translation.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | AI-02 | — | System prompt ≥4096 tokens triggers cache (countTokens gate) | unit | `pnpm --filter backend test --run src/ai/prompt-cache.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | AI-03 | T-03-02 | Movimentação text wrapped in XML tags, injected text cannot escape | unit | `pnpm --filter backend test --run src/ai/prompt-builder.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | AI-04 | — | TypeBox schema validates output before persist; invalid output throws | unit | `pnpm --filter backend test --run src/ai/output-validator.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 2 | AI-05 | — | Same movimentação text returns cache hit (no Claude call) | unit | `pnpm --filter backend test --run src/ai/dedup.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 2 | AI-06 | — | Every translated output includes disclaimer field | unit | `pnpm --filter backend test --run src/ai/disclaimer.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-07 | 01 | 2 | AI-07 | T-03-03 | Budget exceeded blocks translation; budget tracking per tenant | unit | `pnpm --filter backend test --run src/ai/budget.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-08 | 01 | 2 | AI-08 | — | Haiku model used in BullMQ job; model name visible in log | unit | `pnpm --filter backend test --run src/ai/model-routing.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-09 | 01 | 3 | AI-01 | — | E2E: POST movimentação → BullMQ job → Claude → translated output persisted | integration | `pnpm --filter backend test:integration --run src/ai/translation.e2e.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/ai/translation.test.ts` — stubs for AI-01 (endpoint contract)
- [ ] `backend/src/ai/prompt-cache.test.ts` — stubs for AI-02 (cache threshold validation)
- [ ] `backend/src/ai/prompt-builder.test.ts` — stubs for AI-03 (XML tag injection defense)
- [ ] `backend/src/ai/output-validator.test.ts` — stubs for AI-04 (schema validation)
- [ ] `backend/src/ai/dedup.test.ts` — stubs for AI-05 (hash deduplication)
- [ ] `backend/src/ai/disclaimer.test.ts` — stubs for AI-06 (disclaimer field)
- [ ] `backend/src/ai/budget.test.ts` — stubs for AI-07 (token budget/alerts)
- [ ] `backend/src/ai/model-routing.test.ts` — stubs for AI-08 (Haiku routing)
- [ ] `backend/src/ai/translation.e2e.test.ts` — stubs for E2E integration test

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude PT-BR quality smoke test | AI-01 | Requires real movimentações and human judgment on translation quality | Post 10-20 real movimentações from DataJud sandbox; review translations for naturalness and accuracy |
| Token budget alert emails reach admin | AI-07 | Requires real email delivery to admin inbox | Trigger 50% threshold artificially; verify Sentry alert / email received |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
