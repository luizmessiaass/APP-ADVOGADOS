import { describe, it, expect, vi } from 'vitest';
import { calcularTier, TIER_INTERVALS_MS } from '../scheduler.js';

describe('calcularTier', () => {
  it('deve retornar hot para processo com movimentação há 15 dias', () => {
    const quinzeDiasAtras = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(calcularTier(quinzeDiasAtras)).toBe('hot');
  });

  it('deve retornar warm para processo com movimentação há 60 dias', () => {
    const sessentaDiasAtras = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    expect(calcularTier(sessentaDiasAtras)).toBe('warm');
  });

  it('deve retornar cold para processo com movimentação há 200 dias', () => {
    const duzentosAtras = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    expect(calcularTier(duzentosAtras)).toBe('cold');
  });

  it('deve retornar cold para processo sem movimentação (null)', () => {
    expect(calcularTier(null)).toBe('cold');
  });
});

describe('TIER_INTERVALS_MS', () => {
  it('hot deve ser 6 horas em ms', () => {
    expect(TIER_INTERVALS_MS.hot).toBe(6 * 60 * 60 * 1000);
  });

  it('warm deve ser 24 horas em ms', () => {
    expect(TIER_INTERVALS_MS.warm).toBe(24 * 60 * 60 * 1000);
  });

  it('cold deve ser 7 dias em ms', () => {
    expect(TIER_INTERVALS_MS.cold).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('agendarSyncProcesso', () => {
  it('deve chamar upsertJobScheduler com o intervalo correto para o tier', async () => {
    const { agendarSyncProcesso } = await import('../scheduler.js');
    const mockQueue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };
    await agendarSyncProcesso(mockQueue as any, 'proc-123', '0000001-47.2024.8.26.0001', 'tenant-456', 'hot');
    expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'sync-processo-proc-123',
      { every: TIER_INTERVALS_MS.hot },
      expect.objectContaining({ name: 'datajud-sync' })
    );
  });
});
