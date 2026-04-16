---
phase: 4
slug: android-app-fluxo-advogado
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 4 (unit) + Compose UI Test / Espresso (instrumented) |
| **Config file** | `app-escritorio/build.gradle.kts` (testImplementation/androidTestImplementation) |
| **Quick run command** | `./gradlew :app-escritorio:test` |
| **Full suite command** | `./gradlew :app-escritorio:lint :app-escritorio:test :app-escritorio:assembleDebug` |
| **Estimated runtime** | ~2-4 minutes (no emulator for unit tests) |

---

## Sampling Rate

- **After every task commit:** Run `./gradlew :app-escritorio:test`
- **After every plan wave:** Run full suite (lint + test + assemble)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~120 seconds (unit only), ~240 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Automated Command | Status |
|---------|------|------|-------------|-------------------|--------|
| 04-01-01 | 01 | 1 | ESCR-10 | `./gradlew :app-escritorio:test` | ⬜ pending |
| 04-01-02 | 01 | 1 | ESCR-10 | `./gradlew :core-network:test` | ⬜ pending |
| 04-01-03 | 01 | 1 | ESCR-01 | `./gradlew :app-escritorio:test` (AuthRepositoryTest) | ⬜ pending |
| 04-02-01 | 02 | 1 | ESCR-02/03 | `./gradlew :core-common:test` (CpfValidatorTest, CnjValidatorTest) | ⬜ pending |
| 04-03-01 | 03 | 2 | ESCR-01 | `./gradlew :app-escritorio:test` (LoginViewModelTest) | ⬜ pending |
| 04-03-02 | 03 | 2 | ESCR-04/05 | `./gradlew :app-escritorio:test` (ClienteListViewModelTest) | ⬜ pending |
| 04-04-01 | 04 | 2 | ESCR-02/03 | `./gradlew :app-escritorio:test` (CadastroViewModelTest) | ⬜ pending |
| 04-05-01 | 05 | 2 | ESCR-06/08 | `./gradlew :app-escritorio:test` (PreviewViewModelTest) | ⬜ pending |
| 04-06-01 | 06 | 2 | ESCR-07 | `./gradlew :app-escritorio:test` (AvisoViewModelTest) | ⬜ pending |
| 04-06-02 | 06 | 2 | ESCR-09 | Manual — requires Stripe session URL from backend | ⬜ pending |
| 04-07-01 | 07 | 2 | ESCR-11 | CI run (GitHub Actions) — full matrix lint+test+assemble | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app-escritorio/src/test/.../AuthRepositoryTest.kt` — stub tests for login/role detection
- [ ] `core-common/src/test/.../CpfValidatorTest.kt` — CPF mod11 unit tests including edge cases
- [ ] `core-common/src/test/.../CnjValidatorTest.kt` — CNJ regex and normalization tests
- [ ] `app-escritorio/src/test/.../ClienteListViewModelTest.kt` — ViewModel state machine tests
- [ ] `app-escritorio/src/test/.../CadastroViewModelTest.kt` — form validation state tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Customer Portal opens in Chrome Custom Tabs | ESCR-09 | Requires live Stripe session URL from backend + device/emulator with Chrome | 1. Login as advogado. 2. Tap "Gerenciar Assinatura". 3. Verify Chrome Custom Tabs opens with Stripe portal URL. |
| CPF+CNJ validation inline feedback UX | ESCR-03 | Visual timing (blur event → error display) hard to assert without running app | 1. Open cadastro screen. 2. Type invalid CPF, blur field. 3. Verify error label appears. 4. Complete valid CPF, verify error clears. |
| Preview screen matches client view | ESCR-06 | Requires real translated movimentação data from Phase 3 backend | 1. Login as advogado. 2. Select client with synced processes. 3. Tap "Ver como cliente". 4. Verify movimentações with AI disclaimer visible. |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 240s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
