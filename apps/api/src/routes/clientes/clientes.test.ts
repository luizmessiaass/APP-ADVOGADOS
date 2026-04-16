import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import Fastify, { type FastifyRequest } from 'fastify'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabaseAdmin = supabaseAdmin as unknown as {
  auth: { admin: { deleteUser: ReturnType<typeof vi.fn> } }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabaseAsUser = supabaseAsUser as unknown as ReturnType<typeof vi.fn>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCancelarJobsDoCliente = cancelarJobsDoCliente as unknown as ReturnType<typeof vi.fn>

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_ID = 'tenant-abc-123'
const AUTH_TOKEN = 'Bearer valid-test-token'

describe('DELETE /api/v1/clientes/:clienteId', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    app = Fastify({ logger: false })

    // Add user and tenantLogger decorators to satisfy Fastify type declarations
    app.decorateRequest('user', null)
    app.decorateRequest('tenantLogger', null)

    // Inject mock tenant user into all requests (simulates authPlugin)
    app.addHook('preHandler', async (req: FastifyRequest) => {
      req.user = { sub: 'admin-user-001', tenant_id: TENANT_ID, role: 'admin_escritorio' }
      req.tenantLogger = req.log.child({ tenant_id: TENANT_ID })
    })

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
  // Verified via static inspection of the route implementation:
  // req.tenantLogger?.info({ clienteId }, '...') — clienteId only, no nome.
  it('loga somente clienteId no sucesso — nome NAO aparece no log de info (T-8-02)', async () => {
    // The route source is inspected statically: the info() call is:
    //   req.tenantLogger?.info({ clienteId }, 'Cliente deletado — Art. 18 LGPD compliant')
    // We verify this by reading the route module source and confirming no 'nome' reference
    // appears in the info log call. We also verify behavior: request succeeds and 204 is returned.
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

    // Import the route source as text and verify the info() call does NOT include 'nome'
    // This is the authoritative check: the code itself is the source of truth for PII guard
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const routeSource = readFileSync(
      resolve(import.meta.dirname, './index.ts'),
      'utf-8'
    )

    // The info log call must contain clienteId and must NOT contain nome
    const infoCallMatch = routeSource.match(/tenantLogger\?\.info\(([^)]+)\)/)
    expect(infoCallMatch).not.toBeNull()
    const infoCallArgs = infoCallMatch![1]
    expect(infoCallArgs).toContain('clienteId')
    expect(infoCallArgs).not.toContain('nome')

    // Also verify request succeeds (204)
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clientes/${CLIENT_ID}`,
      headers: { authorization: AUTH_TOKEN },
    })
    expect(res.statusCode).toBe(204)
  })
})
