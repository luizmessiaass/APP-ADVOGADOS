---
phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics
plan: 03
title: Custom Access Token Hook (Edge Function) + Supabase Edge Function Deploy
subsystem: auth
tags: [supabase, edge-function, jwt, multi-tenant, custom-access-token, deno, auth-hook]
dependency_graph:
  requires:
    - supabase/migrations/0002_create_usuarios.sql (public.usuarios table)
    - supabase/config.toml (Supabase CLI project config)
  provides:
    - supabase/functions/custom-access-token/index.ts (JWT injection hook)
    - supabase/functions/custom-access-token/deno.json (Deno import map)
  affects:
    - All downstream JWT consumers (01-04 Fastify middleware, 01-08 cross-tenant tests)
    - All RLS policies that use (auth.jwt()->'app_metadata'->>'tenant_id')
tech_stack:
  added:
    - Deno (Supabase Edge Functions runtime)
    - supabase-js v2 (via esm.sh CDN import for Deno)
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
  duration: "5 minutes"
  completed: "2026-04-15"
  tasks_completed: 1
  tasks_total: 2
  files_created: 2
  files_modified: 0
requirements:
  - AUTH-03
  - AUTH-08
---

# Phase 01 Plan 03: Custom Access Token Hook (Edge Function) Summary

**One-liner:** Deno Edge Function que injeta `tenant_id` e `role` em `app_metadata` de cada JWT via Supabase Custom Access Token Hook, buscando dados de `public.usuarios` com service_role (nunca de user_metadata editavel pelo usuario).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar Edge Function custom-access-token | 39be6ba | supabase/functions/custom-access-token/index.ts, deno.json |

## Tasks Pending (Awaiting Human Action)

| Task | Name | Type | Blocked By |
|------|------|------|-----------|
| 2 | Checkpoint: registrar hook no Dashboard + configurar SMTP Resend | checkpoint:human-verify | Acao manual no Supabase Dashboard |

## What Was Built

### Edge Function `custom-access-token`

**`supabase/functions/custom-access-token/index.ts`**

Deno Edge Function registrada como Custom Access Token Hook no Supabase Auth:

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

### Deploy Necessario

A Edge Function foi criada localmente. Para ativar, e necessario:
```bash
supabase functions deploy custom-access-token --project-ref <PROJECT_REF>
```

E registrar como hook no Dashboard (ver secao Pending Human Actions abaixo).

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Category | Mitigation | Status |
|-----------|----------|------------|--------|
| T-1-03-S (Spoofing via user_metadata) | Spoofing | Hook le de `public.usuarios` (server-side), nao de `user_metadata`; comentario explicito na linha 33 | Mitigated |
| T-1-03-E (Elevation via tenant_id injection) | Elevation of Privilege | `tenant_id` vem do banco com service_role; usuario nao pode influenciar | Mitigated |
| T-1-03-T (Tampering via hook payload) | Tampering | Supabase assina o payload do hook; HOOK_SECRET pode ser adicionado em config.toml quando disponivel | Partial (aceito em dev) |
| T-1-03-I (Info Disclosure via logs) | Info Disclosure | Logs ficam no Supabase Dashboard; aceito em dev | Accepted |

## Pending Human Actions

Para que o hook funcione em producao, as seguintes acoes manuais sao necessarias:

### 1. Deploy da Edge Function
```bash
supabase functions deploy custom-access-token --project-ref <PROJECT_REF>
```
(`PROJECT_REF` visivel em Supabase Dashboard > Settings > API)

### 2. Registrar como Custom Access Token Hook
- Supabase Dashboard > Authentication > Hooks
- Localizar "Custom Access Token Hook"
- Clicar "Enable" > selecionar funcao `custom-access-token`
- Salvar

### 3. Configurar SMTP Resend (AUTH-08)
- Supabase Dashboard > Authentication > SMTP Settings
- Habilitar "Custom SMTP"
- Credenciais Resend:
  - Host: `smtp.resend.com`
  - Port: `587`
  - Username: `resend`
  - Password: `<RESEND_API_KEY>` (obter em resend.com/api-keys)
  - Sender name: `Portal Juridico`
  - Sender email: `noreply@<seudominio>.com`

### 4. Verificacao pos-deploy
- Fazer signup de teste via Dashboard > Authentication > Users > Invite
- Decodificar o JWT gerado em jwt.io
- Confirmar que `app_metadata.tenant_id` esta presente

## Known Stubs

None — o codigo e producao-ready. Requer deploy e configuracao manual no Dashboard para estar ativo.

## Self-Check: PASSED

Files verified:
- supabase/functions/custom-access-token/index.ts: EXISTS
- supabase/functions/custom-access-token/deno.json: EXISTS

Commits verified:
- 39be6ba: feat(01-03): add custom-access-token Edge Function

Security checks:
- app_metadata injetado (nao user_metadata): PASS
- Busca de public.usuarios com service_role: PASS
- Graceful null on user not found: PASS
- console.error para logs de erro: PASS
