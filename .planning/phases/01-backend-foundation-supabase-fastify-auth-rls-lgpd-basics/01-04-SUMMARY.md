---
phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics
plan: 04
title: Fastify Server Core — Logger com PII Redaction, Sentry, Middleware de Tenant
subsystem: api
tags: [fastify, pino, sentry, jwt, jwks, supabase, redis, multi-tenant, pii-redaction, lgpd, auth-middleware]
dependency_graph:
  requires:
    - apps/api/src/config.ts (env vars — SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, REDIS_URL, SENTRY_DSN, BETTERSTACK_SOURCE_TOKEN)
    - supabase/functions/custom-access-token/index.ts (injeta tenant_id + role em app_metadata do JWT)
  provides:
    - apps/api/src/server.ts (buildApp factory com logger, plugins, rate limit)
    - apps/api/src/lib/supabase.ts (supabaseAdmin + supabaseAsUser)
    - apps/api/src/lib/redis.ts (createRedisClient + createBullMQRedisClient)
    - apps/api/src/plugins/auth.ts (authPlugin — verifica JWT via JWKS, injeta req.user + req.tenantLogger)
    - apps/api/src/plugins/sentry.ts (sentryPlugin — erro tracking com contexto de tenant)
  affects:
    - Todos os endpoints downstream (Plans 05, 06, 08) consomem req.user e req.tenantLogger
    - Plan 08 (cross-tenant tests) depende do authPlugin para isolamento por construcao
tech_stack:
  added:
    - "@logtail/pino" — Betterstack transport para logs em producao
    - "@fastify/helmet" — Security headers (CSP, X-Frame-Options, HSTS)
    - "@fastify/rate-limit" — Rate limiting por tenant_id (1000 req/min)
  patterns:
    - JWKS singleton pattern (createRemoteJWKSet uma vez, cache interno)
    - Dois clientes Supabase: supabaseAdmin (service_role bypass RLS) + supabaseAsUser(jwt) (RLS enforced)
    - pino redact por construcao — PII nunca aparece em logs, independente de disciplina do dev
    - Child logger com tenant_id + user_id + request_id propagado automaticamente
    - Sentry com sendDefaultPii=false + scope.setUser apenas com UUID (sem email/CPF)
key_files:
  created:
    - apps/api/src/server.ts
    - apps/api/src/lib/supabase.ts
    - apps/api/src/lib/redis.ts
    - apps/api/src/plugins/auth.ts
    - apps/api/src/plugins/auth.test.ts
    - apps/api/src/plugins/sentry.ts
  modified:
    - apps/api/package.json (adicionado @logtail/pino)
    - pnpm-lock.yaml (lockfile atualizado)
decisions:
  - key: jwks_singleton
    summary: "JWKS criado uma vez no module scope (nao por request) — createRemoteJWKSet tem cache interno e recriar por request seria anti-pattern de performance"
  - key: two_supabase_clients
    summary: "supabaseAdmin usa service_role (bypass RLS) apenas para operacoes de sistema; supabaseAsUser(jwt) cria nova instancia por request com JWT do usuario para RLS enforced — isolamento de tenant por construcao"
  - key: pino_redact_construction
    summary: "Redact de PII (cpf, senha, prompt_text, authorization) configurado no buildApp via pino redact option — zero-overhead, automatico, nao depende de disciplina do desenvolvedor (D-26)"
  - key: rate_limit_by_tenant
    summary: "Rate limiting usa tenant_id como key generator quando disponivel, fallback para req.ip — isolamento de quota por tenant desde Phase 1"
  - key: sentry_no_pii
    summary: "Sentry com sendDefaultPii=false; scope.setUser usa apenas user.sub (UUID), nao email ou CPF — compliance LGPD para dados enviados a terceiros"
metrics:
  duration: "~45 min"
  completed: "2026-04-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 2
requirements:
  - INFRA-06
  - INFRA-07
  - AUTH-04
  - LGPD-03
  - LGPD-04
---

# Phase 01 Plan 04: Fastify Server Core Summary

**One-liner:** Fastify `buildApp()` factory com pino logger (PII redaction por construcao via `redact`), Sentry (`sendDefaultPii=false`, tag `source=api`), authPlugin (JWT via JWKS, `req.user` + `req.tenantLogger`), dois clientes Supabase (admin/user-scoped) e Redis com `maxRetriesPerRequest` correto para BullMQ.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar lib/supabase.ts, lib/redis.ts e plugins/auth.ts (TDD) | 9c41b5c | apps/api/src/lib/supabase.ts, lib/redis.ts, plugins/auth.ts, plugins/auth.test.ts |
| 2 | Criar server.ts (buildApp) + plugins/sentry.ts com PII redaction | 9aabed2 | apps/api/src/server.ts, plugins/sentry.ts, apps/api/package.json, pnpm-lock.yaml |

## What Was Built

### `apps/api/src/lib/supabase.ts`

Dois clientes Supabase com propositos distintos:

- `supabaseAdmin`: usa `SUPABASE_SERVICE_ROLE_KEY` — bypassa RLS. NUNCA usar em request handlers. Uso legitimo: background jobs, webhooks verificados.
- `supabaseAsUser(jwt)`: cria NOVO cliente por request com JWT do usuario como Bearer token — RLS enforced pelo banco. Isolamento de tenant por construcao.

### `apps/api/src/lib/redis.ts`

Dois clientes ioredis com configuracoes distintas:

- `createRedisClient()`: `maxRetriesPerRequest: 3` — uso geral (health, cache simples)
- `createBullMQRedisClient()`: `maxRetriesPerRequest: null` — OBRIGATORIO para BullMQ (Pitfall 5 RESEARCH.md)

### `apps/api/src/plugins/auth.ts`

Plugin Fastify (fastify-plugin) com `preHandler` hook:

1. Rotas com `config: { skipAuth: true }` pulam autenticacao (ex: `/`, `/health`)
2. Sem header `Authorization` → 401 `MISSING_TOKEN`
3. JWT invalido/expirado → 401 `INVALID_TOKEN` (sem vazar detalhes do erro)
4. JWT sem `app_metadata.tenant_id` → 403 `NO_TENANT_CONTEXT`
5. JWT valido → decora `req.user` com `{ sub, tenant_id, role }` e `req.tenantLogger` como child logger com `{ tenant_id, user_id, request_id }`

JWKS singleton criado no module scope — `createRemoteJWKSet` com cache interno, nao recriar por request.

### `apps/api/src/plugins/sentry.ts`

Plugin Fastify que inicializa Sentry:

- `sendDefaultPii: false` — LGPD compliance, nao enviar PII automaticamente
- `initialScope.tags.source = 'api'` — diferencia erros da API vs Worker no mesmo DSN (D-29)
- `onError` hook: captura excecoes nao tratadas com contexto de tenant (`tenant_id`, `role`, `request_id`)
- Gracioso quando `SENTRY_DSN` ausente: log info e return (nao bloqueia inicializacao)

### `apps/api/src/server.ts`

Factory `buildApp()` que monta o servidor Fastify:

- Logger pino com `redact` configurado para `cpf`, `senha`, `prompt_text`, `authorization` — censor `[REDACTED]`
- `genReqId`: `crypto.randomUUID()` — request_id unico rastreavel em todos os logs
- Transports condicionais: `@logtail/pino` em producao (Betterstack), `pino-pretty` em dev, nenhum em test
- Plugins registrados: `@fastify/helmet`, `@fastify/rate-limit` (1000 req/min, key por `tenant_id`), `sentryPlugin`, `authPlugin`
- Rota `/` publica com `skipAuth: true`
- `startServer()` para entry point quando executado diretamente

## Verification Results

```
vitest run apps/api/src/plugins/auth.test.ts --config backend/vitest.config.ts --reporter=verbose
 ✓ Auth Plugin (AUTH-04) > rejeita request sem Authorization header com 401 MISSING_TOKEN
 ✓ Auth Plugin (AUTH-04) > rejeita token malformado com 401 INVALID_TOKEN
 ✓ Auth Plugin (AUTH-04) > rejeita JWT sem app_metadata.tenant_id com 403 NO_TENANT_CONTEXT
 ✓ Auth Plugin (AUTH-04) > decora req.user com sub, tenant_id, role corretos
 ✓ Auth Plugin (AUTH-04) > rota com skipAuth: true nao executa o preHandler de auth
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

## Deviations from Plan

None — plan executado exatamente como escrito. Todos os 5 testes passaram na primeira execucao apos implementacao. A unica diferenca menor: no `auth.test.ts` foi adicionado `logger: false` ao `Fastify()` para evitar output em testes (melhoria de DX, nao muda comportamento).

## Threat Model Coverage

| Threat ID | Category | Mitigation | Status |
|-----------|----------|------------|--------|
| T-1-04-S (JWT Spoofing) | Spoofing | `jwtVerify` com `issuer` e `audience` validados; JWKS singleton com cache; nao confiar em claims sem verificacao criptografica | Mitigated |
| T-1-04-I (PII em logs) | Info Disclosure | `redact` configurado com `*.cpf`, `*.senha`, `*.prompt_text`, `req.headers.authorization`; censor `[REDACTED]` | Mitigated |
| T-1-04-I (PII no Sentry) | Info Disclosure | `sendDefaultPii: false`; `scope.setUser` usa apenas `user.sub` (UUID) | Mitigated |
| T-1-04-D (DoS sem rate limit) | Denial of Service | `@fastify/rate-limit` 1000 req/min por `tenant_id`/IP | Mitigated |
| T-1-04-T (Headers inseguros) | Tampering | `@fastify/helmet` define CSP, X-Frame-Options, HSTS | Mitigated |

## Known Stubs

None — todos os exports sao funcionais e prontos para consumo pelos Plans subsequentes (05, 06, 08).

## Self-Check: PASSED

Files verified:
- apps/api/src/server.ts: EXISTS
- apps/api/src/lib/supabase.ts: EXISTS
- apps/api/src/lib/redis.ts: EXISTS
- apps/api/src/plugins/auth.ts: EXISTS
- apps/api/src/plugins/auth.test.ts: EXISTS
- apps/api/src/plugins/sentry.ts: EXISTS

Commits verified:
- 9c41b5c: feat(01-04): add supabase clients, redis client, auth plugin with TDD tests
- 9aabed2: feat(01-04): add server.ts (buildApp) + sentry plugin with PII redaction

Security checks:
- pino redact com censor [REDACTED]: PASS
- sendDefaultPii: false no Sentry: PASS
- JWKS singleton (nao recriar por request): PASS
- supabaseAdmin nunca usado em handlers: PASS
- maxRetriesPerRequest: null no BullMQ client: PASS
- Erros JWT sem vazar detalhes ao cliente: PASS
