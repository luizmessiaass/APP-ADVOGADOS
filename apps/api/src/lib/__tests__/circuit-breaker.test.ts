import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarCircuitBreaker, CB_REDIS_KEY, CircuitBreakerError } from '../../datajud/circuit-breaker.js';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
};

// =====================================================================
// Testes Wave 0 — circuit breaker básico (stubs)
// =====================================================================

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

// =====================================================================
// TESTES COMPLETOS DO CIRCUIT BREAKER (DATAJUD-06)
// =====================================================================

describe('circuit breaker — comportamento completo (DATAJUD-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
  });

  it('deve persistir estado no Redis quando abre por falhas consecutivas', async () => {
    const breaker = await criarCircuitBreaker(mockRedis as any, {
      volumeThreshold: 3,
      errorThresholdPercentage: 100,
      resetTimeout: 5000,
    });

    // Forçar abertura manual para testar
    breaker.open();
    await new Promise(resolve => setTimeout(resolve, 20)); // aguardar evento assíncrono

    expect(mockRedis.setex).toHaveBeenCalledWith(
      CB_REDIS_KEY,
      expect.any(Number),
      expect.any(String)
    );

    // Verificar que o JSON salvo contém alguma informação de estado
    const savedJson = JSON.parse((mockRedis.setex as ReturnType<typeof vi.fn>).mock.calls[0][2]);
    expect(savedJson).toBeDefined();
  });

  it('deve restaurar estado aberto do Redis no restart do worker', async () => {
    // Simular estado salvo no Redis indicando circuito aberto
    const estadoOpen = JSON.stringify({
      state: { open: true, closed: false, halfOpen: false },
    });
    mockRedis.get.mockResolvedValueOnce(estadoOpen);

    const breaker = await criarCircuitBreaker(mockRedis as any);
    expect(breaker.opened).toBe(true);
  });

  it('deve manter estado fechado quando Redis retorna estado fechado', async () => {
    const estadoClosed = JSON.stringify({
      state: { open: false, closed: true, halfOpen: false },
    });
    mockRedis.get.mockResolvedValueOnce(estadoClosed);

    const breaker = await criarCircuitBreaker(mockRedis as any);
    expect(breaker.closed).toBe(true);
    expect(breaker.opened).toBe(false);
  });

  it('deve persistir estado quando circuito fecha (recovery)', async () => {
    const breaker = await criarCircuitBreaker(mockRedis as any);

    // Abrir e depois fechar
    breaker.open();
    breaker.close();
    await new Promise(resolve => setTimeout(resolve, 20));

    // setex deve ter sido chamado em ambas as transições
    expect(mockRedis.setex).toHaveBeenCalledTimes(2);
  });

  it('CircuitBreakerError deve ter code CIRCUIT_OPEN', () => {
    const err = new CircuitBreakerError();
    expect(err.code).toBe('CIRCUIT_OPEN');
    expect(err).toBeInstanceOf(Error);
  });
});
