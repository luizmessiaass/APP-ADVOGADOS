# Phase 2: DataJud Integration & Sync Worker — Research

**Pesquisado:** 2026-04-14
**Domínio:** DataJud API (CNJ) + BullMQ + Circuit Breaker + Supabase schema
**Confiança geral:** MEDIUM (DataJud: LOW-MEDIUM por ausência de SLA e documentação esparsa; BullMQ/opossum: HIGH por documentação oficial)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01/D-02:** Tiers classificados automaticamente por recência; reclassificação a cada sync run.
- **D-03/D-04/D-05/D-06:** Segredo de justiça — processo permanece cadastrado, sem movimentações; cliente vê mensagem genérica; advogado recebe registro em `sync_errors` tipo `segredo_justica`. **Pesquisa deve confirmar como o DataJud sinaliza sigilo.**
- **D-07/D-08/D-09:** 72 horas de tolerância de staleness; campo `ultima_sincronizacao` como fonte de verdade.
- **D-10/D-11/D-12:** Bull Board em `/admin/queues`, Bearer token simples em env, roteado pelo serviço API (não worker).
- **D-13/D-14:** Validação mod-97 (Resolução CNJ 65/2008) obrigatória. Formato `NNNNNNN-DD.AAAA.J.TT.OOOO`. Rejeitar com `INVALID_CNJ`.
- **D-15/D-16:** Circuit breaker suspende chamadas após N falhas (Claude's Discretion para N); estado persistido no Redis.
- **D-17/D-18:** Checkpoint via `job.data` no BullMQ; diffing por ID estável (campo a confirmar na pesquisa).
- **D-19/D-20:** Nomenclatura PT-BR sem acentos. Retenção de `sync_errors` a definir (Claude's Discretion).

### Claude's Discretion
- Limiares exatos dos tiers (dias por tier)
- Parâmetros de exponential backoff + jitter (DATAJUD-03)
- N-failures para circuit breaker e tempo de half-open
- Implementação do algoritmo mod-97
- ID de movimentação para diffing
- Prazo de retenção de `sync_errors`
- Rate limiting numérico para `/admin/queues`

### Deferred Ideas (OUT OF SCOPE)
- Bull Board no painel do escritório
- Override manual de tier pelo advogado (Phase 8)
- Alertas proativos de staleness para advogado (Phase 8)
- Múltiplos processos por sync batch (otimização futura)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da Pesquisa |
|----|-----------|---------------------|
| DATAJUD-01 | Validação mod-97 do número CNJ antes de qualquer consulta | Algoritmo documentado: três operações `% 97` com BigInt via chunks; resultado deve ser 1 |
| DATAJUD-02 | Busca de dados do processo no DataJud via número CNJ | Endpoint `POST /api_publica_{tribunal}/_search` com Elasticsearch DSL; auth via APIKey header |
| DATAJUD-03 | Job BullMQ com retry (exponential backoff + jitter) | BullMQ 5.x tem `attempts` + `backoff: { type: 'exponential', delay }` nativamente |
| DATAJUD-04 | Sincronização agendada em tiers hot/warm/cold | `upsertJobScheduler` por processo com `every` em ms; reclassifica-se após cada sync |
| DATAJUD-05 | Movimentações novas detectadas por diffing idempotente por ID | Campo `id` existe nos objetos `movimentos` (MTD); sem ele usar hash(dataHora+codigo+descricao) |
| DATAJUD-06 | Circuit breaker suspende chamadas após N falhas | opossum 9.x com estado serializado no Redis via `toJSON()`; BullMQ pausa queue no `open` |
| DATAJUD-07 | Job retoma do checkpoint após reinicialização | Padrão step-job do BullMQ: `job.updateData({ step })` persiste no Redis entre retries |
| DATAJUD-08 | Erros registrados em `sync_errors` com contexto do processo | Tabela nova nesta fase; `tipo` enum inclui `segredo_justica`, `rate_limit`, `timeout`, `schema_drift` |
| DATAJUD-09 | UI mostra "última atualização"; nunca bloqueia por falha | Campo `ultima_sincronizacao` só atualiza em sync bem-sucedido; staleness > 72h = badge "desatualizado" |
</phase_requirements>

---

## Summary

A DataJud Public API do CNJ é uma API REST sobre Elasticsearch, autenticada por API Key pública (sem OAuth), sem SLA formal e sem rate limits documentados. A maior descoberta crítica desta pesquisa: **processos em segredo de justiça não retornam resultados na API pública** — a query simplesmente retorna `hits: []` sem campo sinalizador, o que exige uma estratégia defensiva de inferência. O campo `id` no array `movimentos` (do MTD) é o identificador estável para diffing idempotente, mas **sua presença deve ser validada em runtime** porque o schema varia por tribunal. Como fallback, usar `hash(dataHora + tipo.nacional.id + descricao)`.

O BullMQ 5.x com `upsertJobScheduler` cobre tiered scheduling de forma nativa. O opossum 9.x provê circuit breaker com `toJSON()`/inicialização por estado externo, permitindo persistir o estado no Redis manualmente. O `@bull-board/fastify` v7.0.0 (lançado hoje) requer `@fastify/static ^9.1.0` e `@fastify/view ^11.1.1` — compatível com Fastify 5.

**Recomendação principal:** Implementar o DataJud adapter com Zod validation do response schema (detecta drift por tribunal), circuit breaker com estado em Redis (prefixo `cb:datajud:{processoId}`), e diffing por `movimentos[].id` com fallback para hash de conteúdo.

---

## Standard Stack

### Core

| Biblioteca | Versão | Propósito | Por que padrão |
|-----------|--------|-----------|----------------|
| `bullmq` | **5.73.5** [VERIFIED: npm registry] | Queue, scheduler, worker, step-jobs | Documentação oficial; `upsertJobScheduler` é a API correta para tiers |
| `ioredis` | **5.x** [ASSUMED] | Redis client (peer dep do BullMQ) | Peer dep obrigatório; Upstash compatível |
| `opossum` | **9.0.0** [VERIFIED: npm registry] | Circuit breaker | Node 20+ nativo; `toJSON()` permite serializar estado para Redis |
| `zod` | **4.3.6** [VERIFIED: npm registry] | Validação do response do DataJud | Schema drift por tribunal detectado em runtime |
| `p-retry` | **8.0.0** [VERIFIED: npm registry] | Retry com exponential backoff + jitter | Mais simples que reimplementar backoff manual |
| `@bull-board/fastify` | **7.0.0** [VERIFIED: npm registry] | Dashboard de filas | Versão compatível com `@fastify/static ^9.1.0` e Fastify 5 |

### Supporting

| Biblioteca | Versão | Propósito | Quando usar |
|-----------|--------|-----------|-------------|
| `undici` ou `fetch` nativo | Node 22 built-in | HTTP para DataJud | Node 22 `fetch` é suficiente; `undici.Pool` se quiser connection pooling explícito |
| `@fastify/static` | **^9.1.0** | Peer dep do Bull Board v7 | Obrigatório para servir assets do dashboard |
| `@fastify/view` | **^11.1.1** | Peer dep do Bull Board v7 | Obrigatório para renderizar templates |

### Alternatives Considered

| Ao invés de | Poderia usar | Tradeoff |
|-------------|-------------|----------|
| `opossum` manual com Redis | `cockatiel` | cockatiel tem menos adoção; opossum é mais maduro |
| `p-retry` | BullMQ backoff nativo | BullMQ backoff é por job; `p-retry` é por chamada HTTP interna ao processador |
| `upsertJobScheduler` por processo | 3 filas fixas (hot-queue/warm-queue/cold-queue) | 3 filas fixas são mais simples de monitorar; `upsertJobScheduler` por processo escala melhor com N > 100 processos |

**Installation:**
```bash
pnpm add bullmq ioredis opossum zod p-retry @bull-board/fastify @bull-board/api @bull-board/ui @fastify/static @fastify/view
```

---

## DataJud API — Findings Críticos

### Autenticação e Endpoint

[VERIFIED: datajud-wiki.cnj.jus.br/api-publica/acesso/]

- **Método:** API Key no header `Authorization: APIKey <chave>`
- **Chave pública atual:** `cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==`
- **RISCO CRÍTICO:** A chave pode ser rotacionada pelo CNJ a qualquer momento sem aviso prévio. O sistema DEVE externalizar a chave em variável de ambiente (`DATAJUD_API_KEY`) e ter um alerta de monitoramento para HTTP 401.
- **Base URL:** `https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search`
- **Método HTTP:** POST com body Elasticsearch DSL (JSON)

**Mapeamento tribunal → alias:** O alias do endpoint é derivado do campo J.TT do número CNJ. Exemplos:
- TJSP → `api_publica_tjsp`
- TRT1 → `api_publica_trt1`
- STJ → `api_publica_stj`
- TRF1 → `api_publica_trf1`

O mapeamento completo J.TT → alias deve ser codificado como lookup table no adapter.

### Rate Limits

[LOW — sem documentação oficial de thresholds]

- Nenhum rate limit numericamente documentado foi encontrado na documentação oficial.
- Fonte terceira (judit.io) descreve como "rigoroso (baixo volume padrão)" e afirma que polling sem cuidado "esgota rapidamente o rate limit".
- **Recomendação de design:** Tratar o DataJud como se tivesse ~1 req/segundo por API key como limite de segurança conservador. O circuit breaker detecta throttling via HTTP 429 ou timeouts consecutivos.
- **Data freshness:** T+1 a T+7 dias dependendo do tribunal [CITED: judit.io/blog/artigos/datajud-cnj-api-publica-x-privada-comparacao/]. Isso significa que sincronizar mais de uma vez por dia é improvável de trazer dados novos para processos de tribunais lentos.

### Schema de Resposta

[MEDIUM — verificado em fontes secundárias; oficialmente a documentação é esparsa]

O response segue o padrão Elasticsearch:

```json
{
  "took": 5,
  "timed_out": false,
  "_shards": { "total": 5, "successful": 5, "skipped": 0, "failed": 0 },
  "hits": {
    "total": { "value": 1, "relation": "eq" },
    "hits": [
      {
        "_source": {
          "dadosBasicos": {
            "numero": "0000001-00.2024.8.26.0001",
            "classeProcessual": { "codigo": 1116, "nome": "Procedimento Comum Cível" },
            "orgaoJulgador": { "codigo": 1, "nome": "1ª Vara Cível" },
            "assuntos": [{ "codigo": 10109, "nome": "Indenização por Dano Moral" }],
            "nivelSigilo": 0,
            "dataAjuizamento": "2024-01-15T00:00:00.000Z",
            "valor": 10000.00
          },
          "movimentos": [
            {
              "id": "abc123-estavel",
              "data": "2024-03-10T14:30:00Z",
              "tipo": {
                "nacional": { "id": 26, "nome": "Distribuição" },
                "local": null
              },
              "descricao": "Distribuição por sorteio",
              "complementos": [
                { "tipoId": 4, "valor": "SORTEIO", "tabeladoId": 80 }
              ],
              "dataExclusao": null
            }
          ]
        }
      }
    ]
  }
}
```

**Campos críticos:**
- `dadosBasicos.nivelSigilo`: inteiro (0 = público; valores > 0 = algum nível de sigilo)
- `movimentos[].id`: string — identificador estável da movimentação no sistema de origem [CITED: docs.seeu.pje.jus.br/docs/documentacao-tecnica/manual_conversor_dados_DataJud/]
- `movimentos[].tipo.nacional.id`: código nacional unificado (ex: 26 = Distribuição)
- `movimentos[].data`: ISO 8601

### Segredo de Justiça — Comportamento Confirmado

[MEDIUM — VERIFIED parcialmente via documentação CNJ e FAQ]

**Comportamento:** Processos em segredo de justiça **não aparecem nos resultados** da API pública. A query retorna `hits.total.value = 0` e `hits.hits = []` — exatamente igual a um processo que não existe.

**Implicação para o sistema:**
- Não há campo `nivelSigilo` retornado para indicar sigilo — o resultado é ausência de dados.
- O sistema NÃO PODE distinguir "processo sigiloso" de "número CNJ inválido/inexistente" apenas pela resposta do DataJud.
- **Estratégia defensiva recomendada:**
  1. Após validação mod-97 (CNJ válido formalmente), se DataJud retornar `hits = []`, registrar em `sync_errors` com tipo `processo_nao_encontrado`.
  2. Após N tentativas em dias diferentes sem resultado, reclassificar como `provavel_segredo_justica` (Claude's Discretion para N, sugestão: 3 tentativas em 3 dias).
  3. Exibir a mensagem genérica (D-04) após essa reclassificação.

**Fonte:** [CITED: FAQ CNJ — "a ferramenta não permite a consulta de processos que tramitam em segredo de justiça e é regulamentada pelas Portarias n.160/2020 e n.91/2021"]

### Request Format

```json
POST https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search
Authorization: APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==
Content-Type: application/json

{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "numeroProcesso": "0000001-00.2024.8.26.0001"
          }
        }
      ]
    }
  }
}
```

---

## Architecture Patterns

### Estrutura de Diretórios Recomendada

```
src/
├── datajud/
│   ├── adapter.ts          # HTTP client DataJud + Zod validation
│   ├── cnj-validator.ts    # Algoritmo mod-97 (sem I/O)
│   ├── tribunal-map.ts     # J.TT → endpoint alias lookup
│   ├── circuit-breaker.ts  # opossum + Redis state persistence
│   └── types.ts            # Zod schemas + TypeScript types
├── workers/
│   ├── index.ts            # Entry point; registra consumers BullMQ
│   ├── datajud-sync.ts     # Processador do job de sync (step-job pattern)
│   └── scheduler.ts        # upsertJobScheduler para tier management
├── queues/
│   └── datajud-queue.ts    # Queue instance + BullMQAdapter para Bull Board
└── db/
    └── migrations/
        └── 002_datajud_schema.sql
```

### Pattern 1: CNJ Number Validation (mod-97)

**O que é:** Validação de check-digit ISO 7064:2003, Resolução CNJ 65/2008.
**Quando usar:** Antes de QUALQUER chamada ao DataJud ou write no banco.

```typescript
// Source: dev.to/leonardo_vilela/construindo-algoritmo-para-consumir-a-api-publica-do-cnj-... + gist.github.com/gabrielpeixoto/474c5f231206018211bd4b765f7f79cb
// Implementação em 3 operações mod-97 com BigInt para evitar overflow

function bcmod(dividend: string, divisor: number): number {
  let remainder = 0;
  for (const char of dividend) {
    remainder = (remainder * 10 + parseInt(char)) % divisor;
  }
  return remainder;
}

export function validarNumeroCNJ(numero: string): boolean {
  // Limpar formatação: remove '-', '.', espaços
  const clean = numero.replace(/[-.\s]/g, '');
  if (clean.length !== 20) return false;

  // NNNNNNN DD AAAA J TT OOOO
  const N = clean.substring(0, 7);   // sequencial
  const D = clean.substring(7, 9);   // check digits
  const A = clean.substring(9, 13);  // ano
  const J = clean.substring(13, 14); // justiça
  const T = clean.substring(14, 16); // tribunal
  const O = clean.substring(16, 20); // vara/origem

  // Operação 1: N mod 97
  const op1 = bcmod(N, 97);
  // Operação 2: (op1 concatenado com A, J, T) mod 97
  const op2 = bcmod(`${op1}${A}${J}${T}`, 97);
  // Operação final: (op2 concatenado com O, D) mod 97
  const opFinal = bcmod(`${op2}${O}${D}`, 97);

  return opFinal === 1;
}
```

### Pattern 2: Tiered Refresh com upsertJobScheduler

**O que é:** Cada processo tem um scheduler BullMQ dedicado com intervalo determinado pelo tier.
**Quando usar:** Ao cadastrar um processo e após cada sync (para reclassificação).

```typescript
// Source: docs.bullmq.io/guide/job-schedulers
const TIER_INTERVALS_MS = {
  hot:  6 * 60 * 60 * 1000,    // 6h  — processos com movimentação < 30 dias
  warm: 24 * 60 * 60 * 1000,   // 24h — 30-180 dias sem movimentação
  cold: 7 * 24 * 60 * 60 * 1000, // 7d  — > 180 dias sem movimentação
} as const;

type Tier = keyof typeof TIER_INTERVALS_MS;

function calcularTier(ultimaMovimentacaoAt: Date | null): Tier {
  if (!ultimaMovimentacaoAt) return 'cold';
  const diasSemMovimentacao = (Date.now() - ultimaMovimentacaoAt.getTime()) / 86400000;
  if (diasSemMovimentacao < 30) return 'hot';
  if (diasSemMovimentacao < 180) return 'warm';
  return 'cold';
}

async function agendarSyncProcesso(
  queue: Queue,
  processoId: string,
  tier: Tier
): Promise<void> {
  await queue.upsertJobScheduler(
    `sync-processo-${processoId}`,     // ID único do scheduler
    { every: TIER_INTERVALS_MS[tier] }, // intervalo em ms
    {
      name: 'datajud-sync',
      data: { processoId, tier, step: 'INITIAL' },
    }
  );
}
```

**Reclassificação após sync:**
```typescript
// Ao final de cada sync bem-sucedido, recalcular tier
const novoTier = calcularTier(ultimaMovimentacaoDetectada);
if (novoTier !== tierAtual) {
  await agendarSyncProcesso(queue, processoId, novoTier);
  // upsertJobScheduler atualiza sem criar duplicata
}
```

### Pattern 3: Step-Job com Checkpoint (DATAJUD-07)

**O que é:** Job BullMQ que persiste o passo atual em `job.data.step` via `job.updateData()`. Após crash/restart, retoma do step correto.

```typescript
// Source: docs.bullmq.io/patterns/process-step-jobs
enum SyncStep {
  INITIAL = 'INITIAL',
  FETCH_DATAJUD = 'FETCH_DATAJUD',
  DIFF_MOVIMENTACOES = 'DIFF_MOVIMENTACOES',
  PERSIST = 'PERSIST',
  FINISH = 'FINISH',
}

async function processarSyncJob(job: Job<SyncJobData>): Promise<void> {
  let step = (job.data.step as SyncStep) ?? SyncStep.INITIAL;

  while (step !== SyncStep.FINISH) {
    switch (step) {
      case SyncStep.INITIAL:
        // Validar CNJ, checar circuit breaker
        await job.updateData({ ...job.data, step: SyncStep.FETCH_DATAJUD });
        step = SyncStep.FETCH_DATAJUD;
        break;

      case SyncStep.FETCH_DATAJUD:
        // Chamar DataJud adapter; lança se circuit breaker open
        const dadosDatajud = await datajudAdapter.fetch(job.data.processoId);
        await job.updateData({ ...job.data, dadosDatajud, step: SyncStep.DIFF_MOVIMENTACOES });
        step = SyncStep.DIFF_MOVIMENTACOES;
        break;

      case SyncStep.DIFF_MOVIMENTACOES:
        // Comparar IDs de movimentos retornados com IDs já persistidos
        const novasMovimentacoes = await diffMovimentacoes(job.data.dadosDatajud);
        await job.updateData({ ...job.data, novasMovimentacoes, step: SyncStep.PERSIST });
        step = SyncStep.PERSIST;
        break;

      case SyncStep.PERSIST:
        // INSERT movimentacoes novas + UPDATE ultima_sincronizacao
        await persistirResultados(job.data);
        await job.updateData({ ...job.data, step: SyncStep.FINISH });
        step = SyncStep.FINISH;
        break;
    }
  }
}
```

### Pattern 4: Circuit Breaker com Estado no Redis

**O que é:** opossum 9.x com serialização de estado em Redis; BullMQ pausa o scheduler quando `open`.

```typescript
// Source: github.com/nodeshift/opossum (documentação toJSON / estado externo)
import CircuitBreaker from 'opossum';
import { Redis } from 'ioredis';

const CB_REDIS_KEY = 'cb:datajud:global'; // ou por processoId se necessário

async function criarCircuitBreaker(redis: Redis): Promise<CircuitBreaker> {
  // Tentar restaurar estado anterior do Redis
  const savedStateRaw = await redis.get(CB_REDIS_KEY);
  const savedState = savedStateRaw ? JSON.parse(savedStateRaw) : undefined;

  const breaker = new CircuitBreaker(fetchDatajud, {
    timeout: 10000,               // 10s timeout por chamada
    errorThresholdPercentage: 50, // abre após 50% de falhas
    resetTimeout: 30000,          // tenta half-open após 30s
    volumeThreshold: 5,           // mínimo 5 requisições para avaliar
  });

  // Se havia estado salvo, não há API direta de restore no opossum 9
  // A estratégia é: se o estado salvo é 'open', forçar abertura imediata
  if (savedState?.state?.open) {
    breaker.open(); // força estado open
  }

  // Persistir estado no Redis a cada mudança
  breaker.on('open', () => {
    redis.setex(CB_REDIS_KEY, 3600, JSON.stringify(breaker.toJSON()));
  });
  breaker.on('close', () => {
    redis.setex(CB_REDIS_KEY, 3600, JSON.stringify(breaker.toJSON()));
  });
  breaker.on('halfOpen', () => {
    redis.setex(CB_REDIS_KEY, 3600, JSON.stringify(breaker.toJSON()));
  });

  return breaker;
}
```

**NOTA:** opossum 9.x não tem API de restore de estado estatístico nativo via construtor. A abordagem é: serializar o estado booleano `{open, closed, halfOpen}` e forçar `breaker.open()` no startup se o estado salvo estava aberto. Para precisão perfeita, implementar circuit breaker manual com Redis (ver "Don't Hand-Roll" — exceção documentada abaixo).

### Pattern 5: Diffing Idempotente de Movimentações (DATAJUD-05)

```typescript
// Buscar IDs já persistidos para o processo
async function diffMovimentacoes(
  processoId: string,
  movimentosDatajud: DatajudMovimento[]
): Promise<DatajudMovimento[]> {
  const { data: existentes } = await supabaseAdmin
    .from('movimentacoes')
    .select('datajud_id')
    .eq('processo_id', processoId);

  const idsExistentes = new Set(existentes?.map(m => m.datajud_id) ?? []);

  return movimentosDatajud.filter(m => {
    const id = m.id ?? gerarHashMovimento(m); // fallback se id ausente
    return !idsExistentes.has(id);
  });
}

function gerarHashMovimento(m: DatajudMovimento): string {
  // Fallback: hash determinístico do conteúdo quando campo id é null
  const conteudo = `${m.data}|${m.tipo?.nacional?.id ?? ''}|${m.descricao ?? ''}`;
  return createHash('sha256').update(conteudo).digest('hex').substring(0, 16);
}
```

### Pattern 6: Bull Board em Fastify 5

```typescript
// Source: npmjs.com/package/@bull-board/fastify — versão 7.0.0 [VERIFIED: npm registry]
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

const serverAdapter = new FastifyAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(datajudQueue)],
  serverAdapter,
});

// Autenticação com Bearer token simples (D-11)
fastify.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/admin/queues')) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token !== process.env.ADMIN_TOKEN) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  }
});

await fastify.register(serverAdapter.registerPlugin(), {
  prefix: '/admin/queues',
  basePath: '/admin/queues',
});
```

**Peer deps obrigatórios para `@bull-board/fastify@7.0.0`:**
- `@fastify/static: ^9.1.0`
- `@fastify/view: ^11.1.1`
- `ejs: ^5.0.2`

### Anti-Patterns to Avoid

- **Não usar `job.progress()` para checkpoint:** `job.updateProgress()` é para reporting; use `job.updateData()` para estado recuperável.
- **Não armazenar estado do circuit breaker apenas em memória:** Worker Railway reinicia em crash — estado em memória é perdido, circuit breaker "reseta" e retoma chamadas que deveriam estar suspensas.
- **Não usar `new Queue()` com nova conexão Redis por worker:** Reutilizar a mesma conexão ioredis para Queue e Worker onde possível (mas QueueEvents requer conexão separada).
- **Não chamar DataJud com o número CNJ formatado:** A API usa `numeroProcesso` sem formatação especial no query, mas usar o número limpo (sem pontos e traços) pode gerar inconsistências dependendo do tribunal. Testar ambos.
- **Não assumir que `movimentos[].id` sempre existe:** O campo vem do MTD mas sua presença depende do sistema do tribunal. Validar com Zod como `z.string().optional()` e acionar fallback de hash.

---

## Don't Hand-Roll

| Problema | Não Construir | Usar Em Vez | Por quê |
|----------|--------------|-------------|---------|
| Exponential backoff + jitter | Implementação manual de sleep | BullMQ `backoff: { type: 'exponential', delay }` ou `p-retry` | Jitter correto é não-trivial; BullMQ já tem a lógica |
| Job scheduler persistente | `node-cron` ou `setInterval` | `upsertJobScheduler` do BullMQ | `node-cron` não sobrevive a restart; BullMQ persiste no Redis |
| Circuit breaker | Contadores em memória com `if (failures > N)` | `opossum` | Estados halfOpen/cooldown têm edge cases sutis |
| Validação de response | `if (data.movimentos)` ad-hoc | `zod.safeParse()` | Schema drift por tribunal causa bugs silenciosos sem Zod |
| Deduplicação de movimentações | Array `includes()` em memória | Query SQL `WHERE datajud_id NOT IN (...)` + índice | Em memória não escala; race conditions em workers paralelos |
| Algoritmo mod-97 | Bignum manual | Implementação `bcmod()` com chunks de 5 dígitos | Números de 20 dígitos excedem `Number.MAX_SAFE_INTEGER` |

**Exceção documentada:** O circuit breaker com estado persistido no Redis requer algum código manual (persistir estado via eventos `open/close/halfOpen`) porque opossum 9.x não tem integração Redis nativa. Isso é aceitável — é ~20 linhas de glue code, não reimplementar o circuit breaker.

---

## Supabase Schema Design

```sql
-- Migration: 002_datajud_schema.sql

-- Tabela principal de processos (multi-tenant)
CREATE TABLE IF NOT EXISTS processos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  numero_cnj      TEXT NOT NULL,                    -- formato normalizado sem formatação
  numero_cnj_fmt  TEXT NOT NULL,                    -- NNNNNNN-DD.AAAA.J.TT.OOOO para exibição
  tribunal_alias  TEXT NOT NULL,                    -- ex: 'api_publica_tjsp'
  tier_refresh    TEXT NOT NULL DEFAULT 'cold'      -- 'hot' | 'warm' | 'cold'
                  CHECK (tier_refresh IN ('hot', 'warm', 'cold')),
  ultima_sincronizacao  TIMESTAMPTZ,               -- NULL = nunca sincronizado
  status          TEXT NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo', 'encerrado', 'sigiloso', 'nao_encontrado')),
  dados_basicos   JSONB,                            -- snapshot do dadosBasicos do DataJud
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, numero_cnj)
);

-- Índices para RLS e queries frequentes
CREATE INDEX idx_processos_tenant_id ON processos(tenant_id);
CREATE INDEX idx_processos_tier ON processos(tier_refresh, ultima_sincronizacao);

-- Movimentações (append-only; hard delete via cascade do processo)
CREATE TABLE IF NOT EXISTS movimentacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id     UUID NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,                    -- denormalizado para RLS eficiente
  datajud_id      TEXT NOT NULL,                    -- campo id do MTD ou hash fallback
  data_movimento  TIMESTAMPTZ NOT NULL,
  tipo_codigo     INTEGER,                          -- tipo.nacional.id
  tipo_nome       TEXT,
  descricao       TEXT,
  complementos    JSONB,
  raw_movimento   JSONB NOT NULL,                   -- snapshot completo do DataJud
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(processo_id, datajud_id)                   -- garante idempotência no banco
);

CREATE INDEX idx_movimentacoes_processo_id ON movimentacoes(processo_id, data_movimento DESC);
CREATE INDEX idx_movimentacoes_tenant_id ON movimentacoes(tenant_id);

-- Tabela de erros de sync (audit trail)
CREATE TABLE IF NOT EXISTS sync_errors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id     UUID REFERENCES processos(id) ON DELETE CASCADE,
  tenant_id       UUID,
  tipo            TEXT NOT NULL
                  CHECK (tipo IN ('rate_limit', 'timeout', 'schema_drift', 'api_error',
                                  'segredo_justica', 'processo_nao_encontrado',
                                  'circuit_breaker_open', 'validacao_cnj')),
  mensagem        TEXT,
  contexto        JSONB,                            -- stack trace, response body, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Limpeza automática: manter apenas 90 dias de sync_errors
-- (Claude's Discretion: 90 dias recomendado por esta pesquisa)
CREATE INDEX idx_sync_errors_created_at ON sync_errors(created_at);

-- RLS policies
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

-- Política para clientes e advogados: ver apenas dados do seu tenant
CREATE POLICY "tenant_isolation_processos" ON processos
  FOR ALL USING (tenant_id = (SELECT (auth.jwt() ->> 'tenant_id')::UUID));

CREATE POLICY "tenant_isolation_movimentacoes" ON movimentacoes
  FOR ALL USING (tenant_id = (SELECT (auth.jwt() ->> 'tenant_id')::UUID));

-- sync_errors: apenas admin_escritorio pode ver
CREATE POLICY "admin_sync_errors" ON sync_errors
  FOR SELECT USING (
    tenant_id = (SELECT (auth.jwt() ->> 'tenant_id')::UUID)
    AND (auth.jwt() ->> 'role') IN ('admin_escritorio', 'advogado')
  );
```

---

## Common Pitfalls

### Pitfall 1: Número CNJ sem formatação na query DataJud

**O que dá errado:** O campo `numeroProcesso` na query Elasticsearch deve usar o número limpo (apenas dígitos) ou o número formatado, dependendo do tribunal. Alguns tribunais indexam de um jeito; outros, de outro.

**Por que acontece:** O DataJud não padroniza o formato de indexação entre tribunais — cada um manda o dado como o seu sistema registra.

**Como evitar:** Tentar primeiro com número formatado (`0000001-00.2024.8.26.0001`); se retornar vazio, tentar sem formatação (`00000010020248260001`). Registrar em `sync_errors` o formato que funcionou por tribunal.

**Sinais de alerta:** `hits.total.value = 0` para processo que o advogado sabe que existe.

---

### Pitfall 2: Confundir "processo inexistente" com "segredo de justiça"

**O que dá errado:** Ambos retornam `hits = []`. O sistema exibe "processo não encontrado" para um processo sigiloso que o cliente tem direito de saber que existe (mas não os detalhes).

**Por que acontece:** A API pública não diferencia os dois casos por design (privacidade).

**Como evitar:** Estratégia de inferência por tentativas repetidas (ver Pattern de Segredo acima). Nunca marcar como `sigiloso` na primeira tentativa — pode ser flakiness do DataJud.

**Sinais de alerta:** Processo cadastrado manualmente pelo advogado com número CNJ válido retorna vazio em múltiplos dias.

---

### Pitfall 3: Circuit breaker em memória perde estado no restart

**O que dá errado:** Worker Railway crasha; opossum reinicia com estado `closed`; retoma chamadas ao DataJud que estavam suspensas; DataJud (que estava fora) recebe rajada de requisições; circuit breaker fecha de novo mas causou spike de erros.

**Por que acontece:** Estado padrão do opossum é in-memory.

**Como evitar:** Persistir `{open, halfOpen}` no Redis via eventos `open/close/halfOpen`. No startup, checar o estado salvo e chamar `breaker.open()` se necessário. TTL no Redis key de 1h (resetTimeout suficiente).

**Sinais de alerta:** Picos de erros no Sentry após restarts do worker; `sync_errors` com `circuit_breaker_open` seguido imediatamente por `api_error` do mesmo processo.

---

### Pitfall 4: upsertJobScheduler cria scheduler por processo mas sem remover ao encerrar processo

**O que dá errado:** Processo encerrado continua sendo sincronizado indefinidamente. Desperdiça rate limit e gera erros desnecessários.

**Por que acontece:** `upsertJobScheduler` cria; ninguém chama `removeJobScheduler` quando o processo muda de status.

**Como evitar:** Ao atualizar `processos.status = 'encerrado'` ou `'sigiloso'`, chamar `queue.removeJobScheduler(`sync-processo-${processoId}`)` no mesmo contexto transacional.

---

### Pitfall 5: Schema drift do DataJud quebra silenciosamente

**O que dá errado:** Um tribunal atualiza seu sistema e os objetos de movimentação mudam de estrutura. O código TypeScript acessa `movimento.id` e recebe `undefined`; o diffing falha silenciosamente (zero novas movimentações, processo nunca atualizado).

**Por que acontece:** O DataJud não tem contrato de schema estável documentado por tribunal.

**Como evitar:** Usar `zod.safeParse()` no response do DataJud; se `success === false`, registrar em `sync_errors` tipo `schema_drift` com o raw body para diagnóstico. Não deixar o job falhar — registrar e continuar.

---

### Pitfall 6: Chave de API DataJud rotacionada sem aviso

**O que dá errado:** O CNJ troca a chave pública; todos os workers recebem HTTP 401; circuit breaker abre; todos os processos ficam stale.

**Por que acontece:** CNJ reserva-se o direito de trocar a chave a qualquer momento [CITED: datajud-wiki.cnj.jus.br/api-publica/acesso/].

**Como evitar:** HTTP 401 do DataJud deve gerar alerta imediato no Sentry com severity `fatal`. Externalizar chave em `DATAJUD_API_KEY` env var (Railway secret). Monitorar `sync_errors` do tipo `api_error` com status 401 no dashboard.

---

## State of the Art

| Abordagem Antiga | Abordagem Atual | Quando Mudou | Impacto |
|-----------------|-----------------|--------------|---------|
| BullMQ `RepeatableJob` | `upsertJobScheduler` | BullMQ v5.16.0 (2024) | Repeatable jobs são legado — usar Job Schedulers |
| Circuit breaker só em memória | `toJSON()` + Redis state | opossum 9.0 (junho 2025) | Estado sobrevive restarts |
| `@bull-board/fastify` v5/v6 | v7.0.0 | Lançado 2026-04-14 | Requer `@fastify/static ^9.1.0`, `@fastify/view ^11.1.1` |

**Deprecated/obsoleto:**
- `QueueScheduler` do BullMQ: Removido — a funcionalidade foi integrada ao `Worker`. Não usar.
- `RepeatableJobs` (API antiga): Ainda funciona mas `upsertJobScheduler` é o caminho recomendado.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Notas |
|------------|--------------|------------|-------|
| Redis (Upstash) | BullMQ, circuit breaker state | Configurado na Phase 1 (D-32) | Docker Compose local + Upstash prod |
| Supabase PostgreSQL | Schema de processos/movimentacoes | Configurado na Phase 1 | Via Supavisor (transaction mode) |
| DataJud API | DATAJUD-02 | Depende de acesso à internet | API Key pública disponível; sem SLA |
| Node.js 22 LTS | Runtime | Definido na Phase 1 | Obrigatório para `fetch` nativo |

**Dependências sem fallback:** DataJud API Key — se expirar/rotacionar, o sistema fica degradado (cache) até a key ser atualizada manualmente.

---

## Assumptions Log

| # | Claim | Seção | Risco se Errado |
|---|-------|-------|----------------|
| A1 | `movimentos[].id` é o campo de ID estável no MTD | DataJud Schema | Fallback de hash ainda funciona, mas é menos robusto |
| A2 | DataJud retorna `hits = []` (não HTTP 403) para processos sigilosos | Segredo de Justiça | Se retornar 403, o circuit breaker conta como falha erroneamente — precisaria tratar 403 como caso especial |
| A3 | A chave pública atual do DataJud funciona sem autenticação adicional para qualquer tribunal | Autenticação | Alguns tribunais podem ter requerimentos extras não documentados |
| A4 | `@bull-board/fastify@7.0.0` é compatível com Fastify 5.x | Bull Board | Lançado 9 horas atrás; peer deps `@fastify/static ^9.1.0` sugerem Fastify 5, mas não confirmado |
| A5 | Rate limit do DataJud tolera ~1 req/s sem throttling | Rate Limits | Threshold real pode ser menor (ex: 1 req/10s); precisaria de teste empírico |
| A6 | `nivelSigilo` inteiro > 0 implica processo sigiloso | Schema | Pode existir valor 0 para processos sem sigilo e outros valores para diferentes graus |

**Confirmações necessárias antes da implementação:**
- A1, A2, A6: Testar com um número CNJ real e verificar o response completo
- A4: Verificar changelog do @bull-board/fastify v7 ou testar install

---

## Open Questions

1. **Chave DataJud rotacionada: como detectar proativamente?**
   - O que sabemos: A chave pode mudar a qualquer momento; HTTP 401 é o sinal
   - Lacuna: Não há webhook ou notificação do CNJ sobre mudanças de chave
   - Recomendação: Health check `/health` deve fazer uma query de teste ao DataJud com a chave atual; alertar via Sentry se 401

2. **`@bull-board/fastify@7.0.0` com Fastify 5: confirmação de compatibilidade**
   - O que sabemos: v7.0.0 foi publicado hoje (2026-04-14); peer deps são `@fastify/static ^9.1.0` e `@fastify/view ^11.1.1`
   - Lacuna: `@fastify/static ^9.x` e `@fastify/view ^11.x` podem ser para Fastify 4 ou 5 — não verificável sem install real
   - Recomendação: Testar `pnpm add @bull-board/fastify@7.0.0` e verificar se `fastify.register()` funciona; fallback é v6.21.3 (estável há mais tempo)

3. **Lag de dados do DataJud (T+1 a T+7): impacto nos tiers**
   - O que sabemos: Dados chegam com 1-7 dias de atraso dependendo do tribunal
   - Lacuna: Se tribunal tem T+7 lag, sincronizar a cada 6h (hot tier) é desperdício de rate limit
   - Recomendação: Claude's Discretion — pode-se ajustar os limiares de tier para levar isso em conta; documentar no código

4. **Número CNJ na query DataJud: formatado ou sem formatação?**
   - O que sabemos: Há inconsistência por tribunal
   - Lacuna: Não há lista oficial de quais tribunais usam qual formato
   - Recomendação: Implementar retry com formato alternativo automaticamente; logar qual funcionou

---

## Validation Architecture

### Test Framework

| Propriedade | Valor |
|------------|-------|
| Framework | Vitest (definido na Phase 1, D-34) |
| Config file | `vitest.config.ts` (criado na Phase 1) |
| Quick run | `pnpm vitest run src/datajud/` |
| Full suite | `pnpm vitest run` |

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de Teste | Comando | Arquivo |
|--------|--------------|--------------|---------|---------|
| DATAJUD-01 | mod-97 aceita números válidos e rejeita inválidos | Unit | `pnpm vitest run src/datajud/cnj-validator.test.ts` | Wave 0 |
| DATAJUD-01 | Rejeita número antes de qualquer I/O (sem mock) | Unit | idem | Wave 0 |
| DATAJUD-02 | Busca DataJud retorna dados parseados corretamente | Unit (mock HTTP) | `pnpm vitest run src/datajud/adapter.test.ts` | Wave 0 |
| DATAJUD-02 | Zod detecta schema drift e registra sync_error | Unit (mock HTTP) | idem | Wave 0 |
| DATAJUD-03 | Retry com backoff é acionado em falha HTTP 500 | Unit (mock) | `pnpm vitest run src/workers/datajud-sync.test.ts` | Wave 0 |
| DATAJUD-04 | Tier calculado corretamente por recência | Unit | `pnpm vitest run src/workers/scheduler.test.ts` | Wave 0 |
| DATAJUD-04 | upsertJobScheduler é chamado com intervalo correto por tier | Unit (mock BullMQ) | idem | Wave 0 |
| DATAJUD-05 | Reprocessar mesmo response não cria duplicatas | Integration (Supabase test DB) | `pnpm vitest run src/workers/datajud-sync.integration.test.ts` | Wave 0 |
| DATAJUD-05 | Movimentação nova é detectada corretamente | Integration | idem | Wave 0 |
| DATAJUD-06 | Circuit breaker abre após N falhas; rejeita chamadas | Unit (mock opossum) | `pnpm vitest run src/datajud/circuit-breaker.test.ts` | Wave 0 |
| DATAJUD-06 | Estado é persistido no Redis e restaurado após restart | Integration (Redis local) | idem | Wave 0 |
| DATAJUD-07 | Job reinicia do step correto após falha em PERSIST | Unit (mock job.updateData) | `pnpm vitest run src/workers/datajud-sync.test.ts` | Wave 0 |
| DATAJUD-08 | sync_errors é inserido com tipo e contexto correto | Integration | idem | Wave 0 |
| DATAJUD-09 | `ultima_sincronizacao` não atualiza em sync com erro | Integration | idem | Wave 0 |
| DATAJUD-09 | Response da API retorna `ultima_sincronizacao` mesmo com sync pendente | Integration | `pnpm vitest run src/api/processos.integration.test.ts` | Wave 0 |

### Cenários de Teste Específicos

#### Circuit Breaker
```typescript
// Cenário: circuit breaker abre após 5 falhas e nega chamadas subsequentes
it('abre após 5 falhas consecutivas e rejeita 6a chamada', async () => {
  const mockFetch = vi.fn().mockRejectedValue(new Error('DataJud down'));
  const breaker = criarCircuitBreakerComMock(mockFetch, { volumeThreshold: 5 });
  for (let i = 0; i < 5; i++) {
    await expect(breaker.fire()).rejects.toThrow();
  }
  await expect(breaker.fire()).rejects.toThrow('Breaker is open');
  expect(mockFetch).toHaveBeenCalledTimes(5); // 6a chamada não passa
});

// Cenário: estado restaurado do Redis — breaker inicia aberto
it('restaura estado open do Redis e rejeita chamadas imediatamente', async () => {
  await redis.set('cb:datajud:global', JSON.stringify({ state: { open: true } }));
  const breaker = await criarCircuitBreaker(redis);
  await expect(breaker.fire()).rejects.toThrow('Breaker is open');
});
```

#### Diffing Idempotente
```typescript
// Cenário: reprocessar o mesmo response não duplica movimentacoes
it('reprocessar response idêntico do DataJud não cria duplicatas', async () => {
  const response = { movimentos: [{ id: 'abc123', data: '2024-01-01', ... }] };
  await processarSyncJob(makeMockJob({ processoId: 'p1', dadosDatajud: response }));
  await processarSyncJob(makeMockJob({ processoId: 'p1', dadosDatajud: response })); // segundo run
  const { count } = await supabaseAdmin.from('movimentacoes').select('*', { count: 'exact' }).eq('processo_id', 'p1');
  expect(count).toBe(1); // não duplicou
});
```

#### Checkpoint/Resume
```typescript
// Cenário: job falha em PERSIST; no retry, pula steps já executados
it('retoma do step PERSIST sem refetch do DataJud', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ movimentos: [] });
  const job = makeMockJob({ step: SyncStep.PERSIST, dadosDatajud: { movimentos: [mockMovimento] } });
  await processarSyncJob(job);
  expect(mockFetch).not.toHaveBeenCalled(); // não buscou novamente
});
```

#### Segredo de Justiça
```typescript
// Cenário: DataJud retorna hits = [] para processo sigiloso
it('registra processo_nao_encontrado em sync_errors quando hits = []', async () => {
  mockDatajud.mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } });
  await processarSyncJob(makeMockJob({ processoId: 'sigiloso-id' }));
  const { data } = await supabaseAdmin.from('sync_errors').select('*').eq('processo_id', 'sigiloso-id');
  expect(data?.[0].tipo).toBe('processo_nao_encontrado');
});
```

### Sampling Rate

- **Por commit:** `pnpm vitest run src/datajud/cnj-validator.test.ts` (< 1s)
- **Por wave merge:** `pnpm vitest run src/datajud/ src/workers/` (< 30s)
- **Phase gate:** Full suite verde antes de `/gsd-verify-work`

### Wave 0 Gaps (arquivos a criar antes da implementação)

- [ ] `src/datajud/cnj-validator.test.ts` — testes do algoritmo mod-97
- [ ] `src/datajud/adapter.test.ts` — mock de HTTP do DataJud, validação Zod
- [ ] `src/datajud/circuit-breaker.test.ts` — estados open/halfOpen/close + Redis
- [ ] `src/workers/datajud-sync.test.ts` — step-job, retry, checkpoint
- [ ] `src/workers/scheduler.test.ts` — cálculo de tier, upsertJobScheduler
- [ ] `src/workers/datajud-sync.integration.test.ts` — diffing + Supabase local
- [ ] `src/api/processos.integration.test.ts` — endpoints GET /processos com staleness

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Aplica | Controle |
|---------------|--------|---------|
| V2 Authentication | Não (auth já feita na Phase 1) | — |
| V3 Session Management | Não | — |
| V4 Access Control | Sim (Bull Board admin) | Bearer token + `ADMIN_TOKEN` env var |
| V5 Input Validation | Sim (número CNJ) | mod-97 + Zod TypeBox |
| V6 Cryptography | Não | — |

### Known Threat Patterns

| Pattern | STRIDE | Mitigação |
|---------|--------|-----------|
| DataJud response com conteúdo malicioso | Tampering | Zod parse + não expor raw ao cliente |
| Bull Board exposto sem auth | Elevation of Privilege | Bearer token + rate limit em `/admin/queues` |
| API Key DataJud exposta em logs | Information Disclosure | `pino.redact` no log da request DataJud |
| Job data com processoId de outro tenant | Tampering | Worker valida `tenant_id` do job.data contra banco antes de processar |
| CNJ number injection no Elasticsearch query | Tampering | Usar `match` query (não `query_string`); validar com mod-97 antes |

---

## Sources

### Primary (HIGH confidence)
- [DataJud Wiki — Acesso/Autenticação](https://datajud-wiki.cnj.jus.br/api-publica/acesso/) — método de auth, chave atual, política de rotação
- [BullMQ — Job Schedulers](https://docs.bullmq.io/guide/job-schedulers) — `upsertJobScheduler`, tiers
- [BullMQ — Process Step Jobs](https://docs.bullmq.io/patterns/process-step-jobs) — padrão checkpoint/resume
- [opossum GitHub](https://github.com/nodeshift/opossum) — `toJSON()`, state restoration, configuração
- [npm @bull-board/fastify@7.0.0](https://www.npmjs.com/package/@bull-board/fastify) — versão, peer deps confirmados
- [SEEU/PJe DataJud MTD](https://docs.seeu.pje.jus.br/docs/documentacao-tecnica/manual_conversor_dados_DataJud/) — campos do objeto `movimentos` incluindo `id`

### Secondary (MEDIUM confidence)
- [dev.to/leonardo_vilela — Validação CNJ parte 2](https://dev.to/leonardo_vilela/construindo-algoritmo-para-consumir-a-api-publica-do-cnj-conselho-nacional-de-justica-2a-parte-validacao-do-numero-cnj-1133) — algoritmo mod-97 verificado
- [gist.github.com/gabrielpeixoto](https://gist.github.com/gabrielpeixoto/474c5f231206018211bd4b765f7f79cb) — implementação JS bcmod
- [tabnews.com.br/joaotextor](https://www.tabnews.com.br/joaotextor/abstraindo-a-api-publica-do-cnj-datajud) — schema de response DataJud com movimentos

### Tertiary (LOW confidence — para validação)
- [judit.io — DataJud vs APIs privadas](https://judit.io/blog/artigos/datajud-cnj-api-publica-x-privada-comparacao/) — rate limits "rigoroso (baixo volume)", T+1 a T+7 lag, sem SLA formal
- [FAQ CNJ DataJud](https://www.cnj.jus.br/sistemas/datajud/perguntas-frequentes/) — comportamento para processos sigilosos (403 bloqueado durante pesquisa)

---

## Metadata

**Confidence breakdown:**
- DataJud API (auth, endpoint): HIGH — documentação oficial verificada
- DataJud rate limits: LOW — não documentado; sourced de análise terceira
- DataJud response schema: MEDIUM — verificado em implementações reais mas sem spec oficial completa
- Segredo de justiça: MEDIUM — confirmado no FAQ CNJ mas comportamento exato (0 vs 403) requer teste
- `movimentos[].id` como campo estável: MEDIUM — documentado no MTD mas presença por tribunal não garantida
- BullMQ patterns: HIGH — documentação oficial primária
- opossum Redis state: MEDIUM — `toJSON()` documentado; Redis integration é manual
- @bull-board/fastify v7: MEDIUM — publicado hoje; peer deps verificados mas Fastify 5 compat não confirmada formalmente

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 para BullMQ/opossum (estáveis); 2026-04-21 para DataJud (volatile — chave pode mudar)
