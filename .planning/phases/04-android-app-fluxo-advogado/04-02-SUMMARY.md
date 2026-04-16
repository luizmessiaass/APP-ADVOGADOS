---
phase: 04-android-app-fluxo-advogado
plan: "02"
subsystem: core-common, core-ui
tags: [validation, cpf, cnj, compose, components, tdd]
dependency_graph:
  requires: []
  provides:
    - core-common/validation/CpfValidator (isValidCpf, formatCpf)
    - core-common/validation/CnjValidator (isValidCnjFormat, normalizeCnj)
    - core-ui/components/MovimentacaoCard
    - core-ui/components/ProcessoStatusCard
  affects:
    - Plan 04-04 (CadastroClienteScreen uses isValidCpf for real-time form validation)
    - Plan 04-05 (PreviewScreen uses MovimentacaoCard in LazyColumn)
    - Phase 5 (app-cliente reuses MovimentacaoCard and ProcessoStatusCard)
tech_stack:
  added: []
  patterns:
    - Top-level Kotlin functions for validators (no class wrapper, directly callable)
    - Pure-digits-only normalization guard in normalizeCnj (no ambiguous partial formats)
    - Disclaimer as first composable element in Column (Material3 Surface badge)
key_files:
  created:
    - core-common/src/main/java/com/aethixdigital/portaljuridico/common/validation/CpfValidator.kt
    - core-common/src/main/java/com/aethixdigital/portaljuridico/common/validation/CnjValidator.kt
    - core-common/src/test/java/com/aethixdigital/portaljuridico/common/validation/CpfValidatorTest.kt
    - core-common/src/test/java/com/aethixdigital/portaljuridico/common/validation/CnjValidatorTest.kt
    - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/MovimentacaoCard.kt
    - core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/ProcessoStatusCard.kt
  modified:
    - core-data/build.gradle.kts (removed kotlinOptions block causing AGP 9.1.1 conflict)
    - core-network/build.gradle.kts (removed kotlinOptions block causing AGP 9.1.1 conflict)
decisions:
  - normalizeCnj only normalizes pure-20-digit strings (no separators); partially-formatted CNJs fail validation
  - MovimentacaoCard uses primitive String params (not DTOs) to avoid circular dependency on :core-network
  - kotlinOptions block removed from core-data and core-network — AGP 9.1.1 already registers the kotlin extension
metrics:
  duration: ~25 min
  completed: "2026-04-16"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 04 Plan 02: Validators CPF/CNJ + Compose Components Summary

**One-liner:** CPF mod11 validator with all-same-digits guard + CNJ format validator with pure-digits normalization + MovimentacaoCard (disclaimer on top) + ProcessoStatusCard (ultimaSincronizacao).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Validators CPF e CNJ com testes unitários (TDD) | ce71bef | CpfValidator.kt, CnjValidator.kt, CpfValidatorTest.kt, CnjValidatorTest.kt |
| 2 | Componentes Compose — MovimentacaoCard e ProcessoStatusCard | cbf264d | MovimentacaoCard.kt, ProcessoStatusCard.kt |

## Verification Results

- `./gradlew :core-common:testDebugUnitTest` — BUILD SUCCESSFUL, 16 tests completed, 0 failures
  - CpfValidatorTest: 8 tests (3 all-same-digits, 1 valid formatted, 1 valid unformatted, 1 wrong check digit, 1 non-numeric, 1 empty)
  - CnjValidatorTest: 6 tests (formatted valid, 20-digit unformatted valid, malformed invalid, empty invalid, normalization 20-digit, normalization already-formatted)
- `./gradlew :core-ui:compileDebugKotlin` — BUILD SUCCESSFUL, 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CnjValidator normalizeCnj incorrectly normalizing partially-formatted inputs**
- **Found during:** Task 1 TDD GREEN phase (test `malformedCnj_isInvalid` failing)
- **Issue:** Original `normalizeCnj` stripped ALL digits from any input and reformatted if count == 20. A malformed input like `"0001234-55.2023.8.260100"` (OOOO colado ao TT) also has 20 digits, so it was being reformatted into valid CNJ format instead of failing.
- **Fix:** Changed guard to `PURE_DIGITS.matches(input) && input.length == 20` — normalization only triggers for inputs that are purely numeric (no separators). Mixed inputs (with separators in wrong positions) pass through unchanged and fail the CNJ_PATTERN match.
- **Files modified:** `core-common/src/main/java/com/aethixdigital/portaljuridico/common/validation/CnjValidator.kt`
- **Commit:** ce71bef

**2. [Rule 1 - Bug] core-data and core-network build.gradle.kts causing AGP 9.1.1 plugin conflict**
- **Found during:** Task 1 (build configuration phase)
- **Issue:** Both modules declared `alias(libs.plugins.kotlin.android)` + `kotlinOptions { jvmTarget = "11" }`. AGP 9.1.1 already registers the kotlin extension internally, causing "Cannot add extension with name 'kotlin', as there is an extension already registered" when the plugin is applied again.
- **Fix:** Removed `kotlinOptions` block from both modules; `compileOptions { sourceCompatibility/targetCompatibility = JavaVersion.VERSION_11 }` is sufficient — AGP handles Kotlin JVM target via the Java compatibility setting when kotlin.android is bundled.
- **Files modified:** `core-data/build.gradle.kts`, `core-network/build.gradle.kts`
- **Commit:** ce71bef

## Known Stubs

None — validators return real computed values, components display all passed parameters without placeholders.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All components operate on in-memory String parameters. Threat mitigations T-04-02-01 through T-04-02-04 fully implemented:

| Threat | Mitigation | Status |
|--------|------------|--------|
| T-04-02-01: all-same-digits bypass | Guard before mod11 arithmetic, covered by 3 unit tests | Implemented |
| T-04-02-02: disclaimer visibility | Disclaimer as first Surface in Column, above status text | Implemented |
| T-04-02-03: CNJ format spoofing | normalizeCnj only accepts pure 20-digit strings | Implemented |
| T-04-02-04: Compose Text injection | Compose Text() renders plain text only — no HTML/Markdown | Accepted (no surface) |

## Self-Check: PASSED

Files exist:
- FOUND: core-common/src/main/java/com/aethixdigital/portaljuridico/common/validation/CpfValidator.kt
- FOUND: core-common/src/main/java/com/aethixdigital/portaljuridico/common/validation/CnjValidator.kt
- FOUND: core-common/src/test/java/com/aethixdigital/portaljuridico/common/validation/CpfValidatorTest.kt
- FOUND: core-common/src/test/java/com/aethixdigital/portaljuridico/common/validation/CnjValidatorTest.kt
- FOUND: core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/MovimentacaoCard.kt
- FOUND: core-ui/src/main/java/com/aethixdigital/portaljuridico/ui/components/ProcessoStatusCard.kt

Commits exist:
- FOUND: ce71bef (Task 1)
- FOUND: cbf264d (Task 2)
