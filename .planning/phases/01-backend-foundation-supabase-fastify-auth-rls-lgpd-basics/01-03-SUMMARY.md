---
phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics
plan: 03
title: Custom Access Token Hook (Edge Function) + Supabase Edge Function Deploy
subsystem: auth
tags: [supabase, edge-function, jwt, multi-tenant, custom-access-token, deno, auth-hook, smtp, resend]
dependency_graph:
  requires:
    - supabase/migrations/0002_create_usuarios.sql (public.usuarios table)
    - supabase/config.toml (Supabase CLI project config)
  provides:
    - supabase/functions/custom-access-token/index.ts (JWT injection hook — ativo)
    - supabase/functions/custom-access-token/deno.json (Deno import map)
  affects:
    - All downstream JWT consumers (01-04 Fastify middleware, 01-08 cross-tenant tests)
    - All RLS policies that use (auth.jwt()->'app_metadata'->>'tenant_id')
tech_stack:
  added:
    - Deno (Supabase Edge Functions runtime)
    - supabase-js v2 (via esm.sh CDN import for Deno)
    - Resend SMTP (email de convite para clientes)
  patterns:
    - Custom Access Token Hook pattern (Supabase Auth Hooks)
    - app_metadata injection (never user_metadata) for tenant isolation
    - Graceful degradation on user not found (returns null claims, middleware rejects with 403)
key_files:
  created:
    - supabase/functions/custom-access-token/index.ts
    - supabase/functions/custom-access-token/deno.json
  modified: []
decisions:
  - key: app_metadata_only
    summary: "tenant_id e role injetados APENAS em app_metadata (nunca user_metadata) — usuario nao pode alterar app_metadata, apenas o hook do servidor pode (D-10)"
  - key: graceful_null_on_missing_user
    summary: "Usuario nao encontrado em public.usuarios retorna tenant_id: null em vez de erro 500 — middleware Fastify rejeita graciosamente com 403 em vez de falha de auth catastrofica"
  - key: service_role_for_hook_query
    summary: "Hook usa SUPABASE_SERVICE_ROLE_KEY (disponivel automaticamente no Edge Function runtime) para contornar RLS ao buscar em public.usuarios — operacao de sistema, bypass correto"
metrics:
  duration: "verified and completed post-checkpoint"
  completed: "2026-04-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
requirements:
  - AUTH-03
  - AUTH-08
---

# Phase 01 Plan 03: Custom Access Token Hook (Edge Function) Summary

**One-liner:** Deno Edge Function deployada e ativa como Custom Access Token Hook no Supabase — injeta `tenant_id` e `role` em `app_metadata` de cada JWT via `public.usuarios` (service_role); SMTP Resend configurado para convites por email.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar Edge Function custom-access-token | 39be6ba | supabase/functions/custom-access-token/index.ts, deno.json |
| 2 | Checkpoint: registrar hook no Dashboard + configurar SMTP Resend | human-verified | Supabase Dashboard — hook ativo, SMTP Resend configurado |

## What Was Built

### Edge Function `custom-access-token`

**`supabase/functions/custom-access-token/index.ts`**

Deno Edge Function registrada e ativa como Custom Access Token Hook no Supabase Auth:

1. Recebe payload do hook: `{ user_id, claims }` (chamada automatica pelo Supabase a cada geracao de JWT)
2. Abre cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS — operacao de sistema)
3. Busca `tenant_id` e `role_local` de `public.usuarios` WHERE `id = user_id`
4. Injeta em `app_metadata` do JWT: `{ tenant_id, role }`
5. Trata graciosamente usuario nao encontrado: retorna `tenant_id: null` em vez de 500 — middleware Fastify rejeita com 403

**JWT resultante (contrato para Plan 04):**
```typescript
{
  sub: string,           // user_id
  email: string,
  app_metadata: {
    tenant_id: string,   // uuid do escritorio (ou null se usuario incompleto)
    role: 'admin_escritorio' | 'advogado' | 'cliente'  // (ou null)
  }
}
```

**`supabase/functions/custom-access-token/deno.json`**

Import map para resolucao de dependencias no runtime Deno:
- `@supabase/supabase-js` → `https://esm.sh/@supabase/supabase-js@2`

### Configuracoes Ativas no Supabase Dashboard

| Configuracao | Status |
|---|---|
| Edge Function `custom-access-token` deployada | Ativo |
| Custom Access Token Hook registrado | Ativo |
| SMTP Resend configurado (smtp.resend.com:587) | Ativo |
| Migrations aplicadas via `supabase db push` | Ativo |

## Deviations from Plan

None — plan executed exactly as written. Checkpoint human-verify concluido com hook registrado e SMTP configurado conforme instrucoes.

## Threat Model Coverage

| Threat ID | Category | Mitigation | Status |
|-----------|----------|------------|--------|
| T-1-03-S (Spoofing via user_metadata) | Spoofing | Hook le de `public.usuarios` (server-side), nao de `user_metadata`; comentario explicito na linha 33 | Mitigated |
| T-1-03-E (Elevation via tenant_id injection) | Elevation of Privilege | `tenant_id` vem do banco com service_role; usuario nao pode influenciar | Mitigated |
| T-1-03-T (Tampering via hook payload) | Tampering | Supabase assina o payload do hook; HOOK_SECRET pode ser adicionado em config.toml quando disponivel | Partial (aceito em dev) |
| T-1-03-I (Info Disclosure via logs) | Info Disclosure | Logs ficam no Supabase Dashboard; aceito em dev | Accepted |

## Known Stubs

None — Edge Function e producao-ready, deployada e com hook ativo no Dashboard.

## Self-Check: PASSED

Files verified:
- supabase/functions/custom-access-token/index.ts: EXISTS
- supabase/functions/custom-access-token/deno.json: EXISTS

Commits verified:
- 39be6ba: feat(01-03): add custom-access-token Edge Function
- 32428c1: docs(01-03): complete custom-access-token Edge Function plan summary

Human actions verified (per user confirmation):
- Hook registrado no Dashboard: CONFIRMED
- SMTP Resend configurado: CONFIRMED
- Migrations aplicadas via supabase db push: CONFIRMED

Security checks:
- app_metadata injetado (nao user_metadata): PASS
- Busca de public.usuarios com service_role: PASS
- Graceful null on user not found: PASS
- console.error para logs de erro: PASS
