/**
 * Entry point do processo Worker BullMQ.
 * Instancia múltiplos consumers. Roda como processo separado do servidor HTTP.
 * (D-31 do CONTEXT.md Phase 1, INFRA-09)
 *
 * Para adicionar um novo consumer: importar e instanciar abaixo.
 */
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { DatajudAdapter } from '../datajud/adapter.js';
import { criarCircuitBreaker, CB_REDIS_KEY } from '../datajud/circuit-breaker.js';
import { getDatajudQueue, DATAJUD_QUEUE_NAME } from '../queues/datajud-queue.js';
import { processarSyncJob } from './datajud-sync.js';
import { createTranslateWorker } from './translate-movimentacao.js';
import { getTranslateQueue } from '../queues/translate-queue.js';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // obrigatório para BullMQ
});

const datajudQueue = getDatajudQueue(redis);
const datajudAdapter = new DatajudAdapter(); // lê DATAJUD_API_KEY do env

async function inicializar(): Promise<void> {
  // Importar Supabase admin client (criado na Phase 1)
  const { supabaseAdmin } = await import('../lib/supabase.js');

  // Criar circuit breaker em torno do método real do adapter
  // Desta forma, breaker.fire(numeroCNJ) chama adapter.buscarProcesso(numeroCNJ)
  const savedRaw = await redis.get(CB_REDIS_KEY);
  const savedState = savedRaw ? JSON.parse(savedRaw) as { state?: { open?: boolean } } : undefined;

  const breaker = await criarCircuitBreaker(
    redis,
    {
      timeout: 10_000,
      errorThresholdPercentage: 100,
      resetTimeout: 60_000,
      volumeThreshold: 5,
    },
    (numeroCNJ: string) => datajudAdapter.buscarProcesso(numeroCNJ)
  );

  // Restaurar estado aberto se estava salvo (redundante com criarCircuitBreaker, mas explícito)
  if (savedState?.state?.open) {
    breaker.open();
  }

  // Consumer DataJud — concurrency 3 (respeitando rate limit DataJud ~1 req/s por IP)
  const datajudWorker = new Worker<SyncJobData>(
    DATAJUD_QUEUE_NAME,
    async (job) => {
      await processarSyncJob(job, supabaseAdmin, datajudQueue, breaker);
    },
    {
      connection: redis,
      concurrency: 3,
    }
  );

  datajudWorker.on('failed', (job, err) => {
    console.error(`[datajud-worker] Job ${job?.id} falhou:`, err.message);
  });

  console.log('[worker] DataJud consumer iniciado — concurrency: 3');

  // Consumer de Tradução (Phase 3) — concurrency 5 (per AI-08, D-01)
  const translateWorker = createTranslateWorker(redis);

  translateWorker.on('failed', (job, err) => {
    console.error(`[translate-worker] Job ${job?.id} falhou:`, err.message);
  });

  console.log('[worker] Translate consumer iniciado — concurrency: 5');
}

// Exportar translateQueue para uso nas routes (registrado como plugin Fastify)
export { getTranslateQueue };

// Importar type para referência no Worker genérico
type SyncJobData = Awaited<ReturnType<typeof import('../queues/datajud-queue.js').getDatajudQueue>> extends import('bullmq').Queue<infer T> ? T : never;

inicializar().catch(err => {
  console.error('[worker] Falha na inicialização:', err);
  process.exit(1);
});
