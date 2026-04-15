---
phase: 00-android-bootstrap-cleanup
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - .github/workflows/android-ci.yml
  - app-cliente/build.gradle.kts
  - app-cliente/proguard-rules.pro
  - app-cliente/src/demo/res/values/strings.xml
  - app-cliente/src/main/AndroidManifest.xml
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/ClienteApp.kt
  - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/MainActivity.kt
  - app-cliente/src/main/res/values/strings.xml
  - app-escritorio/build.gradle.kts
  - app-escritorio/proguard-rules.pro
  - app-escritorio/src/main/AndroidManifest.xml
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/EscritorioApp.kt
  - app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/MainActivity.kt
  - app-escritorio/src/main/res/values/strings.xml
  - build.gradle.kts
  - core-common/build.gradle.kts
  - core-common/src/main/AndroidManifest.xml
  - core-common/src/main/java/com/aethixdigital/portaljuridico/common/AppConfig.kt
  - core-common/src/test/java/com/aethixdigital/portaljuridico/common/AppConfigTest.kt
  - core-data/build.gradle.kts
  - core-data/src/main/AndroidManifest.xml
  - core-network/build.gradle.kts
  - core-network/src/main/AndroidManifest.xml
  - core-ui/build.gradle.kts
  - core-ui/src/main/AndroidManifest.xml
  - gradle.properties
  - gradle/libs.versions.toml
  - gradle/wrapper/gradle-wrapper.properties
  - gradlew
  - gradlew.bat
  - settings.gradle.kts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 00: Code Review Report

**Reviewed:** 2026-04-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

This phase establishes the multi-module Android bootstrap for the Portal Jurídico project: two application modules (`app-cliente`, `app-escritorio`), four library modules (`core-common`, `core-data`, `core-network`, `core-ui`), centralized dependency management via version catalog, and a GitHub Actions CI pipeline.

The scaffold is solid overall — Hilt is correctly wired, ProGuard rules are appropriate, the version catalog is consistent, and the CI pipeline covers lint, unit tests, and APK assembly. No hardcoded secrets or injection vulnerabilities were found.

Four warnings require attention before this phase is considered done: a missing `applicationId` in `app-cliente`'s `defaultConfig` causes the app to inherit the flavor's `applicationId` only when a flavor is active, which will break a plain `debug` build; `AppConfig.isDebugBuild()` uses reflection against a `BuildConfig` class whose package name does not match any declared module namespace; the CI `lint` step runs without a module qualifier and will fail on the multi-module layout; and `android.allowBackup="true"` is set on both apps without backup rules, which exposes user data.

---

## Warnings

### WR-01: Missing `applicationId` in `app-cliente` `defaultConfig`

**File:** `app-cliente/build.gradle.kts:16-22`
**Issue:** `defaultConfig` does not declare `applicationId`. The only `applicationId` is inside the `demo` product flavor. Any build variant that does not use the `demo` flavor (e.g. a plain `debug` build, or future flavors added without their own `applicationId`) will have no `applicationId` at all, causing the AGP to either inherit from the namespace or fail at packaging time. `app-escritorio` correctly declares `applicationId` in `defaultConfig`.
**Fix:**
```kotlin
defaultConfig {
    applicationId = "com.aethixdigital.portaljuridico.cliente"
    minSdk = 27
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
}
```

---

### WR-02: `AppConfig.isDebugBuild()` reflects on a non-existent `BuildConfig` class

**File:** `core-common/src/main/java/com/aethixdigital/portaljuridico/common/AppConfig.kt:17`
**Issue:** The reflection target is `com.aethixdigital.portaljuridico.BuildConfig`. No module in the project has the namespace `com.aethixdigital.portaljuridico` — the app modules use `.cliente` and `.escritorio` suffixes. At runtime the class will never be found, the `catch` block will always execute, and `buildType` will always be `"release"` — even in debug builds. This produces incorrect behavior silently, with no log or indication that the detection failed.
**Fix:** Either enable `BuildConfig` generation in `core-common` and rely on its own `BuildConfig.DEBUG`, or inject the value at construction time from the app module:

Option A — inject via constructor (preferred, avoids reflection entirely):
```kotlin
@Singleton
class AppConfig @Inject constructor(
    @Named("isDebug") val isDebug: Boolean
) {
    val buildType: String = if (isDebug) "debug" else "release"
}
```
Provide `@Named("isDebug") BuildConfig.DEBUG` from a Hilt module in each app module.

Option B — enable `BuildConfig` in `core-common/build.gradle.kts` and use its own flag:
```kotlin
android {
    buildFeatures { buildConfig = true }
}
```
Then replace the reflection with `com.aethixdigital.portaljuridico.common.BuildConfig.DEBUG`.

---

### WR-03: CI `lint` task runs without module qualifier — will fail on multi-module project

**File:** `.github/workflows/android-ci.yml:32`
**Issue:** `./gradlew lint` on a multi-module project without any module qualifier runs the `lint` task on every module. In AGP 8+, the bare `lint` task on library modules that have no `applicationVariants` may resolve to `lintDebug` or error depending on AGP version. More practically, `core-network` and `core-data` currently have no Kotlin source files — lint on empty modules may pass, but the intent of the CI step (lint the app) is not clearly enforced. If a future module introduces an error, the CI step could surface it unexpectedly or the developer may not realize which module failed.

It is also inconsistent with the next step: `./gradlew test` runs all-module tests, while the assemble step correctly scopes to `:app-cliente:assembleDemoDebug`. The lint step should either scope to the intended target or explicitly run all modules intentionally.
**Fix:**
```yaml
- name: Run lint
  run: ./gradlew :app-cliente:lintDemoDebug :app-escritorio:lintDebug
```

---

### WR-04: `android:allowBackup="true"` declared without backup rules — exposes user data

**File:** `app-cliente/src/main/AndroidManifest.xml:6`, `app-escritorio/src/main/AndroidManifest.xml:6`
**Issue:** Both manifests set `android:allowBackup="true"` (which is also the platform default). When a user backs up their device to Google Drive or restores to a new device, the full app data directory — including any future tokens, cached process data, or Supabase session state — will be included in the backup. The project CLAUDE.md explicitly flags legal data as sensitive ("dado jurídico é sensível"). Without `android:fullBackupContent` or `android:dataExtractionRules` pointing to appropriate exclusion rules, all data is backed up by default.
**Fix:** Add data extraction and backup rules referencing the XML config files (note: `core-ui` already has a `data_extraction_rules.xml` pattern established in the original scaffold):

```xml
<!-- app-cliente/src/main/AndroidManifest.xml -->
<application
    android:name=".ClienteApp"
    android:allowBackup="false"
    ...>
```

Or, if selective backup is desired, create `res/xml/backup_rules.xml` and `res/xml/data_extraction_rules.xml` excluding sensitive keys and reference them:
```xml
android:fullBackupContent="@xml/backup_rules"
android:dataExtractionRules="@xml/data_extraction_rules"
```
Apply the same fix to `app-escritorio/src/main/AndroidManifest.xml`.

---

## Info

### IN-01: ProGuard rules are identical across both app modules — consider extracting to shared file

**File:** `app-cliente/proguard-rules.pro:1-57`, `app-escritorio/proguard-rules.pro:1-57`
**Issue:** Both ProGuard rule files are byte-for-byte identical. Maintaining them separately increases the risk of them diverging silently when new rules are added.
**Fix:** Extract shared rules to a root-level `proguard-common.pro` and reference it from both modules:
```kotlin
// In each app's build.gradle.kts
proguardFiles(
    getDefaultProguardFile("proguard-android-optimize.txt"),
    rootProject.file("proguard-common.pro"),
    "proguard-rules.pro"  // module-specific overrides only
)
```

---

### IN-02: `hilt-navigation-compose` declared in version catalog but unused in any module

**File:** `gradle/libs.versions.toml:32`
**Issue:** `hilt-navigation-compose` is declared as a library alias (`hiltNavigationCompose = "1.2.0"`) but is not referenced in any module's `build.gradle.kts`. This is dead catalog weight that can confuse future contributors.
**Fix:** Remove the unused entry, or add a comment noting it is reserved for the navigation phase:
```toml
# Reserved for Phase 1 navigation wiring — not yet used
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }
```

---

### IN-03: `kotlin-android` plugin declared in version catalog but unused

**File:** `gradle/libs.versions.toml:37`
**Issue:** The `kotlin-android` plugin alias is declared but applied by neither root `build.gradle.kts` nor any module's `build.gradle.kts`. Both app modules use `kotlin.compose` instead. This is a leftover from the original single-module scaffold.
**Fix:** Remove the unused alias from the catalog:
```toml
# Remove this line — not applied anywhere:
# kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
```

---

### IN-04: `app-escritorio` CI pipeline has no assemble step — APK artifact not validated

**File:** `.github/workflows/android-ci.yml:37-44`
**Issue:** The CI pipeline assembles only `app-cliente`'s demo debug APK. `app-escritorio` is never assembled in CI, so a build-breaking change to the escritorio module will not be caught by CI.
**Fix:** Add an assemble step for `app-escritorio`:
```yaml
- name: Assemble escritorio debug APK
  run: ./gradlew :app-escritorio:assembleDebug
```

---

### IN-05: `AppConfig` is injected but never actually used in `app-escritorio` `MainActivity`

**File:** `app-escritorio/src/main/java/com/aethixdigital/portaljuridico/escritorio/MainActivity.kt`
**Issue:** Unlike `app-cliente`'s `MainActivity` which injects and (presumably will use) `AppConfig`, `app-escritorio`'s `MainActivity` does not inject `AppConfig` at all despite `core-common` being declared as a dependency in `app-escritorio/build.gradle.kts`. This is not a bug at this phase, but flags an asymmetry worth noting before the modules diverge further.
**Fix:** Either inject `AppConfig` in `app-escritorio/MainActivity` for consistency with the cliente module, or remove the `:core-common` dependency from `app-escritorio/build.gradle.kts` if it is genuinely not needed yet.

---

_Reviewed: 2026-04-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
