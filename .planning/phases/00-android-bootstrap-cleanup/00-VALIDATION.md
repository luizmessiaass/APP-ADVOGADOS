---
phase: 0
slug: android-bootstrap-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 0 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 4.13.2 (already present in project) |
| **Config file** | none — standard Android test runner |
| **Quick run command** | `./gradlew :app-cliente:assembleDemoDebug` |
| **Full suite command** | `./gradlew build lint test` |
| **Estimated runtime** | ~3-5 minutes (no emulator) |

---

## Sampling Rate

- **After every task commit:** Run `./gradlew :app-cliente:assembleDemoDebug`
- **After every plan wave:** Run `./gradlew build lint test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 00-01-01 | 01 | 1 | BOOT-04 | — | N/A | build | `./gradlew build` | ❌ W0 | ⬜ pending |
| 00-01-02 | 01 | 1 | BOOT-01 | — | N/A | build | `./gradlew build` fails if old package referenced | ❌ W0 | ⬜ pending |
| 00-01-03 | 01 | 2 | BOOT-06 | — | N/A | build | `./gradlew :app-cliente:assembleDemoDebug` | ❌ W0 | ⬜ pending |
| 00-02-01 | 02 | 1 | BOOT-02 | — | N/A | config | `./gradlew dependencies \| grep compose-bom` | ❌ W0 | ⬜ pending |
| 00-02-02 | 02 | 1 | BOOT-06 | — | N/A | build | `./gradlew build` | ❌ W0 | ⬜ pending |
| 00-03-01 | 03 | 1 | BOOT-05 | — | N/A | unit | `./gradlew :app-cliente:testDemoDebugUnitTest` | ❌ W0 | ⬜ pending |
| 00-04-01 | 04 | 1 | BOOT-03 | — | R8 obfuscation enabled | build | `./gradlew :app-cliente:assembleDemoRelease` | ❌ W0 | ⬜ pending |
| 00-05-01 | 05 | 1 | BOOT-01 | — | N/A | build | `./gradlew build` — no com.example references | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `core-common/src/test/java/com/aethixdigital/portaljuridico/common/AppConfigTest.kt` — unit test that instantiates AppConfig without DI (pure unit test, no Hilt)
- [ ] No Hilt test harness needed in Phase 0 — runtime DI verification done by app not crashing during `assembleDemoDebug`

*All other verifications are build-time (compile + assemble) checks rather than runtime test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App installs and runs on API 27+ device | BOOT-01 | Requires physical device or emulator | Connect API 27+ device, run `./gradlew :app-cliente:installDemoDebug`, verify app launches without crash |
| Hilt @Inject resolves at runtime | BOOT-05 | Runtime DI validation requires actual launch | Same as above — verify no `Hilt_MainActivity not found` crash on launch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5min
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
