# Phase 8: LGPD Hardening & Production Readiness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 08-lgpd-hardening-production-readiness
**Areas discussed:** Art. 18 Deleção em cascata, Consent re-gate ao mudar versão, Monitoring & alertas de produção, Launch checklist & privacy lawyer

---

## Art. 18 — Deleção em Cascata

| Option | Description | Selected |
|--------|-------------|----------|
| Deletar tudo — Auth + dados | supabase.auth.admin.deleteUser() + CASCADE remove tudo em public.*. Cliente perde acesso imediatamente. | ✓ |
| Apenas anonimizar Auth | Limpa PII do auth.users mas mantém UUID para integridade referencial. | |
| Claude decide | Deixar para o planner escolher. | |

**User's choice:** Deletar tudo — Auth + dados

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog de confirmação simples | AlertDialog Material3: "Deletar [Nome]? Todos os dados serão removidos permanentemente..." + Cancelar/Deletar vermelho | ✓ |
| Digitar o nome para confirmar | Campo de texto onde o advogado digita o nome do cliente. Padrão GitHub/Vercel. | |
| Claude decide | Claude escolhe o padrão mais adequado. | |

**User's choice:** Dialog de confirmação simples

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cancelar jobs ativos | Após DELETE, buscar na fila BullMQ jobs pendentes com processId/clienteId e removê-los. | ✓ |
| Deixar falhar graciosamente | Jobs gerarão erro 404 ao tentar processar processo deletado — circuit breaker e sync_errors lidam com isso. | |
| Claude decide | Deixar para o planner escolher. | |

**User's choice:** Cancelar jobs ativos

---

## Consent re-gate ao mudar versão

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueio no login seguinte | Na próxima abertura, compara versao_termos armazenada com versão atual. Se diferente, exibe tela de consentimento. Recusa → logout. | ✓ |
| Banner não-bloqueante | Exibe banner persistente. App funciona normalmente até o cliente aceitar. | |
| Claude decide | Claude escolhe abordagem mais conservadora. | |

**User's choice:** Bloqueio no login seguinte

---

| Option | Description | Selected |
|--------|-------------|----------|
| Constante no app + backend | Versão atual como constante no código retornada também pelo GET /api/tenant/status. App compara com consentimento armazenado. | ✓ |
| Apenas backend | Backend expõe versão via API. Sem constante local. | |

**User's choice:** Constante no app + backend

---

## Monitoring & alertas de produção

| Option | Description | Selected |
|--------|-------------|----------|
| Não — Betterstack built-in suficiente | Betterstack Logs + Alertas + Uptime + Sentry cobrem tudo. Sem Grafana. | ✓ |
| Sim — adicionar Grafana Cloud | Grafana para dashboards de métricas customizadas. | |
| Claude decide | Claude escolhe abordagem mais adequada. | |

**User's choice:** Não — Betterstack built-in suficiente

---

| Option | Description | Selected |
|--------|-------------|----------|
| Error rate API (Sentry/Betterstack) | >1% por 5 minutos → on-call alert | ✓ |
| Claude spend por tenant | Alertas 50/80/100% do budget (já em Phase 3) | ✓ |
| DataJud circuit state | Circuit breaker aberto >30min → alert | ✓ |
| FCM delivery rate | >5% tokens inválidos → alert | ✓ |

**User's choice:** Todas as 4 métricas obrigatórias

---

## Launch checklist & privacy lawyer

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-blocker — não lança sem | Checklist não completo sem revisão de advogado LGPD. | |
| Risco aceito com mitigação | Lança para early-adopters com compromisso de revisão em 30-60 dias. | ✓ |
| Claude decide | Claude trata como hard-blocker por padrão. | |

**User's choice:** Risco aceito com mitigação

---

| Option | Description | Selected |
|--------|-------------|----------|
| Backup/restore rehearsed | Testar restore Supabase prod + documentar procedimento | ✓ |
| Supabase Pro tier ativo | Upgrade portaljuridico-prod para Pro (SLA, PITR, sem auto-pause) | ✓ |
| Secrets split API vs worker | Verificar least privilege nos serviços Railway | ✓ |
| DataJud quota verificado | Confirmar rate limits reais + calibrar circuit breaker | ✓ |

**User's choice:** Todos os 4 itens obrigatórios

---

| Option | Description | Selected |
|--------|-------------|----------|
| Anthropic como sub-processador + ZDR | Mencionar Anthropic (EUA) + Zero Data Retention + Art. 33 LGPD. Sem outros sub-processadores em v1. | ✓ |
| Lista completa de sub-processadores | Listar Anthropic, Railway, Supabase, Resend, Firebase. | |
| Claude decide | Claude redige seção mais conservadora. | |

**User's choice:** Anthropic como sub-processador + ZDR

---

## Claude's Discretion

- Schema exato da migração para deleção em cascata
- Implementação do cancelamento de jobs BullMQ
- Estrutura exata da resposta de GET /api/v1/tenant/status com termos_versao_atual
- Posicionamento do botão "Deletar cliente" no app_escritorio
- Estratégia de mock para testes do Art. 18 endpoint

## Deferred Ideas

- OpenTelemetry/distributed tracing → milestone futuro
- Lista completa de sub-processadores na política de privacidade → revisão com advogado LGPD
- Dashboard Grafana → reavaliar se Betterstack ficar insuficiente
