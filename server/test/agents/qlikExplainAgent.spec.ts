import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runQlikExplainAgent } from '../../src/agents/qlikExplainAgent';
import { defaultOrchestrator } from '../../src/lib/providerOrchestrator';
import { OptimizeResult } from '../../src/types/qlik';

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

describe('QlikExplainAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate explanation successfully', async () => {
    const mockResult: OptimizeResult = {
      originalScript: 'LOAD * FROM data.qvd;',
      optimizedScript: 'LOAD Field1 FROM data.qvd;',
      analysis: {
        mode: 'standard',
        changes: [{
          category: 'performance',
          area: 'Load',
          impact: 'Reduced fields',
          riskLevel: 'low'
        }],
        breakingRisk: 'low',
        metricsEstimate: {
          loadComplexityBefore: 10,
          loadComplexityAfter: 5,
          maintainabilityBefore: 50,
          maintainabilityAfter: 80
        }
      },
      review: {
        summary: 'Good changes',
        score: 90,
        issues: []
      }
    };

    const mockExplanation = "Changes were made to improve performance.";

    vi.mocked(defaultOrchestrator.executeWithRotation).mockResolvedValue({
      result: JSON.stringify({ explanation: mockExplanation }),
      attempts: [],
      fallbackTriggered: false
    });

    const explanation = await runQlikExplainAgent(mockResult);

    expect(defaultOrchestrator.executeWithRotation).toHaveBeenCalledTimes(1);
    expect(explanation).toBe(mockExplanation);
  });

  it('should handle errors gracefully', async () => {
    const mockResult: OptimizeResult = {
      originalScript: '',
      optimizedScript: '',
      analysis: {
        mode: 'standard',
        changes: [],
        breakingRisk: 'low'
      }
    };

    vi.mocked(defaultOrchestrator.executeWithRotation).mockRejectedValue(new Error('Provider failed'));

    const explanation = await runQlikExplainAgent(mockResult);
    expect(explanation).toBe('Erro ao gerar explicação.');
  });
});
