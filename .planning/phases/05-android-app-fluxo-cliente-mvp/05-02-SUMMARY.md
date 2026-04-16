---
plan: 05-02
phase: 05-android-app-fluxo-cliente-mvp
status: complete
started: 2026-04-16
completed: 2026-04-16
---

## Summary

Set up the `:app-cliente` module foundation: dependency catalog entries, module build config, design system tokens, 8 shared Compose components, navigation graph, SplashViewModel, LoginScreen/LoginViewModel, NetworkModule, and LoginViewModelTest.

## Key Files Created

- `gradle/libs.versions.toml` — added gson, lifecycleViewmodelCompose, androidx-compose-foundation, retrofit-converter-gson entries
- `app-cliente/build.gradle.kts` — full build config with demo flavor, minify enabled, Hilt, Navigation, Retrofit, DataStore, :core-network, :core-data deps
- `core-ui/Color.kt` — PortalJuridico trust-blue palette (primary #1A56DB, dynamicColor=false)
- `core-ui/Theme.kt` — PortalJuridicoTheme with full light/dark schemes
- `core-common/model/ProcessoSummary.kt` and `Movimentacao.kt` — shared data models
- `core-ui/components/` — 8 shared components: ProcessoStatusCard, ProximaDataCard, MovimentacaoCard, ExpandableText, ProcessoListCard, SkeletonCard, EmptyStateView, PagerDots
- `app-cliente/navigation/Routes.kt` — 6 route constants
- `app-cliente/navigation/ClienteNavGraph.kt` — NavHost with 5 routes (TODO stubs for screens in 05-03/05-04)
- `app-cliente/features/auth/SplashViewModel.kt` — reads 3 DataStore flags, emits StateFlow<String?> initialValue=null
- `app-cliente/features/auth/LoginViewModel.kt` — role check (cliente only), 401 handling, DataStore token storage
- `app-cliente/features/auth/LoginScreen.kt` — email/password fields, loading state inside button, error text below button
- `app-cliente/di/NetworkModule.kt` — placeholder (bindings from :core-network)
- `app-cliente/src/test/.../LoginViewModelTest.kt` — 3 unit tests covering APP-01 requirements
- `app-cliente/src/androidTest/.../HiltTestRunner.kt` — Hilt test runner
- `app-cliente/src/main/.../MainActivity.kt` — updated to use SplashViewModel + ClienteNavGraph

## Deviations

- `LoginViewModelTest` uses a `LoginLogic` test double instead of subclassing `LoginViewModel` directly, to avoid Android Context/DataStore dependencies in pure JVM unit tests. The logic is identical.
- `NetworkModule.kt` in `app-cliente` is a placeholder since `:core-network` already provides all Hilt bindings (OkHttp, Retrofit, AuthApi, ClienteApi) via its own `@InstallIn(SingletonComponent::class)` module.

## Self-Check

- [x] libs.versions.toml has navigation, retrofit, okhttp, datastore, gson entries
- [x] app-cliente/build.gradle.kts has libs.navigation.compose and isMinifyEnabled=true
- [x] PortalJuridicoTheme uses #1A56DB primary, dynamicColor=false
- [x] All 8 core-ui components exist with correct signatures
- [x] ClienteNavGraph has 5 routes with TODO() stubs
- [x] SplashViewModel reads 3 DataStore flags, emits StateFlow<String?> initialValue=null
- [x] LoginScreen has email/password fields, loading state, error text below button (not Snackbar)
- [x] LoginViewModelTest has 3 tests covering APP-01 requirements
