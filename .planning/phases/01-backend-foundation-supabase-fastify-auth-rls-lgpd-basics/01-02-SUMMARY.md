---
phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics
plan: 02
title: Supabase CLI Setup + SQL Migrations + RLS Policies
subsystem: database
tags: [supabase, rls, multi-tenant, lgpd, sql, migrations]
dependency_graph:
  requires: []
  provides:
    - supabase/config.toml (Supabase CLI local project config)
    - supabase/migrations/0001_create_escritorios.sql (tenant root table)
    - supabase/migrations/0002_create_usuarios.sql (users mirror with tenant isolation)
    - supabase/migrations/0003_create_lgpd_consentimentos.sql (LGPD consent history)
    - supabase/migrations/0004_rls_policies.sql (multi-tenant RLS with role-based policies)
    - supabase/migrations/0005_triggers.sql (updated_at automation + auth.users sync)
  affects:
    - All downstream plans that query Supabase (01-03, 01-04, 01-05)
tech_stack:
  added:
    - Supabase CLI config.toml (project_id=portaljuridico, port 54321/54322/54323)
    - PostgreSQL RLS (Row Level Security on 3 tables)
  patterns:
    - JWT hoist pattern for RLS: (SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::uuid)
    - SECURITY DEFINER trigger for cross-schema inserts
    - Idempotent trigger via ON CONFLICT (id) DO NOTHING
key_files:
  created:
    - supabase/config.toml
    - supabase/migrations/0001_create_escritorios.sql
    - supabase/migrations/0002_create_usuarios.sql
    - supabase/migrations/0003_create_lgpd_consentimentos.sql
    - supabase/migrations/0004_rls_policies.sql
    - supabase/migrations/0005_triggers.sql
    - .gitignore
  modified: []
decisions:
  - key: rls_hoist_pattern
    summary: "RLS policies use (SELECT ...) subquery hoist to prevent per-row re-evaluation — critical for performance with large tables"
  - key: security_definer_trigger
    summary: "sync_auth_user_to_public() uses SECURITY DEFINER so the trigger (running as auth role) can insert into public.usuarios"
  - key: separate_dml_policies
    summary: "usuarios table uses separate SELECT/INSERT/UPDATE/DELETE policies instead of single FOR ALL — enables granular role control (cliente can read own, admin can manage all)"
metrics:
  duration: "2 minutes"
  completed: "2026-04-14"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 0
---

# Phase 01 Plan 02: Supabase CLI Setup + SQL Migrations + RLS Policies Summary

**One-liner:** 5 SQL migrations with multi-tenant RLS (JWT hoist pattern), role-based policies for 3 roles, LGPD consent tracking, and auth.users sync trigger — schema ready for `supabase db push`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Inicializar Supabase CLI e criar migrations de schema | fd985e7 | supabase/config.toml, .gitignore, 0001-0003 migrations |
| 2 | Criar RLS policies e triggers de sistema | 0089c16 | 0004_rls_policies.sql, 0005_triggers.sql |

## What Was Built

### Schema (Migrations 0001-0003)

**`escritorios`** — Tenant root table:
- UUID PK via `gen_random_uuid()` (D-15)
- `status` CHECK constraint: `pending | trial | active | suspended` (D-07, D-08)
- `created_at` + `updated_at` timestamps (D-18)
- No `deleted_at` — hard delete policy (D-16)

**`usuarios`** — Mirror of auth.users:
- FK to `auth.users(id) ON DELETE CASCADE` (D-17)
- FK to `escritorios(id) ON DELETE CASCADE` for tenant isolation (D-16)
- `role_local` CHECK: `admin_escritorio | advogado | cliente` (D-08, D-11)
- `cpf` stored with COMMENT warning: "dado sensivel LGPD, nunca incluir em logs"
- `idx_usuarios_tenant` index for RLS performance (mandatory convention)

**`lgpd_consentimentos`** — LGPD consent history (D-23):
- `versao_termos` as ISO date string (D-24)
- `ip_origem inet` for IP validation
- `revogado_em` nullable — NULL = active consent
- `idx_lgpd_usuario` index for history lookup
- No `updated_at` — record is immutable (ANPD audit requirement)

### Security (Migration 0004)

RLS enabled on all 3 tables. Policies by table:

**`escritorios`:** Single `FOR ALL` policy — tenant can only access its own row.

**`usuarios`:** 4 separate policies:
- `SELECT`: admin_escritorio + advogado see all in tenant; cliente sees only self
- `INSERT`: only admin_escritorio can create users in their tenant
- `UPDATE`: admin can update any user; self-update allowed (but WITH CHECK prevents tenant change)
- `DELETE`: only admin_escritorio

**`lgpd_consentimentos`:** 3 policies:
- `SELECT`: own record OR admin_escritorio with EXISTS subquery for tenant check
- `INSERT`: user inserts own consent only
- `UPDATE`: user updates own consent only (for revocation)

All policies use the mandatory hoist pattern:
```sql
(SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
```
No `USING (true)` anywhere — verified.

### Automation (Migration 0005)

**`update_updated_at_column()`:** BEFORE UPDATE trigger on `escritorios` and `usuarios`. Sets `NEW.updated_at = now()`.

**`sync_auth_user_to_public()`:** AFTER INSERT trigger on `auth.users`. SECURITY DEFINER to allow cross-schema insert. Reads `raw_user_meta_data` for `tenant_id`, `nome`, `role_local`, `cpf`. Idempotent via `ON CONFLICT (id) DO NOTHING`.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

All T-1-02 threats from the plan's threat register are mitigated:

| Threat | Status | Evidence |
|--------|--------|---------|
| T-1-02-S (Spoofing via user_metadata) | Mitigated | All policies reference only `app_metadata`, never `user_metadata` |
| T-1-02-E (Privilege elevation via role_local) | Mitigated | `usuarios_update` WITH CHECK prevents tenant_id change; role_local change requires admin (INSERT-only policy) |
| T-1-02-I (Cross-tenant info disclosure) | Mitigated | `tenant_id = (SELECT ...)::uuid` in all USING clauses; verified no USING (true) |
| T-1-02-T (Trigger tampering) | Mitigated | `sync_auth_user_to_public` only INSERTs into public.usuarios; no auth.users modification |
| T-1-02-D (DoS via full table scan) | Mitigated | `idx_usuarios_tenant` on usuarios; `idx_lgpd_usuario` on lgpd_consentimentos |

## Known Stubs

None — all SQL is production-ready. Schema requires `supabase db push` to apply to a live Supabase project.

## Self-Check: PASSED

Files verified:
- supabase/config.toml: EXISTS
- supabase/migrations/0001_create_escritorios.sql: EXISTS
- supabase/migrations/0002_create_usuarios.sql: EXISTS
- supabase/migrations/0003_create_lgpd_consentimentos.sql: EXISTS
- supabase/migrations/0004_rls_policies.sql: EXISTS
- supabase/migrations/0005_triggers.sql: EXISTS

Commits verified:
- fd985e7: feat(01-02): initialize Supabase CLI config and schema migrations 0001-0003
- 0089c16: feat(01-02): add RLS policies and system triggers migrations 0004-0005

Verification checks:
- 3 ENABLE ROW LEVEL SECURITY statements in 0004: PASS
- No USING (true) in any migration: PASS
- idx_usuarios_tenant in 0002: PASS
- idx_lgpd_usuario in 0003: PASS
- SECURITY DEFINER on sync_auth_user_to_public: PASS
- app_metadata references in policies (not user_metadata): PASS
