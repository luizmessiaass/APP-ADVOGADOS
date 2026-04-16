# Phase 5: Android App — Fluxo Cliente (MVP) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 05-android-app-fluxo-cliente-mvp
**Areas discussed:** Layout da tela do processo, Timeline de movimentações, Onboarding (3-4 telas), LGPD consent gate

---

## Layout da Tela do Processo

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll único com seções | Tudo numa página vertical: status, próxima data, timeline, dados cadastrais collapsable | ✓ |
| Tabs (Status / Timeline / Detalhes) | 3 tabs fixas separando as seções | |

**User's choice:** Scroll único com seções
**Notes:** Layout vertical simples, sem tabs.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Status + próxima data | Status IA + próxima data acima da dobra | ✓ |
| Só o status atual | Card grande de status, resto abaixo da dobra | |
| Card de próxima data em destaque | Data em destaque colorido no topo, status abaixo | |

**User's choice:** Status + próxima data acima da dobra
**Notes:** Responde as duas principais dúvidas do cliente em uma olhada.

---

| Option | Description | Selected |
|--------|-------------|----------|
| WhatsApp direto | Deep-link whatsapp://send, fallback discador | ✓ |
| Picker: WhatsApp ou Email | Bottom sheet com duas opções de canal | |
| Bottom sheet com contatos | Exibe dados do escritório, cliente decide | |

**User's choice:** WhatsApp direto com fallback para discador
**Notes:** Ação direta e imediata.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Card com texto fixo | Card tranquilizador dentro da timeline | ✓ |
| Tela vazia ilustrada | Empty state com ilustração separada | |
| Você decide | Claude decide a abordagem | |

**User's choice:** Card com texto fixo tranquilizador

---

## Timeline de Movimentações

| Option | Description | Selected |
|--------|-------------|----------|
| Truncado com "ver mais" | 2-3 linhas + link para expandir inline | ✓ |
| Texto completo sempre visível | Texto IA completo sem truncamento | |
| Você decide | Claude decide baseado no tamanho médio | |

**User's choice:** Truncado com "ver mais"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Uma vez no topo da timeline | Banner fixo no início da seção | |
| Badge em cada item | Chip "IA" em cada movimentação | |
| Tooltip ao tocar | Ícone de info em cada item | |

**User's choice:** REMOVER COMPLETAMENTE — APP-14 descartado
**Notes:** Usuário explicitamente decidiu remover o requisito APP-14 de disclaimer de IA. Sem aviso de IA em nenhuma parte do app.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mês/ano como separador | Headers "Maio 2025", "Abril 2025" | ✓ |
| Lista simples com data | Sem separadores, data em cada item | |

**User's choice:** Cabeçalhos de mês/ano

---

## Onboarding (3-4 telas)

| Option | Description | Selected |
|--------|-------------|----------|
| Ícones + texto | Ícone Material3 + título + 1-2 linhas | |
| Ilustrações vetoriais | SVG/Lottie por tela | ✓ |
| Screenshots do app | Capturas de tela reais com destaques | |

**User's choice:** Ilustrações vetoriais

---

Tópicos selecionados (multiSelect):
- ✓ Seus processos em linguagem simples
- ✓ Próximas datas e prazos
- ✓ Notificações automáticas
- ✓ Falar com o advogado

**Notes:** Todas as 4 telas selecionadas.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, botão "Pular" | Disponível em todas as telas exceto a última | |
| Não, onboarding obrigatório | Sem opção de pular | ✓ |

**User's choice:** Obrigatório apenas no primeiro acesso — sem botão pular, nunca reexibido
**Notes:** "onboarding obrigatório só no primeiro acesso"

---

## LGPD Consent Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Tela completa com scroll | Botão Aceitar desabilitado até rolar ao final | ✓ |
| Tela com checkbox livre | Resumo da política + checkbox sem obrigar scroll | |

**User's choice:** Tela completa com scroll obrigatório + checkbox

---

| Option | Description | Selected |
|--------|-------------|----------|
| Logout + mensagem | Logout automático com texto explicativo | ✓ |
| Logout silencioso | Logout sem explicação | |
| App fecha sem logout | Fecha sem logout, gate reaparece na próxima vez | |

**User's choice:** Logout automático com mensagem explicativa

---

| Option | Description | Selected |
|--------|-------------|----------|
| Após onboarding, antes da lista | Login → Onboarding → LGPD → Lista | ✓ |
| Antes do onboarding | Login → LGPD → Onboarding → Lista | |
| Junto com o login | LGPD como passo do login | |

**User's choice:** Após onboarding — Login → Onboarding (1ª vez) → LGPD consent → Lista

---

## Claude's Discretion

- Cores e estilo visual do card de status IA
- Animação de transição do onboarding
- Skeleton loading states
- Posicionamento do indicador "última sincronização"
- Formato das datas na timeline (relativo vs absoluto)
- Estrutura interna de ViewModels/Use Cases no `:app-cliente`

## Deferred Ideas

- Chat IA com o processo — v2
- Classificação de movimentações por impacto — v2 (DIFF-01)
- Glossário contextual inline — v2 (DIFF-02)
- Indicador visual de fase do processo — v2 (DIFF-03)
- Push notifications — Fase 6
- Re-exibição do consent quando política mudar — Fase 8
