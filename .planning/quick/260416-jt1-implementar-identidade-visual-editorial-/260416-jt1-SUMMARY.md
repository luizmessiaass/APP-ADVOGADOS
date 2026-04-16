---
phase: quick
plan: 260416-jt1
subsystem: app-cliente / core-ui
tags: [design-system, editorial-juris, android, compose, google-fonts]
dependency_graph:
  requires: []
  provides: [editorial-juris-theme, welcome-screen, login-screen-redesign, processo-list-screen, processo-detail-screen]
  affects: [core-ui/theme, app-cliente/navigation, app-cliente/features]
tech_stack:
  added: [androidx.compose.ui:ui-text-google-fonts]
  patterns: [GoogleFont.Provider, lightColorScheme, Editorial Juris token naming]
key_files:
  created:
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/welcome/WelcomeScreen.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/processo/ProcessoListScreen.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/processo/ProcessoDetailScreen.kt
  modified:
    - gradle/libs.versions.toml
    - app-cliente/build.gradle.kts
    - core-ui/build.gradle.kts
    - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/theme/Color.kt
    - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/theme/Type.kt
    - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/theme/Theme.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/navigation/Routes.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/navigation/ClienteNavGraph.kt
    - app-cliente/src/main/java/com/aethixdigital/portaljuridico/cliente/features/auth/LoginScreen.kt
decisions:
  - "dark mode disabled for app-cliente: light-only Editorial Juris palette, darkTheme parameter retained for API compatibility"
  - "ProcessoListScreen and ProcessoDetailScreen in features/processo/ (singular) use mock data; existing features/processos/ (plural) with ViewModels left intact"
  - "R.array.com_google_android_gms_fonts_certs referenced via androidx.compose.ui.text.googlefonts.R to avoid needing a res/ directory in core-ui"
  - "ClienteNavGraph wires new Editorial Juris screens; ONBOARDING and LGPD_CONSENT routes use ProcessoListScreen as placeholder pending future implementation"
metrics:
  duration: 25m
  completed: "2026-04-16"
  tasks: 5
  files: 11
---

# Quick Task 260416-jt1: Implementar Identidade Visual Editorial Juris Summary

**One-liner:** Editorial Juris design system (navy #041631 / gold #FFE088 / off-white #FAF9F5) applied to core-ui theme and five app-cliente screens via Manrope/Inter Google Fonts and 30+ semantic color tokens.

## What Was Built

### Task 1 — Dependencias + Tokens de Cor e Tipografia Editorial Juris (89a69ad)

- `gradle/libs.versions.toml`: added `androidx-compose-ui-text-google-fonts` BOM-managed library entry
- `app-cliente/build.gradle.kts` and `core-ui/build.gradle.kts`: added `implementation(libs.androidx.compose.ui.text.google.fonts)`
- `core-ui/Color.kt`: replaced old generic blue palette with 30+ Editorial Juris tokens (`EjPrimary`, `EjSecondary`, `EjBackground`, `EjSurface*`, `EjOnSurface*`, `EjError*`, etc.)
- `core-ui/Type.kt`: Manrope (display/headline/title) and Inter (body/label) loaded via `GoogleFont.Provider` using `androidx.compose.ui.text.googlefonts.R.array.com_google_android_gms_fonts_certs`
- `core-ui/Theme.kt`: replaced dual-scheme with single `EditorialJurisColorScheme` (light-only); `PortalJuridicoTheme` retains `darkTheme` parameter for API compatibility but always uses light scheme

### Task 2 — Routes.WELCOME + WelcomeScreen (5d3cd08)

- `Routes.kt`: added `const val WELCOME = "welcome"`
- `WelcomeScreen.kt`: first screen of app-cliente with navy gradient CTA, gold accent divider, AccountBalance icon card, two feature tiles (Traducao Juridica + Alertas em Tempo Real), "Comecar agora" gradient button, "Ja sou cliente" TextButton

### Task 3 — LoginScreen redesenhada (a4694fe)

- Complete UI rewrite preserving `LoginViewModel` wiring and `LaunchedEffect(uiState)` logic
- CPF field (was email, backend accepts CPF in email field) with `EjSurfaceContainerHigh` no-outline `TextField`
- Navy gradient login button with loading state (`CircularProgressIndicator`)
- Error card with `EjError` left border accent via `drawBehind`
- Biometrics `OutlinedButton`, LGPD card with gold left border and `VerifiedUser` icon
- Success navigates to `Routes.PROCESSO_LIST` (was `Routes.ONBOARDING`)

### Task 4 — ProcessoListScreen Editorial Juris (bda8034)

- New file in `features/processo/` (singular) — separate from existing `features/processos/` with ViewModels
- `CenterAlignedTopAppBar` with AccountBalance gold icon, avatar initials circle
- Featured urgent card with `EjSecondary` gold left border and "URGENTE" badge
- Tip of the day card with Lightbulb icon
- 2-column shortcut cards (Faturas/Chat)
- `LazyColumn` process list with `EjSecondaryFixed` "EM ABERTO" badges
- `NavigationBar` bottom nav with gold selected state

### Task 5 — ProcessoDetailScreen + ClienteNavGraph wiring (cf6f961)

- `ProcessoDetailScreen`: `TopAppBar` with `ArrowBackIosNew`, annotated body text with bold spans, card with green `VerifiedUser` checkmarks, navy gradient CTA card for Consultor IA chatbot
- `ClienteNavGraph`: wires Welcome → Login → ProcessoList → ProcessoDetail without any `TODO()` remaining; ONBOARDING and LGPD_CONSENT use `ProcessoListScreen` as navigable placeholder

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| dark mode disabled (light-only) | Editorial Juris is a deliberate editorial aesthetic; forcing dark mode would break the navy/off-white contrast ratio design |
| Two separate ProcessoList/Detail packages (processos vs processo) | Avoids breaking the fully-functional ViewModel-backed screens; new Editorial Juris screens are visual showcases that can be merged in a future task |
| `androidx.compose.ui.text.googlefonts.R` for certs | core-ui has no res/ directory; using the library's own R class avoids needing to add a res/ folder just for the certs array |
| ONBOARDING/LGPD_CONSENT use ProcessoListScreen placeholder | These routes had TODO() — replacing with a real navigable screen is better UX than a crash |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] core-ui has no res/ directory for R.array.com_google_android_gms_fonts_certs**

- **Found during:** Task 1
- **Issue:** The plan referenced `R.array.com_google_android_gms_fonts_certs` via `com.aethixdigital.portaljuridico.ui.R`, but core-ui has no `src/main/res/` folder. The resource array would not exist in that R class.
- **Fix:** Used `androidx.compose.ui.text.googlefonts.R.array.com_google_android_gms_fonts_certs` — the certificates array is bundled inside the `ui-text-google-fonts` AAR and accessible via the library's own R class.
- **Files modified:** `core-ui/Type.kt`
- **Commit:** 89a69ad

**2. [Rule 3 - Blocking] ClienteNavGraph already imported processos/ screens (linter modified file mid-execution)**

- **Found during:** Task 5
- **Issue:** The file was modified between the initial read and the write attempt — likely a linter auto-import. Re-read and re-wrote with correct imports pointing to `features/processo/` (singular) Editorial Juris screens.
- **Fix:** Read → write with `features/processo.ProcessoListScreen` and `features/processo.ProcessoDetailScreen` imports.
- **Files modified:** `ClienteNavGraph.kt`
- **Commit:** cf6f961

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `processosMock` hardcoded list | `features/processo/ProcessoListScreen.kt:L14-19` | Editorial Juris screen is a visual showcase; ViewModel integration planned for future task |
| Static "Sentenca Proferida" title | `features/processo/ProcessoDetailScreen.kt:L65` | Detail screen uses static mock content; real processoId parameter accepted but not used to fetch data |
| Biometrics `OutlinedButton` onClick = {} | `features/auth/LoginScreen.kt` | Biometric auth not yet implemented; button is UI-only placeholder |

## Self-Check

**Files created/modified:**

- `gradle/libs.versions.toml` — FOUND
- `app-cliente/build.gradle.kts` — FOUND
- `core-ui/build.gradle.kts` — FOUND
- `core-ui/.../Color.kt` — FOUND
- `core-ui/.../Type.kt` — FOUND
- `core-ui/.../Theme.kt` — FOUND
- `app-cliente/.../Routes.kt` — FOUND
- `app-cliente/.../WelcomeScreen.kt` — FOUND
- `app-cliente/.../LoginScreen.kt` — FOUND
- `app-cliente/.../ProcessoListScreen.kt` — FOUND
- `app-cliente/.../ProcessoDetailScreen.kt` — FOUND
- `app-cliente/.../ClienteNavGraph.kt` — FOUND

**Commits:**
- 89a69ad — Task 1: Editorial Juris tokens + Google Fonts + Theme
- 5d3cd08 — Task 2: Routes.WELCOME + WelcomeScreen
- a4694fe — Task 3: LoginScreen redesign
- bda8034 — Task 4: ProcessoListScreen
- cf6f961 — Task 5: ProcessoDetailScreen + ClienteNavGraph wiring

## Self-Check: PASSED
