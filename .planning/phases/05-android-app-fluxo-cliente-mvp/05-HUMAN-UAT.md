---
status: partial
phase: 05-android-app-fluxo-cliente-mvp
source: [05-VERIFICATION.md]
started: 2026-04-16
updated: 2026-04-16
---

## Current Test

[aguardando testes em dispositivo]

## Tests

### 1. Login + fluxo de processos com dados reais
expected: App faz login via POST /api/v1/auth/login, lista de processos carrega da API (não dados hardcoded), detalhe do processo mostra status traduzido, timeline com movimentações e label de sincronização (ex: "Atualizado há 2 dias")
result: [pending]

### 2. Onboarding + gate LGPD (fresh install)
expected: Na primeira instalação, usuário vê 4 páginas de onboarding sem opção de pular, depois é direcionado para LGPD consent. Botão "Aceitar" fica desabilitado até scrollar até o final E marcar o checkbox. Rejeitar exibe AlertDialog com opção de logout.
result: [pending]

### 3. FAB WhatsApp deep-link
expected: Botão WhatsApp no ProcessoDetailScreen abre app WhatsApp com número do escritório pré-preenchido (whatsapp://send?phone=...). Quando WhatsApp não instalado, fallback para tel: discagem.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
