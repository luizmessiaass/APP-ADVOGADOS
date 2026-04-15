---
phase: 1
slug: backend-foundation-supabase-fastify-auth-rls-lgpd-basics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `apps/api/vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `cd apps/api && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd apps/api && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd apps/api && npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | INFRA-01 | — | N/A | unit | `npx vitest run src/config` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-02 | — | N/A | unit | `npx vitest run src/app` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | INFRA-03 | — | N/A | integration | `npx vitest run src/health` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | AUTH-01,AUTH-02 | T-1-01 | Custom hook JWT deve conter tenant_id e role | integration | `npx vitest run src/auth` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 2 | AUTH-06 | T-1-02 | Tenant A não pode ler dados do tenant B | integration | `npx vitest run apps/api/src/tests/cross-tenant` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 2 | LGPD-01,LGPD-03 | T-1-03 | CPF não aparece em logs | integration | `npx vitest run apps/api/src/tests/lgpd` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/vitest.config.ts` — configuração base com globals e test environment
- [ ] `apps/api/src/tests/fixtures.ts` — fixtures compartilhadas (tenants ficticios, tokens de teste)
- [ ] `apps/api/src/tests/cross-tenant.test.ts` — stub para gate cross-tenant (AUTH-06)
- [ ] `apps/api/src/tests/lgpd.test.ts` — stub para validação de PII stripping (LGPD-01, LGPD-03)
- [ ] Instalar: `vitest`, `@vitest/coverage-v8`, `supertest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase Edge Function Custom Hook registrado e ativo no dashboard | AUTH-01 | Requer acesso ao Supabase Dashboard | Login → Authentication → Hooks → verificar Custom Access Token Hook ativo |
| Região São Paulo configurada no Supabase Cloud | INFRA-01 | Requer acesso ao console cloud | Supabase Dashboard → Settings → Infrastructure → verificar região sa-east-1 |
| BullMQ worker inicia como processo separado | INFRA-09 | Requer inspeção de processo | `pm2 list` ou `ps aux | grep worker` — verificar PID distinto do processo API |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
