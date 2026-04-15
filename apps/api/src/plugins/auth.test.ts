import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import * as jose from 'jose'

// Mock do JWKS — nao chamar endpoint real em testes
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof jose>()
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => vi.fn()),
    jwtVerify: vi.fn(),
  }
})

const mockJwtVerify = jose.jwtVerify as ReturnType<typeof vi.fn>

describe('Auth Plugin (AUTH-04)', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    const { default: authPlugin } = await import('./auth.js')
    app = Fastify({ logger: false })
    await app.register(authPlugin)
    app.get('/protected', async (req, reply) => {
      return reply.send({ user: req.user, hasLogger: !!req.tenantLogger })
    })
    app.get('/health', { config: { skipAuth: true } }, async (_req, reply) => {
      return reply.send({ status: 'ok' })
    })
    await app.ready()
  })

  afterAll(() => app.close())

  it('rejeita request sem Authorization header com 401 MISSING_TOKEN', async () => {
    const res = await app.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body).code).toBe('MISSING_TOKEN')
  })

  it('rejeita token malformado com 401 INVALID_TOKEN', async () => {
    mockJwtVerify.mockRejectedValueOnce(new Error('invalid token'))
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer token-invalido' },
    })
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body).code).toBe('INVALID_TOKEN')
  })

  it('rejeita JWT sem app_metadata.tenant_id com 403 NO_TENANT_CONTEXT', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'user-123', app_metadata: {} },
    })
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer token-sem-tenant' },
    })
    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.body).code).toBe('NO_TENANT_CONTEXT')
  })

  it('decora req.user com sub, tenant_id, role corretos', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: 'user-abc',
        app_metadata: { tenant_id: 'tenant-xyz', role: 'admin_escritorio' },
      },
    })
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer token-valido' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.user.sub).toBe('user-abc')
    expect(body.user.tenant_id).toBe('tenant-xyz')
    expect(body.user.role).toBe('admin_escritorio')
    expect(body.hasLogger).toBe(true)
  })

  it('rota com skipAuth: true nao executa o preHandler de auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
  })
})
