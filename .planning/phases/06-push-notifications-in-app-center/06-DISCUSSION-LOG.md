# Phase 6: Push Notifications & In-app Center - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 06-push-notifications-in-app-center
**Areas discussed:** Central de notificações, Tela de otimização de bateria, Permissão de notificação, WorkManager & polling

---

## Central de Notificações

### Entrada e badge

| Option | Description | Selected |
|--------|-------------|----------|
| Bell icon no top app bar | Visível em todas as telas; badge com contador. Padrão Gmail/WhatsApp Business. | ✓ |
| Tab dedicada na bottom nav | Exige redesenhar navegação (Phase 5 não definiu bottom nav). | |
| Entrada a partir da lista de processos | Banner contextual, menos permanente. | |

**User's choice:** Bell icon no top app bar
**Notes:** Badge com número exato de não-lidas. Zera quando o usuário abre a central.

### Conteúdo de cada item

| Option | Description | Selected |
|--------|-------------|----------|
| Título + trecho do processo + data | "Nova movimentação · 0001234... · há 2 horas" com indicador ●. Deep-link para o processo. | ✓ |
| Apenas título + data | Menos contexto por item. | |
| Claude decide | Layout fica com implementador. | |

**User's choice:** Título + trecho do processo + data
**Notes:** Toca no item → abre tela do processo correspondente.

### Histórico

| Option | Description | Selected |
|--------|-------------|----------|
| 30 dias ou últimas 50 | Lista paginada simples, lazy loading. | ✓ |
| Ilimitado com paginação | Cursor-based, mais complexo. | |
| Apenas não lidas | Perde histórico útil. | |

**User's choice:** 30 dias ou últimas 50

---

## Tela de Otimização de Bateria

### Placement no onboarding

| Option | Description | Selected |
|--------|-------------|----------|
| 5ª tela do onboarding | Fluxo: Login → 1/5 → 2/5 → 3/5 → 4/5 → 5/5 → LGPD → Lista | ✓ |
| Dialog pós-login para OEMs afetados | Detecta Build.MANUFACTURER, mostra dialog uma vez. | |
| Integrada na tela 3 (notificações) | Menos telas, mais conteúdo por tela. | |

**User's choice:** 5ª tela do onboarding
**Notes:** Atualiza Phase 5 D-09 de 4 para 5 telas obrigatórias no onboarding.

### Skip

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, botão "Pular" | Não obrigatório — FCM + WorkManager são safety nets. | ✓ |
| Não, obrigatório | Mais atrito no onboarding. | |

**User's choice:** Sim, botão "Pular"

---

## Permissão de Notificação (Android 13+)

### Timing do requestPermission

| Option | Description | Selected |
|--------|-------------|----------|
| Na tela 3 do onboarding | Contexto ideal: tela já fala de notificações. Em <API 33, chamada silenciosa. | ✓ |
| Ao fazer login pela primeira vez | Menos contexto, taxa de aceite menor. | |
| Ao registrar FCM (lazy) | Timing tardio, interrompe fluxo pós-onboarding. | |

**User's choice:** Na tela 3 do onboarding

### Comportamento ao negar

| Option | Description | Selected |
|--------|-------------|----------|
| Continua normalmente, WorkManager é o fallback | Sem bloqueio de fluxo. | ✓ |
| Banner explicativo na lista de processos | Mais insistente. | |
| Claude decide | — | |

**User's choice:** Continua normalmente, WorkManager é o fallback

---

## WorkManager & Polling

### Intervalo

| Option | Description | Selected |
|--------|-------------|----------|
| 15 minutos | Mínimo Android. Impacto de bateria mínimo (uma chamada de rede pequena). | ✓ |
| 30 minutos | Menos chamadas, latência maior de fallback. | |
| 1 hora | Econômico, safety net extremo apenas. | |

**User's choice:** 15 minutos

### Ação ao detectar não-lidas

| Option | Description | Selected |
|--------|-------------|----------|
| Atualiza badge + exibe notificação local | Deep-link para central in-app (pode ser várias movimentações). | ✓ |
| Apenas atualiza badge | Usuário só vê ao abrir o app. | |
| Claude decide | — | |

**User's choice:** Atualiza badge + notificação local com deep-link para central

---

## Claude's Discretion

- Estratégia de deep-link (custom scheme `portaljuridico://` vs App Links)
- NotificationChannel — nome, importância, som/vibração
- Ilustração da tela 5 do onboarding (bateria)
- Schema da tabela `notifications` no Supabase
- Deduplicação de notificações locais vs FCM
- Refresh automático do FCM token (via `onNewToken`)

## Deferred Ideas

- Classificação de notificações por impacto (crítico/importante/rotineiro) — DIFF-01, v2
- Push notifications para app_escritorio — Phase 7 ou futuro
- Preferências de notificação por tipo de movimentação — v2
