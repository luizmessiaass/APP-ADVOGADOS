---
phase: 04-android-app-fluxo-advogado
plan: 01
subsystem: android-network-foundation
tags: [android, retrofit, okhttp, moshi, hilt, datastore, jwt, core-network, core-data]
dependency_graph:
  requires: []
  provides:
    - core-network: Retrofit 3 + OkHttp 4.12 + Moshi 1.15.2 + Hilt DI modules
    - core-data: TokenDataStore (DataStore Preferences) + JwtDecoder (local JWT decode)
    - app-escritorio: navigation-compose, browser, kotlinx-serialization-json, buildConfig
  affects:
    - all Wave 2 plans (04-02 through 04-07) depend on this foundation
tech_stack:
  added:
    - retrofit 3.0.0 (native coroutine suspend support)
    - okhttp 4.12.0 (Kotlin HTTP engine + logging interceptor)
    - moshi 1.15.2 with KSP codegen (zero-reflection JSON)
    - navigation-compose 2.9.7 (type-safe routes)
    - datastore-preferences 1.2.1 (async token persistence)
    - jwtdecode 2.0.2 (Auth0 local JWT decode)
    - browser 1.10.0 (Chrome Custom Tabs for Stripe portal)
    - turbine 1.2.0 (Flow assertion in unit tests)
    - kotlinx-serialization-json 1.8.1 (Navigation 2.9 @Serializable routes)
    - hilt-android-testing 2.59.2 (Hilt instrumented test support)
  patterns:
    - AuthInterceptor: OkHttp interceptor reads JWT via runBlocking/DataStore on background thread
    - NetworkConfig data class: avoids BuildConfig circular dependency between :core-network and :app-escritorio
    - AppNetworkModule in app-escritorio provides NetworkConfig with BuildConfig values
    - TokenDataStore: DataStore Preferences with Flow<String?> for reactive token reads
    - JwtDecoder: reads app_metadata.role from Supabase JWT for client-side role routing
key_files:
  created:
    - gradle/libs.versions.toml (12 new version entries + 17 new library entries + kotlin-serialization plugin)
    - core-network/build.gradle.kts (Kotlin + KSP + Hilt + full network deps)
    - core-data/build.gradle.kts (Kotlin + KSP + Hilt + datastore + jwtdecode deps)
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/config/NetworkConfig.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/model/dto/AuthDtos.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/model/dto/ClienteDtos.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/api/AuthApi.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/api/ClienteApi.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/interceptor/AuthInterceptor.kt
    - core-network/src/main/java/com/aethixdigital/portaljuridico/network/di/NetworkModule.kt
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/auth/TokenDataStore.kt
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/auth/JwtDecoder.kt
    - core-data/src/main/java/com/aethixdigital/portaljuridico/data/di/DataModule.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/di/AppNetworkModule.kt
  modified:
    - app-escritorio/build.gradle.kts (kotlin.serialization plugin, navigation-compose, browser, kotlinx-serialization-json, buildConfig=true, API_BASE_URL buildConfigField)
decisions:
  - "NetworkConfig data class in :core-network instead of importing BuildConfig from :app-escritorio — avoids circular module dependency"
  - "Project convention: hilt.android plugin provides Kotlin compilation support implicitly — no explicit kotlin.android plugin needed (matches core-common pattern)"
  - "DataModule provides JwtDecoder as @Singleton via @Provides; TokenDataStore uses @Inject constructor directly"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 13
  files_modified: 3
---

# Phase 04 Plan 01: Network Foundation + Core Modules Summary

**One-liner:** Retrofit 3 + OkHttp 4.12 + Moshi 1.15.2 + Hilt DI wired in :core-network and :core-data with DataStore JWT persistence and local JWT role decode for Supabase app_metadata claims.

## What Was Built

Task 1 added all 12 Phase 4 library versions to `gradle/libs.versions.toml`, fixed the `:core-network` and `:core-data` build files (both now have KSP + Hilt.android plugins enabling Kotlin compilation), and updated `:app-escritorio` with navigation-compose 2.9.7, browser 1.10.0, kotlinx-serialization-json 1.8.1, kotlin.serialization plugin, and `API_BASE_URL` buildConfigField.

Task 2 created the full clean architecture network layer:

- **NetworkConfig** data class in `:core-network` — decouples baseUrl/isDebug from `BuildConfig`, preventing circular dependency with `:app-escritorio`
- **AuthDtos + ClienteDtos** — Moshi `@JsonClass(generateAdapter=true)` DTOs for all API contracts
- **AuthApi** — `POST /api/v1/auth/login` suspend fun
- **ClienteApi** — 5 endpoints: `cadastrarCliente`, `listarClientes`, `previewCliente`, `enviarMensagem`, `getPortalSession`
- **AuthInterceptor** — reads JWT from DataStore via `runBlocking { tokenDataStore.getToken().firstOrNull() }` on OkHttp background thread; injects `Authorization: Bearer {token}`
- **NetworkModule** — Hilt `@InstallIn(SingletonComponent)`: OkHttpClient, Moshi, Retrofit, AuthApi, ClienteApi
- **TokenDataStore** — DataStore Preferences, key `jwt_token`, exposes `Flow<String?>`, `saveToken`, `clearToken`
- **JwtDecoder** — reads `app_metadata.role` from Supabase JWT via `jwt.getClaim("app_metadata").asObject(Map::class.java)?.get("role")`; checks expiry
- **DataModule** — Hilt `@InstallIn(SingletonComponent)`: provides JwtDecoder singleton
- **AppNetworkModule** (in `:app-escritorio`) — provides `NetworkConfig` with `BuildConfig.API_BASE_URL` and `BuildConfig.DEBUG`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Circular dependency prevention via NetworkConfig**
- **Found during:** Task 2
- **Issue:** Plan's initial `NetworkModule` imported `BuildConfig` from `com.aethixdigital.portaljuridico.escritorio.BuildConfig`, creating a circular dependency between `:core-network` and `:app-escritorio`
- **Fix:** Created `NetworkConfig` data class in `:core-network`; `NetworkModule` receives it via Hilt injection; `AppNetworkModule` in `:app-escritorio` provides it with `BuildConfig` values — no circular dep
- **Files modified:** `core-network/network/config/NetworkConfig.kt` (new), `core-network/network/di/NetworkModule.kt`, `app-escritorio/di/AppNetworkModule.kt` (new)
- **Commit:** 367a8e8

**2. [Rule 3 - Linter normalization] kotlin.android plugin convention**
- **Found during:** Task 1 verification
- **Issue:** Linter repeatedly removed explicit `alias(libs.plugins.kotlin.android)` from `core-network` and `core-data` build files. Investigation revealed project convention (established in `core-common`) does not use explicit `kotlin.android` — Hilt.android plugin provides Kotlin support transitively
- **Fix:** Accepted linter normalization; both modules now match `core-common` plugin structure (`android.library + ksp + hilt.android`)
- **Files modified:** `core-network/build.gradle.kts`, `core-data/build.gradle.kts`
- **Commits:** 841ecac, 61c74db

## Known Stubs

None — this plan creates infrastructure/contracts only. No UI components, no data rendered to screen.

## Threat Flags

No new threat surface beyond what was declared in the plan's `<threat_model>`. All security mitigations implemented:

| T-ID | Status |
|------|--------|
| T-04-01-01 | Mitigated — `clearToken()` implemented in TokenDataStore |
| T-04-01-02 | Accepted — app reads role for routing only; backend RLS is authoritative |
| T-04-01-03 | Mitigated — `HttpLoggingInterceptor` gated by `networkConfig.isDebug` in NetworkModule |
| T-04-01-04 | Accepted — single-user app, OkHttp timeout covers edge case |
| T-04-01-05 | Mitigated — `baseUrl` from `NetworkConfig` injected at build time via Hilt, not modifiable at runtime |

## Self-Check

### Files Exist
- [x] `gradle/libs.versions.toml` — FOUND
- [x] `core-network/build.gradle.kts` — FOUND
- [x] `core-data/build.gradle.kts` — FOUND
- [x] `core-network/.../network/config/NetworkConfig.kt` — FOUND
- [x] `core-network/.../network/model/dto/AuthDtos.kt` — FOUND
- [x] `core-network/.../network/model/dto/ClienteDtos.kt` — FOUND
- [x] `core-network/.../network/api/AuthApi.kt` — FOUND
- [x] `core-network/.../network/api/ClienteApi.kt` — FOUND
- [x] `core-network/.../network/interceptor/AuthInterceptor.kt` — FOUND
- [x] `core-network/.../network/di/NetworkModule.kt` — FOUND
- [x] `core-data/.../data/auth/TokenDataStore.kt` — FOUND
- [x] `core-data/.../data/auth/JwtDecoder.kt` — FOUND
- [x] `core-data/.../data/di/DataModule.kt` — FOUND
- [x] `app-escritorio/.../escritorio/di/AppNetworkModule.kt` — FOUND

### Commits Exist
- [x] `0ce1f9a` — feat(04-01): version catalog + Kotlin plugin fix
- [x] `367a8e8` — feat(04-01): core-network and core-data layer
- [x] `841ecac` — fix(04-01): restore kotlin.android plugin (linter normalization)
- [x] `61c74db` — fix(04-01): normalize core-network build

## Self-Check: PASSED
