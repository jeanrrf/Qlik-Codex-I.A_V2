/**
 * AINEX Stage 3: Strategic Refactor Planning
 * Planejamento estratégico de refatoração ANTES de gerar código
 */

import { logger } from "../lib/logger";
import { generateStructuredJson, GenerateStructuredJsonOptions } from "../lib/llmClient";
import { type DeepParseResult } from "./qlikDeepParseAgent";
import { type SemanticAnalysisResult } from "./qlikSemanticAgent";

export interface RefactorPlan {
  strategy: "AGGRESSIVE" | "MODERATE" | "CONSERVATIVE";
  prioritizedActions: RefactorAction[];
  estimatedImpact: RefactorImpact;
  risks: RefactorRisk[];
  executionOrder: string[];
}

export interface RefactorAction {
  id: string;
  category: "PERFORMANCE" | "SECURITY" | "MAINTAINABILITY" | "CORRECTNESS";
  priority: number; // 1-10
  targetLocation: string;
  currentState: string;
  plannedChange: string;
  rationale: string;
  estimatedGain: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
}

export interface RefactorImpact {
  loadTimeImprovement: string; // ex: "45-60%"
  memoryImprovement: string; // ex: "30-40%"
  maintainabilityGain: number; // 0-100 score delta
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface RefactorRisk {
  type: "BREAKING_CHANGE" | "DATA_LOSS" | "PERFORMANCE_REGRESSION";
  probability: "LOW" | "MEDIUM" | "HIGH";
  mitigation: string;
}

/**
 * Gera plano estratégico de refatoração
 */
export async function runStrategicPlanning(
  script: string,
  deepParse: DeepParseResult,
  semanticAnalysis: SemanticAnalysisResult,
  llmOptions?: GenerateStructuredJsonOptions
): Promise<RefactorPlan> {
  logger.info("🎯 [STAGE 3] Strategic Refactor Planning");

  const prompt = buildPlanningPrompt(script, deepParse, semanticAnalysis);

  const planSchema = {
    type: "object",
    properties: {
      strategy: { type: "string", enum: ["AGGRESSIVE", "MODERATE", "CONSERVATIVE"] },
      prioritizedActions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            category: { type: "string" },
            priority: { type: "number" },
            targetLocation: { type: "string" },
            currentState: { type: "string" },
            plannedChange: { type: "string" },
            rationale: { type: "string" },
            estimatedGain: { type: "string" },
            effort: { type: "string" }
          },
          required: ["id", "category", "priority", "targetLocation", "plannedChange", "rationale"]
        },
        minItems: 5
      },
      estimatedImpact: {
        type: "object",
        properties: {
          loadTimeImprovement: { type: "string" },
          memoryImprovement: { type: "string" },
          maintainabilityGain: { type: "number" },
          riskLevel: { type: "string" }
        }
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            probability: { type: "string" },
            mitigation: { type: "string" }
          }
        }
      },
      executionOrder: { type: "array", items: { type: "string" } }
    },
    required: ["strategy", "prioritizedActions", "estimatedImpact", "executionOrder"]
  };

  const result = await generateStructuredJson(prompt, planSchema, llmOptions);

  logger.info(`📋 Strategy: ${result.strategy} | Actions: ${result.prioritizedActions.length}`);
  logger.info(`📊 Impact: ${result.estimatedImpact.loadTimeImprovement} load time, ${result.estimatedImpact.memoryImprovement} memory`);

  return result as RefactorPlan;
}

function buildPlanningPrompt(
  script: string,
  deepParse: DeepParseResult,
  semanticAnalysis: SemanticAnalysisResult
): string {
  return `
AINEX STRATEGIC REFACTOR PLANNER v1.0
═══════════════════════════════════════════════════════════════════

MISSION: Generate a prioritized refactor plan (NOT code yet) based on analysis.

CONTEXT FROM PREVIOUS STAGES:
─────────────────────────────────────────────────────────────────
Structural Score: ${deepParse.structuralScore}/100
Performance Score: ${semanticAnalysis.performanceScore}/100

Critical Issues:
${semanticAnalysis.bottlenecks.filter(b => b.severity === "CRITICAL").map(b =>
    `- ${b.type} at line ${b.location.line}: ${b.explanation}`
  ).join('\n') || "None"}

High-Priority Opportunities:
${semanticAnalysis.optimizationOpportunities.filter(o => o.priority === "HIGH").map(o =>
    `- ${o.category} on ${o.targetTable}: ${o.estimatedGain}`
  ).join('\n') || "None"}

Anti-Patterns Detected:
${deepParse.antiPatterns.map(ap => `- ${ap.issue} (${ap.severity})`).join('\n') || "None"}

SCRIPT OVERVIEW:
─────────────────────────────────────────────────────────────────
${script.split('\n').slice(0, 50).join('\n')}
[... script continues ...]

INSTRUCTIONS:
─────────────────────────────────────────────────────────────────
1. Choose strategy based on scores:
   - AGGRESSIVE: Score < 50 (major restructuring needed)
   - MODERATE: Score 50-75 (targeted improvements)
   - CONSERVATIVE: Score > 75 (minor tweaks only)

2. Create 5-12 prioritized actions focusing on:
   - Security fixes (SQL injection, unsafe SET)
   - Performance bottlenecks (cartesian, nested loops)
   - Maintainability (complexity reduction)
   - Correctness (logic errors, missing validations)

3. Estimate realistic impact (be conservative, not optimistic)

4. Identify risks and mitigation strategies

5. Define execution order (dependencies matter)

Return JSON matching the schema.
`;
}
