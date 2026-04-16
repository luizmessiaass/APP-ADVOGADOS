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
  // T-7-08: segredo compartilhado para autenticar chamadas de webhook do provider de pagamento
  BILLING_WEBHOOK_SECRET: str({ default: '' }),
  // D-07 (Phase 8): versão atual dos termos de uso — ISO date string
  // Atualizar aqui + re-deploy força re-gate de consentimento em todos os clientes
  TERMS_VERSION: str({ default: '2026-04-16' }),
})
// cleanEnv lanca EnvVarError se variavel obrigatoria ausente — processo termina imediatamente
