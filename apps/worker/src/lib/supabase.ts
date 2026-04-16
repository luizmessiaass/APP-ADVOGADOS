import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config.js'

/**
 * Cliente admin Supabase para o worker — bypassa RLS.
 * Uso legitimo: background jobs e cron jobs com servico de sistema.
 * NAO importar do apps/api — processos Railway separados.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
