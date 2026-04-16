---
phase: 05-android-app-fluxo-cliente-mvp
plan: "01"
subsystem: backend-api
tags: [backend, supabase, rls, fastify, processos, movimentacoes, phase5]
dependency_graph:
  requires:
    - 02-datajud-integration (processos + movimentacoes tables)
    - 01-backend-foundation (auth plugin, RLS patterns, server.ts)
  provides:
    - GET /api/v1/processos (RLS-filtered list for cliente role)
    - GET /api/v1/processos/:id/movimentacoes (with AI-translated fields)
    - GET /api/v1/processos/:id enriched with telefone_whatsapp
    - processos.cliente_usuario_id column (client process ownership)
  affects:
    - 05-02 through 05-05 (all Android screens depend on these endpoints)
tech_stack:
  added: []
  patterns:
    - Supabase RLS role-split (permissive policies by role, not generic FOR ALL)
    - Supabase nested select (escritorios join in processos query)
    - Fastify plugin pattern for sub-resource routes
key_files:
  created:
    - supabase/migrations/0008_processos_cliente_usuario.sql
    - apps/api/src/routes/processos/movimentacoes.ts
  modified:
    - apps/api/src/routes/processos.ts
    - apps/api/src/server.ts
decisions:
  - "Split generic processos_tenant_isolation RLS policy into role-specific policies to enforce per-client isolation"
  - "cliente_usuario_id nullable for backwards compatibility — admins must explicitly assign processes to clients"
  - "movimentacoes route verifies processo access first (404 vs 403 — prevents information leakage)"
metrics:
  duration: "5m"
  completed: "2026-04-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 05 Plan 01: Backend API Gaps for Cliente Screens Summary

**One-liner:** Supabase migration + three Fastify endpoints closing all blocking backend gaps for the Android cliente MVP screens.

## What Was Built

Three backend gaps identified in Phase 5 research that blocked all Android client screens:

1. **Migration 0008** (`supabase/migrations/0008_processos_cliente_usuario.sql`): Adds `processos.cliente_usuario_id` UUID column with FK to `usuarios`, creates index, adds `escritorios.telefone_whatsapp`, and rewrites the processos RLS policies so `cliente` role users only see their own processes.

2. **GET /api/v1/processos** list endpoint in `apps/api/src/routes/processos.ts`: Returns all processes for the authenticated user (RLS-enforced). Includes `desatualizado` staleness flag and `status` from the most recent movimentacao. Response: `{ success: true, data: [...] }`.

3. **GET /api/v1/processos/:id/movimentacoes** in `apps/api/src/routes/processos/movimentacoes.ts`: Returns movimentacoes ordered by `data_hora DESC` with all four AI-translated fields: `status`, `explicacao`, `proxima_data`, `impacto`. Validates processo access via RLS (returns 404 if blocked — T-05-01-03).

4. **GET /api/v1/processos/:id enriched** with `telefone_whatsapp` via `JOIN escritorios` in the SELECT query. Nullable — returns `null` if not configured.

5. **Route registration** in `apps/api/src/server.ts`: `movimentacoesRoutes` registered with prefix `/api/v1/processos` so `GET /api/v1/processos/:id/movimentacoes` is reachable.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `74e72c3` | Migration 0008: cliente_usuario_id + RLS split + telefone_whatsapp + POST update |
| Task 2 | `35b4b8c` | GET /processos list + GET movimentacoes + enrich processos/:id + register route |

## Decisions Made

1. **RLS policy split (not RESTRICTIVE):** Postgres PERMISSIVE policies use OR logic — a generic `FOR ALL` policy would let any authenticated tenant user see all processos regardless of role. Solution: drop the generic `processos_tenant_isolation` policy and create two role-specific PERMISSIVE policies: `processos_staff_tenant_isolation` (admin/advogado, full tenant) and `clientes_select_own_processos` (cliente, own processos only). Each policy's USING clause filters by role, so only the matching policy applies per user.

2. **Nullable cliente_usuario_id:** Backwards compatible — existing processos (created before Phase 5) have NULL. A cliente will never see these legacy rows, which is correct behavior: admins must explicitly assign processes to clients.

3. **404 over 403 in movimentacoes route:** The route returns 404 (not 403) when RLS blocks access. This prevents information leakage — a client cannot tell whether a processo exists but is forbidden vs. genuinely not found.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] RLS split required for effective cliente isolation**
- **Found during:** Task 1 analysis of the existing `processos_tenant_isolation` policy
- **Issue:** The existing policy was `FOR ALL TO authenticated` with only `tenant_id` check. Since Postgres PERMISSIVE policies use OR logic, simply adding a new restrictive policy for `cliente` would be overridden by the existing policy matching all roles. The plan's SQL snippet in the `<action>` block only dropped/recreated `clientes_select_own_processos` but left the generic policy — this would NOT enforce per-client isolation.
- **Fix:** Dropped `processos_tenant_isolation` and created two role-specific policies: `processos_staff_tenant_isolation` for admin/advogado and `clientes_select_own_processos` for cliente. This makes the RLS split effective.
- **Files modified:** `supabase/migrations/0008_processos_cliente_usuario.sql`
- **Commit:** `74e72c3`

## Known Stubs

None — all endpoints return real data from Supabase. No hardcoded values or placeholders in the response paths.

## Threat Flags

No new threat surface beyond what was planned in the plan's `<threat_model>`. The RLS split deviation (Rule 2 fix above) actually improves the T-05-01-01 mitigation beyond what was planned.

## Self-Check: PASSED

Files created/exist:
- `supabase/migrations/0008_processos_cliente_usuario.sql` — FOUND
- `apps/api/src/routes/processos/movimentacoes.ts` — FOUND
- `apps/api/src/routes/processos.ts` (modified) — FOUND
- `apps/api/src/server.ts` (modified) — FOUND

Commits exist:
- `74e72c3` — FOUND (feat(05-01): migration 0008)
- `35b4b8c` — FOUND (feat(05-01): routes)
