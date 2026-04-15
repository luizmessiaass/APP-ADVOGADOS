import { describe, it } from 'vitest';

describe('Translation endpoint security', () => {
  it.todo('rejects request without valid tenant JWT — returns 401');
  it.todo('returns 202 Accepted and enqueues BullMQ job with valid JWT');
  it.todo('enqueued job contains correct tenant_id, movimentacao_id, processo_id');
});
