---
phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics
plan: 06
title: Health Endpoint + BullMQ Worker Process
subsystem: api, worker
tags: [health, bullmq, worker, redis, supabase, datajud, railway, tdd, fastify]
dependency_graph:
  requires:
    - apps/api/src/lib/supabase.ts (supabaseAdmin — plan 01-04)
    - apps/api/src/lib/redis.ts (createRedisClient — plan 01-04)
    - apps/api/src/plugins/auth.ts (authPlugin com skipAuth — plan 01-04)
    - apps/api/src/server.ts (buildApp — plan 01-05)
  provides:
    - apps/api/src/routes/health.ts (GET /health com checks Supabase + Redis + DataJud)
    - apps/worker/src/worker.ts (entry point BullMQ worker — processo separado)
    - apps/worker/src/queues/health-check.ts (placeholder job BullMQ)
    - railway.toml (configuracao de deploy dos dois servicos)
  affects:
    - Railway deployment (health check path configurado para /health)
    - Phase 2 (worker ja existe como processo separado — apenas adiciona consumers)
tech_stack:
  added:
    - pino-pretty 13.1.3 (devDep worker — logging colorido em dev)
  patterns:
    - createRedisClient() por request no health check com quit() no finally (T-1-06-D)
    - AbortSignal.timeout(3000) no check DataJud — nao bloqueia health por mais de 3s
    - maxRetriesPerRequest: null no Redis do BullMQ (obrigatorio, Pitfall 5 RESEARCH.md)
    - Sentry tag source=worker para distinguir erros worker vs API (D-29)
    - Graceful shutdown SIGTERM/SIGINT com worker.close() + redis.quit()
key_files:
  created:
    - apps/api/src/routes/health.ts
    - apps/api/src/routes/health.test.ts
    - apps/worker/src/worker.ts
    - apps/worker/src/queues/health-check.ts
    - railway.toml
  modified:
    - apps/api/src/server.ts (register healthRoutes adicionado)
    - apps/worker/package.json (pino-pretty adicionado como devDep)
decisions:
  - key: redis_per_request_health
    summary: "Redis client criado e fechado por request no /health (nao reutiliza conexao global). Previne connection exhaustion se /health for chamado em alta frequencia (T-1-06-D). Custo: latencia de conexao por check, aceitavel para health endpoint."
  - key: datajud_head_request
    summary: "DataJud check usa HEAD + 405 como status valido. A API publica do DataJud pode retornar 405 para HEAD (metodo nao suportado) — isso significa que o servidor esta respondendo, o que e' suficiente para o health check."
  - key: worker_processo_separado
    summary: "Worker BullMQ e' processo Railway separado da API desde Phase 1. Decisao estrategica: Phase 2 apenas adiciona consumers ao worker existente sem mudar a arquitetura de deploy."
metrics:
  duration: "~20 min"
  completed: "2026-04-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 2
requirements:
  - INFRA-08
  - INFRA-09
---

# Phase 01 Plan 06: Health Endpoint + BullMQ Worker Process Summary

**One-liner:** GET /health com checks individuais Supabase/Redis/DataJud (200/503), AbortSignal timeout 3s no DataJud, e worker BullMQ como processo Railway separado com placeholder job, graceful shutdown e Sentry source=worker.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar GET /health endpoint com checks de dependencias (TDD) | 6acd4e5 | apps/api/src/routes/health.ts, health.test.ts, server.ts |
| 2 | Criar BullMQ worker como processo separado com placeholder job | 0833899 | apps/worker/src/worker.ts, queues/health-check.ts, railway.toml, worker/package.json |

## What Was Built

### `apps/api/src/routes/health.ts`

GET /health publico (`skipAuth: true`) com 3 checks independentes:

- **Supabase:** `supabaseAdmin.from('escritorios').select('id').limit(1)` — query simples para validar conectividade. Se `error` nao e' null, retorna `'error'`.
- **Redis:** `createRedisClient()` + `connect()` + `ping()` — verifica `pong === 'PONG'`. Fecha conexao no `finally` com `quit()` (T-1-06-D: sem connection exhaustion).
- **DataJud:** `fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })` — considera `ok` ou status `405` como `'ok'` (405 indica servidor respondendo).

Resposta 200 quando todos passam, 503 quando qualquer um falha. Body inclui `{ status, checks: { supabase, redis, datajud }, timestamp }`.

### `apps/api/src/routes/health.test.ts`

5 testes TDD (todos passando):

1. Retorna 200 com status=ok quando todos os checks passam
2. Retorna 503 com status=degraded quando Redis falha
3. Retorna 503 com status=degraded quando Supabase falha
4. Body inclui checks individuais para diagnostico
5. Rota nao exige autenticacao (sem Authorization header retorna 200/503, nao 401)

### `apps/worker/src/worker.ts`

Entry point do processo BullMQ separado:
- Logger pino com pino-pretty em dev, JSON em producao
- Sentry com `initialScope: { tags: { source: 'worker' } }` (D-29)
- Redis com `maxRetriesPerRequest: null` (obrigatorio BullMQ, Pitfall 5)
- Graceful shutdown em SIGTERM e SIGINT: `healthCheckWorker.close()` + `redisConnection.quit()`
- Captura `uncaughtException` e `unhandledRejection` com Sentry + exit(1)

### `apps/worker/src/queues/health-check.ts`

Placeholder BullMQ Worker para o queue `health-check`. Em Phase 1 apenas loga o job processado. Phase 2+ substituira por `datajud-sync.ts`.

### `railway.toml`

Define dois servicos Railway separados:
- `api`: startCommand `node dist/server.js`, healthcheckPath `/health`, healthcheckTimeout 10s
- `worker`: startCommand `node dist/worker.js`, sem healthcheck (processo background)

### `apps/api/src/server.ts` (modificado)

`app.register(healthRoutes)` adicionado antes das rotas de auth/lgpd.

## Verification Results

```
vitest run apps/api/src/routes/health.test.ts --config backend/vitest.config.ts --reporter=verbose

 ✓ GET /health > Test 1: retorna 200 com status=ok quando todos os checks passam
 ✓ GET /health > Test 2: retorna 503 com status=degraded quando Redis falha
 ✓ GET /health > Test 3: retorna 503 com status=degraded quando Supabase falha
 ✓ GET /health > Test 4: body inclui checks individuais (supabase, redis, datajud)
 ✓ GET /health > Test 5: rota nao exige autenticacao (config skipAuth: true)

 Test Files  1 passed (1)
      Tests  5 passed (5)

Suite completa (todas as suites):
 Test Files  6 passed (6)
      Tests  20 passed (20)
```

## Deviations from Plan

### Arquivos de dependencia do plan 01-04 ja presentes neste worktree

Este worktree (agent-a718e7e3) ja tinha os arquivos do plan 01-05 (`apps/api/src/routes/auth/`, `routes/lgpd/`, `server.ts` atualizado) porque o plan 01-05 foi executado neste mesmo worktree. Nenhuma copia manual foi necessaria.

### pnpm install executado antes dos testes

**[Rule 3 - Blocker]** vitest nao estava instalado no worktree.
- **Found during:** TDD RED phase
- **Issue:** `vitest` nao encontrado — node_modules nao existia neste worktree
- **Fix:** `pnpm install --filter api` executado antes de rodar os testes
- **Impact:** Sem mudanca de codigo — apenas instalacao das dependencias ja declaradas no package.json

## Threat Model Coverage

| Threat ID | Category | Mitigation | Status |
|-----------|----------|------------|--------|
| T-1-06-I (Info Disclosure) | Info Disclosure | Health response expoe apenas 'ok'/'error' por check, sem detalhes de erro, IPs, versoes ou mensagens de excecao | Mitigated |
| T-1-06-D (DataJud timeout) | Denial of Service | AbortSignal.timeout(3000) garante que o health check nao bloqueia por mais de 3s esperando DataJud | Mitigated |
| T-1-06-D (Redis exhaustion) | Denial of Service | createRedisClient() por request com quit() no finally — conexao nao fica aberta entre requests | Mitigated |
| T-1-06-T (BullMQ job data) | Tampering | Accepted — placeholder em Phase 1 sem dados sensiveis; validacao sera adicionada em Phase 2 | Accepted |

## Known Stubs

- `apps/worker/src/queues/health-check.ts`: Placeholder job BullMQ — apenas loga o job sem logica de negocio. Intencional em Phase 1. Phase 2 substituira por `datajud-sync.ts` com logica real de sincronizacao DataJud. Nao impede o objetivo do plano (worker como processo separado funcionando).

## Self-Check: PASSED

Files verified:
- apps/api/src/routes/health.ts: EXISTS
- apps/api/src/routes/health.test.ts: EXISTS
- apps/worker/src/worker.ts: EXISTS
- apps/worker/src/queues/health-check.ts: EXISTS
- railway.toml: EXISTS
- apps/api/src/server.ts: MODIFIED (healthRoutes registrado)

Commits verified:
- 6acd4e5: feat(01-06): add GET /health endpoint with Supabase, Redis, DataJud checks
- 0833899: feat(01-06): add BullMQ worker process with health-check placeholder job

Security checks:
- skipAuth: true em /health: PASS
- maxRetriesPerRequest: null no worker Redis: PASS
- source=worker no Sentry: PASS
- Redis quit() no finally do health check: PASS
- AbortSignal.timeout(3000) no DataJud check: PASS
- Worker nao importa de apps/api: PASS
