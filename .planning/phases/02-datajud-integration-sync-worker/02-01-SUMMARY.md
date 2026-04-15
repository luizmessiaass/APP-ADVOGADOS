---
phase: 02-datajud-integration-sync-worker
plan: "01"
subsystem: backend/datajud
tags: [datajud, cnj-validation, mod-97, zod, http-adapter, tdd]
dependency_graph:
  requires: []
  provides:
    - apps/api/src/datajud/cnj-validator.ts
    - apps/api/src/datajud/tribunal-map.ts
    - apps/api/src/datajud/types.ts
    - apps/api/src/datajud/adapter.ts
  affects:
    - Phase 03 (Claude translation): adapter fornece DatajudProcesso com movimentos[]
    - Phase 04 (app_escritorio): endpoint status usa processos retornados pelo adapter
    - Phase 06 (Notificações): movimentos[] é gatilho para push notification
tech_stack:
  added:
    - zod 4.3.6 (validação de schema em runtime para response DataJud)
  patterns:
    - TDD (RED → GREEN por task)
    - Zod schema drift detection
    - AbortController para timeout HTTP
    - mod-97 algorithm (bignum via string chunking)
key_files:
  created:
    - apps/api/src/datajud/cnj-validator.ts
    - apps/api/src/datajud/tribunal-map.ts
    - apps/api/src/datajud/types.ts
    - apps/api/src/datajud/adapter.ts
    - apps/api/src/lib/__tests__/cnj-validation.test.ts
    - apps/api/src/services/__tests__/datajud.test.ts
  modified: []
decisions:
  - "Check-digit correto para CNJ 0000001-XX.2024.8.26.0001 é 45 (não 47 como estava no plano) — calculado via mod-97"
  - "Caminhos adaptados: backend/src/ → apps/api/src/ (estrutura real do monorepo)"
  - "zod 4.3.6 adicionado ao apps/api/package.json (ausente na fase 1)"
metrics:
  duration: "~18 min"
  completed_date: "2026-04-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  tests_added: 22
requirements:
  - DATAJUD-01
  - DATAJUD-02
---

# Phase 02 Plan 01: DataJud Adapter Layer Summary

**One-liner:** Camada de integração DataJud com validação CNJ mod-97, lookup de tribunal J.TT → alias, schemas Zod do response e adapter HTTP com timeout + validação de schema drift.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Testes CNJ validation + tribunal | e6f9677 | apps/api/src/lib/__tests__/cnj-validation.test.ts |
| 1 (GREEN) | Validação CNJ (mod-97) + lookup de tribunal | 47e391e | apps/api/src/datajud/cnj-validator.ts, apps/api/src/datajud/tribunal-map.ts |
| 2 (RED) | Testes DatajudAdapter | 05cca21 | apps/api/src/services/__tests__/datajud.test.ts |
| 2 (GREEN) | DataJud adapter (HTTP client + Zod schema) | 976863a | apps/api/src/datajud/types.ts, apps/api/src/datajud/adapter.ts |

## What Was Built

### cnj-validator.ts
- `validarNumeroCNJ(numero)` — valida check-digit via mod-97 (Resolução CNJ 65/2008), usa chunked string division para evitar overflow
- `normalizarCNJ(numero)` — remove separadores, retorna 20 dígitos
- `assertCNJValido(numero)` — lança `CNJInvalidoError` com `code = 'INVALID_CNJ'` antes de qualquer I/O externo
- `extrairCodigoTribunal(numero)` — extrai J.TT do número normalizado (posições 13-15)
- `CNJInvalidoError` — error class com `code = 'INVALID_CNJ'`

### tribunal-map.ts
- `resolverTribunal(codigoJT)` — lookup J.TT → alias DataJud, lança `TribunalNaoSuportadoError` para código desconhecido
- `tribunaisSuportados()` — retorna todos os códigos mapeados (para health check)
- 48 tribunais mapeados: 27 TJs estaduais, 6 TRFs, 22 TRTs + TST/CSJT, STJ, STF, CJF, STM, TSE, TRE

### types.ts (Zod)
- `DatajudMovimentoSchema` — movimento processual com `id` nullable (alguns tribunais omitem)
- `DatajudProcessoSchema` — processo com `dadosBasicos` + `movimentos[]`
- `DatajudResponseSchema` — envelope Elasticsearch com `hits.hits[].{_source}`
- Todos os campos opcionais/nullable seguindo variação real por tribunal

### adapter.ts
- `DatajudAdapter.buscarProcesso(numeroCNJ)` — fluxo completo:
  1. `assertCNJValido` antes de qualquer fetch (DATAJUD-01, T-02-01)
  2. `resolverTribunal` para montar URL correta
  3. `fetch` com `Authorization: APIKey ${apiKey}` + `AbortController` (10s timeout, T-02-04)
  4. `DatajudResponseSchema.safeParse` — detecta schema drift (T-02-03)
  5. `hits[]===0` → `null` (segredo de justiça ou processo inexistente, D-03/D-06)
- `DatajudAdapterError` com `tipo: 'network' | 'timeout' | 'auth' | 'schema_drift' | 'unknown'`
- `DATAJUD_API_KEY` lida via env var — nunca hardcoded (T-02-02)

## Test Results

```
src/lib/__tests__/cnj-validation.test.ts  15/15 passed
src/services/__tests__/datajud.test.ts     7/7  passed
Total (novos testes):                     22/22 passed
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Check-digit de exemplo do plano era matematicamente incorreto**
- **Found during:** Task 1 (GREEN, ao rodar testes)
- **Issue:** O plano especificava `0000001-47.2024.8.26.0001` como CNJ válido, mas o algoritmo mod-97 correto produz check-digit `45` para esse número (`op1=1, op2=27, opFinal=1 quando D=45`)
- **Fix:** Testes e mocks atualizados para usar `0000001-45.2024.8.26.0001` com comentário documentando o cálculo
- **Files modified:** `apps/api/src/lib/__tests__/cnj-validation.test.ts`, `apps/api/src/services/__tests__/datajud.test.ts`
- **Commit:** 47e391e (update em e6f9677 antes do GREEN commit)

**2. [Rule 3 - Blocking] Caminhos do plano não correspondiam à estrutura real do monorepo**
- **Found during:** Análise inicial da estrutura
- **Issue:** Plano referenciava `backend/src/datajud/` mas o monorepo usa `apps/api/src/datajud/`
- **Fix:** Todos os caminhos adaptados para a estrutura real
- **Files modified:** N/A (adaptação de caminho, não de código)

**3. [Rule 3 - Blocking] zod não estava instalado no projeto**
- **Found during:** Verificação de dependências antes de criar types.ts
- **Issue:** `zod 4.3.6` listado no RESEARCH.md como dependência necessária mas não presente no `apps/api/package.json`
- **Fix:** Instalado via `pnpm --filter api add zod@4.3.6`
- **Commit:** e6f9677 (junto com RED tests)

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-02-01 — Tampering: validação mod-97 rejeita input malicioso antes de I/O | Implementado |
| T-02-02 — Info Disclosure: API key nunca hardcoded ou logada | Implementado |
| T-02-03 — Tampering: Zod valida todo response externo antes de processar | Implementado |
| T-02-04 — DoS: AbortController com 10s timeout evita hang indefinido | Implementado |
| T-02-05 — Spoofing: HTTPS via base URL hardcoded (https://api-publica...) | Implementado |

## Self-Check: PASSED

Files created:
- FOUND: apps/api/src/datajud/cnj-validator.ts
- FOUND: apps/api/src/datajud/tribunal-map.ts
- FOUND: apps/api/src/datajud/types.ts
- FOUND: apps/api/src/datajud/adapter.ts
- FOUND: apps/api/src/lib/__tests__/cnj-validation.test.ts
- FOUND: apps/api/src/services/__tests__/datajud.test.ts

Commits:
- FOUND: e6f9677 (test RED task 1)
- FOUND: 47e391e (feat GREEN task 1)
- FOUND: 05cca21 (test RED task 2)
- FOUND: 976863a (feat GREEN task 2)
