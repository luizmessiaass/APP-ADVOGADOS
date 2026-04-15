# Phase 0: Android Bootstrap & Cleanup - Research

**Researched:** 2026-04-14
**Domain:** Android multi-module Gradle setup, Hilt DI, R8 minification, productFlavors, GitHub Actions CI
**Confidence:** HIGH (primary findings verified via official Android Developers docs and Maven repository)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Base Kotlin package: `com.aethixdigital.portaljuridico`
- **D-02:** Company behind the product: AETHIX DIGITAL
- **D-03:** `:app-escritorio` applicationId: `com.aethixdigital.portaljuridico.escritorio` (single app, no flavors)
- **D-04:** `:app-cliente` applicationId: flavor-based — default dev/CI flavor is `demo`, applicationId = `com.aethixdigital.portaljuridico.demo`
- **D-05:** All source directories renamed from `com/example/appteste` to `com/aethixdigital/portaljuridico`
- **D-06:** `app-cliente` is white-labeled per law office via Gradle productFlavors. Each flavor = one office.
- **D-07:** `app-escritorio` is a single centralized admin app shared by all offices (no white-label).
- **D-08:** The `app_name` string lives in `src/{flavorName}/res/values/strings.xml` per flavor, with the law office name as value.
- **D-09:** Phase 0 establishes the flavor mechanism with one flavor (`demo`). Per-office flavors are added when offices onboard (future operational process, not in Phase 0 plan).
- **D-10:** Architecture deviation: ROADMAP assumed single multi-tenant app; white-label flavors change the release model.
- **D-11:** Six-module layout: `:core-common`, `:core-network`, `:core-data`, `:core-ui`, `:app-cliente`, `:app-escritorio`
- **D-12:** Migration strategy — existing code moved to modules, original `:app` module removed. `MainActivity.kt` → `:app-cliente`; `ui/theme/` → `:core-ui`; `:app-escritorio` gets minimal stub MainActivity.
- **D-13:** Hilt trivial sample: `@Singleton`-scoped `AppConfig` or `Logger` class in `:core-common`, injected in `:app-cliente`'s MainActivity.
- **D-14:** Compose BOM upgraded from `2024.09.00` to latest stable (researcher to confirm exact version at planning time).
- **D-15:** Kotlin and AGP upgraded to current stable. Keep Java 11 source compatibility.
- **D-16:** R8/minification enabled in release builds (`isMinifyEnabled = true`). ProGuard rules updated to preserve Compose + Hilt.
- **D-17:** Version catalog (`gradle/libs.versions.toml`) is the single source of truth for all dependency versions across all modules.
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

### Deferred Ideas (OUT OF SCOPE)

- Per-office flavor automation script
- Per-office branding beyond app name (custom colors, logo, splash screen)
- ROADMAP update for white-label (documentation task, not code task)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOOT-01 | Pacote Android renomeado de `com.example.appteste` para pacote de produção | Package rename procedure: namespace + applicationId + source dirs + manifest + imports |
| BOOT-02 | Compose BOM atualizado para versão atual (2024.09.00 está desatualizado) | Latest stable BOM: `2026.03.00` [VERIFIED via WebSearch cross-referencing Android Developers blog] |
| BOOT-03 | Minificação habilitada em builds de release (`isMinifyEnabled = true`) | R8 rules for Compose + Hilt documented in Standard Stack section |
| BOOT-04 | Estrutura multi-módulo Android criada: `:core-common`, `:core-network`, `:core-data`, `:core-ui`, `:app-cliente`, `:app-escritorio` | Multi-module build.gradle.kts patterns documented; settings.gradle.kts expansion covered |
| BOOT-05 | DI framework (Hilt) configurado no projeto Android | Hilt 2.57.1 with KSP — full setup pattern documented including multi-module constraints |
| BOOT-06 | Dependências Android verificadas e atualizadas para versões atuais | All versions verified/confirmed in Standard Stack section |
</phase_requirements>

---

## Summary

Phase 0 transforms the minimal `com.example.appteste` scaffold into a production-ready Android multi-module foundation. The work spans four distinct concerns: (1) renaming the package and source directories, (2) restructuring the single `:app` module into six modules, (3) wiring Hilt DI with KSP across the module graph, and (4) enabling R8 minification with correct ProGuard rules plus a minimal GitHub Actions CI workflow.

The most critical technical constraint is that the current project uses AGP 9.1.1 with a non-standard `compileSdk { version = release(36) { minorApiLevel = 1 } }` DSL — this syntax is specific to AGP 9.x and must be preserved in each app module's build.gradle.kts. Library modules use `compileSdk = 36` (integer form). All modules must declare their own `namespace` property since AGP 9.0 removed manifest-based package inference.

Hilt in regular library modules (`:core-common`, `:core-ui`, etc.) works with the standard `@Inject` and `@Module`/`@InstallIn` annotations. The `@HiltAndroidApp` annotation goes only on the Application class in each app module (`:app-cliente` and `:app-escritorio`). KSP must be applied in every module that uses Hilt — KAPT is deprecated.

**Primary recommendation:** Use the six-module structure without convention plugins (build-logic). For six modules, direct per-module build.gradle.kts files are simpler and readable; convention plugins become worth the complexity at 10+ modules. Use KSP 2.x with Hilt 2.57.1 — never KAPT.

---

## Standard Stack

### Core Dependencies (verified versions as of April 2026)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Compose BOM | `2026.03.00` | Manages all Compose library versions in lockstep | Official Google BOM; latest stable as of April 2026 |
| Kotlin | `2.2.10` | Language (already in project) | Current stable; matches existing project |
| AGP | `9.1.1` | Android build tooling (already in project) | Current stable; already in project |
| Hilt | `2.57.1` | Dependency injection | Google's first-party DI; compile-time safety |
| KSP | `2.2.10-1.0.31` | Annotation processing for Hilt | Replaces KAPT; 2x faster; KSP2 default since 2025 |
| AndroidX Hilt | `1.2.0` | Hilt extensions for ViewModel, WorkManager | Required for `@HiltViewModel` in later phases |

[VERIFIED: WebSearch cross-referencing developer.android.com, dagger.dev/hilt, android-developers blog]

### Supporting Libraries (no changes needed in Phase 0)

| Library | Current Version | Status |
|---------|----------------|--------|
| androidx.core:core-ktx | 1.18.0 | Keep — current stable |
| androidx.lifecycle:lifecycle-runtime-ktx | 2.10.0 | Keep — current stable |
| androidx.activity:activity-compose | 1.13.0 | Keep — current stable |
| JUnit 4 | 4.13.2 | Keep — unit testing |
| Espresso | 3.7.0 | Keep — UI testing (not run in CI Phase 0) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hilt | Koin | Koin is runtime-based (no compile-time DI safety); Hilt integrates natively with Android lifecycle components |
| KSP | KAPT | KAPT is deprecated; KSP is 2x faster; KSP2 is default since 2025 |
| Convention plugins | Per-module build.gradle.kts | Convention plugins DRY up build logic at 10+ modules; for 6 modules, per-module files are simpler to debug |

**Installation additions to libs.versions.toml:**
```toml
[versions]
# Existing — upgrade
composeBom = "2026.03.00"

# New additions
hilt = "2.57.1"
hiltNavigationCompose = "1.2.0"
ksp = "2.2.10-1.0.31"

[libraries]
# New additions
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }

[plugins]
# Existing — keep
android-application = { id = "com.android.application", version.ref = "agp" }
android-library = { id = "com.android.library", version.ref = "agp" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
# New additions
hilt-android = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

[CITED: developer.android.com/training/dependency-injection/hilt-android]

---

## Architecture Patterns

### Recommended Project Structure

```
(project root)/
├── settings.gradle.kts              # include all 6 modules
├── build.gradle.kts                 # root build — plugins apply false
├── gradle/
│   └── libs.versions.toml           # single source of truth for all versions
├── core-common/
│   ├── build.gradle.kts             # android.library + hilt + ksp
│   └── src/main/java/com/aethixdigital/portaljuridico/common/
│       └── AppConfig.kt             # @Singleton @Inject constructor sample
├── core-network/
│   ├── build.gradle.kts             # android.library stub
│   └── src/main/java/...network/   # empty stub for Phase 0
├── core-data/
│   ├── build.gradle.kts             # android.library stub
│   └── src/main/java/...data/      # empty stub for Phase 0
├── core-ui/
│   ├── build.gradle.kts             # android.library + compose + kotlin.compose
│   └── src/main/java/...ui/theme/  # Color.kt, Theme.kt, Type.kt (migrated)
├── app-cliente/
│   ├── build.gradle.kts             # android.application + hilt + ksp + compose + flavors
│   ├── proguard-rules.pro           # Hilt + Compose keep rules
│   └── src/
│       ├── main/
│       │   ├── java/com/aethixdigital/portaljuridico/cliente/
│       │   │   ├── ClienteApp.kt    # @HiltAndroidApp Application class
│       │   │   └── MainActivity.kt  # @AndroidEntryPoint
│       │   └── res/values/strings.xml  # app_name = "Portal Jurídico" (default)
│       └── demo/
│           └── res/values/strings.xml  # app_name = "Demo Escritório"
└── app-escritorio/
    ├── build.gradle.kts             # android.application + hilt + ksp + compose
    ├── proguard-rules.pro           # Hilt + Compose keep rules
    └── src/main/java/com/aethixdigital/portaljuridico/escritorio/
        ├── EscritorioApp.kt         # @HiltAndroidApp
        └── MainActivity.kt          # stub
```

### Pattern 1: Android Library Module build.gradle.kts (with Compose)

Used by: `:core-ui`

```kotlin
// core-ui/build.gradle.kts
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.aethixdigital.portaljuridico.ui"
    compileSdk = 36

    defaultConfig {
        minSdk = 27
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
```

[CITED: developer.android.com/build/configure-app-module]

### Pattern 2: Android Library Module build.gradle.kts (Hilt, no Compose)

Used by: `:core-common`, `:core-network`, `:core-data`

```kotlin
// core-common/build.gradle.kts
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt.android)
}

android {
    namespace = "com.aethixdigital.portaljuridico.common"
    compileSdk = 36

    defaultConfig {
        minSdk = 27
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
}
```

### Pattern 3: Android Application Module with productFlavors (app-cliente)

```kotlin
// app-cliente/build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt.android)
}

android {
    namespace = "com.aethixdigital.portaljuridico.cliente"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        minSdk = 27
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "tenant"
    productFlavors {
        create("demo") {
            dimension = "tenant"
            applicationId = "com.aethixdigital.portaljuridico.demo"
        }
        // Future: add one flavor per law office during onboarding
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(project(":core-common"))
    implementation(project(":core-ui"))
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(platform(libs.androidx.compose.bom))
    // ... other compose deps
}
```

[CITED: developer.android.com/build/build-variants]

### Pattern 4: Hilt Application Class and @Inject Sample

```kotlin
// app-cliente/src/main/java/.../cliente/ClienteApp.kt
@HiltAndroidApp
class ClienteApp : Application()

// core-common/src/main/java/.../common/AppConfig.kt
@Singleton
class AppConfig @Inject constructor() {
    val isDebug: Boolean = BuildConfig.DEBUG
}

// app-cliente/src/main/java/.../cliente/MainActivity.kt
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var appConfig: AppConfig

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // appConfig is injected and available here
    }
}
```

[CITED: developer.android.com/training/dependency-injection/hilt-android]

### Pattern 5: settings.gradle.kts Multi-Module Declaration

```kotlin
// settings.gradle.kts
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "PortalJuridico"
include(
    ":core-common",
    ":core-network",
    ":core-data",
    ":core-ui",
    ":app-cliente",
    ":app-escritorio"
)
// Note: original :app module is NOT included — it is deleted
```

### Pattern 6: Root build.gradle.kts for Multi-Module

```kotlin
// build.gradle.kts (root)
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt.android) apply false
    alias(libs.plugins.ksp) apply false
}
```

### Pattern 7: GitHub Actions CI Workflow

```yaml
# .github/workflows/android-ci.yml
name: Android CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle

      - name: Grant execute permission for gradlew
        run: chmod +x gradlew

      - name: Run lint
        run: ./gradlew lint

      - name: Run unit tests
        run: ./gradlew test

      - name: Assemble demo debug APK
        run: ./gradlew :app-cliente:assembleDemoDebug

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: demo-debug-apk
          path: app-cliente/build/outputs/apk/demo/debug/*.apk
```

[CITED: github.com/actions/setup-java, github.com/gradle/actions]

### Anti-Patterns to Avoid

- **Using KAPT instead of KSP for Hilt:** KAPT is deprecated in 2025. It processes annotations on JVM stubs, which is 2x slower and does not support K2 compiler fully. Use `ksp("com.google.dagger:hilt-android-compiler:2.57.1")` instead.
- **Applying Hilt plugin only in app modules:** Every module that uses `@Inject`, `@Module`, or `@InstallIn` must apply both the Hilt plugin AND KSP plugin and declare `ksp(libs.hilt.compiler)`. Failing to do this produces cryptic "Dagger components not found" build errors.
- **Using `buildSrc` for shared build logic:** Gradle docs deprecate buildSrc in favor of `build-logic` with `includeBuild`. For this project with 6 modules, skip both — direct per-module files are simpler.
- **Omitting `namespace` in library modules:** AGP 9.0+ requires explicit `namespace` in every module's build.gradle.kts. Without it, R class generation fails.
- **Putting `@HiltAndroidApp` on a class in a library module:** Only Application subclasses in `com.android.application` modules can be annotated with `@HiltAndroidApp`. Library modules use `@Module`/`@InstallIn`.
- **Adding `applicationId` to library module build.gradle.kts:** Library modules do not have `applicationId`. Only `com.android.application` modules declare `applicationId`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dependency injection | Manual service locator / static singletons | Hilt 2.57.1 | Compile-time safety, Android lifecycle integration, testability |
| Annotation processing for DI | KAPT custom annotation processor | KSP 2.2.10-1.0.31 | 2x faster, K2 compatible, default since 2025 |
| App-level dependency graph | Manual Dagger component setup | `@HiltAndroidApp` + `@AndroidEntryPoint` | Hilt generates the entire component hierarchy |
| Build variant management | Custom Gradle tasks per variant | `productFlavors` + `flavorDimensions` | AGP handles merge of sources, resources, and manifests |
| Code shrinking | Custom bytecode manipulator | R8 with `proguard-android-optimize.txt` | R8 is the official AGP shrinker — it knows AGP internals |

**Key insight:** Hilt's annotation processing generates all the boilerplate (Dagger components, factories, member injectors) at compile time. Hand-rolling any part of this means losing the generated bindings and getting runtime crashes that look like missing dependencies.

---

## Runtime State Inventory

Step 2.5 SKIPPED: This is a greenfield/bootstrap phase, not a rename/refactor of existing runtime state. The package rename affects source files only — there is no production app installed on user devices, no database storing the old package name, and no external service referencing `com.example.appteste`. The Android package name has no runtime persistence outside the APK itself.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Gradle Wrapper | All build tasks | Already present | 9.3.1 | — |
| Android SDK (API 36) | `compileSdk = 36` | Assumed present | API 36 | — |
| JDK 17 | AGP 9.x requirement | Check local env | Unknown | Install Temurin 17 |
| GitHub Actions runner | CI workflow | ✓ (cloud service) | ubuntu-latest | — |

**Note on JDK:** AGP 9.1.0 requires JDK 17 minimum. The current project CLAUDE.md lists Java 11 source/target compatibility — this is the `sourceCompatibility` setting (the bytecode target), NOT the JDK version. Android Studio bundles JDK 17+. CI uses `actions/setup-java@v4` with `java-version: '17'`.

[ASSUMED: Local Android SDK installation status — verify before executing]

---

## Common Pitfalls

### Pitfall 1: AGP 9.x compileSdk Syntax Mismatch in Library Modules

**What goes wrong:** Developer copies the `compileSdk { version = release(36) { minorApiLevel = 1 } }` block from the app module into a library module. Library modules do not support this DSL — they require integer form.

**Why it happens:** The `release()` API with `minorApiLevel` is only valid in `com.android.application` modules (AGP 9.x feature for Android 36.1).

**How to avoid:** Use `compileSdk = 36` (integer) in all `com.android.library` modules. Only app modules use the `release()` block.

**Warning signs:** `Unresolved reference: release` error during Gradle sync in a library module.

### Pitfall 2: Hilt Missing in Transitive Dependency Module

**What goes wrong:** `:core-common` provides `AppConfig` with `@Inject`. `:app-cliente` uses it. If `:core-common`'s build.gradle.kts does not apply the Hilt plugin and declare `ksp(libs.hilt.compiler)`, Hilt's code generation for `:core-common` types never runs, and the app-level Hilt component cannot find the binding.

**Why it happens:** Hilt code generation requires the KSP compiler annotation to be applied in the exact module where `@Inject` is declared, not only in the app module.

**How to avoid:** Every module with any Hilt annotation must declare both `alias(libs.plugins.hilt.android)` and `ksp(libs.hilt.compiler)` in its own build.gradle.kts.

**Warning signs:** `MissingBinding` runtime crash or `[Hilt] Unresolved dependency` build error.

### Pitfall 3: productFlavor Missing flavorDimension

**What goes wrong:** Adding `productFlavors { create("demo") { ... } }` without `flavorDimensions += "tenant"` causes AGP to fail at sync with "All flavors must belong to a named flavor dimension."

**Why it happens:** AGP requires every flavor to be assigned to a dimension, even if there is only one dimension.

**How to avoid:** Always declare `flavorDimensions += "tenant"` (or whatever dimension name) before the `productFlavors` block.

**Warning signs:** Gradle sync error: `Error: All flavors must belong to a named flavor dimension`.

### Pitfall 4: R8 Stripping Hilt-Generated Classes

**What goes wrong:** Release build installs but crashes on startup with `ClassNotFoundException` for Hilt-generated `_HiltComponents` or `Hilt_MainActivity`.

**Why it happens:** R8 cannot trace through Hilt's generated component structure without keep rules. The generated classes are referenced only via reflection at the Application level.

**How to avoid:** Add the standard Hilt + Compose keep rules to `proguard-rules.pro` (see Code Examples). The `getDefaultProguardFile("proguard-android-optimize.txt")` already covers many common cases but not Hilt specifics.

**Warning signs:** App crashes on first launch in release build; debug build is fine.

### Pitfall 5: Source Directory Not Updated After Package Rename

**What goes wrong:** Kotlin files are moved to the new directory (`com/aethixdigital/portaljuridico/`), but the `package` declaration at the top of each file still says `package com.example.appteste`. The file compiles but R class references fail at runtime.

**Why it happens:** Android Studio's refactoring can be partial — it moves files but may miss updating import statements in other files or the package declarations in moved files.

**How to avoid:** After all file moves, do a project-wide search for `com.example.appteste` and verify zero occurrences remain. Then `./gradlew clean build`.

**Warning signs:** `R class not found` or `unresolved reference` import errors after rename.

### Pitfall 6: Namespace vs applicationId Confusion

**What goes wrong:** Developer sets `namespace = "com.aethixdigital.portaljuridico.demo"` in `:app-cliente` thinking it needs to match the flavor's applicationId. This causes R class conflicts between the main source set and the flavor's resources.

**Why it happens:** `namespace` and `applicationId` are independent concerns since AGP 7.3+. `namespace` = R class package. `applicationId` = Play Store ID.

**How to avoid:** `namespace` should be the module's stable base package (same for all flavors): `com.aethixdigital.portaljuridico.cliente`. Only `applicationId` changes per flavor.

**Warning signs:** Duplicate class errors in R.java or resource merge conflicts.

### Pitfall 7: Missing AndroidManifest.xml in Each New Module

**What goes wrong:** A new library module builds without error locally, but another module that depends on it fails to merge manifests because the library module has no `AndroidManifest.xml`.

**Why it happens:** Android library modules require a minimal manifest even if they declare no activities. AGP generates a stub, but it may not always be created automatically when creating directories manually.

**How to avoid:** Every Android library module needs at minimum: `src/main/AndroidManifest.xml` with `<manifest package="com.aethixdigital.portaljuridico.{module}" />`.

---

## Code Examples

### ProGuard Rules for Hilt + Compose (proguard-rules.pro)

```proguard
# Hilt / Dagger
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class dagger.** { *; }
-dontwarn dagger.hilt.**
-dontwarn javax.inject.**

# Hilt-generated components (critical: without this, release crashes on startup)
-keep class * extends dagger.hilt.android.internal.managers.ApplicationComponentManager { *; }
-keep @dagger.hilt.android.HiltAndroidApp class * { *; }
-keep @dagger.hilt.android.AndroidEntryPoint class * { *; }

# Jetpack Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Kotlin metadata (required for reflection-based APIs)
-keep class kotlin.Metadata { *; }
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations

# Keep Kotlin coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
```

[CITED: android-developers.googleblog.com/2025/11/configure-and-troubleshoot-r8-keep-rules.html]

### Minimal AndroidManifest.xml for a Library Module

```xml
<!-- core-common/src/main/AndroidManifest.xml -->
<manifest />
```

### Application Class with @HiltAndroidApp

```kotlin
// app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/ClienteApp.kt
package com.aethixdigital.portaljuridico.cliente

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class ClienteApp : Application()
```

Note: `ClienteApp` must be registered in `app-cliente`'s `AndroidManifest.xml`:
```xml
<application
    android:name=".ClienteApp"
    ...>
```

### AppConfig Sample in :core-common (proves DI works across modules)

```kotlin
// core-common/src/main/java/com/aethixdigital/portaljuridico/common/AppConfig.kt
package com.aethixdigital.portaljuridico.common

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppConfig @Inject constructor() {
    val appVersion: String = "1.0.0"
    val environment: String = "demo"
}
```

### MainActivity Consuming @Inject from :core-common

```kotlin
// app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/MainActivity.kt
package com.aethixdigital.portaljuridico.cliente

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.aethixdigital.portaljuridico.common.AppConfig
import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var appConfig: AppConfig

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PortalJuridicoTheme {
                // Stub UI — appConfig injected successfully if no crash here
            }
        }
    }
}
```

### per-flavor strings.xml for White-Label app_name

```xml
<!-- app-cliente/src/demo/res/values/strings.xml -->
<resources>
    <string name="app_name">Demo Escritório</string>
</resources>

<!-- app-cliente/src/main/res/values/strings.xml -->
<resources>
    <!-- app_name is intentionally omitted here; each flavor provides it -->
</resources>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| KAPT for annotation processing | KSP (Kotlin Symbol Processing) | 2023 (stable), 2025 (KAPT deprecated) | 2x faster builds; KSP2 is default |
| Single `:app` module | Multi-module with `:core-*` and `:app-*` | Industry standard since 2022 | Better build caching, parallel compilation |
| Compose BOM 2024.09.00 | Compose BOM 2026.03.00 | March 2026 | Compose 1.10 + Material3 1.4 |
| `apply plugin:` Groovy DSL | `alias(libs.plugins.*)` Kotlin DSL | 2022+ | Type-safe, IDE-autocomplete |
| `buildSrc` for build logic | `build-logic` with `includeBuild` | 2022 (Gradle guidance) | Faster incremental builds |
| `isMinifyEnabled = false` in release | `isMinifyEnabled = true` with R8 | Best practice since 2019 | Smaller APK, basic obfuscation |

**Deprecated/outdated in current project:**
- `com.example.appteste` package: placeholder namespace, must be replaced before any release
- `composeBom = "2024.09.00"`: 18 months behind current stable, missing Compose 1.7/1.8/1.9/1.10 improvements
- `isMinifyEnabled = false`: Security and size risk for release builds
- Missing `android-library` plugin alias in root build: needed for all 4 library modules

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Compose BOM `2026.03.00` is the latest stable as of April 2026 | Standard Stack | Planner picks wrong version; need to verify with mvnrepository before writing version catalog |
| A2 | KSP version `2.2.10-1.0.31` is compatible with Kotlin 2.2.10 | Standard Stack | Build fails with KSP/Kotlin version mismatch; verify at github.com/google/ksp/releases |
| A3 | Hilt 2.57.1 is the latest stable | Standard Stack | Using outdated Hilt; low risk — any recent 2.5x version is fine |
| A4 | Local Android SDK has API 36 platform installed | Environment Availability | `./gradlew build` fails with "Platform android-36 not found" |
| A5 | Java 11 sourceCompatibility remains valid with AGP 9.x and JDK 17 | Architecture Patterns | Build warning or error; AGP 9.x requires JDK 17 runtime but allows Java 11 source target |

---

## Open Questions

1. **KSP exact version for Kotlin 2.2.10**
   - What we know: KSP uses versioning scheme `<Kotlin Version>-<KSP Version>`. Kotlin 2.2.10 is in use. KSP 2.2.10-RC2-2.0.2 exists (RC).
   - What's unclear: Whether a stable (non-RC) KSP release for Kotlin 2.2.10 is available, or if the RC is the current best option.
   - Recommendation: Before executing the plan, run `./gradlew dependencies` after adding KSP to verify compatibility. If only RC available, use it — RC KSP releases are production-quality for this use case.

2. **compileSdk syntax in library modules**
   - What we know: App modules use `compileSdk { version = release(36) { minorApiLevel = 1 } }`. Library modules use integer `compileSdk = 36`.
   - What's unclear: Whether library modules with AGP 9.1.x also support the `release()` DSL or require integer form.
   - Recommendation: Use integer form `compileSdk = 36` in all library modules — this is the documented library module API and avoids AGP version-specific DSL ambiguity.

3. **Hilt in :app-escritorio stub**
   - What we know: `:app-escritorio` gets a minimal stub MainActivity. Hilt requires `@HiltAndroidApp` on Application class.
   - What's unclear: Whether Phase 0's `:app-escritorio` stub needs full Hilt wiring or can be deferred.
   - Recommendation: Wire Hilt in `:app-escritorio` the same way as `:app-cliente` in Phase 0. Installing Hilt late in a module is harder than doing it from the start.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 4.13.2 (already present) |
| Config file | None — standard Android test runner |
| Quick run command | `./gradlew test` |
| Full suite command | `./gradlew test lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOT-01 | Package `com.example.appteste` does not exist in any source file | Build verification | `./gradlew build` — fails if old package referenced | ❌ Wave 0 |
| BOOT-02 | Compose BOM version in libs.versions.toml is `2026.03.00` | Config verification | `./gradlew dependencies \| grep compose-bom` | ❌ Wave 0 |
| BOOT-03 | Release build log contains R8 shrinking output | Build verification | `./gradlew :app-cliente:assembleDemoRelease` log check | ❌ Wave 0 |
| BOOT-04 | All 6 modules compile independently | Build verification | `./gradlew build` — must succeed with zero errors | ❌ Wave 0 |
| BOOT-05 | Hilt @Inject resolves at runtime (no crash) | Smoke test | `./gradlew :app-cliente:testDemoDebugUnitTest` | ❌ Wave 0 |
| BOOT-06 | `./gradlew build` passes | Integration build | `./gradlew build` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `./gradlew :app-cliente:assembleDemoDebug`
- **Per wave merge:** `./gradlew build lint test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `core-common/src/test/java/.../AppConfigTest.kt` — unit test that instantiates AppConfig without DI (pure unit test, no Hilt needed)
- [ ] No Hilt test harness needed in Phase 0 — runtime DI verification is done by the app not crashing during assembleDebug

---

## Security Domain

**Note:** Phase 0 is build infrastructure only. No network calls, no user data, no authentication. ASVS categories do not apply to this phase.

| ASVS Category | Applies | Rationale |
|---------------|---------|-----------|
| V2 Authentication | No | No auth code in Phase 0 |
| V3 Session Management | No | No sessions in Phase 0 |
| V4 Access Control | No | No access control in Phase 0 |
| V5 Input Validation | No | No user input in Phase 0 |
| V6 Cryptography | No | No crypto in Phase 0 |

**However, one security-adjacent concern applies:**

R8 minification in release builds (`isMinifyEnabled = true`) provides basic obfuscation that makes reverse engineering harder. This is a security hygiene requirement (BOOT-03) and is covered in the Architecture Patterns section above.

---

## Sources

### Primary (HIGH confidence)
- [developer.android.com/training/dependency-injection/hilt-android](https://developer.android.com/training/dependency-injection/hilt-android) — Hilt setup, @HiltAndroidApp, @Inject patterns, version catalog entries
- [developer.android.com/training/dependency-injection/hilt-multi-module](https://developer.android.com/training/dependency-injection/hilt-multi-module) — Hilt in multi-module: library module constraints, @EntryPoint pattern
- [developer.android.com/build/build-variants](https://developer.android.com/build/build-variants) — productFlavors, flavorDimensions, source sets, applicationId per flavor
- [developer.android.com/build/releases/agp-9-1-0-release-notes](https://developer.android.com/build/releases/agp-9-1-0-release-notes) — AGP 9.1.0 latest stable, JDK 17 requirement, API 36.1 support
- [android-developers.googleblog.com — Compose December 2025 release](https://android-developers.googleblog.com/2025/12/whats-new-in-jetpack-compose-december.html) — BOM 2025.12.x confirmed stable
- [android-developers.googleblog.com — R8 Keep Rules](https://android-developers.googleblog.com/2025/11/configure-and-troubleshoot-r8-keep-rules.html) — ProGuard/R8 rules guidance 2025

### Secondary (MEDIUM confidence)
- [dagger.dev/hilt/gradle-setup.html](https://dagger.dev/hilt/gradle-setup.html) — Hilt 2.57.1 Gradle setup with KSP
- [mvnrepository.com/artifact/androidx.compose/compose-bom](https://mvnrepository.com/artifact/androidx.compose/compose-bom) — BOM 2026.03.00 confirmed latest
- [github.com/google/ksp/releases](https://github.com/google/ksp/releases) — KSP version matrix for Kotlin 2.2.10
- [github.com/actions/setup-java](https://github.com/actions/setup-java) — setup-java@v4 with Gradle cache
- [github.com/gradle/actions](https://github.com/gradle/actions) — gradle/actions for CI caching

### Tertiary (LOW confidence)
- WebSearch results for ProGuard Hilt + Compose rules — multiple Medium articles cross-referencing official rules; core rules are well-established but exact rule set should be tested against release build

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via official release notes and Maven repository cross-references
- Architecture: HIGH — patterns cited from official Android Developers docs
- Pitfalls: HIGH — derived from official docs + common error messages in official issue trackers
- CI workflow: MEDIUM — GitHub Actions YAML based on documented best practices; runner image version (`ubuntu-latest`) may change

**Research date:** 2026-04-14
**Valid until:** 2026-07-14 (90 days — stable Android toolchain ecosystem; Compose BOM releases monthly but are backward compatible)

---

## RESEARCH COMPLETE
