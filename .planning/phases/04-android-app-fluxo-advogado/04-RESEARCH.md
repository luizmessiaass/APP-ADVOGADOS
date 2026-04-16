# Phase 4: Android App — Fluxo Advogado — Research

**Researched:** 2026-04-15
**Domain:** Android (Kotlin/Compose) — Retrofit 3, Navigation Compose 2.9, DataStore, JWT decode, Chrome Custom Tabs
**Confidence:** HIGH (stack verified from official docs and Maven Central)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Navigation Compose + NavHost. `hilt-navigation-compose` 1.2.0 already in catalog; add `navigation-compose` as complementary dep.
- **D-02:** Rotas mínimas: `login`, `clientes`, `clientes/{id}`, `clientes/cadastro`, `preview/{clienteId}`.
- **D-03:** Retrofit + OkHttp; OkHttp interceptor injeta `Authorization: Bearer {token}` em todas as requisições autenticadas.
- **D-04:** Adicionar ao version catalog: `retrofit`, `retrofit-converter-moshi` (ou gson), `okhttp`, `okhttp-logging-interceptor`. Pesquisador confirma versões estáveis.
- **D-05:** JWT persistido com DataStore Preferences. Token salvo como String, lido como Flow no repositório de auth.
- **D-06:** Role detection via decode JWT local — biblioteca leve lê campo `role`/`app_metadata` do payload sem round-trip ao backend.
- **D-07:** On app open: verificar token no DataStore → se válido e role == `advogado`, navegar para `clientes`; caso contrário, navegar para `login`.
- **D-08:** Componentes `MovimentacaoCard`, `ProcessoStatusCard` etc. ficam em `:core-ui`.
- **D-09:** Preview é tela separada com rota `preview/{clienteId}` — scroll em tela cheia.
- **D-10:** Disclaimer "Explicação gerada por IA" visível no topo de cada card (não no rodapé).
- **D-11:** Validação CPF e CNJ em tempo real — erro após primeiro `onFocusChanged` ou quando campo atinge comprimento esperado. Lógica local: CPF via mod11, CNJ via regex `NNNNNNN-DD.AAAA.J.TT.OOOO`.
- **D-12:** Unicidade de CPF verificada ao submeter via chamada ao backend.
- **D-13:** Envio de mensagem manual via Bottom Sheet, a partir da tela de detalhe do cliente.
- **D-14:** Sealed class por tela para UiState: `Loading`, `Success`, `Error`.
- **D-15:** Clean Architecture + MVVM: ViewModel → UseCase → Repository → RemoteDataSource (Retrofit). Módulos `:core-network` e `:core-data` populados nesta fase.

### Claude's Discretion

- Versão exata de Retrofit, OkHttp, Navigation Compose, e biblioteca de JWT decode
- Estratégia de refresh token automático (interceptor 401 → refresh → retry)
- Estrutura interna dos módulos `:core-network` e `:core-data`
- Layout visual dos cards na lista de clientes
- Estado vazio da lista de clientes
- Tratamento de erro de rede offline no app

### Deferred Ideas (OUT OF SCOPE)

- Chatbot IA para o advogado
- Dashboard com métricas do escritório
- Exportação de relatórios PDF
- `proxima_data` como ISO date para ordenação
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ESCR-01 | Advogado/admin consegue fazer login com email/senha | Network layer + DataStore auth token + JWT role detection |
| ESCR-02 | Advogado consegue cadastrar novo cliente (nome, CPF, email, número CNJ) | Retrofit POST, form state, CPF/CNJ validators |
| ESCR-03 | Validação de CPF e CNJ no formulário antes de submeter | CPF mod11 algorithm + CNJ regex, real-time Compose TextField |
| ESCR-04 | Advogado visualiza lista de clientes com status resumido dos processos | Retrofit GET, LazyColumn, UiState sealed class |
| ESCR-05 | Advogado busca cliente por nome, CPF ou número de processo | Backend-side search or local filter, search TextField pattern |
| ESCR-06 | Advogado visualiza processo "como o cliente vê" (preview read-only) | Endpoint `GET /clientes/{id}/preview`, `MovimentacaoCard` in :core-ui |
| ESCR-07 | Advogado envia mensagem/aviso manual para o cliente | Bottom Sheet + Retrofit POST, fire-and-forget with visual feedback |
| ESCR-08 | Tela do cliente mostra status da última sincronização DataJud | Field `ultima_sincronizacao` from backend response |
| ESCR-09 | Advogado acessa Stripe Customer Portal via Chrome Custom Tabs | Backend endpoint returns portal session URL, `androidx.browser:browser:1.10.0` |
| ESCR-10 | App_escritorio usa Clean Architecture + MVVM + Compose com módulos `:core-*` | Architecture verified; module structure from Phase 0 context |
| ESCR-11 | App_escritorio passa linting, testes unitários e UI tests no CI | Hilt testing pattern, `@HiltAndroidTest`, CI already has lint+unit baseline |
</phase_requirements>

---

## Summary

Phase 4 builds the admin Android app (`app-escritorio`) on top of the multi-module foundation established in Phase 0. The core technical challenge is wiring a full Clean Architecture stack — Retrofit 3 + OkHttp 4 + DataStore Preferences + Navigation Compose 2.9 + Hilt — all within a Compose-first codebase. All libraries in this stack are mature and well-documented; the greatest risks are integration gotchas rather than capability gaps.

**Supabase JWT structure:** Custom roles (`advogado`, `admin_escritorio`, `cliente`) are injected by the Custom Access Token Hook into either `app_metadata` or directly into the root claims object. They are NOT standard Supabase roles. The JWT payload must be decoded locally (no verification needed — the backend verifies; the app only reads the role for routing) using `com.auth0.android:jwtdecode:2.0.2`.

**Retrofit 3 is the right choice:** Released May 2025, it ships with native coroutine/suspend support (no `Call<T>` wrapper needed), uses OkHttp 4.12 (Kotlin), and is binary-compatible with Retrofit 2 patterns. Moshi 1.15.2 with KSP codegen is the recommended JSON converter for Kotlin.

**Primary recommendation:** Wire the foundation (version catalog entries, Hilt modules, network layer, DataStore, JWT decode) in Wave 1 as a parallel-safe dependency layer, then build screens in Wave 2.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `com.squareup.retrofit2:retrofit` | 3.0.0 | Type-safe HTTP client | Native coroutine suspend support, OkHttp 4.12 bundled |
| `com.squareup.okhttp3:okhttp` | 4.12.0 | HTTP engine + interceptors | Kotlin-written, used internally by Retrofit 3 |
| `com.squareup.okhttp3:logging-interceptor` | 4.12.0 | Request/response logging in debug | Same group as okhttp, version must match |
| `com.squareup.moshi:moshi` | 1.15.2 | JSON serialization | Kotlin-first, KSP codegen, no reflection |
| `com.squareup.moshi:moshi-kotlin-codegen` | 1.15.2 | KSP annotation processor for Moshi | Zero-reflection adapter generation |
| `com.squareup.retrofit2:converter-moshi` | 3.0.0 | Retrofit ↔ Moshi bridge | Same group/version as Retrofit |
| `androidx.navigation:navigation-compose` | 2.9.7 | Compose NavHost + type-safe routes | Official AndroidX, stable, type-safe with `@Serializable` routes |
| `androidx.datastore:datastore-preferences` | 1.2.1 | Async token persistence | Official replacement for SharedPreferences, Flow-based |
| `com.auth0.android:jwtdecode` | 2.0.2 | Local JWT payload decode | Lightweight (no signing), only reads `sub`, `exp`, custom claims |
| `androidx.browser:browser` | 1.10.0 | Chrome Custom Tabs for Stripe portal | Official AndroidX, released March 2026 |

[VERIFIED: developer.android.com/jetpack/androidx/releases/navigation] — navigation-compose 2.9.7
[VERIFIED: developer.android.com/jetpack/androidx/releases/browser] — browser 1.10.0
[VERIFIED: developer.android.com/jetpack/androidx/releases/datastore] — datastore-preferences 1.2.1
[VERIFIED: central.sonatype.com/artifact/com.squareup.retrofit2/retrofit] — Retrofit 3.0.0
[VERIFIED: central.sonatype.com/artifact/com.squareup.moshi/moshi-kotlin-codegen] — Moshi 1.15.2
[VERIFIED: github.com/auth0/JWTDecode.Android] — jwtdecode 2.0.2

### Supporting (Testing)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `com.google.dagger:hilt-android-testing` | 2.59.2 | `@HiltAndroidTest` + `@BindValue` | All androidTest instrumented tests |
| `androidx.compose.ui:ui-test-junit4` | (via BOM) | Compose UI testing | All screen-level UI tests |
| `app.cash.turbine:turbine` | 1.2.0 | StateFlow/Flow assertion in unit tests | ViewModel unit tests |

[ASSUMED] — Turbine 1.2.0: version from training knowledge, not verified in this session. Risk: minor, stable library with infrequent API changes.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Retrofit 3 + Moshi | Ktor + kotlinx.serialization | Ktor is valid but team has no prior usage; Retrofit 3 is established in codebase context |
| Navigation Compose 2.9 | Navigation3 1.0.1 | Navigation3 is new (Feb 2026), less community content; 2.9 is proven stable |
| `jwtdecode` Auth0 | Manual Base64 decode | Auth0 lib handles edge cases (padding, charset) cleanly; ~50KB; not worth hand-rolling |
| DataStore Preferences | EncryptedSharedPreferences | EncryptedSharedPreferences deprecated path (2026); DataStore is official successor |

**Installation (additions to `gradle/libs.versions.toml`):**

```toml
[versions]
# Add to existing versions:
retrofit = "3.0.0"
okhttp = "4.12.0"
moshi = "1.15.2"
navigationCompose = "2.9.7"
datastore = "1.2.1"
jwtdecode = "2.0.2"
browser = "1.10.0"
turbine = "1.2.0"

[libraries]
# Add to existing libraries:
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-converter-moshi = { group = "com.squareup.retrofit2", name = "converter-moshi", version.ref = "retrofit" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
okhttp-logging-interceptor = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }
moshi = { group = "com.squareup.moshi", name = "moshi", version.ref = "moshi" }
moshi-kotlin-codegen = { group = "com.squareup.moshi", name = "moshi-kotlin-codegen", version.ref = "moshi" }
navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }
datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
jwt-decode = { group = "com.auth0.android", name = "jwtdecode", version.ref = "jwtdecode" }
browser = { group = "androidx.browser", name = "browser", version.ref = "browser" }
hilt-android-testing = { group = "com.google.dagger", name = "hilt-android-testing", version.ref = "hilt" }
turbine = { group = "app.cash.turbine", name = "turbine", version.ref = "turbine" }
```

**Dependency declaration (`:app-escritorio` and `:core-network` build.gradle.kts):**

```kotlin
// :core-network/build.gradle.kts — main network dependencies
implementation(libs.retrofit)
implementation(libs.retrofit.converter.moshi)
implementation(libs.okhttp)
implementation(libs.okhttp.logging.interceptor)
implementation(libs.moshi)
ksp(libs.moshi.kotlin.codegen)
implementation(libs.datastore.preferences)
implementation(libs.jwt.decode)

// :app-escritorio/build.gradle.kts — navigation + browser
implementation(libs.navigation.compose)
implementation(libs.hilt.navigation.compose)   // already in catalog
implementation(libs.browser)
```

---

## Architecture Patterns

### Recommended Project Structure

```
app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/
├── MainActivity.kt              # NavHost host, single @AndroidEntryPoint
├── EscritorioApp.kt             # @HiltAndroidApp Application
└── navigation/
    └── EscritorioNavGraph.kt    # NavHost + all composable() destinations

core-network/src/main/java/com/aethixdigital/portaljuridico/network/
├── di/
│   └── NetworkModule.kt         # @Module @InstallIn(SingletonComponent)
├── interceptor/
│   └── AuthInterceptor.kt       # OkHttp interceptor: reads token from DataStore
├── api/
│   ├── AuthApi.kt               # Retrofit interface: login, refresh
│   └── ClienteApi.kt            # Retrofit interface: CRUD, search, preview, mensagem
└── model/
    └── dto/                     # @JsonClass(generateAdapter=true) DTOs

core-data/src/main/java/com/aethixdigital/portaljuridico/data/
├── repository/
│   ├── AuthRepository.kt        # interface + impl
│   └── ClienteRepository.kt     # interface + impl
├── auth/
│   └── TokenDataStore.kt        # DataStore read/write, exposes Flow<String?>
└── di/
    └── DataModule.kt            # @Module @InstallIn(SingletonComponent)

core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/
├── components/
│   ├── MovimentacaoCard.kt      # Reusable by app-cliente (Phase 5)
│   └── ProcessoStatusCard.kt   # Reusable by app-cliente (Phase 5)
└── theme/                       # Already exists (PortalJuridicoTheme)

app-escritorio/.../feature/
├── login/
│   ├── LoginScreen.kt
│   └── LoginViewModel.kt        # hiltViewModel()
├── clientes/
│   ├── list/
│   │   ├── ClienteListScreen.kt
│   │   └── ClienteListViewModel.kt
│   ├── cadastro/
│   │   ├── CadastroClienteScreen.kt
│   │   └── CadastroClienteViewModel.kt
│   └── detalhe/
│       ├── ClienteDetalheScreen.kt
│       └── ClienteDetalheViewModel.kt
└── preview/
    ├── PreviewScreen.kt
    └── PreviewViewModel.kt
```

### Pattern 1: Type-Safe Navigation Routes (Navigation Compose 2.9)

**What:** Declare routes as `@Serializable` sealed class/data class; NavHost resolves arguments via `SavedStateHandle` automatically.
**When to use:** All routes in this phase; required by D-02.

```kotlin
// Source: developer.android.com/guide/navigation/design/type-safety
import kotlinx.serialization.Serializable

sealed interface EscritorioRoute {
    @Serializable data object Login : EscritorioRoute
    @Serializable data object ClienteLista : EscritorioRoute
    @Serializable data class ClienteDetalhe(val clienteId: String) : EscritorioRoute
    @Serializable data object CadastroCliente : EscritorioRoute
    @Serializable data class PreviewCliente(val clienteId: String) : EscritorioRoute
}

// NavHost
NavHost(navController, startDestination = EscritorioRoute.Login) {
    composable<EscritorioRoute.Login> { LoginScreen(...) }
    composable<EscritorioRoute.ClienteLista> { ClienteListScreen(...) }
    composable<EscritorioRoute.ClienteDetalhe> { ClienteDetalheScreen(...) }
    composable<EscritorioRoute.CadastroCliente> { CadastroClienteScreen(...) }
    composable<EscritorioRoute.PreviewCliente> { PreviewScreen(...) }
}
```

**Requires:** `org.jetbrains.kotlin.plugin.serialization` plugin + `kotlinx-serialization-json` in `:app-escritorio`.

### Pattern 2: OkHttp AuthInterceptor with DataStore

**What:** OkHttp interceptor reads JWT synchronously (using `runBlocking` on a background thread) and appends `Authorization: Bearer` header.
**Critical caveat:** OkHttp interceptors run on background threads — `runBlocking` here is safe but must be constrained with a timeout to prevent infinite blocking if DataStore is slow.

```kotlin
// Source: Pattern verified from square/okhttp issue #6754 + dev.to/mrntlu JWT tutorial
class AuthInterceptor @Inject constructor(
    private val tokenDataStore: TokenDataStore
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        // runBlocking is acceptable here: OkHttp thread, NOT main thread
        val token = runBlocking { tokenDataStore.getToken().firstOrNull() }
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
```

### Pattern 3: UiState Sealed Class (D-14)

```kotlin
// Standard MVVM Compose pattern — no external citation needed, this is the project decision
sealed class ClienteListUiState {
    object Loading : ClienteListUiState()
    data class Success(val clientes: List<ClienteItem>) : ClienteListUiState()
    data class Error(val message: String) : ClienteListUiState()
}

class ClienteListViewModel @Inject constructor(
    private val getClientesUseCase: GetClientesUseCase
) : ViewModel() {
    private val _uiState = MutableStateFlow<ClienteListUiState>(ClienteListUiState.Loading)
    val uiState: StateFlow<ClienteListUiState> = _uiState.asStateFlow()

    fun loadClientes() {
        viewModelScope.launch {
            _uiState.value = ClienteListUiState.Loading
            getClientesUseCase().fold(
                onSuccess = { _uiState.value = ClienteListUiState.Success(it) },
                onFailure = { _uiState.value = ClienteListUiState.Error(it.message ?: "Erro desconhecido") }
            )
        }
    }
}
```

### Pattern 4: Hilt + Navigation Compose (hiltViewModel)

```kotlin
// Source: developer.android.com/training/dependency-injection/hilt-jetpack
// IMPORTANT: use hiltViewModel() at the composable level, NOT inside lambdas
composable<EscritorioRoute.ClienteLista> {
    val viewModel: ClienteListViewModel = hiltViewModel()  // scoped to this back stack entry
    ClienteListScreen(viewModel = viewModel)
}
```

### Pattern 5: Chrome Custom Tabs for Stripe Portal

**Flow:** ViewModel calls backend `POST /api/v1/escritorios/portal-session` → backend creates Stripe session → returns `{ url: "https://billing.stripe.com/..." }` → app opens via Custom Tabs.

```kotlin
// Source: developer.chrome.com/docs/android/custom-tabs/guide-get-started
// In a Composable or Activity context:
fun openStripePortal(context: Context, url: String) {
    val customTabsIntent = CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()
    customTabsIntent.launchUrl(context, Uri.parse(url))
}

// In ViewModel:
fun getPortalUrl() {
    viewModelScope.launch {
        val result = escritorioRepository.getPortalSessionUrl()
        result.onSuccess { url -> _portalUrl.value = url }
        result.onFailure { _uiState.value = UiState.Error(it.message ?: "") }
    }
}
```

### Anti-Patterns to Avoid

- **Calling hiltViewModel() inside an inline lambda:** Causes compilation errors — always pass ViewModel as a parameter to the composable.
- **Sharing ViewModel across destinations without explicit scoping:** Use `hiltViewModel(navBackStackEntry)` if you need a ViewModel scoped to a parent nav graph.
- **Using `runBlocking` on the main thread in DataStore reads:** Only acceptable in OkHttp interceptors (background thread). Never in `@Composable` or `ViewModel` code.
- **Leaving `:core-network` without Kotlin plugin:** Module needs `alias(libs.plugins.kotlin.android)` in its `build.gradle.kts` to compile Kotlin sources. Current stub has no Kotlin plugin — this will cause a build error when adding `.kt` files.

---

## Supabase JWT Structure (Critical for D-06)

[CITED: supabase.com/docs/guides/auth/jwt-fields]
[CITED: supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook]

The standard Supabase JWT has these root-level claims:

```json
{
  "iss": "https://<project>.supabase.co/auth/v1",
  "sub": "<uuid>",
  "aud": "authenticated",
  "exp": 1700000000,
  "iat": 1699990000,
  "email": "advogado@escritorio.com",
  "role": "authenticated",       // ALWAYS "authenticated" for logged-in users
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
    // Custom fields added by the hook are injected HERE or at root level
  }
}
```

**The `role` field at the root is always `"authenticated"` for logged-in users.** Custom roles (`advogado`, `admin_escritorio`, `cliente`) are NOT placed in the root `role` field — they are injected by the Custom Access Token Hook.

**Phase 1 CONTEXT decision (AUTH-03):** The hook injects `tenant_id` and `role` into `app_metadata`. Based on Phase 1 Context D-... (hook sets `app_metadata.role` and `app_metadata.tenant_id`).

**How to read it with `jwtdecode`:**

```kotlin
// Source: github.com/auth0/JWTDecode.Android
import com.auth0.android.jwt.JWT

fun extractRoleFromToken(token: String): String? {
    return try {
        val jwt = JWT(token)
        // Read custom role from app_metadata claim
        val appMetadata = jwt.getClaim("app_metadata").asObject(Map::class.java)
        appMetadata?.get("role") as? String
    } catch (e: DecodeException) {
        null
    }
}

fun isTokenExpired(token: String): Boolean {
    return try {
        JWT(token).isExpired(0)
    } catch (e: DecodeException) {
        true
    }
}
```

**Claim path:** `jwt.getClaim("app_metadata").asObject(Map::class.java)?.get("role")` returns `"advogado"`, `"admin_escritorio"`, or `"cliente"`.

[ASSUMED] — The exact claim path (`app_metadata.role` vs root `role`) depends on how Phase 1's Custom Access Token Hook was implemented. The Phase 1 CONTEXT confirms `app_metadata` is the injection point (AUTH-03: "JWT contém `tenant_id` e `role` em `app_metadata`"). Confidence: HIGH given explicit Phase 1 decision, but the planner should include a task to verify the actual hook output against a live token during Wave 1 integration testing.

---

## CPF Validation Algorithm

[CITED: dev.to/leandrostl/demystifying-cpf-and-cnpj-check-digit-algorithms]

Standard mod11 double-digit check. **Critical edge case:** CPFs where all digits are the same (e.g., `111.111.111-11`, `000.000.000-00`) pass the mathematical validation but are officially invalid. Must be explicitly rejected.

```kotlin
fun isValidCpf(cpf: String): Boolean {
    // Normalize: remove formatting characters
    val digits = cpf.filter { it.isDigit() }

    // Must be exactly 11 digits
    if (digits.length != 11) return false

    // Reject all-same-digit CPFs (all 10 known invalid sequences)
    if (digits.all { it == digits[0] }) return false

    // First check digit (weights 10..2)
    val sum1 = (0..8).sumOf { (digits[it] - '0') * (10 - it) }
    val remainder1 = sum1 % 11
    val digit1 = if (remainder1 < 2) 0 else 11 - remainder1
    if ((digits[9] - '0') != digit1) return false

    // Second check digit (weights 11..2)
    val sum2 = (0..9).sumOf { (digits[it] - '0') * (11 - it) }
    val remainder2 = sum2 % 11
    val digit2 = if (remainder2 < 2) 0 else 11 - remainder2
    return (digits[10] - '0') == digit2
}

fun formatCpf(raw: String): String {
    val digits = raw.filter { it.isDigit() }.take(11)
    return buildString {
        digits.forEachIndexed { i, c ->
            if (i == 3 || i == 6) append('.')
            if (i == 9) append('-')
            append(c)
        }
    }
}
```

**Edge cases to test:**
- `000.000.000-00` → invalid (all-same)
- `111.111.111-11` through `999.999.999-99` → invalid (all-same)
- `123.456.789-09` → valid (well-known test CPF)
- `123.456.789-10` → invalid (wrong check digit)
- `123456789-09` (partial format) → normalize then validate

---

## CNJ Number Format & Validation

[ASSUMED] — CNJ format based on Resolução CNJ 65/2008 (well-known standard). The regex pattern itself is a standard fact, not library-dependent.

**Format:** `NNNNNNN-DD.AAAA.J.TT.OOOO`
- `NNNNNNN` = 7 digits (sequential number, zero-padded)
- `DD` = 2 check digits
- `AAAA` = 4-digit year
- `J` = 1 digit (justice segment: 1=STF, 2=CNJ, 3=STJ, 4=Justiça Federal, 5=Trabalhista, 6=Eleitoral, 7=Militar Federal, 8=Estadual, 9=Militar Estadual)
- `TT` = 2 digits (tribunal code)
- `OOOO` = 4 digits (origin/vara)

**Normalization strategy (from D-11 specifics):** Accept input with or without formatting. Normalize to digits-only before validating; display with formatting.

```kotlin
private val CNJ_PATTERN = Regex("""^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$""")
private val CNJ_DIGITS_ONLY = Regex("""^\d{20}$""")

fun normalizeCnj(input: String): String {
    val digits = input.filter { it.isDigit() }
    return if (digits.length == 20) {
        // NNNNNNN-DD.AAAA.J.TT.OOOO
        "${digits.substring(0, 7)}-${digits.substring(7, 9)}.${digits.substring(9, 13)}.${digits[13]}.${digits.substring(14, 16)}.${digits.substring(16, 20)}"
    } else input
}

fun isValidCnjFormat(input: String): Boolean {
    val normalized = normalizeCnj(input.trim())
    return CNJ_PATTERN.matches(normalized)
}
```

**Note:** Phase 2 (backend) implements the full mod-97 check digit validation per Resolução CNJ 65/2008 (DATAJUD-01). The Android app only validates **format** (regex) — the backend validates the check digits. This is the correct division of responsibility: format errors caught on device (fast UX), semantic errors caught on server.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT decode/parse | Custom Base64 decode | `com.auth0.android:jwtdecode` | URL-safe Base64 padding edge cases; charset handling; expiry check |
| Token HTTP injection | Manual header-per-call | OkHttp `AuthInterceptor` | Single point of truth; no missing headers on new endpoints |
| JSON serialization | Manual JSON string building | Moshi `@JsonClass(generateAdapter=true)` | KSP codegen: compile-time safe, handles nulls, no reflection |
| Chrome URL opening | `Intent(ACTION_VIEW)` | `CustomTabsIntent` | Keeps user in-app, preserves back stack, session cookies shared |
| ViewModel DI in Compose | Manual ViewModel factory | `hiltViewModel()` | SavedStateHandle auto-injected with nav args; no boilerplate |
| Async token read in interceptor | Callback hell / new coroutine scope | `runBlocking { dataStore.first() }` | OkHttp thread-safe; bounded by OkHttp's own timeout |

**Key insight:** In Clean Architecture + Compose, the ViewModel layer is the last place you want manual wiring. Hilt + Navigation Compose + hiltViewModel() eliminates the entire factory pattern that was required in pre-Hilt Android.

---

## Common Pitfalls

### Pitfall 1: `:core-network` module missing Kotlin plugin

**What goes wrong:** Adding `.kt` files to `:core-network` causes `Unresolved reference` build errors. The current `core-network/build.gradle.kts` only applies `com.android.library` — it has no Kotlin plugin.
**Why it happens:** Phase 0 created the module as a stub with no Kotlin sources.
**How to avoid:** Wave 1 Plan 1 must add `alias(libs.plugins.kotlin.android)` to `core-network/build.gradle.kts` before adding any Kotlin source files.
**Warning signs:** Build error: "Could not find org.jetbrains.kotlin.android" or "Unresolved reference: Interceptor".

### Pitfall 2: Hilt ViewModel scoped incorrectly with nested nav graphs

**What goes wrong:** ViewModel is recreated on every navigation instead of surviving the parent graph lifetime.
**Why it happens:** `hiltViewModel()` defaults to scoping to the current `NavBackStackEntry`. If you want a ViewModel shared between `ClienteDetalhe` and `PreviewCliente`, you must scope to the parent entry explicitly.
**How to avoid:** For shared state between sibling screens, scope to a parent `NavGraph`. For independent screens, per-destination scope is correct (which it is for all Phase 4 routes).
**Warning signs:** State is reset when navigating between detail → preview and back.

### Pitfall 3: `runBlocking` in DataStore reads inside OkHttp interceptor

**What goes wrong:** Potential thread starvation under high concurrency if `runBlocking` blocks all OkHttp threads waiting for DataStore.
**Why it happens:** OkHttp has a bounded thread pool. If all threads are blocked in `runBlocking` simultaneously, new requests deadlock.
**How to avoid:** DataStore reads are extremely fast (in-memory after first read). Use `firstOrNull()` inside `runBlocking` with a timeout wrapper if you want extra safety. For this app's concurrency level (single-user, few concurrent requests), this is not a real risk but should be documented.
**Warning signs:** ANR or NetworkOnMainThreadException in edge cases.

### Pitfall 4: Kotlin Serialization plugin missing for Navigation 2.9 type-safe routes

**What goes wrong:** `@Serializable` annotation on route classes not recognized; build fails with "Serializer for class not found".
**Why it happens:** Navigation Compose 2.9 type-safe routes require the `kotlin-serialization` Gradle plugin AND `kotlinx-serialization-json` runtime dep.
**How to avoid:** Add `org.jetbrains.kotlin.plugin.serialization` plugin + `kotlinx-serialization-json` to both `gradle/libs.versions.toml` and `:app-escritorio/build.gradle.kts`.
**Warning signs:** Compile error "This class is not serializable" on route classes.

### Pitfall 5: CPF `111.111.111-11` passes mod11 but is invalid

**What goes wrong:** CPF `111.111.111-11` satisfies the modulus arithmetic but is officially rejected by Receita Federal.
**Why it happens:** The mod11 algorithm happens to produce the correct check digits for all-same-digit sequences.
**How to avoid:** Explicit guard: `if (digits.all { it == digits[0] }) return false` BEFORE the arithmetic check (see CPF algorithm above).
**Warning signs:** QA tester uses `111.111.111-11` as test data and it passes validation.

### Pitfall 6: Navigation Compose + Hilt — wrong artifact

**What goes wrong:** `hiltViewModel()` not found even though Hilt is configured correctly.
**Why it happens:** `hiltViewModel()` lives in `androidx.hilt:hilt-navigation-compose`, not in `androidx.hilt:hilt-android`. Both are needed. The version catalog already has `hilt-navigation-compose` but it must be added to `:app-escritorio` dependencies (currently missing from the module's `build.gradle.kts`).
**How to avoid:** Check that `app-escritorio/build.gradle.kts` includes `implementation(libs.hilt.navigation.compose)` AND `implementation(libs.navigation.compose)`.

---

## Wave Structure Recommendation

**Wave 1 (foundation — can be planned and executed in parallel across files):**
- Plan 04-01: version catalog additions + `core-network` Kotlin plugin fix + Hilt module wiring (`NetworkModule`, `DataModule`)
- Plan 04-02: `TokenDataStore` + `AuthInterceptor` + `AuthApi` + `AuthRepository` + `LoginViewModel` + login screen
- Plan 04-03: `ClienteApi` + `ClienteRepository` + `core-ui` shared components (`MovimentacaoCard`, `ProcessoStatusCard`)

**Wave 2 (screens — depend on Wave 1 foundation):**
- Plan 04-04: `ClienteListScreen` + `CadastroClienteScreen` + CPF/CNJ validators
- Plan 04-05: `ClienteDetalheScreen` + `PreviewScreen` + Stripe Custom Tabs
- Plan 04-06: Manual message Bottom Sheet + CI test additions (unit + UI)

**Dependency chain:** Wave 1 Plans 01-02-03 can be written in parallel (each touches different files). Wave 2 depends on Wave 1 being complete. Plans 04-04 and 04-05 can be done in parallel (different screens, no shared mutable state).

---

## Code Examples

### Retrofit 3 Service Interface with Moshi DTOs

```kotlin
// Source: square.github.io/retrofit + Retrofit 3.0 native suspend support
interface ClienteApi {
    @POST("api/v1/clientes")
    suspend fun cadastrarCliente(@Body request: CadastroClienteRequest): ClienteResponse

    @GET("api/v1/clientes")
    suspend fun listarClientes(@Query("search") search: String? = null): List<ClienteItem>

    @GET("api/v1/clientes/{id}/preview")
    suspend fun previewCliente(@Path("id") clienteId: String): PreviewResponse

    @POST("api/v1/clientes/{id}/mensagens")
    suspend fun enviarMensagem(
        @Path("id") clienteId: String,
        @Body request: EnviarMensagemRequest
    ): MensagemResponse

    @POST("api/v1/escritorios/portal-session")
    suspend fun getPortalSession(): PortalSessionResponse
}

@JsonClass(generateAdapter = true)
data class PreviewResponse(
    val status: String,
    @Json(name = "proxima_data") val proximaData: String?,
    val explicacao: String,
    val impacto: String,
    @Json(name = "disclaimer") val disclaimer: String  // "Explicação gerada por IA"
)
```

### Hilt NetworkModule

```kotlin
// Source: dagger.dev/hilt + developer.android.com/training/dependency-injection/hilt-jetpack
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .apply {
                if (BuildConfig.DEBUG) addInterceptor(HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                })
            }
            .build()

    @Provides @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder().build()

    @Provides @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, moshi: Moshi): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

    @Provides @Singleton
    fun provideClienteApi(retrofit: Retrofit): ClienteApi =
        retrofit.create(ClienteApi::class.java)
}
```

### Hilt Test Setup

```kotlin
// Source: developer.android.com/training/dependency-injection/hilt-testing
@HiltAndroidTest
class ClienteListScreenTest {
    @get:Rule(order = 0) val hiltRule = HiltAndroidRule(this)
    @get:Rule(order = 1) val composeTestRule = createAndroidComposeRule<MainActivity>()

    @BindValue @JvmField
    val fakeClienteRepository: ClienteRepository = FakeClienteRepository()

    @Test
    fun clienteList_showsClienteCards() {
        composeTestRule.onNodeWithText("João Silva").assertIsDisplayed()
    }
}

// Custom test runner (androidTest/):
class HiltTestRunner : AndroidJUnitRunner() {
    override fun newApplication(cl: ClassLoader?, name: String?, context: Context?): Application =
        super.newApplication(cl, HiltTestApplication::class.java.name, context)
}
// Register in app-escritorio/build.gradle.kts:
// testInstrumentationRunner = "com.aethixdigital.portaljuridico.escritorio.HiltTestRunner"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SharedPreferences` for token | `DataStore Preferences` | 2020/2021 | Async, coroutine-native, no `StrictModeViolation` |
| String routes in Navigation Compose | `@Serializable` type-safe routes | Navigation 2.8 (stable 2025) | Compile-time safety, no manual String → object mapping |
| `retrofit2:Call<T>` with callback | `suspend fun` (Retrofit 3.0) | May 2025 | No `enqueue()`, direct coroutine integration |
| Gson converter | Moshi with codegen | 2022+ | Default value handling, KSP, no reflection |
| Manual ViewModel factory | `hiltViewModel()` | 2021 | Zero boilerplate, SavedStateHandle auto-injected |
| `startActivity(Intent(ACTION_VIEW))` | `CustomTabsIntent` | 2015+ | In-app browser UX, session/cookie sharing |

**Deprecated/outdated:**
- `SharedPreferences`: Still works but deprecated path — don't use for new token storage.
- `retrofit2:adapter-rxjava2`: Irrelevant now that suspend functions work natively in Retrofit 3.
- `Navigation Compose` string routes: Still functional but lint warns; prefer `@Serializable` types.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 1's Custom Access Token Hook stores role in `app_metadata.role` (not root `role`) | Supabase JWT Structure | JWT role extraction code would read wrong field; login routing fails. Mitigation: test with a real token in Wave 1. |
| A2 | Turbine 1.2.0 is the current stable version | Standard Stack (Testing) | Minor — only affects ViewModel unit tests; easy to update version if wrong. |
| A3 | `API_BASE_URL` is exposed as `BuildConfig` field via `buildConfigField` in `app-escritorio/build.gradle.kts` | NetworkModule code example | If not configured, NetworkModule won't compile. Wave 1 Plan 1 must add this `buildConfigField`. |

---

## Open Questions

1. **Token refresh strategy (Claude's Discretion)**
   - What we know: D-05 uses DataStore; D-06 uses local JWT decode for role. The interceptor adds the token on every request.
   - What's unclear: Should the 401 Authenticator attempt a silent refresh via `POST /auth/refresh`, or should it just clear the token and send the user to Login?
   - Recommendation: For v1, implement the simple path: on 401, clear DataStore token and navigate to Login. Silent refresh adds the `OkHttp Authenticator` + potential deadlock surface for minimal UX benefit in an admin-only app that runs in a single session per day.

2. **Backend base URL configuration**
   - What we know: Retrofit needs `baseUrl`. Phase 1 set up the Fastify backend.
   - What's unclear: Is the backend URL stored in `local.properties` + `BuildConfig`, in a BuildConfig flavor field, or hardcoded?
   - Recommendation: Add `API_BASE_URL` as a `buildConfigField` in `app-escritorio/build.gradle.kts`, with different values per build type (debug → localhost/emulator IP, release → production URL).

3. **Moshi vs Gson: final call**
   - What we know: Phase 0 CONTEXT D-04 says "retrofit-converter-gson (ou retrofit-converter-moshi)" — left for researcher to decide.
   - Recommendation: Use Moshi 1.15.2 with KSP codegen. It handles Kotlin data class default values correctly (Gson doesn't), has compile-time safety, and integrates better with Retrofit 3. No runtime reflection.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Android Studio / JDK | Build | ✓ | Bundled JDK | — |
| Node.js | Build scripts | ✓ | v24.14.0 | — |
| Gradle 9.3.1 | Build | ✓ | via wrapper | — |
| Backend (Fastify) | Network integration tests | Unknown | — | Use mock/fake repository for UI tests |
| Supabase project | Auth/JWT validation | Unknown | — | Use hardcoded test token for Wave 1 |

**Missing dependencies with no fallback:** None blocking for Wave 1 (all network calls can be faked in tests).

**Missing dependencies with fallback:**
- Backend not running locally: UI tests use `FakeClienteRepository`/`FakeAuthRepository` — no real HTTP needed for screen tests.

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly false in config — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 4 (unit), Compose UI Test / Espresso (instrumented) |
| Config file | `app-escritorio/build.gradle.kts` (testInstrumentationRunner) |
| Quick run command | `./gradlew :app-escritorio:test` |
| Full suite command | `./gradlew :app-escritorio:test :app-escritorio:connectedDebugAndroidTest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ESCR-01 | Login com email/senha → token stored in DataStore → navigate to lista | Unit (ViewModel) | `./gradlew :app-escritorio:test` | ❌ Wave 0 |
| ESCR-01 | Login screen renders email/password fields + button | UI (Compose) | `./gradlew :app-escritorio:connectedDebugAndroidTest` | ❌ Wave 0 |
| ESCR-02 | CadastroCliente form submits valid CPF + CNJ → success response | Unit (ViewModel) | `./gradlew :app-escritorio:test` | ❌ Wave 0 |
| ESCR-03 | CPF mod11 validation — valid, invalid, all-same-digits | Unit (validator pure function) | `./gradlew :app-escritorio:test` | ❌ Wave 0 |
| ESCR-03 | CNJ regex validation — formatted, unformatted, invalid | Unit (validator pure function) | `./gradlew :app-escritorio:test` | ❌ Wave 0 |
| ESCR-04 | ClienteListUiState.Success → LazyColumn shows client cards | UI (Compose) | `./gradlew :app-escritorio:connectedDebugAndroidTest` | ❌ Wave 0 |
| ESCR-05 | Search by name filters visible list items | UI (Compose) | `./gradlew :app-escritorio:connectedDebugAndroidTest` | ❌ Wave 0 |
| ESCR-06 | PreviewScreen renders MovimentacaoCard with disclaimer visible | UI (Compose) | `./gradlew :app-escritorio:connectedDebugAndroidTest` | ❌ Wave 0 |
| ESCR-07 | BottomSheet opens on "Enviar Mensagem" tap, text field + send button present | UI (Compose) | `./gradlew :app-escritorio:connectedDebugAndroidTest` | ❌ Wave 0 |
| ESCR-08 | ClienteDetalhe shows `ultima_sincronizacao` field | UI (Compose) | `./gradlew :app-escritorio:connectedDebugAndroidTest` | ❌ Wave 0 |
| ESCR-09 | Portal button triggers CustomTabsIntent (mock browser action) | Unit (intent verification) | `./gradlew :app-escritorio:test` | ❌ Wave 0 |
| ESCR-10 | NetworkModule provides Retrofit + ClienteApi via Hilt | Unit (Hilt component test) | `./gradlew :app-escritorio:test` | ❌ Wave 0 |
| ESCR-11 | Lint passes with no errors | Lint | `./gradlew :app-escritorio:lint` | CI already configured |

### Sampling Rate

- **Per task commit:** `./gradlew :app-escritorio:test :app-escritorio:lint`
- **Per wave merge:** `./gradlew :app-escritorio:test :app-escritorio:connectedDebugAndroidTest :app-escritorio:lint`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `app-escritorio/src/test/java/.../auth/LoginViewModelTest.kt` — covers ESCR-01
- [ ] `app-escritorio/src/test/java/.../validation/CpfValidatorTest.kt` — covers ESCR-03 (CPF)
- [ ] `app-escritorio/src/test/java/.../validation/CnjValidatorTest.kt` — covers ESCR-03 (CNJ)
- [ ] `app-escritorio/src/androidTest/java/.../ClienteListScreenTest.kt` — covers ESCR-04, ESCR-05
- [ ] `app-escritorio/src/androidTest/java/.../PreviewScreenTest.kt` — covers ESCR-06
- [ ] `app-escritorio/src/androidTest/java/.../CadastroClienteScreenTest.kt` — covers ESCR-02
- [ ] `app-escritorio/src/androidTest/java/.../HiltTestRunner.kt` — required by all androidTest Hilt tests

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth JWT; DataStore token storage (not cleartext) |
| V3 Session Management | yes | JWT expiry checked locally via `jwtdecode`; on 401 → clear token + re-login |
| V4 Access Control | yes | Role from `app_metadata.role` gates navigation (advogado vs cliente); backend enforces RLS |
| V5 Input Validation | yes | CPF mod11 + CNJ regex on device; full validation on backend |
| V6 Cryptography | no | No custom crypto; DataStore uses system-level encryption on API 23+ by default |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT stolen from DataStore | Spoofing | DataStore encryption (API 23+); short JWT expiry; 401 clears token |
| Role bypass via tampered JWT | Tampering | App only reads role for routing; backend RLS is authoritative — tampered JWT rejected at backend |
| CPF of another client guessed | Information Disclosure | Backend validates ownership via tenant_id + RLS; app does format-only validation |
| Stripe portal URL leaked | Information Disclosure | Portal session URL is short-lived (Stripe default ~5 min expiry); opened immediately after fetch |

---

## Sources

### Primary (HIGH confidence)
- `developer.android.com/jetpack/androidx/releases/navigation` — navigation-compose 2.9.7 verified
- `developer.android.com/jetpack/androidx/releases/browser` — browser 1.10.0 verified
- `developer.android.com/jetpack/androidx/releases/datastore` — datastore-preferences 1.2.1 verified
- `central.sonatype.com/artifact/com.squareup.retrofit2/retrofit` — Retrofit 3.0.0 verified
- `central.sonatype.com/artifact/com.squareup.moshi/moshi-kotlin-codegen` — Moshi 1.15.2 verified
- `github.com/auth0/JWTDecode.Android` — jwtdecode 2.0.2 verified
- `supabase.com/docs/guides/auth/jwt-fields` — JWT fields structure
- `supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook` — custom claims injection
- `developer.chrome.com/docs/android/custom-tabs/guide-get-started` — Custom Tabs implementation
- `developer.android.com/guide/navigation/design/type-safety` — type-safe routes

### Secondary (MEDIUM confidence)
- `square.github.io/okhttp/changelogs/changelog/` — OkHttp 4.12.0 (same as Retrofit 3 dependency)
- `square.github.io/retrofit/download/` — Retrofit 3.0.0 release notes
- `issuetracker.google.com/issues/200817333` — Hilt + Navigation ViewModel scoping pitfall
- `dev.to/leandrostl/demystifying-cpf-and-cnpj-check-digit-algorithms` — CPF algorithm

### Tertiary (LOW confidence)
- `app.cash.turbine:turbine:1.2.0` — version from training knowledge [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions verified against Maven Central and official release pages
- Architecture: HIGH — patterns derived from official Android documentation and project CONTEXT decisions
- Pitfalls: HIGH — sourced from official issue tracker (Hilt+Navigation) and OkHttp issues
- CPF/CNJ validation: MEDIUM — algorithm is standard but exact implementation from training knowledge with one external citation
- Supabase JWT role claim path: HIGH given Phase 1 CONTEXT explicit decision (AUTH-03)

**Research date:** 2026-04-15
**Valid until:** 2026-07-15 (stable libraries; 90 days)

---

## RESEARCH COMPLETE
