import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QlikMegaOptimizer } from '../../src/agents/qlikMegaOptimizer';

// Mock dependencies
vi.mock('../../src/lib/sseEmitter', () => ({
  sseEmitter: {
    sendToCurrent: vi.fn()
  }
}));

vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Valid mock data that matches the Zod schemas
const mockAnalysisAndPlan = {
  analysis: {
    structuralScore: 75,
    complexity: "Medium",
    bottlenecks: [{ severity: "High", description: "Test bottleneck", location: "Line 10" }],
    dataModelRisks: ["Synthetic key risk"],
    optimizationOpportunities: ["Use QVD incremental load"],
    analysisSummary: "Script has medium complexity with optimization opportunities"
  },
  plan: {
    strategyName: "Performance Optimization",
    riskLevel: "Low",
    planSteps: [{
      step: 1,
      title: "Optimize joins",
      details: "Reorder joins for better performance",
      targetBottleneck: "Test bottleneck",
      estimatedEffort: "Medium"
    }],
    estimatedImprovement: {
      loadTimeReduction: "30%",
      ramUsageReduction: "20%",
      maintainabilityScoreAfter: 85
    }
  }
};

const mockCodeGen = {
  optimizedScript: "SET x = 1;\nSales:\nLOAD * FROM sales.qvd (qvd);",
  changesApplied: ["Optimized join order", "Added QVD layer"],
  completenessCheck: true
};

const mockFinalDelivery = {
  validation: {
    isValid: true,
    issuesFound: [],
    safetyScore: 95
  },
  documentation: {
    title: "Optimization Report",
    description: "Comprehensive optimization of Qlik script",
    diagramMermaid: "graph TD; A-->B;",
    reloadStrategy: "Full reload recommended"
  },
  report: {
    executiveSummary: "Script optimized successfully",
    technicalDetails: "Performance improvements applied",
    achievedImprovements: ["30% faster load", "20% less RAM"],
    deploymentChecklist: ["Test in DEV", "Backup production"]
  }
};

// Mock the orchestrator
const mockExecuteWithRotation = vi.fn();
const mockGetStats = vi.fn(() => ({
  totalAttempts: 1,
  successfulAttempts: 1,
  failedAttempts: 0,
  timeouts: 0,
  providerStats: { google: { success: 1, failed: 0 } }
}));

vi.mock('../../src/lib/providerOrchestrator', () => ({
  createOrchestrator: vi.fn(() => ({
    executeWithRotation: mockExecuteWithRotation,
    getStats: mockGetStats,
    clearHistory: vi.fn()
  })),
  ProviderOrchestrator: vi.fn()
}));

describe('QlikMegaOptimizer', () => {
  const sampleScript = `
// Sample Qlik script
SET ThousandSep='.';
SET DecimalSep=',';

LET vToday = Today();

Sales:
LOAD
    OrderID,
    CustomerID,
    Amount
FROM [lib://DataFiles/sales.qvd] (qvd);
`;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses with valid schema data
    mockExecuteWithRotation.mockResolvedValue({
      result: JSON.stringify(mockAnalysisAndPlan),
      attempts: [{ provider: 'google', model: 'gemini-2.5-flash', success: true, duration: 1000 }],
      fallbackTriggered: false
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should sanitize HTML from input script', () => {
      const htmlScript = '<span class="keyword">SET</span> x = 1;';
      const optimizer = new QlikMegaOptimizer(htmlScript);
      // The sanitized script should not contain HTML tags
      expect(optimizer['script']).not.toContain('<span');
      expect(optimizer['script']).toContain('SET');
    });

    it('should accept AbortSignal in options', () => {
      const controller = new AbortController();
      const optimizer = new QlikMegaOptimizer(sampleScript, { signal: controller.signal });
      expect(optimizer['abortSignal']).toBe(controller.signal);
    });

    it('should create orchestrator with correct config', async () => {
      const { createOrchestrator } = await import('../../src/lib/providerOrchestrator');
      new QlikMegaOptimizer(sampleScript);

      expect(createOrchestrator).toHaveBeenCalledWith({
        maxAttemptsPerStep: 4,
        providerOrder: ['google', 'nvidia'],
        neverRetryProvider: true,
        timeoutPerStep: 90000,
        globalTimeout: 300000
      });
    });
  });

  describe('abort handling', () => {
    it('should throw if aborted before run()', async () => {
      const controller = new AbortController();
      controller.abort();

      const optimizer = new QlikMegaOptimizer(sampleScript, { signal: controller.signal });

      await expect(optimizer.run()).rejects.toThrow('abortada');
    });

    it('should check abort status during task execution', async () => {
      const controller = new AbortController();
      const optimizer = new QlikMegaOptimizer(sampleScript, { signal: controller.signal });

      // Mock to simulate abort during execution
      let callCount = 0;
      mockExecuteWithRotation.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds (ANALYSIS_AND_PLAN)
          return {
            result: JSON.stringify(mockAnalysisAndPlan),
            attempts: [{ provider: 'google', success: true, duration: 100 }],
            fallbackTriggered: false
          };
        }
        // Abort before second call returns
        controller.abort();
        // Throw to simulate the abort check in executeTask
        throw new Error('Task CODE_GEN abortada após retorno do LLM');
      });

      await expect(optimizer.run()).rejects.toThrow('abortada');
    });
  });

  describe('provider orchestration', () => {
    it('should use orchestrator for LLM calls', async () => {
      // Use unique script to avoid cache hits from other tests
      const uniqueScript = sampleScript + `\n// Unique: ${Date.now()}-orch`;

      // Mock based on stepId to handle parallel execution
      mockExecuteWithRotation.mockImplementation(async (stepId: string) => {
        if (stepId.includes('analysis_and_plan')) {
          return {
            result: JSON.stringify(mockAnalysisAndPlan),
            attempts: [{ provider: 'google', model: 'gemini-2.5-flash', success: true, duration: 1000 }],
            fallbackTriggered: false
          };
        } else if (stepId.includes('code_gen')) {
          return {
            result: JSON.stringify(mockCodeGen),
            attempts: [{ provider: 'google', model: 'gemini-2.5-flash', success: true, duration: 500 }],
            fallbackTriggered: false
          };
        } else if (stepId.includes('final_delivery')) {
          return {
            result: JSON.stringify(mockFinalDelivery),
            attempts: [{ provider: 'nvidia', model: 'nemotron', success: true, duration: 600 }],
            fallbackTriggered: false
          };
        }
        throw new Error(`Unknown stepId: ${stepId}`);
      });

      const optimizer = new QlikMegaOptimizer(uniqueScript);
      const result = await optimizer.run();

      expect(mockExecuteWithRotation).toHaveBeenCalledTimes(3); // ANALYSIS_AND_PLAN, CODE_GEN, FINAL_DELIVERY
      expect(result.metrics.providerStats).toBeDefined();
    });

    it('should throw when all providers fail', async () => {
      mockExecuteWithRotation.mockResolvedValue({
        result: undefined,
        attempts: [
          { provider: 'google', success: false, error: 'Rate limited', duration: 100 },
          { provider: 'nvidia', success: false, error: 'Timeout', duration: 45000 }
        ],
        fallbackTriggered: true,
        fallbackReason: 'Todas as tentativas falharam'
      });

      const optimizer = new QlikMegaOptimizer(sampleScript);

      await expect(optimizer.run()).rejects.toThrow('failed');
    });
  });

  describe('metrics', () => {
    it('should include provider stats in result metrics', async () => {
      // Use unique script to avoid cache hits from other tests
      const uniqueScript = sampleScript + `\n// Unique: ${Date.now()}-metrics`;

      // Mock based on stepId to handle parallel execution
      mockExecuteWithRotation.mockImplementation(async (stepId: string) => {
        if (stepId.includes('analysis_and_plan')) {
          return {
            result: JSON.stringify(mockAnalysisAndPlan),
            attempts: [{ provider: 'google', success: true, duration: 1000 }],
            fallbackTriggered: false
          };
        } else if (stepId.includes('code_gen')) {
          return {
            result: JSON.stringify(mockCodeGen),
            attempts: [{ provider: 'google', success: true, duration: 500 }],
            fallbackTriggered: false
          };
        } else if (stepId.includes('final_delivery')) {
          return {
            result: JSON.stringify(mockFinalDelivery),
            attempts: [{ provider: 'google', success: true, duration: 600 }],
            fallbackTriggered: false
          };
        }
        throw new Error(`Unknown stepId: ${stepId}`);
      });

      mockGetStats.mockReturnValue({
        totalAttempts: 3,
        successfulAttempts: 3,
        failedAttempts: 0,
        timeouts: 0,
        providerStats: { google: { success: 3, failed: 0 } }
      });

      const optimizer = new QlikMegaOptimizer(uniqueScript);
      const result = await optimizer.run();

      expect(result.metrics.providerStats).toEqual({ google: { success: 3, failed: 0 } });
      expect(result.metrics.totalTime).toBeGreaterThanOrEqual(0);
    });
  });
});
