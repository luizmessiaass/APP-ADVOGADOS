---
phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics
verified: 2026-04-15T06:00:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Cross-tenant gate executa com banco Supabase real no CI"
    expected: "Após configurar GitHub Secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, REDIS_URL), o job 'test' no GitHub Actions deve ficar verde — especificamente cross-tenant.test.ts deve executar os 3 testes de integração (não pular com skip gracioso) e provar isolamento RLS com dados reais."
    why_human: "O teste cross-tenant tem skip gracioso quando SUPABASE_URL == 'https://test.supabase.co' (valor padrão local). Sem os GitHub Secrets configurados, o CI ainda passa mas os testes pulam — o gate só é validado quando os secrets estiverem no repositório. Não é possível verificar programaticamente se os secrets já foram adicionados."
  - test: "Supabase db push aplicado e tabelas existem no cloud"
    expected: "No Supabase Dashboard, tabelas escritorios, usuarios e lgpd_consentimentos devem existir com as constraints e indexes corretos. A SUMMARY confirma execução ('Remote database is up to date'), mas verificação visual no Dashboard é necessária para confirmar estado atual do banco."
    why_human: "Não é possível verificar o estado do banco Supabase Cloud programaticamente a partir do repo — requer acesso ao Dashboard ou credenciais de banco que não estão no repo."
---

# Phase 1: Backend Foundation Verification Report

**Phase Goal:** A Fastify + TypeScript API running against Supabase provides multi-tenant authentication, bulletproof Row Level Security, and baseline LGPD/observability hooks — enough infrastructure that no downstream feature work can accidentally leak data across tenants or leak PII to logs.

**Verified:** 2026-04-15T06:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fastify server starts com env vars validados, logs pino estruturados com tenant_id/user_id/request_id, Sentry attached | VERIFIED | `apps/api/src/server.ts` exporta `buildApp()` com `cleanEnv()` via `config.ts`; pino `redact` configurado; Sentry plugin com `source=api`; `req.tenantLogger` child logger em `auth.ts` com `tenant_id`, `user_id`, `request_id` |
| 2 | Admin escritório e cliente final podem se cadastrar/logar via Supabase Auth e receber JWT com tenant_id e role em app_metadata | VERIFIED | `apps/api/src/routes/auth/index.ts` implementa signup/escritorio + login/logout/invite; Edge Function `custom-access-token/index.ts` injeta `tenant_id` e `role` em `app_metadata` (busca de `public.usuarios`); SMTP Resend configurado (human-verified em 01-03) |
| 3 | CI integration test prova que tenant A não consegue ler dados do tenant B (cross-tenant leak gate passes) | PARTIAL | `apps/api/src/tests/cross-tenant.test.ts` (184 linhas) tem implementação completa com 3 testes de integração, cleanup, assertions reais. Testes pulam graciosamente sem credenciais reais. GitHub Actions CI workflow existe com secrets referenciados — mas GitHub Secrets (SUPABASE_URL, REDIS_URL etc.) ainda pendentes de configuração manual conforme 01-07-SUMMARY.md. Gate só funciona quando secrets estiverem no repositório. |
| 4 | /health endpoint reporta status de Supabase, Redis e DataJud; BullMQ worker inicia como processo separado | VERIFIED | `apps/api/src/routes/health.ts` verifica 3 deps com 503 em degradação; `apps/worker/src/worker.ts` é processo separado com Redis `maxRetriesPerRequest: null`, graceful shutdown, `railway.toml` define 2 serviços |
| 5 | LGPD consent records persist opt-in com timestamp e versão de termos; logs e payloads Claude não contêm CPF/PII | VERIFIED | `lgpd_consentimentos` table em 0003 com `versao_termos`, `ip_origem`, `consentido_em`, `revogado_em`; `apps/api/src/routes/lgpd/index.ts` POST insere via RLS; pino `redact` com `*.cpf`, `*.senha`, `*.prompt_text`, `req.headers.authorization` configurado por construção em `server.ts`; 4 testes de PII redaction passando |

**Score:** 4/5 truths verified (truth #3 parcialmente verificada — código correto, execução CI com banco real pendente de configuração de secrets)

### Deferred Items

Nenhum item identificado como adiado para fases posteriores — todos os itens pendentes são requisitos de configuração de infraestrutura da própria Phase 1.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `pnpm-workspace.yaml` | Workspace root | VERIFIED | Existe, inclui `apps/*` e `supabase/functions/*` |
| `apps/api/package.json` | Deps API com versões corretas | VERIFIED | Fastify 5.8.5, supabase-js 2.103.0, jose 6.2.2, BullMQ 5.73.5, pino 10.3.1, Sentry 10.48.0, envalid 8.1.1 |
| `apps/api/src/config.ts` | Validação de env vars via envalid | VERIFIED | `cleanEnv()` com 9 variáveis + PRIVACY_POLICY_URL; fail-fast na boot |
| `apps/worker/package.json` | Deps do worker BullMQ | VERIFIED | BullMQ 5.73.5, ioredis, Sentry, envalid |
| `backend/vitest.config.ts` | Config de testes Wave 0 | VERIFIED | `include: apps/api/src/**/*.test.ts`, setupFiles, aliases |
| `supabase/config.toml` | Config Supabase CLI | VERIFIED | Existe, project_id=portaljuridico |
| `supabase/migrations/0001_create_escritorios.sql` | Tabela escritorios | VERIFIED | UUID PK, status CHECK, timestamps |
| `supabase/migrations/0002_create_usuarios.sql` | Tabela usuarios | VERIFIED | FK auth.users CASCADE, tenant_id FK, role_local CHECK, idx_usuarios_tenant |
| `supabase/migrations/0003_create_lgpd_consentimentos.sql` | Tabela lgpd_consentimentos | VERIFIED | versao_termos, ip_origem inet, revogado_em nullable, idx_lgpd_usuario |
| `supabase/migrations/0004_rls_policies.sql` | RLS policies | VERIFIED | 3x ENABLE ROW LEVEL SECURITY, 0x USING(true), 13 referencias app_metadata; políticas distintas por role |
| `supabase/migrations/0005_triggers.sql` | Triggers updated_at + sync | VERIFIED | update_updated_at_column(), sync_auth_user_to_public() SECURITY DEFINER, ON CONFLICT DO NOTHING |
| `supabase/functions/custom-access-token/index.ts` | Edge Function JWT hook | VERIFIED | Deno.serve, busca public.usuarios com service_role, injeta em app_metadata (nunca user_metadata), tratamento gracioso de usuário não encontrado |
| `apps/api/src/server.ts` | buildApp factory | VERIFIED | Logger pino com redact, helmet, rate-limit, sentryPlugin, authPlugin, todas as rotas registradas |
| `apps/api/src/lib/supabase.ts` | Dois clientes Supabase | VERIFIED | supabaseAdmin (service_role) + supabaseAsUser(jwt) (RLS enforced) |
| `apps/api/src/lib/redis.ts` | Clientes Redis | VERIFIED | createRedisClient (maxRetries=3) + createBullMQRedisClient (maxRetries=null) |
| `apps/api/src/plugins/auth.ts` | Auth middleware | VERIFIED | JWKS singleton, preHandler com 401/403 codes corretos, req.user + req.tenantLogger decorados |
| `apps/api/src/plugins/sentry.ts` | Sentry plugin | VERIFIED | sendDefaultPii=false, source=api, onError com contexto de tenant |
| `apps/api/src/routes/auth/index.ts` | 4 endpoints auth | VERIFIED | signup/escritorio, login, logout, invite com TypeBox, tenant_id nos metadados do invite, rollback manual |
| `apps/api/src/routes/lgpd/index.ts` | Endpoints LGPD | VERIFIED | POST + GET /consentimento com RLS, ip_origem, user_agent, privacy_policy_url |
| `apps/api/src/routes/health.ts` | GET /health | VERIFIED | 3 checks (Supabase, Redis, DataJud), 200/503, AbortSignal.timeout(3s), skipAuth: true |
| `apps/worker/src/worker.ts` | Entry point worker | VERIFIED | Processo separado, maxRetriesPerRequest: null, Sentry source=worker, graceful shutdown SIGTERM/SIGINT |
| `apps/worker/src/queues/health-check.ts` | Placeholder BullMQ job | VERIFIED | Intencional Phase 1 — worker como processo separado confirmado, consumer DataJud chega em Phase 2 |
| `apps/api/src/tests/cross-tenant.test.ts` | Gate cross-tenant AUTH-06 | VERIFIED | 184 linhas, implementação completa (não stub), 3 testes de integração com banco real, skip gracioso sem credenciais, cleanup no afterAll |
| `apps/api/src/tests/lgpd.test.ts` | Gate PII redaction LGPD-04 | VERIFIED | 128 linhas, 4 testes deterministas, pino stream em memória, CPF mascarado e numérico cobertos |
| `.github/workflows/ci.yml` | CI/CD pipeline | VERIFIED | Jobs test (typecheck + vitest) + lint, Node 22, pnpm 10.33.0, --frozen-lockfile, secrets referenciados |
| `railway.toml` | Deploy config | VERIFIED | 2 serviços separados (api + worker), healthcheckPath /health, restartPolicy |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/src/server.ts` | `apps/api/src/config.ts` | `import { env }` | WIRED | Linha 4 do server.ts |
| `apps/api/src/plugins/auth.ts` | `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` | `createRemoteJWKSet` | WIRED | Singleton JWKS na linha 13 de auth.ts |
| `apps/api/src/routes/auth/index.ts` | `supabase.auth.admin.inviteUserByEmail` | `tenant_id: req.user.tenant_id` | WIRED | Linha 153 de auth/index.ts — Pitfall 6 prevenido |
| `apps/api/src/routes/lgpd/index.ts` | `public.lgpd_consentimentos` | `supabaseAsUser(jwt).from('lgpd_consentimentos').insert()` | WIRED | Lines 24-31 de lgpd/index.ts com RLS enforced |
| `supabase/functions/custom-access-token/index.ts` | `public.usuarios` | `.from('usuarios').select('tenant_id, role_local').eq('id', user_id)` | WIRED | Linha 34-38 da Edge Function |
| `auth.jwt() em RLS policies` | `custom-access-token/index.ts` | `app_metadata.tenant_id injetado pelo hook` | WIRED | 13 referências `app_metadata` em 0004_rls_policies.sql |
| `apps/api/src/tests/cross-tenant.test.ts` | `supabase/migrations/0004_rls_policies.sql` | `RLS policy impede query cross-tenant` | WIRED | Assertions `expect(data).toHaveLength(0)` em linhas 162-163, 181-182 |
| `apps/worker/src/worker.ts` | `ioredis (REDIS_URL)` | `maxRetriesPerRequest: null` | WIRED | Linha 31 de worker.ts — configuração BullMQ obrigatória |
| `apps/api/src/routes/health.ts` | `supabaseAdmin.from('escritorios')` | `ping de conectividade` | WIRED | Linhas 22-27 de health.ts |
| `.github/workflows/ci.yml` | GitHub Secrets (SUPABASE_URL, REDIS_URL) | `env: ${{ secrets.* }}` | WIRED (código) / PENDENTE (configuração) | Arquivo CI correto; secrets ainda não configurados no repositório GitHub per 01-07-SUMMARY |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `routes/lgpd/index.ts` | `data.id` (consentimento_id) | `db.from('lgpd_consentimentos').insert()` com supabaseAsUser | Sim — INSERT real no Supabase com RLS | FLOWING |
| `routes/auth/index.ts` | `escritorio.id` | `supabaseAdmin.from('escritorios').insert()` | Sim — INSERT real no Supabase | FLOWING |
| `routes/health.ts` | `checks.supabase`, `checks.redis`, `checks.datajud` | query Supabase + Redis ping + fetch DataJud | Sim — 3 checks reais com AbortSignal | FLOWING |
| `plugins/auth.ts` | `req.user` | JWT verificado via JWKS, app_metadata.tenant_id | Sim — JWT real verificado criptograficamente | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| server.ts exporta buildApp | `grep "export function buildApp" apps/api/src/server.ts` | 1 match | PASS |
| pino redact configurado por construção | `grep "REDACTED\|redact" apps/api/src/server.ts` | paths cpf, senha, prompt_text, authorization | PASS |
| worker.ts sem imports de apps/api | `grep "from.*apps/api" apps/worker/src/worker.ts` | 0 matches | PASS |
| maxRetriesPerRequest: null no worker | `grep "maxRetriesPerRequest: null" apps/worker/src/worker.ts` | 1 match linha 31 | PASS |
| RLS sem USING(true) | `grep -c "USING (true)" supabase/migrations/0004_rls_policies.sql` | 0 | PASS |
| 3 tabelas com RLS habilitada | `grep -c "ENABLE ROW LEVEL SECURITY" 0004_rls_policies.sql` | 3 | PASS |
| CI com --frozen-lockfile | `grep "frozen-lockfile" .github/workflows/ci.yml` | presente | PASS |
| lgpd test sem STUB | `grep "STUB" apps/api/src/tests/lgpd.test.ts` | 0 matches | PASS |
| cross-tenant test com assertions reais | `grep "expect(data).toHaveLength(0)" cross-tenant.test.ts` | 2 matches | PASS |

### Requirements Coverage

| Requirement | Plano | Descrição | Status | Evidência |
|-------------|-------|-----------|--------|-----------|
| INFRA-01 | 01-01 | Node.js/TypeScript com Fastify + hot-reload + script de build | SATISFIED | `apps/api/package.json` scripts: dev (tsx watch), build (tsc), start |
| INFRA-02 | 01-02 | Supabase CLI + migrations versionadas | SATISFIED | `supabase/config.toml` + 5 migrations em `supabase/migrations/` |
| INFRA-03 | 01-02 | Supavisor configurado | SATISFIED | Supabase Cloud usa Supavisor por padrão; `supabase db push` executado conforme 01-07-SUMMARY |
| INFRA-04 | 01-01 | Env vars sensíveis via `.env` com validação na inicialização | SATISFIED | `apps/api/src/config.ts` com `cleanEnv()` — fail-fast na boot |
| INFRA-05 | 01-07 | CI/CD GitHub Actions em cada push | SATISFIED (código) / PENDENTE (execução) | `.github/workflows/ci.yml` existe e correto; secrets pendentes de configuração manual |
| INFRA-06 | 01-04 | Logs pino com tenant_id, user_id, request_id | SATISFIED | `req.tenantLogger` child logger em `auth.ts` linha 68-72; `genReqId: crypto.randomUUID()` em `server.ts` |
| INFRA-07 | 01-04 | Sentry configurado com contexto de tenant | SATISFIED | `plugins/sentry.ts` com `sendDefaultPii=false`, `source=api`, onError com tenant_id |
| INFRA-08 | 01-06 | Health endpoint com status Supabase, Redis, DataJud | SATISFIED | `routes/health.ts` com 3 checks, 200/503, AbortSignal.timeout(3s) |
| INFRA-09 | 01-06 | Worker BullMQ como processo separado | SATISFIED | `apps/worker/src/worker.ts` — processo Railway separado, sem imports de apps/api |
| AUTH-01 | 01-05 | Escritório cria conta e faz login | SATISFIED | POST /api/v1/auth/signup/escritorio + POST /api/v1/auth/login |
| AUTH-02 | 01-05 | Cliente final faz login | SATISFIED | POST /api/v1/auth/login (supabaseAdmin.auth.signInWithPassword) |
| AUTH-03 | 01-03 | JWT contém tenant_id e role em app_metadata | SATISFIED | Edge Function `custom-access-token/index.ts` deployada e hook ativo (human-verified) |
| AUTH-04 | 01-04 | Middleware extrai tenant_id do JWT e rejeita sem contexto válido | SATISFIED | `plugins/auth.ts` — MISSING_TOKEN (401), INVALID_TOKEN (401), NO_TENANT_CONTEXT (403) |
| AUTH-05 | 01-02 | RLS ativa em todas as tabelas com dados por tenant | SATISFIED | 3x ENABLE ROW LEVEL SECURITY em 0004; escritorios, usuarios, lgpd_consentimentos |
| AUTH-06 | 01-08 | Teste de integração cross-tenant no CI como gate | NEEDS HUMAN | Código completo (184 linhas, 3 testes reais); necessita execução CI com GitHub Secrets configurados |
| AUTH-07 | 01-02 | Roles admin_escritorio, advogado, cliente com RLS distintas | SATISFIED | 4 políticas separadas em `usuarios` por operação e role |
| AUTH-08 | 01-03 | Cliente recebe email com credenciais quando cadastrado | SATISFIED | SMTP Resend configurado (human-verified); `/invite` chama `inviteUserByEmail` |
| AUTH-09 | 01-05 | Usuário faz logout e sessão é invalidada | SATISFIED | POST /api/v1/auth/logout com `supabaseAsUser(jwt).auth.signOut()` |
| LGPD-01 | 01-02, 01-05 | Tabela de consentimento registra opt-in com timestamp e versão | SATISFIED | `lgpd_consentimentos` (migration 0003) + POST /api/v1/lgpd/consentimento |
| LGPD-03 | 01-04 | CPF não incluído em prompts para Claude (data minimization) | SATISFIED | pino `redact` com `*.cpf`, `*.prompt_text` por construção em `server.ts`; CPF nunca sai dos endpoints |
| LGPD-04 | 01-08 | Logs não registram CPF ou conteúdo bruto de prompts | SATISFIED | 4 testes de PII redaction passando (lgpd.test.ts) — CPF mascarado E numérico cobertos |
| LGPD-06 | 01-05 | Política de privacidade menciona Anthropic como sub-processador (Art. 33) | PARTIAL | `privacy_policy_url` presente em respostas de auth e LGPD; mas a URL aponta para `https://notion.so/portaljuridico-privacidade` (padrão). A política em si (documento externo) precisa mencionar Anthropic — verificação visual necessária. |

### Anti-Patterns Found

| File | Linha | Pattern | Severidade | Impacto |
|------|-------|---------|------------|---------|
| `apps/worker/src/queues/health-check.ts` | 18-25 | `console.log` no processador de job; comentário "Placeholder" | INFO | Intencional em Phase 1 — substituído em Phase 2 por DataJud worker. Não bloqueia o objetivo de ter worker como processo separado. |
| `apps/api/src/config.ts` | 12 | `PRIVACY_POLICY_URL` default aponta para Notion | INFO | URL de desenvolvimento — deve ser atualizada antes de produção. Não é bloqueador para Phase 1. |

Nenhum anti-pattern bloqueador identificado. Nenhum stub em código de produção (os únicos stubs originais foram substituídos em Plan 08).

### Human Verification Required

#### 1. Cross-Tenant Gate executa no CI com banco real

**Test:** Configurar os GitHub Secrets no repositório (Settings → Secrets → Actions): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`. Em seguida, fazer um push para `main` e verificar que o job `test` fica verde no GitHub Actions — especificamente que `cross-tenant.test.ts` exibe 3 testes passando (sem "pulando testes de integração" no stderr).

**Expected:** O output do CI deve mostrar:
```
Cross-Tenant Security Gate (AUTH-06) > tenant A nao consegue ler o escritorio do tenant B via API endpoint
Cross-Tenant Security Gate (AUTH-06) > tenant A nao consegue ler usuarios do tenant B via query Supabase com seu JWT
Cross-Tenant Security Gate (AUTH-06) > tenant A nao consegue ler o escritorio do tenant B via query Supabase direta
```

**Why human:** Não é possível verificar se os GitHub Secrets foram configurados nem se o CI passou sem acesso ao repositório GitHub. O código está correto — a execução depende de configuração de infraestrutura externa.

#### 2. Tabelas existem no Supabase Cloud com schema correto

**Test:** Acessar Supabase Dashboard → Table Editor e confirmar que `escritorios`, `usuarios`, e `lgpd_consentimentos` existem com as colunas corretas (especialmente `lgpd_consentimentos.ip_origem` como type `inet` e `revogado_em` nullable).

**Expected:** 3 tabelas presentes, RLS visível como "habilitado" no Table Editor, indexes `idx_usuarios_tenant` e `idx_lgpd_usuario` visíveis.

**Why human:** O `supabase db push` foi executado e reportou "Remote database is up to date" (01-07-SUMMARY), mas a verificação visual do estado atual do banco cloud não pode ser feita programaticamente a partir do repositório.

#### 3. Política de privacidade menciona Anthropic como sub-processador (LGPD-06 — Art. 33)

**Test:** Acessar a URL referenciada em `PRIVACY_POLICY_URL` (ou a URL de produção configurada) e confirmar que o documento menciona explicitamente a Anthropic como sub-processador internacional de dados nos termos do Art. 33 da LGPD.

**Expected:** Documento de privacidade contém seção sobre sub-processadores internacionais nomeando a Anthropic (Claude API).

**Why human:** O código emite corretamente a `privacy_policy_url` nas respostas (LGPD-06 parcialmente satisfeito no código), mas o conteúdo do documento externo não pode ser verificado programaticamente.

---

## Gaps Summary

Nenhum gap bloqueador foi identificado. O código está completo e correto para todos os 5 critérios de sucesso da Phase 1. Os itens classificados como `human_needed` são:

1. **Execução real do gate cross-tenant no CI** (AUTH-06): o teste está implementado e correto, mas precisa de GitHub Secrets configurados para executar contra o banco Supabase real. Esta é uma questão de configuração de infraestrutura, não de código.

2. **Verificação visual do schema no Supabase Cloud**: o `supabase db push` foi executado com sucesso (reportado em 01-07-SUMMARY), mas confirmação visual é boa prática antes de declarar Phase 1 completa.

3. **Conteúdo da política de privacidade**: o código referencia corretamente a URL da política (LGPD-06), mas o documento em si precisa mencionar a Anthropic como sub-processador (Art. 33 LGPD) — requisito de conteúdo, não de código.

**Recomendação:** Configurar os GitHub Secrets e verificar que o primeiro push para `main` resulta em CI verde com cross-tenant tests executando (não pulando). Após isso, a Phase 1 pode ser considerada completa para fins de progressão para a Phase 2.

---

_Verified: 2026-04-15T06:00:00Z_
_Verifier: Claude (gsd-verifier)_
