---
phase: 08-lgpd-hardening-production-readiness
plan: 05
status: complete
started: 2026-04-16
completed: 2026-04-16
key-files:
  created: []
  modified:
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/auth/SplashViewModel.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/lgpd/LgpdConsentViewModel.kt
---

# Plan 08-05 Summary: app_cliente Consent Re-gate

## What Was Built

**Task 1 — SplashViewModel consent re-gate:**
- Added `TERMS_VERSION_KEY = stringPreferencesKey("terms_version_accepted")` and `TERMS_VERSION = "2026-04-16"` constants
- Added `checkTermsVersion(storedVersion: String?): Boolean` — returns true if stored version is null or differs from TERMS_VERSION
- Modified `startDestination` DataStore flow: now reads `TERMS_VERSION_KEY` and routes to `Routes.LGPD_CONSENT` if `!lgpdAccepted || checkTermsVersion(termsVersionAccepted)`
- Network failure is not applicable (pure local DataStore comparison — T-8-16 not relevant for this local-constant approach)

**Task 2 — LgpdConsentViewModel accept saves version:**
- Imported `TERMS_VERSION` and `TERMS_VERSION_KEY` from SplashViewModel
- `acceptConsent()` now saves `prefs[TERMS_VERSION_KEY] = TERMS_VERSION` alongside `LGPD_ACCEPTED_KEY = true`
- Updated `versaoTermos` in `ConsentimentoRequest` from hardcoded `"2026-04-15"` to `TERMS_VERSION` constant
- Refusal path unchanged (clears TOKEN_KEY, REFRESH_TOKEN_KEY, LGPD_ACCEPTED_KEY = false)

## Deviation from Plan

**Simplified architecture:** The plan called for `TenantApi.getTenantStatus()` network fetch to compare `termos_versao_atual` from the server. However, `TenantApi` does not exist in the Android `core-network` module (it's a backend-only concept at this stage of development). The consent re-gate is implemented using a **local constant** `TERMS_VERSION = "2026-04-16"` which satisfies D-06 ("constante no código do app"). To force re-consent, bump `TERMS_VERSION` and redeploy the app. Server-side version comparison via `GET /api/v1/tenant/status` can be wired in a future phase once TenantApi is created.

## Commits

- `5e0f79f`: feat(08-05): consent re-gate — TERMS_VERSION constant + TERMS_VERSION_KEY DataStore check in SplashViewModel + save on acceptConsent

## Self-Check: PASSED

- `TERMS_VERSION_KEY` added to SplashViewModel ✓
- `TERMS_VERSION = "2026-04-16"` constant added ✓
- `checkTermsVersion()` function present in SplashViewModel ✓
- `startDestination` flow routes to LGPD_CONSENT when version mismatch ✓
- `LgpdConsentViewModel.acceptConsent()` saves TERMS_VERSION_KEY ✓
- `versaoTermos` uses TERMS_VERSION constant (not hardcoded string) ✓
- Refusal path unchanged from Phase 5 D-12 ✓
