# Phase 0: Android Bootstrap & Cleanup - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the minimal `com.example.appteste` scaffold into a production-ready Android foundation: renamed package, multi-module structure, Hilt DI, updated dependencies, R8 minification enabled, and baseline CI — so all subsequent Android work builds on a clean foundation instead of fighting legacy debt.

Scope: Android project structure and tooling only. No business logic, no networking, no backend integration.

</domain>

<decisions>
## Implementation Decisions

### Package name & Application IDs
- **D-01:** Base Kotlin package: `com.aethixdigital.portaljuridico`
- **D-02:** Company behind the product: AETHIX DIGITAL
- **D-03:** `:app-escritorio` applicationId: `com.aethixdigital.portaljuridico.escritorio` (single app, no flavors)
- **D-04:** `:app-cliente` applicationId: flavor-based — default dev/CI flavor is `demo`, applicationId = `com.aethixdigital.portaljuridico.demo`
- **D-05:** All source directories renamed from `com/example/appteste` to `com/aethixdigital/portaljuridico`

### White-label architecture (app-cliente only)
- **D-06:** `app-cliente` is white-labeled per law office via Gradle productFlavors. Each flavor = one office.
- **D-07:** `app-escritorio` is a single centralized admin app shared by all offices (no white-label).
- **D-08:** The `app_name` string lives in `src/{flavorName}/res/values/strings.xml` per flavor, with the law office name as value.
- **D-09:** Phase 0 establishes the flavor mechanism with one flavor (`demo`). Per-office flavors are added when offices onboard (future operational process, not in Phase 0 plan).
- **D-10:** ⚠️ Architecture deviation from ROADMAP: ROADMAP assumed a single multi-tenant app. White-label flavors change the release model — downstream phases (4: app_escritorio, 5: app_cliente) must account for this.

### Module structure
- **D-11:** Six-module layout:
  - `:core-common` — utilities, constants, shared Kotlin extensions
  - `:core-network` — OkHttp/Retrofit setup (stub in Phase 0, populated in later phases)
  - `:core-data` — Room, repositories (stub in Phase 0)
  - `:core-ui` — shared theme (APPTESTETheme renamed), colors, typography, reusable Compose components
  - `:app-cliente` — client-facing app with MainActivity, productFlavors configured
  - `:app-escritorio` — admin app with its own MainActivity
- **D-12:** Migration strategy: existing code is moved to modules (not left in `:app`). The original `:app` module is removed.
  - `MainActivity.kt` → `:app-cliente`
  - `ui/theme/` (Color.kt, Theme.kt, Type.kt) → `:core-ui`
  - `:app-escritorio` gets a minimal stub MainActivity
- **D-13:** Hilt trivial sample: a `@Singleton`-scoped `AppConfig` or `Logger` class in `:core-common`, injected in `:app-cliente`'s MainActivity to prove DI resolves at runtime.

### Dependencies & build config
- **D-14:** Compose BOM upgraded from 2024.09.00 to latest stable (researcher to confirm exact version at planning time).
- **D-15:** Kotlin and AGP upgraded to current stable (researcher to confirm). Keep Java 11 source compatibility.
- **D-16:** R8/minification enabled in release builds (`isMinifyEnabled = true`). ProGuard rules updated to preserve Compose + Hilt.
- **D-17:** Version catalog (`gradle/libs.versions.toml`) is the single source of truth for all dependency versions across all modules.

### CI baseline
- **D-18:** GitHub Actions workflow on every push/PR to main/master.
- **D-19:** Steps: `./gradlew lint` → `./gradlew test` → `./gradlew assembleDebug` (demo flavor for app-cliente).
- **D-20:** No emulator/instrumented tests in Phase 0 CI. Target run time: ~3-5 minutes.
- **D-21:** Backend CI (Node.js/Supabase) will be set up in Phase 1 — this workflow is Android-only.

### Claude's Discretion
- Exact Hilt version and which Hilt artifacts to include
- ProGuard rules specifics (standard Hilt + Compose rules are well-documented)
- Exact Compose BOM and Kotlin/AGP version numbers (pick latest stable at research time)
- `core-network` and `core-data` module internal structure (stubs, can be near-empty)
- GitHub Actions runner image and caching strategy

</decisions>

<specifics>
## Specific Ideas

- "O app vai ter o nome do escritório" — each law office gets their own white-labeled app-cliente build with the office name as the app display name. This is the core white-label requirement.
- The `demo` flavor serves as the development and CI baseline. It's a placeholder flavor that proves the flavor mechanism works.
- The admin app (`app-escritorio`) does NOT need white-labeling — advogados/admins use one centralized app regardless of which office they belong to.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` §"Project Bootstrap (BOOT)" — BOOT-01 through BOOT-06 define all acceptance criteria for this phase
- `.planning/ROADMAP.md` §"Phase 0: Android Bootstrap & Cleanup" — Success criteria and phase goal

### Current Android scaffold (baseline to transform)
- `app/build.gradle.kts` — Current build config (single module, no Hilt, minification disabled, old BOM)
- `gradle/libs.versions.toml` — Current version catalog to upgrade
- `settings.gradle.kts` — Current single-module settings to expand to multi-module
- `app/src/main/java/com/example/appteste/MainActivity.kt` — Code to migrate to :app-cliente
- `app/src/main/java/com/example/appteste/ui/theme/` — Theme to migrate to :core-ui

No external specs or ADRs beyond the above — all requirements captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `APPTESTETheme` composable (Theme.kt) → will be renamed and moved to `:core-ui`; Material3 setup already done, just needs relocation
- `Greeting` composable (MainActivity.kt) → temporary scaffold, can be replaced with a stub screen in `:app-cliente`
- `Color.kt`, `Type.kt` → move to `:core-ui` as-is, rename if needed for clarity

### Established Patterns
- Material3 + Jetpack Compose BOM — already in use, continue with same pattern
- Version catalog in `gradle/libs.versions.toml` — all new dependencies must be added here
- `compileOptions { sourceCompatibility = JavaVersion.VERSION_11 }` — keep Java 11 across all modules

### Integration Points
- Each new module needs its own `build.gradle.kts` applying the right plugin (`com.android.library` for core/feature modules, `com.android.application` for app modules)
- `settings.gradle.kts` must include all 6 new modules via `include(":core-common", ":core-network", ...)`
- Hilt's `@HiltAndroidApp` goes on the Application class in `:app-cliente` and `:app-escritorio`

</code_context>

<deferred>
## Deferred Ideas

- **Per-office flavor automation:** A script or tooling to generate a new Gradle flavor when a new law office onboards. Useful operationally but out of scope for Phase 0's bootstrap goal.
- **Per-office branding beyond app name:** Custom colors, logo, splash screen per flavor. Phase 0 only establishes the flavor mechanism with `app_name`. Visual branding can be layered on later.
- **ROADMAP update for white-label:** The ROADMAP currently describes `app-cliente` as a standard multi-tenant app (Phase 5). The ROADMAP should be updated to reflect the white-label model. This is a documentation task, not a code task — recommended for the planning step of Phase 5 or as a quick update now.

</deferred>

---

*Phase: 00-android-bootstrap-cleanup*
*Context gathered: 2026-04-14*
