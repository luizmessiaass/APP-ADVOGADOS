---
id: 260416-l5h
type: quick
status: awaiting-human-verify
completed_tasks: 4
total_tasks: 5
date: 2026-04-16
---

# Quick Task 260416-l5h: Configurar product flavors no app-cliente

**One-liner:** Flores Advocacia product flavor with bordo palette (#7B1D22), logo PNG, and BrandConfig source-set polymorphism alongside existing Editorial Juris (demo) flavor.

## What Was Built

### Task 1 — flores flavor in build.gradle.kts (cb083fb)
- Added `flores` flavor to `productFlavors` block with `applicationId = "com.aethixdigital.portaljuridico.flores"`
- Added `buildConfig = true` to `buildFeatures`
- Created directory structure:
  - `app-cliente/src/flores/res/values/`
  - `app-cliente/src/flores/res/drawable/`
  - `app-cliente/src/flores/java/com/aethixdigital/portaljuridico/cliente/brand/`
  - `app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/brand/`

### Task 2 — flores resources (7b7009f)
- `app-cliente/src/flores/res/values/strings.xml`: `app_name = "Flores Advocacia"`
- `app-cliente/src/flores/res/drawable/ic_brand_logo.png`: Flores Advocacia logo (4932 bytes)

### Task 3 — BrandConfig + Theme.kt wiring (df04833)
- `app-cliente/src/main/java/.../brand/BrandConfig.kt`: Editorial Juris defaults (navy #041631, gold #735C00, logoResId=null, appDisplayName="Meu Processo")
- `app-cliente/src/flores/java/.../brand/BrandConfig.kt`: Flores palette (bordo #7B1D22, warm gold #8B6914, logoResId=R.drawable.ic_brand_logo, appDisplayName="Flores Advocacia")
- Both source sets include `toColorScheme()` extension
- `core-ui/src/main/java/.../theme/Theme.kt`: `PortalJuridicoTheme` gains optional `colorScheme: ColorScheme?` param + `CompositionLocalProvider(LocalBrandColorScheme)`
- `app-cliente/src/main/java/.../MainActivity.kt`: calls `PortalJuridicoTheme(colorScheme = BrandConfig.toColorScheme())`

### Task 4 — Screen de-hardcoding (7f87f74)
- `WelcomeScreen.kt`: all `Ej*` imports removed, replaced with `BrandConfig.*`; conditional logo (PNG or AccountBalance icon); title/tagline from BrandConfig
- `LoginScreen.kt`: all `Ej*` imports removed, replaced with `BrandConfig.*`; conditional logo (PNG or Gavel icon); gradient from `BrandConfig.gradientStart/gradientEnd`

## Flavor applicationIds

| Flavor | applicationId |
|--------|--------------|
| demo | `com.aethixdigital.portaljuridico.demo` |
| flores | `com.aethixdigital.portaljuridico.flores` |

## BrandConfig Pattern

- **Location:** `app-cliente/src/main/java/.../brand/BrandConfig.kt` (EJ default) and `app-cliente/src/flores/java/.../brand/BrandConfig.kt` (Flores override)
- **Mechanism:** Kotlin source-set polymorphism — same package + object name, Gradle selects the correct source set per active flavor at compile time. No interface needed.
- **R class:** flores BrandConfig uses `com.aethixdigital.portaljuridico.cliente.R` (namespace-based, not applicationId-based)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cb083fb | Add flores flavor + buildConfig=true + directories |
| 2 | 7b7009f | flores strings.xml + logo PNG |
| 3 | df04833 | BrandConfig (main+flores) + Theme.kt + MainActivity |
| 4 | 7f87f74 | WelcomeScreen + LoginScreen de-hardcoded |

## Deviations from Plan

None — plan executed exactly as written.

- The R class for flores BrandConfig used `com.aethixdigital.portaljuridico.cliente.R` (the module namespace) rather than `com.aethixdigital.portaljuridico.flores.R` (applicationId-based). This is correct because AGP generates the R class from the `namespace` field in build.gradle.kts, not from the applicationId. The plan already documented this as an expected alternative.

## Awaiting

**Checkpoint: human-verify** — Open Android Studio, confirm 4 build variants (demoDebug, demoRelease, floresDebug, floresRelease) appear in the Build Variants panel, and run both floresDebug and demoDebug to verify visual differences.

## Self-Check

- [x] cb083fb exists in git log
- [x] 7b7009f exists in git log
- [x] df04833 exists in git log
- [x] 7f87f74 exists in git log
- [x] No Ej* references in WelcomeScreen.kt
- [x] No Ej* references in LoginScreen.kt
- [x] flores BrandConfig.primary == Color(0xFF7B1D22)
- [x] main BrandConfig.primary == Color(0xFF041631)
