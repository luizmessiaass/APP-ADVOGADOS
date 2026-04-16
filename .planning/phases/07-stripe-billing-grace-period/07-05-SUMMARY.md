---
phase: 07-stripe-billing-grace-period
plan: 05
subsystem: billing-worker
tags: [bullmq, cron, grace-period, resend, tdd, idempotency]
dependency_graph:
  requires:
    - apps/worker/src/queues/health-check.ts (padrao de queue existente — espelhado)
    - apps/worker/src/config.ts (env vars SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    - supabase/migrations (escritorios.grace_period_started_at, billing_events table — Plan 01)
    - apps/api/src/services/billing/grace-period.ts (Plan 03 — logica pura duplicada no worker)
  provides:
    - apps/worker/src/queues/grace-period.ts
    - apps/worker/src/services/grace-period.ts
    - apps/worker/src/workers/grace-period-check.ts
    - apps/worker/src/lib/supabase.ts
  affects:
    - apps/worker/src/worker.ts (cron registration + graceful shutdown)
    - apps/worker/package.json (resend@6.12.0 + vitest@4.1.4 + test script)
    - apps/worker/src/config.ts (RESEND_API_KEY + RESEND_FROM_EMAIL)
tech_stack:
  added:
    - resend@6.12.0 — SDK transacional para emails Day 0/7/14
    - vitest@4.1.4 — framework de testes para o worker (antes sem testes)
  patterns:
    - BullMQ upsertJobScheduler (cron idempotente — nao duplica jobs)
    - gracePeriodStateTransition funcao pura duplicada no worker (sem import cross-process)
    - billing_events stage marker como guarda de idempotencia pre-email
    - per-tenant try/catch — falha em um tenant nao para os demais (BILLING-06)
    - Resend via env.RESEND_API_KEY validado (nunca process.env direto — T-7-18)
key_files:
  created:
    - apps/worker/src/queues/grace-period.ts
    - apps/worker/src/services/grace-period.ts
    - apps/worker/src/services/grace-period.test.ts
    - apps/worker/src/workers/grace-period-check.ts
    - apps/worker/src/workers/grace-period-check.test.ts
    - apps/worker/src/lib/supabase.ts
    - apps/worker/vitest.config.ts
  modified:
    - apps/worker/src/worker.ts
    - apps/worker/package.json
    - apps/worker/src/config.ts
decisions:
  - Logica pura de grace-period duplicada no worker (nao importar de apps/api — processos separados no Railway)
  - vitest mock do Resend precisa ser classe construtora real (vi.fn() como constructor nao funciona no vitest 4.x)
  - Falha de email nao bloqueia atualizacao de status — aceito como T-7-17 (retry natural amanha via cron)
  - per-tenant try/catch garante que um tenant com dados corrompidos nao para o processamento global
metrics:
  duration_minutes: 25
  completed_date: "2026-04-16T17:45:00Z"
  tasks_completed: 2
  files_created: 7
  files_modified: 3
---

# Phase 07 Plan 05: BullMQ Grace Period Cron Job Summary

Cron job BullMQ diario `0 12 * * *` (09:00 BRT) que processa todos os tenants em grace/read_only, aplica transicoes de estado via funcao pura, envia emails transacionais via Resend SDK e guarda idempotencia por billing_events stage markers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | resend install + grace-period queue + pure service | 73da9da | package.json, config.ts, queues/grace-period.ts, services/grace-period.ts, vitest.config.ts |
| 2 | grace-period-check worker processor + registration | ca3358d | workers/grace-period-check.ts, lib/supabase.ts, worker.ts |

## What Was Built

### Task 1: Infra de Base

**`apps/worker/src/queues/grace-period.ts`** — definicao da fila BullMQ:
- `GRACE_PERIOD_QUEUE = 'grace-period-check'`
- `getGracePeriodQueue(redis: Redis): Queue<GracePeriodJobData>` exportado
- Interface `GracePeriodJobData { triggered_at: string }`

**`apps/worker/src/services/grace-period.ts`** — logica pura duplicada do API (sem import cross-process):
- `GracePeriodState`, `GracePeriodActionType`, `TenantStatus` — tipos completos
- `gracePeriodStateTransition(state)` — retorna array de acoes por dia (Day 0/3/7/14)
- `resolveGracePeriod()` — reset completo apos pagamento bem-sucedido
- Idempotencia: guards verificam `status` e `graceBanner` antes de emitir acoes

**`apps/worker/src/config.ts`** — extendido com:
- `RESEND_API_KEY: str({ default: '' })`
- `RESEND_FROM_EMAIL: str({ default: 'Portal Juridico <noreply@portaljuridico.com.br>' })`

**vitest@4.1.4 instalado** com `test` script no package.json + vitest.config.ts.

### Task 2: Worker Processor + Registration

**`apps/worker/src/workers/grace-period-check.ts`** — processador do cron:
1. Query `escritorios` WHERE `status IN ('grace', 'read_only')`
2. Para cada tenant: calcula `daysSinceStart = floor((now - grace_period_started_at) / 86400000)`
3. Chama `gracePeriodStateTransition` da copia local do servico puro
4. Para cada acao retornada:
   - `set_status`: UPDATE `escritorios` SET `status=value, updated_at=now()`
   - `set_grace_banner`: UPDATE `escritorios` SET `grace_banner=value, updated_at=now()`
   - `send_email`: guard de idempotencia via `billing_events` (`grace.advanced` + stage key), depois `resend.emails.send()`
5. `logBillingEvent` registra cada transicao com `event='grace.advanced'`, `payload.stage=day_N`
6. per-tenant `try/catch` — um tenant com erro nao para os outros
- T-7-18: `const resend = new Resend(env.RESEND_API_KEY)` — chave sempre do config validado

**`apps/worker/src/lib/supabase.ts`** — supabaseAdmin para o processo worker.

**`apps/worker/src/worker.ts`** modificado:
- Import: `getGracePeriodQueue`, `GRACE_PERIOD_QUEUE`, `processarGracePeriodCheck`, `Worker`
- `gracePeriodQueue.upsertJobScheduler('daily-grace-period-check', { pattern: '0 12 * * *' }, ...)` — cron idempotente
- Comentario: `// 0 12 * * * = 09:00 BRT (UTC-3). Brazil abolished BRST summer time in 2019 (Decreto 9.772/2019). UTC offset permanently -03:00.`
- `gracePeriodWorker.close()` no `shutdown()` — apos `healthCheckWorker.close()`

### Testes (TDD GREEN)

- `services/grace-period.test.ts`: 9/9 — Day 0/3/7/14 transitions + idempotencia + resolveGracePeriod
- `workers/grace-period-check.test.ts`: 4/4 — sem tenants, DB error, Day 3 banner, suspended idempotente
- **Total: 13/13 testes passando**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest nao instalado no worker**
- **Found during:** Task 1 — `pnpm --filter worker test` falhava sem framework de teste
- **Issue:** O plan mencionava `pnpm --filter worker test --run` como verificacao mas o worker nao tinha vitest
- **Fix:** Instalado vitest@4.1.4 (mesma versao do apps/api), adicionado script `test` e `vitest.config.ts`
- **Files modified:** `apps/worker/package.json`, `apps/worker/vitest.config.ts`
- **Commit:** 73da9da

**2. [Rule 1 - Bug] Mock Resend como vi.fn() falha no vitest 4.x**
- **Found during:** Task 2 — `TypeError: () => ({...}) is not a constructor`
- **Issue:** `vi.fn().mockImplementation(() => ({...}))` nao cria um constructor valido para `new Resend()`
- **Fix:** Alterado mock para classe real: `class MockResend { emails = { send: mockSend }; constructor(_k: string) {} }`
- **Files modified:** `apps/worker/src/workers/grace-period-check.test.ts`
- **Commit:** ca3358d

**3. [Observation] grace-period.ts do Plan 03 nao existe neste worktree**
- **Found during:** Task 1 — worktree paralelo nao tem commits do Plan 03
- **Acao:** Plano ja previa isso — instrucoes dizem explicitamente para duplicar a logica pura no worker
- **Nenhuma mudanca necessaria:** Logica duplicada em `apps/worker/src/services/grace-period.ts`

## Known Stubs

Nenhum stub remanescente. Todos os templates de email sao strings HTML inline (v1 — sem sistema de templates externo, conforme plan).

## Threat Flags

Nenhuma nova superficie de seguranca alem do planejado.

Mitigacoes aplicadas conforme threat register:
- T-7-15: `gracePeriodStateTransition` pura e unit-testada — DB writes so apos funcao retornar acoes validas
- T-7-16: `upsertJobScheduler` somente no worker.ts — comentario explica que NAO deve ser registrado no API process
- T-7-17: Email failure aceito — status ja atualizado antes do envio; retry amanha via cron
- T-7-18: `new Resend(env.RESEND_API_KEY)` — chave via config validado, nunca hardcoded

## Self-Check: PASSED

Arquivos criados:
- FOUND: apps/worker/src/queues/grace-period.ts
- FOUND: apps/worker/src/services/grace-period.ts
- FOUND: apps/worker/src/workers/grace-period-check.ts
- FOUND: apps/worker/src/lib/supabase.ts
- FOUND: apps/worker/vitest.config.ts

Commits verificados:
- 73da9da: feat(07-05): resend install + grace-period queue + pure service logic (Task 1)
- ca3358d: feat(07-05): grace-period-check worker processor + cron registration (Task 2)

Verificacoes criticas:
- `grep -F "0 12 * * *" apps/worker/src/worker.ts` — PRESENTE
- `grep "gracePeriodWorker.close" apps/worker/src/worker.ts` — PRESENTE
- `grep "upsertJobScheduler" apps/worker/src/worker.ts` — PRESENTE
- `grep "billing_events\|grace.advanced" apps/worker/src/workers/grace-period-check.ts` — PRESENTE
- `grep "env.RESEND_API_KEY" apps/worker/src/workers/grace-period-check.ts` — PRESENTE
- 13/13 testes passando
