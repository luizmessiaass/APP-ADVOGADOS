---
phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics
plan: 05
title: Auth Routes + LGPD Consent Endpoint
subsystem: api
tags: [auth, lgpd, fastify, supabase, typescript, tdd, multi-tenant, privacy]
dependency_graph:
  requires:
    - apps/api/src/config.ts (env vars — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRIVACY_POLICY_URL)
    - apps/api/src/lib/supabase.ts (supabaseAdmin + supabaseAsUser — plan 01-04)
    - apps/api/src/plugins/auth.ts (authPlugin + TenantUser interface — plan 01-04)
    - supabase/functions/custom-access-token/index.ts (injeta tenant_id no JWT — plan 01-03)
  provides:
    - apps/api/src/routes/auth/index.ts (authRoutes: signup/escritorio, login, logout, invite)
    - apps/api/src/routes/lgpd/index.ts (lgpdRoutes: POST + GET /consentimento)
    - apps/api/src/server.ts (buildApp com authRoutes e lgpdRoutes registradas)
  affects:
    - Plans 06, 07, 08 (consumem authRoutes para testes de autenticacao)
    - Plan 08 (cross-tenant tests usa authRoutes para criar tenants e usuarios de teste)
tech_stack:
  added: []
  patterns:
    - TypeBox schema validation em todos os endpoints com body (D-21, T-1-05-T)
    - supabaseAsUser(jwt) em handlers autenticados — RLS enforced por construcao
    - supabaseAdmin apenas em operacoes administrativas validas (createUser, inviteUserByEmail)
    - Formato de erro uniforme {success: false, error: string, code: string} em todos os endpoints
    - privacy_policy_url em respostas de signup e consentimento (LGPD-06)
    - Rollback manual no signup: deleteUser se criacao do escritorio falhar
key_files:
  created:
    - apps/api/src/routes/auth/index.ts
    - apps/api/src/routes/auth/auth.test.ts
    - apps/api/src/routes/lgpd/index.ts
    - apps/api/src/routes/lgpd/lgpd.test.ts
    - apps/api/src/server.ts (atualizado com rotas registradas)
    - apps/api/src/lib/supabase.ts (copiado de plan 01-04 — dependencia)
    - apps/api/src/lib/redis.ts (copiado de plan 01-04 — dependencia)
    - apps/api/src/plugins/auth.ts (copiado de plan 01-04 — dependencia)
    - apps/api/src/plugins/auth.test.ts (copiado de plan 01-04 — dependencia)
    - apps/api/src/plugins/sentry.ts (copiado de plan 01-04 — dependencia)
  modified:
    - apps/api/src/config.ts (adicionado PRIVACY_POLICY_URL)
decisions:
  - key: rollback_no_signup
    summary: "Se escritorio falhar apos createUser, faz deleteUser para evitar usuario orfao sem tenant. Alternativa seria transacao — nao disponivel via Admin SDK sem Edge Function dedicada."
  - key: supabase_admin_no_login
    summary: "signInWithPassword via supabaseAdmin (nao supabaseAsUser) pois login e operacao pre-auth — o cliente nao tem JWT ainda. Correto e justificado."
  - key: invite_metadata_tenant_id
    summary: "inviteUserByEmail passa tenant_id + role_local nos metadados (data) para o trigger sync_auth_user_to_public() criar o registro em public.usuarios com tenant correto (Pitfall 6 RESEARCH.md)."
  - key: uniform_error_on_login
    summary: "Resposta de credenciais invalidas usa mensagem uniforme 'Email ou senha incorretos' — nao distingue usuario inexistente de senha errada. Previne user enumeration (T-1-05-I)."
metrics:
  duration: "~30 min"
  completed: "2026-04-15"
  tasks_completed: 1
  tasks_total: 1
  files_created: 10
  files_modified: 1
requirements:
  - AUTH-01
  - AUTH-02
  - AUTH-09
  - LGPD-01
  - LGPD-06
---

# Phase 01 Plan 05: Auth Routes + LGPD Consent Endpoint Summary

**One-liner:** 4 endpoints auth (signup/escritorio, login, logout, invite com tenant_id nos metadados) + 2 endpoints LGPD (POST/GET /consentimento com RLS e auditoria ip_origem/user_agent), TypeBox validation, formato de erro D-21 padronizado e privacy_policy_url LGPD-06 em todas as respostas relevantes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar auth routes e lgpd routes com TypeBox validation (TDD) | 53ac2d0 | apps/api/src/routes/auth/index.ts, auth.test.ts, routes/lgpd/index.ts, lgpd.test.ts, server.ts, config.ts |

## What Was Built

### `apps/api/src/routes/auth/index.ts`

4 endpoints de autenticacao:

- **POST /signup/escritorio** (`skipAuth: true`): cria usuario no Supabase Auth (`email_confirm: true`) + insere escritorio com `status: 'pending'` (D-07). Rollback: `deleteUser` se criacao do escritorio falhar. Retorna `escritorio_id` e `privacy_policy_url` (LGPD-06).
- **POST /login** (`skipAuth: true`): `signInWithPassword` via `supabaseAdmin`. Resposta uniforme para credenciais invalidas — nao distingue usuario inexistente de senha errada (T-1-05-I, previne user enumeration).
- **POST /logout** (autenticado): `supabaseAsUser(jwt).auth.signOut()` revoga o refresh token no Supabase.
- **POST /invite** (autenticado, apenas `admin_escritorio`): verifica `req.user.role === 'admin_escritorio'` antes de `inviteUserByEmail`. Passa `tenant_id`, `role_local`, `nome`, `cpf` nos metadados para o trigger `sync_auth_user_to_public()` (Pitfall 6 prevenido).

### `apps/api/src/routes/lgpd/index.ts`

2 endpoints LGPD:

- **POST /consentimento**: `supabaseAsUser(jwt).from('lgpd_consentimentos').insert()` com RLS enforced. Registra `versao_termos` (validado por regex `^\d{4}-\d{2}-\d{2}$`), `ip_origem`, `user_agent` para auditoria ANPD (D-23). Retorna `consentimento_id` e `privacy_policy_url`.
- **GET /consentimento**: retorna historico de consentimentos do usuario autenticado com RLS enforced.

### `apps/api/src/config.ts` (atualizado)

Adicionado `PRIVACY_POLICY_URL: str({ default: 'https://notion.so/portaljuridico-privacidade' })` — URL da politica de privacidade referenciada em respostas de auth e LGPD (D-25, LGPD-06).

### `apps/api/src/server.ts`

`buildApp()` atualizado para registrar `authRoutes` e `lgpdRoutes` com os prefixos `/api/v1/auth` e `/api/v1/lgpd`.

## Verification Results

```
vitest run apps/api/src --config backend/vitest.config.ts --reporter=verbose

 ✓ LGPD PII Redaction (LGPD-04) > STUB: CPF nao aparece em logs de request
 ✓ Cross-Tenant Security Gate (AUTH-06) > STUB: tenant A nao consegue ler dados do tenant B
 ✓ Auth Plugin (AUTH-04) > rejeita request sem Authorization header com 401 MISSING_TOKEN
 ✓ Auth Plugin (AUTH-04) > rejeita token malformado com 401 INVALID_TOKEN
 ✓ Auth Plugin (AUTH-04) > rejeita JWT sem app_metadata.tenant_id com 403 NO_TENANT_CONTEXT
 ✓ Auth Plugin (AUTH-04) > decora req.user com sub, tenant_id, role corretos
 ✓ Auth Plugin (AUTH-04) > rota com skipAuth: true nao executa o preHandler de auth
 ✓ LGPD Routes (LGPD-01, LGPD-06) > POST /consentimento retorna 201 com consentimento_id
 ✓ LGPD Routes (LGPD-01, LGPD-06) > GET /consentimento retorna historico do usuario autenticado
 ✓ Auth Routes (AUTH-01, AUTH-02) > POST /signup/escritorio com dados validos retorna 201 com escritorio_id e privacy_policy_url
 ✓ Auth Routes (AUTH-01, AUTH-02) > POST /signup/escritorio com email duplicado retorna 400 USER_ALREADY_EXISTS
 ✓ Auth Routes (AUTH-01, AUTH-02) > POST /login com credenciais invalidas retorna 400 INVALID_CREDENTIALS
 ✓ Auth Routes (AUTH-01, AUTH-02) > POST /login com credenciais validas retorna 200 com access_token
 ✓ Auth Routes (AUTH-01, AUTH-02) > POST /invite sem ser admin_escritorio retorna 403 FORBIDDEN_ROLE
 ✓ Auth Routes (AUTH-01, AUTH-02) > POST /invite por admin_escritorio inclui tenant_id nos metadados do convite

 Test Files  5 passed (5)
      Tests  15 passed (15)
```

## Deviations from Plan

### Arquivos do Plan 01-04 copiados para este worktree

**[Rule 3 - Blocker] Arquivos de dependencia do plan 01-04 nao existiam neste worktree**
- **Found during:** Inicio da Task 1
- **Issue:** Este worktree (agent-af0c3eea) foi criado a partir do commit base `1848f7d` (antes do plan 01-04 ser executado). O plan 01-04 foi executado em paralelo no worktree `agent-a9593016`. Os arquivos `lib/supabase.ts`, `lib/redis.ts`, `plugins/auth.ts`, `plugins/auth.test.ts`, `plugins/sentry.ts` e `server.ts` nao existiam neste worktree.
- **Fix:** Copiados os arquivos do worktree `agent-a9593016` (onde o plan 01-04 foi executado) para garantir que as dependencias estivessem disponiveis. O server.ts foi reescrito para incluir as rotas do plan 01-05.
- **Files modified:** apps/api/src/lib/supabase.ts, lib/redis.ts, plugins/auth.ts, plugins/auth.test.ts, plugins/sentry.ts
- **Commit:** 53ac2d0

Alem disso, o plan nao previa instalacao de dependencias. Executado `pnpm install --filter api` no worktree para ter o vitest disponivel.

## Threat Model Coverage

| Threat ID | Category | Mitigation | Status |
|-----------|----------|------------|--------|
| T-1-05-S (Rate Limiting Login) | Spoofing | @fastify/rate-limit herdado de buildApp (1000 req/min por tenant_id); rate limit interno do Supabase Auth tambem aplica | Mitigated |
| T-1-05-E (Elevation via Invite) | Elevation of Privilege | Verificacao explicita `req.user.role !== 'admin_escritorio'` retorna 403 FORBIDDEN_ROLE antes de qualquer operacao | Mitigated |
| T-1-05-I (User Enumeration) | Info Disclosure | Login retorna mesma mensagem para usuario inexistente e senha errada | Mitigated |
| T-1-05-T (Schema Validation) | Tampering | TypeBox schemas em todos os endpoints com body; Fastify rejeita com 400 automaticamente | Mitigated |
| T-1-05-I (CPF em logs) | Info Disclosure | CPF opcional no invite; pino redact inclui `*.cpf` (configurado no buildApp do plan 01-04) | Mitigated |

## Known Stubs

None — todos os endpoints sao funcionais com logica de negocio real.

## Self-Check: PASSED

Files verified:
- apps/api/src/routes/auth/index.ts: EXISTS
- apps/api/src/routes/auth/auth.test.ts: EXISTS
- apps/api/src/routes/lgpd/index.ts: EXISTS
- apps/api/src/routes/lgpd/lgpd.test.ts: EXISTS
- apps/api/src/server.ts: EXISTS
- apps/api/src/config.ts: MODIFIED (PRIVACY_POLICY_URL adicionado)

Commits verified:
- 53ac2d0: feat(01-05): add auth routes (signup, login, logout, invite) + lgpd consent endpoint

Security checks:
- FORBIDDEN_ROLE em /invite: PASS (grep confirmado)
- tenant_id nos metadados do invite: PASS (grep confirmado)
- privacy_policy_url em respostas: PASS (grep confirmado)
- supabaseAsUser em handlers autenticados: PASS
- Formato de erro padrao {success, error, code}: PASS
- User enumeration prevenido no login: PASS
