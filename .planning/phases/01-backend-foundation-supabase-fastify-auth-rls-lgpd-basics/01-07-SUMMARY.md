# Plan 01-07 Summary — [BLOCKING] Schema Push + CI/CD GitHub Actions

**Status:** Complete (schema + CI file) | Pendente: Upstash Redis URL + GitHub Secrets (configurar pelo usuário após push)
**Commits:** `260a757` — feat(01-07): add GitHub Actions CI workflow (typecheck + test + lint)

---

## O que foi entregue

### Schema Push
- `supabase db push --linked` executado com sucesso
- Status: **"Remote database is up to date"** — todas as 5 migrations já estavam aplicadas no projeto `ydhntdhmtdxvzfdktjtf` (ADVOGADO APP)
- Tabelas disponíveis no Supabase Cloud: `escritorios`, `usuarios`, `lgpd_consentimentos`

### `.env` local criado
- `apps/api/.env` criado com as credenciais reais do projeto Supabase dev
- Arquivo está no `.gitignore` — não será commitado

### CI/CD — `.github/workflows/ci.yml`
- Pipeline com dois jobs: `test` (typecheck + vitest) e `lint`
- `pnpm install --frozen-lockfile` para reproducibilidade (D-37)
- TypeScript typecheck (`tsc --noEmit`) antes dos testes para ambos os módulos (api + worker)
- Secrets referenciados como env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `SENTRY_DSN`
- Timeout de 10 minutos para evitar CI travado
- Node.js 22 + pnpm cache configurado

---

## Pendente (configuração manual pelo usuário)

Após criar o repositório GitHub e fazer o primeiro push:

1. **Upstash Redis para CI** — criar banco gratuito em https://console.upstash.com e adicionar como secret `REDIS_URL`

2. **GitHub Secrets** — em Settings → Secrets → Actions:
   - `SUPABASE_URL` = `https://ydhntdhmtdxvzfdktjtf.supabase.co`
   - `SUPABASE_ANON_KEY` = (key do projeto)
   - `SUPABASE_SERVICE_ROLE_KEY` = (key do projeto)
   - `SUPABASE_ACCESS_TOKEN` = (token CLI)
   - `SUPABASE_PROJECT_REF` = `ydhntdhmtdxvzfdktjtf`
   - `REDIS_URL` = (URL do Upstash)

---

## Verificação

- [x] `supabase db push` — Remote database is up to date
- [x] `.github/workflows/ci.yml` existe com jobs `test` e `lint`
- [x] TypeScript typecheck configurado para api e worker
- [x] `--frozen-lockfile` para reproducibilidade
- [ ] GitHub Secrets configurados (pendente push + setup manual)
- [ ] Upstash Redis criado (pendente setup manual)
