import { cleanEnv, str, url } from 'envalid'

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  SUPABASE_URL: url(),
  SUPABASE_SERVICE_ROLE_KEY: str(),
  REDIS_URL: url(),
  SENTRY_DSN: str({ default: '' }),
})
