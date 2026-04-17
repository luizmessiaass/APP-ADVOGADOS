import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Usuario = {
  id: string
  email: string
  tenant_id: string
  role_local: string
}

type ProcessoRow = {
  id: string
  numero_cnj: string
  tribunal: string | null
  ultima_sincronizacao: string | null
  dados_brutos: unknown
  cliente_usuario_id?: string | null
}

type MovimentacaoRow = {
  id: string
  data_hora: string
  descricao_original: string
}

const DEMO_TENANT_ID = '0dece7cf-2e61-48db-8419-316ba17dbee0'
const DEMO_PROCESSO_ID = 'processo-flores-demo-001'
const TERMS_VERSION = Deno.env.get('TERMS_VERSION') ?? '2026-04-16'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const demoProcesso = {
  id: DEMO_PROCESSO_ID,
  numero_cnj: '1001234-56.2024.8.26.0100',
  tribunal: 'TJSP',
  ultima_sincronizacao: '2026-04-16T18:30:00.000Z',
  desatualizado: false,
  status: 'Aguardando analise do juiz',
  dados_brutos: {
    comarca: 'Sao Paulo',
    classe_processual: 'Procedimento Comum Civel',
    partes: {
      requerente: 'Cliente Flores Demo',
      requerido: 'Empresa Exemplo Ltda.',
    },
  },
  telefone_whatsapp: '5511999999999',
}

const demoMovimentacoes = [
  {
    id: 'mov-flores-demo-001',
    data_hora: '2026-04-10T14:20:00.000Z',
    descricao_original: 'Conclusos para decisao',
    status: 'Aguardando decisao',
    explicacao:
      'O processo foi encaminhado ao juiz para analise. Nesta etapa, a proxima atualizacao depende da decisao judicial.',
    proxima_data: 'Nao ha prazo informado pelo tribunal neste momento.',
    impacto: 'Seu advogado sera avisado assim que houver nova movimentacao.',
  },
  {
    id: 'mov-flores-demo-002',
    data_hora: '2026-03-22T09:15:00.000Z',
    descricao_original: 'Juntada de peticao de manifestacao',
    status: 'Manifestacao enviada',
    explicacao:
      'A Flores Advocacia protocolou uma manifestacao no processo para responder ao andamento anterior.',
    proxima_data: 'Acompanhar a analise do cartorio e do juiz.',
    impacto: 'Nenhuma acao sua e necessaria agora.',
  },
]

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const route = getRoute(req)

    if (req.method === 'GET' && route === '/') {
      return json({ service: 'portal-api-edge', ok: true })
    }

    if (req.method === 'POST' && route === '/api/v1/auth/login') {
      return await login(req)
    }

    if (req.method === 'POST' && route === '/api/v1/auth/logout') {
      return json({ success: true, message: 'Logout realizado com sucesso' })
    }

    const ctx = await getAuthContext(req)
    if (ctx instanceof Response) return ctx

    if (req.method === 'GET' && route === '/api/v1/tenant/status') {
      return await tenantStatus(ctx.usuario.tenant_id)
    }

    if (req.method === 'POST' && route === '/api/v1/lgpd/consentimento') {
      return await registrarConsentimento(req, ctx.usuario.id)
    }

    if (req.method === 'GET' && route === '/api/v1/processos') {
      return await listarProcessos(ctx.usuario)
    }

    const detailMatch = route.match(/^\/api\/v1\/processos\/([^/]+)$/)
    if (req.method === 'GET' && detailMatch) {
      return await detalheProcesso(ctx.usuario, detailMatch[1])
    }

    const movimentacoesMatch = route.match(/^\/api\/v1\/processos\/([^/]+)\/movimentacoes$/)
    if (req.method === 'GET' && movimentacoesMatch) {
      return await listarMovimentacoes(ctx.usuario, movimentacoesMatch[1])
    }

    return json({ success: false, error: 'Rota nao encontrada', code: 'NOT_FOUND' }, 404)
  } catch (error) {
    console.error('[portal-api]', error)
    return json({ success: false, error: 'Erro interno', code: 'INTERNAL_ERROR' }, 500)
  }
})

function getRoute(req: Request): string {
  const pathname = new URL(req.url).pathname
  const marker = '/portal-api'
  const index = pathname.indexOf(marker)
  const route = index >= 0 ? pathname.slice(index + marker.length) : pathname
  return route.length > 0 ? route : '/'
}

async function login(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as {
    email?: string
    senha?: string
    password?: string
  }
  const identifier = (body.email ?? '').trim()
  const password = body.senha ?? body.password ?? ''

  if (!identifier || !password) {
    return json({ success: false, error: 'Email ou senha incorretos', code: 'INVALID_CREDENTIALS' }, 400)
  }

  let email = identifier

  if (!identifier.includes('@')) {
    const cpf = identifier.replace(/\D/g, '')
    const { data: usuario, error } = await admin
      .from('usuarios')
      .select('email')
      .eq('cpf', cpf)
      .maybeSingle()

    if (error || !usuario?.email) {
      return json({ success: false, error: 'Email ou senha incorretos', code: 'INVALID_CREDENTIALS' }, 400)
    }

    email = usuario.email
  }

  const { data, error } = await authClient.auth.signInWithPassword({ email, password })

  if (error || !data.session || !data.user) {
    return json({ success: false, error: 'Email ou senha incorretos', code: 'INVALID_CREDENTIALS' }, 400)
  }

  const { data: usuario } = await admin
    .from('usuarios')
    .select('id, email, tenant_id, role_local')
    .eq('id', data.user.id)
    .single<Usuario>()

  return json({
    token: data.session.access_token,
    role: usuario?.role_local ?? data.user.app_metadata?.role ?? 'cliente',
  })
}

async function getAuthContext(req: Request): Promise<{ token: string; usuario: Usuario } | Response> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token) {
    return json({ success: false, error: 'Token ausente', code: 'UNAUTHORIZED' }, 401)
  }

  const { data: userData, error: authError } = await admin.auth.getUser(token)
  if (authError || !userData.user) {
    return json({ success: false, error: 'Token invalido', code: 'UNAUTHORIZED' }, 401)
  }

  const { data: usuario, error } = await admin
    .from('usuarios')
    .select('id, email, tenant_id, role_local')
    .eq('id', userData.user.id)
    .single<Usuario>()

  if (error || !usuario?.tenant_id) {
    return json({ success: false, error: 'Usuario sem tenant', code: 'NO_TENANT_CONTEXT' }, 403)
  }

  return { token, usuario }
}

async function tenantStatus(tenantId: string): Promise<Response> {
  const { data, error } = await admin
    .from('escritorios')
    .select('status, grace_banner, grace_period_started_at')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    return json({ success: false, error: 'Tenant nao encontrado', code: 'TENANT_NOT_FOUND' }, 500)
  }

  let daysUntilSuspension: number | null = null
  if (data.grace_period_started_at) {
    const started = new Date(data.grace_period_started_at).getTime()
    const daysSinceStart = Math.floor((Date.now() - started) / 86_400_000)
    daysUntilSuspension = Math.max(0, 14 - daysSinceStart)
  }

  return json({
    status: data.status,
    grace_banner: data.grace_banner ?? false,
    grace_period_started_at: data.grace_period_started_at ?? null,
    days_until_suspension: daysUntilSuspension,
    termos_versao_atual: TERMS_VERSION,
  })
}

async function registrarConsentimento(req: Request, usuarioId: string): Promise<Response> {
  const body = await req.json().catch(() => ({})) as { versao_termos?: string }
  const versaoTermos = body.versao_termos ?? TERMS_VERSION
  const ipOrigem = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
  const userAgent = req.headers.get('user-agent')

  const { data, error } = await admin
    .from('lgpd_consentimentos')
    .insert({
      usuario_id: usuarioId,
      versao_termos: versaoTermos,
      ip_origem: ipOrigem,
      user_agent: userAgent,
    })
    .select('id')
    .single()

  if (error || !data) {
    return json({ success: false, error: 'Erro ao registrar consentimento', code: 'CONSENT_ERROR' }, 500)
  }

  return json({ success: true, consentimento_id: data.id }, 201)
}

async function listarProcessos(usuario: Usuario): Promise<Response> {
  const { data, error } = await getProcessosRows(usuario)

  if (error) {
    return json({ success: false, error: 'Erro ao buscar processos', code: 'PROCESSOS_ERROR' }, 500)
  }

  const rows = data ?? []
  if (usuario.tenant_id === DEMO_TENANT_ID && rows.length === 0) {
    return json({ success: true, data: [toDemoSummary()] })
  }

  return json({ success: true, data: rows.map(toSummary) })
}

async function detalheProcesso(usuario: Usuario, processoId: string): Promise<Response> {
  if (usuario.tenant_id === DEMO_TENANT_ID && processoId === DEMO_PROCESSO_ID) {
    const { data } = await getProcessoRow(usuario, processoId)
    if (!data) return json({ data: demoProcesso })
  }

  const { data, error } = await getProcessoRow(usuario, processoId)
  if (error || !data) {
    return json({ success: false, error: 'Nao encontrado', code: 'NOT_FOUND' }, 404)
  }

  return json({ data: toDetail(data) })
}

async function listarMovimentacoes(usuario: Usuario, processoId: string): Promise<Response> {
  if (usuario.tenant_id === DEMO_TENANT_ID && processoId === DEMO_PROCESSO_ID) {
    const { data } = await getMovimentacoesRows(usuario, processoId)
    if (!data || data.length === 0) return json({ success: true, data: demoMovimentacoes })
  }

  const { data, error } = await getMovimentacoesRows(usuario, processoId)
  if (error) {
    return json({ success: false, error: 'Erro ao buscar movimentacoes', code: 'MOVIMENTACOES_ERROR' }, 500)
  }

  return json({
    success: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      data_hora: row.data_hora,
      descricao_original: row.descricao_original,
      status: null,
      explicacao: null,
      proxima_data: null,
      impacto: null,
    })),
  })
}

async function getProcessosRows(usuario: Usuario) {
  if (usuario.role_local === 'cliente') {
    const scoped = await admin
      .from('processos')
      .select('id, numero_cnj, tribunal, ultima_sincronizacao, dados_brutos, cliente_usuario_id')
      .eq('tenant_id', usuario.tenant_id)
      .eq('cliente_usuario_id', usuario.id)
      .order('ultima_sincronizacao', { ascending: false, nullsFirst: false })

    if (!isMissingColumnError(scoped.error, 'cliente_usuario_id')) return scoped
  }

  return await admin
    .from('processos')
    .select('id, numero_cnj, tribunal, ultima_sincronizacao, dados_brutos')
    .eq('tenant_id', usuario.tenant_id)
    .order('ultima_sincronizacao', { ascending: false, nullsFirst: false })
}

async function getProcessoRow(usuario: Usuario, processoId: string) {
  if (usuario.role_local === 'cliente') {
    const scoped = await admin
      .from('processos')
      .select('id, numero_cnj, tribunal, ultima_sincronizacao, dados_brutos, cliente_usuario_id')
      .eq('tenant_id', usuario.tenant_id)
      .eq('id', processoId)
      .eq('cliente_usuario_id', usuario.id)
      .maybeSingle<ProcessoRow>()

    if (!isMissingColumnError(scoped.error, 'cliente_usuario_id')) return scoped
  }

  return await admin
    .from('processos')
    .select('id, numero_cnj, tribunal, ultima_sincronizacao, dados_brutos')
    .eq('tenant_id', usuario.tenant_id)
    .eq('id', processoId)
    .maybeSingle<ProcessoRow>()
}

async function getMovimentacoesRows(usuario: Usuario, processoId: string) {
  const processo = await getProcessoRow(usuario, processoId)
  if (processo.error || !processo.data) return { data: [], error: null }

  return await admin
    .from('movimentacoes')
    .select('id, data_hora, descricao_original')
    .eq('tenant_id', usuario.tenant_id)
    .eq('processo_id', processoId)
    .order('data_hora', { ascending: false })
}

function toDemoSummary() {
  return {
    id: demoProcesso.id,
    numero_cnj: demoProcesso.numero_cnj,
    tribunal: demoProcesso.tribunal,
    ultima_sincronizacao: demoProcesso.ultima_sincronizacao,
    desatualizado: demoProcesso.desatualizado,
    status: demoProcesso.status,
  }
}

function toSummary(row: ProcessoRow) {
  return {
    id: row.id,
    numero_cnj: row.numero_cnj,
    tribunal: row.tribunal,
    ultima_sincronizacao: row.ultima_sincronizacao,
    desatualizado: isStale(row.ultima_sincronizacao),
    status: pickStatus(row.dados_brutos),
  }
}

function toDetail(row: ProcessoRow) {
  return {
    ...toSummary(row),
    dados_brutos: normalizeDadosBrutos(row.dados_brutos),
    telefone_whatsapp: null,
  }
}

function normalizeDadosBrutos(rawValue: unknown) {
  const raw = asRecord(rawValue)
  const dadosBasicos = asRecord(raw.dadosBasicos)
  const classe = asRecord(raw.classe)
  const orgaoJulgador = asRecord(raw.orgaoJulgador ?? dadosBasicos.orgaoJulgador)
  const partes = normalizePartes(raw.partes)

  return {
    comarca: stringOrNull(raw.comarca ?? raw.comarca_nome ?? orgaoJulgador.nomeOrgao ?? orgaoJulgador.nome),
    classe_processual: stringOrNull(
      raw.classe_processual ??
        raw.classeProcessual ??
        classe.nome ??
        asRecord(dadosBasicos.classeProcessual).nome ??
        dadosBasicos.classeProcessual
    ),
    partes,
  }
}

function normalizePartes(value: unknown) {
  if (Array.isArray(value)) {
    return {
      requerente: stringOrNull(asRecord(value[0]).nome ?? asRecord(value[0]).nomeParte),
      requerido: stringOrNull(asRecord(value[1]).nome ?? asRecord(value[1]).nomeParte),
    }
  }

  const partes = asRecord(value)
  return {
    requerente: stringOrNull(partes.requerente ?? partes.autor ?? partes.poloAtivo),
    requerido: stringOrNull(partes.requerido ?? partes.reu ?? partes.poloPassivo),
  }
}

function pickStatus(rawValue: unknown): string | null {
  const raw = asRecord(rawValue)
  return stringOrNull(raw.status ?? raw.status_processo ?? raw.statusProcesso ?? raw.situacao)
}

function isStale(ultimaSincronizacao: string | null): boolean {
  if (!ultimaSincronizacao) return true
  return Date.now() - new Date(ultimaSincronizacao).getTime() > 72 * 60 * 60 * 1000
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: unknown }).message ?? '')
  return message.includes(columnName) || message.includes('schema cache')
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
