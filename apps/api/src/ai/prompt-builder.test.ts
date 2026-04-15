import { describe, it } from 'vitest';

describe('Prompt builder — XML delimitation', () => {
  it.todo('buildUserTurn wraps movimentacao text in <movimentacao>...</movimentacao> tags');
  it.todo('buildUserTurn with text containing </movimentacao> — closing delimiter does not appear prematurely (injection prevention)');
  it.todo('SYSTEM_PROMPT_BLOCKS is an array with at least 1 TextBlockParam with cache_control: { type: ephemeral }');
});
