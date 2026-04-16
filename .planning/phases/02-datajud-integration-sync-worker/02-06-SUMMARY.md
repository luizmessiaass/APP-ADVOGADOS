---
phase: 02-datajud-integration-sync-worker
plan: "06"
subsystem: backend/tests
tags: [tests, datajud, worker, diff, circuit-breaker, staleness, cnj-validation]
dependency_graph:
  requires:
    - "02-04"
    - "02-05"
  provides:
    - "cobertura de testes completa para requirements DATAJUD-03 a DATAJUD-09"
  affects:
    - "apps/api/src/workers/__tests__"
    - "apps/api/src/lib/__tests__"
    - "apps/api/src/routes/__tests__"
tech_stack:
  added:
    - "opossum ^9.0.0 (circuit breaker)"
    - "zod ^4.3.6 (schema validation)"
  patterns:
    - "Vitest com mocks síncronos (vi.fn) — zero chamadas reais"
    - "setupFiles com envalid env vars para testes que importam módulos com cleanEnv"
    - "Step-job checkpoint pattern: job começa de DIFF_MOVIMENTACOES sem refazer FETCH"
    - "Hash determinístico SHA-256 16-char para movimentos sem datajud_id"
key_files:
  created:
    - apps/api/src/workers/__tests__/datajud-worker.test.ts
    - apps/api/src/workers/__tests__/diff.test.ts
    - apps/api/src/lib/__tests__/circuit-breaker.test.ts
    - apps/api/src/workers/datajud-sync.ts
    - apps/api/src/workers/scheduler.ts
    - apps/api/src/datajud/circuit-breaker.ts
    - apps/api/src/datajud/cnj-validator.ts
    - apps/api/src/datajud/tribunal-map.ts
    - apps/api/src/datajud/types.ts
    - apps/api/src/queues/datajud-queue.ts
    - apps/api/vitest.config.ts
  modified:
    - apps/api/src/routes/__tests__/processos.test.ts
    - apps/api/package.json
    - pnpm-lock.yaml
decisions:
  - "CNJ check-digit correto calculado via mod-97: 0000001-45.2024.8.26.0001 (não 47)"
  - "vitest.config.ts criado em apps/api/ com setupFiles para garantir env vars em tests que importam config.ts"
  - "Arquivos de implementação recriados no worktree (02-04/02-05 commitados em branch diferente)"
metrics:
  duration: "~25 minutos"
  completed: "2026-04-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 11
  files_modified: 3
  tests_total: 75
  tests_new: 36
---

# Phase 02 Plan 06: Testes Completos DataJud — Worker, Diff, Circuit Breaker, Staleness

**One-liner:** Suite de testes completa para os 9 requisitos DATAJUD com mocks síncronos, checkpoint, idempotência e circuit breaker Redis — 75 testes, 0 falhas, < 3 segundos.

## What Was Built

Expandiu os stubs Wave 0 dos planos 02-04/02-05 em testes completos cobrindo os fluxos críticos da phase 2.

### Task 1: Testes completos — worker, diff, circuit breaker

**datajud-worker.test.ts** (12 testes):
- `calcularTier` + `TIER_INTERVALS_MS` + `agendarSyncProcesso` (stubs Wave 0)
- `processarSyncJob` INITIAL→FETCH_DATAJUD (transição de step confirmada)
- Checkpoint: retomar do step `DIFF_MOVIMENTACOES` sem refazer `FETCH_DATAJUD`
- `circuit_open`: breaker aberto → grava `sync_errors` sem chamar DataJud
- `tentativasHitsVazio`: incrementa contador quando DataJud retorna null

**diff.test.ts** (10 testes):
- Hash determinístico 16-char hex (SHA-256 truncado)
- Diff por `datajud_id` com fallback `hash_conteudo`
- Idempotência: 2-de-3 movimentos já existem → retorna 1
- Segunda execução com todos existentes → retorna [] (zero duplicatas)
- Sem `id` no movimento → usa hash para comparar

**circuit-breaker.test.ts** (9 testes):
- Iniciar fechado sem estado no Redis
- Restaurar estado `open` do Redis no restart (DATAJUD-06)
- Persistir estado via `redis.setex` em `open`/`close`/`halfOpen`
- Ignorar erro de Redis (resilência)
- `CircuitBreakerError.code === 'CIRCUIT_OPEN'`

### Task 2: Testes completos de staleness e validação CNJ

**processos.test.ts** (19 testes, expandido de 9):
- Staleness nos limites exatos: 72h+1ms=true, 72h-1ms=false (DATAJUD-09)
- Edge cases: timestamp futuro=false, 1h=false, 7dias=true
- `assertCNJValido` com string vazia, 19 dígitos, letras
- `code === 'INVALID_CNJ'` em todos os erros
- CNJ válido `0000001-45.2024.8.26.0001` aceito sem exceção

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CNJ check-digit incorreto no template do plano**
- **Found during:** Task 2
- **Issue:** O plano usava `0000001-47.2024.8.26.0001` mas o check-digit correto é `45` (calculado via mod-97)
- **Fix:** Trocado para `0000001-45.2024.8.26.0001` no teste `deve não lançar para CNJ válido`
- **Files modified:** `apps/api/src/routes/__tests__/processos.test.ts`
- **Commit:** 7c3df52

**2. [Rule 3 - Blocking] Arquivos de implementação ausentes no worktree**
- **Found during:** Task 1
- **Issue:** O worktree (commit 747c895) não continha os arquivos `datajud-sync.ts`, `scheduler.ts`, `circuit-breaker.ts`, `cnj-validator.ts`, `types.ts` (criados nos planos 02-04/02-05 em branches paralelas que foram mergeadas no master mas não neste worktree)
- **Fix:** Recriados manualmente a partir do conteúdo nos commits `dc7cddb` e `c49a466` consultados via `git show`
- **Files modified:** 7 novos arquivos de implementação criados
- **Commit:** f7c6596

**3. [Rule 2 - Missing] vitest.config.ts ausente em apps/api/**
- **Found during:** Task 2
- **Issue:** `apps/api/` não tinha `vitest.config.ts` com `setupFiles`. Testes que importavam `processos.ts` falhavam com `process.exit(1)` porque `envalid` não encontrava as env vars (o setupFile existia só no `backend/vitest.config.ts` que usa `pnpm --filter backend`, mas o package real é `api`)
- **Fix:** Criado `apps/api/vitest.config.ts` com `setupFiles: ['src/tests/setup.ts']`
- **Files modified:** `apps/api/vitest.config.ts` (criado)
- **Commit:** f7c6596

**4. [Rule 3 - Blocking] Path discrepância: plano usa "backend/" mas estrutura real é "apps/api/"**
- **Found during:** Início da execução
- **Issue:** O plano referencia `backend/src/workers/__tests__/` e `pnpm --filter backend test` mas o projeto usa `apps/api/src/` e `pnpm --filter api test`
- **Fix:** Todos os arquivos criados nos paths corretos `apps/api/src/`; comando de verificação adaptado para `pnpm --filter api test`
- **Impact:** Nenhum — funcionalidade idêntica, paths corretos

## Known Stubs

Nenhum stub introduzido neste plano. Todos os testes são completos e verificam comportamento real com mocks síncronos.

## Threat Flags

Nenhum novo surface de segurança introduzido — este plano apenas adiciona testes.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| datajud-worker.test.ts | FOUND |
| diff.test.ts | FOUND |
| circuit-breaker.test.ts | FOUND |
| processos.test.ts | FOUND |
| SUMMARY.md | FOUND |
| Commit f7c6596 (Task 1) | FOUND |
| Commit 7c3df52 (Task 2) | FOUND |
| pnpm --filter api test --run | 75 passed, 0 failed |
