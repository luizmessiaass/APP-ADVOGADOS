import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config.js'

// Cliente admin: bypassa RLS. NUNCA usar em request handlers.
// Uso legitimo: background jobs, webhooks verificados, admin endpoints com check manual.
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Cliente com contexto de usuario: RLS enforced pelo banco.
// Criar NOVO por request — NAO compartilhar instancia entre requests.
// Usar em todos os route handlers para garantir isolamento de tenant por construcao.
export function supabaseAsUser(jwt: string): SupabaseClient {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
