---
phase: 02-datajud-integration-sync-worker
plan: "05"
subsystem: backend-api
tags: [processos, rest-endpoints, bull-board, staleness, datajud, fastify]
dependency_graph:
  requires:
    - "02-04"  # scheduler + agendarSyncProcesso
    - "02-03"  # datajud-queue + getDatajudQueue
    - "02-01"  # cnj-validator + assertCNJValido
  provides:
    - "GET /api/v1/processos/:id com campo desatualizado (DATAJUD-09)"
    - "POST /api/v1/processos com validação CNJ (DATAJUD-01)"
    - "POST /api/v1/processos/:id/sync manual (202 Accepted)"
    - "Bull Board em /admin/queues com Bearer token guard"
  affects:
    - "02-06"  # próximo plano de verificação/validação
tech_stack:
  added:
    - "@bull-board/fastify@7.0.0"
    - "@bull-board/api@7.0.0"
    - "@bull-board/ui@7.0.0"
    - "@fastify/static"
    - "@fastify/view"
    - "ejs"
  patterns:
    - "supabaseAsUser(token) para RLS enforced em todos os handlers de processos"
    - "calcularDesatualizado: 72h threshold com null=false (nunca sincronizou != desatualizado)"
    - "Bull Board guard: onRequest hook verifica Authorization: Bearer $ADMIN_TOKEN"
    - "Bull Board inicializado somente fora de NODE_ENV=test (evita conexão Redis desnecessária)"
key_files:
  created:
    - "apps/api/src/routes/processos.ts"
    - "apps/api/src/routes/__tests__/processos.test.ts"
  modified:
    - "apps/api/src/server.ts"
    - "apps/api/.env.example"
    - "apps/api/package.json"
    - "pnpm-lock.yaml"
decisions:
  - "Bull Board inicializado condicionalmente (NODE_ENV !== 'test') — evita conexão Redis em testes unitários"
  - "request.user.tenant_id (não request.tenantId) — corrigido para usar o padrão real do auth plugin Phase 1"
  - "supabaseAsUser(token) em vez de request.supabase — padrão real do projeto (RLS por construção)"
  - "Redis criado inline nos handlers POST (não decorado no Fastify) — evita acoplamento no startup"
  - "Erros de TypeScript pré-existentes (auth.ts, translation-prompt.ts) deixados fora de escopo (scope boundary)"
metrics:
  duration: "~25 minutos"
  completed_date: "2026-04-15"
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Phase 02 Plan 05: Rotas de Processos REST + Bull Board Summary

**One-liner:** Endpoints GET/POST/sync de processos com staleness 72h (DATAJUD-09) e Bull Board em /admin/queues com Bearer token guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rotas processos GET, POST, POST sync + Testes Wave 0 | d526a27 | `apps/api/src/routes/processos.ts`, `apps/api/src/routes/__tests__/processos.test.ts` |
| 2 | Bull Board /admin/queues + registro das rotas no server | e8d3589 | `apps/api/src/server.ts`, `apps/api/.env.example`, `apps/api/package.json`, `pnpm-lock.yaml` |

## What Was Built

### GET /api/v1/processos/:id
- Busca processo do banco (Supabase com RLS via `supabaseAsUser`)
- Retorna campo `desatualizado: true` quando `ultima_sincronizacao > 72h` (DATAJUD-09, D-07/D-08)
- `ultima_sincronizacao = null` → `desatualizado: false` (nunca sincronizou = badge diferente, não "desatualizado")
- Processo de outro tenant → 404 (RLS filtra, T-02-17)

### POST /api/v1/processos
- `assertCNJValido` chamado **antes de qualquer I/O** (DATAJUD-01, T-02-18)
- CNJ inválido → 422 com `code: INVALID_CNJ` sem fetch ao Supabase
- CNJ válido → insere no banco + agenda primeiro sync com tier `cold`
- Processo duplicado → 409 com `code: PROCESSO_ALREADY_EXISTS`

### POST /api/v1/processos/:id/sync
- Verifica existência e ownership do processo (RLS)
- Chama `agendarSyncProcesso` → `upsertJobScheduler` idempotente (T-02-21)
- Retorna **202 Accepted** com `{ message: "Sincronização agendada" }`

### Bull Board em /admin/queues
- Guard `onRequest`: verifica `Authorization: Bearer $ADMIN_TOKEN`
- 401 sem token válido (T-02-19)
- `createBullBoard` + `BullMQAdapter(getDatajudQueue(redis))` para fila `datajud-sync`
- Inicializado condicionalmente: `NODE_ENV !== 'test'` para não conectar Redis em testes

## Testes Wave 0

Arquivo: `apps/api/src/routes/__tests__/processos.test.ts`

| Teste | Resultado |
|-------|-----------|
| `calcularDesatualizado` — 10h → false | PASS |
| `calcularDesatualizado` — 80h → true | PASS |
| `calcularDesatualizado` — 73h → true | PASS |
| `calcularDesatualizado` — null → false | PASS |
| `calcularDesatualizado` — 71h → false | PASS |
| `assertCNJValido` importável | PASS |
| `CNJInvalidoError` com code INVALID_CNJ | PASS |
| `assertCNJValido` é função | PASS |
| `processosRoutes` exportada como função | PASS |

**Total: 9/9 testes passando**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] request.tenantId → request.user.tenant_id**
- **Found during:** Task 1
- **Issue:** O plano referenciava `request.tenantId` mas o auth plugin real (Phase 1) decora `request.user` com `{ sub, tenant_id, role }` — não existe `request.tenantId`
- **Fix:** Usando `request.user.tenant_id` conforme o padrão real do projeto
- **Files modified:** `apps/api/src/routes/processos.ts`

**2. [Rule 1 - Bug] request.supabase → supabaseAsUser(token)**
- **Found during:** Task 1
- **Issue:** O plano referenciava `request.supabase` mas o padrão real do projeto usa `supabaseAsUser(jwt)` (vide `routes/lgpd/index.ts`)
- **Fix:** Importando e usando `supabaseAsUser(token)` diretamente nos handlers
- **Files modified:** `apps/api/src/routes/processos.ts`

**3. [Rule 1 - Bug] request.datajudQueue → Redis criado inline**
- **Found during:** Task 1
- **Issue:** O plano referenciava `request.datajudQueue` (decoração de Fastify) que não existe
- **Fix:** Criando Redis client inline nos handlers POST com try/catch para não bloquear criação do processo em caso de falha
- **Files modified:** `apps/api/src/routes/processos.ts`

**4. [Rule 1 - Bug] @bull-board import path corrigido**
- **Found during:** Task 2
- **Issue:** `@bull-board/api/bullMQAdapter.js` causava erro TS2307 (module not found)
- **Fix:** Usar `@bull-board/api/bullMQAdapter` (sem `.js`)
- **Files modified:** `apps/api/src/server.ts`

**5. [Rule 1 - Bug] basePath removido do register do Bull Board**
- **Found during:** Task 2
- **Issue:** `basePath` não existe em `FastifyRegisterOptions` causando erro TS2769
- **Fix:** Removido o parâmetro `basePath` do `app.register(bullBoardAdapter.registerPlugin())`
- **Files modified:** `apps/api/src/server.ts`

**6. [Rule 2 - Missing deps] @bull-board/fastify v7 requer @fastify/view + ejs**
- **Found during:** Task 2
- **Issue:** `@bull-board/fastify@7.0.0` requer `@fastify/view` e `ejs` como dependências peer que não estavam instaladas
- **Fix:** Instaladas via `pnpm --filter api add @fastify/view ejs`
- **Files modified:** `apps/api/package.json`, `pnpm-lock.yaml`

**7. [Rule 3 - Path correction] Estrutura backend/src → apps/api/src**
- **Found during:** Início da execução
- **Issue:** O plano referenciava `backend/src/routes/` mas a estrutura real do projeto é `apps/api/src/routes/`
- **Fix:** Todos os arquivos criados em `apps/api/src/` conforme estrutura real
- **Files modified:** N/A (path correction)

### Out of Scope (Pré-existentes)

Os seguintes erros de TypeScript existiam antes deste plano e estão fora do escopo:
- `src/ai/translation-prompt.ts` — `@anthropic-ai/sdk` não instalado (Phase 3)
- `src/plugins/auth.ts` — `decorateRequest` com `null` (Phase 1)
- `src/routes/auth/auth.test.ts` — tipos de mock (Phase 1)

Registrados em: `.planning/phases/02-datajud-integration-sync-worker/deferred-items.md` (implícito)

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| T-02-17 mitigado | processos.ts | RLS via supabaseAsUser(token) + .eq('tenant_id', tenantId) como segunda camada |
| T-02-18 mitigado | processos.ts | assertCNJValido antes de qualquer insert; 422 + INVALID_CNJ sem I/O externo |
| T-02-19 mitigado | server.ts | Bearer token guard em /admin/queues via ADMIN_TOKEN env var |
| T-02-21 mitigado | processos.ts | upsertJobScheduler idempotente no sync manual |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `apps/api/src/routes/processos.ts` | FOUND |
| `apps/api/src/routes/__tests__/processos.test.ts` | FOUND |
| `apps/api/src/server.ts` | FOUND |
| `apps/api/.env.example` | FOUND |
| Commit d526a27 (Task 1) | FOUND |
| Commit e8d3589 (Task 2) | FOUND |
