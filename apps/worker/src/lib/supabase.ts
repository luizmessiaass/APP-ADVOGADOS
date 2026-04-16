import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../config.js'

// Cliente admin: bypassa RLS. Uso legitimo em workers: background jobs e cron.
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
