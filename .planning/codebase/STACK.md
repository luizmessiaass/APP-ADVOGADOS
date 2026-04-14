# Technology Stack

**Analysis Date:** 2026-04-14

## Languages

**Primary:**
- Kotlin 2.2.10 - All application source code (`app/src/main/java/`, `app/src/test/`, `app/src/androidTest/`)

**Secondary:**
- XML - Android resource files (`app/src/main/res/`)

## Runtime

**Environment:**
- Android SDK 36 (compileSdk), minSdk 27 (Android 8.1 Oreo), targetSdk 36
- JVM (Android Runtime) - Java 11 source/target compatibility

**Package Manager:**
- Gradle 9.3.1 (via Gradle Wrapper at `gradle/wrapper/gradle-wrapper.properties`)
- Lockfile: Not present (no `gradle.lockfile`)

## Frameworks

**Core:**
- Jetpack Compose (via BOM `2024.09.00`) - Declarative UI framework, used throughout `app/src/main/java/com/example/appteste/`

**UI Components:**
- Material3 (`androidx.compose.material3`) - UI component library, themed in `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`

**Testing:**
- JUnit 4.13.2 - Unit testing framework (`app/src/test/`)
- Espresso 3.7.0 - UI instrumentation testing (`app/src/androidTest/`)
- Compose UI Test (JUnit4 integration, via BOM) - Compose-specific UI testing

**Build/Dev:**
- Android Gradle Plugin (AGP) 9.1.1 - Android build tooling, configured in `build.gradle.kts`
- Kotlin Compose compiler plugin 2.2.10 - Enables Jetpack Compose Kotlin compilation

## Key Dependencies

**Critical:**
- `androidx.core:core-ktx` 1.18.0 - Kotlin extensions for Android core APIs (`app/build.gradle.kts`)
- `androidx.lifecycle:lifecycle-runtime-ktx` 2.10.0 - Lifecycle-aware coroutine scopes
- `androidx.activity:activity-compose` 1.13.0 - Compose integration with `ComponentActivity` (used in `MainActivity.kt`)
- `androidx.compose:compose-bom` 2024.09.00 - BOM that manages all Compose library versions

**Infrastructure:**
- `androidx.compose.ui:ui` - Core Compose UI primitives
- `androidx.compose.ui:ui-graphics` - Compose graphics primitives
- `androidx.compose.ui:ui-tooling-preview` - `@Preview` annotation support (used in `MainActivity.kt`)
- `androidx.compose.ui:ui-tooling` (debug) - Layout inspector and preview rendering
- `androidx.compose.ui:ui-test-manifest` (debug) - Test manifest for Compose UI tests

## Configuration

**Environment:**
- No `.env` files detected
- `local.properties` present at project root (contains local SDK path, not committed)
- `gradle.properties` at root: sets JVM args (`-Xmx2048m`), encoding UTF-8, Kotlin code style `official`

**Build:**
- Root build: `build.gradle.kts` - Applies AGP and Kotlin Compose plugins
- App module build: `app/build.gradle.kts` - Full app configuration, dependencies
- Version catalog: `gradle/libs.versions.toml` - Centralized dependency version management
- Settings: `settings.gradle.kts` - Single-module project (`app`), repositories Google + MavenCentral
- ProGuard: `app/proguard-rules.pro` - Custom rules file; minification disabled in release (`isMinifyEnabled = false`)

## Platform Requirements

**Development:**
- Android Studio (JDK bundled)
- Android SDK with API 36 platform installed
- Gradle 9.3.1 (auto-downloaded via wrapper)

**Production:**
- Android 8.1 (API 27) minimum
- Deployed as APK/AAB targeting Android 14+ (API 36)
- No server-side component; purely a client Android application

---

*Stack analysis: 2026-04-14*
