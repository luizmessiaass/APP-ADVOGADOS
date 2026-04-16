# Phase 6: Push Notifications & In-app Center - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Implementar entrega confiável de notificações de novas movimentações no `:app-cliente`:

1. **FCM device token registration** — app registra token FCM no backend após login (`POST /api/devices/register`)
2. **FCM high-priority push** — backend dispara push quando nova movimentação é detectada e traduzida
3. **In-app notification center** — tela de central de notificações com histórico de não-lidas e lidas, acessada via bell icon no top app bar
4. **WorkManager fallback** — poll periódico de 15 min como safety net contra OEM battery optimizer
5. **Android 13+ POST_NOTIFICATIONS** — permissão explícita solicitada no onboarding
6. **Battery optimization onboarding** — 5ª tela de onboarding orientando Xiaomi/Samsung/Motorola

Escopo: módulo `:app-cliente` (UI + ViewModel + repositório de notificações) + backend (FCM dispatch + `/api/devices` endpoint + notifications table).

Não inclui: chat IA (v2), classificação de notificações por impacto (DIFF-01, v2), Stripe billing (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Central de Notificações — Acesso e Badge

- **D-01:** A central de notificações é acessada via **bell icon no top app bar**, visível em todas as telas do `:app-cliente`. Padrão consistente com apps como Gmail e WhatsApp Business.
- **D-02:** Badge exibe o **número exato de não-lidas** (ex: 🔔2). Zera quando o usuário abre a tela da central.

### Central de Notificações — Conteúdo e Layout

- **D-03:** Cada item da central mostra: **título fixo "Nova movimentação"** + trecho do nome/número do processo + timestamp relativo ("há 2 horas") + indicador visual de não-lida (●). Tocar no item navega para a tela do processo via deep-link.
- **D-04:** A central separa itens em duas seções: **"Não lidas"** (topo) e **"Lidas"** (abaixo). Histórico limitado a **últimas 50 notificações ou 30 dias** (o que vier primeiro). Lista com lazy loading simples — não precisa de cursor-based pagination em v1.

### Tela de Otimização de Bateria (NOTIFY-06)

- **D-05:** A tela de onboarding de bateria é a **5ª tela do onboarding** (atualiza Phase 5 D-09 de 4 → 5 telas). Conteúdo: "Para receber notificações confiáveis, desative a otimização de bateria para este app." Instrução específica para Xiaomi/Samsung/Motorola com botão "Configurar agora" que abre configurações do sistema (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).
- **D-06:** Tela 5 tem botão **"Pular"** — configuração de bateria não é obrigatória. FCM + WorkManager são safety nets suficientes mesmo sem configurar bateria.

Fluxo de primeira abertura atualizado:
```
Login → Onboarding 1/5 (processos) → 2/5 (datas) → 3/5 (notificações + request permission)
     → 4/5 (falar com advogado) → 5/5 (bateria OEM) → LGPD gate → Lista de processos
```

### Permissão POST_NOTIFICATIONS (Android 13+)

- **D-07:** `requestPermission(POST_NOTIFICATIONS)` é disparado na **tela 3 do onboarding** ("Notificações automáticas"), via botão "Ativar notificações". Em Android <13 (API <33), a chamada é ignorada silenciosamente — nenhuma lógica condicional necessária além do `if (Build.VERSION.SDK_INT >= 33)`.
- **D-08:** Se o usuário **negar** a permissão: app continua normalmente. **WorkManager é o fallback** — notificações aparecem na central in-app sem depender de FCM push. Sem banners insistentes ou bloqueio de fluxo.

### WorkManager — Polling Interval e Ação

- **D-09:** `PeriodicWorkRequest` com intervalo de **15 minutos** (mínimo que o Android permite). O poll chama `GET /api/notifications/unread` e verifica se há notificações novas desde a última leitura.
- **D-10:** Quando o poll detecta notificações não-lidas: **(a)** atualiza o badge da central e **(b)** exibe uma **notificação local** via `NotificationManager` com deep-link para a **central in-app** (não para um processo específico, pois podem ser várias movimentações acumuladas). Notificação local usa o mesmo canal Android de notificações FCM.

### Claude's Discretion

- Estratégia de deep-link (scheme: `portaljuridico://notificacoes` e `portaljuridico://processo/{id}`) — pesquisador confirma melhor abordagem (custom scheme vs App Links)
- Canal Android (`NotificationChannel`) — nome, importância (IMPORTANCE_HIGH), som/vibração padrão
- Ilustração/ícone da tela 5 do onboarding (bateria) — consistente com telas 1-4
- Estrutura da tabela `notifications` no Supabase (schema da migration)
- Estratégia de deduplicação de notificações locais (para não exibir a mesma notificação do WorkManager se FCM já entregou)
- Refresh automático do FCM token (Firebase SDK cuida, mas repositório deve tratar `onNewToken`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements desta Fase
- `.planning/REQUIREMENTS.md` §"Push Notifications (NOTIFY)" — NOTIFY-01 a NOTIFY-07 são os critérios de aceitação do backend
- `.planning/REQUIREMENTS.md` §"app_cliente (APP)" — APP-09 (push notification) e APP-10 (notification center)
- `.planning/ROADMAP.md` §"Phase 6: Push Notifications & In-app Center" — goal, success criteria, dependências

### Projeto e Contexto Geral
- `.planning/PROJECT.md` — Core value, constraints (stack, minSdk 27, multi-tenancy RLS)

### Phase Contexts Anteriores
- `.planning/phases/04-android-app-fluxo-advogado/04-CONTEXT.md` — D-01..D-15: navegação (Navigation Compose), HTTP (Retrofit + OkHttp), auth (DataStore), MVVM + sealed UiState, Clean Architecture
- `.planning/phases/05-android-app-fluxo-cliente-mvp/05-CONTEXT.md` — D-01..D-13: layout de telas, onboarding (4→5 telas por D-05 desta fase), LGPD gate, sem disclaimer de IA

### Baseline Android
- `gradle/libs.versions.toml` — version catalog: adicionar `firebase-messaging`, `workmanager`
- `app/src/main/java/com/example/appteste/MainActivity.kt` — stub de referência (módulos substituem)

No external specs além dos acima — decisões completamente capturadas neste documento.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PortalJuridicoTheme` em `:core-ui` — tema Material3, usar em todas as telas de notificações
- `hilt-navigation-compose` no version catalog — `hiltViewModel()` para NotificationsViewModel
- DataStore Preferences (Phase 4) — reutilizar para persistir: último poll timestamp, FCM token registrado, flag onboarding-bateria-visto
- Sealed `UiState` pattern (Phase 4, D-14) — aplicar em `NotificationsUiState`

### Established Patterns
- Clean Architecture + MVVM: ViewModel → UseCase → Repository → RemoteDataSource (Retrofit) — seguir o mesmo padrão das Phases 4 e 5
- Version catalog como fonte única de versões
- Navigation Compose + NavHost — adicionar rota `notifications` e deep-link `portaljuridico://notificacoes`
- `compileOptions { JavaVersion.VERSION_11 }` — manter em todos os módulos

### Integration Points
- **Phase 5 → Phase 6:** Onboarding atualiza de 4 para 5 telas (D-05). A tela 3 ganha botão "Ativar notificações" que chama `requestPermission()` (D-07).
- **Phase 6 → FCM:** Firebase SDK cria `FirebaseMessagingService` que implementa `onNewToken` e `onMessageReceived`
- **Phase 6 → WorkManager:** `PeriodicWorkRequest` injeta repositório de notificações via Hilt Worker (`@HiltWorker`)
- **Phase 2/3 → Phase 6:** Quando sync worker detecta movimentação nova, dispara `POST /api/notifications/send` internamente para enfileirar FCM dispatch

</code_context>

<specifics>
## Specific Ideas

- **Onboarding tela 5 (bateria):** Detectar fabricante com `Build.MANUFACTURER` — se Xiaomi, Samsung, ou Motorola: mostrar instrução específica do OEM. Para outros fabricantes: instrução genérica ("Configurações → Apps → Portal Jurídico → Bateria → Sem restrição"). Botão "Configurar agora" chama `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` com Intent explícito para o package do app.
- **WorkManager deduplicação:** Antes de exibir notificação local, comparar IDs de notificações retornadas pelo poll com as já exibidas (persistir IDs exibidos em DataStore). Evita duplicar notificações que FCM já entregou.
- **Badge do top app bar:** Implementar com `BadgedBox` do Compose Material3 — componente nativo, sem biblioteca externa.

</specifics>

<deferred>
## Deferred Ideas

- **Classificação de notificações por impacto** (crítico/importante/rotineiro) — DIFF-01, v2. Surgiu no contexto de NOTIFY mas está explicitamente fora de v1.
- **Push notifications para o app_escritorio** (avisos de pagamento, clientes inativos) — fora de escopo desta fase; Phase 7 pode introduzir se necessário.
- **Configuração de preferências de notificação** (quais tipos de movimentação notificar) — v2, requer UI adicional e backend de filtering.

</deferred>

---

*Phase: 06-push-notifications-in-app-center*
*Context gathered: 2026-04-15*
