import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import * as jose from 'jose';

// Mock jose JWKS — avoid real HTTP calls in tests
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof jose>();
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => vi.fn()),
    jwtVerify: vi.fn(),
  };
});

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'mov-uuid-1', texto_movimentacao: 'Juntada de petição', hash_texto: null, traducao_status: 'pending' },
            ],
          }),
          single: vi.fn().mockResolvedValue({
            data: { numero_cnj: '0001234-55.2026.8.26.0100', tipo_acao: 'Civil', partes_resumo: 'Autor vs Réu' },
          }),
        }),
      }),
    }),
  });
  return {
    createClient: vi.fn().mockReturnValue({ from: mockFrom }),
  };
});

const mockJwtVerify = jose.jwtVerify as ReturnType<typeof vi.fn>;
const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: 'mock-job-id-123' }),
};

let app: ReturnType<typeof Fastify>;

beforeAll(async () => {
  const { default: authPlugin } = await import('../plugins/auth.js');
  const { traducaoRoutes } = await import('../routes/processos/traducao.js');

  app = Fastify({ logger: false });
  await app.register(authPlugin);
  app.register(traducaoRoutes, { translateQueue: mockQueue as any });
  await app.ready();
});

afterAll(() => app.close());

describe('Translation endpoint security', () => {
  it('rejects request without valid tenant JWT — returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/processos/550e8400-e29b-41d4-a716-446655440000/traducao',
      headers: {},
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 202 Accepted and enqueues BullMQ job with valid JWT', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: 'user-uuid-1',
        app_metadata: { tenant_id: 'tenant-uuid-1', role: 'admin_escritorio' },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/processos/550e8400-e29b-41d4-a716-446655440000/traducao',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(typeof body.job_id).toBe('string');
  });

  it('enqueued job contains correct tenant_id, movimentacao_id, processo_id', async () => {
    mockQueue.add.mockClear();
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: 'user-uuid-1',
        app_metadata: { tenant_id: 'tenant-uuid-1', role: 'admin_escritorio' },
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/processos/550e8400-e29b-41d4-a716-446655440000/traducao',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'translate',
      expect.objectContaining({
        tenant_id: 'tenant-uuid-1',
        movimentacao_id: 'mov-uuid-1',
        processo_id: '550e8400-e29b-41d4-a716-446655440000',
      }),
      expect.any(Object)
    );
  });
});
