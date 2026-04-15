/**
 * Queue BullMQ para o worker de sincronização DataJud.
 * Instância compartilhada entre worker, scheduler e Bull Board.
 * (DATAJUD-03/04 — D-31 do CONTEXT.md Phase 1)
 */
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const DATAJUD_QUEUE_NAME = 'datajud-sync';

export interface SyncJobData {
  processoId: string;
  numeroCNJ: string;
  tenantId: string;
  tier: 'hot' | 'warm' | 'cold';
  step: SyncStep;
  // Dados persistidos entre steps pelo checkpoint (job.updateData)
  dadosDatajud?: unknown;
  novasMovimentacoesIds?: string[];
  novasMovimentacoesCount?: number;
  ultimaMovimentacaoIso?: string | null;
  tentativasHitsVazio?: number; // contagem para detecção de segredo de justiça
}

export type SyncStep =
  | 'INITIAL'
  | 'FETCH_DATAJUD'
  | 'DIFF_MOVIMENTACOES'
  | 'PERSIST'
  | 'CLASSIFY_TIER'
  | 'FINISH';

let _datajudQueue: Queue<SyncJobData> | undefined;

export function getDatajudQueue(redis: Redis): Queue<SyncJobData> {
  if (!_datajudQueue) {
    _datajudQueue = new Queue<SyncJobData>(DATAJUD_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s inicial; duplica: 2s, 4s, 8s, 16s, 32s
        },
        removeOnComplete: { count: 100 }, // manter os últimos 100 jobs completados
        removeOnFail: { count: 500 },     // manter os últimos 500 falhos para debug
      },
    });
  }
  return _datajudQueue;
}

/**
 * Resetar instância singleton (para uso em testes).
 */
export function resetDatajudQueue(): void {
  _datajudQueue = undefined;
}
