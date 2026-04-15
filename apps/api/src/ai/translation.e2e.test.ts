import { describe, it } from 'vitest';

describe('AI Translation — Integration (E2E)', () => {
  it.todo('hashMovimentacao is deterministic end-to-end');
  it.todo('validateTranslacao accepts a valid object');
  it.todo('validateTranslacao throws with descriptive message on missing disclaimer');
  it.todo('glossario reaches minimum 4096 token threshold for Haiku 4.5 cache (requires ANTHROPIC_API_KEY)');
});

describe('Smoke tests — Claude API (CI only)', () => {
  it.todo('callClaude returns valid Translacao with correct disclaimer (requires ANTHROPIC_API_KEY)');
  it.todo('second call with same text shows cache_read_tokens > 0 (requires ANTHROPIC_API_KEY)');
});
