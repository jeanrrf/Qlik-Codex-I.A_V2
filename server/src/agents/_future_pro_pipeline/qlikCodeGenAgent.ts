/**
 * AINEX Stage 4: Code Generation (Optimized Version)
 * Geração de código otimizado seguindo o plano estratégico
 */

import { logger } from "../lib/logger";
import { generateStructuredJson, GenerateStructuredJsonOptions } from "../lib/llmClient";
import { type RefactorPlan } from "./qlikStrategicAgent";

export interface CodeGenerationResult {
  optimizedCode: string;
  appliedActions: string[]; // IDs das ações aplicadas
  skippedActions: Array<{ id: string; reason: string }>;
  inlineComments: InlineComment[];
}

export interface InlineComment {
  line: number;
  comment: string;
  actionId: string;
}

/**
 * Gera código otimizado baseado no plano estratégico
 */
export async function runCodeGeneration(
  originalScript: string,
  refactorPlan: RefactorPlan,
  llmOptions?: GenerateStructuredJsonOptions
): Promise<CodeGenerationResult> {
  logger.info("⚡ [STAGE 4] Code Generation — Optimized Version");

  const prompt = `
AINEX CODE GENERATOR v1.0 — Execute the refactor plan
═══════════════════════════════════════════════════════════════════

ORIGINAL SCRIPT:
─────────────────────────────────────────────────────────────────
${originalScript}

REFACTOR PLAN (follow this strictly):
─────────────────────────────────────────────────────────────────
Strategy: ${refactorPlan.strategy}

Actions to apply (in order):
${refactorPlan.executionOrder.map((id, idx) => {
    const action = refactorPlan.prioritizedActions.find(a => a.id === id);
    return action ? `${idx + 1}. [${id}] ${action.plannedChange}\n   Location: ${action.targetLocation}\n   Rationale: ${action.rationale}` : '';
  }).join('\n\n')}

INSTRUCTIONS:
─────────────────────────────────────────────────────────────────
1. Apply each action from the plan in execution order
2. Add inline comments explaining WHAT changed and WHY (reference action ID)
3. Preserve all business logic unless explicitly changing it
4. If an action cannot be safely applied, skip it and explain why
5. Return complete optimized script (not diffs)

Return JSON with:
- optimizedCode: full rewritten script
- appliedActions: array of action IDs successfully applied
- skippedActions: array of {id, reason} for any skipped
- inlineComments: array of {line, comment, actionId} for documentation
`;

  const schema = {
    type: "object",
    properties: {
      optimizedCode: { type: "string" },
      appliedActions: { type: "array", items: { type: "string" } },
      skippedActions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            reason: { type: "string" }
          }
        }
      },
      inlineComments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            line: { type: "number" },
            comment: { type: "string" },
            actionId: { type: "string" }
          }
        }
      }
    },
    required: ["optimizedCode", "appliedActions"]
  };

  const result = await generateStructuredJson(prompt, schema, llmOptions);

  logger.info(`✅ Applied: ${result.appliedActions.length} actions`);
  if (result.skippedActions?.length) {
    logger.warn(`⚠️  Skipped: ${result.skippedActions.length} actions`);
  }

  return result as CodeGenerationResult;
}
