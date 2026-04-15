---
phase: 02-datajud-integration-sync-worker
plan: "04"
subsystem: datajud-worker
tags: [bullmq, circuit-breaker, opossum, redis, step-job, scheduler, diff, idempotency, worker]
dependency_graph:
  requires:
    - 02-01-SUMMARY.md  # DatajudAdapter, DatajudAdapterError, DatajudMovimento, DatajudProcesso
    - 02-02-SUMMARY.md  # tabelas processos, movimentacoes, sync_errors com RLS
    - 02-03-SUMMARY.md  # schema aplicado no Supabase (db push)
  provides:
    - apps/api/src/datajud/circuit-breaker.ts  # criarCircuitBreaker, CircuitBreakerError, CB_REDIS_KEY
    - apps/api/src/queues/datajud-queue.ts      # getDatajudQueue, SyncJobData, SyncStep
    - apps/api/src/workers/scheduler.ts         # calcularTier, agendarSyncProcesso, TIER_INTERVALS_MS
    - apps/api/src/workers/datajud-sync.ts      # processarSyncJob, diffMovimentacoes, gerarHashMovimento
    - apps/api/src/workers/index.ts             # entry point do processo worker
  affects:
    - 02-05-PLAN.md  # endpoint de processos usa ultima_sincronizacao que este worker atualiza
    - 02-06-PLAN.md  # Bull Board expoe a datajud-sync queue criada aqui
tech_stack:
  added:
    - "opossum 9.0.0 — circuit breaker com estado Redis"
    - "@types/opossum — tipos TypeScript para opossum"
  patterns:
    - "BullMQ step-job com job.updateData para checkpoint crash-safe"
    - "Circuit breaker opossum com estado persistido no Redis (CB_REDIS_KEY)"
    - "Tier scheduling por processo via upsertJobScheduler (hot/warm/cold)"
    - "Diff idempotente por datajud_id com fallback para hash SHA-256 16 chars"
    - "sync_errors gravado em toda falha com tipo tipado e contexto"
    - "Segredo de justiça inferido após 3 hits=[] consecutivos"
key_files:
  created:
    - apps/api/src/datajud/circuit-breaker.ts
    - apps/api/src/queues/datajud-queue.ts
    - apps/api/src/workers/scheduler.ts
    - apps/api/src/workers/datajud-sync.ts
    - apps/api/src/workers/index.ts
    - apps/api/src/lib/__tests__/circuit-breaker.test.ts
    - apps/api/src/workers/__tests__/datajud-worker.test.ts
    - apps/api/src/workers/__tests__/diff.test.ts
  modified:
    - apps/api/package.json  # opossum 9.0.0 + @types/opossum adicionados
    - pnpm-lock.yaml
decisions:
  - "opossum noop: breaker criado com noop no criarCircuitBreaker() para testes; em producao fn real e passada como 3o argumento — evita generics complexos que o parser Oxc nao aceita"
  - "criarCircuitBreaker aceita fn opcional: pattern mais flexivel que criar breaker por funcao fixa — permite reusar a funcao utilitaria em testes sem adapter real"
  - "Threshold segredo de justica: 3 tentativas consecutivas de hits=[] — D-03/D-05 (Claude's Discretion)"
  - "workers/index.ts usa import dinamico de supabase.js para evitar side effects no load do modulo"
  - "resetDatajudQueue() exportada para isolamento de testes do singleton"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 2
---

# Phase 02 Plan 04: DataJud Worker — Circuit Breaker + Step-Job + Scheduler Summary

**One-liner:** Worker BullMQ completo com circuit breaker opossum (estado Redis), step-job com checkpoint crash-safe, diff idempotente por datajud_id, tier scheduler hot/warm/cold via upsertJobScheduler, e registro de erros em sync_errors.

## What Was Built

### Task 1: Circuit Breaker + Queue DataJud

**`apps/api/src/datajud/circuit-breaker.ts`** — Circuit breaker opossum 9.x com estado persistido no Redis:
- `criarCircuitBreaker(redis, options?, fn?)`: cria breaker restaurando estado open/closed do Redis
- `CB_REDIS_KEY = 'cb:datajud:global'` com TTL de 3600s (1h)
- `CircuitBreakerError` para identificação no worker quando circuito já estava aberto
- Persistência automática em eventos `open`, `close`, `halfOpen` via `redis.setex`
- Inicialização sem estado se Redis indisponível (failsafe)
- Parâmetros: volumeThreshold=5, errorThresholdPercentage=100%, resetTimeout=60s

**`apps/api/src/queues/datajud-queue.ts`** — Queue BullMQ singleton:
- `getDatajudQueue(redis)`: singleton com retry exponential backoff 5x (2s inicial)
- `SyncJobData` interface completa com todos os campos de checkpoint
- `SyncStep` union type para os 6 estados do step-job
- `DATAJUD_QUEUE_NAME = 'datajud-sync'`
- `resetDatajudQueue()` para isolamento em testes

### Task 2: Step-Job Worker + Scheduler + Diff

**`apps/api/src/workers/scheduler.ts`** — Tier scheduler:
- `calcularTier(Date | null)`: hot (<30 dias), warm (30-180 dias), cold (>180 dias ou null)
- `agendarSyncProcesso(queue, processoId, numeroCNJ, tenantId, tier)`: chama `upsertJobScheduler` (idempotente)
- `TIER_INTERVALS_MS`: hot=6h, warm=24h, cold=7d

**`apps/api/src/workers/datajud-sync.ts`** — Step-job processador:
- `processarSyncJob`: implementa 5 steps com `job.updateData` em cada transição (checkpoint)
- `diffMovimentacoes`: filtra movimentos existentes por `datajud_id` com fallback para `hash_conteudo`
- `gerarHashMovimento`: SHA-256 truncado 16 chars para movimentos sem ID nativo
- Detecção de segredo de justiça após 3 hits=[] consecutivos
- `gravarSyncError` em toda falha com tipo tipado (rate_limit/timeout/schema_drift/segredo_justica/circuit_open/unknown) e contexto (jobId, step, stack truncada 500 chars — T-02-14)
- `ultima_sincronizacao` atualizado SOMENTE em sync bem-sucedido (D-09)
- Circuit breaker OpenCircuitError tratado separadamente (não conta como retry)

**`apps/api/src/workers/index.ts`** — Entry point do processo worker:
- Instancia Redis com `maxRetriesPerRequest: null` (obrigatório BullMQ)
- Cria breaker em torno de `adapter.buscarProcesso.bind(adapter)` — `breaker.fire(cnj)` chama o adapter real
- Consumer DataJud com `concurrency: 3`
- Restaura estado do breaker do Redis antes de iniciar o consumer

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Circuit breaker opossum + Redis state + queue BullMQ | c49a466 | circuit-breaker.ts, datajud-queue.ts, circuit-breaker.test.ts |
| 2 | Step-job worker + tier scheduler + diff idempotente | dc7cddb | scheduler.ts, datajud-sync.ts, index.ts, datajud-worker.test.ts, diff.test.ts |

## Verification

```
Tests: 17/17 passando
  circuit-breaker.test.ts: 4/4
  datajud-worker.test.ts:  8/8
  diff.test.ts:            5/5

upsertJobScheduler em scheduler.ts:          PRESENTE
calcularTier em scheduler.ts:               PRESENTE
TIER_INTERVALS_MS hot=6h/warm=24h/cold=7d:  PRESENTE
job.updateData em datajud-sync.ts:          8 ocorrencias
sync_errors em datajud-sync.ts:             2 ocorrencias
SEGREDO_JUSTICA_THRESHOLD = 3:              PRESENTE
ultima_sincronizacao no step PERSIST:       PRESENTE
ON CONFLICT / duplicate check:              PRESENTE
DATAJUD_QUEUE_NAME = 'datajud-sync':        PRESENTE
attempts: 5 com backoff exponential:        PRESENTE
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Generics complexos causavam parse error no Oxc (Vitest)**
- **Found during:** Task 1 (ao rodar os testes)
- **Issue:** A assinatura original do plano usava `async () => {} as unknown as TR` dentro de um arrow function genérico — sintaxe que o parser Oxc do Vitest 4.x rejeita
- **Fix:** Simplificado para `any[]` nos tipos do `criarCircuitBreaker` — comportamento idêntico em runtime, sem type assertions problemáticas no código fonte
- **Files modified:** `apps/api/src/datajud/circuit-breaker.ts`
- **Commit:** c49a466

**2. [Rule 3 - Blocking] opossum 9.0.0 não estava instalado**
- **Found during:** Task 1 (verificação de dependências)
- **Issue:** O plano especificava opossum como dependência mas não estava em `apps/api/package.json`
- **Fix:** `pnpm add opossum@9.0.0 && pnpm add -D @types/opossum` no workspace apps/api
- **Files modified:** `apps/api/package.json`, `pnpm-lock.yaml`
- **Commit:** c49a466

**3. [Rule 3 - Blocking] Arquivos da 02-01 (adapter DataJud) ausentes no worktree**
- **Found during:** Início da execução
- **Issue:** Este worktree foi criado a partir de um commit anterior ao merge da 02-01; os arquivos do adapter não existiam
- **Fix:** `git checkout 04e9892 -- .` para restaurar os arquivos do target commit, seguido de commit chore
- **Files modified:** `apps/api/src/datajud/adapter.ts`, `types.ts`, `cnj-validator.ts`, `tribunal-map.ts`, etc.
- **Commit:** 01a1436

## Known Stubs

Nenhum stub identificado. Todos os módulos implementam lógica real:
- `gerarHashMovimento`: hash SHA-256 real
- `diffMovimentacoes`: query Supabase real com filtro por ID
- `calcularTier`: cálculo real por dias
- `processarSyncJob`: todos os 5 steps com lógica completa

## Threat Flags

Nenhuma nova superfície de ameaça além do documentado no `<threat_model>` do plano.

Mitigações implementadas:
- T-02-12 (DoS retry storm): BullMQ exponential backoff 5x + circuit breaker após 5 falhas
- T-02-13 (Tampering diff): ON CONFLICT check + unique constraint no banco
- T-02-14 (Info Disclosure sync_errors): stack truncada a 500 chars, sem dados do response DataJud no payload
- T-02-15 (DoS segredo justica): após 3 hits=[], job finaliza sem retry infinito
- T-02-16 (EoP supabaseAdmin): supabaseAdmin importado de lib centralizado da Phase 1

## Self-Check: PASSED

- apps/api/src/datajud/circuit-breaker.ts: FOUND
- apps/api/src/queues/datajud-queue.ts: FOUND
- apps/api/src/workers/scheduler.ts: FOUND
- apps/api/src/workers/datajud-sync.ts: FOUND
- apps/api/src/workers/index.ts: FOUND
- apps/api/src/lib/__tests__/circuit-breaker.test.ts: FOUND
- apps/api/src/workers/__tests__/datajud-worker.test.ts: FOUND
- apps/api/src/workers/__tests__/diff.test.ts: FOUND
- Commit c49a466: FOUND
- Commit dc7cddb: FOUND
