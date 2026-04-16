import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import * as jose from 'jose'

// Mock JWKS — nao chamar endpoint real em testes
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof jose>()
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => vi.fn()),
    jwtVerify: vi.fn(),
  }
})

// Mock Supabase admin client
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock ioredis
vi.mock('ioredis', () => {
  const RedisMock = vi.fn(() => ({
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  }))
  return { default: RedisMock }
})

import { supabaseAdmin } from '../lib/supabase.js'
import Redis from 'ioredis'

const mockJwtVerify = jose.jwtVerify as ReturnType<typeof vi.fn>
const mockSupabaseFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>

function buildMockRedis(statusValue: string | null = null) {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(statusValue),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  }
  return mockRedis
}

function mockSupabaseStatus(status: string) {
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { status }, error: null }),
      }),
    }),
  })
}

async function buildTestApp(redis: ReturnType<typeof buildMockRedis>) {
  const { default: authPlugin } = await import('./auth.js')
  const { default: entitlementPlugin } = await import('./entitlement.js')

  const app = Fastify({ logger: false })

  await app.register(authPlugin)
  await app.register(entitlementPlugin, { redis: redis as unknown as InstanceType<typeof Redis> })

  // Test routes
  app.get('/api/v1/protected', async (_req, reply) => {
    return reply.send({ ok: true })
  })
  app.post('/api/v1/data', async (_req, reply) => {
    return reply.send({ ok: true })
  })
  app.get('/health', { config: { skipAuth: true } }, async (_req, reply) => {
    return reply.send({ status: 'ok' })
  })

  await app.ready()
  return app
}

function mockValidUser(tenantId: string, role = 'admin_escritorio') {
  mockJwtVerify.mockResolvedValue({
    payload: {
      sub: 'user-abc',
      app_metadata: { tenant_id: tenantId, role },
    },
  })
}

describe('entitlementPlugin (BILLING-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('suspended tenant', () => {
    it('returns 402 subscription_required on GET protected endpoint', async () => {
      const redis = buildMockRedis('suspended')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-suspended')

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/protected',
        headers: { authorization: 'Bearer token-valido' },
      })

      expect(res.statusCode).toBe(402)
      const body = JSON.parse(res.body)
      expect(body.error).toBe('subscription_required')
      expect(body.tenant_status).toBe('suspended')
      expect(body.message).toBeDefined()

      await app.close()
    })

    it('returns 402 subscription_required on POST protected endpoint', async () => {
      const redis = buildMockRedis('suspended')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-suspended')

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/data',
        headers: { authorization: 'Bearer token-valido' },
      })

      expect(res.statusCode).toBe(402)
      const body = JSON.parse(res.body)
      expect(body.error).toBe('subscription_required')
      expect(body.tenant_status).toBe('suspended')

      await app.close()
    })
  })

  describe('read_only tenant', () => {
    it('GET passes through with 200', async () => {
      const redis = buildMockRedis('read_only')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-readonly')

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/protected',
        headers: { authorization: 'Bearer token-valido' },
      })

      expect(res.statusCode).toBe(200)
      await app.close()
    })

    it('POST returns 402 subscription_required', async () => {
      const redis = buildMockRedis('read_only')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-readonly')

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/data',
        headers: { authorization: 'Bearer token-valido' },
      })

      expect(res.statusCode).toBe(402)
      const body = JSON.parse(res.body)
      expect(body.error).toBe('subscription_required')
      expect(body.tenant_status).toBe('read_only')

      await app.close()
    })
  })

  describe('active tenant', () => {
    it('all routes pass through', async () => {
      const redis = buildMockRedis('active')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-active')

      const resGet = await app.inject({
        method: 'GET',
        url: '/api/v1/protected',
        headers: { authorization: 'Bearer token-valido' },
      })
      expect(resGet.statusCode).toBe(200)

      mockValidUser('tenant-active')
      const resPost = await app.inject({
        method: 'POST',
        url: '/api/v1/data',
        headers: { authorization: 'Bearer token-valido' },
      })
      expect(resPost.statusCode).toBe(200)

      await app.close()
    })
  })

  describe('grace tenant', () => {
    it('all routes pass through', async () => {
      const redis = buildMockRedis('grace')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-grace')

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/protected',
        headers: { authorization: 'Bearer token-valido' },
      })
      expect(res.statusCode).toBe(200)

      await app.close()
    })
  })

  describe('skip routes', () => {
    it('health route bypasses entitlement without auth', async () => {
      const redis = buildMockRedis(null)
      const app = await buildTestApp(redis)

      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)

      await app.close()
    })
  })

  describe('Redis cache', () => {
    it('uses DB fallback on cache miss and caches result', async () => {
      // Cache miss — status comes from DB
      const redis = buildMockRedis(null)
      mockSupabaseStatus('active')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-123')

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/protected',
        headers: { authorization: 'Bearer token-valido' },
      })

      expect(res.statusCode).toBe(200)
      expect(redis.setex).toHaveBeenCalledWith('tenant:status:tenant-123', 30, 'active')

      await app.close()
    })

    it('uses cached value and skips DB query on cache hit', async () => {
      // Cache hit — status = 'active'
      const redis = buildMockRedis('active')
      const app = await buildTestApp(redis)
      mockValidUser('tenant-cache-hit')

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/protected',
        headers: { authorization: 'Bearer token-valido' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseFrom).not.toHaveBeenCalled()

      await app.close()
    })
  })

  describe('fail-closed behavior', () => {
    it('treats unknown tenant (DB error) as suspended — returns 402', async () => {
      const redis = buildMockRedis(null)
      // DB returns error
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      })
      const app = await buildTestApp(redis)
      mockValidUser('tenant-unknown')

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/protected',
        headers: { authorization: 'Bearer token-valido' },
      })

      expect(res.statusCode).toBe(402)

      await app.close()
    })
  })
})
