import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarCircuitBreaker, CB_REDIS_KEY, CircuitBreakerError } from '../../datajud/circuit-breaker.js';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
};

describe('criarCircuitBreaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve iniciar fechado quando não há estado salvo no Redis', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const breaker = await criarCircuitBreaker(mockRedis as any);
    expect(breaker.closed).toBe(true);
    expect(breaker.opened).toBe(false);
  });

  it('deve iniciar aberto quando estado salvo no Redis é open', async () => {
    const estadoOpen = JSON.stringify({ state: { open: true, closed: false, halfOpen: false } });
    mockRedis.get.mockResolvedValueOnce(estadoOpen);
    const breaker = await criarCircuitBreaker(mockRedis as any);
    expect(breaker.opened).toBe(true);
  });

  it('deve persistir estado no Redis quando o circuito abre', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const breaker = await criarCircuitBreaker(mockRedis as any, {
      volumeThreshold: 1,
      errorThresholdPercentage: 100,
    });
    // Forçar abertura manual para testar persistência
    breaker.open();
    // Aguardar evento assíncrono
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockRedis.setex).toHaveBeenCalledWith(
      CB_REDIS_KEY,
      expect.any(Number),
      expect.stringContaining('"')
    );
  });

  it('deve ignorar erro de Redis e iniciar sem estado', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('redis connection refused'));
    const breaker = await criarCircuitBreaker(mockRedis as any);
    // Deve criar sem lançar
    expect(breaker).toBeDefined();
    expect(breaker.closed).toBe(true);
  });
});
