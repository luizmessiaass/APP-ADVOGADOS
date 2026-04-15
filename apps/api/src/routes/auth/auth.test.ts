import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import * as jose from 'jose'

// Mock do JWKS e jwtVerify para nao chamar Supabase real
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof jose>()
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => vi.fn()),
    jwtVerify: vi.fn(),
  }
})

// Mock do Supabase admin
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        inviteUserByEmail: vi.fn(),
      },
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(),
  },
  supabaseAsUser: vi.fn(() => ({
    auth: {
      signOut: vi.fn(),
    },
  })),
}))

import { supabaseAdmin, supabaseAsUser } from '../../lib/supabase.js'

const mockJwtVerify = jose.jwtVerify as ReturnType<typeof vi.fn>
const mockSupabaseAdmin = supabaseAdmin as ReturnType<typeof vi.fn>
const mockSupabaseAsUser = supabaseAsUser as ReturnType<typeof vi.fn>

const ADMIN_TOKEN = 'admin-token-valido'
const ADMIN_TENANT = 'tenant-abc-123'

function mockValidAdminJwt() {
  mockJwtVerify.mockResolvedValueOnce({
    payload: {
      sub: 'user-admin-001',
      app_metadata: { tenant_id: ADMIN_TENANT, role: 'admin_escritorio' },
    },
  })
}

describe('Auth Routes (AUTH-01, AUTH-02)', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    const { default: authPlugin } = await import('../../plugins/auth.js')
    const { authRoutes } = await import('./index.js')

    app = Fastify({ logger: false })
    await app.register(authPlugin)
    await app.register(authRoutes, { prefix: '/api/v1/auth' })
    await app.ready()
  })

  afterAll(() => app.close())

  // Test 1: signup com dados validos retorna 201
  it('POST /signup/escritorio com dados validos retorna 201 com escritorio_id e privacy_policy_url', async () => {
    const mockUserId = 'user-new-001'
    const mockEscritorioId = 'escr-new-001'

    ;(supabaseAdmin.auth.admin.createUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { id: mockUserId } },
      error: null,
    })

    const fromMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: mockEscritorioId },
        error: null,
      }),
    }
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(fromMock)

    const updateMock = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
    }
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(updateMock)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup/escritorio',
      payload: { nome: 'Escritorio Teste', email: 'teste@escritorio.com', senha: 'senha123456' },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.escritorio_id).toBe(mockEscritorioId)
    expect(body.privacy_policy_url).toBeDefined()
  })

  // Test 2: signup com email duplicado retorna 400 com code USER_ALREADY_EXISTS
  it('POST /signup/escritorio com email duplicado retorna 400 USER_ALREADY_EXISTS', async () => {
    ;(supabaseAdmin.auth.admin.createUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: { message: 'User already registered' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup/escritorio',
      payload: { nome: 'Escritorio Dup', email: 'dup@escritorio.com', senha: 'senha123456' },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.code).toBe('USER_ALREADY_EXISTS')
  })

  // Test 3: login com credenciais invalidas retorna 400 com code INVALID_CREDENTIALS
  it('POST /login com credenciais invalidas retorna 400 INVALID_CREDENTIALS', async () => {
    ;(supabaseAdmin.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid credentials' },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'teste@escritorio.com', senha: 'senhaerrada' },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.code).toBe('INVALID_CREDENTIALS')
  })

  // Test 4: login com credenciais validas retorna 200 com access_token
  it('POST /login com credenciais validas retorna 200 com access_token', async () => {
    ;(supabaseAdmin.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token-jwt-fake',
          refresh_token: 'refresh-token-fake',
        },
        user: {
          id: 'user-001',
          email: 'teste@escritorio.com',
          app_metadata: { role: 'admin_escritorio', tenant_id: 'tenant-001' },
        },
      },
      error: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'teste@escritorio.com', senha: 'senha123456' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.access_token).toBeTruthy()
    expect(body.access_token.length).toBeGreaterThan(0)
    expect(body.refresh_token).toBeTruthy()
    expect(body.user.email).toBe('teste@escritorio.com')
  })

  // Test 5: invite sem ser admin_escritorio retorna 403 FORBIDDEN_ROLE
  it('POST /invite sem ser admin_escritorio retorna 403 FORBIDDEN_ROLE', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: 'user-advogado-001',
        app_metadata: { tenant_id: ADMIN_TENANT, role: 'advogado' },
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/invite',
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { email: 'novo@cliente.com', nome: 'Novo Cliente', role_local: 'cliente' },
    })

    expect(res.statusCode).toBe(403)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.code).toBe('FORBIDDEN_ROLE')
  })

  // Test 6: invite por admin_escritorio inclui tenant_id nos metadados
  it('POST /invite por admin_escritorio inclui tenant_id nos metadados do convite', async () => {
    mockValidAdminJwt()

    ;(supabaseAdmin.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {},
      error: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/invite',
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { email: 'cliente@novo.com', nome: 'Cliente Novo', role_local: 'cliente' },
    })

    expect(res.statusCode).toBe(201)
    const inviteCall = (supabaseAdmin.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)
    expect(inviteCall).toBeDefined()
    expect(inviteCall[1].data.tenant_id).toBe(ADMIN_TENANT)
    expect(inviteCall[1].data.role_local).toBe('cliente')
  })
})
