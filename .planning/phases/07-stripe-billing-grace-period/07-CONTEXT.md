# Phase 7: Billing & Grace Period - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Implementar a infraestrutura de controle de assinatura dos escritórios, **independente do provider de pagamento** (a escolha entre Stripe, Asaas, Pix, ou outro fica para quando o modelo comercial for definido):

1. **Entitlement middleware** — bloqueia endpoints protegidos para tenants suspensos (HTTP 402)
2. **Grace period state machine** — Dia 0 (email) → Dia 3 (banner) → Dia 7 (read-only) → Dia 14 (suspended), avançado por cron job BullMQ diário
3. **Webhook receiver genérico** — endpoint que aceita eventos de qualquer payment provider para iniciar/resolver grace period
4. **Admin panel de tenants** — endpoints REST protegidos por role `super_admin` para gerenciar status de escritórios manualmente
5. **App Android UX** — banner progressivo no `app_cliente` e `app_escritorio` durante grace period + tela de suspensão no Dia 14

**Não inclui:** integração com provider de pagamento específico (Stripe Checkout, Asaas, etc.), Customer Portal, ou qualquer UI de checkout/pagamento. Isso vem em fase separada quando o método de cobrança for definido.

**Nota importante:** Phase 1 D-09 decidiu que o modelo de cobrança é manual e negociado. Esta fase respeita isso — o sistema controla `status` do tenant, a cobrança acontece fora da plataforma até que um provider seja escolhido.

</domain>

<decisions>
## Implementation Decisions

### Billing Model

- **D-01:** Método de pagamento **em aberto** — pode ser Stripe, Asaas, API bancária, ou outro. Phase 7 implementa infra **independente de provider**: entitlement middleware + grace period state machine + painel admin + webhook receiver genérico. Stripe pode ser plugado depois sem mudar a lógica de negócio.

### Admin Panel de Tenants

- **D-02:** Gestão de status de escritórios via **endpoints REST protegidos por role `super_admin`** no JWT. Operações: listar tenants, alterar status, iniciar/resolver grace period manualmente. Para operações ad-hoc simples, o admin pode usar o Supabase Studio diretamente (SQL editor). Sem frontend web dedicado em v1.
- **D-03:** O super admin é identificado por **role `super_admin`** no JWT, injetado pelo Custom Access Token Hook (extensão de D-10/D-11 de Phase 1). Um usuário Supabase específico recebe esse role via configuração.

### Entitlement Middleware

- **D-04:** Regra de acesso por status do tenant:
  - `pending` / `trial` / `active` → acesso total a todos os endpoints
  - `grace` (Dias 0-6) → acesso total (apenas informativo — banner, email)
  - `read_only` (Dias 7-13) → endpoints de leitura liberados; endpoints de escrita bloqueados com HTTP 402
  - `suspended` (Dia 14+) → todos os endpoints de dados bloqueados com HTTP 402
  - Dados **nunca deletados** por suspensão (BILLING-07 mantido)
- **D-05:** Resposta de endpoint bloqueado: **HTTP 402** + JSON `{ "error": "subscription_required", "tenant_status": "suspended", "message": "Assinatura suspensa. Entre em contato com o Portal Jurídico." }`.

### Grace Period State Machine

- **D-06:** Grace period **iniciado por webhook** de payment provider — endpoint genérico `POST /api/webhooks/billing` que aceita um evento `payment.failed` (formato abstrato, adaptável para qualquer provider). Ao receber o evento, registra `grace_period_started_at` no tenant e muda status para `grace`. Admin também pode iniciar manualmente via endpoint admin.
- **D-07:** Progressão por **cron job BullMQ diário** (roda 1x/dia às 09:00 BRT). Calcula `dias = agora - grace_period_started_at` e avança para o próximo estágio, disparando a ação correspondente. Consistente com o worker BullMQ já existente (Phase 1/2).
- **D-08:** Estágios e ações do grace period:
  - **Dia 0:** status → `grace`; ação → email transacional via Resend para o admin do escritório ("Pagamento pendente. Regularize em 14 dias para evitar suspensão.")
  - **Dia 3:** ação → set flag `grace_banner: true` no tenant record; app Android começa a exibir banner
  - **Dia 7:** status → `read_only`; ação → email de lembrete ("7 dias. Funcionalidades de escrita desativadas.")
  - **Dia 14:** status → `suspended`; ação → email de suspensão ("Conta suspensa. Dados preservados. Regularize para reativar.")
  - **Resolução:** webhook `payment.succeeded` ou admin endpoint → status volta para `active`, `grace_period_started_at` zerado, flag `grace_banner` false

### App Android — UX de Suspensão

- **D-09:** **app_cliente** durante grace period e suspensão:
  - Dias 3-13 (flag `grace_banner: true`): **banner amarelo/laranja** no topo da Lista de Processos: *"Escritório com pagamento pendente. Contate seu advogado."*
  - Dia 14+ (status `suspended`): **tela bloqueada** substituindo a Lista de Processos com a mesma mensagem + botão *"Falar com meu advogado"* via WhatsApp (reutiliza lógica de Phase 5)
  - Dias 0-2: app funciona normalmente sem aviso ao cliente
- **D-10:** **app_escritorio** durante grace period e suspensão:
  - Dia 3+ (flag `grace_banner: true`): **banner vermelho** no topo com countdown: *"Assinatura vence em X dias. Regularize para evitar bloqueio."*
  - Dia 7+ (status `read_only`): funcionalidades de escrita **desabilitadas** (cadastrar cliente, enviar mensagem, sincronizar processo) — botões desabilitados com tooltip "Conta em modo leitura"
  - Dia 14+ (status `suspended`): **tela de suspensão** com mensagem de contato para regularizar (substitui tela inicial do app_escritorio)

### Como o App Detecta o Status

- **D-11:** O status do tenant e o flag `grace_banner` são retornados em um **endpoint dedicado** `GET /api/tenant/status` consultado pelo app no login e em background periódico (a cada 30 minutos via WorkManager — extensão do D-09 de Phase 6). Não injetado no JWT para evitar tokens stale.

### Claude's Discretion

- Schema exato da tabela `billing_events` (log de webhooks + grace period transitions)
- Estrutura do endpoint `POST /api/webhooks/billing` (validação de payload, autenticação do provider)
- Nomes exatos dos endpoints admin (ex: `PATCH /api/admin/tenants/:id/status`)
- Detalhes do email transacional Resend (template, assunto, HTML)
- Estratégia de retry do cron job BullMQ em caso de falha parcial (ex: email enviado mas status não atualizado)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements desta Fase
- `.planning/REQUIREMENTS.md` §"Stripe Billing (BILLING)" — BILLING-01 a BILLING-07 são os critérios de aceitação (adaptados para provider-agnostic)
- `.planning/ROADMAP.md` §"Phase 7: Stripe Billing & Grace Period" — goal, success criteria, dependências

### Decisões Anteriores Relevantes
- `.planning/phases/01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics/01-CONTEXT.md` — D-07 (tenant status enum), D-08 (status: pending/trial/active/suspended), D-09 (modelo manual), D-10 (Custom Access Token Hook), D-11 (roles JWT), D-19 (prefix /api/v1/), D-27 (log level), D-28 (Betterstack), D-29 (Sentry)
- `.planning/phases/04-android-app-fluxo-advogado/04-CONTEXT.md` — plan 04-06 (botão "Gerenciar assinatura" via Chrome Custom Tabs — revisar behavior para Phase 7)
- `.planning/phases/06-push-notifications-in-app-center/06-CONTEXT.md` — D-09 (WorkManager 15min poll — extender para poll de tenant status)

### Projeto e Contexto Geral
- `.planning/PROJECT.md` — Core value, constraints, modelo B2B
- `.planning/REQUIREMENTS.md` — BILLING-07: tenant data never deleted on suspension

No external specs além dos acima — decisões completamente capturadas neste documento.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BullMQ worker** (Phase 1/2) — cron job diário de grace period é um novo job no worker existente
- **Resend email** (Phase 1 D-13) — emails transacionais de grace period usam o mesmo SMTP customizado
- **Custom Access Token Hook** (Phase 1) — adicionar role `super_admin` para o admin do sistema
- **Tenant middleware** (Phase 1 D-04) — entitlement middleware é uma extensão do tenant middleware existente
- **WorkManager** (Phase 6 D-09) — poll periódico de tenant status reutiliza a infra de WorkManager do Phase 6
- **WhatsApp deep-link** (Phase 5) — botão "Falar com meu advogado" no app_cliente suspenso reutiliza a lógica de Phase 5
- **Chrome Custom Tabs** (Phase 4 plan 04-06) — botão "Gerenciar assinatura" no app_escritorio já planejado; behavior a redefinir (contato em vez de Customer Portal por enquanto)

### Established Patterns
- Status enum no banco: `pending → trial → active → grace → read_only → suspended` (extensão de Phase 1 D-07/D-08)
- Timestamps `created_at` + `updated_at` + trigger em todas as tabelas novas (Phase 1 D-18)
- UUID v4 como PK (Phase 1 D-15)
- Nomenclatura: português sem acentos para tabelas/colunas (Phase 1 D-14)
- Prefixo `/api/v1/` em todos os endpoints (Phase 1 D-19)

### Integration Points
- **Tenant middleware** → entitlement check se encaixa como segundo middleware Fastify após o tenant context middleware
- **Worker BullMQ** → novo job `grace-period-check` agendado com cron `0 9 * * *` (09:00 BRT)
- **app_escritorio** `ClienteListScreen` → banner vermelho injetado condicionalmente no topo do Scaffold
- **app_cliente** `ProcessoListScreen` → banner amarelo/laranja + tela de suspensão substitui a lista

</code_context>

<specifics>
## Specific Ideas

- O webhook receiver `POST /api/webhooks/billing` deve ser **provider-agnóstico**: aceita um payload mínimo `{ event: "payment.failed" | "payment.succeeded", tenant_id: string }`. Cada provider futuro terá um adapter que normaliza o payload para esse formato.
- O flag `grace_banner` no tenant record evita que o app precise calcular dias — apenas verifica o flag booleano.
- O botão "Gerenciar assinatura" no app_escritorio (plan 04-06) deve abrir, por enquanto, um **link de contato** (email/WhatsApp do suporte) em vez do Stripe Customer Portal. O Chrome Custom Tabs já está implementado — apenas trocar a URL de destino.

</specifics>

<deferred>
## Deferred Ideas

- **Stripe Checkout + Customer Portal** — a integração com Stripe (ou outro provider) fica para uma fase separada quando o modelo comercial for definido. Phase 7 prepara a infra para receber qualquer provider via webhook.
- **Limites de trial** (ex: max N clientes em trial) — versão mais simples mantém trial = acesso total. Limites podem ser adicionados em v2.
- **Dashboard de métricas de billing** (MRR, churn, tenants por status) — útil mas não blocking para launch. Fase 8 ou milestone futuro.
- **Self-service checkout** (escritório assina sem contato humano) — aguarda definição do provider de pagamento.

</deferred>

---

*Phase: 07-stripe-billing-grace-period*
*Context gathered: 2026-04-16*
