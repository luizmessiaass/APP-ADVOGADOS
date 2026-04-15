/**
 * Tier scheduler para sincronização DataJud.
 * (D-01/D-02 do CONTEXT.md, DATAJUD-04)
 *
 * Limiares (Claude's Discretion):
 * - hot:  < 30 dias desde última movimentação -> sync a cada 6h
 * - warm: 30-180 dias -> sync a cada 24h
 * - cold: > 180 dias -> sync a cada 7 dias
 */
import type { Queue } from 'bullmq';
import type { SyncJobData } from '../queues/datajud-queue.js';

export type Tier = 'hot' | 'warm' | 'cold';

export const TIER_INTERVALS_MS: Record<Tier, number> = {
  hot:  6 * 60 * 60 * 1000,         // 6 horas
  warm: 24 * 60 * 60 * 1000,        // 24 horas
  cold: 7 * 24 * 60 * 60 * 1000,    // 7 dias
};

const TIER_THRESHOLDS_DAYS = {
  HOT_MAX: 30,    // < 30 dias = hot
  WARM_MAX: 180,  // 30-180 dias = warm; > 180 = cold
} as const;

/**
 * Calcula o tier baseado na data da última movimentação detectada.
 * Retorna 'cold' se nunca houve movimentação (processo sem histórico).
 */
export function calcularTier(ultimaMovimentacaoAt: Date | null): Tier {
  if (!ultimaMovimentacaoAt) return 'cold';
  const diasSemMovimentacao =
    (Date.now() - ultimaMovimentacaoAt.getTime()) / (1000 * 60 * 60 * 24);
  if (diasSemMovimentacao < TIER_THRESHOLDS_DAYS.HOT_MAX) return 'hot';
  if (diasSemMovimentacao < TIER_THRESHOLDS_DAYS.WARM_MAX) return 'warm';
  return 'cold';
}

/**
 * Agenda (ou reagenda) o sync de um processo no tier correto.
 * upsertJobScheduler é idempotente: atualiza se o scheduler já existe.
 */
export async function agendarSyncProcesso(
  queue: Queue<SyncJobData>,
  processoId: string,
  numeroCNJ: string,
  tenantId: string,
  tier: Tier
): Promise<void> {
  await queue.upsertJobScheduler(
    `sync-processo-${processoId}`,          // ID único do scheduler por processo
    { every: TIER_INTERVALS_MS[tier] },      // intervalo em ms
    {
      name: 'datajud-sync',
      data: {
        processoId,
        numeroCNJ,
        tenantId,
        tier,
        step: 'INITIAL',
      },
    }
  );
}
