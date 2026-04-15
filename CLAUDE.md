<!-- GSD:project-start source:PROJECT.md -->
## Project

**Portal Jurídico — SaaS B2B para Escritórios de Advocacia**

Plataforma SaaS multi-tenant onde escritórios de advocacia assinam o serviço e seus clientes acessam informações dos seus processos jurídicos em linguagem acessível via app Android. O sistema busca dados processuais no DataJud (CNJ), usa IA (Claude API) para traduzir jargão jurídico para português simples, e disponibiliza um chatbot para que o cliente tire dúvidas diretamente sobre seu processo.

**Core Value:** O cliente leigo consegue entender o que está acontecendo no seu processo jurídico sem precisar ligar para o advogado.

### Constraints

- **Tech Stack**: Android (Kotlin/Compose) + Node.js + Supabase — decisão tomada, não negociável
- **API jurídica**: DataJud (CNJ) apenas — gratuito, sem custo variável com volume
- **IA**: Claude API (Anthropic) para tradução e chat — consistência de qualidade
- **Auth**: Supabase Auth + JWT — sem implementação custom de autenticação
- **Pagamentos**: Stripe — padrão de mercado, SDK maduro
- **Multi-tenancy**: isolamento obrigatório via RLS no Supabase — dado jurídico é sensível
- **Minimo Android**: API 27 (Android 8.1) — cobre 95%+ dos dispositivos ativos no Brasil
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Kotlin 2.2.10 - All application source code (`app/src/main/java/`, `app/src/test/`, `app/src/androidTest/`)
- XML - Android resource files (`app/src/main/res/`)
## Runtime
- Android SDK 36 (compileSdk), minSdk 27 (Android 8.1 Oreo), targetSdk 36
- JVM (Android Runtime) - Java 11 source/target compatibility
- Gradle 9.3.1 (via Gradle Wrapper at `gradle/wrapper/gradle-wrapper.properties`)
- Lockfile: Not present (no `gradle.lockfile`)
## Frameworks
- Jetpack Compose (via BOM `2024.09.00`) - Declarative UI framework, used throughout `app/src/main/java/com/example/appteste/`
- Material3 (`androidx.compose.material3`) - UI component library, themed in `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`
- JUnit 4.13.2 - Unit testing framework (`app/src/test/`)
- Espresso 3.7.0 - UI instrumentation testing (`app/src/androidTest/`)
- Compose UI Test (JUnit4 integration, via BOM) - Compose-specific UI testing
- Android Gradle Plugin (AGP) 9.1.1 - Android build tooling, configured in `build.gradle.kts`
- Kotlin Compose compiler plugin 2.2.10 - Enables Jetpack Compose Kotlin compilation
## Key Dependencies
- `androidx.core:core-ktx` 1.18.0 - Kotlin extensions for Android core APIs (`app/build.gradle.kts`)
- `androidx.lifecycle:lifecycle-runtime-ktx` 2.10.0 - Lifecycle-aware coroutine scopes
- `androidx.activity:activity-compose` 1.13.0 - Compose integration with `ComponentActivity` (used in `MainActivity.kt`)
- `androidx.compose:compose-bom` 2024.09.00 - BOM that manages all Compose library versions
- `androidx.compose.ui:ui` - Core Compose UI primitives
- `androidx.compose.ui:ui-graphics` - Compose graphics primitives
- `androidx.compose.ui:ui-tooling-preview` - `@Preview` annotation support (used in `MainActivity.kt`)
- `androidx.compose.ui:ui-tooling` (debug) - Layout inspector and preview rendering
- `androidx.compose.ui:ui-test-manifest` (debug) - Test manifest for Compose UI tests
## Configuration
- No `.env` files detected
- `local.properties` present at project root (contains local SDK path, not committed)
- `gradle.properties` at root: sets JVM args (`-Xmx2048m`), encoding UTF-8, Kotlin code style `official`
- Root build: `build.gradle.kts` - Applies AGP and Kotlin Compose plugins
- App module build: `app/build.gradle.kts` - Full app configuration, dependencies
- Version catalog: `gradle/libs.versions.toml` - Centralized dependency version management
- Settings: `settings.gradle.kts` - Single-module project (`app`), repositories Google + MavenCentral
- ProGuard: `app/proguard-rules.pro` - Custom rules file; minification disabled in release (`isMinifyEnabled = false`)
## Platform Requirements
- Android Studio (JDK bundled)
- Android SDK with API 36 platform installed
- Gradle 9.3.1 (auto-downloaded via wrapper)
- Android 8.1 (API 27) minimum
- Deployed as APK/AAB targeting Android 14+ (API 36)
- No server-side component; purely a client Android application
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Kotlin source files use PascalCase matching their primary class/object name: `MainActivity.kt`, `Color.kt`, `Theme.kt`, `Type.kt`
- Test files mirror the class under test with no suffix for example files: `ExampleUnitTest.kt`, `ExampleInstrumentedTest.kt`
- Resource files use snake_case: `ic_launcher_background.xml`, `backup_rules.xml`, `data_extraction_rules.xml`
- PascalCase for all class types: `MainActivity`, `ExampleUnitTest`, `ExampleInstrumentedTest`
- Activity names end with `Activity`: `MainActivity`
- Composable functions use PascalCase: `Greeting`, `GreetingPreview`, `APPTESTETheme`
- Non-composable functions use camelCase: `onCreate`
- Test method names use snake_case with descriptive names: `addition_isCorrect`, `useAppContext`
- Override functions follow Android/Kotlin convention: `onCreate`
- Top-level val constants use PascalCase: `Purple80`, `PurpleGrey80`, `Pink80`, `DarkColorScheme`, `LightColorScheme`, `Typography`
- Local variables use camelCase: `colorScheme`, `appContext`, `innerPadding`
- Private top-level vals are marked `private`: `DarkColorScheme`, `LightColorScheme`
- All lowercase, reverse domain notation: `com.example.appteste`
- Sub-packages lowercase: `com.example.appteste.ui.theme`
## Code Style
- Tool: Kotlin official code style (`kotlin.code.style=official` in `gradle.properties`)
- No explicit ktlint or detekt configuration file detected
- 4-space indentation in Kotlin source files (standard Kotlin style)
- Used in multi-line parameter lists: `Greeting(name = "Android", modifier = Modifier.padding(innerPadding))`
- No `.editorconfig`, `detekt.yml`, or `ktlint` config detected
- Relies on Android Studio / Kotlin compiler defaults with `kotlin.code.style=official`
## Import Organization
## Composable Conventions
- Annotated with `@Composable`
- PascalCase naming (treated as pseudo-classes per Compose convention)
- Default `Modifier` parameter always last: `fun Greeting(name: String, modifier: Modifier = Modifier)`
- Preview functions annotated with `@Preview(showBackground = true)` and `@Composable`
- Preview functions have `Preview` suffix: `GreetingPreview`
- All composable content wrapped in the app theme: `APPTESTETheme { ... }`
- Theme composable located at `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`
- `Scaffold` used as top-level layout container with `Modifier.fillMaxSize()`
- `innerPadding` passed explicitly to child composables via `Modifier.padding(innerPadding)`
## Error Handling
- No try/catch blocks present
- No sealed classes for Result/Error types detected
- Android lifecycle error handling deferred to framework defaults
## Logging
## Comments
- Block comments used to document alternative/disabled configuration: `/* Other default colors to override ... */` in `Theme.kt` and `Type.kt`
- Inline comments explain intent: `// Dynamic color is available on Android 12+` in `Theme.kt`
- KDoc used in test files to link to documentation: `/** See [testing documentation](...) */`
- KDoc used in generated test scaffolding with `/** */` block style and hyperlinks
- Not used on production composable functions in this scaffold
## Function Design
## Module Design
- `com.example.appteste` — entry point (`MainActivity.kt`)
- `com.example.appteste.ui.theme` — theming (`Color.kt`, `Theme.kt`, `Type.kt`)
## Kotlin-Specific Patterns
- `val` for immutable top-level properties
- `when` expressions for conditional logic in `Theme.kt`
- String templates: `"Hello $name!"`
- Default parameter values: `modifier: Modifier = Modifier`, `darkTheme: Boolean = isSystemInDarkTheme()`, `dynamicColor: Boolean = true`
- Trailing lambdas in Composable calls: `setContent { ... }`, `APPTESTETheme { ... }`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- One Activity (`MainActivity`) serves as the sole entry point and host for all UI
- UI is built entirely with Jetpack Compose declarative composables (no XML layouts)
- Theme system is centralised in a dedicated `ui/theme` package
- No ViewModel, Repository, or data layers present — this is a minimal scaffold app
## Layers
- Purpose: Render UI and handle user interaction
- Location: `app/src/main/java/com/example/appteste/`
- Contains: `MainActivity.kt`, `@Composable` functions
- Depends on: `ui/theme` package, Jetpack Compose libraries
- Used by: Android OS (launched via `LAUNCHER` intent)
- Purpose: Centralise design tokens (colors, typography, theme wrapper)
- Location: `app/src/main/java/com/example/appteste/ui/theme/`
- Contains: `Color.kt`, `Type.kt`, `Theme.kt`
- Depends on: `androidx.compose.material3`, `androidx.compose.ui`
- Used by: `MainActivity.kt` via `APPTESTETheme { ... }`
- Purpose: Static assets, launcher icons, string resources, XML config
- Location: `app/src/main/res/`
- Contains: Drawables, mipmap icons, `values/strings.xml`, `values/colors.xml`, `values/themes.xml`, `xml/backup_rules.xml`, `xml/data_extraction_rules.xml`
- Depends on: Nothing (referenced by manifest and code via R class)
- Used by: `AndroidManifest.xml`, generated `R` class
## Data Flow
- No state management layer present; all composables are stateless at this stage
## Key Abstractions
- Purpose: Material3 theme wrapper providing color, typography, and dynamic color support
- File: `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`
- Pattern: Composable wrapper — wraps content in `MaterialTheme`
- Purpose: Reusable stateless composable displaying a greeting text
- File: `app/src/main/java/com/example/appteste/MainActivity.kt`
- Pattern: Stateless `@Composable` function with `modifier` parameter
- Purpose: Named color constants for light and dark color schemes
- File: `app/src/main/java/com/example/appteste/ui/theme/Color.kt`
- Pattern: Top-level `val` declarations, referenced by `Theme.kt`
- Purpose: Material3 typography scale definition
- File: `app/src/main/java/com/example/appteste/ui/theme/Type.kt`
- Pattern: Single top-level `val Typography` consumed by `APPTESTETheme`
## Entry Points
- Location: `app/src/main/java/com/example/appteste/MainActivity.kt`
- Triggers: Android OS launcher intent (`android.intent.action.MAIN` / `android.intent.category.LAUNCHER`)
- Responsibilities: Enable edge-to-edge display, host Compose content tree, apply app theme
- Location: `app/src/main/AndroidManifest.xml`
- Triggers: Build system and Android package manager
- Responsibilities: Declare application metadata, register `MainActivity` as launcher, reference backup and data extraction rules
## Error Handling
- No try/catch blocks present
- No error state composables present
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
