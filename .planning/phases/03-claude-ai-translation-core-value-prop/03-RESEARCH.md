# Phase 3: Claude AI Translation (Core Value Prop) — Research

**Researched:** 2026-04-14
**Domain:** Anthropic Claude API (prompt caching, structured outputs, token telemetry, model routing) + BullMQ worker patterns + Supabase schema design + OAB/LGPD compliance
**Confidence:** HIGH (core API facts verified against official Anthropic docs 2026-04-14)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** BullMQ job separado `translate-movimentacao` — worker de tradução separado do DataJud sync, mesmo processo `worker.ts` com múltiplos consumers
- **D-02:** Endpoint manual `POST /api/v1/processos/:id/traducao` retorna `202 Accepted` imediatamente (assíncrono, enfileira job)
- **D-03:** Glossário jurídico como arquivo de texto no repositório (`src/ai/glossario-juridico.md`), carregado na inicialização do worker, incluído no system prompt com `cache_control: "ephemeral"`
- **D-04:** Glossário v1 amplo: 100+ termos cobrindo direito civil, trabalhista e criminal
- **D-05:** System prompt genérico (instruções + glossário) para maximizar cache hits; contexto do processo no user turn com XML-delimitation
- **D-06:** `status` — texto livre gerado pela IA, tamanho máximo a definir (Claude's Discretion)
- **D-07:** `proxima_data` — texto descritivo ou null (não ISO date)
- **D-08:** `impacto` — texto descritivo livre (sem enum positivo/negativo/neutro)
- **D-09:** `explicacao` — texto livre em português simples
- **D-10:** Schema TypeBox: `{ status: Type.String(), proxima_data: Type.Union([Type.String(), Type.Null()]), explicacao: Type.String(), impacto: Type.String() }` — validado antes de salvar
- **D-11:** Hash SHA-256 sobre o texto bruto da movimentação, armazenado em `hash_texto` na tabela `movimentacoes`
- **D-12:** Cache hit visível em log: `translation_source: 'cache' | 'claude'`
- **D-13:** Haiku para jobs BullMQ automáticos; Sonnet diferido para chatbot (v1.1)
- **D-14:** `DEFAULT_TENANT_TOKEN_BUDGET` env var + campo `token_budget` em `escritorios` para override
- **D-15:** Alertas 50/80/100% apenas para admin do produto (Sentry ou email)
- **D-16:** Ao atingir 100%: novas traduções bloqueadas com `TOKEN_BUDGET_EXCEEDED`
- **D-17:** Tabela `token_usage`: `tenant_id`, `modelo`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`, `job_id`, `movimentacao_id`, `created_at`
- **D-18:** Tabelas PT-BR sem acentos: `movimentacoes` (+ `hash_texto`, `traducao_status`, `traducao_cache_hit`), `token_usage`
- **D-19:** CPF e PII nunca em prompts (LGPD-03)
- **D-20:** Conteúdo bruto de prompts não logado; logar apenas IDs e metadados de tokens

### Claude's Discretion

- Tamanho máximo de caracteres para `status` e `explicacao`
- Ciclo de reset do budget de tokens (data fixa ou rolling 30 dias)
- Estrutura exata do system prompt (além das constraints)
- Parâmetros de retry para o job `translate-movimentacao`
- Prioridade do job no BullMQ vs. jobs de sync DataJud

### Deferred Ideas (OUT OF SCOPE)

- Chatbot interativo (Sonnet para interações) — v1.1
- Alertas de budget para o escritório — fase futura
- Glossário editável pelo admin sem re-deploy — milestone futuro
- `proxima_data` como ISO date para ordenação — reavaliar em Phase 5
- `impacto` como enum — descartado por risco jurídico em v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | Endpoint traduz movimentações para português simples via Claude API | Anthropic SDK 0.89.0, claude-haiku-4-5 model, BullMQ consumer pattern |
| AI-02 | Prompt usa caching de tokens (system prompt + glossário em blocos `cache_control`) | Prompt caching docs verified: Haiku 4.5 min 4096 tokens, ephemeral TTL 5m |
| AI-03 | Input delimitado por tags XML (`<movimentacao>...</movimentacao>`) | XML tag isolation pattern verified from Anthropic prompt engineering docs |
| AI-04 | Output validado por schema antes de salvar | Structured Outputs GA para Haiku 4.5; fallback: TypeBox + JSON.parse |
| AI-05 | Tradução cacheada por hash do texto (não reprocessa igual) | SHA-256 via Node.js built-in crypto, armazenado em `hash_texto` no banco |
| AI-06 | Disclaimer "Explicação gerada por IA — confirme com seu advogado" em cada resposta | Campo obrigatório no output schema; OAB Rec. 001/2024 confirma exigência |
| AI-07 | Limites de tokens por tenant com alertas 50/80/100% | Padrão: SUM de token_usage por tenant + threshold check pós-job |
| AI-08 | Haiku para tradução em lote; Sonnet para interações (v1.1) | Verified: claude-haiku-4-5-20251001, $1/MTok input, $5/MTok output |
</phase_requirements>

---

## Summary

Esta fase implementa a proposta de valor central do Portal Jurídico: traduzir movimentações processuais opacas em linguagem acessível para o cliente leigo. A pesquisa confirma que o stack planejado é viável e bem suportado: o SDK Anthropic 0.89.0 expõe prompt caching nativo, o modelo Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) é o modelo mais recente da família Haiku com suporte a caching, structured outputs, e custo de $1/MTok input. O sistema de caching exige mínimo de 4.096 tokens antes do breakpoint para Haiku 4.5 — isso é uma restrição crítica que o glossário jurídico de 100+ termos precisa atender.

A arquitetura de deduplicação por hash SHA-256 é padrão de indústria, implementável com o módulo `crypto` nativo do Node.js sem dependências adicionais. O budget de tokens por tenant requer uma tabela `token_usage` com SUM agregado por `tenant_id` e período de reset — padrão de implementação straightforward em PostgreSQL/Supabase.

A questão da Zero Data Retention (ZDR) foi investigada: a ZDR é elegível para a Messages API (inclui Haiku), mas requer acordo contratual formal com a equipe de vendas da Anthropic. Para v1, a postura adequada é documentar na política de privacidade que a Anthropic é sub-processadora internacional (LGPD Art. 33) e que dados de API são retidos por até 7 dias — suficiente para lançamento. ZDR formal é um goal de Phase 8 (LGPD hardening).

Do ponto de vista ético/OAB, a distinção fundamental é clara: explicar o que aconteceu numa movimentação (permitido e incentivado) vs. dar conselho jurídico ("você deve recorrer") (proibido). O disclaimer obrigatório em todas as traduções atende à OAB Recomendação 001/2024.

**Recomendação primária:** Use `claude-haiku-4-5-20251001` com system prompt de ≥4096 tokens (instruções + glossário jurídico), structured outputs via `output_config.format`, e hash SHA-256 para deduplicação. Implemente budget tracking com SUM query + rolling 30 dias para alinhamento com billing.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.89.0 | Claude API client (TypeScript) | SDK oficial da Anthropic, suporte nativo a prompt caching e structured outputs |
| `bullmq` | 5.73.5 | Job queue para `translate-movimentacao` | Já presente no projeto (Phase 1/2), retry e BullMQ UnrecoverableError para erros permanentes |
| `@sinclair/typebox` | 0.34.49 | Validação de schema do output da IA | Já presente no projeto (Phase 1), integração nativa Fastify |
| `crypto` (built-in Node.js) | built-in | SHA-256 hash para deduplicação | Nenhuma dependência extra, crypto.createHash('sha256') nativo |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pino` (já presente) | — | Logging com redact de PII | Logar `movimentacao_id`, `hash_texto`, `modelo`, token counts — nunca conteúdo do prompt |
| `@sentry/node` (já presente) | — | Alertas de budget (50/80/100%) | Capturar evento quando threshold for atingido, com contexto `tenant_id` |
| Vitest (já presente) | — | Testes unitários do worker | Testar transformação de schema, hash determinism, budget logic |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `output_config.format` (structured outputs) | TypeBox parse + JSON.parse retry | Structured outputs GA para Haiku 4.5 — garante schema na primeira chamada; fallback com retry é mais frágil |
| SHA-256 via `crypto` nativo | `uuid` ou campo natural | SHA-256 garante determinismo — mesma movimentação sempre gera mesmo hash; UUID não serve para deduplication |
| Rolling 30 dias para reset | Reset em dia fixo (1° do mês) | Rolling 30 dias é mais justo para tenants que assinam em datas diferentes; ambos são implementáveis |

**Installation:** Apenas `@anthropic-ai/sdk` é nova dependência — BullMQ, TypeBox, pino, Sentry já estão no projeto.

```bash
npm install @anthropic-ai/sdk
```

**Version verification:**
- `@anthropic-ai/sdk`: 0.89.0 (publicado 2026-04-14) [VERIFIED: npm registry]
- `@sinclair/typebox`: 0.34.49 (publicado 2026-03-28) [VERIFIED: npm registry]
- `bullmq`: 5.73.5 (publicado 2026-04-12) [VERIFIED: npm registry]

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── ai/
│   ├── glossario-juridico.md       # 100+ termos, carregado na inicialização do worker
│   ├── translation-prompt.ts       # Monta system prompt + user turn com XML-delimitation
│   ├── translation-schema.ts       # TypeBox schema para output {status, proxima_data, explicacao, impacto}
│   └── translation-service.ts     # Chama Claude API, captura uso de tokens
├── workers/
│   ├── worker.ts                   # Entry point com múltiplos consumers (Phase 1 padrão)
│   └── translate-movimentacao.ts  # Consumer do job translate-movimentacao
├── budget/
│   └── token-budget.ts             # Verifica budget, dispara alertas, lança TOKEN_BUDGET_EXCEEDED
└── migrations/
    └── YYYYMMDD_add_ai_translation.sql  # hash_texto, traducao_*, token_usage table
```

### Pattern 1: Prompt Caching com System Prompt Array

**O que é:** O system prompt é estruturado como array de TextBlockParam, com `cache_control` no último bloco (glossário) para maximizar cache hits entre requests de diferentes processos.

**Quando usar:** Sempre — o sistema prompt é genérico e idêntico para todos os tenants. O contexto do processo (número CNJ, partes) vai no user turn para não quebrar o cache.

**Requisito crítico para Haiku 4.5:** O conteúdo antes do breakpoint de cache deve ter **≥4.096 tokens**. Um glossário jurídico de 100+ termos com definições detalhadas atinge esse threshold. Verificar com `client.messages.countTokens()` antes de fazer deploy.

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Carregado uma vez na inicialização do worker
const glossario = fs.readFileSync('src/ai/glossario-juridico.md', 'utf-8');

const SYSTEM_PROMPT_BLOCKS: Anthropic.TextBlockParam[] = [
  {
    type: 'text',
    text: `Você é um assistente especializado em traduzir movimentações processuais jurídicas do Brasil para linguagem simples e acessível para cidadãos leigos.

Suas traduções devem:
- Usar linguagem clara, direta e sem jargão técnico
- Explicar o que aconteceu no processo em termos que qualquer pessoa possa entender
- Nunca dar conselhos jurídicos, recomendações de estratégia ou prognóstico do processo
- Sempre incluir o disclaimer obrigatório: "Explicação gerada por IA — confirme com seu advogado"
- Responder em português do Brasil

Glossário de termos jurídicos para referência:
${glossario}`,
    cache_control: { type: 'ephemeral' }, // Cache o bloco completo (instruções + glossário)
  },
];

// Chamada ao Claude com cache
const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1024,
  system: SYSTEM_PROMPT_BLOCKS,
  messages: [
    {
      role: 'user',
      content: `<contexto>
Processo: ${processo.numero_cnj}
Tipo de ação: ${processo.tipo_acao}
Partes: ${processo.partes_resumo}
</contexto>

<movimentacao>
${movimentacaoTexto}
</movimentacao>

Traduza esta movimentação para linguagem simples. Retorne um JSON com os campos: status, proxima_data, explicacao, impacto.`,
    },
  ],
  output_config: {
    format: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Descrição curta do status atual em linguagem simples' },
          proxima_data: {
            oneOf: [
              { type: 'string', description: 'Texto descritivo sobre próxima data importante' },
              { type: 'null' },
            ],
          },
          explicacao: { type: 'string', description: 'Explicação do que aconteceu nesta movimentação' },
          impacto: { type: 'string', description: 'O que isso significa para o cliente' },
          disclaimer: { type: 'string', description: 'Sempre: Explicação gerada por IA — confirme com seu advogado' },
        },
        required: ['status', 'proxima_data', 'explicacao', 'impacto', 'disclaimer'],
        additionalProperties: false,
      },
    },
  },
});
```

**Nota sobre `output_config.format`:** Structured Outputs estão GA para Haiku 4.5. O campo `output_format` (beta) foi renomeado para `output_config.format`. Beta headers não são mais necessários. [VERIFIED: platform.claude.com/docs/en/build-with-claude/structured-outputs]

### Pattern 2: Captura de Telemetria de Tokens

**O que é:** Após cada chamada à Claude API, os campos `usage` da resposta são lidos e persistidos na tabela `token_usage`.

**Campos disponíveis no response.usage:** [VERIFIED: platform.claude.com/docs/en/build-with-claude/prompt-caching]

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
interface TokenUsage {
  input_tokens: number;             // Tokens após o último breakpoint de cache
  output_tokens: number;            // Tokens gerados pelo modelo
  cache_creation_input_tokens: number; // Tokens escritos no cache (neste request)
  cache_read_input_tokens: number;  // Tokens lidos do cache (hits)
}

// Total real de tokens processados = input_tokens + cache_read_input_tokens + cache_creation_input_tokens
const totalInputTokens =
  response.usage.input_tokens +
  response.usage.cache_read_input_tokens +
  response.usage.cache_creation_input_tokens;

// Persistir no banco
await supabase.from('token_usage').insert({
  tenant_id: job.data.tenant_id,
  modelo: 'claude-haiku-4-5-20251001',
  input_tokens: response.usage.input_tokens,
  output_tokens: response.usage.output_tokens,
  cache_read_tokens: response.usage.cache_read_input_tokens,
  cache_creation_tokens: response.usage.cache_creation_input_tokens,
  job_id: job.id,
  movimentacao_id: job.data.movimentacao_id,
});
```

### Pattern 3: Hash SHA-256 para Deduplicação

**O que é:** O hash é calculado sobre o texto bruto da movimentação antes de qualquer chamada à Claude. Se o hash já existe para o tenant, retorna a tradução em cache sem nova chamada.

```typescript
// Source: Node.js built-in crypto module — https://nodejs.org/api/crypto.html
import { createHash } from 'crypto';

function hashMovimentacao(textoMovimentacao: string): string {
  return createHash('sha256').update(textoMovimentacao, 'utf8').digest('hex');
}

// No worker:
const hashTexto = hashMovimentacao(job.data.texto_movimentacao);

// Checar cache no banco
const { data: existing } = await supabase
  .from('movimentacoes')
  .select('id, traducao_json')
  .eq('hash_texto', hashTexto)
  .eq('tenant_id', job.data.tenant_id)
  .not('traducao_json', 'is', null)
  .single();

if (existing) {
  // Cache hit — retornar sem chamar Claude
  logger.info({ movimentacao_id: job.data.movimentacao_id, hash_texto: hashTexto, translation_source: 'cache' });
  return existing.traducao_json;
}

// Cache miss — chamar Claude
logger.info({ movimentacao_id: job.data.movimentacao_id, hash_texto: hashTexto, translation_source: 'claude' });
```

### Pattern 4: BullMQ Worker com UnrecoverableError

**O que é:** O worker `translate-movimentacao` diferencia erros recuperáveis (rate limits, timeout) de erros não-recuperáveis (schema validation failure, budget excedido). Erros não-recuperáveis usam `UnrecoverableError` para não desperdiçar retries.

```typescript
// Source: https://docs.bullmq.io/patterns/stop-retrying-jobs
import { Worker, UnrecoverableError } from 'bullmq';

const translateWorker = new Worker(
  'translate-movimentacao',
  async (job) => {
    // 1. Checar budget ANTES de chamar Claude
    const budgetExceeded = await checkTokenBudget(job.data.tenant_id);
    if (budgetExceeded) {
      throw new UnrecoverableError('TOKEN_BUDGET_EXCEEDED'); // Não retentar
    }

    // 2. Chamar Claude (erros de rede/timeout → BullMQ retry normal)
    let response;
    try {
      response = await callClaude(job.data);
    } catch (err) {
      if (err.status === 429) throw err; // Rate limit — retentar
      throw new UnrecoverableError(`CLAUDE_API_ERROR: ${err.message}`);
    }

    // 3. Validar schema TypeBox
    const validation = TypeCompiler.Compile(TranslacaoSchema).Check(JSON.parse(response.content[0].text));
    if (!validation) {
      throw new UnrecoverableError('SCHEMA_VALIDATION_FAILED'); // Não retentar — output inválido
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);
```

**Retry strategy recomendada (Claude's Discretion aplicada):**

```typescript
// Adicionar job com retry exponencial + jitter
await translateQueue.add('translate', jobData, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,  // 2s, 4s, 8s, 16s, 32s
    jitter: 0.3,  // ±30% para evitar thundering herd
  },
  priority: 2, // Menor prioridade que DataJud sync (prioridade 1)
});
```

### Pattern 5: Budget Tracking com Reset Rolling 30 Dias

**O que é:** A query de budget soma tokens do `token_usage` para o período relevante. Reset rolling (30 dias a partir do `created_at` do tenant) é mais justo que data fixa.

```sql
-- Verificar consumo atual do tenant no período rolling
SELECT
  COALESCE(SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens), 0) AS tokens_usados
FROM token_usage
WHERE
  tenant_id = $1
  AND created_at >= (NOW() - INTERVAL '30 days');
```

```typescript
async function checkTokenBudget(tenantId: string): Promise<{ exceeded: boolean; percentual: number }> {
  const { data: escritorio } = await supabase
    .from('escritorios')
    .select('token_budget, created_at')
    .eq('id', tenantId)
    .single();

  const budget = escritorio.token_budget ?? Number(process.env.DEFAULT_TENANT_TOKEN_BUDGET ?? 1_000_000);

  const { data } = await supabase.rpc('get_token_usage_30d', { p_tenant_id: tenantId });
  const tokensUsados = data?.tokens_usados ?? 0;
  const percentual = (tokensUsados / budget) * 100;

  return { exceeded: percentual >= 100, percentual };
}

async function checkAndFireAlerts(tenantId: string, percentual: number) {
  const thresholds = [50, 80, 100];
  for (const threshold of thresholds) {
    if (percentual >= threshold) {
      Sentry.captureMessage(`Token budget ${threshold}% atingido`, {
        level: threshold === 100 ? 'error' : 'warning',
        extra: { tenant_id: tenantId, percentual },
      });
    }
  }
}
```

**Nota de implementação:** A alert logic deve evitar disparar o mesmo alerta múltiplas vezes. Recomendado: armazenar `ultimo_alerta_nivel` em `escritorios` e só disparar quando subir de nível (ex.: de 50% para 80%).

### Anti-Patterns to Avoid

- **Não incluir CPF ou dados pessoais no prompt:** DataJud por padrão não expõe CPF nas movimentações, mas a camada de preparação do prompt deve verificar. A validação deve acontecer antes de inserir `<movimentacao>` no template. [Locked: D-19]
- **Não logar o conteúdo do prompt:** pino `redact` já configurado em Phase 1 (`*.prompt_text`). Adicionar `prompt_content` e `movimentacao_texto` à lista de redact se necessário.
- **Não colocar dados variáveis no system prompt:** Context do processo (número CNJ, partes, tipo de ação) deve ir SEMPRE no user turn — nunca no system prompt. Dados variáveis no system prompt invalidam o cache.
- **Não usar TypeBox apenas para documentação:** Compilar o schema com `TypeCompiler.Compile()` e usar `.Check()` para validação runtime real — não apenas type inference.
- **Não confundir `input_tokens` com total:** `response.usage.input_tokens` representa apenas os tokens APÓS o último breakpoint de cache. Total real = `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`. [VERIFIED: Anthropic docs]
- **Não assumir que o cache vai ativar:** Verificar em dev que `cache_creation_input_tokens > 0` na primeira chamada e `cache_read_input_tokens > 0` nas subsequentes. Se ambos forem 0, o glossário pode estar abaixo dos 4.096 tokens mínimos exigidos pelo Haiku 4.5.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema-validated JSON output | Parser regex customizado ou JSON.parse com try/catch | `output_config.format` com `json_schema` (Structured Outputs GA Haiku 4.5) | Constrained decoding garante schema na primeira chamada — sem retries |
| SHA-256 hash | Biblioteca externa de hashing | `crypto.createHash('sha256')` do Node.js built-in | Zero dependência, determinístico, tamanho fixo 64 chars hex |
| Retry com backoff | setTimeout manual | BullMQ `attempts` + `backoff: { type: 'exponential', jitter: 0.3 }` | BullMQ já lida com persistência de estado, dead-letter, observabilidade via Bull Board |
| Distinção de erros recuperáveis | Flag booleana customizada | BullMQ `UnrecoverableError` | API nativa de BullMQ para erros permanentes — move para failed sem consumir retries |
| Token counting antes de cache | Estimar tokens manualmente | `client.messages.countTokens()` do SDK Anthropic | Contagem exata antes do request para validar que o glossário atinge 4096 tokens |

**Key insight:** A Anthropic forçou schema compliance via constrained decoding (Structured Outputs) — o output NUNCA viola o schema. Usar isso em vez de parse-retry é dramaticamente mais confiável.

---

## Common Pitfalls

### Pitfall 1: Glossário Abaixo do Threshold Mínimo de Cache (Haiku 4.5 = 4.096 tokens)

**O que dá errado:** O worker sobe em produção, `cache_creation_input_tokens` e `cache_read_input_tokens` são sempre 0 — o caching não ativa. Custo de tokens é 10x mais alto que o esperado.

**Por que acontece:** Haiku 4.5 exige **mínimo de 4.096 tokens** antes do breakpoint de cache. Se o system prompt completo (instruções + glossário) não atingir esse threshold, a Anthropic processa sem caching silenciosamente — sem erro, sem aviso.

**Como evitar:**
1. Usar `client.messages.countTokens()` para contar o system prompt antes do deploy
2. Se < 4.096 tokens: expandir o glossário, adicionar exemplos de tradução, ou adicionar more context na seção de instruções
3. Monitorar `cache_read_input_tokens > 0` nos primeiros jobs de produção como gate de saúde

**Warning signs:** `cache_creation_input_tokens === 0` E `cache_read_input_tokens === 0` em toda chamada.

[VERIFIED: platform.claude.com/docs/en/build-with-claude/prompt-caching — tabela "Minimum Token Thresholds"]

### Pitfall 2: Contexto Variável no System Prompt Invalida o Cache

**O que dá errado:** `cache_creation_input_tokens > 0` em todo request — o cache nunca é reutilizado. Custo cresce linearmente com número de traduções.

**Por que acontece:** Qualquer informação variável (número do processo, nome das partes, data) colocada no system prompt gera um hash diferente do cache — nunca há match.

**Como evitar:** System prompt = APENAS instruções estáticas + glossário. Tudo variável (número CNJ, partes, contexto do processo) vai no user turn dentro de `<contexto>` tags.

**Warning signs:** `cache_read_input_tokens === 0` em requests consecutivos com o mesmo tenant.

### Pitfall 3: Budget Alert Dispara a Cada Job Acima do Threshold

**O que dá errado:** Depois que um tenant atinge 80% do budget, CADA job subsequente dispara um alerta para o admin — Sentry/email inundados.

**Por que acontece:** A lógica de alerta verifica apenas `percentual >= threshold`, sem guardar estado de qual threshold já foi disparado.

**Como evitar:** Adicionar coluna `ultimo_alerta_nivel` (INTEGER: 0/50/80/100) na tabela `escritorios`. Só disparar alerta quando `percentual` cruzar para um novo nível maior que o armazenado. Atualizar `ultimo_alerta_nivel` após disparar. Resetar junto com o ciclo do budget.

### Pitfall 4: `UnrecoverableError` Engole o Contexto do Erro para Debugging

**O que dá errado:** Jobs falham com `UnrecoverableError` mas a mensagem de erro não tem contexto suficiente para debugging — difícil saber qual movimentação falhou e por quê.

**Como evitar:** Sempre incluir `movimentacao_id`, `tenant_id`, e tipo de falha na mensagem do `UnrecoverableError`. Antes de lançar, logar com pino em nível `error` com contexto completo (exceto conteúdo do prompt).

### Pitfall 5: Structured Outputs e o Campo `oneOf` para `proxima_data: string | null`

**O que dá errado:** O schema usa `Type.Union([Type.String(), Type.Null()])` do TypeBox, mas ao converter para JSON Schema para o `output_config.format`, o `oneOf` pode não ser suportado por constrained decoding.

**Como evitar:** Usar `anyOf` ao invés de `oneOf` no JSON Schema passado para `output_config.format`. Alternativamente, usar string com valor especial `"null"` e mapear no código, ou usar o TypeBox schema apenas para validação pós-parse (não para o `output_config.format`).

**Recomendação:** Testar explicitamente em dev que `proxima_data: null` retorna corretamente antes de usar em produção.

---

## Code Examples

### SDK Initialization e Modelo Correto

```typescript
// Source: https://platform.claude.com/docs/en/about-claude/models/overview
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Obrigatório — nunca hardcode
});

// Modelo correto: claude-haiku-4-5-20251001 (atual em 2026-04-14)
// API alias: claude-haiku-4-5
// Preço: $1/MTok input, $5/MTok output
// Context window: 200k tokens, max output: 64k tokens
// Cache mínimo: 4096 tokens
const TRANSLATION_MODEL = 'claude-haiku-4-5-20251001';
```

### Verificação de Tokens Antes do Deploy

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/token-counting
async function validateCacheThreshold(systemPromptBlocks: Anthropic.TextBlockParam[]) {
  const tokenCount = await client.messages.countTokens({
    model: TRANSLATION_MODEL,
    system: systemPromptBlocks,
    messages: [{ role: 'user', content: 'test' }],
  });

  const HAIKU_45_MIN_CACHE_TOKENS = 4096;
  if (tokenCount.input_tokens < HAIKU_45_MIN_CACHE_TOKENS) {
    throw new Error(
      `System prompt tem apenas ${tokenCount.input_tokens} tokens. ` +
      `Haiku 4.5 requer >= ${HAIKU_45_MIN_CACHE_TOKENS} para caching. ` +
      `Expanda o glossário jurídico.`
    );
  }

  console.log(`System prompt: ${tokenCount.input_tokens} tokens — cache threshold OK`);
}
```

### TypeBox Schema para Validação Pós-Parse

```typescript
// Source: TypeBox docs — para validação TypeScript runtime
import { Type, Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

export const TranslacaoSchema = Type.Object({
  status: Type.String({ maxLength: 200 }),    // Claude's Discretion: 200 chars
  proxima_data: Type.Union([Type.String(), Type.Null()]),
  explicacao: Type.String({ maxLength: 1000 }), // Claude's Discretion: 1000 chars
  impacto: Type.String({ maxLength: 500 }),    // Claude's Discretion: 500 chars
  disclaimer: Type.Literal('Explicação gerada por IA — confirme com seu advogado'),
});

export type Translacao = Static<typeof TranslacaoSchema>;
const TranslacaoCheck = TypeCompiler.Compile(TranslacaoSchema);

export function validateTranslacao(raw: unknown): Translacao {
  if (!TranslacaoCheck.Check(raw)) {
    const errors = [...TranslacaoCheck.Errors(raw)];
    throw new Error(`Schema validation failed: ${JSON.stringify(errors)}`);
  }
  return raw as Translacao;
}
```

### SQL Migration — Novas Colunas e Tabela

```sql
-- Migration: add AI translation columns to movimentacoes
ALTER TABLE movimentacoes
  ADD COLUMN IF NOT EXISTS hash_texto    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS traducao_json JSONB,
  ADD COLUMN IF NOT EXISTS traducao_status TEXT DEFAULT 'pending'
    CHECK (traducao_status IN ('pending', 'processing', 'done', 'failed', 'budget_exceeded')),
  ADD COLUMN IF NOT EXISTS traducao_cache_hit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS traduzido_em TIMESTAMPTZ;

-- Index para deduplicação por hash (lookup frequente)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_hash_texto ON movimentacoes (hash_texto)
  WHERE hash_texto IS NOT NULL;

-- Tabela de telemetria de tokens por tenant
CREATE TABLE IF NOT EXISTS token_usage (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  modelo          TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens     INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
  job_id          TEXT,
  movimentacao_id UUID REFERENCES movimentacoes(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index para budget queries (SUM por tenant no período)
CREATE INDEX IF NOT EXISTS idx_token_usage_tenant_created ON token_usage (tenant_id, created_at DESC);

-- RLS para token_usage (admin_escritorio pode ver seu próprio consumo no futuro)
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_usage_tenant_isolation" ON token_usage
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Coluna token_budget em escritorios (se não existir)
ALTER TABLE escritorios
  ADD COLUMN IF NOT EXISTS token_budget        INTEGER,
  ADD COLUMN IF NOT EXISTS ultimo_alerta_nivel INTEGER DEFAULT 0;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Beta header `structured-outputs-2025-11-13` + `output_format` param | `output_config.format` sem beta header | Nov 2025 → GA | Structured Outputs GA para Haiku 4.5 sem beta flag |
| `claude-3-haiku-20240307` (Haiku 3 — deprecated) | `claude-haiku-4-5-20251001` | Out 2025 | Haiku 3 aposentado em Apr 19, 2026 — migrar agora |
| Prefilled assistant responses (`messages[last].role = 'assistant'`) | Deprecated em Claude 4.6+ | 2026 | Não usar prefill — usar Structured Outputs ou instrução direta |
| Extended thinking com `budget_tokens` | Adaptive thinking com `effort` param | 2026 (Claude 4.6) | Não relevante para Haiku (Haiku 4.5 não tem adaptive thinking) |
| Prompt caching apenas via beta header | Caching GA via `cache_control` em content blocks | 2024 | Nenhum beta header necessário para caching |

**Deprecated/outdated:**
- `claude-3-haiku-20240307`: Deprecated, aposentado em **19 de Abril de 2026** — URGENTE migrar antes
- `claude-haiku-3-5` (sem snapshot date): Continua disponível mas não é o mais atual — preferir `claude-haiku-4-5-20251001`
- Beta header `structured-outputs-2025-11-13`: Ainda funciona transitoriamente mas deve ser removido — usar `output_config.format`

---

## Zero Data Retention (ZDR) — Investigação Crítica (Q3)

**Resultado da investigação:**

ZDR é elegível para a Claude Messages API (`/v1/messages`) — o endpoint que este projeto usa. Isso inclui chamadas a Haiku 4.5. [VERIFIED: platform.claude.com/docs/en/build-with-claude/api-and-data-retention]

**O que ZDR cobre:**
- Inputs e outputs da Messages API não são armazenados após o retorno da resposta
- KV cache (prompt caching) é mantido em memória pelo TTL do cache, depois deletado

**O que ZDR NÃO cobre automaticamente:**
- ZDR requer **acordo contratual formal** com a equipe de vendas da Anthropic (não é automático)
- Batch API NÃO é elegível para ZDR (29 dias de retenção)
- Por padrão sem ZDR: dados da API são retidos por **7 dias** (reduzido de 30 dias em Set/2025)

**Como obter ZDR:** Contato com [Anthropic sales team](https://claude.com/contact-sales) para assinar acordo.

**Recomendação para v1:**
- v1 (Phase 3): Operar sem ZDR formal — retenção padrão de 7 dias é aceitável para dados processuais (não há PII/CPF nos prompts por D-19)
- Documentar na política de privacidade: Anthropic como sub-processadora internacional, dados de API retidos por até 7 dias pela Anthropic
- Phase 8 (LGPD Hardening): Avaliar ZDR formal como item de launch checklist

**LGPD Art. 33 — Sub-processador Internacional:**
A Resolução CD/ANPD No. 19/2024 (em vigor desde Ago/2025) exige mecanismo de transferência internacional adequado. Para v1: cláusula na política de privacidade com disclosure de Anthropic como sub-processador é o caminho mínimo. ZDR formal ou SCCs são o nível completo para Phase 8.

---

## OAB Ethics — Explicação vs. Aconselhamento (Q5)

**Resultado da investigação:**

A OAB publicou a **Recomendação 001/2024** (aprovada em Nov/2024) especificamente sobre uso de IA generativa na advocacia. [VERIFIED: oab.org.br + advtechpro.ai]

**Distinção fundamental:**

| Permitido | Proibido |
|-----------|----------|
| Explicar o que aconteceu em uma movimentação processual | Dizer ao cliente "você deve recorrer" |
| Descrever o estado atual do processo em linguagem simples | Estimar prazo de resolução do processo |
| Traduzir termos jurídicos para linguagem acessível | Classificar movimentação como "boa" ou "má" para o cliente |
| Informar qual a próxima data de audiência/prazo | Calcular valor esperado de indenização |

**Requisitos da OAB Rec. 001/2024 aplicáveis ao Portal Jurídico:**
1. **Supervisão humana:** O advogado é responsável final pelo conteúdo — o portal é ferramenta para o advogado, não autônoma
2. **Transparência com o cliente:** O cliente deve saber que explicações são geradas por IA — o disclaimer cumpre isso
3. **Confidencialidade:** PII e segredos do processo não devem ser inseridos na IA sem garantias — D-19 cobre isso (sem CPF nos prompts)
4. **Disclaimer obrigatório:** "Explicação gerada por IA — confirme com seu advogado" — já é campo obrigatório no schema (AI-06)

**Conclusão:** O design atual (AI-06, D-08 sem enum de impacto, disclaimer obrigatório) está dentro dos limites éticos da OAB. O campo `impacto` como texto livre descritivo (não classificação positiva/negativa) é a escolha juridicamente prudente confirmada por esta pesquisa.

---

## Claude PT-BR para Jargão Jurídico — Qualidade (Q2)

**Status da investigação:** Verificação empírica com 50-100 movimentações reais não foi realizada nesta sessão de pesquisa — requereria execução de chamadas reais à API com dados de processo.

**O que a pesquisa indica:** [ASSUMED — baseado em training knowledge]
- Claude Haiku 4.5 tem treinamento em português brasileiro e demonstra qualidade adequada para tarefas de tradução/simplificação de texto técnico
- O glossário de 100+ termos no system prompt é a mitigação principal para garantir consistência terminológica
- O sistema de hash deduplication significa que movimentações idênticas sempre produzem o mesmo resultado — consistência garantida para inputs repetidos

**Recomendação:** Realizar um smoke test com 10-20 movimentações reais de DataJud em Phase 3, Wave 1, antes de escalar o worker para todas as movimentações. Avaliar qualidade manualmente com um advogado antes de ativar para tenants.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Haiku 4.5 tem qualidade suficiente para tradução de jargão jurídico PT-BR | Claude PT-BR Quality | Core value prop comprometida — precisaria upgrade para Sonnet (3x mais caro) |
| A2 | Retenção padrão de 7 dias sem ZDR é aceitável para LGPD v1 sem CPF nos prompts | ZDR section | Advogado de privacidade pode discordar — risco de compliance em Phase 8 |
| A3 | Limite de 200 chars para `status`, 1000 para `explicacao`, 500 para `impacto` | TypeBox Schema | Pode ser insuficiente para movimentações complexas — ajustar se Claude truncar |
| A4 | Rolling 30 dias é mais justo que data fixa para reset do budget | Budget Pattern | Implementação mais complexa — data fixa é mais simples se billincycle for padronizado |

---

## Open Questions

1. **Threshold de tokens do glossário**
   - O que sabemos: Haiku 4.5 exige ≥4.096 tokens antes do breakpoint de cache
   - O que é incerto: Um glossário de 100 termos com definições detalhadas atinge ~2.000-4.000 tokens — pode ficar no limite
   - Recomendação: Usar `client.messages.countTokens()` em Wave 0 para verificar e expandir glossário se necessário

2. **Suporte a `oneOf` vs `anyOf` em Structured Outputs para `proxima_data: string | null`**
   - O que sabemos: `output_config.format` usa constrained decoding sobre JSON Schema
   - O que é incerto: Se `oneOf` com `[{type: string}, {type: null}]` é suportado pelo constrained decoding
   - Recomendação: Testar em dev antes de usar em produção; fallback: `type: ['string', 'null']` (JSON Schema draft-7)

3. **Nível de alert deduplication**
   - O que sabemos: Alertas de budget devem disparar apenas uma vez por threshold (50%, 80%, 100%)
   - O que é incerto: A lógica de `ultimo_alerta_nivel` precisa de reset junto com o ciclo do budget
   - Recomendação: Armazenar `ultimo_alerta_nivel` + `budget_cycle_start` em `escritorios` para reset coordenado

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v24.14.0 | — |
| `@anthropic-ai/sdk` | AI-01..08 | Instalar | 0.89.0 | — (não negociável) |
| Redis (Upstash/local) | BullMQ jobs | ✓ (Phase 1) | — | Docker Compose em dev |
| Supabase | Banco de dados | ✓ (Phase 1) | — | — |
| `ANTHROPIC_API_KEY` | SDK | Variável de ambiente | — | BLOCKER se não configurada |
| `DEFAULT_TENANT_TOKEN_BUDGET` | Budget tracking | Variável de ambiente | — | Default 1.000.000 no código |

**Missing dependencies with no fallback:**
- `ANTHROPIC_API_KEY` — bloqueia todas as chamadas ao Claude. Deve ser configurada no Railway antes do deploy do worker.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (Phase 1) |
| Config file | `vitest.config.ts` (Phase 1) |
| Quick run command | `vitest run src/ai/ --reporter=verbose` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Worker traduz movimentação e retorna schema válido | Integration | `vitest run src/workers/translate-movimentacao.test.ts` | ❌ Wave 0 |
| AI-02 | Segunda chamada com mesmo system prompt gera cache_read > 0 | Integration (real API) | Manual smoke test | ❌ Wave 0 |
| AI-03 | Input XML-delimitado não executa instruções injetadas | Unit | `vitest run src/ai/translation-prompt.test.ts` | ❌ Wave 0 |
| AI-04 | Output inválido da IA lança erro estruturado sem salvar | Unit | `vitest run src/ai/translation-schema.test.ts` | ❌ Wave 0 |
| AI-05 | Segunda tradução com mesmo texto retorna cache hit (sem chamada Claude) | Unit | `vitest run src/workers/translate-movimentacao.test.ts -t dedup` | ❌ Wave 0 |
| AI-06 | Disclaimer presente em toda tradução salva | Unit | `vitest run src/ai/translation-schema.test.ts -t disclaimer` | ❌ Wave 0 |
| AI-07 | Budget check bloqueia job quando 100% atingido | Unit | `vitest run src/budget/token-budget.test.ts` | ❌ Wave 0 |
| AI-08 | Log de cada job contém `modelo: 'claude-haiku-4-5-20251001'` | Unit | `vitest run src/workers/translate-movimentacao.test.ts -t model-log` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `vitest run src/ai/ src/budget/ --reporter=verbose`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green antes de `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/ai/translation-prompt.test.ts` — cobre AI-03 (XML injection defense)
- [ ] `src/ai/translation-schema.test.ts` — cobre AI-04, AI-06 (schema validation, disclaimer)
- [ ] `src/workers/translate-movimentacao.test.ts` — cobre AI-01, AI-05, AI-08
- [ ] `src/budget/token-budget.test.ts` — cobre AI-07 (budget threshold logic)
- [ ] `src/ai/glossario-juridico.md` — o arquivo do glossário (não é código, mas é necessário para Wave 0)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — endpoints herdam autenticação da Phase 1 |
| V3 Session Management | no | N/A |
| V4 Access Control | yes | Tenant isolation via RLS em `token_usage` e `movimentacoes` |
| V5 Input Validation | yes | XML tag delimitation de texto DataJud (untrusted), TypeBox para output da IA |
| V6 Cryptography | yes | SHA-256 (Node.js crypto built-in) — nunca hand-roll hashing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via movimentação DataJud | Tampering | XML tag delimitation: `<movimentacao>texto</movimentacao>` — isola da instrução |
| CPF/PII em prompts enviados à Anthropic | Information Disclosure | Validação na camada de preparação do prompt (D-19); pino redact (D-20) |
| Cross-tenant token usage | Elevation of Privilege | `tenant_id` sempre incluído em `token_usage`; RLS policy no banco |
| Budget bypass por job concorrente | Denial of Service | Checar budget ANTES de enfileirar job de tradução (não apenas antes de chamar Claude) |
| Schema manipulation na resposta da IA | Tampering | Structured Outputs com `additionalProperties: false`; TypeBox .Check() como segunda camada |

**Prompt Injection Defense — XML Tag Pattern:**

```typescript
// Pattern verificado em: platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags
// XML tags criam namespace semântico que reduz ambiguidade para o modelo
// O modelo é treinado para tratar conteúdo dentro de <movimentacao> como dados, não instruções

const userTurn = `<contexto>
Processo: ${sanitizeText(processo.numero_cnj)}
Tipo de ação: ${sanitizeText(processo.tipo_acao)}
</contexto>

<movimentacao>
${sanitizeText(textoMovimentacao)}
</movimentacao>

Traduza a movimentação acima para português simples.`;

// sanitizeText: remover/escapar tags XML no input do DataJud para evitar injeção de tags
function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

**Nota:** O texto dentro de `<movimentacao>` pode conter instruções do tipo "ignore the above". A defesa é que o sistema prompt instrui o modelo a tratar o conteúdo XML como dados a traduzir, não como instruções. Claude 4.x foi significativamente mais robusto a prompt injection (Haiku 4.5 descende desta família). Sanitizar tags XML no input é a defesa de profundidade.

---

## Sources

### Primary (HIGH confidence)

- `platform.claude.com/docs/en/build-with-claude/prompt-caching` — Prompt caching: Haiku 4.5 min 4096 tokens, cache_control structure, TTL, usage fields, 4 breakpoints max
- `platform.claude.com/docs/en/about-claude/models/overview` — Model IDs: `claude-haiku-4-5-20251001`, preços, context window, deprecated models
- `platform.claude.com/docs/en/about-claude/pricing` — Haiku 4.5: $1/MTok input, $5/MTok output, cache write/read rates
- `platform.claude.com/docs/en/build-with-claude/api-and-data-retention` — ZDR: elegível para Messages API, 7 dias retenção padrão, exige contrato
- `platform.claude.com/docs/en/build-with-claude/structured-outputs` — Structured Outputs GA Haiku 4.5, `output_config.format`, sem beta header
- `platform.claude.com/docs/en/api/typescript/messages/create` — SDK TypeScript: `system` como `string | Array<TextBlockParam>`, `cache_control` type
- `platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags` — XML tag best practices para estruturação de prompts e input isolation
- `docs.bullmq.io/guide/retrying-failing-jobs` — BullMQ retry: exponential + jitter options
- `docs.bullmq.io/patterns/stop-retrying-jobs` — UnrecoverableError para erros permanentes
- npm registry — `@anthropic-ai/sdk@0.89.0`, `bullmq@5.73.5`, `@sinclair/typebox@0.34.49` (verificados 2026-04-14)
- Node.js v24.14.0 (verificado localmente)

### Secondary (MEDIUM confidence)

- `oab.org.br/noticia/62704` — OAB Recomendação 001/2024: AI em advocacia, supervisão humana, disclaimer requirement
- `advtechpro.ai/uso-responsavel-ia-generativa-advocacia-recomendacao-001-2024` — Detalhes da Rec. 001/2024 OAB
- Anthropic ZDR Privacy Center articles — ZDR cobre APIs elegíveis, exige acordo formal

### Tertiary (LOW confidence)

- Search results sobre LGPD Art. 33 / Resolução CD/ANPD No. 19/2024 — confirma necessidade de disclosure de sub-processador, mas aplicabilidade específica ao caso requer revisão jurídica

---

## Metadata

**Confidence breakdown:**
- Standard stack (SDK, model, versions): HIGH — verificado via npm registry + Anthropic official docs
- Prompt caching mechanics (thresholds, structure): HIGH — verificado via Anthropic official docs
- Structured Outputs (GA, `output_config.format`): HIGH — verificado via Anthropic official docs
- ZDR availability e scope: HIGH — verificado via Anthropic data retention docs
- OAB ethics distinction: MEDIUM — verificado via OAB site oficial + secundário, mas sem revisão jurídica formal
- Claude PT-BR translation quality: LOW — não testado empiricamente nesta sessão

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 dias — stack Anthropic relativamente estável, mas verificar model deprecations)

---

## RESEARCH COMPLETE
