---
phase: 2
slug: datajud-integration-sync-worker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Node.js/TypeScript) |
| **Config file** | `backend/vitest.config.ts` (criado na Phase 1) |
| **Quick run command** | `pnpm --filter backend test --run` |
| **Full suite command** | `pnpm --filter backend test --run --coverage` |
| **Estimated runtime** | ~15-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test --run`
- **After every plan wave:** Run `pnpm --filter backend test --run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATAJUD-01 | T-02-01 | CNJ inválido rejeitado antes de qualquer I/O externo | unit | `pnpm --filter backend test --run src/lib/cnj-validation` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DATAJUD-02 | T-02-02 | DataJud chamado somente com CNJ válido; auth header presente | unit | `pnpm --filter backend test --run src/services/datajud` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | DATAJUD-03 | — | Retry com exponential backoff executa sem duplicar | unit | `pnpm --filter backend test --run src/workers/datajud` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | DATAJUD-04 | — | Processo hot agendado com frequência correta; cold com menor | unit | `pnpm --filter backend test --run src/workers/scheduler` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | DATAJUD-05 | T-02-03 | Sync idempotente: segunda execução não cria movimentações duplicadas | integration | `pnpm --filter backend test --run src/workers/diff` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | DATAJUD-06 | T-02-04 | Circuit breaker abre após N falhas; estado salvo no Redis | unit | `pnpm --filter backend test --run src/lib/circuit-breaker` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 3 | DATAJUD-07 | — | Job retoma do step correto após reinicialização simulada | unit | `pnpm --filter backend test --run src/workers/checkpoint` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 3 | DATAJUD-08 | — | sync_errors gravado com tipo, processo_id e tenant_id corretos | integration | `pnpm --filter backend test --run src/workers/error-logging` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 4 | DATAJUD-09 | — | Endpoint retorna dados em cache com ultima_sincronizacao quando DataJud offline | integration | `pnpm --filter backend test --run src/routes/processos` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/lib/__tests__/cnj-validation.test.ts` — stubs para DATAJUD-01 (mod-97 válido e inválido)
- [ ] `backend/src/services/__tests__/datajud.test.ts` — stubs para DATAJUD-02 (mock axios/fetch)
- [ ] `backend/src/workers/__tests__/datajud-worker.test.ts` — stubs para DATAJUD-03/04/07
- [ ] `backend/src/workers/__tests__/diff.test.ts` — stubs para DATAJUD-05 (idempotência)
- [ ] `backend/src/lib/__tests__/circuit-breaker.test.ts` — stubs para DATAJUD-06
- [ ] `backend/src/routes/__tests__/processos.test.ts` — stubs para DATAJUD-09

*Nota: DataJud deve ser mockado em todos os testes — sem chamadas reais à API CNJ em CI.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DataJud retorna `hits=[]` para segredo de justiça | DATAJUD-02 (D-03..D-06) | Requer processo sigiloso real; não mockável com certeza | Cadastrar CNJ conhecido como segredo; verificar `sync_errors` com tipo `provavel_segredo_justica` |
| Rate limit real do DataJud | DATAJUD-03 | Não documentado oficialmente; 1 req/s é estimativa | Disparar 10 syncs em paralelo; observar se o DataJud retorna 429 |
| Bull Board acessível em /admin/queues | D-10..D-12 | UI visual; requer browser | Abrir /admin/queues com header `Authorization: Bearer $ADMIN_TOKEN`; verificar filas visíveis |
| Circuit breaker half-open recovery | DATAJUD-06 | Depende de timing real no Redis | Travar o DataJud mock; aguardar circuit abrir; restaurar; aguardar half-open; verificar recovery |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
