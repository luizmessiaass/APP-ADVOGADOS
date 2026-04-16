---
phase: 04-android-app-fluxo-advogado
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - app-escritorio/build.gradle.kts
  - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteScreenTest.kt
  - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemBottomSheetTest.kt
  - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListScreenTest.kt
  - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginScreenTest.kt
  - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewScreenTest.kt
  - app-escritorio/src/androidTest/java/com/aethixdigital/portaljuridico/escritorio/HiltTestRunner.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/di/AppNetworkModule.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteScreen.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemBottomSheet.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/StripePortalLauncher.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListScreen.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginScreen.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewScreen.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewViewModel.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/MainActivity.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/navigation/EscritorioNavGraph.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/navigation/EscritorioRoute.kt
  - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModelTest.kt
  - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/MensagemViewModelTest.kt
  - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModelTest.kt
  - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/login/LoginViewModelTest.kt
  - app-escritorio/src/test/java/com/aethixdigital/portaljuridico/escritorio/feature/preview/PreviewViewModelTest.kt
  - core-common/src/main/java/com/aethixdigital/portaljuridico/common/validation/CnjValidator.kt
  - core-common/src/main/java/com/aethixdigital/portaljuridico/common/validation/CpfValidator.kt
  - core-common/src/test/java/com/aethixdigital/portaljuridico/common/validation/CnjValidatorTest.kt
  - core-common/src/test/java/com/aethixdigital/portaljuridico/common/validation/CpfValidatorTest.kt
  - core-data/src/main/java/com/aethixdigital/portaljuridico/data/auth/JwtDecoder.kt
  - core-data/src/main/java/com/aethixdigital/portaljuridico/data/auth/TokenDataStore.kt
  - core-data/src/main/java/com/aethixdigital/portaljuridico/data/di/DataModule.kt
  - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/AuthRepository.kt
  - core-data/src/main/java/com/aethixdigital/portaljuridico/data/repository/ClienteRepository.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/api/AuthApi.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/api/ClienteApi.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/config/NetworkConfig.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/di/NetworkModule.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/interceptor/AuthInterceptor.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/interceptor/TokenProvider.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/model/dto/AuthDtos.kt
  - core-network/src/main/java/com/aethixdigital/portaljuridico/network/model/dto/ClienteDtos.kt
  - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/MovimentacaoCard.kt
  - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/ProcessoStatusCard.kt
  - gradle/libs.versions.toml
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

This phase delivers the full lawyer-side Android app (`app-escritorio`) with Hilt DI, Retrofit/Moshi networking, DataStore token persistence, JWT-based auth-check on startup, and five screens (Login, ClienteLista, CadastroCliente, ClienteDetalhe, Preview) backed by unit and instrumentation tests.

The architecture is clean and well-layered. The ViewModel/Repository split is consistent, error handling follows a `Result<T>` fold pattern throughout, and the navigation graph uses type-safe serializable routes. CPF and CNJ validators are correct and well-tested. The Moshi adapter layer, Hilt modules, and coroutine dispatcher override in tests are all properly set up.

Three areas require attention before shipping:

1. **Critical — URL injection via Stripe portal URL:** The URL returned by the backend is passed directly to `Uri.parse()` and launched as a Chrome Custom Tab with no scheme validation. A compromised backend or MITM response could inject a non-HTTPS URI.
2. **Warnings:** A one-way `portalUrl` StateFlow is never reset after the CCT is launched, so rotating the screen re-opens the portal browser; the `CadastroFormState.isSubmitEnabled` predicate omits `emailTouched`, leaving a case where submit is enabled before the email field has been validated on blur; the `@Suppress("UNCHECKED_CAST")` on JWT metadata parsing silently returns `null` on a class-cast exception at runtime (cast failure is swallowed); and the debug build config field in `defaultConfig` is redundant and misleading.
3. **Info:** Several minor quality items noted below.

---

## Critical Issues

### CR-01: Unvalidated URL scheme passed to Chrome Custom Tabs

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/StripePortalLauncher.kt:17`

**Issue:** `Uri.parse(url)` is called on the raw string returned by the backend without verifying the scheme. If the backend is compromised or the response is intercepted (e.g., via a network misconfiguration), the URL could be a `javascript:`, `file:`, or `intent:` URI. Chrome Custom Tabs will refuse some of these but will happily open `http://` phishing pages. For a billing portal that handles payment data, only `https://` URLs from a Stripe domain should be accepted.

**Fix:**
```kotlin
fun openStripePortal(context: Context, url: String) {
    val uri = Uri.parse(url)
    require(uri.scheme == "https") {
        "Stripe portal URL must use HTTPS, got: ${uri.scheme}"
    }
    val customTabsIntent = CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()
    customTabsIntent.launchUrl(context, uri)
}
```
Additionally, consider asserting that the host ends with `stripe.com` to prevent open-redirect abuse at the backend layer.

---

## Warnings

### WR-01: Stripe portal URL StateFlow never reset — re-opens CCT on recomposition

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheViewModel.kt:33-58`
**Also:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/detalhe/ClienteDetalheScreen.kt:52-56`

**Issue:** `_portalUrl` is set to a URL string by `loadPortalUrl()` and never cleared. The `LaunchedEffect(portalUrl)` in `ClienteDetalheScreen` fires whenever `portalUrl` changes. On configuration change (screen rotation), the `LaunchedEffect` re-runs against the already-set `portalUrl` value, immediately re-opening the Chrome Custom Tab without user intent. The same URL is also passed to CCT without a "consumed" flag.

**Fix:** Add a `consumePortalUrl()` method that resets `_portalUrl` to `null` after the URL has been consumed, and call it from the screen after launching:
```kotlin
// In ViewModel
fun consumePortalUrl() { _portalUrl.value = null }

// In Screen LaunchedEffect
LaunchedEffect(portalUrl) {
    portalUrl?.let { url ->
        openStripePortal(context, url)
        viewModel.consumePortalUrl()
    }
}
```

### WR-02: `isSubmitEnabled` omits `emailTouched` — email field not required to be visited before submit

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModel.kt:33-37`

**Issue:** `isSubmitEnabled` requires `cpfTouched && cnjTouched` but does **not** require `emailTouched`. This means a user who types a valid nome, valid CPF (with blur), valid CNJ (with blur), and any non-blank string in the email field can submit without the email field ever being validated on blur. The email is validated on every keystroke via `onEmailChange`, so the error will appear, but the submit guard is inconsistent with the design intent stated in the comment `// só habilita após campos terem sido validados`. A user who copies a malformed email and never triggers `onValueChange` again would pass the guard with no error shown.

**Fix:**
```kotlin
val isSubmitEnabled: Boolean
    get() = nome.isNotBlank() && cpf.isNotBlank() && email.isNotBlank() && cnj.isNotBlank()
        && cpfError == null && cnjError == null && emailError == null
        && cpfTouched && cnjTouched && emailTouched
```

### WR-03: Unsafe cast in JWT metadata silently loses role on `ClassCastException`

**File:** `core-data/src/main/java/com/aethixdigital/portaljuridico/data/auth/JwtDecoder.kt:13-14`

**Issue:** `jwt.getClaim("app_metadata").asObject(Map::class.java)` returns `Map<*, *>?` (the raw type). The `as? String` safe cast on `appMetadata?.get("role")` handles `null` correctly, but if `app_metadata` is present in the JWT but `role` is not a `String` (e.g., an array or numeric value), the `as? String` returns `null` silently and `extractRole` returns `null`. This causes `AuthRepositoryImpl.login` to fall back to `response.role` (line 27), which may be from the server response body rather than the validated JWT claim — a subtle privilege-escalation path if a server response is ever tampered with. The `@Suppress("UNCHECKED_CAST")` masks a real runtime concern.

**Fix:** Validate the type explicitly and log/throw on unexpected shape rather than silently returning `null`:
```kotlin
fun extractRole(token: String): String? = try {
    val jwt = JWT(token)
    val appMetadata = jwt.getClaim("app_metadata").asObject(Map::class.java)
    val role = appMetadata?.get("role")
    role as? String  // returns null if not a String; acceptable, caller checks value
} catch (e: DecodeException) {
    null
}
```
More importantly, remove the fallback to `response.role` in `AuthRepository.login` (line 27 of `AuthRepository.kt`). The role must come from the JWT or login fails — never trust the server's plain JSON `role` field for authorization decisions:
```kotlin
onSuccess = { role ->
    val jwtRole = jwtDecoder.extractRole(response.token)
        ?: throw IllegalStateException("JWT missing role claim")
    jwtRole
}
```

### WR-04: Redundant `buildConfigField` in `defaultConfig` overrides debug build type

**File:** `app-escritorio/build.gradle.kts:24,29`

**Issue:** `API_BASE_URL` is declared twice: once in `defaultConfig` (line 24) with the emulator address `http://10.0.2.2:3000`, and again in the `debug` build type (line 29) with the same value. The second declaration is redundant but, more importantly, the first declaration acts as an implicit default for **all** build types not explicitly listed. If a `staging` or `qa` build type is added in the future without its own `buildConfigField`, it will silently inherit the emulator localhost URL and point at nothing in a real device. The correct pattern is to declare the field only in the build types that need it.

**Fix:** Remove the `buildConfigField` from `defaultConfig` — declare it only in `debug` and `release`:
```kotlin
defaultConfig {
    applicationId = "com.aethixdigital.portaljuridico.escritorio"
    minSdk = 27
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"
    testInstrumentationRunner = "com.aethixdigital.portaljuridico.escritorio.HiltTestRunner"
    // No API_BASE_URL here
}

buildTypes {
    debug {
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000\"")
    }
    release {
        isMinifyEnabled = true
        proguardFiles(...)
        buildConfigField("String", "API_BASE_URL", "\"https://api.portaljuridico.com.br\"")
    }
}
```

---

## Info

### IN-01: `onCpfChange` does not set `cpfTouched = true`

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/cadastro/CadastroClienteViewModel.kt:70-81`

**Issue:** `onCpfChange` only sets `cpfTouched` indirectly via `onCpfBlur()`. If a user types a full valid CPF without leaving the field (unusual but possible with autofill), `cpfTouched` remains `false` even though the CPF is fully entered and valid. This blocks submit unnecessarily. The current design relies entirely on blur events for the `Touched` flags, which is documented intent — but worth noting since `onCnjChange` has the same behavior. Not a bug given the current UI flow, but a potential friction point if IME done-action is used.

### IN-02: `MovimentacaoCard` receives `onExpandToggle` and `isExpanded` but neither is used

**File:** `core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/MovimentacaoCard.kt:34-73`

**Issue:** The composable signature declares `onExpandToggle: () -> Unit` and `isExpanded: Boolean` parameters but neither is referenced inside the function body. The `ExpandableText` composable (not in scope for this review but referenced on line 57) likely manages its own expand state internally. These parameters are dead API surface — callers (`PreviewScreen`) pass `onExpandToggle = {}` and `isExpanded = false` to satisfy the signature.

**Fix:** Either wire `isExpanded` and `onExpandToggle` into `ExpandableText` to hoist state to the caller, or remove the parameters if `ExpandableText` is self-contained. Dead parameters in a shared `core-ui` component will accumulate technical debt as the client app also consumes this component.

### IN-03: `filterClientes` — `ultimaSincronizacao` date string search is incidental

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/feature/clientes/list/ClienteListViewModel.kt:60-69`

**Issue:** The search filter matches against `ultimaSincronizacao` (e.g., "2h atrás", "1d atrás"). This field is a human-readable relative timestamp, not a searchable process number or client identifier. Searching "atrás" would match every client with a sync timestamp, which is likely all of them. The placeholder text says "Buscar por nome, CPF ou processo..." — sync timestamp is not in the advertised scope and the match will be confusing. Consider removing the `ultimaSincronizacao` condition from the filter or replacing it with a proper process number field when available.

### IN-04: `TokenDataStore.getToken()` uses `firstOrNull()` — may return `null` if DataStore emits nothing

**File:** `core-data/src/main/java/com/aethixdigital/portaljuridico/data/auth/TokenDataStore.kt:29`

**Issue:** `firstOrNull()` on a `Flow` terminates on the first emission OR when the flow completes without emitting. `DataStore.data` is a cold flow that always emits at least one value (the current preferences snapshot), so in practice `firstOrNull()` will not return `null` spuriously. However, the semantics of `firstOrNull()` here could cause a subtle bug if DataStore is ever replaced with a different implementation that does not emit eagerly — `first()` would be safer and documents the intent (exactly one value expected). This is a very low-severity concern in the current implementation.

---

_Reviewed: 2026-04-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
