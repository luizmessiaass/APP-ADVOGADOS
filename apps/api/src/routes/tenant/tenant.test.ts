import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import * as jose from 'jose'

// Mock do JWKS e jwtVerify
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof jose>()
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => vi.fn()),
    jwtVerify: vi.fn(),
  }
})

// Mock do Supabase — retorna dados do escritório
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {},
  supabaseAsUser: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { status: 'active', grace_banner: false },
      error: null,
    }),
  }),
}))

// Mock do config — expõe TERMS_VERSION para testes
vi.mock('../../config.js', () => ({
  env: {
    TERMS_VERSION: '2026-04-16',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
    NODE_ENV: 'test',
    PORT: 3000,
    REDIS_URL: 'redis://localhost:6379',
    SENTRY_DSN: '',
    BETTERSTACK_SOURCE_TOKEN: '',
    PRIVACY_POLICY_URL: 'https://notion.so/portaljuridico-privacidade',
    BILLING_WEBHOOK_SECRET: '',
  },
}))

import { supabaseAsUser } from '../../lib/supabase.js'
import { env } from '../../config.js'

const mockJwtVerify = jose.jwtVerify as ReturnType<typeof vi.fn>
const mockSupabaseAsUser = supabaseAsUser as ReturnType<typeof vi.fn>

const USER_TOKEN = 'user-jwt-token'
const USER_ID = '550e8400-e29b-41d4-a716-446655440001'
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440002'

function mockValidUserJwt(role = 'cliente') {
  mockJwtVerify.mockResolvedValueOnce({
    payload: {
      sub: USER_ID,
      app_metadata: { tenant_id: TENANT_ID, role },
    },
  })
}

describe('GET /api/v1/tenant/status', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    const { default: authPlugin } = await import('../../plugins/auth.js')
    const { tenantRoutes } = await import('./index.js')

    app = Fastify({ logger: false })
    await app.register(authPlugin)
    await app.register(tenantRoutes, { prefix: '/api/v1/tenant' })
    await app.ready()
  })

  afterAll(() => app.close())

  // Test 1: campo termos_versao_atual presente na resposta — não vazio
  it('GET /status com token válido retorna 200 com campo termos_versao_atual', async () => {
    mockValidUserJwt()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tenant/status',
      headers: { authorization: `Bearer ${USER_TOKEN}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(typeof body.termos_versao_atual).toBe('string')
    expect(body.termos_versao_atual.length).toBeGreaterThan(0)
  })

  // Test 2: termos_versao_atual corresponde ao valor de env.TERMS_VERSION
  it('GET /status retorna termos_versao_atual igual a env.TERMS_VERSION', async () => {
    mockValidUserJwt()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tenant/status',
      headers: { authorization: `Bearer ${USER_TOKEN}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.termos_versao_atual).toBe(env.TERMS_VERSION)
  })

  // Test 3: resposta inclui campos existentes tenant_status (string) e grace_banner (boolean)
  it('GET /status retorna tenant_status (string) e grace_banner (boolean)', async () => {
    mockValidUserJwt()

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tenant/status',
      headers: { authorization: `Bearer ${USER_TOKEN}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(typeof body.tenant_status).toBe('string')
    expect(typeof body.grace_banner).toBe('boolean')
  })

  // Test 4: sem Authorization header → 401
  it('GET /status sem Authorization retorna 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tenant/status',
    })

    expect(res.statusCode).toBe(401)
  })
})
