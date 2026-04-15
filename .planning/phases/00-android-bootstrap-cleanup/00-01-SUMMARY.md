---
phase: 00-android-bootstrap-cleanup
plan: 01
subsystem: android-build
tags: [gradle, multi-module, hilt, ksp, agp9]
dependency_graph:
  requires: []
  provides: [multi-module-build-graph, version-catalog-with-hilt-ksp]
  affects: [00-02, 00-03, 00-04, 00-05]
tech_stack:
  added:
    - Hilt 2.59.2 (DI framework)
    - KSP 2.2.10-2.0.2 (annotation processor)
    - Compose BOM 2026.03.00 (upgraded from 2024.09.00)
  patterns:
    - AGP 9.x built-in Kotlin (no explicit kotlin.android plugin)
    - android.disallowKotlinSourceSets=false (KSP/AGP 9.x compatibility)
    - compileSdk = 36 (integer) for library modules
    - compileSdk { version = release(36) { minorApiLevel = 1 } } for app modules
key_files:
  created:
    - core-common/build.gradle.kts
    - core-common/src/main/AndroidManifest.xml
    - core-network/build.gradle.kts
    - core-network/src/main/AndroidManifest.xml
    - core-data/build.gradle.kts
    - core-data/src/main/AndroidManifest.xml
    - core-ui/build.gradle.kts
    - core-ui/src/main/AndroidManifest.xml
    - app-cliente/build.gradle.kts
    - app-cliente/src/main/AndroidManifest.xml
    - app-cliente/src/main/res/values/strings.xml
    - app-cliente/src/demo/res/values/strings.xml
    - app-cliente/proguard-rules.pro
    - app-escritorio/build.gradle.kts
    - app-escritorio/src/main/AndroidManifest.xml
    - app-escritorio/src/main/res/values/strings.xml
    - app-escritorio/proguard-rules.pro
  modified:
    - settings.gradle.kts
    - build.gradle.kts
    - gradle/libs.versions.toml
    - gradle.properties
decisions:
  - "AGP 9.x built-in Kotlin: do not apply kotlin.android plugin explicitly; AGP handles Kotlin compilation"
  - "KSP version corrected: 2.2.10-1.0.31 does not exist; use 2.2.10-2.0.2"
  - "Hilt version upgraded to 2.59.2: 2.57.1 uses BaseExtension which was removed in AGP 9.x"
  - "android.disallowKotlinSourceSets=false required for KSP source registration in AGP 9.x"
metrics:
  duration: ~35 minutes
  completed_date: "2026-04-15"
  tasks_completed: 3
  files_created: 21
  files_modified: 4
---

# Phase 0 Plan 01: Multi-Module Build Graph Summary

**One-liner:** Six-module Android project structure with Hilt 2.59.2 + KSP 2.2.10-2.0.2, AGP 9.x built-in Kotlin pattern, BUILD SUCCESSFUL.

## Modules Created

| Module | Type | Namespace | Key Plugins |
|--------|------|-----------|-------------|
| `:core-common` | library | `com.aethixdigital.portaljuridico.common` | android.library, ksp, hilt.android |
| `:core-network` | library | `com.aethixdigital.portaljuridico.network` | android.library |
| `:core-data` | library | `com.aethixdigital.portaljuridico.data` | android.library |
| `:core-ui` | library | `com.aethixdigital.portaljuridico.ui` | android.library, kotlin.compose |
| `:app-cliente` | application | `com.aethixdigital.portaljuridico.cliente` | android.application, kotlin.compose, ksp, hilt.android |
| `:app-escritorio` | application | `com.aethixdigital.portaljuridico.escritorio` | android.application, kotlin.compose, ksp, hilt.android |

## Key Patterns Used

- **Library modules compileSdk:** `compileSdk = 36` (integer form, required by AGP 9.x for library modules)
- **App modules compileSdk:** `compileSdk { version = release(36) { minorApiLevel = 1 } }` (DSL form)
- **No explicit kotlin.android:** AGP 9.x provides built-in Kotlin; applying `kotlin.android` explicitly causes "Cannot add extension with name 'kotlin'" conflict
- **productFlavors in app-cliente:** `flavorDimensions += "tenant"` declared before `productFlavors` block; `demo` flavor with `applicationId = "com.aethixdigital.portaljuridico.demo"`
- **Hilt in library modules:** `ksp` + `hilt.android` plugins without explicit Kotlin plugin (AGP built-in Kotlin handles compilation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect KSP version in research document**
- **Found during:** Task 3 (Gradle sync verification)
- **Issue:** Research specified `ksp = "2.2.10-1.0.31"` but this artifact does not exist on Maven Central or Google Maven. The correct version for Kotlin 2.2.10 is `2.2.10-2.0.2`.
- **Fix:** Updated `gradle/libs.versions.toml` ksp version to `2.2.10-2.0.2`
- **Files modified:** `gradle/libs.versions.toml`
- **Commit:** 33787c1

**2. [Rule 1 - Bug] Hilt 2.57.1 incompatible with AGP 9.x**
- **Found during:** Task 3 (Gradle sync verification)
- **Issue:** Hilt 2.57.1 uses `BaseExtension` to locate Android projects, but AGP 9.x removed `BaseExtension` in favor of `ApplicationExtension`/`LibraryExtension`. Error: "Android BaseExtension not found."
- **Fix:** Upgraded Hilt from `2.57.1` to `2.59.2` (latest stable) which uses the new AGP 9.x extension APIs
- **Files modified:** `gradle/libs.versions.toml`
- **Commit:** 33787c1

**3. [Rule 1 - Bug] kotlin.android plugin conflicts with AGP 9.x built-in Kotlin**
- **Found during:** Task 3 (Gradle sync verification)
- **Issue:** AGP 9.x introduced built-in Kotlin support. When `kotlin.android` is explicitly applied alongside AGP plugins, Gradle throws "Cannot add extension with name 'kotlin', as there is an extension already registered with that name." The plan specified `kotlin.android` in all module build files.
- **Fix:** Removed `kotlin.android` from all module `build.gradle.kts` files and from root `build.gradle.kts`. AGP 9.x handles Kotlin compilation natively.
- **Files modified:** `core-common/build.gradle.kts`, `core-network/build.gradle.kts`, `core-data/build.gradle.kts`, `core-ui/build.gradle.kts`, `app-cliente/build.gradle.kts`, `app-escritorio/build.gradle.kts`, `build.gradle.kts`
- **Commit:** 33787c1

**4. [Rule 2 - Missing critical functionality] KSP source registration incompatible with AGP 9.x**
- **Found during:** Task 3 (Gradle sync verification)
- **Issue:** KSP registers generated sources via `kotlin.sourceSets` DSL, which AGP 9.x disallows by default (error: "Using kotlin.sourceSets DSL to add Kotlin sources is not allowed with built-in Kotlin"). Without this workaround the KSP-generated Hilt code cannot be compiled.
- **Fix:** Added `android.disallowKotlinSourceSets=false` to `gradle.properties` — the official AGP workaround documented in the error message itself. This is temporary until KSP releases full AGP 9.x built-in Kotlin support.
- **Files modified:** `gradle.properties`
- **Commit:** 33787c1

**5. [Rule 1 - Enhancement] Compose BOM upgraded ahead of plan**
- **Found during:** Task 2 (version catalog update)
- **Issue:** The plan noted BOM should be upgraded (D-14 decision). Research confirmed latest stable is `2026.03.00`.
- **Fix:** Updated `composeBom` from `2024.09.00` to `2026.03.00` in the version catalog as part of adding Hilt/KSP entries.
- **Files modified:** `gradle/libs.versions.toml`
- **Commit:** 285a8c4

## Verification Results

```
./gradlew projects output:
+--- Project ':app-cliente'
+--- Project ':app-escritorio'
+--- Project ':core-common'
+--- Project ':core-data'
+--- Project ':core-network'
\--- Project ':core-ui'

./gradlew help: BUILD SUCCESSFUL
No com.example.appteste references in new modules: CLEAN
```

## Commits

| Hash | Message |
|------|---------|
| 7dbdcbb | feat(00-01): create six-module directory structure with build configs |
| 285a8c4 | chore(00-01): update settings, root build, and version catalog for multi-module |
| 33787c1 | fix(00-01): resolve AGP 9.x + KSP + Hilt plugin compatibility for Gradle sync |

## Known Stubs

- `app-cliente/proguard-rules.pro` — empty stub; R8 rules added in Plan 05
- `app-escritorio/proguard-rules.pro` — empty stub; R8 rules added in Plan 05
- All `src/main/java/` directories — empty; Kotlin source files added in Plans 02-04
- `app-cliente/src/main/AndroidManifest.xml` — references `.ClienteApp` and `.MainActivity` which do not exist yet; added in Plan 02
- `app-escritorio/src/main/AndroidManifest.xml` — references `.EscritorioApp` and `.MainActivity` which do not exist yet; added in Plan 02

These stubs are intentional per the plan scope — Plan 01 establishes the build graph only. Plans 02-04 add Kotlin source files.

## Status: COMPLETE
