---
phase: 00-android-bootstrap-cleanup
fixed_at: 2026-04-15T00:00:00Z
review_path: .planning/phases/00-android-bootstrap-cleanup/00-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 00: Code Review Fix Report

**Fixed at:** 2026-04-15T00:00:00Z
**Source review:** .planning/phases/00-android-bootstrap-cleanup/00-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Missing `applicationId` in `app-cliente` `defaultConfig`

**Files modified:** `app-cliente/build.gradle.kts`
**Commit:** 87c8a20
**Applied fix:** Adicionado `applicationId = "com.aethixdigital.portaljuridico.cliente"` como primeira linha do bloco `defaultConfig`, garantindo que todos os build variants (não apenas o flavor `demo`) tenham um `applicationId` definido.

---

### WR-02: `AppConfig.isDebugBuild()` reflects on a non-existent `BuildConfig` class

**Files modified:** `core-common/build.gradle.kts`, `core-common/src/main/java/com/aethixdigital/portaljuridico/common/AppConfig.kt`
**Commit:** b545c72
**Applied fix:** Habilitado `buildFeatures { buildConfig = true }` no `core-common/build.gradle.kts` para que o AGP gere o `BuildConfig` com namespace `com.aethixdigital.portaljuridico.common`. Substituída a lógica de reflexão em `AppConfig.kt` pelo acesso direto a `BuildConfig.DEBUG` do próprio módulo, eliminando o comportamento silenciosamente incorreto (sempre retornava `false`/`"release"` em debug).

---

### WR-03: CI `lint` task runs without module qualifier — will fail on multi-module project

**Files modified:** `.github/workflows/android-ci.yml`
**Commit:** 47b9991
**Applied fix:** Substituído `./gradlew lint` por `./gradlew :app-cliente:lintDemoDebug :app-escritorio:lintDebug`, qualificando explicitamente os dois módulos de aplicação com seus respectivos variants. Isso garante que o CI faça lint apenas nos targets intencionais e de forma determinística.

---

### WR-04: `android:allowBackup="true"` declared without backup rules — exposes user data

**Files modified:** `app-cliente/src/main/AndroidManifest.xml`, `app-escritorio/src/main/AndroidManifest.xml`
**Commit:** 69a39c5
**Applied fix:** Alterado `android:allowBackup="true"` para `android:allowBackup="false"` em ambos os manifests. Para Phase 0, onde nenhum dado sensível está sendo persistido ainda, a abordagem de desabilitar o backup completamente é a mais segura e alinhada com o requisito do CLAUDE.md de que "dado jurídico é sensível".

---

_Fixed: 2026-04-15T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
