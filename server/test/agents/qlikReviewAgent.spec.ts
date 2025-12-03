import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runQlikReviewAgent } from '../../src/agents/qlikReviewAgent';
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

describe('QlikReviewAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should review and update risk successfully', async () => {
    const mockResult: OptimizeResult = {
      originalScript: 'LOAD * FROM data.qvd;',
      optimizedScript: 'LOAD Field1 FROM data.qvd;',
      analysis: {
        mode: 'standard',
        changes: [],
        breakingRisk: 'low',
        metricsEstimate: {
          loadComplexityBefore: 10,
          loadComplexityAfter: 5,
          maintainabilityBefore: 50,
          maintainabilityAfter: 80
        }
      }
    };

    const mockReviewResponse = {
      summary: 'Review Summary',
      changes: [{
        category: 'performance',
        area: 'Load',
        impact: 'Reduced fields',
        risk_level: 'medium'
      }],
      recommended_risk: 'medium',
      notes: 'Risk increased due to potential data loss.'
    };

    vi.mocked(defaultOrchestrator.executeWithRotation).mockResolvedValue({
      result: JSON.stringify(mockReviewResponse),
      attempts: [],
      fallbackTriggered: false
    });

    const result = await runQlikReviewAgent(mockResult);

    expect(defaultOrchestrator.executeWithRotation).toHaveBeenCalledTimes(1);
    expect(result.review).toBeDefined();
    expect(result.review?.summary).toBe('Review Summary');
    expect(result.analysis.breakingRisk).toBe('medium'); // Should be updated
  });

  it('should handle invalid schema gracefully', async () => {
    const mockResult: OptimizeResult = {
      originalScript: 'LOAD * FROM data.qvd;',
      optimizedScript: 'LOAD Field1 FROM data.qvd;',
      analysis: {
        mode: 'standard',
        changes: [],
        breakingRisk: 'low'
      }
    };

    vi.mocked(defaultOrchestrator.executeWithRotation).mockResolvedValue({
      result: JSON.stringify({ invalid: 'schema' }),
      attempts: [],
      fallbackTriggered: false
    });

    const result = await runQlikReviewAgent(mockResult);

    expect(result.review).toBeUndefined(); // Should return original result without review
    expect(result.analysis.breakingRisk).toBe('low');
  });

  it('should handle errors gracefully', async () => {
    const mockResult: OptimizeResult = {
      originalScript: 'LOAD * FROM data.qvd;',
      optimizedScript: 'LOAD Field1 FROM data.qvd;',
      analysis: {
        mode: 'standard',
        changes: [],
        breakingRisk: 'low'
      }
    };

    vi.mocked(defaultOrchestrator.executeWithRotation).mockRejectedValue(new Error('Provider failed'));

    const result = await runQlikReviewAgent(mockResult);

    expect(result.review).toBeUndefined();
  });
});
