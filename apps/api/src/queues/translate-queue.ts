/**
 * Queue BullMQ para o worker de traducao de movimentacoes via Claude AI.
 * Phase 3 — AI-01, D-01, D-02.
 */
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { TranslateJobData } from '../workers/translate-movimentacao.js';

export const TRANSLATE_QUEUE_NAME = 'translate-movimentacao';

export function getTranslateQueue(redis: Redis): Queue<TranslateJobData> {
  return new Queue<TranslateJobData>(TRANSLATE_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s, 16s, 32s
      },
      priority: 2, // Menor prioridade que DataJud sync (prioridade 1)
    },
  });
}
