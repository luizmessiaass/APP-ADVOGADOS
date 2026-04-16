---
phase: 08-lgpd-hardening-production-readiness
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - .github/workflows/ci.yml
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/auth/SplashViewModel.kt
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/lgpd/LgpdConsentViewModel.kt
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/onboarding/OnboardingScreen.kt
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/onboarding/OnboardingViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheViewModel.kt
  - apps/api/src/config.ts
  - apps/api/src/routes/tenant/index.ts
  - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/ClienteRepository.kt
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-04-16
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The phase covers LGPD hardening and production readiness: the consent flow (client-side), the LGPD/terms version gate, the lawyer-facing client detail screen with destructive delete, and the API configuration/CI pipeline. The architecture is sound — the terms-version re-gate pattern, the DataStore-based consent persistence, and the production-gates CI job are all correctly conceived.

Two critical issues were found: a security bypass where `BILLING_WEBHOOK_SECRET` has an empty-string default that silently disables webhook authentication in any environment where the secret is not injected; and a URL-injection risk in `openStripePortal` because the URL from the API backend is passed directly to `Uri.parse` without scheme validation, allowing a malicious or misconfigured backend response to open a non-HTTPS URL in the browser.

Four warnings cover the `portalUrl` state that is never reset after use (causing the CCT to re-open on recomposition), a race condition between `markOnboardingComplete()` and navigation, an incomplete `timingSafeEqual` comparison that leaks timing information when buffer lengths differ, and the absence of `TERMS_VERSION_KEY` clearance in `rejectConsent()`.

---

## Critical Issues

### CR-01: `BILLING_WEBHOOK_SECRET` defaults to empty string — webhook auth silently disabled

**File:** `apps/api/src/config.ts:13`

**Issue:** `BILLING_WEBHOOK_SECRET: str({ default: '' })` means that if the environment variable is absent (e.g., a staging deployment, a developer's local machine, or a misconfigured Railway service), the secret resolves to an empty string `''`. The webhook handler at `apps/api/src/routes/webhooks/billing.ts:41` rejects requests when `!expectedSecret` is truthy — an empty string is falsy, so the guard fires — **but** this means any deployment that forgets to set `BILLING_WEBHOOK_SECRET` will return 401 to all webhook calls silently, rather than crashing loudly at startup. The real risk is the inverse: a developer may set an empty or whitespace secret in `.env` for local testing, observe no startup errors, and accidentally ship that configuration. The `envalid` `cleanEnv` contract purpose is to fail fast at boot; giving security-critical secrets a permissive default breaks that contract.

**Fix:** Remove the default so `envalid` throws `EnvVarError` at process startup if the secret is absent — the same treatment as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:

```typescript
// config.ts
BILLING_WEBHOOK_SECRET: str(),   // no default — must be provided; envalid crashes at boot if absent
```

Additionally, the `LAUNCH-CHECKLIST.md` line 28 already lists `WEBHOOK_SECRET` as a required API service secret. Removing the default enforces that requirement at the code level.

---

### CR-02: `openStripePortal` passes API-supplied URL to browser without scheme validation

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/StripePortalLauncher.kt:17`

**Issue:** `Uri.parse(url)` accepts any scheme. If the backend is compromised or returns a malformed response, a `javascript:`, `intent:`, or `file://` URI will be passed directly to `CustomTabsIntent.launchUrl`. While Custom Tabs limits some attack surface, `intent://` URIs can still trigger exported Activities on the device. The URL is fetched from a network endpoint (`clienteRepository.getPortalSessionUrl()`), so the trust boundary is the TLS channel and backend integrity — not guaranteed in all threat models.

**Fix:** Validate that the URL scheme is `https` before launching:

```kotlin
fun openStripePortal(context: Context, url: String) {
    val uri = Uri.parse(url)
    require(uri.scheme == "https") {
        "Stripe portal URL must use HTTPS scheme, got: ${uri.scheme}"
    }
    val customTabsIntent = CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()
    customTabsIntent.launchUrl(context, uri)
}
```

The `require` will throw `IllegalArgumentException` if the scheme is wrong, which will propagate as an uncaught exception in the `LaunchedEffect`. For production, wrap the call at the call site in the `LaunchedEffect` with a try/catch that logs the error and shows a snackbar instead of crashing.

---

## Warnings

### WR-01: `portalUrl` is never reset — CCT re-opens on every recomposition after first load

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt:61-65` / `ClienteDetalheViewModel.kt:40`

**Issue:** `_portalUrl` starts as `null` and is set to the URL when `loadPortalUrl()` succeeds. The `LaunchedEffect(portalUrl)` in the Screen will re-trigger whenever `portalUrl` changes. However, once the URL is set to a non-null value, it stays set — so if the composable is removed from the backstack and re-entered (e.g., user presses back from CCT and Compose recreates the screen from the backstack with the same ViewModel instance), `portalUrl` still holds the previous URL and the `LaunchedEffect` fires again immediately, re-opening the portal without user action.

**Fix:** Reset `_portalUrl` to `null` after consumption. The cleanest pattern is to use a one-shot event:

```kotlin
// ViewModel: add reset function
fun consumePortalUrl(): String? {
    val url = _portalUrl.value
    _portalUrl.value = null
    return url
}
```

Or in the Screen, consume and clear:

```kotlin
LaunchedEffect(portalUrl) {
    portalUrl?.let { url ->
        viewModel.clearPortalUrl()   // reset to null before opening
        openStripePortal(context, url)
    }
}
```

---

### WR-02: `markOnboardingComplete()` is fire-and-forget — race condition before navigation

**File:** `app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/onboarding/OnboardingScreen.kt:101-104`

**Issue:** `viewModel.markOnboardingComplete()` launches a coroutine internally (`viewModelScope.launch { ... }`) and returns immediately. Navigation to `Routes.LGPD_CONSENT` happens synchronously on the next line. If the app is killed or the process is backgrounded between navigation and the DataStore `edit` completing, `ONBOARDING_SEEN_KEY` will not have been persisted. On next cold launch, `SplashViewModel` will route the user to onboarding again even though they completed it, creating a loop where every app kill during or just after onboarding resets the gate.

**Fix:** Expose a `suspend` function or a `StateFlow<Boolean>` that the Screen awaits before navigating:

```kotlin
// OnboardingViewModel
suspend fun markOnboardingCompleteAndAwait() {
    context.clienteDataStore.edit { prefs ->
        prefs[ONBOARDING_SEEN_KEY] = true
    }
}
```

In the Screen, call from `rememberCoroutineScope`:

```kotlin
onClick = {
    if (pagerState.currentPage < onboardingPages.size - 1) {
        scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
    } else {
        scope.launch {
            viewModel.markOnboardingCompleteAndAwait()   // await persistence
            navController.navigate(Routes.LGPD_CONSENT) {
                popUpTo(Routes.ONBOARDING) { inclusive = true }
            }
        }
    }
}
```

---

### WR-03: Timing side-channel leak in webhook secret comparison when lengths differ

**File:** `apps/api/src/routes/webhooks/billing.ts:53-55`

**Issue:** The code correctly uses `timingSafeEqual` but only when `incomingBuf.length === expectedBuf.length`. When lengths differ, it skips the comparison entirely and sets `secretsMatch = false` immediately. An attacker making requests with secrets of varying lengths can use this as a timing oracle to determine the correct length of `BILLING_WEBHOOK_SECRET` — a precursor to brute-force narrowing. This partially undermines the constant-time comparison guarantee.

**Fix:** Always run `timingSafeEqual` on equal-length buffers by hashing both sides (HMAC or SHA-256) before comparison, making length information irrelevant:

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

function secretsAreEqual(incoming: string, expected: string): boolean {
  // Hash both with a fixed key so length information is not leaked
  const key = Buffer.from('webhook-comparison-key')
  const a = createHmac('sha256', key).update(incoming).digest()
  const b = createHmac('sha256', key).update(expected).digest()
  return timingSafeEqual(a, b)
}
```

Then replace the try/catch block with a single `secretsMatch = secretsAreEqual(String(incomingSecret), expectedSecret)` call.

---

### WR-04: `rejectConsent()` clears tokens but does not clear `TERMS_VERSION_KEY` — stale version persists

**File:** `app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/lgpd/LgpdConsentViewModel.kt:59-67`

**Issue:** When the user rejects consent, `TOKEN_KEY` and `REFRESH_TOKEN_KEY` are removed and `LGPD_ACCEPTED_KEY` is set to `false`. However, `TERMS_VERSION_KEY` is not cleared. On next login, if the user authenticates and `SplashViewModel` evaluates the gate at line 61, it reads `termsVersionAccepted` from `TERMS_VERSION_KEY` — which still holds the previously-stored version string from a prior acceptance. The `checkTermsVersion` function returns `false` (no re-consent needed) when stored version equals current version. This means a user who previously accepted, then rejected consent in the same session, then logs in again could be routed to `Routes.PROCESSO_LIST` without going through consent again.

**Fix:** Clear `TERMS_VERSION_KEY` alongside the other keys in `rejectConsent`:

```kotlin
fun rejectConsent() {
    viewModelScope.launch {
        context.clienteDataStore.edit { prefs ->
            prefs.remove(TOKEN_KEY)
            prefs.remove(REFRESH_TOKEN_KEY)
            prefs.remove(TERMS_VERSION_KEY)   // add this
            prefs[LGPD_ACCEPTED_KEY] = false
        }
        _uiState.value = UiState.Idle
    }
}
```

---

## Info

### IN-01: `SENTRY_DSN` and `BETTERSTACK_SOURCE_TOKEN` also have empty defaults — boot-time visibility gap

**File:** `apps/api/src/config.ts:10-11`

**Issue:** Both observability secrets default to `''`. This is acceptable for local development, but it means a production deployment that accidentally omits them will start successfully without any error — the application will run silently without error tracking or log shipping. This is not a security vulnerability but reduces operational visibility at the worst possible moment (an incident in production).

**Fix:** Consider a stricter pattern for production: validate at runtime that these are non-empty when `NODE_ENV === 'production'`, or document explicitly that an empty DSN is acceptable and why (e.g., Sentry SDK gracefully no-ops when DSN is absent). A lightweight guard:

```typescript
if (env.NODE_ENV === 'production' && !env.SENTRY_DSN) {
  console.warn('[config] SENTRY_DSN is empty in production — error tracking is disabled')
}
```

---

### IN-02: `SplashViewModel` reads DataStore directly — Context injected into ViewModel is an anti-pattern

**File:** `app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/auth/SplashViewModel.kt:36`

**Issue:** `@ApplicationContext Context` is injected directly and used to access `context.clienteDataStore`. While `@ApplicationContext` is safe (no Activity leak), the preferred pattern in a Hilt + Compose project is to abstract DataStore access behind a repository or `DataSource` interface injected into the ViewModel. Direct context use in ViewModels makes unit testing harder (requires `AndroidJUnit4` or `Robolectric` instead of plain JUnit). This is consistent with how other ViewModels in this phase inject `ClienteApi` via a repository.

**Fix:** Create a `UserPreferencesDataSource` injectable that wraps DataStore and inject that instead of raw `Context`. This is a refactor and can be deferred, but aligns with the architectural pattern already used in `ClienteRepository`.

---

### IN-03: `apps/api/src/routes/tenant/index.ts` is a thin delegation file with no error handling

**File:** `apps/api/src/routes/tenant/index.ts:1-6`

**Issue:** The file only re-exports `tenantStatusRoutes`. If `tenantStatusRoutes` registration fails (e.g., plugin throws during setup), the error propagates unhandled up the Fastify plugin chain. This is minor since Fastify catches plugin registration errors during `app.listen`, but having no try/catch or logging here means the error message in production logs will point to the Fastify internals rather than this route file.

**Fix:** Add error handling or at minimum a comment noting that Fastify's plugin error propagation is the intended mechanism. No code change is strictly required; this is informational.

---

_Reviewed: 2026-04-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
