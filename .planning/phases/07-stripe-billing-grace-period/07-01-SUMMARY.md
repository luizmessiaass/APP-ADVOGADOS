---
phase: 07-stripe-billing-grace-period
plan: 01
subsystem: billing
tags: [tdd, sql-migration, billing, grace-period, red-phase]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/0009_billing_schema.sql
    - apps/api/src/plugins/entitlement.test.ts
    - apps/api/src/routes/webhooks/billing.test.ts
    - apps/api/src/services/billing/grace-period.test.ts
    - apps/api/src/tests/billing-suspension.test.ts
  affects:
    - public.escritorios (status CHECK, grace columns)
    - public.usuarios (role_local CHECK + super_admin)
    - public.billing_events (new table)
tech_stack:
  added:
    - billing_events table with UNIQUE(event_id) idempotency constraint
    - grace_period_started_at and grace_banner columns on escritorios
    - super_admin role_local value on usuarios
  patterns:
    - TDD Red phase (failing stubs before production code)
    - RLS with super_admin bypass policy
    - Idempotent webhook log via DB UNIQUE constraint
key_files:
  created:
    - supabase/migrations/0009_billing_schema.sql
    - apps/api/src/routes/webhooks/billing.test.ts
    - apps/api/src/services/billing/grace-period.test.ts
    - apps/api/src/tests/billing-suspension.test.ts
  modified:
    - apps/api/src/plugins/entitlement.test.ts (already existed with advanced content)
decisions:
  - Manter entitlement.test.ts pre-existente com conteudo mais avancado em vez de substituir por stub basico
  - grace-period.test.ts importa modulo inexistente intencionalmente (red phase — modulo sera criado no Plan 04)
  - billing-suspension.test.ts usa mock do supabaseAdmin para isolar teste de integracao
metrics:
  duration_minutes: 12
  completed_date: "2026-04-16T14:33:41Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 07 Plan 01: SQL Migration + Wave 0 TDD Red Phase Summary

SQL migration 0009 que estende schema do Supabase para suporte a grace period de billing (novos status, colunas, tabela billing_events idempotente) e 4 arquivos de teste stub em fase red que definem o contrato comportamental antes de qualquer codigo de producao.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SQL migration 0009 billing schema | 46621bf | supabase/migrations/0009_billing_schema.sql |
| 2 | Wave 0 test scaffolds red phase | 1b9f08a | 3 novos + 1 existente |

## What Was Built

### Task 1: SQL Migration 0009

Migration `supabase/migrations/0009_billing_schema.sql` com 5 secoes:

1. **Status CHECK estendido** — `escritorios.status` agora aceita: `pending`, `trial`, `active`, `grace`, `read_only`, `suspended`
2. **Colunas grace period** — `grace_period_started_at` (timestamptz nullable) + `grace_banner` (boolean DEFAULT false)
3. **Role super_admin** — `usuarios.role_local` CHECK estendido com `super_admin`
4. **Tabela billing_events** — log idempotente com `UNIQUE(event_id)`, FK para escritorios ON DELETE CASCADE, CHECK para eventos validos
5. **RLS billing_events** — super_admin pode ALL; admin_escritorio/advogado podem SELECT do proprio tenant

Ameacas mitigadas (threat model):
- T-7-01: UNIQUE(event_id) previne duplicatas em nivel de DB
- T-7-02: CHECK constraint limita role_local a valores conhecidos
- T-7-03: CHECK constraint previne status invalido em escritorios

### Task 2: Wave 0 Test Scaffolds

4 arquivos de teste em fase TDD red:

- **entitlement.test.ts** — ja existia com conteudo avancado (stubs completos para BILLING-05)
- **billing.test.ts** — stubs para BILLING-03 (webhook secret) e BILLING-04 (idempotency)
- **grace-period.test.ts** — stubs para BILLING-06 (maquina de estados: dias 0/3/7/14, resolucao por pagamento)
- **billing-suspension.test.ts** — stub para BILLING-07 (dados preservados em suspensao)

Confirmacao red phase: `pnpm --filter api test --run` mostra falhas com "not implemented — stub for Wave 0" sem crash do processo.

## Deviations from Plan

### Auto-observed Issues

**1. [Observation] entitlement.test.ts pre-existente**
- **Found during:** Task 2
- **Issue:** O arquivo `apps/api/src/plugins/entitlement.test.ts` ja existia com conteudo mais avancado do que stubs basicos — inclui mocks completos de Redis e Supabase, e testes para cache e fail-closed behavior
- **Action:** Mantido sem alteracao — conteudo mais completo nao viola a fase red (testes ainda falham ao importar entitlement.js inexistente)
- **Impact:** Nenhum — testes permanecem em estado red

## Known Stubs

| Arquivo | Natureza | Plano que resolve |
|---------|----------|-------------------|
| apps/api/src/routes/webhooks/billing.test.ts | Stubs com expect.fail() | Plan 03 |
| apps/api/src/services/billing/grace-period.test.ts | Import modulo inexistente + stubs | Plan 04 |
| apps/api/src/tests/billing-suspension.test.ts | Stubs com expect.fail() | Plan 05 |

Os stubs sao intencionais — este e o contrato da fase TDD red. Nenhum impede o objetivo do plano.

## Threat Flags

Nenhuma nova superficie de seguranca introducida alem do planejado no threat model.

## Self-Check: PASSED

Arquivos criados:
- FOUND: supabase/migrations/0009_billing_schema.sql
- FOUND: apps/api/src/plugins/entitlement.test.ts
- FOUND: apps/api/src/routes/webhooks/billing.test.ts
- FOUND: apps/api/src/services/billing/grace-period.test.ts
- FOUND: apps/api/src/tests/billing-suspension.test.ts

Commits verificados:
- 46621bf: feat(07-01): SQL migration 0009 — billing schema extension
- 1b9f08a: test(07-01): Wave 0 TDD red phase — 4 billing test scaffold files
