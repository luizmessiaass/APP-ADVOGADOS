# Architecture

**Analysis Date:** 2026-04-14

## Pattern Overview

**Overall:** Single-Activity Jetpack Compose Android Application

**Key Characteristics:**
- One Activity (`MainActivity`) serves as the sole entry point and host for all UI
- UI is built entirely with Jetpack Compose declarative composables (no XML layouts)
- Theme system is centralised in a dedicated `ui/theme` package
- No ViewModel, Repository, or data layers present — this is a minimal scaffold app

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interaction
- Location: `app/src/main/java/com/example/appteste/`
- Contains: `MainActivity.kt`, `@Composable` functions
- Depends on: `ui/theme` package, Jetpack Compose libraries
- Used by: Android OS (launched via `LAUNCHER` intent)

**Theme Layer:**
- Purpose: Centralise design tokens (colors, typography, theme wrapper)
- Location: `app/src/main/java/com/example/appteste/ui/theme/`
- Contains: `Color.kt`, `Type.kt`, `Theme.kt`
- Depends on: `androidx.compose.material3`, `androidx.compose.ui`
- Used by: `MainActivity.kt` via `APPTESTETheme { ... }`

**Resources Layer:**
- Purpose: Static assets, launcher icons, string resources, XML config
- Location: `app/src/main/res/`
- Contains: Drawables, mipmap icons, `values/strings.xml`, `values/colors.xml`, `values/themes.xml`, `xml/backup_rules.xml`, `xml/data_extraction_rules.xml`
- Depends on: Nothing (referenced by manifest and code via R class)
- Used by: `AndroidManifest.xml`, generated `R` class

## Data Flow

**App Launch Flow:**

1. Android OS reads `app/src/main/AndroidManifest.xml` and starts `MainActivity`
2. `MainActivity.onCreate()` calls `enableEdgeToEdge()` then `setContent { ... }`
3. `setContent` hosts `APPTESTETheme`, which resolves the Material3 color scheme (dynamic color on Android 12+, dark/light fallback otherwise)
4. `Scaffold` provides layout structure with `innerPadding`
5. `Greeting` composable renders a `Text` widget with the padded modifier

**State Management:**
- No state management layer present; all composables are stateless at this stage

## Key Abstractions

**APPTESTETheme:**
- Purpose: Material3 theme wrapper providing color, typography, and dynamic color support
- File: `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`
- Pattern: Composable wrapper — wraps content in `MaterialTheme`

**Greeting:**
- Purpose: Reusable stateless composable displaying a greeting text
- File: `app/src/main/java/com/example/appteste/MainActivity.kt`
- Pattern: Stateless `@Composable` function with `modifier` parameter

**Color tokens:**
- Purpose: Named color constants for light and dark color schemes
- File: `app/src/main/java/com/example/appteste/ui/theme/Color.kt`
- Pattern: Top-level `val` declarations, referenced by `Theme.kt`

**Typography:**
- Purpose: Material3 typography scale definition
- File: `app/src/main/java/com/example/appteste/ui/theme/Type.kt`
- Pattern: Single top-level `val Typography` consumed by `APPTESTETheme`

## Entry Points

**MainActivity:**
- Location: `app/src/main/java/com/example/appteste/MainActivity.kt`
- Triggers: Android OS launcher intent (`android.intent.action.MAIN` / `android.intent.category.LAUNCHER`)
- Responsibilities: Enable edge-to-edge display, host Compose content tree, apply app theme

**AndroidManifest.xml:**
- Location: `app/src/main/AndroidManifest.xml`
- Triggers: Build system and Android package manager
- Responsibilities: Declare application metadata, register `MainActivity` as launcher, reference backup and data extraction rules

## Error Handling

**Strategy:** None implemented — scaffold-level application with no business logic or error surfaces

**Patterns:**
- No try/catch blocks present
- No error state composables present

## Cross-Cutting Concerns

**Logging:** None implemented
**Validation:** Not applicable (no user input)
**Authentication:** Not applicable

---

*Architecture analysis: 2026-04-14*
