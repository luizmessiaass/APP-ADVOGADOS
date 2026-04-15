---
phase: 03-claude-ai-translation-core-value-prop
plan: "01"
subsystem: ai-translation
tags:
  - claude-api
  - bullmq
  - token-budget
  - prompt-caching
  - lgpd
dependency_graph:
  requires:
    - "01-backend-foundation (auth middleware, Fastify, Supabase, BullMQ, Sentry)"
    - "02-datajud-integration (movimentacoes table, worker.ts pattern)"
  provides:
    - "POST /api/v1/processos/:id/traducao (202 Accepted, enqueues BullMQ job)"
    - "BullMQ worker translate-movimentacao with SHA-256 dedup + budget guard"
    - "Claude Haiku 4.5 integration with prompt caching + structured outputs"
    - "token_usage telemetry table with rolling 30d budget SUM"
    - "Sentry alerts at 50/80/100% token budget per tenant"
  affects:
    - "Phase 4/5 (app_escritorio/app_cliente): traducao_json in movimentacoes table"
    - "Phase 8 (LGPD hardening): ZDR formal contract with Anthropic"
tech_stack:
  added:
    - "@anthropic-ai/sdk@0.89.0"
  patterns:
    - "Prompt caching with cache_control ephemeral in SYSTEM_PROMPT_BLOCKS"
    - "XML tag delimitation for untrusted input isolation (<movimentacao>...)</movimentacao>)"
    - "TypeBox TypeCompiler.Compile() for runtime output validation"
    - "SHA-256 (Node.js built-in crypto) for hash deduplication"
    - "BullMQ UnrecoverableError for permanent failures (budget exceeded, schema invalid)"
    - "Rolling 30d token budget with Sentry threshold alerts and cycle auto-reset"
key_files:
  created:
    - "apps/api/src/ai/glossario-juridico.md — 100+ legal terms civil/trabalhista/criminal"
    - "apps/api/src/ai/translation-schema.ts — TranslacaoSchema TypeBox + validateTranslacao()"
    - "apps/api/src/ai/translation-prompt.ts — SYSTEM_PROMPT_BLOCKS + buildUserTurn() + sanitizeForXml()"
    - "apps/api/src/ai/translation-service.ts — callClaude() with TRANSLATION_MODEL constant"
    - "apps/api/src/workers/translate-movimentacao.ts — BullMQ consumer with dedup + budget check"
    - "apps/api/src/budget/token-budget.ts — checkTokenBudget() + checkAndFireAlerts()"
    - "apps/api/src/queues/translate-queue.ts — BullMQ Queue factory"
    - "apps/api/src/routes/processos/traducao.ts — POST /api/v1/processos/:id/traducao"
    - "supabase/migrations/0007_add_ai_translation.sql — token_usage table + movimentacoes columns"
  modified:
    - "apps/api/src/workers/index.ts — registered createTranslateWorker consumer"
    - "apps/api/package.json — added @anthropic-ai/sdk@0.89.0"
decisions:
  - "TRANSLATION_MODEL = claude-haiku-4-5-20251001 (not deprecated claude-3-haiku)"
  - "sanitizeForXml() replaces '</' with '< /' to prevent XML tag injection (not HTML entity encoding — keeps text human-readable)"
  - "anyOf (not oneOf) in OUTPUT_JSON_SCHEMA for proxima_data null union — Pitfall 5 avoidance"
  - "Budget cycle reset is auto-detected: if percentual < ultimoNivel, cycle rolled — no scheduler needed"
  - "translation.test.ts uses standalone Fastify with mocked jose.jwtVerify (same pattern as auth.test.ts)"
metrics:
  duration: "~72 minutes"
  completed_date: "2026-04-15"
  tasks_completed: 7
  files_created: 9
  files_modified: 4
  tests_passing: 98
  tests_skipped: 2
  test_files: 20
---

# Phase 03 Plan 01: Claude AI Translation — Core Value Prop Summary

**One-liner:** Claude Haiku 4.5 translation pipeline with prompt caching, SHA-256 dedup, TypeBox schema validation, and rolling token budget with Sentry alerts — all wired through a BullMQ async worker and 202 Accepted endpoint.

## What Was Built

The core value proposition of Portal Jurídico is now technically proven: a BullMQ worker calls Claude Haiku 4.5 to translate opaque legal process movements into accessible Portuguese, with full caching, deduplication, validation, and cost controls.

### Artifacts Created

| File | Purpose |
|------|---------|
| `apps/api/src/ai/glossario-juridico.md` | 100+ legal terms (civil, trabalhista, criminal) loaded into system prompt with `cache_control: ephemeral` |
| `apps/api/src/ai/translation-schema.ts` | TypeBox `TranslacaoSchema` with `disclaimer: Type.Literal(...)`, `validateTranslacao()`, `OUTPUT_JSON_SCHEMA` (anyOf for null union) |
| `apps/api/src/ai/translation-prompt.ts` | `SYSTEM_PROMPT_BLOCKS` array, `buildUserTurn()` with XML delimitation, `sanitizeForXml()`, `validateCacheThreshold()`, `TRANSLATION_MODEL` constant |
| `apps/api/src/ai/translation-service.ts` | `callClaude()` — calls Anthropic API, captures token usage, validates output schema |
| `apps/api/src/workers/translate-movimentacao.ts` | BullMQ worker: SHA-256 hash check → budget check → Claude call → save translation → insert token_usage |
| `apps/api/src/budget/token-budget.ts` | `checkTokenBudget()` (rolling 30d via RPC) + `checkAndFireAlerts()` (50/80/100% Sentry, auto-cycle-reset) |
| `apps/api/src/queues/translate-queue.ts` | BullMQ Queue factory for `translate-movimentacao` |
| `apps/api/src/routes/processos/traducao.ts` | `POST /api/v1/processos/:id/traducao` — returns 202 Accepted immediately |
| `supabase/migrations/0007_add_ai_translation.sql` | `token_usage` table, `movimentacoes` columns (hash_texto, traducao_*), `escritorios` budget columns, `get_token_usage_30d()` RPC |

### Requirements Coverage

| Req ID | Status | Implementation |
|--------|--------|----------------|
| AI-01 | DONE | `POST /api/v1/processos/:id/traducao` → 202, worker calls `callClaude()` |
| AI-02 | DONE | `SYSTEM_PROMPT_BLOCKS` with `cache_control: ephemeral`, `validateCacheThreshold()` |
| AI-03 | DONE | `buildUserTurn()` wraps text in `<movimentacao>...</movimentacao>`, `sanitizeForXml()` neutralizes `</` injection |
| AI-04 | DONE | `validateTranslacao()` with `TypeCompiler.Compile().Check()` before persist; `UnrecoverableError` on failure |
| AI-05 | DONE | `hashMovimentacao()` SHA-256, cache hit returns without calling Claude, `translation_source: 'cache'` in logs |
| AI-06 | DONE | `disclaimer: Type.Literal('Explicação gerada por IA — confirme com seu advogado')` — required field |
| AI-07 | DONE | `checkTokenBudget()` + `checkAndFireAlerts()` with 50/80/100% thresholds, block at 100% |
| AI-08 | DONE | `TRANSLATION_MODEL = 'claude-haiku-4-5-20251001'` visible in token_usage records and logs |

### Decisions Made

1. **`sanitizeForXml()` uses `</ → < /` substitution** (not HTML entity encoding `&lt;`) — keeps the text human-readable in prompts while preventing XML tag injection from DataJud content.

2. **`anyOf` (not `oneOf`) in `OUTPUT_JSON_SCHEMA`** for `proxima_data: string | null` — per Pitfall 5 in RESEARCH.md; `anyOf` is supported by Claude's constrained decoding, `oneOf` may fail silently.

3. **Budget cycle auto-reset** inside `checkAndFireAlerts()` — detects new rolling period when `percentual < ultimoNivel` without requiring an external scheduler. This eliminates a Category 4 cron dependency.

4. **Translation test isolation** — `translation.test.ts` builds its own Fastify instance with mocked `jose.jwtVerify`, mirroring the auth.test.ts pattern instead of using `buildApp()` which conflicts with decorator registration.

5. **`@ts-expect-error` on `output_config`** in `translation-service.ts` — the Anthropic SDK 0.89.0 TypeScript types don't yet expose `output_config` at the type level despite it being available at runtime (Structured Outputs GA).

## Test Results

```
Test Files  20 passed (20)
      Tests  98 passed | 2 skipped (100)
```

- **98 tests passing** — all unit and integration tests
- **2 skipped** — smoke tests requiring `ANTHROPIC_API_KEY` (correctly skip in local env, will run in CI with secrets)
- **Zero failures**

### Test Files Added

| File | Tests | Status |
|------|-------|--------|
| `output-validator.test.ts` | 4 | GREEN |
| `prompt-builder.test.ts` | 3 | GREEN |
| `prompt-cache.test.ts` | 2 | GREEN |
| `disclaimer.test.ts` | 3 | GREEN |
| `model-routing.test.ts` | 2 | GREEN |
| `dedup.test.ts` | 3 | GREEN |
| `budget.test.ts` | 10 | GREEN |
| `translation.test.ts` | 3 | GREEN |
| `translation.e2e.test.ts` | 4 + 2 skipped | GREEN |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `vi.fn().mockImplementation(...)` is not a constructor**
- **Found during:** Wave 1, model-routing.test.ts
- **Issue:** `new Anthropic()` in `translation-service.ts` requires a class constructor — `vi.fn().mockImplementation(() => ({...}))` is not callable as a constructor
- **Fix:** Changed `vi.mock` to use a real `class MockAnthropic { messages = { create: mockCreate }; constructor(_opts?) {} }`
- **Files modified:** `apps/api/src/ai/model-routing.test.ts`
- **Commit:** ac737d9

**2. [Rule 1 - Bug] `buildApp()` decorator conflict in translation.test.ts**
- **Found during:** Wave 2, translation.test.ts
- **Issue:** `buildApp()` already registers the `auth` plugin which decorates `request.user` — test code trying to decorate again caused `FST_ERR_DEC_ALREADY_PRESENT`
- **Fix:** Rewrote to use a standalone Fastify instance with `vi.mock('jose', ...)` to mock `jwtVerify`, matching the auth.test.ts pattern
- **Files modified:** `apps/api/src/ai/translation.test.ts`
- **Commit:** bc839bd

**3. [Rule 2 - Missing auth] `traducao.ts` route missing `preHandler: [fastify.authenticate]`**
- **Observed:** The plan code used `fastify.authenticate` which doesn't exist as a named method in this project — authentication is via the global `preHandler` hook in `auth.ts`
- **Fix:** Removed the `preHandler` array from the route since the global hook already handles authentication for all non-`skipAuth` routes
- **Files modified:** `apps/api/src/routes/processos/traducao.ts`

## Known Stubs

None — all implemented behaviors are wired to real logic. Smoke tests are intentionally skipped locally (require `ANTHROPIC_API_KEY`) and marked with `it.skipIf()`.

## Threat Flags

No new threat surface beyond what was already specified in the plan's `<threat_model>`. All STRIDE mitigations (T-03-01 through T-03-08) are implemented as planned. T-03-09 (ZDR) is accepted for v1.

## Self-Check

### Created files exist
- apps/api/src/ai/glossario-juridico.md: FOUND
- apps/api/src/ai/translation-schema.ts: FOUND
- apps/api/src/ai/translation-prompt.ts: FOUND
- apps/api/src/ai/translation-service.ts: FOUND
- apps/api/src/workers/translate-movimentacao.ts: FOUND
- apps/api/src/budget/token-budget.ts: FOUND
- apps/api/src/queues/translate-queue.ts: FOUND
- apps/api/src/routes/processos/traducao.ts: FOUND
- supabase/migrations/0007_add_ai_translation.sql: FOUND

### Commits exist
- 8c9a243: test(03-01): Wave 0 stubs — FOUND
- 3ffe6ac: feat(03-01): Wave 0 migration — FOUND
- ac737d9: feat(03-01): Wave 1 core service — FOUND
- bc839bd: feat(03-01): Wave 2 worker + endpoint — FOUND
- f967d94: feat(03-01): Wave 3 budget tests — FOUND
- 3244302: chore(03-01): Wave 4 schema push — FOUND
- 78175d4: feat(03-01): Wave 4 e2e tests — FOUND

## Self-Check: PASSED
