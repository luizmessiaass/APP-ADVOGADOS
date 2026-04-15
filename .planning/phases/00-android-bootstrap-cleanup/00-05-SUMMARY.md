---
phase: 00-android-bootstrap-cleanup
plan: "05"
subsystem: android-build
tags: [proguard, r8, hilt, compose, ci, github-actions]
dependency_graph:
  requires: [00-01, 00-04]
  provides: [r8-minification, ci-workflow]
  affects: [release-apk]
tech_stack:
  added: []
  patterns: [R8 ProGuard keep rules for Hilt/Compose, GitHub Actions CI with JDK 17 Temurin]
key_files:
  created:
    - app-cliente/proguard-rules.pro
    - app-escritorio/proguard-rules.pro
    - .github/workflows/android-ci.yml
  modified: []
decisions:
  - "D-18: CI triggers on push/PR to main/master branches"
  - "D-19: CI runs lint + test + assembleDemoDebug"
  - "D-20: No emulator tests in CI (too slow, covered by unit tests)"
  - "D-21: Android-only CI at Phase 0; backend CI in Phase 1"
  - "T-00-05-01 mitigated: Action versions pinned with @v4 tags (not @latest)"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-15"
  tasks_completed: 2
  files_modified: 3
---

# Phase 00 Plan 05: ProGuard/R8 Rules + GitHub Actions CI Summary

**One-liner:** R8 release build verified with Hilt/Compose keep rules in both app modules; GitHub Actions CI workflow with JDK 17 Temurin, lint + test + assembleDemoDebug.

## Objective

Complete Phase 0 by writing production ProGuard/R8 keep rules into both app module proguard-rules.pro files and creating the GitHub Actions CI workflow.

## Tasks Completed

### Task 1: ProGuard/R8 keep rules for Hilt + Compose

**Commit:** `7b477fb`

Both `app-cliente/proguard-rules.pro` and `app-escritorio/proguard-rules.pro` (previously empty stubs) received the following key rules:

- `-keep class *_HiltComponents { *; }` — Hilt-generated component classes
- `-keep class *_HiltComponents$* { *; }` — nested Hilt component classes
- `-keep class Hilt_* { *; }` — Hilt activity/fragment injectors
- `-keepattributes *Annotation*` — required by @HiltAndroidApp, @Singleton, etc.
- `-keep class dagger.** { *; }` — Dagger runtime internals
- `@javax.inject.Inject` constructor/field keep rules
- `-keep class androidx.compose.** { *; }` — Compose UI internals
- `-keepattributes RuntimeVisibleAnnotations` (3 variants) — Kotlin metadata
- `-keep class kotlinx.coroutines.** { *; }` — Compose lifecycle dependency
- `-keep class androidx.lifecycle.** { *; }` — Android lifecycle

**Release build result:** `assembleDemoRelease` BUILD SUCCESSFUL (3m 4s, 125 tasks)
- R8 task ran: `:app-cliente:minifyDemoReleaseWithR8` executed
- APK produced at: `app-cliente/build/outputs/apk/demo/release/`
- No ClassNotFoundException errors

### Task 2: GitHub Actions CI workflow + final package name verification

**Commit:** `d0bab71`

`.github/workflows/android-ci.yml` created with:
- Trigger: push/PR to `main` and `master` branches
- Runner: `ubuntu-latest`
- JDK: 17 Temurin with Gradle cache
- Steps: `chmod +x gradlew`, `./gradlew lint`, `./gradlew test`, `./gradlew :app-cliente:assembleDemoDebug`
- Artifact upload: demo debug APK

**Package name verification result:** 0 occurrences of `com.example.appteste` in any `.kt`, `.xml`, `.gradle.kts`, or `.toml` file.

## Phase 0 Gate — All 8 Checks

| # | Check | Result |
|---|-------|--------|
| 1 | `assembleDemoRelease` exits 0 (R8 release build) | PASS |
| 2 | `assembleDemoDebug` exits 0 (debug build) | PASS |
| 3 | `core-common:testDebugUnitTest` exits 0 (AppConfigTest) | PASS |
| 4 | Zero `com.example.appteste` references in source | PASS (count=0) |
| 5 | `.github/workflows/android-ci.yml` exists | PASS |
| 6 | `_HiltComponents` in `app-cliente/proguard-rules.pro` | PASS |
| 7 | Exactly 6 projects (`:app-cliente`, `:app-escritorio`, `:core-common`, `:core-data`, `:core-network`, `:core-ui`) — no legacy `:app` | PASS |
| 8 | `composeBom = "2026.03.00"` in `gradle/libs.versions.toml` | PASS |

**STATUS: PHASE 0 COMPLETE — all 8 checks pass.**

## Deviations from Plan

None — plan executed exactly as written.

The only noteworthy operational detail: the Gradle build required `JAVA_HOME` to be set to the Android Studio JBR (`/c/Program Files/Android/Android Studio/jbr`) and `local.properties` to be copied to the worktree. Both are environment setup steps, not code deviations.

## Threat Flags

No new security-relevant surface introduced beyond what was documented in the plan's threat model.

- T-00-05-01 (Tampering, CI): Mitigated — all GitHub Actions pinned to `@v4` tags.
- T-00-05-02 (Info Disclosure, Release APK): Accepted — no secrets or user data in Phase 0 APK.
- T-00-05-03 (DoS, CI resources): Accepted — Gradle cache enabled, no secrets in CI.
- T-00-05-04 (Tampering, ProGuard rules): Accepted — rules scoped to Hilt/Compose, no broad `-keep class ** { *; }`.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| app-cliente/proguard-rules.pro | FOUND |
| app-escritorio/proguard-rules.pro | FOUND |
| .github/workflows/android-ci.yml | FOUND |
| 00-05-SUMMARY.md | FOUND |
| Commit 7b477fb (ProGuard rules) | FOUND |
| Commit d0bab71 (CI workflow) | FOUND |
