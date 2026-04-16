import type { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { supabaseAdmin, supabaseAsUser } from '../../lib/supabase.js'
import { env } from '../../config.js'

const SignupEscritorioBody = Type.Object({
  nome:  Type.String({ minLength: 2, maxLength: 200 }),
  email: Type.String({ format: 'email' }),
  senha: Type.String({ minLength: 8, maxLength: 128 }),
})

const LoginBody = Type.Object({
  email: Type.String({ format: 'email' }),
  senha: Type.Optional(Type.String({ minLength: 1 })),
  password: Type.Optional(Type.String({ minLength: 1 })),
})

const InviteBody = Type.Object({
  email:      Type.String({ format: 'email' }),
  nome:       Type.String({ minLength: 2 }),
  role_local: Type.Union([Type.Literal('advogado'), Type.Literal('cliente')]),
  cpf:        Type.Optional(Type.String()),
})

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/signup/escritorio
  // Cria escritorio (tenant) + usuario admin. Status inicial: pending (D-07).
  app.post('/signup/escritorio', {
    config: { skipAuth: true },
    schema: { body: SignupEscritorioBody },
  }, async (req, reply) => {
    const { nome, email, senha } = req.body as {
      nome: string
      email: string
      senha: string
    }

    // 1. Criar usuario no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,   // confirmar email automaticamente (simplifica dev)
      user_metadata: {},
      app_metadata: {},
    })

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('User already')) {
        return reply.code(400).send({
          success: false,
          error: 'Email ja cadastrado',
          code: 'USER_ALREADY_EXISTS',
        })
      }
      req.log.error({ error: authError.message }, 'Erro ao criar usuario')
      return reply.code(500).send({ success: false, error: 'Erro interno', code: 'SIGNUP_ERROR' })
    }

    // 2. Criar escritorio com status pending (aprovacao manual pelo admin do produto, D-07)
    const { data: escritorio, error: escrError } = await supabaseAdmin
      .from('escritorios')
      .insert({ nome, email, status: 'pending' })
      .select('id')
      .single()

    if (escrError || !escritorio) {
      req.log.error({ error: escrError?.message }, 'Erro ao criar escritorio')
      // Rollback: deletar usuario criado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return reply.code(500).send({ success: false, error: 'Erro interno', code: 'ESCRITORIO_ERROR' })
    }

    // 3. Atualizar public.usuarios com tenant_id e role_local
    // (trigger cria o registro em public.usuarios, aqui fazemos update para adicionar tenant_id e role)
    await supabaseAdmin
      .from('usuarios')
      .update({ tenant_id: escritorio.id, role_local: 'admin_escritorio' })
      .eq('id', authData.user.id)

    return reply.code(201).send({
      success: true,
      message: 'Escritorio criado. Aguardando aprovacao do administrador do Portal Juridico.',
      escritorio_id: escritorio.id,
      privacy_policy_url: env.PRIVACY_POLICY_URL,  // LGPD-06
    })
  })

  // POST /api/v1/auth/login
  app.post('/login', {
    config: { skipAuth: true },
    schema: { body: LoginBody },
  }, async (req, reply) => {
    const body = req.body as { email: string; senha?: string; password?: string }
    const senha = body.senha ?? body.password ?? ''

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password: senha })

    if (error || !data.session) {
      // T-1-05-I: resposta uniforme — nao distingue "usuario nao existe" de "senha errada"
      // Previne user enumeration (STRIDE Info Disclosure)
      return reply.code(400).send({
        success: false,
        error: 'Email ou senha incorretos',
        code: 'INVALID_CREDENTIALS',
      })
    }

    // Buscar role diretamente de public.usuarios (nao depende do hook JWT custom-access-token)
    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('role_local, tenant_id')
      .eq('id', data.user.id)
      .single()

    return reply.send({
      token: data.session.access_token,
      role: usuario?.role_local ?? data.user.app_metadata?.role ?? null,
    })
  })

  // POST /api/v1/auth/logout (autenticado)
  app.post('/logout', async (req, reply) => {
    const token = req.headers.authorization?.slice(7) ?? ''
    const client = supabaseAsUser(token)
    await client.auth.signOut()  // revoga refresh token

    return reply.send({ success: true, message: 'Logout realizado com sucesso' })
  })

  // POST /api/v1/auth/invite (apenas admin_escritorio)
  // T-1-05-E: Verificacao explica de role antes de chamar inviteUserByEmail
  app.post('/invite', {
    schema: { body: InviteBody },
  }, async (req, reply) => {
    // Somente admin_escritorio pode convidar usuarios
    if (req.user.role !== 'admin_escritorio') {
      return reply.code(403).send({
        success: false,
        error: 'Apenas administradores podem convidar usuarios',
        code: 'FORBIDDEN_ROLE',
      })
    }

    const { email, nome, role_local, cpf } = req.body as {
      email: string
      nome: string
      role_local: 'advogado' | 'cliente'
      cpf?: string
    }

    // CRITICO (Pitfall 6, RESEARCH.md): passar tenant_id e role_local nos metadados
    // O trigger sync_auth_user_to_public() le esses dados ao criar o registro em public.usuarios
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: req.user.tenant_id,
        role_local,
        nome,
        cpf: cpf ?? null,  // CPF nunca vai para logs (pino redact) nem prompts (LGPD-03)
      },
    })

    if (error) {
      req.tenantLogger.error({ error: error.message }, 'Erro ao convidar usuario')
      return reply.code(500).send({ success: false, error: 'Erro ao enviar convite', code: 'INVITE_ERROR' })
    }

    return reply.code(201).send({
      success: true,
      message: `Convite enviado para ${email}. O usuario recebera um email para criar sua senha.`,
    })
  })
}
