import { describe, it, expect } from 'vitest';
import { optimizeScriptSchema, generateDocSchema } from '../../src/validators/requestSchemas';

describe('requestSchemas', () => {
  it('accepts ainex as llmProvider for optimize', () => {
    const payload = { script: 'LOAD * FROM X;', llmProvider: 'ainex' } as const;
    expect(() => optimizeScriptSchema.parse(payload)).not.toThrow();
  });

  it('accepts ainex as llmProvider for generate doc', () => {
    const payload = { script: 'LOAD * FROM X;', llmProvider: 'ainex' } as const;
    expect(() => generateDocSchema.parse(payload)).not.toThrow();
  });
});
