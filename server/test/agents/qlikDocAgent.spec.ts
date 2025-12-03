import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runQlikDocAgent } from '../../src/agents/qlikDocAgent';
import { defaultOrchestrator } from '../../src/lib/providerOrchestrator';

// Mock dependencies
vi.mock('../../src/lib/providerOrchestrator', () => ({
  defaultOrchestrator: {
    executeWithRotation: vi.fn()
  }
}));

vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('QlikDocAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate documentation successfully', async () => {
    const mockScript = 'LOAD * FROM [data.qvd] (qvd);';
    const mockResponse = {
      title: 'Test App',
      description: 'Test Description',
      tables: [{
        name: 'Table1',
        description: 'Fact Table',
        fields: ['Field1', 'Field2'],
        source: 'data.qvd'
      }],
      diagram_mermaid: 'erDiagram Table1',
      reload_strategy: 'Full',
      key_metrics: ['Count(Field1)']
    };

    vi.mocked(defaultOrchestrator.executeWithRotation).mockResolvedValue({
      result: JSON.stringify(mockResponse),
      attempts: [],
      fallbackTriggered: false
    });

    const result = await runQlikDocAgent(mockScript);

    expect(defaultOrchestrator.executeWithRotation).toHaveBeenCalledTimes(1);
    expect(result.metadata).toEqual(mockResponse);
    expect(result.markdown).toContain('# Test App');
    expect(result.markdown).toContain('Test Description');
  });

  it('should handle errors gracefully', async () => {
    const mockScript = 'INVALID SCRIPT';
    vi.mocked(defaultOrchestrator.executeWithRotation).mockRejectedValue(new Error('Provider failed'));

    await expect(runQlikDocAgent(mockScript)).rejects.toThrow('Provider failed');
  });
});
