# Phase 3: Claude AI Translation (Core Value Prop) — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

O backend consegue traduzir movimentações jurídicas brutas do DataJud para português simples via Claude API — com prompt caching (system prompt + glossário em bloco `cache_control`), input XML-delimitado, output schema-validado (`{status, proxima_data, explicacao, impacto}`), deduplicação por hash de texto, telemetria de tokens por tenant com alertas e bloqueio em 100%, e model routing Haiku/Sonnet visível em logs.

**Não inclui:** chatbot interativo com o cliente (diferido para roadmap futuro), UI Android (Phase 4+), push notifications (Phase 6), LGPD hardening além do já feito em Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Gatilho de Tradução

- **D-01:** Arquitetura: **BullMQ job separado** `translate-movimentacao`. Quando o worker DataJud (Phase 2) detecta movimentações novas via diff, enfileira um job `translate-movimentacao` no BullMQ. Um worker de tradução separado (mesmo processo `worker.ts` com múltiplos consumers) consome e chama a Claude API. Desacoplado, retry independente, visível no Bull Board.
- **D-02:** Endpoint manual de re-tradução (`POST /api/v1/processos/:id/traducao`) é **assíncrono** — enfileira job e retorna `202 Accepted` imediatamente. O advogado não espera a Claude responder.

### Prompt & Glossário Jurídico

- **D-03:** Glossário jurídico armazenado como **arquivo de texto no repositório** (ex: `src/ai/glossario-juridico.md`). Versionado junto com o código. Carregado na inicialização do worker e incluído no system prompt como bloco `cache_control: "ephemeral"`. Sem dependência de DB para o glossário.
- **D-04:** Escopo do glossário para v1: **amplo (100+ termos)**. Cobrir direito civil, trabalhista e criminal — as três áreas mais comuns entre escritórios de advocacia brasileiros. Claude's Discretion para seleção e estruturação dos termos.
- **D-05:** O system prompt é **genérico** (instruções + glossário) para maximizar cache hits. Contexto específico do processo (número CNJ, tipo de ação, partes) vai no **user turn** junto com a movimentação XML-delimitada (`<movimentacao>texto</movimentacao><contexto>...</contexto>`). Isso preserva o cache do system prompt entre diferentes processos.

### Output Schema

- **D-06:** `status` — **texto livre gerado pela IA**. Descrição curta e clara em português simples (ex: "Aguardando resposta da outra parte", "Audiência marcada"). TypeBox valida tamanho máximo. Claude's Discretion para o limite exato de caracteres.
- **D-07:** `proxima_data` — **texto descritivo ou null**. Ex: `"Audiência em 20 de maio de 2026"` quando há data relevante, `null` quando não há. Legível diretamente pelo app sem formatação adicional.
- **D-08:** `impacto` — **texto descritivo livre**. Parágrafo explicando o que a movimentação significa para o cliente em linguagem simples. Sem enum de positivo/negativo/neutro — decisão juridicamente mais segura, evita a IA classificar incorretamente situações ambíguas.
- **D-09:** `explicacao` — texto livre em português simples explicando o que aconteceu nesta movimentação. Claude's Discretion para tamanho máximo recomendado.
- **D-10:** Schema completo TypeBox: `{ status: Type.String(), proxima_data: Type.Union([Type.String(), Type.Null()]), explicacao: Type.String(), impacto: Type.String() }`. Validado antes de salvar na tabela `movimentacoes`. Falha de validação retorna erro estruturado sem salvar.

### Deduplicação por Hash

- **D-11:** Hash calculado sobre o **texto bruto da movimentação** (sem contexto do processo). Algoritmo: Claude's Discretion (SHA-256 recomendado). Armazenado em coluna `hash_texto` na tabela `movimentacoes`. Se hash já existe para o tenant, retorna a tradução em cache sem chamada à Claude.
- **D-12:** Requisito AI-05 obrigatório: mesma movimentação nunca reprocessada — cache hit visível em log (`translation_source: 'cache' | 'claude'`).

### Model Routing

- **D-13:** Haiku para tradução em lote (jobs BullMQ automáticos). Sonnet diferido para chatbot interativo (v1.1 — fora do escopo desta fase). Routing hardcoded via constante de configuração visível em logs/telemetria (AI-08).

### Budget de Tokens por Tenant

- **D-14:** Limite configurado com **valor padrão em env var** (`DEFAULT_TENANT_TOKEN_BUDGET`, ex: 1.000.000 tokens/mês) + campo `token_budget` na tabela `escritorios` para override por tenant. Se `token_budget` é null, usa o padrão da env var.
- **D-15:** Alertas de 50/80/100% disparados **apenas para o admin do produto** (via Sentry ou email interno configurado em env var). O escritório não é notificado sobre consumo de tokens em v1.
- **D-16:** Ao atingir 100% do budget: novas traduções são **bloqueadas** com erro `TOKEN_BUDGET_EXCEEDED`. Traduções já salvas continuam visíveis no app. Admin ajusta `token_budget` manualmente ou aguarda reset mensal. Claude's Discretion para o ciclo de reset (mensal, baseado em `created_at` do tenant, ou data fixa).
- **D-17:** Telemetria de tokens armazenada em tabela dedicada `token_usage` com campos: `tenant_id`, `modelo`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`, `job_id`, `movimentacao_id`, `created_at`.

### Nomenclatura de Banco (continuidade Phase 1)

- **D-18:** Tabelas em português sem acentos: `movimentacoes` (com coluna `hash_texto`, `traducao_status`, `traducao_cache_hit`), `token_usage`. Padrão UUID v4, timestamps `created_at`/`updated_at` via trigger.

### LGPD (continuidade Phase 1)

- **D-19:** CPF e PII nunca incluídos nos prompts enviados para a Claude API (LGPD-03 — já decidido em Phase 1). O texto da movimentação DataJud não contém CPF por padrão; validar na camada de preparação do prompt.
- **D-20:** Conteúdo bruto de prompts não logado (LGPD-04 — pino redact configurado em Phase 1). Logar apenas `movimentacao_id`, `tenant_id`, `hash_texto`, `modelo`, `token_count`.

### Claude's Discretion

- Tamanho máximo de caracteres para `status` e `explicacao`
- Algoritmo de hash para deduplicação (SHA-256 recomendado)
- Ciclo de reset mensal do budget de tokens (data fixa ou rolling 30 dias)
- Estrutura exata do system prompt (além das constraints: instruções de tradução + glossário + disclaimer)
- Parâmetros de retry para o job BullMQ `translate-movimentacao`
- Prioridade do job `translate-movimentacao` no BullMQ (vs. jobs de sync DataJud)

</decisions>

<specifics>
## Specific Ideas

- **Texto descritivo para proxima_data:** escolha por legibilidade direta — o app Android v1 não precisa ordenar por data de próxima movimentação, então string ISO não traz vantagem real e texto descritivo é mais natural.
- **Impacto sem enum:** decisão juridicamente prudente — classificar uma movimentação como "negativa" quando o desfecho ainda é incerto poderia criar ansiedade desnecessária ou interpretação equivocada.
- **Bloqueio em 100%:** o produto é high-ticket com aprovação manual (decisão D-07 Phase 1) — o admin monitora ativamente. Bloquear é mais seguro do que deixar exceder e cobrar surpresa.
- **Alertas só para admin:** v1 não tem interface para o escritório monitorar tokens. Adicionar isso criaria confusão sem contexto. Diferido para quando houver dashboard do escritório.
- **Glossário amplo desde o início:** qualidade da tradução é a core value prop. Começar com glossário limitado e expandir é pior do que investir na qualidade desde o início — escritórios de diferentes áreas do direito precisam de cobertura ampla.

</specifics>

<canonical_refs>
## Canonical References

**Agentes downstream DEVEM ler esses arquivos antes de planejar ou implementar.**

### Requisitos desta Fase
- `.planning/REQUIREMENTS.md` §AI Translation (AI-01..08) — Requisitos exatos mapeados para Phase 3
- `.planning/ROADMAP.md` §Phase 3 — Goal, success criteria, dependências, research flags

### Projeto & Contexto Geral
- `.planning/PROJECT.md` — Core value, constraints (Claude API para tradução e chat — não negociável)
- `.planning/STATE.md` — Estado atual do projeto

### Phase 1 Context (Fundação que esta fase usa)
- `.planning/phases/01-backend-foundation-supabase-fastify-auth-rls-lgpd-basics/01-CONTEXT.md` — D-14 (nomenclatura PT-BR), D-15 (UUID), D-16 (hard delete), D-19 (API versioning), D-20 (TypeBox), D-21 (formato erro), D-26 (LGPD pino redact), D-29 (Sentry), D-31 (worker BullMQ), D-32 (Redis)

### Phase 2 Context (Handoff point para tradução)
- `.planning/phases/02-datajud-integration-sync-worker/02-CONTEXT.md` — Tabela `movimentacoes` é o ponto de handoff (D-18, D-19). Job DataJud dispara `translate-movimentacao`.

### Pesquisa Técnica Existente
- `.planning/research/STACK.md` — Stack: BullMQ consumers, pino, TypeBox, Redis
- `.planning/research/ARCHITECTURE.md` — Arquitetura: worker separado, múltiplos consumers
- `.planning/research/PITFALLS.md` — Armadilhas: LGPD em prompts, prompt injection
- `.planning/research/SUMMARY.md` §Phase 3 research flags (Q2, Q3, Q5) — Open questions críticos

### Pesquisa Crítica Pendente (RESEARCHER DEVE INVESTIGAR)
- Q2: Qualidade Claude PT-BR para jargão jurídico (50-100 amostras reais de movimentações)
- Q3: Anthropic Zero Data Retention (ZDR) — verificar se está disponível para Haiku e quais são os termos
- Q5: OAB ethics — distinção entre explicação de movimentação (permitida) vs. aconselhamento jurídico (não permitido) pela IA

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (das Phases anteriores)
- Worker BullMQ em `worker.ts` com múltiplos consumers — Phase 3 adiciona consumer `translate-movimentacao`
- Redis client configurado — já disponível para deduplicação por hash (se necessário cache Redis além do DB)
- Fastify server com middleware de tenant — Phase 3 adiciona endpoint `/api/v1/processos/:id/traducao`
- TypeBox e formato de erro padrão — reutilizar para validação do output schema

### Established Patterns (das Phases anteriores)
- Nomenclatura PT-BR sem acentos (tabelas, colunas)
- UUID v4 para PKs, timestamps via trigger
- Validação de schema com TypeBox
- Formato de erro: `{ success: false, error: "...", code: "ERROR_CODE" }`
- Logs com pino + redact de PII (CPF, password, prompt_text)
- Sentry para erros com contexto de tenant

### Integration Points
- **Phase 2 → Phase 3:** Tabela `movimentacoes` + job `translate-movimentacao` no BullMQ
- **Phase 4 (app_escritorio):** Endpoint de preview "as client sees" consumirá as traduções desta fase
- **Phase 5 (app_cliente):** Timeline de movimentações traduzidas é exibida para o cliente final
- **Phase 8 (LGPD):** Disclaimer "Explicação gerada por IA" deve aparecer em todas as telas que exibem traduções

</code_context>

<deferred>
## Deferred Ideas

- **Chatbot interativo (Sonnet para interações):** AI-08 menciona "Sonnet para interações (v1.1)". O chatbot onde o cliente tira dúvidas sobre seu processo não está nesta fase. Diferido para roadmap futuro — fase não numerada ainda. Quando implementado, usar Sonnet (não Haiku) para qualidade de interação conversacional.
- **Alertas de budget para o escritório:** Em v1, apenas o admin recebe alertas de token. Quando houver dashboard do escritório (após Phase 4/5), adicionar visibilidade de consumo de tokens como feature.
- **Glossário editável pelo admin sem re-deploy:** Tabela `glossario_juridico` no banco foi considerada mas descartada para v1. Se o glossário precisar de updates frequentes, migrar de arquivo para banco em milestone futuro.
- **proxima_data como ISO date para ordenação:** Se o app_cliente precisar ordenar processos por próxima data importante, `proxima_data` precisará virar ISO string. Reavaliar em Phase 5 (app_cliente).
- **impacto como enum (positivo/neutro/negativo):** Descartado por risco jurídico em v1. Pode ser adicionado como feature opt-in se os advogados sinalizarem que o badge visual é importante para o cliente.

</deferred>

---

*Phase: 03-claude-ai-translation-core-value-prop*
*Context gathered: 2026-04-14*
