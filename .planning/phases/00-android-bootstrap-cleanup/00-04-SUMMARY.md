---
phase: 00-android-bootstrap-cleanup
plan: 04
subsystem: android-hilt
tags: [hilt, di, kotlin, android, compose, application-class]
dependency_graph:
  requires: [00-01, 00-02, 00-03]
  provides: [hilt-application-classes, hilt-di-graph-wired, appconfig-singleton]
  affects: [00-05]
tech_stack:
  added:
    - Hilt DI component graph (code generation verified via Hilt_ClienteApp.java, Hilt_MainActivity.java)
  patterns:
    - "@HiltAndroidApp on Application subclass in each app module"
    - "@AndroidEntryPoint on Activity to receive Hilt injection"
    - "@Singleton @Inject constructor() in library modules (:core-common)"
    - "Unit tests for @Inject classes use direct constructor instantiation (no Hilt test harness)"
key_files:
  created:
    - core-common/src/main/java/com/aethixdigital/portaljuridico/common/AppConfig.kt
    - core-common/src/test/java/com/aethixdigital/portaljuridico/common/AppConfigTest.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/ClienteApp.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/EscritorioApp.kt
    - app-cliente/src/main/res/values/themes.xml
    - app-escritorio/src/main/res/values/themes.xml
    - app-cliente/src/main/res/mipmap-*/ic_launcher{,_round}.webp|xml (launcher icons)
    - app-escritorio/src/main/res/mipmap-*/ic_launcher{,_round}.webp|xml (launcher icons)
  modified:
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/MainActivity.kt
    - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/MainActivity.kt
decisions:
  - "AppConfig uses reflection to detect BuildConfig.DEBUG — allows direct constructor instantiation in unit tests without Hilt test harness"
  - "Unit tests for @Inject classes should use direct constructor new (no @HiltAndroidTest) when dependencies are zero-arg"
  - "Launcher icon resources and Theme.PortalJuridico style added to app-cliente and app-escritorio as Rule 3 fix (missing resources blocked assembleDemoDebug)"
metrics:
  duration: ~9 minutes
  completed_date: "2026-04-15"
  tasks_completed: 2
  files_created: 36
  files_modified: 2
---

# Phase 0 Plan 04: Hilt DI Wiring Summary

**One-liner:** Hilt DI graph wired end-to-end — @HiltAndroidApp Application classes, @AndroidEntryPoint MainActivity, @Singleton AppConfig injected; assembleDemoDebug BUILD SUCCESSFUL with generated Hilt components confirmed.

## Files Created

| File | Purpose |
|------|---------|
| `core-common/src/main/java/.../common/AppConfig.kt` | @Singleton @Inject constructor class — DI sample proving graph resolves |
| `core-common/src/test/java/.../common/AppConfigTest.kt` | 2-test unit test (no Hilt harness — direct constructor) |
| `app-cliente/src/main/java/.../cliente/ClienteApp.kt` | @HiltAndroidApp Application class |
| `app-escritorio/src/main/java/.../escritorio/EscritorioApp.kt` | @HiltAndroidApp Application class |
| `app-cliente/src/main/res/values/themes.xml` | Theme.PortalJuridico style (missing resource — Rule 3 fix) |
| `app-escritorio/src/main/res/values/themes.xml` | Theme.PortalJuridico style (missing resource — Rule 3 fix) |
| `app-cliente/src/main/res/mipmap-*/drawable` | Launcher icons copied from original app (Rule 3 fix) |
| `app-escritorio/src/main/res/mipmap-*/drawable` | Launcher icons copied from original app (Rule 3 fix) |

## Files Modified

| File | Change |
|------|--------|
| `app-cliente/src/main/java/.../cliente/MainActivity.kt` | Added @AndroidEntryPoint, @Inject lateinit var appConfig: AppConfig |
| `app-escritorio/src/main/java/.../escritorio/MainActivity.kt` | Added @AndroidEntryPoint annotation |

## Test Results

```
./gradlew :core-common:testDebugUnitTest

> Task :core-common:testDebugUnitTest

BUILD SUCCESSFUL in 16s

Tests: AppConfig instantiates without DI harness ✓
       AppConfig buildType is non-empty ✓
```

Both tests passed without Hilt test harness — AppConfig() called directly as a zero-arg constructor.

## assembleDemoDebug Result

```
./gradlew :app-cliente:assembleDemoDebug

> Task :app-cliente:assembleDemoDebug

BUILD SUCCESSFUL in 36s (first run), 4s (incremental)
81 actionable tasks: 20 executed, 61 up-to-date
```

APK produced at: `app-cliente/build/outputs/apk/demo/debug/app-cliente-demo-debug.apk`

## Hilt Code Generation Evidence

Generated files confirmed at:
```
app-cliente/build/generated/hilt/component_sources/demoDebug/
  com/aethixdigital/portaljuridico/cliente/ClienteApp_HiltComponents.java
  com/aethixdigital/portaljuridico/cliente/DaggerClienteApp_HiltComponents_SingletonC.java
  com/aethixdigital/portaljuridico/cliente/Hilt_ClienteApp.java

app-cliente/build/generated/ksp/demoDebug/java/
  com/aethixdigital/portaljuridico/cliente/Hilt_MainActivity.java
```

This proves KSP + Hilt code generation ran successfully and the DI component graph was resolved at compile time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Missing launcher icon resources and themes.xml**
- **Found during:** Task 2 verification (assembleDemoDebug)
- **Issue:** `processDemoDebugResources` failed with AAPT errors — `mipmap/ic_launcher`, `mipmap/ic_launcher_round`, and `style/Theme.PortalJuridico` not found in `app-cliente` or `app-escritorio` modules. The Plan 01 multi-module restructure created the modules without copying the original `app/` resources.
- **Fix:** Copied launcher icon assets (`mipmap-hdpi/mdpi/xhdpi/xxhdpi/xxxhdpi/anydpi`, `drawable/ic_launcher_background.xml`, `drawable/ic_launcher_foreground.xml`) from the original `app/src/main/res/` to both `app-cliente` and `app-escritorio`. Created `themes.xml` with `Theme.PortalJuridico` (parent: `android:Theme.Material.Light.NoActionBar`) in both modules.
- **Files modified:** 34 new resource files across both app modules
- **Commit:** fb36d77 (included in Task 2 commit)

## Known Stubs

- `AppConfig.buildType` defaults to `"release"` in unit test context (no BuildConfig.DEBUG available) — this is by design; the unit test only verifies non-empty, not the specific value
- The Greeting composable in `app-cliente/MainActivity.kt` remains a temporary placeholder; real UI comes in Plan 05

## Threat Flags

No new security surface introduced. @HiltAndroidApp and @AndroidEntryPoint are standard Android DI annotations with no network endpoints, auth paths, file access, or schema changes.

## Commits

| Hash | Message |
|------|---------|
| bc803a9 | feat(00-04): add AppConfig @Singleton @Inject class in core-common with unit tests |
| fb36d77 | feat(00-04): wire Hilt @HiltAndroidApp + @AndroidEntryPoint + @Inject AppConfig |

## Self-Check: PASSED

- `core-common/src/main/java/.../AppConfig.kt` — EXISTS
- `core-common/src/test/java/.../AppConfigTest.kt` — EXISTS
- `app-cliente/src/main/java/.../ClienteApp.kt` — EXISTS
- `app-escritorio/src/main/java/.../EscritorioApp.kt` — EXISTS
- Commit `bc803a9` — present in git log
- Commit `fb36d77` — present in git log
- `./gradlew :core-common:testDebugUnitTest` — BUILD SUCCESSFUL
- `./gradlew :app-cliente:assembleDemoDebug` — BUILD SUCCESSFUL
- Hilt generated files at `app-cliente/build/generated/hilt/` — CONFIRMED

## Status: COMPLETE
