# Codebase Structure

**Analysis Date:** 2026-04-14

## Directory Layout

```
APPTESTE/                               # Project root
├── app/                                # Single Android application module
│   └── src/
│       ├── androidTest/                # Instrumented tests (run on device/emulator)
│       │   └── java/com/example/appteste/
│       │       └── ExampleInstrumentedTest.kt
│       ├── main/                       # Production source set
│       │   ├── AndroidManifest.xml     # App manifest
│       │   ├── java/com/example/appteste/
│       │   │   ├── MainActivity.kt     # Sole Activity + top-level composables
│       │   │   └── ui/
│       │   │       └── theme/          # Material3 design system
│       │   │           ├── Color.kt
│       │   │           ├── Theme.kt
│       │   │           └── Type.kt
│       │   └── res/                    # Android resources
│       │       ├── drawable/           # Vector drawables (launcher icon layers)
│       │       ├── mipmap-*/           # Launcher icon bitmaps (all densities)
│       │       ├── values/             # colors.xml, strings.xml, themes.xml
│       │       └── xml/                # backup_rules.xml, data_extraction_rules.xml
│       └── test/                       # Local JVM unit tests
│           └── java/com/example/appteste/
│               └── ExampleUnitTest.kt
├── gradle/
│   └── wrapper/                        # Gradle wrapper binaries
├── build.gradle.kts                    # Root build file (plugin declarations)
├── settings.gradle.kts                 # Module inclusion, repo configuration
├── gradle.properties                   # JVM args, Kotlin code style
├── gradlew / gradlew.bat               # Gradle wrapper scripts
└── local.properties                    # Local SDK path (not committed)
```

## Directory Purposes

**`app/src/main/java/com/example/appteste/`:**
- Purpose: All production Kotlin source code
- Contains: Activity class, Compose UI composables
- Key files: `MainActivity.kt`

**`app/src/main/java/com/example/appteste/ui/theme/`:**
- Purpose: Centralised Material3 theme system
- Contains: Color tokens, typography scale, theme composable wrapper
- Key files: `Color.kt`, `Type.kt`, `Theme.kt`

**`app/src/main/res/`:**
- Purpose: Android resource files (non-code assets)
- Contains: Launcher icons at all densities, string resources, XML config
- Key files: `values/strings.xml`, `values/themes.xml`

**`app/src/test/`:**
- Purpose: Local JVM unit tests executed on the host machine
- Contains: `ExampleUnitTest.kt` (scaffold placeholder)

**`app/src/androidTest/`:**
- Purpose: Instrumented tests executed on an Android device or emulator
- Contains: `ExampleInstrumentedTest.kt` (scaffold placeholder)

**`gradle/wrapper/`:**
- Purpose: Gradle wrapper distribution files ensuring reproducible builds
- Generated: Yes
- Committed: Yes

## Key File Locations

**Entry Points:**
- `app/src/main/java/com/example/appteste/MainActivity.kt`: App launch point, Compose host
- `app/src/main/AndroidManifest.xml`: Android package declaration, activity registration

**Configuration:**
- `app/build.gradle.kts`: App module dependencies, SDK versions, build features
- `settings.gradle.kts`: Project name, module list, repository management
- `gradle.properties`: Gradle daemon JVM settings, Kotlin style enforcement
- `local.properties`: Local Android SDK path (machine-specific, not committed)

**Core Logic:**
- `app/src/main/java/com/example/appteste/MainActivity.kt`: All current UI logic

**Theme System:**
- `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`: Theme composable wrapper
- `app/src/main/java/com/example/appteste/ui/theme/Color.kt`: Color token definitions
- `app/src/main/java/com/example/appteste/ui/theme/Type.kt`: Typography definitions

**Testing:**
- `app/src/test/java/com/example/appteste/ExampleUnitTest.kt`: Unit test scaffold
- `app/src/androidTest/java/com/example/appteste/ExampleInstrumentedTest.kt`: Instrumented test scaffold

## Naming Conventions

**Files:**
- Kotlin classes: PascalCase matching class name (e.g., `MainActivity.kt`, `Theme.kt`)
- Resource XML files: snake_case (e.g., `backup_rules.xml`, `data_extraction_rules.xml`)

**Directories:**
- Kotlin packages: lowercase (e.g., `ui`, `theme`)
- Resource directories: lowercase with hyphens for density qualifiers (e.g., `mipmap-hdpi`)

**Kotlin identifiers:**
- Classes/objects: PascalCase (e.g., `MainActivity`, `APPTESTETheme`)
- Functions and composables: camelCase (e.g., `onCreate`, `Greeting` uses PascalCase per Compose convention)
- Top-level vals: PascalCase for public design tokens (e.g., `Purple80`, `Typography`)

## Where to Add New Code

**New Screen / Feature:**
- Primary code: `app/src/main/java/com/example/appteste/` — create a new Kotlin file per screen or feature (e.g., `HomeScreen.kt`)
- If navigation is added, introduce a `navigation/` subpackage

**New Composable Component:**
- Implementation: `app/src/main/java/com/example/appteste/ui/components/` (create this directory)
- Group by feature or keep flat for small sets

**New ViewModel (when state management is needed):**
- Location: same package as its screen, or a dedicated `app/src/main/java/com/example/appteste/viewmodel/`

**New Repository / Data Layer:**
- Location: `app/src/main/java/com/example/appteste/data/` (create this directory)
- Follow a `repository/`, `model/`, `datasource/` subdivision as the layer grows

**Shared Utilities:**
- Location: `app/src/main/java/com/example/appteste/util/` (create this directory)

**Theme Changes:**
- Colors: `app/src/main/java/com/example/appteste/ui/theme/Color.kt`
- Typography: `app/src/main/java/com/example/appteste/ui/theme/Type.kt`
- Theme wrapper: `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`

**Unit Tests:**
- Location: `app/src/test/java/com/example/appteste/` — mirror the production package structure

**Instrumented Tests:**
- Location: `app/src/androidTest/java/com/example/appteste/` — mirror the production package structure

## Special Directories

**`.gradle/`:**
- Purpose: Gradle build cache and daemon files
- Generated: Yes
- Committed: No (listed in `.gitignore`)

**`.idea/`:**
- Purpose: Android Studio IDE project settings
- Generated: Yes
- Committed: Partially (some IDE settings are version-controlled by default)

**`gradle/wrapper/`:**
- Purpose: Gradle wrapper JAR and properties ensuring all developers use the same Gradle version
- Generated: Yes
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents for AI-assisted development workflow
- Generated: No (manually maintained)
- Committed: Yes

---

*Structure analysis: 2026-04-14*
