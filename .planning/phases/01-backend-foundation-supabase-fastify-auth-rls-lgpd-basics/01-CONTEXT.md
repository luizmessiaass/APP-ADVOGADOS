# Phase 1: Backend Foundation — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Construir a fundação do backend: API Fastify + TypeScript rodando contra Supabase, com autenticação multi-tenant bulletproof (JWT com tenant_id+role injetados via Custom Access Token Hook), Row Level Security em todas as tabelas, isolamento de dados por tenant testado em CI, e hooks LGPD/observabilidade básicos. Resultado: infraestrutura segura o suficiente para que nenhum trabalho downstream vaze dados entre tenants ou PII para logs.

**Não inclui:** endpoints de DataJud, Claude API, Stripe, ou qualquer UI Android.

</domain>

<decisions>
## Implementation Decisions

### Estrutura do Projeto

- **D-01:** Monorepo único — um repositório com todos os artefatos (backend Node.js, worker BullMQ, apps Android). Facilita CI unificado e PRs que tocam backend + Android juntos.
- **D-02:** Deploy no Railway — API e Worker como serviços Railway separados (não o mesmo processo). Secrets por serviço.
- **D-03:** Gerenciador de pacotes: Claude's Discretion (pnpm recomendado pela pesquisa para monorepos; se houver preferência diferente, usar aquela).

### Supabase Setup

- **D-04:** Supabase Cloud com dois projetos: `portaljuridico-dev` e `portaljuridico-prod`. Verificar se há região São Paulo (preferível para LGPD); se não, us-east-1 com disclosure na política de privacidade.
- **D-05:** Migrations gerenciadas via Supabase CLI + SQL puro (sem ORM). `supabase migration new` + `supabase db push`. SQL explícito para RLS policies — nenhuma abstração esconde as políticas de segurança.
- **D-06:** Supabase Realtime: não configurar em Phase 1. Notificações serão FCM + WorkManager (Phase 6).

### Modelo de Negócio — Decisão Crítica

**Revelado durante a discussão:** o produto é high-ticket com aprovação manual, não SaaS self-service com assinatura automática.

- **D-07:** Fluxo de tenant: escritório faz signup → status `pending` → admin (proprietário do produto) revisa e aprova → status `trial` ou `active`. Não há self-provisioning automático.
- **D-08:** Status do tenant: `pending` → `trial` → `active` → `suspended`. Enum no banco.
- **D-09:** Modelo de cobrança: projeto fechado, valor único negociado manualmente. Sem Stripe recorrente automático. O sistema apenas controla o `status` do tenant. **Implicação para Phase 7:** o plano de "Stripe Checkout + Customer Portal + webhooks" do ROADMAP.md precisa ser revisado — o Phase 7 provavelmente vira apenas um painel de gestão de status de tenants pelo admin.

### Autenticação & Multi-tenancy

- **D-10:** Custom Access Token Hook implementado como **Supabase Edge Function** — injetado automaticamente ao gerar tokens. Injeta `tenant_id` e `role` em `app_metadata` (nunca `user_metadata`).
- **D-11:** Roles no JWT: `admin_escritorio`, `advogado`, `cliente`. RLS policies distintas por role desde Phase 1.
- **D-12:** Cliente final criado via `supabase.auth.admin.inviteUserByEmail()` — Supabase envia magic link para o cliente criar própria senha. O advogado cadastra no sistema; o Supabase cuida do convite.
- **D-13:** Email transacional: **Resend** configurado como SMTP customizado no Supabase Auth. Domínio remetente a definir (usar domínio do produto em produção).

### Schema do Banco de Dados

- **D-14:** Nomenclatura: **português sem acentos** para nomes de tabelas e colunas. Ex: `escritorios`, `usuarios`, `processos`, `movimentacoes`, `tenant_id`, `created_at`. Exceção: campos técnicos herdados do Supabase Auth mantêm inglês.
- **D-15:** Primary keys: **UUID v4** (`gen_random_uuid()`) em todas as tabelas. Padrão nativo do Supabase.
- **D-16:** **Hard delete com cascade**. Sem `deleted_at`. O endpoint LGPD Art. 18 faz `DELETE ... CASCADE` explicitamente. Sem acúmulo de registros "lixo" no banco.
- **D-17:** Tabela `public.usuarios` sincronizada com `auth.users` via trigger — permite adicionar campos customizados (`cpf`, `tenant_id`, `role_local`) e fazer queries via PostgREST/RLS. Claude's Discretion: estrutura exata da tabela.
- **D-18:** Timestamps `created_at` + `updated_at` em todas as tabelas, via trigger `update_updated_at_column()`. Claude's Discretion: função trigger exata.

### API Design

- **D-19:** Versionamento com prefix `/api/v1/` desde Phase 1. Ex: `/api/v1/escritorios`, `/api/v1/auth/login`.
- **D-20:** Validação de schema com **TypeBox** (integração nativa Fastify, zero overhead de runtime, TypeScript types inferidos automaticamente).
- **D-21:** Formato de erro padrão: `{ success: false, error: "MENSAGEM_LEGIVEL", code: "ERROR_CODE" }`. Consistente em todos os endpoints.
- **D-22:** Rate limiting: Claude's Discretion (configurar `@fastify/rate-limit` com limites altos em Phase 1; limites específicos para Claude/DataJud definidos em Phase 2-3).

### LGPD Compliance (Phase 1 scope)

- **D-23:** Tabela separada `lgpd_consentimentos` com campos: `id`, `usuario_id`, `versao_termos`, `consentido_em`, `ip_origem`, `user_agent`, `revogado_em`. Suporta histórico completo para auditoria ANPD.
- **D-24:** Versão dos termos como **ISO date string** (ex: `"2026-04-14"`). Fácil comparar se o consentimento do usuário está desatualizado quando os termos mudarem.
- **D-25:** Política de privacidade hospedada em **URL web** (Notion público por enquanto, futura landing page do produto). App_cliente linka para URL externa — atualizável sem re-deploy.
- **D-26:** PII em logs: usar **`pino` `redact` option** — `redact: ['req.body.cpf', 'req.body.password', '*.cpf', '*.prompt_text']`. Zero-overhead, automático em todos os logs.

### Observabilidade

- **D-27:** Log level em produção: **`info`** — captura cada request com `tenant_id`, `user_id`, `request_id`, latência.
- **D-28:** Log agregado: **Betterstack (Logtail)** via `pino-logtail`. Free tier 1GB/mês. Log drain configurado desde o início.
- **D-29:** **Sentry** com um DSN compartilhado para API + Worker, diferenciados via tag `source: 'api' | 'worker'`.
- **D-30:** OpenTelemetry: diferir para Phase 8 (hardening). pino logs + Sentry suficientes nas primeiras fases.

### Worker BullMQ

- **D-31:** Entry point único `worker.ts` que instancia múltiplos BullMQ Worker consumers. Deploy como serviço Railway separado do servidor HTTP. Em Phase 1, registrar o worker com um job de health-check/placeholder (DataJud consumer chega em Phase 2).
- **D-32:** Redis: Docker Compose com `redis:alpine` para dev local + Upstash Redis para CI (GitHub Actions) e produção.
- **D-33:** Bull Board: diferir para Phase 2. Instalar quando os jobs DataJud existirem.

### CI/CD & Testes

- **D-34:** Framework de testes: **Vitest** (rápido, TypeScript nativo, compatível com Jest API).
- **D-35:** Cobertura: sem % mínimo. Gate CI: cross-tenant integration test deve passar (tenant A não consegue ler dados do tenant B via nenhum endpoint). Esse teste é obrigatório.
- **D-36:** Commit hooks: **Husky + lint-staged** — pre-commit roda ESLint + Prettier apenas nos arquivos staged.
- **D-37:** Branching: **GitHub Flow** — main + feature branches + PRs. CI em todos os PRs.

### Claude's Discretion

- Escolha final de pnpm vs npm (pnpm recomendado pela pesquisa)
- Estrutura exata dos módulos Gradle no monorepo Android (para Phase 0 — fora do escopo de Phase 1)
- Granularidade exata das RLS policies (ver pitfalls de segurança na pesquisa)
- Implementação do trigger `update_updated_at_column()`
- Configuração exata do Supavisor (transaction mode para REST)
- Rate limiting: limites numéricos iniciais

</decisions>

<specifics>
## Specific Ideas

- **Modelo high-ticket revelado:** "A ideia é ser algo high-ticket, não um produto por assinatura, tudo tem que ser baseado nisso." → Isso implica: aprovação manual de tenants, controle de status manual pelo admin, sem Stripe automático. O sistema é uma ferramenta premium que o dono gerencia ativamente.
- **Nomenclatura PT-BR:** Preferência explícita por português sem acentos nas tabelas/colunas.
- **Hard delete confirmado:** Preferência por simplicidade — sem soft delete overhead.

</specifics>

<canonical_refs>
## Canonical References

**Agentes downstream DEVEM ler esses arquivos antes de planejar ou implementar.**

### Projeto & Requisitos
- `.planning/PROJECT.md` — Context geral, core value, constraints, decisões-chave do projeto
- `.planning/REQUIREMENTS.md` §INFRA, §AUTH, §LGPD — Requisitos exatos mapeados nesta fase (INFRA-01..09, AUTH-01..09, LGPD-01/03/04/06)

### Roadmap & Estado
- `.planning/ROADMAP.md` §Phase 1 — Goal, success criteria, dependências desta fase
- `.planning/STATE.md` — Estado atual do projeto

### Pesquisa Técnica (LEITURA OBRIGATÓRIA para researcher e planner)
- `.planning/research/STACK.md` — Stack recomendada com versões, rationale, anti-patterns. Cobre Fastify 5, Supabase JS v2, BullMQ, jose, pino, TypeBox, Redis
- `.planning/research/ARCHITECTURE.md` — Arquitetura recomendada: três camadas, dois clientes Supabase, worker separado, multi-tenancy com shared schema + RLS
- `.planning/research/PITFALLS.md` §C1 (RLS bypass), §C2 (RLS performance), §C3 (LGPD), §H1 (Supabase pooler), §H8 (tenant middleware), §M4 (logging), §M9 (RLS missing tables) — Armadilhas críticas para esta fase
- `.planning/research/SUMMARY.md` §Recommended Stack (backend), §Critical Pitfalls (P1, P2), §Phase Order §Phase 1 — Síntese

### Mapa do Codebase Existente
- `.planning/codebase/STACK.md` — Stack atual do projeto Android (Kotlin 2.2.10, Compose BOM 2024.09.00, minSdk 27)
- `.planning/codebase/ARCHITECTURE.md` — Arquitetura atual: scaffold mínimo, sem business logic, single-module
- `.planning/codebase/CONCERNS.md` — Problemas identificados no codebase atual (package name com.example, minification desabilitada, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/src/main/java/com/example/appteste/ui/theme/` — Tema Material3 já configurado. Phase 1 é backend only — não toca este código. Android só entra em Phase 4+.

### Established Patterns
- Nenhum padrão de backend estabelecido ainda — tudo será criado em Phase 1.
- O projeto Android usa Kotlin 2.2.10 + Compose BOM 2024.09.00 — ambos serão atualizados em Phase 0 (antes desta fase).

### Integration Points
- Phase 1 cria a API que os apps Android (Phase 4 e 5) vão consumir. Os endpoints definidos aqui são o contrato que os apps devem seguir.
- Phase 2 (DataJud) adiciona consumers ao worker BullMQ criado aqui.
- Phase 3 (Claude) adiciona endpoints de tradução ao servidor Fastify criado aqui.

</code_context>

<deferred>
## Deferred Ideas

- **Stripe billing automático (Phase 7 revisão):** Modelo high-ticket com aprovação manual muda significativamente o Phase 7. Em vez de Stripe Checkout + Customer Portal automáticos, Phase 7 provavelmente vira um painel de gestão de tenants pelo admin com controle manual de status. Investigar na discuss-phase 7.
- **Roles distintos admin_escritorio vs advogado (RLS diferenciado):** Criar os dois roles em Phase 1, mas diferenciação granular de permissões pode ser refinada em Phase 4 (app_escritorio) quando a UI tornar as diferenças concretas.
- **Supabase Realtime:** Não em Phase 1. Avaliar em Phase 6 (notificações) se FCM + WorkManager for insuficiente.
- **OpenTelemetry/tracing:** Diferido para Phase 8 (hardening).
- **Bull Board:** Diferido para Phase 2 (quando jobs DataJud existirem).
- **Multi-região / DR:** Diferido para after-launch quando houver clientes reais.

</deferred>

---

*Phase: 01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics*
*Context gathered: 2026-04-14*
