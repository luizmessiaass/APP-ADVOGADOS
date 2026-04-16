---
phase: 08-lgpd-hardening-production-readiness
plan: "02"
subsystem: backend-api
tags: [lgpd, consent-re-gate, tenant-status, tdd, vitest]
dependency_graph:
  requires: []
  provides:
    - "GET /api/v1/tenant/status with termos_versao_atual field"
    - "TERMS_VERSION env var in config.ts cleanEnv"
  affects:
    - "apps/api/src/server.ts (tenantRoutes registration)"
    - "Android Plan 04 — consent re-gate client-side integration"
tech_stack:
  added: []
  patterns:
    - "Fastify plugin function (async function tenantRoutes(app))"
    - "env.TERMS_VERSION injected into HTTP response (ISO date string)"
    - "supabaseAsUser for RLS-scoped escritorio lookup"
key_files:
  created:
    - apps/api/src/routes/tenant/index.ts
    - apps/api/src/routes/tenant/tenant.test.ts
  modified:
    - apps/api/src/config.ts
    - apps/api/src/server.ts
decisions:
  - "TERMS_VERSION default set to '2026-04-16' — matches the app_cliente local constant defined in D-06"
  - "tenantRoutes registered at /api/v1/tenant (not /api/tenant) — consistent with /api/v1/ prefix convention (Phase 1 D-19)"
  - "GET /status handler uses supabaseAsUser for the escritorio lookup — RLS guarantees tenant isolation at DB level"
metrics:
  duration_seconds: 207
  completed_date: "2026-04-16"
  tasks_completed: 2
  files_changed: 4
---

# Phase 08 Plan 02: Consent Re-gate — termos_versao_atual in GET /api/v1/tenant/status

**One-liner:** Backend adds `termos_versao_atual` (ISO date from `TERMS_VERSION` env var) to `GET /api/v1/tenant/status`, enabling app_cliente consent re-gate on policy version change.

## What Was Built

### GET /api/v1/tenant/status — Extended Response

The endpoint now returns three fields:

```json
{
  "tenant_status": "active",
  "grace_banner": false,
  "termos_versao_atual": "2026-04-16"
}
```

- `tenant_status` and `grace_banner` were added in Phase 7 (D-11)
- `termos_versao_atual` is new in this plan (Phase 8 D-07)

### TERMS_VERSION Config Env Var

Added to `apps/api/src/config.ts` cleanEnv schema:

```typescript
TERMS_VERSION: str({ default: '2026-04-16' }),
```

Updating this value (via Railway env var) + re-deploying forces all app_cliente users to re-accept the consent screen on next app launch.

### Android Integration Contract (for Plan 04)

```kotlin
// In app_cliente: SplashViewModel or equivalent
const val TERMS_VERSION = "2026-04-16"  // ISO date — update + re-deploy to force re-gate

val TERMS_VERSION_KEY = stringPreferencesKey("accepted_terms_version")

// Logic on every app launch (after login/session restore):
val storedVersion: String? = dataStore.data.map { it[TERMS_VERSION_KEY] }.firstOrNull()
val serverVersion: String = api.getTenantStatus().termos_versao_atual

val needsReConsent = storedVersion == null || storedVersion != serverVersion
if (needsReConsent) {
  // Navigate to consent screen — on accept: save serverVersion to DataStore
  // On refuse: call logout (same flow as Phase 5 D-12)
}
```

## Tasks Completed

| Task | Description | Commit | Type |
|------|-------------|--------|------|
| 1 | RED — failing tests for termos_versao_atual | 66311ce | test |
| 2 | GREEN — implement tenant/status route + TERMS_VERSION config | c2c5645 | feat |

## Test Results

```
Test Files  1 passed (1)
     Tests  4 passed (4)
```

Tests cover:
1. `termos_versao_atual` present and non-empty string in 200 response
2. `termos_versao_atual` equals `env.TERMS_VERSION` ("2026-04-16")
3. `tenant_status` (string) and `grace_banner` (boolean) present
4. No Authorization header → 401

## Deviations from Plan

None — plan executed exactly as written.

The `GET /api/v1/tenant/status` endpoint did not exist from Phase 7 (Phase 7 was planned but route not yet executed in this worktree). Created the route from scratch following the plan's "if route does NOT exist" branch — exact code from plan template.

## Known Stubs

None. The `termos_versao_atual` field is fully wired: `env.TERMS_VERSION` → route response → client comparison. The Android client-side integration is documented above and will be implemented in Plan 04.

## Threat Flags

No new security-relevant surface beyond what the plan's threat model covers:

- T-8-05 (Tampering — consent re-gate bypass): Mitigated. Server version is authoritative — app must call `GET /api/v1/tenant/status` and compare with local DataStore. Attacker needs control of both deployed binary AND backend config.
- T-8-06 (Spoofing — unauthorized access): Mitigated. Endpoint is behind existing `authPlugin` — `req.user.tenant_id` is extracted from verified JWT.
- T-8-07 (Information Disclosure — termos_versao_atual leaks timing): Accepted. ISO date string contains no PII.

## Self-Check: PASSED

- `apps/api/src/routes/tenant/index.ts` — EXISTS
- `apps/api/src/routes/tenant/tenant.test.ts` — EXISTS
- `apps/api/src/config.ts` contains `TERMS_VERSION` — VERIFIED
- `apps/api/src/server.ts` contains `tenantRoutes` import and registration — VERIFIED
- Commit `66311ce` (RED) — EXISTS
- Commit `c2c5645` (GREEN) — EXISTS
- 4 tests passing — VERIFIED
