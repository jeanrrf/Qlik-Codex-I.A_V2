
import { QlikMegaOptimizer } from "../src/agents/qlikMegaOptimizer";
import { ProviderOrchestrator } from "../src/lib/providerOrchestrator";
import { logger } from "../src/lib/logger";
import { performance } from "perf_hooks";
import { OptimizationStepId } from "../src/types/optimization";

// Mock logger to reduce noise
logger.info = () => {};
logger.debug = () => {};
logger.warn = () => {};
logger.error = console.error;

// Mock Orchestrator to simulate LLM responses with controlled latency
const MOCK_LATENCY_MS = 100; // Simulate 100ms network latency per call

// Mock responses for different steps
const MOCK_RESPONSES: Record<string, any> = {
  "result_001_analysis_plan": {
    analysis: {
      structuralScore: 85,
      complexity: "Medium",
      bottlenecks: [],
      dataModelRisks: [],
      optimizationOpportunities: ["Remove unused fields", "Optimize Load"],
      analysisSummary: "Script is decent but can be improved."
    },
    plan: {
      strategyName: "Aggressive Optimization",
      riskLevel: "Low",
      planSteps: [
        { step: 1, title: "Optimize Load", details: "Use specific fields", estimatedEffort: "Low" }
      ],
      estimatedImprovement: {
        loadTimeReduction: "20%",
        ramUsageReduction: "15%",
        maintainabilityScoreAfter: 90
      }
    }
  },
  "result_002_codegen": {
    optimizedScript: "LOAD Field1 FROM [data.qvd] (qvd);",
    changesApplied: ["Reduced fields in Load statement"],
    completenessCheck: true
  },
  "result_003_review": {
    summary: "Code looks good.",
    changes: [],
    recommended_risk: "low",
    notes: "Safe to apply."
  }
};

// Monkey-patch the ProviderOrchestrator prototype
// This ensures ALL instances (including the one created inside QlikMegaOptimizer) use this mock
ProviderOrchestrator.prototype.executeWithRotation = async function(stepId: OptimizationStepId, prompt: string, timeout: number) {
  await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
  
  // Determine which mock response to return based on prompt content or stepId
  let responseData = {};
  
  if (prompt.includes("ANÁLISE E PLANO")) {
    responseData = MOCK_RESPONSES["result_001_analysis_plan"];
  } else if (prompt.includes("GERAÇÃO DE CÓDIGO")) {
    responseData = MOCK_RESPONSES["result_002_codegen"];
  } else if (prompt.includes("REVISÃO")) {
    responseData = MOCK_RESPONSES["result_003_review"];
  } else {
    // Default fallback
    responseData = { message: "Mock response" };
  }

  return {
    result: JSON.stringify(responseData),
    attempts: [{
      provider: "google", // Use a valid provider name
      model: "mock-v1",
      duration: MOCK_LATENCY_MS,
      success: true,
      timestamp: new Date(),
    }],
    fallbackTriggered: false
  };
};

async function runBenchmark() {
  console.log(" Starting QlikMegaOptimizer Speed Test...");
  console.log(`?  Simulated LLM Latency: ${MOCK_LATENCY_MS}ms per call`);

  const script = `
    LOAD * FROM [lib://Data/Sales.qvd] (qvd);
    LEFT JOIN LOAD * FROM [lib://Data/Customers.qvd] (qvd);
  `;

  const start = performance.now();
  
  const optimizer = new QlikMegaOptimizer(script);
  const result = await optimizer.run();

  const end = performance.now();
  const duration = end - start;

  console.log("\n Benchmark Results:");
  console.log(`----------------------------------------`);
  console.log(`Total Execution Time: ${duration.toFixed(2)}ms`);
  console.log(`Simulated Network Time: ~${3 * MOCK_LATENCY_MS}ms (3 major steps)`);
  console.log(`System Overhead: ${(duration - (3 * MOCK_LATENCY_MS)).toFixed(2)}ms`);
  console.log(`----------------------------------------`);
  console.log(`Status: ${result.plan.riskLevel ? "Success" : "Failed"}`);
  console.log(`Optimized Script Length: ${result.optimizedScript.length} chars`);
}

runBenchmark().catch(console.error);

