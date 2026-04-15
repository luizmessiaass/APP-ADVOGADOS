import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildApp } from '../server.js'

// Mock supabaseAdmin
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
  supabaseAsUser: vi.fn(),
}))

// Mock createRedisClient
vi.mock('../lib/redis.js', () => ({
  createRedisClient: vi.fn(),
  createBullMQRedisClient: vi.fn(),
}))

// Mock fetch global para DataJud
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper para criar mock do Redis client
function createMockRedis(pingResult: string | Error = 'PONG') {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockImplementation(() => {
      if (pingResult instanceof Error) return Promise.reject(pingResult)
      return Promise.resolve(pingResult)
    }),
    quit: vi.fn().mockResolvedValue(undefined),
  }
}

// Helper para criar mock do Supabase query
function createMockSupabaseQuery(error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error }),
  }
}

describe('GET /health', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = buildApp({ logger: false })
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('Test 1: retorna 200 com status=ok quando todos os checks passam', async () => {
    const { supabaseAdmin } = await import('../lib/supabase.js')
    const { createRedisClient } = await import('../lib/redis.js')

    vi.mocked(supabaseAdmin.from).mockReturnValue(createMockSupabaseQuery(null) as never)
    vi.mocked(createRedisClient).mockReturnValue(createMockRedis('PONG') as never)
    mockFetch.mockResolvedValue({ ok: true, status: 200 })

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('ok')
    expect(body.checks.supabase).toBe('ok')
    expect(body.checks.redis).toBe('ok')
    expect(body.checks.datajud).toBe('ok')
  })

  it('Test 2: retorna 503 com status=degraded quando Redis falha', async () => {
    const { supabaseAdmin } = await import('../lib/supabase.js')
    const { createRedisClient } = await import('../lib/redis.js')

    vi.mocked(supabaseAdmin.from).mockReturnValue(createMockSupabaseQuery(null) as never)
    vi.mocked(createRedisClient).mockReturnValue(
      createMockRedis(new Error('Connection refused')) as never
    )
    mockFetch.mockResolvedValue({ ok: true, status: 200 })

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(503)
    const body = response.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.redis).toBe('error')
    expect(body.checks.supabase).toBe('ok')
  })

  it('Test 3: retorna 503 com status=degraded quando Supabase falha', async () => {
    const { supabaseAdmin } = await import('../lib/supabase.js')
    const { createRedisClient } = await import('../lib/redis.js')

    vi.mocked(supabaseAdmin.from).mockReturnValue(
      createMockSupabaseQuery({ message: 'DB error', code: 'ERR' }) as never
    )
    vi.mocked(createRedisClient).mockReturnValue(createMockRedis('PONG') as never)
    mockFetch.mockResolvedValue({ ok: true, status: 200 })

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(503)
    const body = response.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.supabase).toBe('error')
    expect(body.checks.redis).toBe('ok')
  })

  it('Test 4: body inclui checks individuais (supabase, redis, datajud) para diagnostico', async () => {
    const { supabaseAdmin } = await import('../lib/supabase.js')
    const { createRedisClient } = await import('../lib/redis.js')

    vi.mocked(supabaseAdmin.from).mockReturnValue(createMockSupabaseQuery(null) as never)
    vi.mocked(createRedisClient).mockReturnValue(createMockRedis('PONG') as never)
    mockFetch.mockResolvedValue({ ok: false, status: 503 })

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    const body = response.json()
    expect(body.checks).toBeDefined()
    expect(body.checks).toHaveProperty('supabase')
    expect(body.checks).toHaveProperty('redis')
    expect(body.checks).toHaveProperty('datajud')
    expect(body.timestamp).toBeDefined()
  })

  it('Test 5: rota nao exige autenticacao (config skipAuth: true)', async () => {
    const { supabaseAdmin } = await import('../lib/supabase.js')
    const { createRedisClient } = await import('../lib/redis.js')

    vi.mocked(supabaseAdmin.from).mockReturnValue(createMockSupabaseQuery(null) as never)
    vi.mocked(createRedisClient).mockReturnValue(createMockRedis('PONG') as never)
    mockFetch.mockResolvedValue({ ok: true, status: 200 })

    // Sem header Authorization — deve funcionar sem erro 401
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      // Sem headers de autenticacao
    })

    // Nao deve retornar 401 (nao exige autenticacao)
    expect(response.statusCode).not.toBe(401)
    expect(response.statusCode).not.toBe(403)
  })
})
