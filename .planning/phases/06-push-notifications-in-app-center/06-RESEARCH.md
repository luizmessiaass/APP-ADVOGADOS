# Phase 6: Push Notifications & In-app Center - Research

**Researched:** 2026-04-15
**Domain:** FCM HTTP v1 / Android Notifications / WorkManager / Supabase schema / Node.js firebase-admin
**Confidence:** HIGH (stack verified via official docs; versions confirmed against Maven/npm registries)

---

<user_constraints>
## Restrições do Usuário (de 06-CONTEXT.md)

### Decisões Bloqueadas (Locked Decisions)

- **D-01:** Central de notificações acessada via bell icon no top app bar, visível em todas as telas do `:app-cliente`.
- **D-02:** Badge exibe número exato de não-lidas. Zera quando o usuário abre a tela da central.
- **D-03:** Cada item mostra: título fixo "Nova movimentação" + trecho do nome/número do processo + timestamp relativo + indicador visual de não-lida (●). Tocar navega para a tela do processo via deep-link.
- **D-04:** Central separa em "Não lidas" (topo) e "Lidas" (abaixo). Histórico: últimas 50 ou 30 dias (o que vier primeiro). Lazy loading simples — sem cursor-based pagination em v1.
- **D-05:** Tela de onboarding de bateria é a 5ª tela (atualiza Phase 5 D-09 de 4→5). Abre `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`. Instrução específica para Xiaomi/Samsung/Motorola.
- **D-06:** Tela 5 tem botão "Pular" — não obrigatório.
- **D-07:** `requestPermission(POST_NOTIFICATIONS)` na tela 3 do onboarding. Em Android <13 (API <33), silencioso. Nenhuma lógica condicional adicional além de `if (Build.VERSION.SDK_INT >= 33)`.
- **D-08:** Se o usuário negar: app continua. WorkManager é o fallback. Sem banners insistentes.
- **D-09:** `PeriodicWorkRequest` com intervalo de 15 minutos.
- **D-10:** Quando poll detecta notificações não-lidas: (a) atualiza badge; (b) exibe notificação local via `NotificationManager` com deep-link para a central in-app (não para processo específico). Usa o mesmo canal FCM.

### Áreas de Discrição do Claude

- Estratégia de deep-link: custom scheme `portaljuridico://` vs App Links (pesquisador decide)
- `NotificationChannel` — nome, importância, som/vibração
- Ilustração/ícone da tela 5
- Schema da tabela `notifications` no Supabase (migration SQL)
- Estratégia de deduplicação de notificações locais
- Refresh automático do FCM token via `onNewToken`

### Ideias Adiadas (Fora de Escopo)

- Classificação de notificações por impacto (DIFF-01, v2)
- Push notifications para app_escritorio (Phase 7+)
- Configuração de preferências de notificação (v2)

</user_constraints>

---

<phase_requirements>
## Requisitos da Fase

| ID | Descrição | Suporte de Pesquisa |
|----|-----------|---------------------|
| NOTIFY-01 | App registra FCM device token no backend após login (`POST /api/devices/register`) | FCM SDK `getToken()` + endpoint Fastify + tabela `device_tokens` |
| NOTIFY-02 | Backend envia push FCM de alta prioridade quando nova movimentação é detectada | firebase-admin `messaging.send()` com `android.priority: 'high'` |
| NOTIFY-03 | Backend trata tokens inválidos (HTTP 404 do FCM) removendo-os da base | Erro `messaging/registration-token-not-registered` → DELETE no `device_tokens` |
| NOTIFY-04 | App exibe notificações em primeiro plano e background com deep-link para o processo | `onMessageReceived()` (foreground) + FCM auto-display (background) + `pendingIntent` deep-link |
| NOTIFY-05 | Central in-app carrega notificações não-lidas do backend (safety net) | `GET /api/notifications` + `NotificationsViewModel` + `LazyColumn` |
| NOTIFY-06 | Tela de onboarding orienta usuário a desativar otimização de bateria | `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` + detecção de `Build.MANUFACTURER` |
| NOTIFY-07 | WorkManager executa poll periódico de 15 min como fallback | `PeriodicWorkRequestBuilder` (15 min mín.) + `@HiltWorker` |
| APP-09 | Cliente recebe push notification e pode tocar para abrir o processo | Deep-link `portaljuridico://processo/{id}` em `PendingIntent` FCM |
| APP-10 | App possui central de notificações in-app com histórico | Tela `NotificationCenterScreen` + `BadgedBox` no top app bar |

</phase_requirements>

---

## Sumário

A Phase 6 introduz a pilha de notificações completa no `:app-cliente`: FCM como canal primário, WorkManager como fallback, e uma central in-app como tela de histórico e safety net. A stack é madura e bem documentada, com apenas dois pontos de atenção críticos para o Brasil: (1) OEMs como Xiaomi e Samsung implementam battery optimizers que podem bloquear FCM high-priority mesmo com a configuração padrão — a combinação de `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` no onboarding e WorkManager de 15 min endereça isso estruturalmente. (2) O legacy FCM server key foi encerrado em julho de 2024; a implementação DEVE usar FCM HTTP v1 com service account (firebase-admin SDK — caminho mais simples).

A deduplicação de notificações locais (WorkManager vs FCM) é o ponto de maior complexidade de implementação: requer persistência de IDs exibidos no DataStore. O schema Supabase precisa de duas tabelas novas (`device_tokens` e `notifications`) com RLS multi-tenant alinhado ao padrão já estabelecido no projeto.

**Recomendação primária:** Usar `firebase-admin` 13.8.0 no backend (Node.js); Firebase BOM 34.12.0 no Android com `firebase-messaging:25.0.1`; WorkManager 2.11.2; `hilt-work:1.2.0`.

---

## Stack Padrão

### Core — Android

| Biblioteca | Versão | Finalidade | Por que padrão |
|-----------|--------|-----------|----------------|
| `firebase-bom` | **34.12.0** | BoM que gerencia versões Firebase | Versão mais recente (Apr 2026); garante compatibilidade entre libs |
| `firebase-messaging` | **25.0.1** (via BOM) | SDK FCM Android: token, `onMessageReceived`, `onNewToken` | Única lib oficial FCM para Android |
| `work-runtime` | **2.11.2** | WorkManager — PeriodicWorkRequest, CoroutineWorker | Última stable (Mar 2026); `work-runtime-ktx` é alias vazio desde 2.9.0 |
| `hilt-work` | **1.2.0** | `@HiltWorker` — injeção de dependências em Worker | Padrão Hilt para WorkManager no projeto |
| `androidx.hilt:hilt-compiler` | **1.2.0** | Processador de anotações KSP para hilt-work | Obrigatório com KSP (já configurado no projeto) |

[VERIFIED: firebase.google.com/support/release-notes/android — Firebase BOM 34.12.0 released April 09, 2026]
[VERIFIED: developer.android.com/jetpack/androidx/releases/work — WorkManager 2.11.2 released March 25, 2026]
[VERIFIED: developer.android.com/jetpack/androidx/releases/hilt — hilt-work 1.2.0 stable]

### Core — Backend (Node.js/Fastify)

| Biblioteca | Versão | Finalidade | Por que padrão |
|-----------|--------|-----------|----------------|
| `firebase-admin` | **13.8.0** | FCM HTTP v1 via Admin SDK; `messaging.send()` | Abstrai auth OAuth2 service account; única rota suportada pós-jul/2024 |

[VERIFIED: npmjs.com/package/firebase-admin — 13.8.0 publicada ~5 dias atrás (abril 2026)]

### Dependências já no Version Catalog (não adicionar novamente)

| Biblioteca | Versão Atual | Uso na Phase 6 |
|-----------|-------------|----------------|
| `hilt-android` | 2.59.2 | DI geral (já configurado) |
| `hilt-navigation-compose` | 1.2.0 | `hiltViewModel()` no `NotificationsViewModel` |
| `datastore-preferences` | 1.2.1 | Persistência: `lastPollTimestamp`, `shownNotificationIds`, `batteryOnboardingSeen` |
| `navigation-compose` | 2.9.7 | Rota `notifications` + deep-link `portaljuridico://notificacoes` |

### Adições ao `libs.versions.toml`

```toml
[versions]
firebaseBom = "34.12.0"
workManager = "2.11.2"
hiltWork = "1.2.0"

[libraries]
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
firebase-messaging = { group = "com.google.firebase", name = "firebase-messaging" }  # versão via BOM
work-runtime = { group = "androidx.work", name = "work-runtime", version.ref = "workManager" }
hilt-work = { group = "androidx.hilt", name = "hilt-work", version.ref = "hiltWork" }
hilt-work-compiler = { group = "androidx.hilt", name = "hilt-compiler", version.ref = "hiltWork" }

[plugins]
# google-services plugin necessário para Firebase
google-services = { id = "com.google.gms.google-services", version = "4.4.2" }
```

**Instalação backend:**
```bash
npm install firebase-admin@13.8.0
```

**Instalação Android (build.gradle.kts do `:app-cliente`):**
```kotlin
implementation(platform(libs.firebase.bom))
implementation(libs.firebase.messaging)
implementation(libs.work.runtime)
implementation(libs.hilt.work)
ksp(libs.hilt.work.compiler)
```

**NOTA:** O plugin `google-services` exige `google-services.json` na raiz de `:app-cliente`. Esse arquivo vem do Firebase Console ao criar o projeto Android. É um pré-requisito de Wave 0.

---

## Padrões de Arquitetura

### Estrutura de Módulos Recomendada para Phase 6

```
:app-cliente/
├── src/main/
│   ├── AndroidManifest.xml         # <service> FirebaseMessagingService + deep-link intent-filter
│   ├── google-services.json        # arquivo do Firebase Console (Wave 0)
│   └── java/.../cliente/
│       ├── fcm/
│       │   └── PortalMessagingService.kt   # extends FirebaseMessagingService
│       ├── notifications/
│       │   ├── data/
│       │   │   ├── NotificationsApi.kt      # Retrofit interface
│       │   │   ├── NotificationsRemoteDataSource.kt
│       │   │   └── DeviceTokenApi.kt
│       │   ├── domain/
│       │   │   ├── NotificationsRepository.kt (interface)
│       │   │   └── model/NotificationItem.kt
│       │   ├── worker/
│       │   │   └── NotificationPollWorker.kt  # @HiltWorker CoroutineWorker
│       │   └── ui/
│       │       ├── NotificationsViewModel.kt
│       │       └── NotificationCenterScreen.kt
│       └── onboarding/
│           └── BatteryOptimizationScreen.kt  # tela 5

:core-data/
└── NotificationsRepositoryImpl.kt

:core-network/
└── (NotificationsApi registrado no NetworkModule via Hilt)

supabase/migrations/
└── 006_device_tokens_notifications.sql
```

### Padrão 1: FCM Data-Only Message (Backend → Android)

**O que é:** Enviar apenas `data` (sem `notification`) no payload FCM. O `onMessageReceived()` é chamado em todos os estados do app (foreground, background, killed).

**Por que usar:** Se o payload contiver a chave `notification`, o sistema Android exibe automaticamente a notificação quando o app está em background — sem chamar `onMessageReceived()`. Isso impede o deep-link customizado e o controle de deduplicação.

**Quando usar:** Sempre neste projeto. O `PortalMessagingService.onMessageReceived()` constrói a `Notification` localmente e a exibe via `NotificationManager`.

[VERIFIED: firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type]
[CITED: firebase.blog/posts/2025/04/fcm-on-android/ — "process the message payload and display a notification immediately within onMessageReceived"]

```kotlin
// Source: firebase.google.com/docs/cloud-messaging/android/receive
class PortalMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        // Persistir token e enfileirar registro no backend
        // Chamar via WorkManager one-time para não bloquear thread FCM
        scheduleTokenRegistration(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val notificationId = remoteMessage.data["notification_id"] ?: return
        val processoId = remoteMessage.data["processo_id"]
        val titulo = remoteMessage.data["titulo"] ?: "Nova movimentação"
        val corpo = remoteMessage.data["corpo"] ?: ""

        // Deduplication: não exibir se já foi exibida (DataStore check)
        // Mostrar notificação local com deep-link
        showLocalNotification(notificationId, titulo, corpo, processoId)
    }
}
```

### Padrão 2: NotificationChannel (obrigatório desde API 26 / Android 8)

**O que é:** Android 8+ requer que todas as notificações sejam associadas a um canal com importância definida.

**Quando criar:** Na inicialização do Application (`@HiltAndroidApp`), não no momento de exibição da notificação.

[VERIFIED: firebase.google.com/docs/cloud-messaging/android/get-started — channel ID required for Android 8.0+]

```kotlin
// No ClienteApplication.kt (em @HiltAndroidApp)
private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            CHANNEL_ID,           // "portal_juridico_movimentacoes"
            "Movimentações",      // nome visível ao usuário
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Avisos sobre novidades nos seus processos"
            enableLights(true)
            enableVibration(true)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }
}

companion object {
    const val CHANNEL_ID = "portal_juridico_movimentacoes"
}
```

### Padrão 3: POST_NOTIFICATIONS Permission (Android 13+ / API 33+)

**O que é:** Android 13 exige permissão em runtime para exibir notificações.

**Quando pedir:** Na tela 3 do onboarding (D-07), via botão "Ativar notificações".

[VERIFIED: firebase.google.com/docs/cloud-messaging/android/get-started — "FCM SDK version 23.0.6 or higher includes the POST_NOTIFICATIONS permission"]

```kotlin
// No OnboardingScreen3 (notificações)
val permissionLauncher = rememberLauncherForActivityResult(
    ActivityResultContracts.RequestPermission()
) { isGranted ->
    // Sem ação especial — app continua mesmo se negado (D-08)
}

Button(onClick = {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    // Android < 13: noop silencioso
}) {
    Text("Ativar notificações")
}
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Padrão 4: WorkManager PeriodicWorkRequest com @HiltWorker

**O que é:** Poll periódico de notificações não-lidas como safety net contra OEM battery optimizer.

**Mínimo permitido:** 15 minutos (enforcement do Android OS — valores menores são silenciosamente elevados para 15 min).

[VERIFIED: developer.android.com/jetpack/androidx/releases/work — PeriodicWorkRequest mínimo 15 min]

```kotlin
// Source: developer.android.com/training/dependency-injection/hilt-jetpack
@HiltWorker
class NotificationPollWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val notificationsRepository: NotificationsRepository,
    private val notificationManager: NotificationManagerCompat,
    private val dataStore: DataStore<Preferences>
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val unread = notificationsRepository.getUnreadNotifications()
            val shownIds = dataStore.getShownNotificationIds()
            val newOnes = unread.filter { it.id !in shownIds }
            if (newOnes.isNotEmpty()) {
                showLocalBatchNotification(newOnes.size)
                dataStore.addShownNotificationIds(newOnes.map { it.id })
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}

// Enfileiramento (em Application ou ViewModel pós-login)
WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "notification_poll",
    ExistingPeriodicWorkPolicy.KEEP,   // não substituir se já está agendado
    PeriodicWorkRequestBuilder<NotificationPollWorker>(15, TimeUnit.MINUTES)
        .setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        )
        .build()
)
```

**Configuração do HiltWorkerFactory no Application:**
```kotlin
@HiltAndroidApp
class ClienteApplication : Application(), Configuration.Provider {

    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}
```

**AndroidManifest.xml — remover inicializador padrão:**
```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        android:value="androidx.startup"
        tools:node="remove" />
</provider>
```

### Padrão 5: Battery Optimization Onboarding (D-05)

**O que é:** Detectar fabricante via `Build.MANUFACTURER` e abrir a configuração correta de bateria.

[VERIFIED: developer.android.com/reference/android/provider/Settings#ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS]
[ASSUMED: Intent strings específicos de MIUI/One UI — variam por versão do OEM e devem ser testados em dispositivos reais]

```kotlin
@Composable
fun BatteryOptimizationScreen(packageName: String, onSkip: () -> Unit, onContinue: () -> Unit) {
    val context = LocalContext.current
    val manufacturer = Build.MANUFACTURER.lowercase()

    val oemInstruction = when {
        "xiaomi" in manufacturer || "redmi" in manufacturer ->
            "Configurações → Apps → Gerenciar apps → Portal Jurídico → Bateria → Sem restrição"
        "samsung" in manufacturer ->
            "Configurações → Bateria → Limites de uso da bateria → Portal Jurídico → Sem restrição"
        "motorola" in manufacturer ->
            "Configurações → Apps → Portal Jurídico → Bateria → Sem restrição no uso da bateria"
        else ->
            "Configurações → Apps → Portal Jurídico → Bateria → Sem restrição"
    }

    // Botão "Configurar agora"
    Button(onClick = {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:$packageName")
        }
        context.startActivity(intent)
    }) { Text("Configurar agora") }

    TextButton(onClick = onSkip) { Text("Pular") }
}
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

### Padrão 6: Backend — FCM Dispatch (Node.js/Fastify)

**O que é:** Enviar push FCM via firebase-admin quando nova movimentação é detectada.

[VERIFIED: firebase.google.com/docs/cloud-messaging/send/admin-sdk]
[VERIFIED: firebase.google.com/docs/cloud-messaging/error-codes — código `messaging/registration-token-not-registered`]

```typescript
// Source: firebase.google.com/docs/cloud-messaging/send/admin-sdk
import { getMessaging } from 'firebase-admin/messaging';

interface FcmDispatchService {
  sendMovimentacaoNotification(params: {
    deviceToken: string;
    notificationId: string;
    processoId: string;
    processoNome: string;
    movimentacaoResumo: string;
  }): Promise<void>;
}

async function sendMovimentacaoNotification(params) {
  const { deviceToken, notificationId, processoId, processoNome, movimentacaoResumo } = params;

  const message = {
    // DATA-ONLY payload — onMessageReceived() chamado em foreground E background
    data: {
      notification_id: notificationId,
      processo_id: processoId,
      titulo: 'Nova movimentação',
      corpo: `${processoNome}: ${movimentacaoResumo.slice(0, 100)}`,
      deep_link: `portaljuridico://processo/${processoId}`
    },
    android: {
      priority: 'high' as const,  // FCM HTTP v1 high priority
      ttl: 86400 * 1000,           // 24h TTL em milissegundos
    },
    token: deviceToken
  };

  try {
    const messageId = await getMessaging().send(message);
    logger.info({ messageId, processoId }, 'FCM dispatch success');
  } catch (error: any) {
    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-argument'
    ) {
      // NOTIFY-03: token inválido → remover da base
      await supabase.from('device_tokens').delete().eq('token', deviceToken);
      logger.warn({ deviceToken }, 'FCM token inválido removido');
    } else {
      throw error;
    }
  }
}
```

**Inicialização do Firebase Admin:**
```typescript
// src/lib/firebase.ts
import { initializeApp, cert } from 'firebase-admin/app';

initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!))
});
```

`FIREBASE_SERVICE_ACCOUNT_JSON` = conteúdo do `serviceAccountKey.json` (do Firebase Console → Settings → Service Accounts). Nunca commitar o JSON diretamente.

### Padrão 7: Deep-link — Custom Scheme (Decisão de Claude)

**Decisão:** Usar custom scheme `portaljuridico://` (não App Links HTTP).

**Justificativa:**
- App Links exigem um domínio HTTPS com arquivo `.well-known/assetlinks.json` — overhead desnecessário para v1
- Custom schemes são suficientes para o caso de uso (FCM deep-link interno + WorkManager notificação local)
- Push notifications e notificações locais disparam custom schemes sem dependência de DNS/domínio

[VERIFIED: developer.android.com/training/app-links — custom scheme recomendado para notificações push internas]

**AndroidManifest.xml (em MainActivity do `:app-cliente`):**
```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="portaljuridico" android:host="processo" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="portaljuridico" android:host="notificacoes" />
    </intent-filter>
</activity>
```

**Deep-link routes:**
- `portaljuridico://processo/{id}` → `ProcessoDetailScreen`
- `portaljuridico://notificacoes` → `NotificationCenterScreen`

**Handling no NavHost:**
```kotlin
NavHost(navController, startDestination = ...) {
    composable(
        route = "processo/{processoId}",
        deepLinks = listOf(navDeepLink { uriPattern = "portaljuridico://processo/{processoId}" })
    ) { backStackEntry ->
        val processoId = backStackEntry.arguments?.getString("processoId")
        ProcessoDetailScreen(processoId = processoId)
    }
    composable(
        route = "notifications",
        deepLinks = listOf(navDeepLink { uriPattern = "portaljuridico://notificacoes" })
    ) {
        NotificationCenterScreen()
    }
}
```

### Anti-Padrões a Evitar

- **Payload com chave `notification` no FCM:** Impede `onMessageReceived()` em background — usar apenas `data`.
- **Criar NotificationChannel dentro de `onMessageReceived()`:** Deve ser criado no Application.onCreate().
- **Usar `work-runtime-ktx` como dependência:** É alias vazio desde WorkManager 2.9.0; usar `work-runtime`.
- **Checar `Build.VERSION.SDK_INT >= 26` para NotificationChannel:** minSdk 27 do projeto — o check é desnecessário; channel sempre suportado.
- **Inicializar WorkManager com custom factory e NÃO remover `WorkManagerInitializer` do manifest:** Causa duplicação de fábricas e crash em runtime.
- **Token FCM registrado uma única vez no primeiro login e nunca atualizado:** Tokens FCM são rotacionados; `onNewToken()` DEVE re-registrar no backend sempre que chamado.
- **Legacy FCM server key (Authorization: key=...):** Foi encerrado em julho de 2024. Qualquer implementação usando server key não funcionará.

---

## Não Construir do Zero (Don't Hand-Roll)

| Problema | Não Construir | Usar | Por quê |
|----------|--------------|------|---------|
| FCM HTTP v1 autenticação OAuth2 | Request HTTP manual com service account | `firebase-admin` SDK | Service account token expira em 1h; SDK cuida do refresh automaticamente |
| Exibição de notificações Android | `NotificationCompat` manual via Bitmap etc | `NotificationCompat.Builder` (já na API Android) | Só não reinventar o builder — usar o builder padrão, não libs externas |
| Badge no top app bar | Biblioteca externa de badge | `BadgedBox` do Material3 (já no Compose BOM) | Componente nativo, já disponível no projeto |
| Agendamento periódico background | `AlarmManager` + `BroadcastReceiver` manual | `WorkManager` | WorkManager lida com Doze, reinicialização, constraints de rede, retry |
| Injeção em Worker | `WorkerFactory` manual | `@HiltWorker` + `HiltWorkerFactory` | Padrão já estabelecido no projeto; evita boilerplate de factory |
| Paginação da central | Cursor-based pagination custom | Lazy loading simples (D-04 decide: sem paginação complexa em v1) | 50 itens/30 dias é gerenciável em um único request |

---

## Pitfalls Comuns

### Pitfall 1: FCM High Priority Bloqueado por OEM Battery Optimizer

**O que vai errado:** Xiaomi (MIUI), Samsung (One UI) e Motorola têm camadas de otimização de bateria que podem matar processos em background mesmo com FCM high priority configurado. O usuário instala o app, concede permissões, mas não recebe notificações.

**Por que acontece:** OEMs brasileiros com Xiaomi/Samsung têm market share significativo e implementam battery savers agressivos independentemente da configuração padrão do Android. FCM high-priority wakes up o dispositivo mas o processo pode ser morto antes de entregar.

**Como evitar:** Tripla camada de proteção:
1. FCM high-priority (camada primária)
2. `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` no onboarding tela 5 (D-05)
3. WorkManager 15min (fallback sempre ativo)

**Sinais de alerta:** Taxa de entrega FCM alta no console Firebase mas usuários reclamando de não receber notificações — indica OEM bloqueando, não FCM.

[CITED: firebase.blog/posts/2025/04/fcm-on-android/]
[CITED: clevertap.com/blog/why-push-notifications-go-undelivered — OEMs citados explicitamente]

### Pitfall 2: `onMessageReceived()` não chamado em Background

**O que vai errado:** Desenvolvedor envia payload com chave `notification` junto com `data`. Quando app está em background, o sistema Android exibe a notificação automaticamente mas NÃO chama `onMessageReceived()` — o deep-link customizado nunca é construído.

**Por que acontece:** Comportamento documentado do FCM: payload `notification` = exibição pelo sistema (sem callback em background). Payload `data`-only = callback sempre.

**Como evitar:** Backend envia APENAS payload `data`, sem chave `notification`. `onMessageReceived()` constrói e exibe a notificação local manualmente.

[VERIFIED: firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type]

### Pitfall 3: WorkManager com HiltWorkerFactory não inicializa

**O que vai errado:** App crasha com `WorkManager is not initialized properly` ou Worker falha ao injetar dependências.

**Por que acontece:** WorkManager tem um `ContentProvider` de inicialização automática (`WorkManagerInitializer`). Se o Application implementa `Configuration.Provider` com `HiltWorkerFactory` mas não remove o inicializador padrão do manifest, há dois inicializadores em conflito.

**Como evitar:** Remover `WorkManagerInitializer` do manifest via `tools:node="remove"` (ver Padrão 4 acima).

[VERIFIED: developer.android.com/training/dependency-injection/hilt-jetpack]

### Pitfall 4: FCM Token Stale — Tokens não Atualizados

**O que vai errado:** Backend persiste o token no login, nunca atualiza. Após meses, Firebase rotaciona o token (reinstalação do app, clear de dados, atualização do app). Backend tenta enviar FCM e recebe erro 404 repetidamente.

**Por que acontece:** FCM tokens não são permanentes. Firebase rotaciona por segurança e eventos de ciclo de vida do app.

**Como evitar:** Implementar `onNewToken()` na `PortalMessagingService` que chama `POST /api/devices/register` sempre que o token muda. Backend faz UPSERT por `(user_id, device_id)`, não INSERT simples.

[CITED: firebase.google.com/docs/cloud-messaging/manage-tokens — "best practices for token management"]

### Pitfall 5: Duplicação de Notificações (FCM + WorkManager)

**O que vai errado:** FCM entrega notificação às 10h. WorkManager roda às 10h15 e encontra a notificação "não-lida" no backend (ainda não marcada como lida), exibe novamente. Usuário vê a mesma notificação duas vezes.

**Por que acontece:** WorkManager não sabe o que FCM já exibiu.

**Como evitar:** Manter um Set de `notification_ids` já exibidos persistido no DataStore. `onMessageReceived()` adiciona o ID ao set antes de exibir. `NotificationPollWorker` filtra IDs já contidos no set antes de exibir notificação local.

**Implementação DataStore:**
```kotlin
// DataStore key para IDs já exibidos
val SHOWN_NOTIFICATION_IDS = stringSetPreferencesKey("shown_notification_ids")

// Em onMessageReceived e no Worker
suspend fun markAsShown(notificationId: String) {
    dataStore.edit { prefs ->
        val current = prefs[SHOWN_NOTIFICATION_IDS] ?: emptySet()
        prefs[SHOWN_NOTIFICATION_IDS] = current + notificationId
    }
}
```

Limpar IDs antigos periodicamente (ex: manter só últimos 100) para evitar crescimento ilimitado do DataStore.

### Pitfall 6: `NotificationChannel` criado com `IMPORTANCE_DEFAULT` em vez de `IMPORTANCE_HIGH`

**O que vai errado:** Notificações chegam silenciosamente, sem som/vibração, e não aparecem em heads-up (popup). Usuário não percebe a notificação.

**Por que acontece:** Uma vez que o canal é criado, a importância não pode ser rebaixada via código — só pelo usuário nas configurações. Criar errado na primeira vez = usuário precisa reinstalar o app para corrigir.

**Como evitar:** Criar o canal com `IMPORTANCE_HIGH` desde o início (Wave 0/Padrão 2 acima).

---

## Schema Supabase

### Migration 006: `device_tokens` e `notifications`

```sql
-- migration: 006_device_tokens_notifications.sql

-- Tabela de tokens FCM por dispositivo por usuário
CREATE TABLE device_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token         TEXT NOT NULL,
    device_id     TEXT NOT NULL,  -- fingerprint do dispositivo (UUID gerado no app)
    platform      TEXT NOT NULL DEFAULT 'android',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, device_id)   -- UPSERT seguro: um token por dispositivo por usuário
);

-- RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Usuário só vê/modifica seus próprios tokens
CREATE POLICY "device_tokens: owner access"
    ON device_tokens
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() AND tenant_id = (
        SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::uuid
    ));

-- Service role (backend) acessa todos os tokens (para dispatch FCM)
-- Já garantido pelo service role key

-- Tabela de notificações (histórico por usuário/tenant)
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    processo_id     UUID REFERENCES processos(id) ON DELETE SET NULL,
    titulo          TEXT NOT NULL DEFAULT 'Nova movimentação',
    corpo           TEXT NOT NULL,
    deep_link       TEXT,                          -- portaljuridico://processo/{id}
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

-- Índice para query de não-lidas (padrão de acesso mais comum)
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, is_read, created_at DESC)
    WHERE is_read = FALSE;

-- Índice para histórico (D-04: últimas 50 ou 30 dias)
CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: owner read"
    ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications: owner update (mark read)"
    ON notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Backend (service role) insere notificações — sem política restritiva para INSERT via service role
```

**Endpoints Fastify necessários:**

| Método | Rota | Finalidade |
|--------|------|-----------|
| `POST` | `/api/devices/register` | NOTIFY-01: upsert token FCM |
| `DELETE` | `/api/devices/{deviceId}` | Logout: remover token |
| `GET` | `/api/notifications` | NOTIFY-05: histórico (query param: `?unread_only=true&limit=50`) |
| `PATCH` | `/api/notifications/{id}/read` | Marcar como lida |
| `PATCH` | `/api/notifications/read-all` | Marcar todas como lidas ao abrir a central |

---

## Arquitetura de Validação (Nyquist)

### Framework de Testes

| Propriedade | Valor |
|-------------|-------|
| Framework Android | JUnit 4 + Espresso + Compose UI Test (já no projeto) |
| Framework Worker | `WorkManagerTestInitHelper` (incluso em `work-testing`) |
| Config | Existing (Phase 0/4 CI configurado) |
| Comando rápido | `./gradlew :app-cliente:testDemoDebugUnitTest` |
| Suite completa | `./gradlew :app-cliente:connectedDemoDebugAndroidTest` |
| Backend | Jest (já no projeto Fastify) |

**Dependência de teste adicional:**
```toml
# libs.versions.toml
work-testing = { group = "androidx.work", name = "work-testing", version.ref = "workManager" }
```

### Mapeamento Requisitos → Testes

| Req ID | Comportamento | Tipo de Teste | Comando | Arquivo |
|--------|--------------|--------------|---------|---------|
| NOTIFY-01 | Registro do token FCM no backend | Integração (backend) | `npm test -- fcm-register` | `tests/devices.test.ts` |
| NOTIFY-02 | FCM dispatch de alta prioridade | Unitário (backend mock) | `npm test -- fcm-dispatch` | `tests/fcm-dispatch.test.ts` |
| NOTIFY-03 | Cleanup de token 404 | Unitário (backend mock) | `npm test -- fcm-invalid-token` | `tests/fcm-dispatch.test.ts` |
| NOTIFY-04 | Notificação em foreground + deep-link | Espresso/Compose UI | `./gradlew :app-cliente:connectedTest` | `NotificationsTest.kt` |
| NOTIFY-05 | Central in-app carrega do backend | Unitário Android (ViewModel) | `./gradlew :app-cliente:testDebugUnitTest` | `NotificationsViewModelTest.kt` |
| NOTIFY-06 | Tela 5 onboarding bateria exibida | Compose UI Test | `./gradlew :app-cliente:connectedTest` | `OnboardingTest.kt` |
| NOTIFY-07 | WorkManager poll executa | Unitário WorkManager | `./gradlew :app-cliente:testDebugUnitTest` | `NotificationPollWorkerTest.kt` |
| APP-09 | Deep-link abre processo correto | Compose UI Test | `./gradlew :app-cliente:connectedTest` | `DeepLinkTest.kt` |
| APP-10 | Badge exibe contagem correta | Compose UI Test | `./gradlew :app-cliente:connectedTest` | `NotificationBadgeTest.kt` |

### Teste de WorkManager (exemplo)

```kotlin
// Source: developer.android.com/topic/libraries/architecture/workmanager/how-to/testing-worker-impl
@RunWith(AndroidJUnit4::class)
class NotificationPollWorkerTest {

    private lateinit var context: Context

    @Before fun setup() {
        context = ApplicationProvider.getApplicationContext()
        val config = Configuration.Builder()
            .setMinimumLoggingLevel(Log.DEBUG)
            .setExecutor(SynchronousExecutor())
            .build()
        WorkManagerTestInitHelper.initializeTestWorkManager(context, config)
    }

    @Test fun `worker retorna success quando nao ha novas notificacoes`() {
        val request = PeriodicWorkRequestBuilder<NotificationPollWorker>(15, TimeUnit.MINUTES).build()
        val workManager = WorkManager.getInstance(context)
        val testDriver = WorkManagerTestInitHelper.getTestDriver(context)!!

        workManager.enqueue(request).result.get()
        testDriver.setPeriodDelayMet(request.id)
        testDriver.setAllConstraintsMet(request.id)

        val workInfo = workManager.getWorkInfoById(request.id).get()
        assertThat(workInfo.state).isEqualTo(WorkInfo.State.ENQUEUED)
    }
}
```

### Wave 0 — Lacunas de Teste

- [ ] `app-cliente/src/test/NotificationsViewModelTest.kt` — cobre NOTIFY-05
- [ ] `app-cliente/src/test/NotificationPollWorkerTest.kt` — cobre NOTIFY-07
- [ ] `app-cliente/src/androidTest/NotificationsTest.kt` — cobre NOTIFY-04, APP-09, APP-10
- [ ] `app-cliente/src/androidTest/OnboardingTest.kt` — atualizar para 5 telas (era 4)
- [ ] `supabase/tests/devices.test.ts` — cobre NOTIFY-01, NOTIFY-03
- [ ] `supabase/tests/fcm-dispatch.test.ts` — cobre NOTIFY-02, NOTIFY-03
- [ ] Instalar `work-testing`: adicionar ao `libs.versions.toml` e `app-cliente/build.gradle.kts`
- [ ] `google-services.json` do Firebase Console → colocar em `app-cliente/`

---

## Domínio de Segurança

### Categorias ASVS Aplicáveis

| Categoria ASVS | Aplica | Controle Padrão |
|---------------|--------|----------------|
| V2 Authentication | sim | Supabase Auth + JWT (já implementado) — token de device vinculado a `user_id` autenticado |
| V3 Session Management | não | N/A para notificações |
| V4 Access Control | sim | RLS policy garante que usuário só lê suas próprias notificações e tokens |
| V5 Input Validation | sim | `processoId` e `notificationId` em deep-links devem ser UUID validados antes de query |
| V6 Cryptography | não | FCM gerencia criptografia do canal; service account JSON deve ser guardado em secret manager |

### Padrões de Ameaça Conhecidos

| Padrão | STRIDE | Mitigação Padrão |
|--------|--------|-----------------|
| FCM token leak (token exposto em logs) | Disclosure | Nunca logar tokens FCM em nível DEBUG; usar pino redaction |
| Deep-link injection via FCM payload | Tampering | Validar `processoId` como UUID antes de navegar; nunca confiar em `deep_link` do payload sem sanitização |
| Token hijacking (backend lê token de outro tenant) | Elevation | RLS policy por `user_id` + endpoint `POST /devices/register` requer JWT válido |
| `google-services.json` / service account JSON commitado no git | Disclosure | `.gitignore` obrigatório; service account via env var criptografada (GitHub Secrets) |
| Brute force de notification ID | Tampering | UUIDs como IDs — espaço de busca inviável; sem IDs sequenciais |

---

## Estado da Arte

| Abordagem Antiga | Abordagem Atual | Quando Mudou | Impacto |
|-----------------|----------------|--------------|---------|
| FCM Legacy HTTP API (server key) | FCM HTTP v1 (service account OAuth2) | Encerrado jul/2024 | Qualquer código com `Authorization: key=` não funciona mais |
| `work-runtime-ktx` para CoroutineWorker | `work-runtime` (KTX movido para artifact principal) | WorkManager 2.9.0 (nov/2023) | Muitos tutoriais antigos ainda referenciam `-ktx`; usar `work-runtime` |
| Firebase KTX libs individuais (`firebase-messaging-ktx`) | Firebase BOM sem KTX separado | BOM 34.0.0 (jul/2025) | KTX foi integrado diretamente nas libs; não adicionar `-ktx` separadamente |
| `SharedPreferences` para persistência de flags | `DataStore Preferences` | Migração recomendada desde 2021 | Projeto já usa DataStore (Phase 4) — seguir padrão |
| `AlarmManager` para tasks periódicas | `WorkManager` PeriodicWorkRequest | Jetpack estável desde 2019 | WorkManager é a única abordagem recomendada pelo Google para background periódico |

**Deprecated/obsoleto:**
- `firebase-messaging-ktx`: fusionado na lib principal via BOM 34.0.0; não adicionar separadamente
- FCM legacy server key: encerrado. Não usar.
- `work-runtime-ktx`: alias vazio. Não usar como dependência real.

---

## Log de Suposições

| # | Afirmação | Seção | Risco se Errada |
|---|-----------|-------|----------------|
| A1 | Intent strings específicas de MIUI/One UI na tela de bateria ("Configurações → Apps → ...") correspondem ao caminho real nos menus do dispositivo | Padrão 5 (Battery Onboarding) | Usuário tenta seguir a instrução e não encontra o menu — frustração, abre ticket de suporte; mitigação: botão "Configurar agora" via `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` sempre abre a tela correta independentemente da instrução de texto |
| A2 | O projeto Supabase já tem tabela `processos` com coluna `id UUID` (referenciada em `notifications.processo_id`) | Schema migration | Migration falha com constraint violation; mitigação: usar `ON DELETE SET NULL` + verificar migration 002 antes |
| A3 | `hilt-work:1.2.0` é compatível com `hilt-android:2.59.2` (hilt-work 1.2.0 requer hilt 2.44+) | Stack Padrão | Conflito de versões em tempo de compilação; mitigação: verificar compatibilidade com `./gradlew dependencies` |

---

## Perguntas em Aberto

1. **Firebase Project Configuration**
   - O que sabemos: `google-services.json` é necessário para Firebase funcionar no Android
   - O que não está claro: O projeto Firebase para "portaljuridico" já existe no Firebase Console? Qual o `project_id`?
   - Recomendação: Wave 0 deve incluir tarefa para criador do projeto gerar o `google-services.json` e a service account key antes de implementar

2. **Marcação de Notificação como "Lida" — Trigger**
   - O que sabemos: Badge zera quando usuário abre a central (D-02). Notificações ficam em "não-lidas" até abertura da tela.
   - O que não está claro: Deve-se marcar as notificações como lidas automaticamente ao abrir a central (`PATCH /notifications/read-all`) ou somente ao tocar em cada uma?
   - Recomendação: Marcar todas como lidas ao abrir a tela (pattern Gmail) — alinhado com D-02 que diz "zera quando abre a central"

3. **FCM Token Registration — Timing pós-login**
   - O que sabemos: Deve acontecer após login (NOTIFY-01)
   - O que não está claro: Deve registrar antes ou depois do onboarding? Se o usuário fecha o app no meio do onboarding, o token fica registrado?
   - Recomendação: Registrar token imediatamente após login bem-sucedido (antes do onboarding), pois o token é independente do onboarding. Onboarding só gerencia permissão de exibição.

---

## Disponibilidade de Ambiente

| Dependência | Necessária Por | Disponível | Versão | Fallback |
|------------|---------------|-----------|--------|---------|
| Firebase Console (projeto criado) | google-services.json + service account key | ? | — | Não há fallback — bloqueante |
| Google Play Services no emulador/dispositivo | FCM token generation | Sim (dispositivos reais), Não (emulador sem Play) | — | Testar em dispositivo físico ou emulador com Play Store |
| Node.js >= 20 | firebase-admin 13.x | [ASSUMED] | ? | Node 18 funciona mas suporte depreciado |
| Supabase project (portaljuridico) | migrations 006 | Sim (ativo desde Phase 1) | — | — |

**Dependências bloqueantes sem fallback:**
- Criação do projeto no Firebase Console + geração do `google-services.json` e service account key JSON

---

## Fontes

### Primárias (HIGH confidence)
- [Firebase Android SDK Release Notes](https://firebase.google.com/support/release-notes/android) — versão firebase-bom 34.12.0, firebase-messaging 25.0.1
- [Firebase Cloud Messaging — Get Started Android](https://firebase.google.com/docs/cloud-messaging/android/get-started) — setup, AndroidManifest, onNewToken, POST_NOTIFICATIONS
- [Firebase Cloud Messaging — Send Admin SDK](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk) — `messaging.send()`, android.priority, error handling
- [Firebase Cloud Messaging — Error Codes](https://firebase.google.com/docs/cloud-messaging/error-codes) — `messaging/registration-token-not-registered`
- [FCM message types](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type) — data vs notification payload behavior
- [WorkManager Releases](https://developer.android.com/jetpack/androidx/releases/work) — work-runtime 2.11.2 (Mar 2026)
- [Hilt Releases](https://developer.android.com/jetpack/androidx/releases/hilt) — hilt-work 1.2.0
- [Android App Links](https://developer.android.com/training/app-links) — custom scheme vs App Links tradeoffs
- [npmjs firebase-admin](https://www.npmjs.com/package/firebase-admin) — 13.8.0 latest (Apr 2026)
- [Hilt + Jetpack WorkManager](https://developer.android.com/training/dependency-injection/hilt-jetpack) — @HiltWorker, HiltWorkerFactory

### Secundárias (MEDIUM confidence)
- [FCM on Android best practices — firebase.blog/posts/2025/04](https://firebase.blog/posts/2025/04/fcm-on-android/) — data-only payload, high priority, doze mode
- [Managing FCM tokens — firebase.blog](https://firebase.blog/posts/2023/04/managing-cloud-messaging-tokens/) — token lifecycle, rotation
- [CleverTap — OEM push notification delivery](https://clevertap.com/blog/why-push-notifications-go-undelivered-and-what-to-do-about-it/) — Xiaomi/Samsung/Motorola battery optimizers impact

### Terciárias (LOW confidence / marcadas como [ASSUMED])
- OEM intent strings específicas para battery settings (MIUI, One UI, Motorola) — verificar em dispositivos reais antes de commit

---

## Metadata

**Breakdown de confiança:**
- Stack (Firebase BOM, WorkManager, firebase-admin): HIGH — verificado contra Maven e npm registry
- Padrões de arquitetura (FCM data-only, HiltWorker, NotificationChannel): HIGH — verificado contra docs oficiais Firebase e Android Developers
- Pitfalls (OEM battery, onMessageReceived background, token staleness): MEDIUM-HIGH — combinação de docs oficiais + blog oficial Firebase
- Intent strings OEM específicas: LOW — [ASSUMED], variam por versão de firmware

**Data de pesquisa:** 2026-04-15
**Válido até:** 2026-07-15 (Firebase BOM atualiza mensalmente; verificar versão antes do início da implementação)
