---
status: partial
phase: 02-datajud-integration-sync-worker
source: [02-VERIFICATION.md]
started: 2026-04-15T21:25:00Z
updated: 2026-04-15T21:25:00Z
---

## Current Test

[aguardando verificação humana]

## Tests

### 1. Tabelas Supabase com RLS ativas
expected: No painel Supabase (projeto ydhntdhmtdxvzfdktjtf), as 3 tabelas `processos`, `movimentacoes` e `sync_errors` existem com as 6 RLS policies ativas.
result: [pending]

### 2. Bull Board acessível em /admin/queues
expected: Com servidor rodando: `curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/admin/queues` retorna 200 com fila `datajud-sync` listada.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
