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

// Mock do Supabase
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {},
  supabaseAsUser: vi.fn(),
}))

import { supabaseAsUser } from '../../lib/supabase.js'

const mockJwtVerify = jose.jwtVerify as ReturnType<typeof vi.fn>
const mockSupabaseAsUser = supabaseAsUser as ReturnType<typeof vi.fn>

const USER_TOKEN = 'user-jwt-token'
const USER_ID = 'user-cliente-001'
const TENANT_ID = 'tenant-xyz'

function mockValidUserJwt(role = 'cliente') {
  mockJwtVerify.mockResolvedValueOnce({
    payload: {
      sub: USER_ID,
      app_metadata: { tenant_id: TENANT_ID, role },
    },
  })
}

describe('LGPD Routes (LGPD-01, LGPD-06)', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    const { default: authPlugin } = await import('../../plugins/auth.js')
    const { lgpdRoutes } = await import('./index.js')

    app = Fastify({ logger: false })
    await app.register(authPlugin)
    await app.register(lgpdRoutes, { prefix: '/api/v1/lgpd' })
    await app.ready()
  })

  afterAll(() => app.close())

  // Test 7: POST /lgpd/consentimento retorna 201 com consentimento_id
  it('POST /consentimento retorna 201 com consentimento_id', async () => {
    mockValidUserJwt()

    const mockConsentId = 'consent-uuid-001'
    const dbMock = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: mockConsentId },
        error: null,
      }),
    }
    mockSupabaseAsUser.mockReturnValueOnce(dbMock)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/lgpd/consentimento',
      headers: { authorization: `Bearer ${USER_TOKEN}` },
      payload: { versao_termos: '2026-04-14' },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.consentimento_id).toBe(mockConsentId)
  })

  // Test 8: GET /lgpd/consentimento retorna historico do usuario autenticado
  it('GET /consentimento retorna historico de consentimentos do usuario autenticado', async () => {
    mockValidUserJwt()

    const mockHistorico = [
      { id: 'c1', versao_termos: '2026-04-14', consentido_em: '2026-04-14T00:00:00Z', revogado_em: null },
    ]
    const dbMock = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({
        data: mockHistorico,
        error: null,
      }),
    }
    mockSupabaseAsUser.mockReturnValueOnce(dbMock)

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/lgpd/consentimento',
      headers: { authorization: `Bearer ${USER_TOKEN}` },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.consentimentos)).toBe(true)
    expect(body.consentimentos).toHaveLength(1)
    expect(body.consentimentos[0].id).toBe('c1')
  })
})
