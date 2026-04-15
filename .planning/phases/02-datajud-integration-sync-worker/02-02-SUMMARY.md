---
phase: 02-datajud-integration-sync-worker
plan: "02"
subsystem: database-schema
tags: [datajud, supabase, rls, migrations, schema, postgresql]
dependency_graph:
  requires:
    - 01-02-SUMMARY.md  # migrations 0001-0005, update_updated_at_column(), escritorios table
  provides:
    - supabase/migrations/0006_datajud_schema.sql
    - tables: processos, movimentacoes, sync_errors
  affects:
    - 02-03-PLAN.md  # supabase db push (BLOCKING — aguarda este schema)
    - 02-04-PLAN.md  # worker BullMQ usa processos + movimentacoes + sync_errors
    - 02-05-PLAN.md  # endpoint retorna dados de processos com campo ultima_sincronizacao
tech_stack:
  added:
    - "PostgreSQL 15+ UNIQUE NULLS NOT DISTINCT (movimentacoes dedup constraint)"
  patterns:
    - "RLS por tenant via auth.jwt() -> 'app_metadata' (Custom Access Token Hook)"
    - "tenant_id desnormalizado em movimentacoes para RLS sem JOIN"
    - "service_role_bypass policy para worker BullMQ"
key_files:
  created:
    - supabase/migrations/0006_datajud_schema.sql
  modified: []
decisions:
  - "Numeracao da migration: 0006 (sequencial apos 0005_triggers.sql da Phase 1) — plano dizia 002 mas estrutura real usa 0001-000N"
  - "Path da migration: supabase/migrations/ (nao backend/supabase/migrations/) — estrutura real do projeto sem prefixo backend/"
  - "UNIQUE NULLS NOT DISTINCT em movimentacoes — PostgreSQL 15+ (Supabase default) — sem fallback para PG14"
  - "D-20: retencao sync_errors = 90 dias — cron de limpeza adiado para Phase 8 hardening"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-15"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 02 Plan 02: DataJud Schema Migration Summary

**One-liner:** Migration SQL com schema completo das tabelas DataJud (processos, movimentacoes, sync_errors) com RLS por tenant, indexes de performance e constraints de idempotencia.

## What Was Built

Arquivo `supabase/migrations/0006_datajud_schema.sql` com DDL completo para a integracao DataJud:

**Tabela `processos`** — armazena metadados e dados brutos do processo por tenant:
- UNIQUE(tenant_id, numero_cnj) previne duplicacao por escritorio
- `tier_refresh TEXT CHECK IN ('hot', 'warm', 'cold')` para scheduler de refresh
- `ultima_sincronizacao TIMESTAMPTZ` — fonte de verdade de staleness (D-09)
- `dados_brutos JSONB` — response raw DataJud para Phase 3 (traducao Claude)
- Trigger `set_processos_updated_at` via `update_updated_at_column()` da Phase 1

**Tabela `movimentacoes`** — movimentacoes processuais individuais com idempotencia:
- UNIQUE NULLS NOT DISTINCT(processo_id, datajud_id, hash_conteudo) — garante diff idempotente (DATAJUD-05)
- `datajud_id TEXT` nullable — ID nativo do DataJud quando disponivel
- `hash_conteudo TEXT NOT NULL` — fallback hash deterministico quando datajud_id e NULL
- `tenant_id` desnormalizado para RLS sem JOIN (performance PostgREST)

**Tabela `sync_errors`** — registro de falhas de sincronizacao:
- `processo_id` nullable — erro pode ocorrer antes de criar o processo
- CHECK constraint restringe `tipo` a 6 valores: rate_limit, timeout, schema_drift, segredo_justica, circuit_open, unknown
- Indexes para cron de limpeza por `created_at` (retencao 90 dias — D-20, Phase 8)

**RLS em todas as 3 tabelas:**
- Policy `*_tenant_isolation` para `authenticated` — filtra por `tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'`
- Policy `*_service_role_bypass` para `service_role` — worker BullMQ tem acesso irrestrito

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration SQL — schema DataJud completo com RLS | 32dd542 | supabase/migrations/0006_datajud_schema.sql |

## Verification

```
CREATE TABLE count:           3 (processos, movimentacoes, sync_errors)
ENABLE ROW LEVEL SECURITY:    3 (uma por tabela)
tenant_isolation policies:    3 (uma por tabela)
service_role_bypass policies: 3 (uma por tabela)
processos_tenant_cnj_unique:  PRESENT
ultima_sincronizacao:         PRESENT
tier_refresh CHECK:           CHECK (tier_refresh IN ('hot', 'warm', 'cold'))
sync_errors tipo CHECK:       CHECK (tipo IN ('rate_limit', 'timeout', ...))
movimentacoes_dedup_unique:   UNIQUE NULLS NOT DISTINCT (processo_id, datajud_id, hash_conteudo)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Caminho e numeracao da migration corrigidos**
- **Found during:** Task 1 (verificacao da estrutura do projeto)
- **Issue:** O plano especificava `backend/supabase/migrations/002_datajud_schema.sql`, mas a estrutura real do projeto e `supabase/migrations/000N_nome.sql` (sem prefixo backend/, numeracao 4 digitos)
- **Fix:** Criado como `supabase/migrations/0006_datajud_schema.sql` seguindo a convencao estabelecida pelas migrations da Phase 1 (0001-0005)
- **Files modified:** N/A (arquivo criado no path correto desde o inicio)
- **Commit:** 32dd542

## Known Stubs

None — este plano cria apenas DDL SQL sem logica de aplicacao.

## Threat Flags

Nenhuma nova superficie de ameaca identificada alem do que esta documentado no threat_model do plano. As mitigacoes T-02-06, T-02-07, T-02-08 foram implementadas:
- T-02-06: RLS usa `auth.jwt() -> 'app_metadata'` (nao user_metadata) — implementado
- T-02-07: tenant_id desnormalizado em movimentacoes evita JOIN bypass — implementado
- T-02-08: CHECK constraint em sync_errors.tipo restringe valores arbitrarios — implementado
- T-02-09: dados_brutos JSONB protegido por RLS (aceito — Plan 05 nao expoe raw)

## Self-Check: PASSED

- supabase/migrations/0006_datajud_schema.sql: FOUND
- Commit 32dd542: FOUND
