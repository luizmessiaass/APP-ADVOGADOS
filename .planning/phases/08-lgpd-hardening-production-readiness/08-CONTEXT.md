# Phase 8: LGPD Hardening & Production Readiness - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fechar o loop de compliance LGPD e preparar o Portal Jurídico para lançamento seguro a escritórios de advocacia brasileiros:

1. **Art. 18 LGPD** — endpoint de deleção em cascata de cliente (Auth + todos os dados) com UX de confirmação no app_escritorio e cancelamento de jobs BullMQ ativos
2. **Consent re-gate** — re-exibição obrigatória da tela de consentimento LGPD quando a versão dos termos muda (detectada por constante no app comparada com o consentimento armazenado)
3. **Art. 33 LGPD** — atualizar a política de privacidade externa para mencionar Anthropic como sub-processador internacional com ZDR
4. **CI production gates** — cross-tenant leak test, PII-redaction log test, e webhook idempotency replay drill obrigatórios no pipeline CI antes de qualquer deploy em produção
5. **Monitoring de produção** — alertas Betterstack + Sentry para as 4 métricas obrigatórias
6. **Launch readiness checklist** — 4 itens técnicos obrigatórios antes do lançamento; revisão de advogado LGPD é risco aceito com mitigação (comprometimento a 30-60 dias)

**Não inclui:** integração com payment provider (Phase 7), chat IA (v2), funcionalidades novas de qualquer tipo.

</domain>

<decisions>
## Implementation Decisions

### Art. 18 — Deleção em Cascata

- **D-01:** Deleção é **total** — `supabase.auth.admin.deleteUser()` remove o usuário de `auth.users` + CASCADE remove todos os registros em `public.*` vinculados (processos, movimentacoes, chat_messages, lgpd_consentimentos, device_tokens, notifications). Nenhuma anonimização parcial — remoção completa. Alinhado com Phase 1 D-16 (hard delete com cascade).
- **D-02:** UX de confirmação no app_escritorio: **AlertDialog Material3 simples** — "Deletar [Nome]? Todos os dados serão removidos permanentemente e não podem ser recuperados." + botões Cancelar / Deletar (vermelho destrutivo). Sem digitação de nome para confirmar.
- **D-03:** Jobs BullMQ ativos para processos do cliente deletado são **cancelados ativamente** após o DELETE — buscar na fila jobs pendentes com processId/clienteId do cliente e removê-los para evitar erros 404 no worker.
- **D-04:** Endpoint backend: `DELETE /api/v1/clientes/:clienteId` (role `admin_escritorio` ou `advogado` do mesmo tenant). Retorna 204 em sucesso. RLS garante que um tenant não pode deletar clientes de outro tenant.

### Consent Re-gate ao Mudar Versão

- **D-05:** Quando a versão da política de privacidade muda, o cliente **vê a tela de consentimento novamente no próximo login** (ou próxima abertura do app). O app compara a `versao_termos` do consentimento armazenado com a versão atual configurada. Se diferente, exibe a tela completa de consentimento antes de chegar à Lista de Processos. Recusa → logout automático. Fluxo idêntico ao Phase 5 D-11/D-12.
- **D-06:** Detecção de versão: **constante no código do app** (ex: `TERMS_VERSION = "2026-04-16"`) + backend retorna a versão atual via `GET /api/v1/tenant/status` (Phase 7 D-11). App compara com a versão armazenada no DataStore local. Atualizar versão = mudar constante + re-deploy do app.
- **D-07:** O endpoint `GET /api/v1/tenant/status` deve incluir o campo `termos_versao_atual` na resposta para que o app possa comparar sem depender apenas da constante local.

### Art. 33 — Sub-processador Internacional (Anthropic)

- **D-08:** A política de privacidade (URL externa — Phase 1 D-25) deve incluir seção explícita mencionando **Anthropic (EUA)** como sub-processador internacional para tradução de textos jurídicos via Claude API, com as seguintes notas:
  - Dados enviados para Anthropic não contêm CPF ou PII do cliente (Phase 1 D-26, LGPD-03)
  - Zero Data Retention (ZDR) ativado na conta Anthropic do Portal Jurídico (a confirmar com Anthropic)
  - Base legal: Art. 33 LGPD — transferência internacional com garantias adequadas
- **D-09:** Phase 8 entrega: redigir o texto da seção Art. 33 e atualizar a URL da política (Notion ou landing page). Não lista os outros sub-processadores (Railway, Supabase, Resend, Firebase) em v1 — apenas Anthropic por ser o único sub-processador internacional de dados de conteúdo jurídico.

### CI Production Gates

- **D-10:** Três testes obrigatórios no CI antes de qualquer deploy em produção:
  1. **Cross-tenant leak gate** — já definido em Phase 1 AUTH-06: tenant A não consegue ler dados do tenant B via nenhum endpoint
  2. **PII-redaction log test** — verificar que logs `pino` não registram CPF, email bruto, ou conteúdo de prompts (Phase 1 D-26, LGPD-04)
  3. **Webhook idempotency replay drill** — simular re-entrega de evento webhook `POST /api/webhooks/billing` com mesmo payload e verificar que o resultado é idempotente (Phase 7 D-06)
- **D-11:** Os três gates são **blocking** — pipeline de CI falha se qualquer um deles não passar. Não é possível fazer deploy sem todos verdes.

### Monitoring & Alertas de Produção

- **D-12:** Ferramentas: **Betterstack (Logtail + Uptime)** + **Sentry** — já configurados em Phase 1 D-27/D-28/D-29. Sem Grafana ou ferramenta adicional em v1.
- **D-13:** Quatro métricas obrigatórias com alertas configurados:
  1. **Error rate API** — >1% de respostas 5xx por 5 minutos consecutivos → alerta Betterstack on-call
  2. **Claude spend por tenant** — alertas em 50/80/100% do budget configurado (já definido em Phase 3 AI-07; Phase 8 verifica que está ativo em produção)
  3. **DataJud circuit state** — circuit breaker aberto por >30 minutos → alerta Betterstack on-call
  4. **FCM delivery rate** — >5% de tokens inválidos (404 FCM) → alerta Sentry/Betterstack
- **D-14:** OpenTelemetry (diferido em Phase 1 D-30) **permanece diferido** — Betterstack + Sentry são suficientes para v1 launch.

### Launch Readiness Checklist

- **D-15:** Quatro itens técnicos **obrigatórios** (hard-blockers) antes do lançamento:
  1. **Backup/restore rehearsed** — testar restore do banco Supabase prod a partir de backup; documentar o procedimento de recovery
  2. **Supabase Pro tier ativo** — upgrade do projeto `portaljuridico-prod` para Supabase Pro (SLA, point-in-time recovery, sem auto-pause em inatividade)
  3. **Secrets split API vs worker** — verificar que os serviços Railway API e Worker têm apenas os secrets necessários (least privilege); documentar quais secrets vão para qual serviço
  4. **DataJud quota verificado** — confirmar rate limits reais do DataJud CNJ e que o circuit breaker está calibrado para os limites reais (resolve Q1 de STATE.md)
- **D-16:** Revisão de advogado especializado em LGPD: **risco aceito com mitigação** — lançar para primeiros clientes com compromisso documentado de contratar a revisão em 30-60 dias. Não é hard-blocker para v1. O compromisso deve ser registrado no checklist como "pendente dentro de 60 dias".

### Claude's Discretion

- Schema exato da migração SQL para suportar deleção em cascata (verificar FKs existentes com ON DELETE CASCADE vs. necessidade de adicionar)
- Implementação do cancelamento de jobs BullMQ (usando `Queue.remove()` vs. `Job.remove()` — depende da versão BullMQ)
- Estrutura exata da resposta do `GET /api/v1/tenant/status` com `termos_versao_atual`
- Estratégia de testes para o Art. 18 endpoint (mock do `supabase.auth.admin.deleteUser()` em Vitest)
- Posicionamento do botão "Deletar cliente" no app_escritorio (menu de contexto no item da lista vs. botão na tela de detalhe do cliente)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements desta Fase
- `.planning/REQUIREMENTS.md` §"LGPD Compliance (LGPD)" — LGPD-05 (Art. 18 deletion cascade), LGPD-06 (Art. 33 sub-processor disclosure)
- `.planning/ROADMAP.md` §"Phase 8: LGPD Hardening & Production Readiness" — goal, success criteria completos

### Decisões Anteriores Relevantes
- `.planning/phases/01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics/01-CONTEXT.md` — D-16 (hard delete cascade), D-23/24 (lgpd_consentimentos + versao_termos), D-25 (política URL externa), D-26 (pino redact PII), D-27/28/29 (Betterstack + Sentry), D-30 (OpenTelemetry diferido)
- `.planning/phases/05-android-app-fluxo-cliente-mvp/05-CONTEXT.md` — D-11/12/13 (LGPD consent gate fluxo + scroll-to-bottom + logout on refuse), deferred "re-gate quando versão muda → Phase 8"
- `.planning/phases/07-stripe-billing-grace-period/07-CONTEXT.md` — D-11 (GET /api/tenant/status endpoint — Phase 8 adiciona campo termos_versao_atual)
- `.planning/phases/03-claude-ai-translation-core-value-prop/03-CONTEXT.md` — AI-07 (Claude spend alerts por tenant — Phase 8 verifica que está ativo em produção)

### Estado Atual do Projeto
- `.planning/STATE.md` — Q1 (DataJud quota unverified — resolve via launch checklist D-15), Q4 (LGPD enforcement — risco aceito com mitigação D-16)
- `.planning/REQUIREMENTS.md` — visão completa de todos os requisitos v1

No external specs além dos acima — decisões completamente capturadas neste documento.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`DELETE /api/v1/clientes/:id` pattern** (Phase 4) — extensão do endpoint existente de gestão de clientes no app_escritorio
- **AlertDialog Material3** (app_escritorio Phase 4) — padrão de diálogo já em uso no app_escritorio para confirmações
- **`GET /api/v1/tenant/status`** (Phase 7 D-11) — já retorna tenant status + grace_banner; Phase 8 adiciona `termos_versao_atual`
- **BullMQ Queue** (Phase 1/2) — `Queue.remove()` ou job cleanup por ID já na infraestrutura do worker
- **DataStore** (Phase 4/5) — persistência de flags de primeiro uso + consentimento já estabelecida no app_cliente
- **Betterstack pino-logtail** (Phase 1 D-28) — alertas Betterstack configuráveis via painel, sem código adicional
- **Sentry** (Phase 1 D-29) — DSN compartilhado API+Worker com tags `source`; Phase 8 adiciona alertas de thresholds

### Established Patterns
- Prefixo `/api/v1/` em todos os endpoints (Phase 1 D-19)
- UUID v4 como FK (Phase 1 D-15) — CASCADE delete via Supabase FK constraints
- `versao_termos` como ISO date string (Phase 1 D-24) — comparação simples entre versões
- TypeBox para validação de schema (Phase 1 D-20)
- Vitest para testes (Phase 1 D-34)

### Integration Points
- **app_escritorio `ClienteDetalheScreen`** → botão "Deletar cliente" (posição: Claude's Discretion) → `DELETE /api/v1/clientes/:id` → worker cancela jobs
- **app_cliente login flow** → `GET /api/v1/tenant/status` → comparar `termos_versao_atual` com constante local → re-gate se diferente
- **CI pipeline** → três gates obrigatórios (cross-tenant, PII, webhook idempotency) antes do step de deploy

</code_context>

<specifics>
## Specific Ideas

- **Zero Data Retention (ZDR) da Anthropic** — Phase 8 deve confirmar que o Portal Jurídico tem ZDR ativado na conta Anthropic antes do lançamento. Isso é prerequisito para o texto Art. 33 da política de privacidade. Se ZDR não estiver ativo, a seção Art. 33 precisa de linguagem diferente (contrato de processamento de dados com a Anthropic).
- **Compromisso documentado do advogado LGPD** — o "risco aceito" do D-16 deve ser registrado em um documento interno (pode ser um arquivo no repositório ou Notion) assinado pelo responsável pelo negócio, não apenas verbal.
- **Checklist de launch como arquivo no repositório** — o launch readiness checklist deve ser um arquivo `LAUNCH-CHECKLIST.md` no repositório com checkboxes, para rastrear o progresso de cada item e ter evidência auditável.

</specifics>

<deferred>
## Deferred Ideas

- **OpenTelemetry/distributed tracing** — diferido novamente para milestone futuro. Betterstack + Sentry são suficientes para v1.
- **Lista completa de sub-processadores na política** (Railway, Supabase, Resend, Firebase) — v1 menciona apenas Anthropic por ser o único sub-processador internacional de conteúdo. Os demais podem ser adicionados na revisão com advogado LGPD.
- **Dashboard Grafana** — não necessário para v1. Reavaliar se Betterstack limites se tornarem insuficientes.
- **Limites de trial por número de clientes** — diferido de Phase 7, ainda diferido.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-lgpd-hardening-production-readiness*
*Context gathered: 2026-04-16*
