// Configura variaveis de ambiente para testes antes de qualquer import
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key'
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'test-resend-key'
