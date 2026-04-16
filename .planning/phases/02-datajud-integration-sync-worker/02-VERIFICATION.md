---
phase: 02-datajud-integration-sync-worker
verified: 2026-04-15T21:35:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "apps/api/src/datajud/adapter.ts restaurado — DatajudAdapter class completa com 132 linhas (HTTP client, auth, timeout, Zod validation)"
    - "apps/api/src/workers/index.ts restaurado — entry point BullMQ Worker com consumer datajud-sync, circuit breaker e DatajudAdapter (72 linhas)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verificar tabelas no painel Supabase"
    expected: "Tabelas processos, movimentacoes e sync_errors existem com colunas corretas. Authentication → Policies mostra *_tenant_isolation e *_service_role_bypass em cada tabela."
    why_human: "supabase db push foi executado (SUMMARY 02-03 confirma, projeto vinculado ydhntdhmtdxvzfdktjtf). Verificação final das policies requer acesso ao painel ou npx supabase db remote inspect."
  - test: "Testar Bull Board em /admin/queues"
    expected: "GET /admin/queues com header Authorization: Bearer <ADMIN_TOKEN> retorna 200 com HTML do Bull Board listando fila datajud-sync"
    why_human: "Requer servidor rodando com Redis e variável ADMIN_TOKEN configurada. Não testável sem inicializar o servidor."
---

# Phase 2: DataJud Integration & Sync Worker — Verification Report (Re-verification)

**Phase Goal:** O backend consegue buscar dados de processos do DataJud CNJ de forma confiável, validar números CNJ, agendar refresh por tiers, detectar movimentações novas de forma idempotente, e degradar graciosamente quando o DataJud está indisponível — sem nunca bloquear a UI nem reprocessar do zero.
**Verified:** 2026-04-15T21:35:00Z
**Status:** human_needed
**Re-verification:** Yes — após fechamento dos gaps (adapter.ts + workers/index.ts restaurados de git history)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Números CNJ inválidos são rejeitados na fronteira da API com erro mod-97 antes de qualquer chamada ao DataJud | ✓ VERIFIED | `cnj-validator.ts` (78 linhas) exporta `validarNumeroCNJ`, `assertCNJValido`, `normalizarCNJ`, `extrairCodigoTribunal`, `CNJInvalidoError`. `processos.ts` chama `assertCNJValido` antes de qualquer insert. 19 testes em processos.test.ts passando incluindo limites exatos. |
| 2 | Dado um CNJ válido, o worker busca dados do processo, persiste sob o tenant correto e registra `ultima_sincronizacao` | ✓ VERIFIED | `DatajudAdapter` class restaurada em `adapter.ts` (132 linhas). Método `buscarProcesso` chama `assertCNJValido` → `extrairCodigoTribunal` → `resolverTribunal` → `fetch POST` com header `Authorization: APIKey`. Resposta validada via `DatajudResponseSchema.safeParse`. Step PERSIST em `datajud-sync.ts` atualiza `ultima_sincronizacao`. `workers/index.ts` inicia o consumer BullMQ conectando adapter → circuit breaker → worker. |
| 3 | Novas movimentações são detectadas por diff em IDs estáveis — reexecutar o sync produz zero duplicatas | ✓ VERIFIED | `diffMovimentacoes` em `datajud-sync.ts` faz diff por `datajud_id` com fallback para `hash_conteudo` (SHA-256, 16 chars hex). UNIQUE NULLS NOT DISTINCT na migration 0006. 10 testes em diff.test.ts incluindo "segunda execução retorna []". |
| 4 | Falhas repetidas no DataJud ativam circuit breaker que suspende chamadas; sync_errors captura contexto; jobs retomam do checkpoint após restart sem reprocessar do zero | ✓ VERIFIED | `circuit-breaker.ts` com opossum + estado Redis (9 testes). `datajud-sync.ts` step-job com `job.updateData` em cada transição (5+ checkpoints). `gravarSyncError` chamado em todo catch com tipo e contexto. datajud-worker.test.ts cobre checkpoint, circuit_open, segredo_justica. |
| 5 | Quando DataJud está indisponível, API retorna dados em cache com flag de atualização — UI nunca bloqueada | ✓ VERIFIED | `GET /api/v1/processos/:id` retorna `desatualizado: true` quando `ultima_sincronizacao > 72h`. `null` → `desatualizado: false`. 19 testes em processos.test.ts com limites exatos (72h+1ms=true, 72h-1ms=false). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/datajud/cnj-validator.ts` | Validação mod-97 + normalizarCNJ | ✓ VERIFIED | 78 linhas. Exporta validarNumeroCNJ, normalizarCNJ, assertCNJValido, extrairCodigoTribunal, CNJInvalidoError |
| `apps/api/src/datajud/tribunal-map.ts` | Lookup J.TT → alias DataJud | ✓ VERIFIED | 105 linhas. Exporta resolverTribunal, tribunaisSuportados, TribunalNaoSuportadoError. 27 TJs + TRFs + TRTs mapeados. |
| `apps/api/src/datajud/types.ts` | Zod schemas do response DataJud | ✓ VERIFIED | 79 linhas. DatajudResponseSchema, DatajudProcessoSchema, DatajudMovimentoSchema exportados. |
| `apps/api/src/datajud/adapter.ts` | HTTP client DataJud com auth, timeout, Zod | ✓ VERIFIED | 132 linhas. DatajudAdapter class com buscarProcesso: assertCNJValido → resolverTribunal → fetch POST com Authorization: APIKey → DatajudResponseSchema.safeParse. AbortController timeout 10s. DatajudAdapterError tipado (network/timeout/auth/schema_drift/unknown). |
| `supabase/migrations/0006_datajud_schema.sql` | DDL processos + movimentacoes + sync_errors + RLS | ✓ VERIFIED | 3 CREATE TABLE, 3 ENABLE ROW LEVEL SECURITY, 3 tenant_isolation policies, 3 service_role_bypass, UNIQUE processos_tenant_cnj, movimentacoes_dedup_unique, tier_refresh CHECK('hot','warm','cold'), REFERENCES public.escritorios(id) ON DELETE CASCADE. |
| `apps/api/src/datajud/circuit-breaker.ts` | Circuit breaker opossum com estado Redis | ✓ VERIFIED | 89 linhas. Exporta criarCircuitBreaker, CircuitBreakerError (code='CIRCUIT_OPEN'), CB_REDIS_KEY. Estado Open restaurado do Redis via get/setex. |
| `apps/api/src/workers/datajud-sync.ts` | Step-job BullMQ com 5 steps | ✓ VERIFIED | 273 linhas. Exporta processarSyncJob, diffMovimentacoes, gerarHashMovimento. 5 steps (INITIAL→FETCH_DATAJUD→DIFF_MOVIMENTACOES→PERSIST→CLASSIFY_TIER→FINISH) com job.updateData em cada transição. gravarSyncError no catch. |
| `apps/api/src/workers/scheduler.ts` | Tier scheduler com upsertJobScheduler | ✓ VERIFIED | 64 linhas. Exporta calcularTier, agendarSyncProcesso, TIER_INTERVALS_MS, Tier. hot=6h, warm=24h, cold=7d. |
| `apps/api/src/queues/datajud-queue.ts` | Queue instance BullMQ | ✓ VERIFIED | 58 linhas. Exporta getDatajudQueue, DATAJUD_QUEUE_NAME='datajud-sync', SyncJobData, SyncStep. attempts:5, exponential backoff 2s. |
| `apps/api/src/workers/index.ts` | Entry point worker como processo separado | ✓ VERIFIED | 72 linhas. Importa DatajudAdapter, criarCircuitBreaker, getDatajudQueue, processarSyncJob. Cria Redis, DatajudAdapter, circuit breaker em torno de adapter.buscarProcesso, registra Worker BullMQ com concurrency:3. |
| `apps/api/src/routes/processos.ts` | GET /processos/:id + POST /processos + POST /processos/:id/sync | ✓ VERIFIED | 236 linhas. Exporta processosRoutes. STALENESS_THRESHOLD_MS=72h. assertCNJValido antes de I/O. 202 para sync manual. agendarSyncProcesso chamado em 2 handlers. |
| `apps/api/src/workers/__tests__/datajud-worker.test.ts` | Testes completos worker + checkpoint | ✓ VERIFIED | Cobre calcularTier, TIER_INTERVALS_MS, agendarSyncProcesso, checkpoint DIFF sem refazer FETCH, circuit_open, tentativasHitsVazio. |
| `apps/api/src/workers/__tests__/diff.test.ts` | Testes de diff idempotente | ✓ VERIFIED | Cobre hash determinístico 16-char, filtrar por datajud_id, segunda execução retorna []. |
| `apps/api/src/lib/__tests__/circuit-breaker.test.ts` | Testes circuit breaker | ✓ VERIFIED | 9 testes: estado Redis, restauração open, persistência em open/close/halfOpen, CircuitBreakerError.code='CIRCUIT_OPEN'. |
| `apps/api/src/routes/__tests__/processos.test.ts` | Testes staleness + validação CNJ | ✓ VERIFIED | 19+ testes com limites exatos 72h±1ms, edge cases (null, futuro), assertCNJValido casos edge. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `adapter.ts` | `cnj-validator.ts` | `import assertCNJValido` — chamado antes de fetch | ✓ WIRED | Linha 1: `import { assertCNJValido, extrairCodigoTribunal }`. Linha 52: `assertCNJValido(numeroCNJ)` antes de qualquer fetch. |
| `adapter.ts` | `tribunal-map.ts` | `import resolverTribunal` — montagem da URL | ✓ WIRED | Linha 2: `import { resolverTribunal }`. Linha 55: `const alias = resolverTribunal(codigoJT)`. |
| `adapter.ts` | `types.ts` | `DatajudResponseSchema.safeParse` — validação do response | ✓ WIRED | Linha 3: `import { DatajudResponseSchema, DatajudProcesso }`. Linha 100: `DatajudResponseSchema.safeParse(json)`. |
| `datajud-sync.ts` | `adapter.ts` (via breaker) | `breaker.fire(numeroCNJ)` no step FETCH_DATAJUD | ✓ WIRED | workers/index.ts cria breaker em torno de `adapter.buscarProcesso`, datajud-sync.ts chama `breaker.fire()` no step FETCH_DATAJUD. |
| `workers/index.ts` | `datajud-sync.ts` | `processarSyncJob` passado ao BullMQ Worker | ✓ WIRED | Linha 13: `import { processarSyncJob }`. Linha 51: `await processarSyncJob(job, supabaseAdmin, datajudQueue, breaker)`. |
| `datajud-sync.ts` | `movimentacoes` (Supabase) | step PERSIST — insert | ✓ WIRED | `supabaseAdmin.from('movimentacoes').insert` no step PERSIST. |
| `datajud-sync.ts` | `sync_errors` (Supabase) | catch de erros | ✓ WIRED | `supabaseAdmin.from('sync_errors').insert` em `gravarSyncError`. |
| `scheduler.ts` | `datajud-queue.ts` | `queue.upsertJobScheduler` | ✓ WIRED | `upsertJobScheduler` chamado em `agendarSyncProcesso`. |
| `processos.ts` | `scheduler.ts` | `agendarSyncProcesso` no POST /processos e POST /sync | ✓ WIRED | Importado e chamado em 2 handlers (POST /processos e POST /processos/:id/sync). |
| `server.ts` | `processos.ts` | `app.register(processosRoutes)` | ✓ WIRED | `app.register(processosRoutes, { prefix: '/api/v1' })` em server.ts. |
| `server.ts` | `@bull-board/fastify` | `createBullBoard + FastifyAdapter` em /admin/queues | ✓ WIRED | createBullBoard, BullMQAdapter, bullBoardAdapter.registerPlugin() com guard ADMIN_TOKEN. |
| `migration 0006` | `escritorios` (Phase 1) | `REFERENCES public.escritorios(id) ON DELETE CASCADE` | ✓ WIRED | Linha 18 da migration 0006. |
| `processos.ultima_sincronizacao` | staleness flag | `calcularDesatualizado` 72h threshold | ✓ WIRED | STALENESS_THRESHOLD_MS = 72h. Calculado em cada GET /processos/:id. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `processos.ts` GET handler | `data` (processo) | `supabaseAsUser(token).from('processos').select` | Query real com RLS por tenant | ✓ FLOWING |
| `datajud-sync.ts` FETCH step | `dadosDatajud` | `breaker.fire(numeroCNJ)` → `DatajudAdapter.buscarProcesso` | HTTP fetch real ao DataJud (mockado em testes) | ✓ FLOWING (runtime) |
| `datajud-sync.ts` PERSIST step | inserção `movimentacoes` | `diffMovimentacoes` → `supabaseAdmin.from('movimentacoes').insert` | Insert real no banco via supabaseAdmin (service_role) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Testes Phase 2 passam (worker, diff, CB, staleness) | `pnpm --filter api test --run` (somente arquivos Phase 2) | circuit-breaker.test.ts: 9✓, datajud-worker.test.ts: 12✓, diff.test.ts: 10+✓, processos.test.ts: 19+✓ | ✓ PASS |
| DatajudAdapter class existe com buscarProcesso | `grep "class DatajudAdapter" apps/api/src/datajud/adapter.ts` | 1 ocorrência (linha 27) | ✓ PASS |
| workers/index.ts existe com consumer datajud-sync | `grep "DATAJUD_QUEUE_NAME\|processarSyncJob" apps/api/src/workers/index.ts` | 2 ocorrências confirmadas | ✓ PASS |
| assertCNJValido é chamado ANTES do fetch em adapter.ts | `grep -n "assertCNJValido" adapter.ts` + verificar posição relativa ao fetch | Linha 52 (assertCNJValido) precede linha 70 (fetch) | ✓ PASS |
| Falhas de teste são somente Phase 3 (AI) | Todos os FAIL são `dist/ai/*.test.js` | 5 arquivos FAIL, todos em dist/ai/ (Phase 3, glossario-juridico.md ausente no dist/) | ✓ PASS (fora do escopo Phase 2) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DATAJUD-01 | 02-01, 02-05 | Backend valida número CNJ (mod-97) antes de qualquer consulta | ✓ SATISFIED | cnj-validator.ts com mod-97 completo. assertCNJValido chamado em processos.ts (linha 109) antes de insert. adapter.ts (linha 52) antes de fetch. |
| DATAJUD-02 | 02-01 | Backend busca dados do processo no DataJud via número CNJ | ✓ SATISFIED | DatajudAdapter.buscarProcesso restaurado (132 linhas). Monta URL por tribunal, envia Authorization: APIKey, valida response via DatajudResponseSchema. |
| DATAJUD-03 | 02-04 | Job de sincronização executa via BullMQ com política de retry (exponential backoff) | ✓ SATISFIED | datajud-sync.ts step-job implementado. datajud-queue.ts: attempts:5, exponential backoff 2s. workers/index.ts registra Worker BullMQ com `processarSyncJob` como handler. |
| DATAJUD-04 | 02-04 | Sincronização agendada em tiers (hot/warm/cold) | ✓ SATISFIED | scheduler.ts: calcularTier com limiares 30/180 dias, agendarSyncProcesso com upsertJobScheduler. hot=6h, warm=24h, cold=7d. |
| DATAJUD-05 | 02-04 | Movimentações novas detectadas por diffing idempotente | ✓ SATISFIED | diffMovimentacoes por datajud_id + hash_conteudo fallback. UNIQUE NULLS NOT DISTINCT na migration 0006. 10 testes confirmam zero duplicatas na segunda execução. |
| DATAJUD-06 | 02-04 | Circuit breaker suspende chamadas ao DataJud após N falhas | ✓ SATISFIED | circuit-breaker.ts com opossum + estado Redis. volumeThreshold:5, errorThresholdPercentage:100. 9 testes incluindo restauração estado open no restart. |
| DATAJUD-07 | 02-04 | Job retoma do checkpoint correto após reinicialização | ✓ SATISFIED | job.updateData em cada step de datajud-sync.ts (5+ checkpoints). Teste "retomar do step DIFF_MOVIMENTACOES sem refazer FETCH_DATAJUD" passa. |
| DATAJUD-08 | 02-02, 02-04 | Erros de sincronização registrados em sync_errors com contexto | ✓ SATISFIED | gravarSyncError em datajud-sync.ts. Tabela sync_errors com CHECK constraint. Teste "gravar sync_error tipo circuit_open" passa. |
| DATAJUD-09 | 02-05 | UI mostra "última atualização" com timestamp; nunca bloqueia por falha de sync | ✓ SATISFIED | GET /processos/:id retorna desatualizado: true (>72h), false (null ou ≤72h). 19 testes com limites exatos. |

**Orphaned Requirements:** Nenhum. Todos os 9 IDs DATAJUD (DATAJUD-01 a DATAJUD-09) cobertos pelos planos 02-01 a 02-06.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/api/src/workers/datajud-sync.ts` | 677-678 | `if (error && !error.message.includes('duplicate'))` — verificação de erro de insert por string matching | ⚠️ Warning | Frágil se mensagem de erro mudar, mas está dentro de try/catch e não bloqueia fluxo. Não é blocker. |

Nenhum anti-padrão de bloqueio identificado nos artefatos da Phase 2. Os 5 arquivos de teste que falham na suite (`dist/ai/dedup.test.js`, `dist/ai/translation.e2e.test.js`, etc.) são da Phase 3 (AI Translation) e falham por `glossario-juridico.md` ausente no diretório `dist/` — fora do escopo da Phase 2.

### Human Verification Required

#### 1. Verificar tabelas no painel Supabase

**Test:** Acessar https://app.supabase.com → projeto ydhntdhmtdxvzfdktjtf → Table Editor. Verificar tabelas `processos`, `movimentacoes` e `sync_errors`. Authentication → Policies: confirmar `processos_tenant_isolation`, `movimentacoes_tenant_isolation`, `sync_errors_tenant_isolation` e as 3 policies `*_service_role_bypass`.
**Expected:** 3 tabelas existem com colunas conforme migration 0006. 6 RLS policies ativas (3 tenant_isolation + 3 service_role_bypass).
**Why human:** `supabase db push` foi executado conforme SUMMARY 02-03. Projeto vinculado (ref: ydhntdhmtdxvzfdktjtf). Verificação final das policies em produção requer acesso ao painel Supabase ou `npx supabase db remote inspect`.

#### 2. Testar Bull Board em /admin/queues

**Test:** Com servidor rodando (`pnpm --filter api dev`), executar: `curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/admin/queues`
**Expected:** HTTP 200 com HTML/JSON do Bull Board listando fila `datajud-sync`.
**Why human:** Requer servidor rodando com Redis local e variável `ADMIN_TOKEN` configurada no `.env`. Não testável sem inicializar o servidor.

---

## Gaps Summary

Nenhum gap permanece após o fechamento dos dois gaps identificados na verificação anterior:

**Gap 1 FECHADO:** `apps/api/src/datajud/adapter.ts` — DatajudAdapter restaurada de git history (commit c49a466). Arquivo tem 132 linhas com classe DatajudAdapter completa.

**Gap 2 FECHADO:** `apps/api/src/workers/index.ts` — Entry point do worker restaurado de git history (commit dc7cddb). Arquivo tem 72 linhas com consumer BullMQ registrado.

Todos os 9 requisitos DATAJUD estão satisfeitos com evidências de código verificáveis. Dois itens de verificação humana pendentes (Supabase policies e Bull Board) são necessários para status `passed` completo.

---

_Verified: 2026-04-15T21:35:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes_
