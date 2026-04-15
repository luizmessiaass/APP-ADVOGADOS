/**
 * Circuit breaker opossum 9.x com estado persistido no Redis.
 * (D-15/D-16 do CONTEXT.md, DATAJUD-06)
 *
 * Parâmetros (Claude's Discretion):
 * - volumeThreshold: 5 requisições mínimas para avaliar
 * - errorThresholdPercentage: 100 (abre após 100% de falhas no threshold — equivale a 5 consecutivas)
 * - resetTimeout: 60_000ms (1 minuto de half-open)
 * - timeout: 10_000ms (por chamada)
 */
import CircuitBreaker from 'opossum';
import type { Redis } from 'ioredis';

export const CB_REDIS_KEY = 'cb:datajud:global';
export const CB_REDIS_TTL_S = 3600; // 1h — alinhado com os tiers de refresh mínimo (6h hot)

export class CircuitBreakerError extends Error {
  readonly code = 'CIRCUIT_OPEN';
  constructor() {
    super('Circuit breaker DataJud aberto — chamadas suspensas');
    this.name = 'CircuitBreakerError';
  }
}

export interface CircuitBreakerState {
  state?: {
    open?: boolean;
    halfOpen?: boolean;
    closed?: boolean;
  };
}

/**
 * Cria um circuit breaker opossum para wrapping de uma função assíncrona.
 * Restaura o estado do Redis (open/closed) no restart do worker.
 *
 * Em produção, sempre passar a função real:
 *   criarCircuitBreaker(redis, opts, adapter.buscarProcesso.bind(adapter))
 * Para testes sem função real, omitir o terceiro argumento.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function criarCircuitBreaker(
  redis: Redis,
  options?: Partial<CircuitBreaker.Options>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn?: (...args: any[]) => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<CircuitBreaker<any[], any>> {
  // Tentar restaurar estado salvo no Redis
  let savedState: CircuitBreakerState | undefined;
  try {
    const raw = await redis.get(CB_REDIS_KEY);
    if (raw) savedState = JSON.parse(raw) as CircuitBreakerState;
  } catch {
    // Redis temporariamente indisponível — iniciar sem estado
  }

  // Função placeholder — no worker, substituída pela função real do adapter
  const noop = async () => {};
  const actionFn = fn ?? noop;

  const breaker = new CircuitBreaker(actionFn, {
    timeout: 10_000,
    errorThresholdPercentage: 100, // abre após 100% de erro no volume threshold
    resetTimeout: 60_000,          // 1 minuto até tentar half-open
    volumeThreshold: 5,            // mínimo 5 calls para avaliar
    ...options,
  });

  // Restaurar estado: se estava open, forçar abertura imediata
  if (savedState?.state?.open) {
    breaker.open();
  }

  // Persistir estado a cada mudança
  const persistirEstado = async () => {
    try {
      await redis.setex(CB_REDIS_KEY, CB_REDIS_TTL_S, JSON.stringify(breaker.toJSON()));
    } catch {
      // Não bloquear se Redis estiver indisponível — logar via pino em produção
    }
  };

  breaker.on('open', () => void persistirEstado());
  breaker.on('close', () => void persistirEstado());
  breaker.on('halfOpen', () => void persistirEstado());

  return breaker;
}
