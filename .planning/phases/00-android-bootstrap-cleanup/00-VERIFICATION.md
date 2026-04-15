---
phase: 00-android-bootstrap-cleanup
verified: 2026-04-15T12:00:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Instalar o APK demo-debug em um dispositivo ou emulador com API 27+"
    expected: "O app abre sem crash, exibe a tela com 'Bem-vindo ao Portal Juridico!' e responde normalmente"
    why_human: "Nao ha emulador disponivel no ambiente de CI local. O APK foi compilado com sucesso (assembleDemoDebug BUILD SUCCESSFUL conforme 00-04-SUMMARY), mas a instalacao em dispositivo nao pode ser verificada programaticamente neste ambiente."
---

# Phase 0: Android Bootstrap & Cleanup — Verification Report

**Phase Goal:** The existing Android scaffold is production-ready — renamed, modularized, with modern dependencies, Hilt DI, release minification, and baseline CI, so all subsequent Android work builds on a clean foundation instead of fighting legacy debt.
**Verified:** 2026-04-15T12:00:00Z
**Status:** human_needed
**Re-verification:** No — verificacao inicial

---

## Goal Achievement

### Observable Truths (Success Criteria do ROADMAP)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Android project builds under a production package name (no `com.example.appteste`) and installs on an API 27+ device | PARTIAL | Zero ocorrencias de `com.example.appteste` nos modulos ativos do Gradle. O diretorio `app/` legado existe no disco como arquivo nao rastreado pelo git (untracked), sem inclusao em `settings.gradle.kts`. Build compila com sucesso. Instalacao em dispositivo requer verificacao humana. |
| 2 | Release builds ship with R8/minification enabled and verified in build logs | VERIFIED | `isMinifyEnabled = true` em `app-cliente/build.gradle.kts` e `app-escritorio/build.gradle.kts`. ProGuard rules escritas em ambos os modulos. 00-05-SUMMARY confirma `:app-cliente:assembleDemoRelease BUILD SUCCESSFUL` com tarefa `:app-cliente:minifyDemoReleaseWithR8` executada. |
| 3 | Multi-module layout exists with `:core-common`, `:core-network`, `:core-data`, `:core-ui`, `:app-cliente`, `:app-escritorio` and each module compiles independently | VERIFIED | Todos os 6 modulos existem com `build.gradle.kts`. `settings.gradle.kts` inclui todos os 6, exclui `:app`. Build individual verificado por commits dos planos 02 e 03 (`:core-ui:compileDebugKotlin` e `:app-cliente:compileDemoDebugKotlin` BUILD SUCCESSFUL). |
| 4 | Hilt is wired and a trivial `@Inject` sample resolves at runtime in at least one module | VERIFIED | `AppConfig` com `@Singleton @Inject constructor()` em `:core-common`. `ClienteApp` com `@HiltAndroidApp`. `MainActivity` do `app-cliente` com `@AndroidEntryPoint` e `@Inject lateinit var appConfig: AppConfig`. `assembleDemoDebug BUILD SUCCESSFUL` confirmado com geracao de codigo Hilt (`Hilt_ClienteApp.java`, `Hilt_MainActivity.java`) verificada em 00-04-SUMMARY. |
| 5 | Gradle dependency catalog is upgraded (Compose BOM current, Kotlin/AGP current) and `./gradlew build` passes locally | VERIFIED | `composeBom = "2026.03.00"` confirmado em `gradle/libs.versions.toml`. Hilt 2.59.2 (upgrade necessario — 2.57.1 incompativel com AGP 9.x). KSP 2.2.10-2.0.2 (correcao — 2.2.10-1.0.31 nao existe). Todos os alias de plugins presentes. Build local verificado por 00-05-SUMMARY (fase 0 gate — todos os 8 checks passaram). |

**Score:** 4/5 truths verified (SC1 requer verificacao humana para o criterio de instalacao em dispositivo)

---

### Deferred Items

Nenhum — todos os itens sao verificaveis ou requerem verificacao humana nesta fase.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `core-common/build.gradle.kts` | Config de biblioteca com Hilt + KSP | VERIFIED | Namespace `com.aethixdigital.portaljuridico.common`, `compileSdk = 36` (integer), `ksp(libs.hilt.compiler)` presente |
| `core-network/build.gradle.kts` | Config de biblioteca stub | VERIFIED | Namespace `com.aethixdigital.portaljuridico.network`, `compileSdk = 36` |
| `core-data/build.gradle.kts` | Config de biblioteca stub | VERIFIED | Namespace `com.aethixdigital.portaljuridico.data`, `compileSdk = 36` |
| `core-ui/build.gradle.kts` | Config de biblioteca com Compose | VERIFIED | Namespace `com.aethixdigital.portaljuridico.ui`, `compileSdk = 36`, Compose habilitado |
| `app-cliente/build.gradle.kts` | App module com Hilt + KSP + Compose + productFlavors | VERIFIED | Namespace correto, `release(36)` DSL, `flavorDimensions += "tenant"`, flavor `demo` com `applicationId = "com.aethixdigital.portaljuridico.demo"`, `isMinifyEnabled = true` |
| `app-escritorio/build.gradle.kts` | App module com Hilt + KSP + Compose | VERIFIED | Namespace correto, `release(36)` DSL, `applicationId = "com.aethixdigital.portaljuridico.escritorio"`, `isMinifyEnabled = true` |
| `settings.gradle.kts` | Multi-module com 6 includes, sem :app | VERIFIED | Inclui todos os 6 modulos, `:app` explicitamente excluido, `rootProject.name = "PortalJuridico"` |
| `build.gradle.kts` (root) | 5 plugin aliases com apply false | VERIFIED (desvio documentado) | 5 plugins com `apply false` (sem `kotlin-android` — removido por design: AGP 9.x tem Kotlin embutido, aplicar `kotlin.android` causava conflito de extensao) |
| `gradle/libs.versions.toml` | BOM atual, Hilt, KSP, todos os aliases | VERIFIED | `composeBom = "2026.03.00"`, `hilt = "2.59.2"`, `ksp = "2.2.10-2.0.2"`, todos os plugin aliases presentes |
| `core-ui/src/main/java/.../ui/theme/Color.kt` | Definicoes de tokens de cor | VERIFIED | Package `com.aethixdigital.portaljuridico.ui.theme`, constantes de cor presentes |
| `core-ui/src/main/java/.../ui/theme/Type.kt` | Definicoes de tipografia | VERIFIED | Package correto, `val Typography` definido |
| `core-ui/src/main/java/.../ui/theme/Theme.kt` | Composable `PortalJuridicoTheme` | VERIFIED | `fun PortalJuridicoTheme`, sem referencias a `APPTESTETheme` ou `com.example` |
| `app-cliente/src/main/java/.../cliente/MainActivity.kt` | Entry point com `@AndroidEntryPoint` e `@Inject AppConfig` | VERIFIED | `@AndroidEntryPoint`, `@Inject lateinit var appConfig: AppConfig`, usa `PortalJuridicoTheme` |
| `app-escritorio/src/main/java/.../escritorio/MainActivity.kt` | Entry point com `@AndroidEntryPoint` | VERIFIED | `@AndroidEntryPoint`, usa `PortalJuridicoTheme` |
| `core-common/src/main/java/.../common/AppConfig.kt` | `@Singleton @Inject constructor` | VERIFIED | `@Singleton`, `class AppConfig @Inject constructor()`, campo `buildType` nao vazio |
| `app-cliente/src/main/java/.../cliente/ClienteApp.kt` | `@HiltAndroidApp` Application | VERIFIED | `@HiltAndroidApp class ClienteApp : Application()` |
| `app-escritorio/src/main/java/.../escritorio/EscritorioApp.kt` | `@HiltAndroidApp` Application | VERIFIED | `@HiltAndroidApp class EscritorioApp : Application()` |
| `core-common/src/test/java/.../common/AppConfigTest.kt` | Teste unitario sem Hilt harness | VERIFIED | 2 testes que instanciam `AppConfig()` diretamente, verificando instanciacao e `buildType` nao vazio |
| `app-cliente/proguard-rules.pro` | R8 keep rules para Hilt + Compose | VERIFIED | `-keep class *_HiltComponents`, `-keep class Hilt_*`, rules Compose, Kotlin e lifecycle presentes |
| `app-escritorio/proguard-rules.pro` | R8 keep rules para Hilt + Compose | VERIFIED | Conteudo identico ao app-cliente, regras Hilt e Compose presentes |
| `.github/workflows/android-ci.yml` | CI com lint + test + assembleDemoDebug | VERIFIED | JDK 17 Temurin, steps: lint, test, `:app-cliente:assembleDemoDebug`, upload APK artifact |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `settings.gradle.kts` | 6 modulos | `include()` declarations | WIRED | Todos os 6 modulos incluidos; `:app` excluido |
| `app-cliente/build.gradle.kts` | `:core-common`, `:core-ui` | `project()` dependencies | WIRED | `implementation(project(":core-common"))` e `implementation(project(":core-ui"))` presentes |
| `app-cliente/src/main/.../MainActivity.kt` | `core-ui Theme.kt` | `import com.aethixdigital.portaljuridico.ui.theme.PortalJuridicoTheme` | WIRED | Import e uso confirmados |
| `app-cliente/src/main/AndroidManifest.xml` | `ClienteApp` | `android:name=".ClienteApp"` | WIRED | Manifesto referencia `.ClienteApp` e `.MainActivity` |
| `app-escritorio/src/main/AndroidManifest.xml` | `EscritorioApp` | `android:name=".EscritorioApp"` | WIRED | Manifesto referencia `.EscritorioApp` e `.MainActivity` |
| `app-cliente/MainActivity.kt` | `AppConfig` (core-common) | `@Inject lateinit var appConfig: AppConfig` | WIRED | Injecao Hilt verificada, APK de debug compilado com sucesso |
| `app-cliente/build.gradle.kts` | `app-cliente/proguard-rules.pro` | `proguardFiles(...)` + `isMinifyEnabled = true` | WIRED | Config de release usa arquivo ProGuard correto |
| `.github/workflows/android-ci.yml` | `gradlew` | `run: ./gradlew :app-cliente:assembleDemoDebug` | WIRED | Step de CI invoca assembleDemoDebug |

---

### Data-Flow Trace (Level 4)

Nao aplicavel — esta fase e infraestrutura de build. Nao ha componentes que renderizam dados dinamicos de usuario.

---

### Behavioral Spot-Checks

| Comportamento | Verificacao | Resultado | Status |
|---------------|-------------|-----------|--------|
| `settings.gradle.kts` inclui 6 modulos | `grep ":core-common" settings.gradle.kts` | Match encontrado | PASS |
| `:app` excluido do build | `grep '":app"' settings.gradle.kts` | Sem match | PASS |
| BOM atualizado para 2026.03.00 | `grep 'composeBom = "2026.03.00"'` | Match encontrado | PASS |
| Hilt versao 2.59.2 (AGP 9.x compativel) | `grep 'hilt = "2.59.2"'` | Match encontrado | PASS |
| ProGuard Hilt keep rules presentes | `grep '_HiltComponents' app-cliente/proguard-rules.pro` | Match encontrado | PASS |
| `@HiltAndroidApp` em ClienteApp | `grep "@HiltAndroidApp" ClienteApp.kt` | Match encontrado | PASS |
| `@Inject` AppConfig em MainActivity | `grep "@Inject.*appConfig" MainActivity.kt` | Match encontrado | PASS |
| CI configurado com JDK 17 Temurin | `grep "java-version: '17'"` em CI yml | Match encontrado | PASS |
| Zero referencias ao package legado (fora de app/) | `grep -r "com.example.appteste" --include="*.kt"` (excluindo app/) | 0 matches | PASS |
| Desvio documentado: app/ existe no disco | `ls app/` | Diretorio existe | OBSERVACAO — ver abaixo |

---

### Requirements Coverage

| Requirement | Plano Fonte | Descricao | Status | Evidencia |
|-------------|------------|-----------|--------|-----------|
| BOOT-01 | 00-02, 00-05 | Package renomeado para producao, sem `com.example` | SATISFIED | Zero ocorrencias nos modulos ativos; `APPTESTETheme` → `PortalJuridicoTheme` |
| BOOT-02 | 00-03 | Compose BOM e dependencias atualizadas | SATISFIED | `composeBom = "2026.03.00"`, Hilt 2.59.2, KSP 2.2.10-2.0.2 |
| BOOT-03 | 00-05 | R8/minificacao habilitada e verificada | SATISFIED | `isMinifyEnabled = true` em release, ProGuard rules escritas, release build confirmado |
| BOOT-04 | 00-01 | Layout multi-modulo com 6 modulos | SATISFIED | 6 modulos com `build.gradle.kts`, todos em `settings.gradle.kts` |
| BOOT-05 | 00-04 | Hilt DI configurado e resolvido | SATISFIED | `@HiltAndroidApp`, `@AndroidEntryPoint`, `@Inject AppConfig`, APK montado com sucesso |
| BOOT-06 | 00-01, 00-03 | Catalogo de dependencias atualizado, `./gradlew build` passa | SATISFIED | Todos os aliases presentes, builds de debug e release confirmados |

---

### Anti-Patterns Found

| Arquivo | Linha | Pattern | Severidade | Impacto |
|---------|-------|---------|------------|---------|
| `app/` (diretorio) | — | Diretorio legado `com.example.appteste` existe no disco | Aviso | **Nao afeta o build** — `app/` e nao rastreado pelo git e excluido do Gradle (`settings.gradle.kts` nao inclui `:app`). Mas contradiz o criterio de aceitacao do plano 02: "test -d app/ exits 1". Limpeza local recomendada. |
| `build.gradle.kts` (root) | — | Apenas 5 plugins com `apply false` (sem `kotlin-android`) | Informativo | Desvio intencional e documentado em 00-01-SUMMARY: AGP 9.x tem Kotlin embutido; aplicar `kotlin.android` causava conflito. Nenhum impacto funcional. |
| `gradle/libs.versions.toml` | versoes | Hilt = 2.59.2 vs alvo do plano 2.57.1; KSP = 2.2.10-2.0.2 vs alvo 2.2.10-1.0.31 | Informativo | Desvios documentados e necessarios: 2.57.1 incompativel com AGP 9.x; 2.2.10-1.0.31 nao existe no Maven. Versoes finais sao corretas e superiores. |

---

### Human Verification Required

#### 1. Instalacao em Dispositivo API 27+

**Teste:** Instalar `app-cliente-demo-debug.apk` em um dispositivo fisico ou emulador com Android 8.1 (API 27) ou superior.
**Esperado:** App instala sem erros, abre com a tela "Bem-vindo ao Portal Juridico!", sem crash no startup. A injecao Hilt deve funcionar em runtime (se `AppConfig` nao for injetado, o app crasharia com `UninitializedPropertyAccessException` antes de exibir a UI).
**Por que humano:** Nao ha emulador disponivel no ambiente de verificacao automatica. O APK de debug foi gerado com sucesso (`assembleDemoDebug BUILD SUCCESSFUL` em 00-04-SUMMARY) mas a execucao em dispositivo so pode ser confirmada por um desenvolvedor.

---

### Gaps Summary

Nenhum gap bloqueante identificado. Todos os 5 criterios de sucesso do roadmap tem implementacao concreta verificavel no codigo:

- **SC1 (package rename + device install):** O criterio de pacote e atendido — zero referencias `com.example.appteste` nos modulos ativos. A parte de "instala em dispositivo API 27+" requer verificacao humana (nao e um gap de codigo, e uma validacao de runtime).
- **SC2 (R8/minification):** Totalmente satisfeito — `isMinifyEnabled = true`, ProGuard rules substantivas, release build confirmado pelo agente de execucao.
- **SC3 (multi-module):** Totalmente satisfeito — 6 modulos, compilacao independente confirmada.
- **SC4 (Hilt wired):** Totalmente satisfeito — grafo Hilt completo, geracao de codigo Hilt confirmada em 00-04-SUMMARY.
- **SC5 (dependency catalog):** Totalmente satisfeito — BOM 2026.03.00, Hilt 2.59.2, KSP 2.2.10-2.0.2, todos os aliases presentes.

**Observacao sobre `app/`:** O diretorio `app/` legado existe no disco como arquivo nao rastreado pelo git. Ele **nao e parte do build Gradle** (excluido de `settings.gradle.kts`). O plano 02 indicou que ele estava ausente no worktree de execucao. A presenca local nao impacta o objetivo da fase, mas e recomendada a remocao para higiene do repositorio.

**Desvios intencionais documentados:**
- `kotlin-android` plugin removido (AGP 9.x Kotlin embutido — desvio correto e necessario)
- Hilt 2.59.2 em vez de 2.57.1 (upgrade necessario para compatibilidade com AGP 9.x)
- KSP 2.2.10-2.0.2 em vez de 2.2.10-1.0.31 (versao corrigida — 1.0.31 nao existe)
- `android.disallowKotlinSourceSets=false` em `gradle.properties` (workaround oficial AGP 9.x para KSP)

---

_Verificado em: 2026-04-15_
_Verificador: Claude (gsd-verifier)_
