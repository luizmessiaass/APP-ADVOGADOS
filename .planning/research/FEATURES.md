# Feature Landscape — Portal Jurídico (SaaS B2B)

**Domain:** Legal process tracking SaaS for Brazilian law offices (escritórios de advocacia) and their end clients (leigos)
**Researched:** 2026-04-14
**Overall confidence:** MEDIUM (see "Research Limitations" below)

---

## Research Limitations — Read First

**WebSearch and WebFetch were denied during this research session.** This means findings about specific competitors (JusBrasil, Projuris, Advbox, ADVWin, SAJ, Themis) could not be verified against live product pages or current marketing material.

The feature landscape below is constructed from:

1. **Training knowledge** of the Brazilian legal tech ecosystem (valid up to May 2025)
2. **Domain reasoning** about legal services client relationships (what clients ask lawyers)
3. **General SaaS patterns** for B2B2C portals and legal design principles
4. **Brazilian legal context**: CNJ structure, DataJud scope, Lei Geral de Proteção de Dados (LGPD), OAB Código de Ética

**All competitor-specific claims are marked `[UNVERIFIED]`**. Before committing roadmap decisions that depend on competitive positioning, a human should verify the Phase-specific research items flagged at the end of this document.

**What I am HIGH confidence about:** The shape of the customer's problem (leigos don't understand legal jargon, worry silently, call their lawyer asking "o que está acontecendo?"), the CNJ process number format, what DataJud provides, and general legal-domain anti-features (regulatory risks, unauthorized practice of law, OAB ethics).

**What I am LOW confidence about:** Exact features shipped by specific named competitors in 2025, current pricing tiers, market share, and what is "standard" in Brazilian legal tech client portals in 2026.

---

## Domain Context (HIGH confidence)

Brazilian law office clients (leigos) have a very specific emotional/informational need:

1. **"Está andando meu processo?"** — Is anything happening? (most common question to lawyers)
2. **"Quando tenho que ir ao fórum?"** — When do I need to show up?
3. **"Isso é bom ou ruim pra mim?"** — Is this movement good or bad for me?
4. **"Quanto tempo ainda vai demorar?"** — How much longer?
5. **"Por que meu advogado não me responde?"** — Why is the lawyer unresponsive?

Any feature in this product should trace back to answering one of these questions without requiring a phone call. The core value is **reducing "ansiedade processual"** (process anxiety) through timely, plain-language visibility.

The **B2B buyer** (escritório) has a different need: reduce the cost of client communication. Every phone call from an anxious client is unbillable time. A portal that deflects 30% of "status calls" is worth paying for.

**Critical insight:** The escritório is not buying software. They are buying **"less time on the phone with clients + differentiated marketing story."** Features must support that ROI pitch.

---

## Table Stakes

Features users expect by default. Missing = product feels incomplete, escritórios won't subscribe, clients won't open the app twice.

### Client-facing (app do cliente)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Login seguro (email/senha) | Standard app onboarding; legal data requires auth | Low | Supabase Auth handles it. 2FA optional in v1. |
| Lista de processos vinculados ao cliente | Core landing experience; clients may have multiple processes | Low | Linked by CPF; escritório vincula no cadastro |
| Visão detalhada do processo (status atual em linguagem simples) | The whole point of the product | Medium | AI-translated; must be correct, not just simple |
| Linha do tempo (timeline) das movimentações traduzidas | Clients want chronological "story" of the process | Medium | Ordered by date; AI translates each movimentação |
| Próxima data importante (audiência, prazo, perícia) | Reduces "quando tenho que comparecer?" calls | Medium | Extracted from DataJud movement metadata + AI |
| Push notification para nova movimentação | Keeps app-install-worthy; users won't open daily otherwise | Medium | FCM; respect quiet hours |
| Exibição dos dados cadastrais do processo (número CNJ, vara, comarca, partes) | Sometimes clients need to quote number to other parties (bank, INSS) | Low | Direct from DataJud metadata |
| Indicador "última atualização" | Trust signal — app is alive, data is fresh | Low | Timestamp of last successful DataJud sync |
| Tela de "sem movimentação recente" com explicação | "Why nothing happened" is as important as "what happened" | Low | Anti-anxiety; explain processo parado ≠ abandonado |
| Contato direto com o escritório (botão "falar com meu advogado") | Portal should augment, not replace, the lawyer relationship | Low | WhatsApp deep-link or email; escritório configura |
| Onboarding/primeiro uso explicando o que o app faz | Legal clients are often low-tech; need hand-holding | Low | 3-4 slides first launch |
| Política de privacidade + termos (LGPD) | Legal requirement for sensitive data | Low | Must be linked from onboarding and settings |

### Office-facing (painel do escritório)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Login separado (role-aware) | Advogado/admin must not have client UX | Low | Supabase Auth + role claim |
| Cadastro de cliente (nome, CPF, email, número CNJ) | Core operation; admin adds clients | Low | CPF validation; CNJ format validation |
| Vinculação processo-cliente | Ensures client only sees own processes | Low | RLS-enforced; multi-process per client |
| Lista de clientes com status resumido | Daily workflow: who has news, who doesn't | Low | Sortable by last update |
| Visualização "ver como o cliente vê" | Advogado needs to preview before client questions arise | Medium | Same view as client, read-only flag |
| Log de acesso/notificações enviadas | Defensive: "did my client see this?" | Low | Audit trail per client |
| Envio de mensagem/aviso manual ao cliente | Escape hatch: AI can't say "não se preocupe, isso é rotina" | Medium | Typed message from advogado → push to client |
| Busca por cliente (nome, CPF, nº processo) | Scale matters: 200+ clients per escritório | Low | Simple filter/search |
| Status da última sincronização DataJud por processo | Debug: "why didn't my client get the update?" | Low | Sync health visible |

### System-wide (infra/compliance)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-tenancy com isolamento garantido (RLS) | Hard requirement — legal data leakage = lawsuit | High | Already in PROJECT.md constraints |
| Backup e retenção de dados | Regulatory + client trust | Medium | Supabase backups; document retention policy |
| Observabilidade de jobs (DataJud sync success/fail) | If sync silently breaks, product dies | Medium | Logs per tenant; alerting |
| Registro de consentimento LGPD | Legal requirement when processing personal data | Medium | Timestamped opt-in; withdrawal mechanism |

---

## Differentiators

Features that set this product apart. Not expected by default, but justify the premium price and the marketing story "our firm uses AI to keep you informed."

### Client-facing differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI que traduz JARGÃO → linguagem do leigo | The core differentiator. "Despacho saneador" becomes "o juiz organizou o processo e vai para a próxima fase" | High | Requires Claude API + careful prompt engineering + jurisprudence context |
| Chat com IA sobre o processo específico | User can ask "isso é ruim pra mim?" and get calibrated answer | High | Must be context-aware (movimentações + parte + tipo de ação); hallucination risk |
| "Resumo do processo em 1 parágrafo" gerado por IA | At-a-glance comprehension; most-read screen | Medium | Claude prompt with full history; cached |
| Estimativa de próximos passos (AI) | "O que pode acontecer a seguir" based on current phase | High | Must be hedged heavily; not a prediction, a possibilidade |
| Glossário contextual: toque em termo técnico → explicação | Clients encounter terms mid-timeline; inline learning | Medium | Static term DB + AI fallback for rare terms |
| Indicador de "fase do processo" visual (petição inicial → sentença → trânsito em julgado) | Gives clients mental model of "how far along are we" | Medium | Canonical phases per tipo de ação; requires ontology work |
| Notificação inteligente (não enviar push para movimentação irrelevante) | Avoids notification fatigue; AI classifies impact level | Medium | Triage: crítico / importante / rotineiro |
| Modo "contar a história do processo" narrativa cronológica | Some clients prefer prose over timeline bullets | Medium | Prompt variation, same data |
| Acessibilidade: áudio do resumo (TTS) | Many legal clients in Brazil are low-literacy or elderly | Medium | TTS (browser or Android), Portuguese-BR voice |
| Alertas proativos de prazo vencendo (contratante perde direito se não agir) | Genuine legal value: some prazos são do cliente, não só do advogado | Medium | Requires parsing movimentação metadata accurately; liability risk (see Anti-features) |
| Histórico de conversas com o chatbot | Clients want to re-read what they were told | Low | Standard chat UX |

### Office-facing differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Painel de insights: quais clientes estão mais ansiosos | Identifies at-risk clients (many logins, many chat messages) → advogado can reach out proactively | Medium | Analytics per client |
| Métricas de "ligações evitadas" | ROI justification for the escritório ("você economizou 40h este mês") | Low | Proxy: clients who would otherwise have called |
| Templates de avisos ("processo em fase de perícia, relaxe") | Advogado can broadcast to all clients in similar phase | Medium | Reusable message library |
| White-label leve (logo do escritório, cor primária) | Escritórios want to show "our app", not "third-party app" | Medium | Per-tenant branding; not full white-label |
| Relatório mensal automatizado do escritório (PDF) | Esc. envia ao cliente: "aqui está o que aconteceu neste mês" | Medium | Template + data; monthly cron |
| Integração via link: "convidar cliente" (magic link por WhatsApp/email) | Reduces onboarding friction; most clients are over WhatsApp | Low | Email + WhatsApp deep link |

### Market/business differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Preço transparente por cliente ativo | Competitors often charge per-user or hide pricing | Low | Marketing; Stripe pricing model |
| Trial gratuito com 5 clientes reais | Low-risk first experience for escritório | Low | Stripe trial mode |
| Foco exclusivo em DataJud (vs. integrar múltiplas fontes) | Faster to onboard, lower cost, "funciona no dia 1" | — | Already the strategic choice |

---

## Anti-Features

Features to explicitly **NOT** build in v1. These create risk, friction, or scope creep.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **IA que dá conselho jurídico** ("você deve recorrer") | Unauthorized practice of law; OAB ethical issues; liability | IA explica o que aconteceu; cliente deve falar com advogado sobre "o que fazer" |
| **IA que estima prazo final do processo** ("vai terminar em 2 anos") | Jurisprudência brasileira é imprevisível; falso positivo destrói confiança | Mostrar apenas a próxima data conhecida |
| **IA que calcula valor esperado da causa** | Same risk as acima + gera expectativa ruim no cliente | Não fazer |
| **Chat IA que responde sem contexto do processo** | Hallucinations; cliente pode tratar como conselho jurídico | Sempre contextualizar por processo atual; recusar perguntas fora do escopo |
| **Upload de documentos pelo cliente** | Escopo de peticionamento; complexidade de armazenamento; LGPD/backup de PDFs | v1 é somente leitura de DataJud |
| **Produção de petições via IA** | Out of scope; risco regulatório gigante | Já está em Out of Scope no PROJECT.md |
| **Integração com sistemas internos (SAJ, Themis, Projuris)** | Alto custo de integração, muitos sabores, licenciamento incerto | Out of Scope confirmado; DataJud only |
| **Cadastro self-service do cliente final** (cliente se cadastra sozinho) | Rompe o modelo B2B2C; cliente deve ser vinculado pelo escritório para vincular CPF | Convite magic link enviado pelo escritório |
| **Gamificação ("parabéns, 5 movimentações!")** | Legal processes não são um jogo; tom errado para ansiedade processual | Tom sóbrio, útil, respeitoso |
| **Avaliação pública do escritório (star rating)** | OAB ethics + ruído para o relacionamento advogado-cliente | Não fazer |
| **Comparação pública de escritórios** | Fora do escopo; mercado diferente (JusBrasil faz isso, nicho diferente) | — |
| **Feed público de processos / busca jurisprudencial** | Fora do core; JusBrasil já ocupa esse espaço | — |
| **Videoconferência integrada com advogado** | Escopo gigante; Zoom/Meet já resolvem | Botão WhatsApp/email |
| **Portal web para cliente em v1** | Out of scope confirmado no PROJECT.md; Android only | Web depois |
| **iOS em v1** | Out of scope confirmado no PROJECT.md | iOS depois |
| **Monetização direta ao cliente final** (freemium, ads) | Quebra o modelo B2B2C; privacidade de dado jurídico | Escritório paga; cliente usa de graça |
| **Storage de e-mails/SMS históricos** | Complexidade + LGPD + não é o core | Fora do escopo |
| **Assinatura digital de documentos** | DocuSign/Clicksign já resolvem; complexidade regulatória (ICP-Brasil) | Fora do escopo |
| **Cálculos trabalhistas/previdenciários automáticos** | Domínio profundo; legal risk; fora do core | Fora do escopo |
| **Notificação imediata para cada movimentação** (sem triagem) | Fadiga de notificação → desinstalação | Triagem por importância via IA |
| **Histórico de processos de terceiros (busca pública)** | Privacy + não é o produto | Apenas processos vinculados ao cliente |

**Meta anti-pattern:** O produto deve ser obstinadamente informativo, nunca prescritivo. Qualquer feature que cheire a "o que você deve fazer" deve ser empurrada para "fale com seu advogado".

---

## Feature Dependencies

```
[Core flow]
Cadastro de cliente (escritório) → Vinculação processo CNJ → DataJud sync (job) →
  → Armazenamento movimentações → IA traduz movimentação → Cliente vê timeline
                                                          → Push notification (se relevante)
                                                          → Chat IA usa como contexto

[Required infrastructure]
Supabase Auth + RLS → Multi-tenancy → Todas as features client-facing

[Differentiator layer]
Tradução IA → Resumo 1-parágrafo → Chat IA contextual → Alertas inteligentes
            ↘ Glossário contextual ↗

[Office differentiators]
Cadastro cliente → Métricas de uso → Painel de insights → Templates de aviso

[Non-blocking additions]
Branding tenant → Relatório mensal PDF → TTS acessibilidade
```

**Critical path:** DataJud sync reliability is the single point of failure. If DataJud job breaks silently, the entire product becomes a lie (clients see stale data and the trust evaporates). Observability of sync health is non-negotiable.

**Second critical path:** AI translation quality. A single mistranslation that turns "indeferido" into "deferido" can cause a client to act on wrong information. This is both a differentiator AND a liability vector.

---

## MVP Recommendation

For a genuinely shippable v1 that validates the business hypothesis (do escritórios pay for this?), prioritize:

### Must-have (v1 launch)

1. **Auth + multi-tenant + RLS** (infra, non-optional)
2. **Cadastro de cliente pelo escritório** (linking CPF + CNJ number)
3. **DataJud sync job** (fetch + store movimentações)
4. **Tradução IA das movimentações via Claude** (the whole value prop)
5. **Timeline de processo no app do cliente**
6. **Resumo "status atual em linguagem simples"**
7. **Próxima data importante visível**
8. **Push notification com triagem simples** (critical vs routine)
9. **Painel do escritório: lista de clientes + status sync + "ver como o cliente vê"**
10. **Envio de mensagem manual do escritório → cliente**
11. **Stripe subscription com trial**
12. **Consentimento LGPD + política de privacidade**

### Should-have (v1.1, fast-follow)

13. Chat IA contextualizado por processo
14. Indicador visual de "fase do processo"
15. Glossário contextual
16. Métricas de uso no painel do escritório
17. Branding por tenant (logo + cor)
18. Convite do cliente via magic link (WhatsApp/email)

### Defer (v2 or later, validate demand first)

- Relatório mensal PDF automatizado
- Templates de aviso reutilizáveis
- TTS / áudio do resumo
- Alertas proativos de prazo (alto risco, validar carefully)
- Análise "quais clientes estão ansiosos"
- Estimativa de próximos passos (IA)

### Never (anti-features, already catalogued)

See "Anti-Features" section.

**Defer rationale:** The v1 must prove that (a) escritórios will pay for client-portal functionality, (b) clients will actually open the app when notified, and (c) AI translation quality meets client comprehension. Everything beyond the core loop is premature until those three are validated.

---

## Competitive Context [UNVERIFIED — training data only, not live-verified]

> **Read carefully:** The following is my recollection of the Brazilian legal tech market as of ~May 2025. It is NOT verified against live product pages. Any roadmap decision that depends on competitive positioning should trigger a human-led verification step.

| Competitor | Approximate Positioning | Overlaps with this product? | Confidence |
|------------|------------------------|-----------------------------|------------|
| **JusBrasil** | Public legal search + process tracking for individual users (B2C). Free tier + paid. | Partial: JusBrasil notifies on processes where your name appears. Does NOT offer white-label B2B2C portals for escritórios. | MEDIUM |
| **Projuris** | Full legal office management (processes, financeiro, CRM) — B2B for escritórios. Has cliente portal module. | Direct competitor on "portal do cliente", but sells as part of big suite. We compete on focus + AI translation. | LOW |
| **Advbox** | Similar to Projuris: management suite for escritórios, includes cliente portal. | Direct competitor on the portal layer. | LOW |
| **ADVWin / ADVPlus** | Legacy management software for escritórios. | Client portals, if any, are likely minimal. | LOW |
| **SAJ (Softplan)** | Used inside tribunais + large escritórios; process management. | Not direct competitor for client-facing portal. | LOW |
| **Themis / Legal One** | Management software. | Same as Projuris/Advbox category. | LOW |
| **Aurum Lawsuite** | Legal software, CRM + processes. | Same category. | LOW |
| **Juit Rimor** | Legal tech startup; process intelligence. | Different layer (analytics for big firms, not client portals). | LOW |

**Strategic hypothesis (UNVERIFIED):** Existing management suites offer client portals as a bolt-on, not as a focused product. They are built for the escritório first, client second. An AI-first, client-first portal that integrates cleanly via DataJud may find space by being **better at the one job** instead of being part of a suite. Validate this hypothesis through market interviews before committing to the positioning.

---

## Phase-Specific Research Flags

The roadmap orchestrator should flag the following areas for **deeper, verified research during phase planning**, because training data is insufficient:

| Phase topic | What to verify | Why |
|-------------|---------------|-----|
| **P1 — Competitive positioning** | Live feature set of Projuris, Advbox, JusBrasil client portals in 2026 | Determines our differentiation story and pricing |
| **P2 — DataJud API current state** | Rate limits, authentication changes, which tribunals are covered, data freshness SLA | Core dependency; training data on DataJud may be out of date |
| **P3 — AI translation quality gate** | Claude API output on real movimentações; hallucination rate; PT-BR legalese handling | The whole value proposition hinges on this |
| **P4 — OAB ethics on AI advice** | Recent OAB opinions or resolutions on client-facing legal AI tools | Liability; anti-feature boundary |
| **P5 — LGPD obligations for legal data** | ANPD guidance specific to advocacia + client data processors | Compliance; RLS alone may not be enough |
| **P6 — Notification triage accuracy** | How to reliably classify movimentação importance | Impacts v1 push notification strategy |
| **P7 — Onboarding friction for leigos** | Real user testing with non-technical clients | Many legal clients are 50+ years old, low app familiarity |
| **P8 — "Prazo do cliente" liability** | Legal risk of showing "você tem 15 dias para se manifestar" to clients | May force anti-feature decision even though feature is valuable |

---

## Gaps and Unknowns

Acknowledged unknowns from this research pass:

1. **Exact feature differentiation vs Projuris/Advbox in 2026** — training data is stale; live verification required
2. **DataJud rate limits and SLAs in 2026** — the API has evolved; must test
3. **Claude API cost per movimentação translation** — depends on prompt + caching strategy; needs estimate
4. **Real-world legal jargon coverage** — can Claude translate the full range of tribunal vocabularies across justiça estadual / federal / trabalhista / militar?
5. **Push notification opt-in rates for legal clients** — no empirical data on behavior
6. **Willingness-to-pay per escritório** — validate pricing in customer discovery; this research does not cover it

---

## Sources

**Training knowledge only (no live verification in this session):**

- Brazilian CNJ process numbering standard (Resolução CNJ 65/2008) — HIGH confidence from training
- DataJud public API general capabilities — MEDIUM confidence, training data
- LGPD (Lei 13.709/2018) general requirements for sensitive data processing — HIGH confidence
- OAB Código de Ética (ethical boundaries on unauthorized practice of law) — HIGH confidence general direction, LOW confidence on specific resolutions about AI tools
- General SaaS B2B2C patterns and legal design principles — HIGH confidence
- Competitor landscape (JusBrasil, Projuris, Advbox, SAJ, Themis) — LOW confidence, training data only, not verified against 2026 product pages

**Not available in this session:** WebSearch, WebFetch, Context7 queries to external docs. Any claim about a specific competitor's 2026 feature set should be treated as UNVERIFIED and flagged for human verification before acting on it in the roadmap.
