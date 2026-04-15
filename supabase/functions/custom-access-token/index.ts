// supabase/functions/custom-access-token/index.ts
// Custom Access Token Hook — injeta tenant_id e role em app_metadata de cada JWT.
// Documentacao: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook
//
// CRITICO: Esta funcao deve estar registrada no Dashboard ANTES do primeiro signup.
// Ver Pitfall 1 no 01-RESEARCH.md.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface HookPayload {
  user_id: string
  claims: {
    sub: string
    email?: string
    app_metadata: Record<string, unknown>
    user_metadata: Record<string, unknown>
    [key: string]: unknown
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const payload = await req.json() as HookPayload
    const { user_id, claims } = payload

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Buscar tenant_id e role do usuario na tabela public.usuarios
    // NUNCA usar user_metadata — usuario pode alterar (D-10, RESEARCH.md anti-pattern)
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('tenant_id, role_local')
      .eq('id', user_id)
      .single()

    if (error || !usuario) {
      // Usuario nao encontrado em public.usuarios (possivel estado de signup incompleto)
      // Retornar token sem tenant_id — middleware Fastify rejeitara com 403
      console.error('[custom-access-token] usuario nao encontrado', { user_id, error: error?.message })
      return Response.json({
        claims: {
          ...claims,
          app_metadata: {
            ...claims.app_metadata,
            tenant_id: null,
            role: null,
          }
        }
      })
    }

    // Injetar em app_metadata (NUNCA em user_metadata)
    const enrichedClaims = {
      ...claims,
      app_metadata: {
        ...claims.app_metadata,
        tenant_id: usuario.tenant_id,
        role: usuario.role_local,
      }
    }

    return Response.json({ claims: enrichedClaims })

  } catch (err) {
    console.error('[custom-access-token] erro inesperado', err)
    // Em caso de erro, retornar payload original (Supabase decide como tratar)
    return Response.json({ error: 'hook_error' }, { status: 500 })
  }
})
