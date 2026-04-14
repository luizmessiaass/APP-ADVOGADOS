# Coding Conventions

**Analysis Date:** 2026-04-14

## Naming Patterns

**Files:**
- Kotlin source files use PascalCase matching their primary class/object name: `MainActivity.kt`, `Color.kt`, `Theme.kt`, `Type.kt`
- Test files mirror the class under test with no suffix for example files: `ExampleUnitTest.kt`, `ExampleInstrumentedTest.kt`
- Resource files use snake_case: `ic_launcher_background.xml`, `backup_rules.xml`, `data_extraction_rules.xml`

**Classes:**
- PascalCase for all class types: `MainActivity`, `ExampleUnitTest`, `ExampleInstrumentedTest`
- Activity names end with `Activity`: `MainActivity`

**Functions:**
- Composable functions use PascalCase: `Greeting`, `GreetingPreview`, `APPTESTETheme`
- Non-composable functions use camelCase: `onCreate`
- Test method names use snake_case with descriptive names: `addition_isCorrect`, `useAppContext`
- Override functions follow Android/Kotlin convention: `onCreate`

**Variables and Properties:**
- Top-level val constants use PascalCase: `Purple80`, `PurpleGrey80`, `Pink80`, `DarkColorScheme`, `LightColorScheme`, `Typography`
- Local variables use camelCase: `colorScheme`, `appContext`, `innerPadding`
- Private top-level vals are marked `private`: `DarkColorScheme`, `LightColorScheme`

**Packages:**
- All lowercase, reverse domain notation: `com.example.appteste`
- Sub-packages lowercase: `com.example.appteste.ui.theme`

## Code Style

**Formatting:**
- Tool: Kotlin official code style (`kotlin.code.style=official` in `gradle.properties`)
- No explicit ktlint or detekt configuration file detected

**Indentation:**
- 4-space indentation in Kotlin source files (standard Kotlin style)

**Trailing commas:**
- Used in multi-line parameter lists: `Greeting(name = "Android", modifier = Modifier.padding(innerPadding))`

**Linting:**
- No `.editorconfig`, `detekt.yml`, or `ktlint` config detected
- Relies on Android Studio / Kotlin compiler defaults with `kotlin.code.style=official`

## Import Organization

**Order:**
1. Android framework imports (`android.*`)
2. AndroidX imports (`androidx.*`)
3. Compose imports (`androidx.compose.*`)
4. Kotlin/JVM imports (when applicable)
5. Project-local imports (`com.example.appteste.*`)

**Pattern from `MainActivity.kt`:**
```kotlin
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.example.appteste.ui.theme.APPTESTETheme
```

**Path Aliases:** None used — fully qualified imports only.

**Wildcard Imports:** `import org.junit.Assert.*` is used in test files for JUnit assertion helpers.

## Composable Conventions

**Composable functions:**
- Annotated with `@Composable`
- PascalCase naming (treated as pseudo-classes per Compose convention)
- Default `Modifier` parameter always last: `fun Greeting(name: String, modifier: Modifier = Modifier)`
- Preview functions annotated with `@Preview(showBackground = true)` and `@Composable`
- Preview functions have `Preview` suffix: `GreetingPreview`

**Theme wrapping:**
- All composable content wrapped in the app theme: `APPTESTETheme { ... }`
- Theme composable located at `app/src/main/java/com/example/appteste/ui/theme/Theme.kt`

**Scaffold usage:**
- `Scaffold` used as top-level layout container with `Modifier.fillMaxSize()`
- `innerPadding` passed explicitly to child composables via `Modifier.padding(innerPadding)`

## Error Handling

**Strategy:** Not applicable — the codebase is a minimal scaffold with no business logic or explicit error handling implemented.

**Patterns:**
- No try/catch blocks present
- No sealed classes for Result/Error types detected
- Android lifecycle error handling deferred to framework defaults

## Logging

**Framework:** Not configured — no Timber, Log, or logging utility detected.

**Patterns:** No logging calls present in source files.

## Comments

**When to Comment:**
- Block comments used to document alternative/disabled configuration: `/* Other default colors to override ... */` in `Theme.kt` and `Type.kt`
- Inline comments explain intent: `// Dynamic color is available on Android 12+` in `Theme.kt`
- KDoc used in test files to link to documentation: `/** See [testing documentation](...) */`

**KDoc/KotlinDoc:**
- KDoc used in generated test scaffolding with `/** */` block style and hyperlinks
- Not used on production composable functions in this scaffold

## Function Design

**Size:** All functions are small, single-responsibility (< 20 lines each).

**Parameters:** Named arguments used consistently in composable calls:
```kotlin
Greeting(
    name = "Android",
    modifier = Modifier.padding(innerPadding)
)
```

**Return Values:** Composable functions are Unit-returning. Theme functions accept a `content: @Composable () -> Unit` lambda.

## Module Design

**Package structure:**
- `com.example.appteste` — entry point (`MainActivity.kt`)
- `com.example.appteste.ui.theme` — theming (`Color.kt`, `Theme.kt`, `Type.kt`)

**Exports:** No explicit module exports — standard Android single-module app.

**Barrel Files:** Not used. Each file declares its own package and exports individually.

## Kotlin-Specific Patterns

**Kotlin features used:**
- `val` for immutable top-level properties
- `when` expressions for conditional logic in `Theme.kt`
- String templates: `"Hello $name!"`
- Default parameter values: `modifier: Modifier = Modifier`, `darkTheme: Boolean = isSystemInDarkTheme()`, `dynamicColor: Boolean = true`
- Trailing lambdas in Composable calls: `setContent { ... }`, `APPTESTETheme { ... }`

**Kotlin code style setting:** `kotlin.code.style=official` enforces Kotlin coding conventions as documented at kotlinlang.org/docs/coding-conventions.html

---

*Convention analysis: 2026-04-14*
