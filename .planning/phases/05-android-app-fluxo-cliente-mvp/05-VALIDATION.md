---
phase: 5
slug: android-app-fluxo-cliente-mvp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 4 (unit) + Espresso / Compose UI Test (instrumented) |
| **Config file** | `app-cliente/build.gradle.kts` (testInstrumentationRunner) |
| **Quick run command** | `./gradlew :app-cliente:test` |
| **Full suite command** | `./gradlew :app-cliente:lint :app-cliente:test :app-cliente:connectedAndroidTest` |
| **Estimated runtime** | ~3-5 minutes (unit) / ~10-15 minutes (full with emulator) |

---

## Sampling Rate

- **After every task commit:** Run `./gradlew :app-cliente:test`
- **After every plan wave:** Run `./gradlew :app-cliente:lint :app-cliente:test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~300 seconds (unit suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | APP-01 | — | JWT role=cliente routes to ClienteHome | unit | `./gradlew :app-cliente:test` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | APP-02 | — | Lista processos only shows CPF-bound records | unit | `./gradlew :app-cliente:test` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | APP-03 | — | Status card renders plain-language text | ui | Compose UI test | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | APP-04 | — | Timeline items truncate with ver mais | ui | Compose UI test | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | APP-05 | — | Próxima data card visible without scroll | ui | Compose UI test | ❌ W0 | ⬜ pending |
| 05-02-04 | 02 | 2 | APP-07 | — | Última sincronização label present | ui | Compose UI test | ❌ W0 | ⬜ pending |
| 05-02-05 | 02 | 2 | APP-08 | — | Sem movimentação card renders reassuring text | ui | Compose UI test | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | APP-12 | — | Onboarding shows 4 screens on first open | ui | Compose UI test | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | APP-13 | — | LGPD consent: accept btn disabled until scroll end | ui | Compose UI test (performScrollToIndex) | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 3 | LGPD-02 | — | Logout on consent refuse, gate reappears next open | unit | `./gradlew :app-cliente:test` | ❌ W0 | ⬜ pending |
| 05-05-01 | 05 | 3 | APP-11 | — | WhatsApp deep-link fires, fallback to dialer | manual | — | N/A | ⬜ pending |
| 05-06-01 | 06 | 4 | APP-16 | — | lint + unit + UI tests pass in CI | ci | GitHub Actions | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `:app-cliente/src/test/java/...ClienteViewModelTest.kt` — unit stubs for APP-01, APP-02
- [ ] `:app-cliente/src/androidTest/java/...ProcessoDetailTest.kt` — UI stubs for APP-03 through APP-08
- [ ] `:app-cliente/src/androidTest/java/...OnboardingTest.kt` — UI stubs for APP-12
- [ ] `:app-cliente/src/androidTest/java/...LgpdConsentTest.kt` — UI stubs for APP-13, LGPD-02 (includes scroll-gate test)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WhatsApp deep-link opens WhatsApp | APP-11 | Requires device with WhatsApp installed; cannot mock PackageManager in Compose UI test on emulator | Install WhatsApp on test device, tap "Falar com meu advogado", verify WhatsApp opens with pre-filled number |
| Fallback to dialer when WhatsApp absent | APP-11 | Requires device/emulator without WhatsApp | On emulator without WhatsApp, tap button, verify Android dialer opens |
| LGPD consent persists after app kill | LGPD-02 | Requires DataStore persistence across process restart | Accept consent, kill app via adb, reopen, verify no consent screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
