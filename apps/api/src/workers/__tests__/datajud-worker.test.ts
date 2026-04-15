import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calcularTier, TIER_INTERVALS_MS } from '../scheduler.js';
import { processarSyncJob } from '../datajud-sync.js';
import type { Job } from 'bullmq';

// =====================================================================
// Testes Wave 0 — scheduler/tier (stubs básicos)
// =====================================================================

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

// =====================================================================
// TESTES COMPLETOS (além dos stubs Wave 0)
// =====================================================================

// Factory de mock de Job BullMQ
function criarMockJob(data: Record<string, unknown>): Partial<Job> {
  const jobData = { ...data };
  return {
    id: 'job-test-123',
    data: jobData as any,
    updateData: vi.fn().mockImplementation(async (newData: any) => {
      Object.assign(jobData, newData);
    }),
  };
}

// Factory de Supabase Admin mock
function criarMockSupabase() {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      }),
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ data: [], error: null }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
    }),
  };
}

describe('processarSyncJob — fluxo step-job (DATAJUD-07 checkpoint)', () => {
  it('deve transitar de INITIAL para FETCH_DATAJUD', async () => {
    const job = criarMockJob({
      processoId: 'proc-123',
      numeroCNJ: '0000001-47.2024.8.26.0001',
      tenantId: 'tenant-abc',
      tier: 'hot',
      step: 'INITIAL',
    });

    const mockSupabase = criarMockSupabase();
    const mockQueue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };
    const mockBreaker = {
      opened: false,
      fire: vi.fn().mockResolvedValue(null), // DataJud retorna null (não encontrado)
    } as any;

    await processarSyncJob(job as Job<any>, mockSupabase as any, mockQueue as any, mockBreaker);

    // job.updateData deve ter sido chamado com step FETCH_DATAJUD ao menos uma vez
    const calls = (job.updateData as ReturnType<typeof vi.fn>).mock.calls;
    const fetchStep = calls.find(([data]: any[]) => data.step === 'FETCH_DATAJUD');
    expect(fetchStep).toBeDefined();
  });

  it('deve retomar do step DIFF_MOVIMENTACOES sem refazer FETCH_DATAJUD (checkpoint)', async () => {
    const dadosFake = {
      dadosBasicos: { numero: '0000001-47.2024.8.26.0001', nivelSigilo: 0 },
      movimentos: [],
    };
    const job = criarMockJob({
      processoId: 'proc-123',
      numeroCNJ: '0000001-47.2024.8.26.0001',
      tenantId: 'tenant-abc',
      tier: 'hot',
      step: 'DIFF_MOVIMENTACOES',   // começa do meio — simula restart após crash
      dadosDatajud: dadosFake,
    });

    const mockSupabase = criarMockSupabase();
    const mockQueue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };
    const mockBreaker = { opened: false, fire: vi.fn() } as any;

    await processarSyncJob(job as Job<any>, mockSupabase as any, mockQueue as any, mockBreaker);

    // breaker.fire() NÃO deve ter sido chamado (não refez o FETCH)
    expect(mockBreaker.fire).not.toHaveBeenCalled();
  });

  it('deve gravar sync_error tipo circuit_open quando breaker está aberto', async () => {
    const job = criarMockJob({
      processoId: 'proc-123',
      numeroCNJ: '0000001-47.2024.8.26.0001',
      tenantId: 'tenant-abc',
      tier: 'hot',
      step: 'FETCH_DATAJUD',
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ data: [], error: null }),
    });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    };
    const mockQueue = { upsertJobScheduler: vi.fn() };

    // Simular breaker aberto: fire() lança OpenCircuitError
    const openError = new Error('Breaker open');
    openError.name = 'OpenCircuitError';
    const mockBreaker = { opened: true, fire: vi.fn().mockRejectedValue(openError) } as any;

    await processarSyncJob(job as Job<any>, mockSupabase as any, mockQueue as any, mockBreaker);

    // Verificar que sync_errors foi chamado
    const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls;
    const syncErrorCall = fromCalls.find(([table]: string[]) => table === 'sync_errors');
    expect(syncErrorCall).toBeDefined();
  });

  it('deve incrementar tentativasHitsVazio quando DataJud retorna null', async () => {
    const job = criarMockJob({
      processoId: 'proc-123',
      numeroCNJ: '0000001-47.2024.8.26.0001',
      tenantId: 'tenant-abc',
      tier: 'hot',
      step: 'FETCH_DATAJUD',
      tentativasHitsVazio: 0,
    });

    const mockSupabase = criarMockSupabase();
    const mockQueue = { upsertJobScheduler: vi.fn().mockResolvedValue(undefined) };
    const mockBreaker = { opened: false, fire: vi.fn().mockResolvedValue(null) } as any;

    await processarSyncJob(job as Job<any>, mockSupabase as any, mockQueue as any, mockBreaker);

    const calls = (job.updateData as ReturnType<typeof vi.fn>).mock.calls;
    const tentativasCall = calls.find(([data]: any[]) => data.tentativasHitsVazio !== undefined);
    expect(tentativasCall?.[0].tentativasHitsVazio).toBe(1);
  });
});
