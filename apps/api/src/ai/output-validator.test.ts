import { describe, it } from 'vitest';

describe('Output schema validator — validateTranslacao', () => {
  it.todo('accepts valid Translacao object with correct disclaimer');
  it.todo('throws when disclaimer has wrong text');
  it.todo('throws when proxima_data is undefined (field is required, even if null is valid)');
  it.todo('accepts when status is empty string (schema is permissive on content)');
});
