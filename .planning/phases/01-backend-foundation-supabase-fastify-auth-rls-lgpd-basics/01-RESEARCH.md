# Phase 1: Backend Foundation — Research

**Researched:** 2026-04-14
**Domain:** Fastify 5 + TypeScript + Supabase Auth + RLS + BullMQ + LGPD baseline
**Confidence:** HIGH (stack decisions locked; versões verificadas no registro npm em 2026-04-14)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Estrutura do Projeto**
- D-01: Monorepo único — um repositório com todos os artefatos (backend Node.js, worker BullMQ, apps Android). Facilita CI unificado e PRs que tocam backend + Android juntos.
- D-02: Deploy no Railway — API e Worker como serviços Railway separados (não o mesmo processo). Secrets por serviço.
- D-03: Gerenciador de pacotes: Claude's Discretion (pnpm recomendado pela pesquisa para monorepos; se houver preferência diferente, usar aquela).

**Supabase Setup**
- D-04: Supabase Cloud com dois projetos: `portaljuridico-dev` e `portaljuridico-prod`. Verificar se há região São Paulo (preferível para LGPD); se não, us-east-1 com disclosure na política de privacidade.
- D-05: Migrations gerenciadas via Supabase CLI + SQL puro (sem ORM). `supabase migration new` + `supabase db push`. SQL explícito para RLS policies.
- D-06: Supabase Realtime: não configurar em Phase 1.

**Modelo de Negócio**
- D-07: Fluxo de tenant: signup → status `pending` → admin aprova → `trial` ou `active`. Sem self-provisioning automático.
- D-08: Status do tenant: `pending` → `trial` → `active` → `suspended`. Enum no banco.
- D-09: Modelo de cobrança: projeto fechado, valor único negociado manualmente. Sem Stripe recorrente automático.

**Autenticação & Multi-tenancy**
- D-10: Custom Access Token Hook implementado como Supabase Edge Function. Injeta `tenant_id` e `role` em `app_metadata`.
- D-11: Roles no JWT: `admin_escritorio`, `advogado`, `cliente`.
- D-12: Cliente final criado via `supabase.auth.admin.inviteUserByEmail()`.
- D-13: Email transacional: Resend configurado como SMTP customizado no Supabase Auth.

**Schema do Banco de Dados**
- D-14: Nomenclatura: português sem acentos para nomes de tabelas e colunas. Ex: `escritorios`, `usuarios`, `processos`.
- D-15: Primary keys: UUID v4 (`gen_random_uuid()`) em todas as tabelas.
- D-16: Hard delete com cascade. Sem `deleted_at`.
- D-17: Tabela `public.usuarios` sincronizada com `auth.users` via trigger.
- D-18: Timestamps `created_at` + `updated_at` em todas as tabelas.

**API Design**
- D-19: Versionamento com prefix `/api/v1/` desde Phase 1.
- D-20: Validação de schema com TypeBox (integração nativa Fastify).
- D-21: Formato de erro padrão: `{ success: false, error: "MENSAGEM_LEGIVEL", code: "ERROR_CODE" }`.
- D-22: Rate limiting: Claude's Discretion (configurar `@fastify/rate-limit` com limites altos em Phase 1).

**LGPD Compliance (Phase 1 scope)**
- D-23: Tabela `lgpd_consentimentos` com: `id`, `usuario_id`, `versao_termos`, `consentido_em`, `ip_origem`, `user_agent`, `revogado_em`.
- D-24: Versão dos termos como ISO date string (ex: `"2026-04-14"`).
- D-25: Política de privacidade hospedada em URL web (Notion público por enquanto).
- D-26: PII em logs: usar pino `redact` option — `redact: ['req.body.cpf', 'req.body.password', '*.cpf', '*.prompt_text']`.

**Observabilidade**
- D-27: Log level em produção: `info`.
- D-28: Log agregado: Betterstack (Logtail) via `pino-logtail`. Free tier 1GB/mês.
- D-29: Sentry com um DSN compartilhado para API + Worker, tag `source: 'api' | 'worker'`.
- D-30: OpenTelemetry diferido para Phase 8.

**Worker BullMQ**
- D-31: Entry point único `worker.ts` com múltiplos BullMQ Worker consumers. Deploy Railway separado. Phase 1: job de health-check/placeholder.
- D-32: Redis: Docker Compose com `redis:alpine` para dev local + Upstash Redis para CI e produção.
- D-33: Bull Board diferido para Phase 2.

**CI/CD & Testes**
- D-34: Framework de testes: Vitest.
- D-35: Sem % mínimo de cobertura. Gate CI: cross-tenant integration test obrigatório.
- D-36: Husky + lint-staged — pre-commit roda ESLint + Prettier nos arquivos staged.
- D-37: GitHub Flow — main + feature branches + PRs. CI em todos os PRs.

### Claude's Discretion
- Escolha final de pnpm vs npm (pnpm recomendado)
- Estrutura exata dos módulos Gradle no monorepo Android (fora do escopo de Phase 1)
- Granularidade exata das RLS policies
- Implementação do trigger `update_updated_at_column()`
- Configuração exata do Supavisor (transaction mode para REST)
- Rate limiting: limites numéricos iniciais

### Deferred Ideas (OUT OF SCOPE)
- Stripe billing automático (Phase 7 revisão para painel de gestão manual)
- Roles distintos admin_escritorio vs advogado (diferenciação granular em Phase 4)
- Supabase Realtime (avaliar em Phase 6)
- OpenTelemetry/tracing (Phase 8)
- Bull Board (Phase 2)
- Multi-região / DR (after-launch)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Projeto Node.js/TypeScript com Fastify configurado com hot-reload e script de build | Stack: Fastify 5.8.5 + tsx 4.21.0 para hot-reload; build via tsc ou tsup |
| INFRA-02 | Projeto Supabase configurado com Supabase CLI e migrations versionadas em SQL | Supabase CLI: `supabase migration new` + `supabase db push`; SQL puro (D-05) |
| INFRA-03 | Supavisor (connection pooler) configurado no projeto Supabase | Supavisor built-in no Supabase Cloud; configurar port 6543 (transaction mode) |
| INFRA-04 | Variáveis de ambiente sensíveis gerenciadas via `.env` com validação na inicialização | envalid 8.1.1 ou zod para validação de env at boot |
| INFRA-05 | CI/CD com GitHub Actions executando testes e build em cada push | GitHub Actions workflow; Upstash Redis no CI (D-32) |
| INFRA-06 | Logs estruturados com pino incluem tenant_id, user_id, request_id | pino 10.3.1 com child logger + pino-http; campo request_id via @fastify/request-context |
| INFRA-07 | Sentry configurado para capturar erros com contexto de tenant e usuário | @sentry/node 10.48.0; tag source: 'api'\|'worker' (D-29) |
| INFRA-08 | Health endpoint /health retorna status dos serviços dependentes | Fastify route que pinga Supabase, Redis e DataJud |
| INFRA-09 | Worker BullMQ roda como processo separado do servidor HTTP API | worker.ts separado; Railway serviço separado (D-31) |
| AUTH-01 | Escritório consegue criar conta e fazer login com email/senha via Supabase Auth | Supabase Auth email/password flow; trigger cria registro em `escritorios` |
| AUTH-02 | Cliente final consegue fazer login com email/senha via Supabase Auth | inviteUserByEmail() cria usuário com role=cliente (D-12) |
| AUTH-03 | JWT contém tenant_id e role em app_metadata (Custom Access Token Hook) | Supabase Edge Function como Custom Access Token Hook (D-10) |
| AUTH-04 | Middleware de tenant extrai tenant_id do JWT e rejeita requisições sem contexto | Fastify preHandler hook; jose 6.2.2 para verificação JWKS |
| AUTH-05 | RLS ativa em todas as tabelas com dados por tenant | RLS com policy `auth.jwt() -> 'app_metadata' ->> 'tenant_id'`; índice em tenant_id |
| AUTH-06 | Test de integração cross-tenant no CI como gate | Vitest integration test; dois tenants ficticios; verifica 403/404 cross-tenant |
| AUTH-07 | Roles admin_escritorio, advogado, cliente têm políticas RLS distintas | Policies diferenciadas por role em `app_metadata` (D-11) |
| AUTH-08 | Cliente final recebe email com credenciais ao ser cadastrado | Resend via SMTP Supabase Auth; magic link por inviteUserByEmail() (D-13) |
| AUTH-09 | Usuário consegue fazer logout e sessão é invalidada | Supabase Auth signOut(); revoga refresh token no servidor |
| LGPD-01 | Tabela de consentimento LGPD registra opt-in/opt-out com timestamp e versão | Tabela `lgpd_consentimentos` conforme D-23; endpoint POST /api/v1/lgpd/consentimento |
| LGPD-03 | CPF e PII não incluídos em prompts enviados para Claude API | Data minimization: strip PII antes de montar prompts; validado por construção |
| LGPD-04 | Logs não registram CPF ou conteúdo bruto de prompts | pino redact: ['*.cpf', 'req.body.password', '*.prompt_text'] (D-26) |
| LGPD-06 | Política de privacidade menciona Anthropic como sub-processador internacional | Texto na privacy policy URL (D-25); link nas respostas de auth (referência documental) |
</phase_requirements>

---

## Summary

Phase 1 constrói a fundação de segurança que todas as fases downstream dependem. O escopo é inteiramente backend — sem UI Android. O resultado deve ser um servidor Fastify 5 rodando com TypeScript estrito, autenticação multi-tenant via Supabase Auth com JWT customizado (tenant_id + role em app_metadata), Row Level Security em todas as tabelas de dados por tenant, um worker BullMQ separado com placeholder job, e hooks de observabilidade e LGPD já no lugar.

A decisão mais importante desta fase é a implementação do **Custom Access Token Hook** como Supabase Edge Function. Sem esse hook, os JWTs não carregam `tenant_id` e `role`, e o middleware de tenant do Fastify — e as próprias RLS policies — não funcionam. Tudo mais depende disso.

O gate de CI cross-tenant (AUTH-06) é a única métrica de qualidade que importa nesta fase: um teste de integração que prova que tenant A não pode ler dados do tenant B via nenhum endpoint ou query. Esse teste deve existir antes de qualquer feature work nas fases seguintes.

**Recomendação primária:** Implementar na ordem exata: schema SQL + migrations → Custom Access Token Hook → middleware Fastify → RLS policies → cross-tenant integration test → health endpoint + BullMQ worker. Não pular etapas — cada camada de segurança depende da anterior.

---

## Standard Stack

### Core (Phase 1 scope — backend only)

| Library | Version | Purpose | Fonte da Versão |
|---------|---------|---------|----------------|
| Node.js | 22 LTS (22.x) | Runtime | [VERIFIED: node --version = 24.14.0 nesta máquina; 22 LTS é o mínimo recomendado para produção] |
| TypeScript | 6.0.2 | Type safety | [VERIFIED: npm registry 2026-04-14] |
| pnpm | 10.33.0 | Package manager | [VERIFIED: npm registry 2026-04-14] |
| Fastify | 5.8.5 | HTTP framework | [VERIFIED: npm registry 2026-04-14] |
| @supabase/supabase-js | 2.103.0 | Supabase client (service_role + user JWT) | [VERIFIED: npm registry 2026-04-14] |
| jose | 6.2.2 | JWT verification via JWKS | [VERIFIED: npm registry 2026-04-14] |
| BullMQ | 5.73.5 | Queue + worker (Redis-backed) | [VERIFIED: npm registry 2026-04-14] |
| ioredis | 5.10.1 | Redis client (BullMQ peer dep) | [VERIFIED: npm registry 2026-04-14] |
| pino | 10.3.1 | Structured JSON logging | [VERIFIED: npm registry 2026-04-14] |
| @sentry/node | 10.48.0 | Error tracking | [VERIFIED: npm registry 2026-04-14] |
| envalid | 8.1.1 | Env var validation at boot | [VERIFIED: npm registry 2026-04-14] |
| vitest | 4.1.4 | Test framework | [VERIFIED: npm registry 2026-04-14] |

### Supporting

| Library | Version | Purpose | Quando usar |
|---------|---------|---------|-------------|
| @fastify/jwt | 10.0.0 | Fastify JWT plugin (alternativa a jose raw) | Opcional — usar se jose raw ficar verbose |
| @fastify/cors | 11.2.0 | CORS headers | Habilitar quando web console for adicionado |
| @fastify/helmet | 13.0.2 | Security headers (CSP, HSTS, etc.) | Sempre — defense-in-depth |
| @fastify/rate-limit | 10.3.0 | Rate limiting por tenant/IP | Phase 1 com limites altos; ajustar nas fases 2-3 |
| tsx | 4.21.0 | TypeScript hot-reload sem compilar (dev) | `tsx watch src/server.ts` em dev |
| pino-pretty | 13.1.3 | Formatação legível de logs em dev | devDependency apenas |
| lint-staged | 16.4.0 | Lint em arquivos staged (Husky hook) | pre-commit com ESLint + Prettier |
| husky | 9.1.7 | Git hooks manager | pre-commit pipeline |

**Instalação — API server:**
```bash
pnpm add fastify @supabase/supabase-js jose bullmq ioredis pino @sentry/node envalid @fastify/helmet @fastify/rate-limit
pnpm add -D typescript tsx vitest @types/node pino-pretty husky lint-staged
```

**Instalação — tipos e utilitários:**
```bash
pnpm add @fastify/type-provider-typebox @sinclair/typebox
```

> Nota sobre Node.js: a máquina de desenvolvimento roda Node.js 24.14.0 [VERIFIED: node --version]. Para produção no Railway, recomenda-se especificar `"engines": { "node": ">=22.0.0" }` no package.json para manter compatibilidade com a linha LTS estável.

---

## Architecture Patterns

### Estrutura do Monorepo (Phase 1 — backend apenas)

```
portaljuridico/                    # raiz do monorepo
├── apps/
│   ├── api/                       # Fastify HTTP server
│   │   ├── src/
│   │   │   ├── server.ts          # entry point: configura Fastify, registra plugins, inicia
│   │   │   ├── config.ts          # validação de env vars via envalid (falha fast)
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts        # preHandler hook: extrai JWT, valida via JWKS, anexa req.user
│   │   │   │   ├── sentry.ts      # inicializa Sentry com contexto de tenant
│   │   │   │   └── tenant.ts      # middleware: valida tenant_id no JWT, injeta logger child
│   │   │   ├── routes/
│   │   │   │   ├── health.ts      # GET /health — pinga Supabase, Redis, DataJud
│   │   │   │   ├── auth/          # POST /api/v1/auth/signup, /login, /logout
│   │   │   │   └── lgpd/          # POST /api/v1/lgpd/consentimento
│   │   │   ├── services/          # lógica de negócio — chama repositories
│   │   │   ├── repositories/      # acesso a dados via supabaseAdmin client
│   │   │   └── lib/
│   │   │       ├── supabase.ts    # dois clients: supabaseAdmin + supabaseAsUser(jwt)
│   │   │       └── redis.ts       # ioredis client com reconnect handling
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── worker/                    # BullMQ worker process
│       ├── src/
│       │   ├── worker.ts          # entry point: instancia workers BullMQ
│       │   └── queues/
│       │       └── health-check.ts # placeholder job (Phase 1)
│       ├── package.json
│       └── tsconfig.json
├── supabase/
│   ├── migrations/                # SQL migrations versionadas
│   │   ├── 0001_create_escritorios.sql
│   │   ├── 0002_create_usuarios.sql
│   │   ├── 0003_rls_policies.sql
│   │   └── 0004_lgpd_consentimentos.sql
│   ├── functions/
│   │   └── custom-access-token/  # Supabase Edge Function: injeta tenant_id+role no JWT
│   │       └── index.ts
│   └── config.toml
├── android/                       # apps Android (Phase 0, não tocado em Phase 1)
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions: test + build em cada PR
├── docker-compose.yml             # Redis + Supabase local (dev)
├── package.json                   # root: scripts de workspace
└── pnpm-workspace.yaml
```

### Pattern 1: Dois Clientes Supabase no Backend

**O quê:** Criar duas instâncias distintas do cliente Supabase no código Node.js.

**Por quê:** O `service_role` key bypassa RLS por design. Usar ele em request handlers é o maior vetor de leak cross-tenant. O cliente com JWT do usuário tem RLS aplicado pelo banco — defense-in-depth.

```typescript
// apps/api/src/lib/supabase.ts
// [ASSUMED] — padrão recomendado pela documentação Supabase; API estável na versão 2.x

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types' // gerado pelo supabase CLI

// Cliente admin: bypassa RLS. NUNCA usar em request handlers.
// Uso: background jobs, webhooks verificados, admin endpoints.
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Cliente com contexto de usuário: RLS enforced.
// Criar novo por request — NÃO compartilhar instância entre requests.
export function supabaseAsUser(jwt: string) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )
}
```

### Pattern 2: Middleware de Tenant (Fastify preHandler)

**O quê:** Plugin Fastify que verifica o JWT Supabase em TODA requisição e injeta contexto de tenant no request.

**Por quê:** Centraliza autenticação em um único lugar. Garante que nenhum handler pode ser chamado sem tenant_id válido. Cria child logger com tenant_id para rastreabilidade automática em todos os logs.

```typescript
// apps/api/src/plugins/auth.ts
// [ASSUMED] — padrão Fastify decorateRequest; verificar API de decorators na versão 5.x

import fp from 'fastify-plugin'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)

export interface TenantUser {
  sub: string          // user_id (auth.users.id)
  tenant_id: string    // de app_metadata
  role: 'admin_escritorio' | 'advogado' | 'cliente'
}

declare module 'fastify' {
  interface FastifyRequest {
    user: TenantUser
    tenantLogger: FastifyBaseLogger
  }
}

export default fp(async (fastify) => {
  fastify.decorateRequest('user', null)
  fastify.decorateRequest('tenantLogger', null)

  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: 'Token ausente', code: 'MISSING_TOKEN' })
    }

    try {
      const token = authHeader.slice(7)
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${process.env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated'
      })

      const appMeta = payload.app_metadata as Record<string, string>
      if (!appMeta?.tenant_id) {
        return reply.code(403).send({ success: false, error: 'tenant_id ausente no token', code: 'NO_TENANT_CONTEXT' })
      }

      request.user = {
        sub: payload.sub!,
        tenant_id: appMeta.tenant_id,
        role: appMeta.role as TenantUser['role']
      }

      // Child logger com contexto de tenant — propagado automaticamente
      request.tenantLogger = request.log.child({
        tenant_id: appMeta.tenant_id,
        user_id: payload.sub,
        request_id: request.id
      })
    } catch {
      return reply.code(401).send({ success: false, error: 'Token inválido', code: 'INVALID_TOKEN' })
    }
  })
})
```

### Pattern 3: Custom Access Token Hook (Supabase Edge Function)

**O quê:** Supabase Edge Function registrada como Custom Access Token Hook que injeta `tenant_id` e `role` em `app_metadata` de todo JWT gerado.

**Por quê:** Sem esse hook, o JWT contém apenas `sub` (user_id) e claims padrão do Supabase. As RLS policies e o middleware Fastify dependem de `app_metadata.tenant_id` e `app_metadata.role` para funcionar. Esse hook é o ponto central de injeção — qualquer problema aqui quebra toda autenticação.

```typescript
// supabase/functions/custom-access-token/index.ts
// [CITED: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook]

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const payload = await req.json()
  const { user_id, claims } = payload

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Busca tenant_id e role do usuário na tabela usuarios
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('tenant_id, role_local')
    .eq('id', user_id)
    .single()

  // Injeta em app_metadata (NUNCA em user_metadata — usuário pode alterar)
  const enrichedClaims = {
    ...claims,
    app_metadata: {
      ...claims.app_metadata,
      tenant_id: usuario?.tenant_id ?? null,
      role: usuario?.role_local ?? 'cliente'
    }
  }

  return Response.json({ claims: enrichedClaims })
})
```

**Configuração no Supabase Dashboard:**
- Dashboard > Authentication > Hooks > Custom Access Token
- Apontar para a Edge Function `custom-access-token`
- Adicionar secret HOOK_SECRET e verificar assinatura

### Pattern 4: RLS Policies com Performance Segura

**O quê:** Policies escritas de forma que o planner do Postgres possa hoistear o subquery fora do loop por-linha.

**Por quê:** A forma ingênua (`WHERE tenant_id = auth.uid()`) força re-avaliação por linha. Com `(SELECT ...)`, o Postgres avalia uma vez por query.

```sql
-- 0001_create_escritorios.sql
-- Tabela raiz de tenants — não tem tenant_id (é o próprio tenant)
CREATE TABLE public.escritorios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'trial', 'active', 'suspended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escritorios ENABLE ROW LEVEL SECURITY;

-- Somente admins do próprio escritório podem ler/editar
CREATE POLICY escritorio_isolation ON public.escritorios
  FOR ALL
  USING (
    id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  );
```

```sql
-- 0003_rls_policies.sql — tabela usuarios (exemplo padrão)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Leitura: admin_escritorio e advogado veem todos do tenant; cliente vê apenas a si mesmo
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT
  USING (
    tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_escritorio', 'advogado')
      OR id = auth.uid()
    )
  );

-- Índice obrigatório para performance RLS
CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);
```

### Pattern 5: Schema Mínimo Phase 1

```sql
-- Tabelas necessárias em Phase 1 (todas com RLS)

-- escritorios (= tenants)
CREATE TABLE public.escritorios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  email       text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'trial', 'active', 'suspended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- usuarios (espelho de auth.users com campos customizados)
CREATE TABLE public.usuarios (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  cpf         text,                    -- armazenado; nunca vai para logs ou prompts
  email       text NOT NULL,
  role_local  text NOT NULL DEFAULT 'cliente'
                CHECK (role_local IN ('admin_escritorio', 'advogado', 'cliente')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_tenant ON public.usuarios(tenant_id);

-- lgpd_consentimentos (conforme D-23)
CREATE TABLE public.lgpd_consentimentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  versao_termos   text NOT NULL,       -- ISO date string ex: "2026-04-14"
  consentido_em   timestamptz NOT NULL DEFAULT now(),
  ip_origem       text,
  user_agent      text,
  revogado_em     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lgpd_usuario ON public.lgpd_consentimentos(usuario_id);
ALTER TABLE public.lgpd_consentimentos ENABLE ROW LEVEL SECURITY;
-- Usuário só acessa seus próprios consentimentos
CREATE POLICY lgpd_self ON public.lgpd_consentimentos
  FOR ALL
  USING (usuario_id = auth.uid());
```

### Pattern 6: Pino com Redação de PII

```typescript
// apps/api/src/server.ts — configuração do logger
// [VERIFIED: pino 10.3.1 suporta redact como opção nativa]

import Fastify from 'fastify'

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
      paths: [
        'req.body.cpf',
        'req.body.password',
        'req.body.senha',
        '*.cpf',
        '*.prompt_text',
        '*.senha',
        'req.headers.authorization'  // não logar JWTs completos
      ],
      censor: '[REDACTED]'
    },
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined
  }
})
```

### Pattern 7: Validação de Env com Envalid

```typescript
// apps/api/src/config.ts
// [VERIFIED: envalid 8.1.1]

import { cleanEnv, str, url, num } from 'envalid'

export const env = cleanEnv(process.env, {
  NODE_ENV:                   str({ choices: ['development', 'production', 'test'] }),
  PORT:                       num({ default: 3000 }),
  SUPABASE_URL:               url(),
  SUPABASE_ANON_KEY:          str(),
  SUPABASE_SERVICE_ROLE_KEY:  str(),
  REDIS_URL:                  url(),
  SENTRY_DSN:                 str({ default: '' }),
  BETTERSTACK_SOURCE_TOKEN:   str({ default: '' }),
})
// Se qualquer variável obrigatória estiver ausente, cleanEnv lança e o processo termina
```

### Anti-Patterns a Evitar

- **Service role em request handlers:** `createClient(url, SERVICE_ROLE_KEY)` dentro de um route handler vaza todos os tenants ao primeiro bug de filtro. Use `supabaseAsUser(jwt)` em handlers; reservar `supabaseAdmin` para jobs e webhooks.
- **user_metadata para tenant_id:** usuários podem escrever em `user_metadata`. Sempre usar `app_metadata` para claims de segurança (só server-side pode escrever).
- **RLS sem índice em tenant_id:** table scan em vez de index scan quando o tenant tem milhares de linhas. Índice em `tenant_id` é obrigatório em todas as tabelas.
- **`USING (true)` em qualquer policy:** abre a tabela para todos os tenants. Nunca usar policy permissiva como placeholder.
- **JWT caching global:** `createRemoteJWKSet` do jose já faz cache do JWKS. Não criar um novo JWKSet por request.
- **Logs sem redact em produção:** o campo `pino.redact` deve estar configurado antes do primeiro request com dados reais.

---

## Don't Hand-Roll

| Problema | Não Construir | Usar | Por quê |
|----------|--------------|------|---------|
| Verificação de JWT | Parser manual de Base64+HMAC | `jose` (jwtVerify + JWKS) | Rotação de chaves, algoritmos, timing attacks — jose trata tudo |
| Autenticação de usuários | Auth própria com bcrypt+sessions | Supabase Auth | MFA, magic link, OAuth, rate limiting, breach detection já incluídos |
| Rate limiting | Contador Redis manual | `@fastify/rate-limit` | Sliding window, per-tenant keying, headers corretos (X-RateLimit-*) |
| Queue de jobs com retry | `setInterval` + try/catch | BullMQ | Persistência, replay, dead letter queue, distributed locking, observability |
| Structured logging | `console.log(JSON.stringify(...))` | pino | Thread-safe, async, serializers, redact, child loggers, transport |
| Validação de schema de entrada | Regex + typeof manual | TypeBox + Fastify | Geração automática de JSON Schema, TypeScript types inferidos, validação em compile time |
| Error tracking | Captura de exceções manual | Sentry | Stack traces, grouping, alertas, contexto de tenant, replay de sessão |
| Connection pooling de Postgres | Pool manual no Node | Supavisor | Pooler gerenciado no Supabase; não reinventar para uso REST/PostgREST |

---

## Common Pitfalls

### Pitfall 1: Custom Access Token Hook não registrado antes do primeiro signup

**O que dá errado:** Escritório cria conta antes do hook estar configurado. JWT gerado sem `tenant_id`. O trigger que cria o registro em `public.usuarios` não existia ainda. A conta fica em estado inconsistente — existe em `auth.users` mas não em `public.usuarios`, e o JWT nunca terá `tenant_id` correto.

**Por que acontece:** Desenvolvedores testam o signup enquanto ainda estão configurando o hook no dashboard.

**Como evitar:** Migrations e Edge Functions devem ser aplicadas ANTES do primeiro teste de signup. Em CI, usar `supabase db reset` para garantir estado limpo. O trigger de sync auth.users → public.usuarios deve estar na primeira migration.

**Sinais de alerta:** `app_metadata.tenant_id` nulo nos logs; endpoints retornando 403 com "tenant_id ausente" logo após login.

---

### Pitfall 2: Supavisor em Transaction Mode quebra SET LOCAL e prepared statements

**O que dá errado:** Supavisor no modo `transaction` (porta 6543) reinicia o contexto de sessão entre statements. Comandos como `SET LOCAL app.tenant_id = '...'` ou `SET SESSION authorization` não persistem entre queries do mesmo "request" lógico.

**Por que acontece:** O modo `transaction` mapeia uma conexão lógica para conexões físicas diferentes do pool. É ideal para queries REST/PostgREST stateless, mas quebra padrões que dependem de estado de sessão.

**Como evitar:** Para acesso REST/PostgREST (Supabase JS client), usar Supavisor transaction mode (porta 6543) — é o padrão. Para migrations via Supabase CLI e jobs que precisam de transações longas, usar a conexão direta (porta 5432). **Não usar** `SET LOCAL` como mecanismo de isolamento de tenant — usar RLS policies e `app_metadata` no JWT.

**Sinais de alerta:** Queries que funcionam em conexão direta falham via PostgREST. Políticas de tenant baseadas em `current_setting('app.tenant_id')` retornam vazio.

---

### Pitfall 3: RLS Policy em tabela sem índice em tenant_id

**O que dá errado:** Policy `USING (tenant_id = (SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::uuid))` funciona corretamente para isolation, mas sem índice em `tenant_id` o Postgres faz full table scan por tenant. Com 10k processos no banco total e 100 por tenant, cada query varre 10x mais linhas que o necessário.

**Por que acontece:** Migrations criam a tabela e a policy mas esquecem `CREATE INDEX`.

**Como evitar:** Convention: toda migration que cria tabela com `tenant_id` deve incluir `CREATE INDEX idx_{tabela}_tenant ON {tabela}(tenant_id);` na mesma migration.

**Sinais de alerta:** Supabase dashboard "Slow Queries" mostra seq scan em tabelas com RLS; query plan de `EXPLAIN ANALYZE` não usa índice.

---

### Pitfall 4: PII nos logs antes do redact estar configurado

**O que dá errado:** Developer adiciona `request.log.info({ usuario })` para debug, onde `usuario` inclui `cpf`. Pino loga o objeto completo. Se os logs estão sendo drenados para Betterstack/Logtail, CPF está em plaintext no log aggregator.

**Por que acontece:** O campo `redact` do pino usa caminhos de objeto. Se o campo `cpf` está em um caminho não coberto pelos redact paths, ele passa.

**Como evitar:** Usar paths abrangentes: `'*.cpf'` cobre qualquer nível de nesting. Adicionar um teste de integração que verifica: fazer POST com CPF no body e confirmar que o log de request NÃO contém o valor do CPF.

**Sinais de alerta:** Busca por padrão de CPF (`\d{3}\.\d{3}\.\d{3}-\d{2}` ou 11 dígitos consecutivos) nos logs retorna resultados.

---

### Pitfall 5: Worker BullMQ usando a mesma variável REDIS_URL da API

**O que dá errado:** API e Worker compartilham a mesma conexão Redis em produção via Railway. Se o Worker tem um job que cria muitas conexões (ex: polling em paralelo), pode esgotar o pool de conexões do Redis e afetar a API.

**Por que acontece:** Conveniência de configurar um único `REDIS_URL`.

**Como evitar:** No Railway, cada serviço tem seus próprios env vars. API e Worker devem usar `REDIS_URL` apontando para o mesmo Upstash Redis, mas **configurar `maxRetriesPerRequest: null`** no ioredis para BullMQ e `maxRetriesPerRequest: 3` para a API. Isso evita que timeouts do worker bloqueiem a API. O BullMQ exige `maxRetriesPerRequest: null`.

**Sinais de alerta:** API começa a retornar erros de Redis durante picos de processamento do Worker.

---

### Pitfall 6: inviteUserByEmail sem tenant_id no hook resulta em conta "órfã"

**O que dá errado:** `supabase.auth.admin.inviteUserByEmail(email, { data: { role: 'cliente' } })` cria o usuário em `auth.users`. O Custom Access Token Hook tenta buscar `tenant_id` em `public.usuarios`, mas o trigger que cria o registro em `public.usuarios` só roda quando o usuário aceita o convite e completa o signup — não na hora do invite.

**Por que acontece:** `inviteUserByEmail` cria o usuário em `auth.users` com status pendente. O trigger `on auth.users INSERT` dispara, mas nesse momento pode não existir `tenant_id` nos metadados do convite.

**Como evitar:** Passar `tenant_id` explicitamente no convite: `inviteUserByEmail(email, { data: { tenant_id: ..., role_local: 'cliente' } })`. O trigger deve ler `new.raw_user_meta_data` para extrair `tenant_id` na criação do registro em `public.usuarios`. Validar em teste: convidar usuário, aceitar convite, confirmar que `public.usuarios` tem `tenant_id` correto.

**Sinais de alerta:** Clientes convidados conseguem fazer login mas veem erro 403 em todo endpoint; `public.usuarios` não tem registro para o novo usuário.

---

## Code Examples

### Health Endpoint

```typescript
// apps/api/src/routes/health.ts
// [ASSUMED] — padrão Fastify 5; verificar se API de route registration mudou

import type { FastifyInstance } from 'fastify'
import { supabaseAdmin } from '../lib/supabase.js'
import Redis from 'ioredis'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', { config: { skipAuth: true } }, async (_req, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {}

    // Checar Supabase
    try {
      await supabaseAdmin.from('escritorios').select('id').limit(1)
      checks.supabase = 'ok'
    } catch {
      checks.supabase = 'error'
    }

    // Checar Redis
    try {
      const redis = new Redis(process.env.REDIS_URL!)
      await redis.ping()
      await redis.quit()
      checks.redis = 'ok'
    } catch {
      checks.redis = 'error'
    }

    // DataJud — apenas conectividade básica (Phase 1)
    try {
      const res = await fetch('https://api-publica.datajud.cnj.jus.br/', {
        signal: AbortSignal.timeout(3000)
      })
      checks.datajud = res.ok ? 'ok' : 'error'
    } catch {
      checks.datajud = 'error'
    }

    const allOk = Object.values(checks).every(v => v === 'ok')
    return reply.code(allOk ? 200 : 503).send({ status: allOk ? 'ok' : 'degraded', checks })
  })
}
```

### Cross-Tenant Integration Test

```typescript
// apps/api/src/tests/cross-tenant-gate.test.ts
// [ASSUMED] — padrão Vitest 4.x; usando buildApp helper

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../server.js'
import { supabaseAdmin } from '../lib/supabase.js'

describe('Cross-Tenant Security Gate (AUTH-06)', () => {
  let tenantA = { id: '', jwt: '' }
  let tenantB = { id: '', jwt: '' }

  beforeAll(async () => {
    // Criar dois tenants de teste no banco
    // ... setup: criar escritorios A e B, usuários, JWT com tenant_id correto
  })

  afterAll(async () => {
    // Limpar dados de teste
  })

  it('tenant A não consegue ler dados do tenant B via GET /api/v1/usuarios', async () => {
    const app = await buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/usuarios',
      headers: { Authorization: `Bearer ${tenantA.jwt}` }
    })
    const body = response.json()
    const userIds = body.data.map((u: any) => u.id)
    // Nenhum usuário do tenant B deve aparecer
    expect(userIds).not.toContain(tenantB.userId)
    await app.close()
  })
})
```

### BullMQ Worker Placeholder (Phase 1)

```typescript
// apps/worker/src/worker.ts
// [VERIFIED: BullMQ 5.73.5 API; maxRetriesPerRequest: null obrigatório para BullMQ]

import { Worker } from 'bullmq'
import Redis from 'ioredis'
import * as Sentry from '@sentry/node'

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null  // obrigatório para BullMQ
})

// Placeholder job: health check do worker (Phase 1)
// DataJud consumer será adicionado em Phase 2
const healthWorker = new Worker(
  'health-check',
  async (job) => {
    job.log(`Worker alive at ${new Date().toISOString()}`)
    return { status: 'ok' }
  },
  { connection }
)

healthWorker.on('failed', (job, err) => {
  Sentry.captureException(err, { extra: { jobId: job?.id } })
})

process.on('SIGTERM', async () => {
  await healthWorker.close()
  process.exit(0)
})
```

---

## State of the Art

| Abordagem Antiga | Abordagem Atual (2025-2026) | Quando Mudou | Impacto |
|------------------|----------------------------|--------------|---------|
| Supabase Auth Hooks via webhooks externos | Custom Access Token Hook nativo (Edge Function registrada no dashboard) | Supabase 2023-2024 | Injeção de claims sem latência de webhook externo; mais simples de configurar |
| `jsonwebtoken` (npm) para verificação de JWT | `jose` (Web Crypto API nativa) | ~2022-2023 | `jose` suporta JWKS rotation nativa, funciona em Edge/Deno, menor bundle |
| Express 4 + middlewares | Fastify 5 com hooks tipados | Fastify 5 GA 2024 | TypeBox nativo, plugins async, performance 2x |
| `pg` direto no Node.js | Supabase JS client v2 via PostgREST | 2022+ | RLS enforced automaticamente via PostgREST; client com auth integrado |
| `bull` (v4, Redis client legado) | `bullmq` (v5, ioredis, TypeScript nativo) | 2023+ | `bull` está em maintenance mode; BullMQ é o successor oficial |
| `dotenv` package | Node.js `--env-file=.env` (nativo) | Node.js 20.6+ | Zero dependência; disponível desde Node 22 LTS |

**Deprecados/obsoletos:**
- `bull` (npm): em maintenance mode. Usar BullMQ.
- `jsonwebtoken`: em maintenance mode. Usar `jose`.
- `express`: viável mas inferior para este stack TypeScript-first. Fastify 5 é a escolha.
- Supabase Auth webhooks externos para Custom Access Token: substituídos pelos hooks nativos.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|--------------|-----------|--------|---------|
| Node.js | Runtime base da API | Sim | 24.14.0 (dev); 22 LTS em produção Railway | — |
| git | CI/CD, versionamento | Sim | 2.53.0 | — |
| Docker | Redis local (dev) | Nao | — | Upstash Redis free tier para dev também; ou instalar Docker Desktop |
| Supabase CLI | Migrations, dev local | Nao verificado | — | Instalar via npm: `npm install -g supabase` |
| pnpm | Package manager monorepo | Sim | 10.33.0 | npm 10+ (Node 22 inclui) se preferir |
| Railway CLI | Deploy | Nao verificado | — | Deploy via GitHub Actions CI/CD sem CLI local |

**Missing dependencies com fallback viável:**
- Docker: usar Upstash Redis free tier local em vez de Docker Compose para dev. Isso simplifica onboarding mas reduz paridade dev/prod. O planner deve incluir ambas as opções.
- Supabase CLI: instalar como parte da Wave 0 do plano.

**Missing dependencies sem fallback:**
- Nenhuma dependência de bloqueio absoluto identificada — todos têm fallback ou instalação simples.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `apps/api/vitest.config.ts` — criar em Wave 0 |
| Quick run command | `pnpm --filter api test --run` |
| Full suite command | `pnpm --filter api test --run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Arquivo Existe? |
|--------|----------|-----------|-------------------|-----------------|
| AUTH-03 | JWT contém tenant_id e role em app_metadata | unit | `vitest run src/tests/auth.test.ts` | Nao — Wave 0 |
| AUTH-04 | Middleware rejeita request sem tenant context | unit | `vitest run src/tests/middleware.test.ts` | Nao — Wave 0 |
| AUTH-05 | RLS impede acesso cross-tenant via query direta | integration | `vitest run src/tests/rls.test.ts` | Nao — Wave 0 |
| AUTH-06 | Tenant A não lê dados do Tenant B via endpoints | integration | `vitest run src/tests/cross-tenant-gate.test.ts` | Nao — Wave 0 |
| INFRA-04 | Servidor falha ao iniciar sem env vars obrigatórias | unit | `vitest run src/tests/config.test.ts` | Nao — Wave 0 |
| INFRA-06 | Logs incluem tenant_id, user_id, request_id | unit | `vitest run src/tests/logging.test.ts` | Nao — Wave 0 |
| INFRA-08 | /health retorna 200 quando deps estão up | integration | `vitest run src/tests/health.test.ts` | Nao — Wave 0 |
| LGPD-04 | Logs não contêm CPF ou conteúdo de prompt | unit | `vitest run src/tests/pii-redact.test.ts` | Nao — Wave 0 |

### Sampling Rate
- **Por task commit:** `pnpm --filter api test --run` (suite unit; < 30s)
- **Por wave merge:** `pnpm --filter api test --run` full suite incluindo integration
- **Phase gate:** Full suite verde antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/vitest.config.ts` — config base com environment test
- [ ] `apps/api/src/tests/setup.ts` — fixtures compartilhadas (criar tenants de teste, gerar JWTs mock)
- [ ] `apps/api/src/tests/cross-tenant-gate.test.ts` — REQ AUTH-06 (gate obrigatório de CI)
- [ ] `apps/api/src/tests/pii-redact.test.ts` — REQ LGPD-04
- [ ] Framework install: `pnpm add -D vitest @vitest/coverage-v8`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Sim | Supabase Auth (email/password + magic link) — não implementar custom |
| V3 Session Management | Sim | Supabase Auth JWT (1h expiry) + refresh token rotation |
| V4 Access Control | Sim | RLS policies + tenant middleware Fastify |
| V5 Input Validation | Sim | TypeBox + Fastify schema validation em todos os endpoints |
| V6 Cryptography | Parcial | jose para JWT verification; Supabase gerencia crypto de auth; não hand-roll |
| V9 Communications | Sim | HTTPS enforced no Railway; Supabase usa TLS por padrão |
| V13 API & Web Service | Sim | @fastify/rate-limit; formato de erro padronizado sem stack trace em produção |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak via service role key | Information Disclosure | Dois clients Supabase distintos; service role NUNCA em request handlers |
| JWT tenant_id forgery via user_metadata | Elevation of Privilege | Claims de segurança APENAS em app_metadata (server-side only) |
| PII em logs | Information Disclosure | pino redact com paths abrangentes; test de regressão |
| Mass enumeration de processos cross-tenant | Information Disclosure | RLS + índice em tenant_id + integration test gate no CI |
| LGPD: dados de clientes sem consentimento registrado | Compliance | Tabela lgpd_consentimentos; endpoint de consentimento antes de qualquer dado |
| Invitation link expirado para cliente | Denial of Service | Supabase Auth magic link tem expiração configurável (padrão 24h); resend endpoint |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fastify 5 decorateRequest API tem a mesma assinatura da versão 4 para null default | Pattern 2 (middleware) | Erro de TypeScript no decorator; ajuste simples na assinatura |
| A2 | Custom Access Token Hook aceita async/await na Edge Function sem timeout configurado explicitamente | Pattern 3 | Hook timeout faz signup falhar silenciosamente; verificar limite de tempo no dashboard |
| A3 | Supabase Cloud tem região São Paulo disponível em 2026 | D-04 | Precisa usar us-east-1 + disclosure na privacy policy |
| A4 | Upstash Redis free tier (256MB) é suficiente para Phase 1 (BullMQ com jobs placeholder apenas) | D-32 / BullMQ | Se limitar antes do Phase 2, upgrade para Upstash paid ou Railway Redis add-on |
| A5 | Railway suporta dois serviços separados (API + Worker) no mesmo projeto sem custo adicional no tier inicial | D-02 | Verificar pricing Railway atual; Hobby plan inclui ~$5 de crédito por serviço |
| A6 | `inviteUserByEmail` do Supabase Admin API passa `data` como `raw_user_meta_data` acessível no trigger | Pitfall 6 | Trigger não consegue extrair tenant_id do convite; requer abordagem alternativa |
| A7 | BullMQ 5.x é compatível com ioredis 5.x (sem necessidade de ioredis 4) | Standard Stack | Erro de peer dep; verificar package.json do BullMQ no npm |

---

## Open Questions

1. **Região Supabase Cloud São Paulo**
   - O que sabemos: São Paulo (sa-east-1) estava disponível em Supabase como região beta em 2024.
   - O que está incerto: Se a região está em GA em 2026 e se o tier gratuito/Pro permite selecioná-la.
   - Recomendação: Verificar no momento de criar o projeto Supabase; se disponível, usar. Se não, criar com us-east-1 e adicionar disclosure de transferência internacional de dados na privacy policy conforme LGPD Art. 33.

2. **Supabase Edge Functions timeout para Custom Access Token Hook**
   - O que sabemos: Edge Functions têm timeout de 1-2 segundos por padrão; o Hook de Access Token deve retornar rapidamente.
   - O que está incerto: Se a query `SELECT tenant_id FROM usuarios WHERE id = user_id` adiciona latência perceptível no login (cold start da Edge Function).
   - Recomendação: Implementar e medir latência de login end-to-end em dev; se cold start > 500ms, considerar cache simples ou pré-warm.

3. **Verificação de assinatura do Custom Access Token Hook**
   - O que sabemos: Supabase assina o payload do hook com HMAC-SHA256 usando um secret configurado no dashboard.
   - O que está incerto: A Edge Function precisa verificar essa assinatura explicitamente, ou Supabase garante que apenas o próprio Auth pode chamar a Edge Function?
   - Recomendação: Adicionar verificação de `X-Supabase-Signature` header na Edge Function como defense-in-depth, mesmo que o endpoint não seja público.

---

## Sources

### Primary (HIGH confidence)
- npm registry (2026-04-14) — versões verificadas: fastify@5.8.5, @supabase/supabase-js@2.103.0, bullmq@5.73.5, pino@10.3.1, jose@6.2.2, vitest@4.1.4, @sentry/node@10.48.0, envalid@8.1.1, husky@9.1.7, lint-staged@16.4.0, tsx@4.21.0, ioredis@5.10.1, typescript@6.0.2
- `.planning/research/STACK.md` — stack recomendada com rationale (pesquisa anterior do projeto)
- `.planning/research/ARCHITECTURE.md` — arquitetura três camadas, dois clients Supabase, worker separado
- `.planning/research/PITFALLS.md` — armadilhas críticas C1 (RLS bypass), C2 (RLS performance), C3 (LGPD), H1 (Supavisor), H8 (tenant middleware)
- `.planning/phases/01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics/01-CONTEXT.md` — decisões locked D-01 a D-37

### Secondary (MEDIUM confidence)
- [CITED: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook] — Custom Access Token Hook via Edge Function
- [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] — RLS policies e padrão de performance com `(SELECT auth.jwt()...)`

### Tertiary (LOW confidence)
- [ASSUMED] Detalhes de timeout de Edge Function e comportamento de cold start do Supabase em 2026 — verificar na documentação atual antes de implementar

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versões verificadas no npm registry em 2026-04-14
- Architecture patterns: HIGH — baseados em CONTEXT.md com decisões locked + pesquisa prévia do projeto
- Pitfalls: HIGH (C1 RLS bypass, C3 LGPD) / MEDIUM (Supavisor, hook timing) — combinação de documentação oficial e raciocínio técnico
- LGPD: MEDIUM — texto da lei estável, mas enforcement patterns em evolução

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 para versões de pacotes (npm muda rápido); padrões de arquitetura válidos por 6+ meses
