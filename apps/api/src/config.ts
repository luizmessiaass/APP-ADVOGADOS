import { cleanEnv, str, url, num } from 'envalid'

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: num({ default: 3000 }),
  SUPABASE_URL: url(),
  SUPABASE_ANON_KEY: str(),
  SUPABASE_SERVICE_ROLE_KEY: str(),
  REDIS_URL: url(),
  SENTRY_DSN: str({ default: '' }),
  BETTERSTACK_SOURCE_TOKEN: str({ default: '' }),
  PRIVACY_POLICY_URL: str({ default: 'https://notion.so/portaljuridico-privacidade' }),
  BILLING_WEBHOOK_SECRET: str(),
  // D-06 Phase 8: versão atual dos termos (ISO date) — bumpar para forçar re-gate de consentimento
  TERMS_VERSION: str({ default: '2026-04-16' }),
})
// cleanEnv lanca EnvVarError se variavel obrigatoria ausente — processo termina imediatamente
