# Phase 7: Billing & Grace Period - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 07-stripe-billing-grace-period
**Areas discussed:** Billing model (pre-discussion), Admin panel de tenants, Entitlement middleware, Grace period state machine, App Android UX

---

## Billing Model (pre-discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe completo | Reverter D-09 e implementar Stripe Checkout, Customer Portal, webhooks | |
| Admin dashboard manual | Manter D-09: painel admin simples sem Stripe | |
| Infra independente de provider | Entitlement + grace period + webhook genérico; provider definido depois | |

**User's choice:** O método de pagamento está em aberto — pode ser Stripe, Asaas, API bancária, ou outro. Deixar em aberto para decidir depois.

**Follow-up:** Dado isso, Phase 7 entrega infra independente de provider.

---

## Admin Panel de Tenants

| Option | Description | Selected |
|--------|-------------|----------|
| Endpoints API + Supabase Studio | Endpoints REST com role super_admin; Supabase Studio para ops simples | ✓ |
| Painel web simples | Tela web para listar escritórios e trocar status | |
| Supabase Studio apenas | Admin edita direto no banco via Studio | |

**User's choice:** Endpoints API + Supabase Studio

---

| Option | Description | Selected |
|--------|-------------|----------|
| Role no JWT | Role 'super_admin' via Custom Access Token Hook | ✓ |
| Env var com user ID | SUPER_ADMIN_USER_ID no .env | |
| Header secret | X-Admin-Secret no header | |

**User's choice:** Role no JWT

---

## Entitlement Middleware

| Option | Description | Selected |
|--------|-------------|----------|
| trial/active = acesso total; suspended = bloqueado | Trial e active acessam tudo; suspended bloqueia | ✓ |
| trial = acesso limitado; active = acesso total | Trial com limites de clientes/processos | |
| Todos acessam; só suspended bloqueia | Grace period informativo até Dia 14 | |

**User's choice:** trial/active = acesso total; suspended = bloqueado (com read-only no Dia 7)

---

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP 402 + JSON com motivo | { error: 'subscription_required', status, message } | ✓ |
| HTTP 403 + JSON com motivo | { error: 'access_denied', status } | |
| HTTP 200 com campo de erro | Retorna 200 com { data: null, error: 'suspended' } | |

**User's choice:** HTTP 402 + JSON com motivo

---

## Grace Period State Machine

| Option | Description | Selected |
|--------|-------------|----------|
| Admin muda status manualmente | super_admin usa endpoint para marcar grace period | |
| Data de vencimento cadastrada | Campo data_vencimento + worker verifica diariamente | |
| Webhook de qualquer provider | Evento payment.failed de qualquer provider dispara Dia 0 | ✓ |

**User's choice:** Webhook de qualquer provider (genérico, não Stripe-específico)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cron job diário BullMQ | Job 1x/dia calcula dias e avança estágios | ✓ |
| Cálculo on-the-fly no middleware | Middleware calcula dias em cada request | |
| Triggers do banco (pg_cron) | Supabase triggers avançam estado por SQL | |

**User's choice:** Cron job diário BullMQ

---

## App Android — UX de Suspensão

| Option | Description | Selected |
|--------|-------------|----------|
| Banner informativo no topo | Dias 3-13: banner amarelo/laranja; Dia 14: tela bloqueada + WhatsApp | ✓ |
| Só tela bloqueada na suspensão | Grace period sem aviso; tela bloqueada só no Dia 14 | |
| App cliente sempre funciona | 402 nunca chega ao app_cliente; cliente protegido de problemas do escritório | |

**User's choice:** Banner informativo no topo

---

| Option | Description | Selected |
|--------|-------------|----------|
| Banner + read-only progressivo | Dia 3: banner vermelho; Dia 7: escrita desabilitada; Dia 14: tela suspensão | ✓ |
| Só tela de suspensão no Dia 14 | App_escritorio funciona normalmente até o Dia 14 | |
| Logout forçado na suspensão | JWTs expiram imediatamente quando tenant fica suspended | |

**User's choice:** Banner + read-only progressivo

---

## Claude's Discretion

- Schema exato da tabela `billing_events`
- Estrutura e autenticação do endpoint `POST /api/webhooks/billing`
- Nomes exatos dos endpoints admin
- Template de email transacional Resend
- Estratégia de retry do cron job BullMQ

## Deferred Ideas

- Stripe Checkout + Customer Portal — aguarda definição do provider de pagamento
- Limites de trial (max N clientes) — v2
- Dashboard de métricas de billing (MRR, churn) — Fase 8 ou milestone futuro
- Self-service checkout — aguarda provider de pagamento
