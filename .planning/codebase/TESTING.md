# Testing Patterns

**Analysis Date:** 2026-04-14

## Test Framework

**Runner:**
- JUnit 4 (`junit:junit:4.13.2`) for local unit tests
- AndroidJUnit4 (`androidx.test.ext:junit:1.3.0`) for instrumented tests
- Config: `app/build.gradle.kts` — `testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"`

**Assertion Library:**
- JUnit 4 `Assert.*` (wildcard import): `assertEquals`, etc.

**Compose UI Testing:**
- `androidx.compose.ui:ui-test-junit4` available via `androidTestImplementation` (declared in `app/build.gradle.kts`)
- `androidx.compose.ui:ui-test-manifest` included as `debugImplementation`

**Espresso:**
- `androidx.test.espresso:espresso-core:3.7.0` available for UI interaction tests

**Run Commands:**
```bash
./gradlew test                     # Run all local unit tests
./gradlew connectedAndroidTest     # Run all instrumented tests on device/emulator
./gradlew testDebugUnitTest        # Run debug variant unit tests
```

## Test File Organization

**Location:**
- Local unit tests: `app/src/test/java/com/example/appteste/`
- Instrumented tests: `app/src/androidTest/java/com/example/appteste/`
- Mirror the main source package structure under respective test source sets

**Naming:**
- Test classes use `Test` suffix: `ExampleUnitTest`, `ExampleInstrumentedTest`
- Test methods use snake_case describing the scenario: `addition_isCorrect`, `useAppContext`

**Structure:**
```
app/src/
├── test/
│   └── java/com/example/appteste/
│       └── ExampleUnitTest.kt          # Local JVM unit tests
└── androidTest/
    └── java/com/example/appteste/
        └── ExampleInstrumentedTest.kt  # On-device instrumented tests
```

## Test Structure

**Suite Organization:**

Local unit test pattern (`app/src/test/java/com/example/appteste/ExampleUnitTest.kt`):
```kotlin
package com.example.appteste

import org.junit.Test
import org.junit.Assert.*

class ExampleUnitTest {
    @Test
    fun addition_isCorrect() {
        assertEquals(4, 2 + 2)
    }
}
```

Instrumented test pattern (`app/src/androidTest/java/com/example/appteste/ExampleInstrumentedTest.kt`):
```kotlin
package com.example.appteste

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*

@RunWith(AndroidJUnit4::class)
class ExampleInstrumentedTest {
    @Test
    fun useAppContext() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.example.appteste", appContext.packageName)
    }
}
```

**Patterns:**
- No `@Before` / `@After` setup/teardown used (scaffold only)
- Single `@Test` method per class in current scaffold
- Inline variable assignment within test body rather than class-level fields
- Assertions via `assertEquals(expected, actual)` — expected value first

## Mocking

**Framework:** None configured. No Mockito, MockK, or other mocking library declared in `app/build.gradle.kts` or `gradle/libs.versions.toml`.

**Current state:** No mocks present in codebase. The scaffold tests only assert on literals or Android context.

**Recommended pattern when adding mocks:**
- Use MockK for idiomatic Kotlin mocking (not yet added to dependencies)
- Use `@RunWith(AndroidJUnit4::class)` for instrumented tests requiring Android context

**What to Mock (when mocking is added):**
- ViewModel dependencies
- Repository/data source interfaces
- External service clients

**What NOT to Mock:**
- `Modifier` — pass real instances
- `@Composable` lambdas — test via Compose test rule

## Fixtures and Factories

**Test Data:** Not applicable — current tests use only inline literals (`2 + 2`, `"com.example.appteste"`).

**Location:** No fixture or factory directory exists. When added, place test helpers at:
- `app/src/test/java/com/example/appteste/helpers/` for local unit test utilities
- `app/src/androidTest/java/com/example/appteste/helpers/` for instrumented test utilities

## Coverage

**Requirements:** No coverage threshold configured. No Jacoco or other coverage plugin detected in `app/build.gradle.kts` or `build.gradle.kts`.

**View Coverage:**
```bash
./gradlew testDebugUnitTest jacocoTestReport   # After adding Jacoco plugin
```

## Test Types

**Unit Tests:**
- Location: `app/src/test/java/com/example/appteste/`
- Run on JVM (no device required)
- Scope: Pure Kotlin/Java logic — no Android framework dependencies
- Current: 1 scaffold test (`ExampleUnitTest`)

**Instrumented Tests:**
- Location: `app/src/androidTest/java/com/example/appteste/`
- Run on Android device or emulator
- Scope: Android context access, UI interactions, database operations
- Runner: `androidx.test.runner.AndroidJUnitRunner`
- Current: 1 scaffold test (`ExampleInstrumentedTest`) that verifies `packageName`

**Compose UI Tests:**
- Framework available: `androidx.compose.ui:ui-test-junit4` declared but no tests written yet
- Would live in `app/src/androidTest/java/com/example/appteste/`
- Uses `createComposeRule()` or `createAndroidComposeRule<MainActivity>()`

**E2E Tests:** Not configured.

## Common Patterns

**Async Testing:** Not implemented. No coroutine test utilities (`kotlinx-coroutines-test`) are declared.

**Error Testing:** Not implemented in current scaffold.

**Compose UI Test Pattern (for when tests are added):**
```kotlin
@get:Rule
val composeTestRule = createComposeRule()

@Test
fun greeting_displaysName() {
    composeTestRule.setContent {
        APPTESTETheme {
            Greeting(name = "Test")
        }
    }
    composeTestRule.onNodeWithText("Hello Test!").assertIsDisplayed()
}
```

## CI/CD

No CI pipeline configuration detected (no `.github/workflows/`, `Jenkinsfile`, `bitrise.yml`, or equivalent). Tests are run manually via Gradle or Android Studio.

---

*Testing analysis: 2026-04-14*
