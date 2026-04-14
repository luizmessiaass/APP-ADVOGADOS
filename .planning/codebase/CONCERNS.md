# Codebase Concerns

**Analysis Date:** 2026-04-14

## Tech Debt

**Unfinished Scaffold - No Real App Logic:**
- Issue: The entire codebase is the unmodified Android Studio "Empty Activity" template. `MainActivity.kt` contains only the generated `Greeting` composable with a hardcoded "Hello Android!" string. No actual product features have been built.
- Files: `app/src/main/java/com/example/appteste/MainActivity.kt`
- Impact: There is no application to reason about beyond boilerplate. All future phases start from zero.
- Fix approach: Replace placeholder composable with real screens and navigation as features are implemented.

**Hardcoded String in UI Logic:**
- Issue: The `Greeting` composable is called with the hardcoded literal `name = "Android"` directly in `MainActivity.onCreate`. This is not driven by any data source, ViewModel, or string resource.
- Files: `app/src/main/java/com/example/appteste/MainActivity.kt` (line 24)
- Impact: Pattern sets a poor precedent - future contributors may copy inline string literals instead of using `strings.xml` or data-driven values.
- Fix approach: Move user-facing strings to `app/src/main/res/values/strings.xml` and source dynamic content from a ViewModel.

**Commented-Out Color Scheme Overrides:**
- Issue: `LightColorScheme` in `Theme.kt` has a large commented-out block listing background, surface, and onPrimary colors that the template author intended to be customized. They remain as dead comments.
- Files: `app/src/main/java/com/example/appteste/ui/theme/Theme.kt` (lines 25-33)
- Impact: Leaves the color system in an ambiguous state - it is unclear which tokens will be used as the app grows. Dynamic color (Android 12+ wallpaper-based theming) is enabled by default, meaning the static `LightColorScheme`/`DarkColorScheme` are bypassed on most modern devices.
- Fix approach: Decide on a definitive brand color scheme, populate or remove the commented block, and explicitly set `dynamicColor = false` if consistent branding is required.

**Commented-Out Typography Styles:**
- Issue: `Type.kt` defines only `bodyLarge` typography. `titleLarge` and `labelSmall` are commented out template stubs.
- Files: `app/src/main/java/com/example/appteste/ui/theme/Type.kt` (lines 18-33)
- Impact: Any screen using text beyond body paragraphs will fall back to Material3 defaults, making future typography inconsistent unless proactively addressed.
- Fix approach: Define all required typography variants before building screens that use headings or labels.

**Generic Package and App Identity:**
- Issue: Application ID is `com.example.appteste`, app name is `APPTESTE`, and the single activity label also reads `APPTESTE`. The `com.example` namespace is reserved for samples and should never be published.
- Files: `app/build.gradle.kts` (lines 7, 15), `app/src/main/res/values/strings.xml`, `app/src/main/AndroidManifest.xml`
- Impact: Cannot publish to Google Play with a `com.example` package ID. Renaming the package ID after development has begun requires refactoring all source package declarations.
- Fix approach: Rename the application ID and package namespace to the real domain before writing any production code.

## Known Bugs

**No known runtime bugs** - the app renders a single text composable. No logic exists to contain defects beyond scaffolding.

## Security Considerations

**Code Obfuscation Disabled for Release:**
- Risk: `isMinifyEnabled = false` in the release build type means R8/ProGuard minification and obfuscation are turned off. Release APKs/AABs ship with unobfuscated class and method names.
- Files: `app/build.gradle.kts` (line 27)
- Current mitigation: None - ProGuard rules file exists (`app/proguard-rules.pro`) but obfuscation is explicitly disabled.
- Recommendations: Set `isMinifyEnabled = true` for release builds before any production deployment. Validate ProGuard rules do not break Compose reflection.

**Backup Configuration Left as Template Stubs:**
- Risk: `android:allowBackup="true"` is set in the manifest, but both `backup_rules.xml` and `data_extraction_rules.xml` are empty template stubs with commented-out include/exclude rules. Any app data stored later (SharedPreferences, databases) will be backed up to Google Drive without restriction.
- Files: `app/src/main/AndroidManifest.xml` (line 6), `app/src/main/res/xml/backup_rules.xml`, `app/src/main/res/xml/data_extraction_rules.xml`
- Current mitigation: No sensitive data is stored yet.
- Recommendations: As soon as any user data is persisted, define explicit `<include>`/`<exclude>` rules to prevent sensitive data from leaking through Google's auto-backup.

**TODO in Data Extraction Rules (Unresolved):**
- Risk: `data_extraction_rules.xml` contains an unresolved `TODO` comment from the template generator instructing the developer to configure cloud backup rules.
- Files: `app/src/main/res/xml/data_extraction_rules.xml` (line 8)
- Current mitigation: No data is extracted currently.
- Recommendations: Resolve before handling any personally identifiable information or tokens.

## Performance Bottlenecks

**No performance concerns at current state** - the app renders a single static `Text` composable with no I/O, no network calls, and no lists.

**Gradle Parallel Execution Disabled:**
- Problem: `org.gradle.parallel=true` is commented out in `gradle.properties`.
- Files: `gradle.properties` (line 14)
- Cause: Default template leaves it commented; the comment notes it requires decoupled projects.
- Improvement path: Enable `org.gradle.parallel=true` as soon as the project has more than one Gradle module, to reduce build times.

## Fragile Areas

**Single-Activity, No Navigation:**
- Files: `app/src/main/java/com/example/appteste/MainActivity.kt`
- Why fragile: All UI lives in one Activity with no navigation component. Adding a second screen requires a full navigation architecture decision (Compose Navigation, Fragments, etc.) retroactively.
- Safe modification: Integrate `androidx.navigation:navigation-compose` before adding any second destination.
- Test coverage: No UI tests for any screen logic.

**Theme Coupled to Dynamic Color by Default:**
- Files: `app/src/main/java/com/example/appteste/ui/theme/Theme.kt` (lines 43-51)
- Why fragile: Dynamic color short-circuits the static color scheme on Android 12+ devices. Any branded color defined in `Color.kt` is silently ignored on those devices unless `dynamicColor = false` is passed at the call site.
- Safe modification: Audit every `APPTESTETheme(...)` call site and explicitly pass `dynamicColor = false` if brand colors must be enforced.
- Test coverage: None.

## Scaling Limits

**Single Module:**
- Current capacity: One `:app` Gradle module with all code.
- Limit: As the codebase grows, a single-module structure makes build times longer (no incremental module caching), feature isolation impossible, and testing slower.
- Scaling path: Introduce feature modules (e.g., `:feature:home`, `:core:ui`) using the multi-module pattern before the module exceeds ~20 source files.

## Dependencies at Risk

**Compose BOM Pinned to 2024.09.00:**
- Risk: The Compose Bill of Materials is locked to the September 2024 release (`2024.09.00`). As of the analysis date (2026-04-14), this is approximately 19 months out of date. Newer Compose versions include bug fixes, performance improvements, and API stabilizations.
- Files: `gradle/libs.versions.toml` (line 11)
- Impact: Missing Compose stability fixes; `@Stable`/`@Immutable` optimizations available in newer BOM versions are absent. Some Material3 components added after 2024.09 are unavailable.
- Migration plan: Update `composeBom` to the latest stable BOM version and verify no API-breaking changes affect existing composables.

**Kotlin Version Mismatch Risk (2.2.10 vs ecosystem):**
- Risk: Kotlin is pinned to `2.2.10` in `libs.versions.toml`. While this is recent, the Compose compiler plugin (`kotlin-compose`) is tightly version-coupled to the Kotlin version. Upgrading either independently can break compilation.
- Files: `gradle/libs.versions.toml` (line 9)
- Impact: Any dependency that requires a newer Kotlin version will force a coordinated upgrade of both Kotlin and the Compose plugin.
- Migration plan: Always upgrade Kotlin and the Compose BOM together, consulting the Compose to Kotlin compatibility map at https://developer.android.com/jetpack/androidx/releases/compose-kotlin.

## Missing Critical Features

**No ViewModel / State Management:**
- Problem: No ViewModel, no state hoisting, and no dependency injection are present. The `Greeting` composable receives data directly in `setContent`.
- Blocks: Cannot build stateful UI, handle configuration changes correctly, or perform background work without establishing a ViewModel layer first.

**No Navigation:**
- Problem: No navigation library is declared or configured.
- Blocks: Cannot add a second screen without choosing and wiring up a navigation solution.

**No Dependency Injection:**
- Problem: No DI framework (Hilt, Koin, or manual DI) is configured.
- Blocks: Adding repositories, data sources, or shared services without DI will result in object-creation logic scattered across Activities and Composables.

**No Networking or Data Layer:**
- Problem: No HTTP client (Retrofit, Ktor), no local database (Room), and no data serialization library (Gson, Moshi, kotlinx.serialization) is present.
- Blocks: Any feature requiring remote or persisted data requires adding and configuring these dependencies from scratch.

**No Logging Framework:**
- Problem: No structured logging (Timber or equivalent) is configured. Only raw `android.util.Log` would be available.
- Blocks: Production log management and log level toggling require adding a logging abstraction before it is used throughout the codebase.

## Test Coverage Gaps

**Placeholder Tests Only:**
- What's not tested: All application logic - there is none yet. Both test files are unchanged template stubs.
- Files: `app/src/test/java/com/example/appteste/ExampleUnitTest.kt`, `app/src/androidTest/java/com/example/appteste/ExampleInstrumentedTest.kt`
- Risk: No testing infrastructure or patterns are established. The first real feature will land with zero test coverage unless tests are written proactively alongside it.
- Priority: High - establish ViewModel unit test patterns and at least one composable UI test before shipping any real feature.

**No Compose UI Tests for MainActivity:**
- What's not tested: The `Greeting` composable and `MainActivity` layout are not covered by any Compose UI test.
- Files: `app/src/main/java/com/example/appteste/MainActivity.kt`
- Risk: No regression protection exists for the UI entry point.
- Priority: Medium - set up one `createComposeRule()` test to validate the screen renders correctly, establishing the pattern for future screens.

---

*Concerns audit: 2026-04-14*
