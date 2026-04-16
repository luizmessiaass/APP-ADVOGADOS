# Phase 4: Android App — Fluxo Advogado - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 04-android-app-fluxo-advogado
**Areas discussed:** Navegação, Rede e Autenticação JWT, Preview "como o cliente vê", UX dos Formulários

---

## Navegação entre telas

| Option | Description | Selected |
|--------|-------------|----------|
| Navigation Compose + NavHost | Padrão oficial Google, hilt-navigation-compose já no catalog, back stack e argumentos nativos | ✓ |
| Estado no ViewModel | Sealed class Screen, mais simples mas back stack manual difícil com 5+ telas | |
| Voyager | Lib Kotlin-first popular, dependência externa sem vantagem clara | |

**User's choice:** Navigation Compose + NavHost
**Notes:** hilt-navigation-compose 1.2.0 já está no version catalog — só falta adicionar navigation-compose.

---

## Rede e Autenticação JWT

| Option | Description | Selected |
|--------|-------------|----------|
| Retrofit + OkHttp | Padrão de mercado Android, interceptors para JWT, maduro | ✓ |
| Ktor Client | Kotlin-first, multiplatform-ready, mais verboso para casos simples | |
| OkHttp direto | Mais controle mas muito boilerplate para REST com várias rotas | |

**HTTP Client:** Retrofit + OkHttp

| Option | Description | Selected |
|--------|-------------|----------|
| DataStore Preferences | Substituto oficial SharedPreferences, assíncrono com Flow | ✓ |
| EncryptedSharedPreferences | Criptografia com Android Keystore, overkill para JWT com expiry | |
| Só em memória | Login a cada abertura, péssima UX | |

**JWT Storage:** DataStore Preferences

| Option | Description | Selected |
|--------|-------------|----------|
| Decode JWT local | Biblioteca leve, sem round-trip ao backend, disponível offline | ✓ |
| Endpoint /me no backend | Round-trip extra, dados sempre frescos | |

**Role Detection:** Decode JWT local

---

## Preview "como o cliente vê"

| Option | Description | Selected |
|--------|-------------|----------|
| :core-ui compartilhado | Phase 5 reutiliza sem duplicar | ✓ |
| Duplicado em :app-escritorio | Mais rápido agora, retrabalho garantido em Phase 5 | |

**Localização dos componentes:** :core-ui

| Option | Description | Selected |
|--------|-------------|----------|
| Tela separada | Rota própria, scroll em tela cheia, mais testável | ✓ |
| Bottom sheet | Contextual mas limitado em altura para listas longas | |

**Preview UI:** Tela separada (rota `preview/{clienteId}`)

---

## UX dos Formulários

| Option | Description | Selected |
|--------|-------------|----------|
| Validação em tempo real | Erro após blur ou formato completo, feedback imediato | ✓ |
| Só ao submeter | Mais simples mas UX inferior, erro descoberto no final | |

**Validação CPF/CNJ:** Em tempo real

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom Sheet | Abre do detalhe do cliente, contextual, não interrompe navegação | ✓ |
| Tela dedicada | Mais espaço, mas overhead de navegação para ação simples | |
| Dialog simples | Sem scroll, sem suporte a mensagens longas | |

**Mensagem manual:** Bottom Sheet

| Option | Description | Selected |
|--------|-------------|----------|
| Sealed class por tela | Loading/Success/Error explícito, testável | ✓ |
| StateFlow com campos separados | Flexível mas estados incompatíveis possíveis | |

**UiState:** Sealed class por tela

---

## Claude's Discretion

- Versão exata de Retrofit, OkHttp, Navigation Compose, JWT decode lib
- Estratégia de refresh token automático (interceptor 401 → refresh → retry)
- Estrutura interna de :core-network e :core-data
- Layout visual dos cards na lista de clientes
- Estado vazio da lista sem clientes

## Deferred Ideas

- Chatbot IA para o advogado — milestone futuro
- Dashboard com métricas do escritório — Phase 4.x ou futuro
- Exportação de relatórios PDF — fora de escopo v1
