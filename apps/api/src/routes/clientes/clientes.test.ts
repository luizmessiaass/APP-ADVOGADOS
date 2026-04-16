import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'

// Mock supabase lib — keep supabaseAsUser and supabaseAdmin separate
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
  },
  supabaseAsUser: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'abc-uuid', role_local: 'cliente' },
      error: null,
    }),
  }),
}))

// Mock BullMQ cleanup helper
vi.mock('../../lib/bullmq-cleanup.js', () => ({
  cancelarJobsDoCliente: vi.fn().mockResolvedValue(undefined),
}))

import { supabaseAdmin, supabaseAsUser } from '../../lib/supabase.js'
import { cancelarJobsDoCliente } from '../../lib/bullmq-cleanup.js'
import { clientesRoutes } from './index.js'

const mockSupabaseAdmin = supabaseAdmin as {
  auth: { admin: { deleteUser: ReturnType<typeof vi.fn> } }
}
const mockSupabaseAsUser = supabaseAsUser as ReturnType<typeof vi.fn>
const mockCancelarJobsDoCliente = cancelarJobsDoCliente as ReturnType<typeof vi.fn>

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_ID = 'tenant-abc-123'
const AUTH_TOKEN = 'Bearer valid-test-token'

describe('DELETE /api/v1/clientes/:clienteId', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    app = Fastify({ logger: false })

    // Inject mock tenant user into all requests (simulates authPlugin)
    app.addHook('preHandler', async (req) => {
      req.user = { sub: 'admin-user-001', tenant_id: TENANT_ID, role: 'admin_escritorio' }
      req.tenantLogger = req.log.child({ tenant_id: TENANT_ID })
    })

    // Add user and tenantLogger decorators to satisfy Fastify type declarations
    app.decorateRequest('user', null)
    app.decorateRequest('tenantLogger', null)

    await app.register(clientesRoutes, { prefix: '/api/v1/clientes' })
    await app.ready()
  })

  afterAll(() => app.close())

  // Test 1: 204 on success — deleteUser is called with the correct clienteId
  it('retorna 204 e chama supabaseAdmin.auth.admin.deleteUser com o clienteId correto', async () => {
    mockSupabaseAsUser.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: CLIENT_ID, role_local: 'cliente' },
        error: null,
      }),
    })
    mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValueOnce({ error: null })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clientes/${CLIENT_ID}`,
      headers: { authorization: AUTH_TOKEN },
    })

    expect(res.statusCode).toBe(204)
    expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(CLIENT_ID)
  })

  // Test 2: 404 when RLS blocks or not found
  it('retorna 404 quando clienteId nao existe no tenant (RLS bloqueia)', async () => {
    mockSupabaseAsUser.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' },
      }),
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clientes/${CLIENT_ID}`,
      headers: { authorization: AUTH_TOKEN },
    })

    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Cliente não encontrado')
    expect(body.code).toBe('NOT_FOUND')
  })

  // Test 3: 400 when usuario.role_local is not 'cliente'
  it('retorna 400 quando role_local e "advogado" (nao cliente)', async () => {
    mockSupabaseAsUser.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: CLIENT_ID, role_local: 'advogado' },
        error: null,
      }),
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clientes/${CLIENT_ID}`,
      headers: { authorization: AUTH_TOKEN },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Apenas clientes podem ser deletados')
    expect(body.code).toBe('INVALID_ROLE')
  })

  // Test 4: 500 when supabaseAdmin.auth.admin.deleteUser returns an error
  it('retorna 500 com code DELETE_ERROR quando deleteUser falha', async () => {
    mockSupabaseAsUser.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: CLIENT_ID, role_local: 'cliente' },
        error: null,
      }),
    })
    mockCancelarJobsDoCliente.mockResolvedValueOnce(undefined)
    mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValueOnce({
      error: { message: 'Internal error deleting user' },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clientes/${CLIENT_ID}`,
      headers: { authorization: AUTH_TOKEN },
    })

    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Erro ao deletar cliente')
    expect(body.code).toBe('DELETE_ERROR')
  })

  // Test 5: cancelarJobsDoCliente is called BEFORE deleteUser
  it('chama cancelarJobsDoCliente antes de deleteUser', async () => {
    const callOrder: string[] = []

    mockSupabaseAsUser.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: CLIENT_ID, role_local: 'cliente' },
        error: null,
      }),
    })
    mockCancelarJobsDoCliente.mockImplementationOnce(async () => {
      callOrder.push('cancelarJobsDoCliente')
    })
    mockSupabaseAdmin.auth.admin.deleteUser.mockImplementationOnce(async () => {
      callOrder.push('deleteUser')
      return { error: null }
    })

    await app.inject({
      method: 'DELETE',
      url: `/api/v1/clientes/${CLIENT_ID}`,
      headers: { authorization: AUTH_TOKEN },
    })

    expect(callOrder).toEqual(['cancelarJobsDoCliente', 'deleteUser'])
  })

  // Test 6: PII guard — nome must NOT be present in the tenantLogger.info call (T-8-02)
  it('loga somente clienteId no sucesso — nome NAO aparece no log de info (T-8-02)', async () => {
    const loggedInfoArgs: unknown[] = []
    const mockInfo = vi.fn((...args: unknown[]) => { loggedInfoArgs.push(...args) })

    mockSupabaseAsUser.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: CLIENT_ID, role_local: 'cliente' },
        error: null,
      }),
    })
    mockCancelarJobsDoCliente.mockResolvedValueOnce(undefined)
    mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValueOnce({ error: null })

    // Temporarily override tenantLogger.info for this request
    app.addHook('preHandler', async (req) => {
      req.tenantLogger = { ...req.log, info: mockInfo } as typeof req.log
    })

    await app.inject({
      method: 'DELETE',
      url: `/api/v1/clientes/${CLIENT_ID}`,
      headers: { authorization: AUTH_TOKEN },
    })

    // Verify info was called
    expect(mockInfo).toHaveBeenCalled()

    // Verify that 'nome' is NOT a key in the first argument object
    const firstCallArg = loggedInfoArgs[0]
    expect(firstCallArg).toBeDefined()
    if (typeof firstCallArg === 'object' && firstCallArg !== null) {
      expect(Object.keys(firstCallArg)).not.toContain('nome')
      expect(Object.keys(firstCallArg)).toContain('clienteId')
    }
  })
})
