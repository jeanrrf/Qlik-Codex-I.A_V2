import { describe, it, expect, vi } from 'vitest';

// Mock QlikOptimizeAgent to throw parse error
vi.mock('../../src/agents/qlikOptimizeAgent', async () => {
  const original = await vi.importActual('../../src/agents/qlikOptimizeAgent');
  return {
    QlikOptimizeAgent: class {
      constructor(_script: string) { }
      async run() {
        throw new Error('JSON Parse Error for ANALYSIS_AND_PLAN');
      }
    }
  };
});

import { optimizeScript } from '../../src/services/optimizerService';

describe('optimizerService.optimizeScript', () => {
  it('should rethrow JSON Parse Error as fatal', async () => {
    await expect(optimizeScript('load * from table;', 'ultra-expert')).rejects.toThrow('JSON Parse Error');
  });
});
