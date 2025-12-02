/**
 * AINEX Stage 7: Technical Explain — Deep Dive
 * Explicação multi-persona (DEV, SÊNIOR, ARQUITETO)
 */

import { logger } from "../lib/logger";
import { generateStructuredJson, GenerateStructuredJsonOptions } from "../lib/llmClient";
import { type DifferentialReviewResult } from "./qlikDifferentialAgent";

export interface TechnicalExplainResult {
  personas: {
    developer: ExplanationLevel;
    senior: ExplanationLevel;
    architect: ExplanationLevel;
  };
  flowDiagrams: FlowDiagram[];
  glossary: GlossaryEntry[];
  recommendations: NextStepsRecommendation[];
}

export interface ExplanationLevel {
  summary: string;
  keyPoints: string[];
  technicalDepth: string; // Explicação detalhada
  actionItems: string[];
}

export interface FlowDiagram {
  title: string;
  type: "BEFORE" | "AFTER";
  textDiagram: string; // ASCII/text diagram
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  example?: string;
}

export interface NextStepsRecommendation {
  category: "ETL" | "QVD_STRATEGY" | "MONITORING" | "TESTING" | "DEPLOYMENT";
  priority: "HIGH" | "MEDIUM" | "LOW";
  action: string;
  rationale: string;
}

/**
 * Gera explicações técnicas multi-nível
 */
export async function runTechnicalExplain(
  originalScript: string,
  optimizedScript: string,
  diffReview: DifferentialReviewResult,
  llmOptions?: GenerateStructuredJsonOptions
): Promise<TechnicalExplainResult> {
  logger.info("📚 [STAGE 7] Technical Explain — Deep Dive");

  const prompt = buildExplainPrompt(originalScript, optimizedScript, diffReview);

  const schema = {
    type: "object",
    properties: {
      personas: {
        type: "object",
        properties: {
          developer: {
            type: "object",
            properties: {
              summary: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } },
              technicalDepth: { type: "string" },
              actionItems: { type: "array", items: { type: "string" } }
            }
          },
          senior: {
            type: "object",
            properties: {
              summary: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } },
              technicalDepth: { type: "string" },
              actionItems: { type: "array", items: { type: "string" } }
            }
          },
          architect: {
            type: "object",
            properties: {
              summary: { type: "string" },
              keyPoints: { type: "array", items: { type: "string" } },
              technicalDepth: { type: "string" },
              actionItems: { type: "array", items: { type: "string" } }
            }
          }
        }
      },
      glossary: {
        type: "array",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            definition: { type: "string" },
            example: { type: "string" }
          }
        }
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            priority: { type: "string" },
            action: { type: "string" },
            rationale: { type: "string" }
          }
        }
      }
    },
    required: ["personas", "recommendations"]
  };

  const result = await generateStructuredJson(prompt, schema, llmOptions);

  // Gera diagramas de fluxo (simplificados)
  const flowDiagrams = generateFlowDiagrams(originalScript, optimizedScript);

  logger.info(`📖 Generated explanations for 3 personas + ${result.recommendations.length} recommendations`);

  return {
    ...result,
    flowDiagrams
  } as TechnicalExplainResult;
}

function buildExplainPrompt(
  original: string,
  optimized: string,
  diffReview: DifferentialReviewResult
): string {
  return `
AINEX TECHNICAL EXPLAINER v1.0
═══════════════════════════════════════════════════════════════════

Generate multi-level explanations for three personas:

1. DEVELOPER (Junior/Mid-level)
   - Simple, actionable summary
   - Key changes in plain language
   - What to test and how
   
2. SENIOR DEVELOPER
   - Technical details of optimizations
   - Performance tradeoffs
   - Edge cases and potential issues
   
3. ARCHITECT
   - Strategic implications
   - System-wide impact
   - Long-term maintainability

CONTEXT:
─────────────────────────────────────────────────────────────────
Total Changes: ${diffReview.impactAnalysis.totalChanges}
Lines Added: ${diffReview.impactAnalysis.linesAdded}
Lines Removed: ${diffReview.impactAnalysis.linesRemoved}
Risk: ${diffReview.impactAnalysis.riskAssessment}

Key Optimizations:
${diffReview.changes.slice(0, 5).map(c => `- ${c.justification} (${c.type})`).join('\n')}

Breaking Changes: ${diffReview.breakingChanges.length}
${diffReview.breakingChanges.map(b => `- ${b.description}`).join('\n') || 'None'}

INSTRUCTIONS:
─────────────────────────────────────────────────────────────────
1. Tailor explanation depth to each persona
2. Include GLOSSARY for technical terms used
3. Provide NEXT STEPS recommendations (ETL, QVD strategy, monitoring, etc.)
4. Be specific and actionable

Return JSON matching the schema.
`;
}

function generateFlowDiagrams(original: string, optimized: string): FlowDiagram[] {
  const diagrams: FlowDiagram[] = [];

  // Diagrama BEFORE (simplificado)
  const originalTables = (original.match(/^(\w+):/gm) || []).map(m => m.replace(":", ""));
  if (originalTables.length > 0) {
    diagrams.push({
      title: "Data Flow - BEFORE Optimization",
      type: "BEFORE",
      textDiagram: `
┌─────────────┐
│   SOURCE    │
└──────┬──────┘
       │
${originalTables.slice(0, 5).map(t => `       ├──> ${t}`).join('\n')}
       │
       v
┌─────────────┐
│  DATA MODEL │
└─────────────┘
`
    });
  }

  // Diagrama AFTER (simplificado)
  const optimizedTables = (optimized.match(/^(\w+):/gm) || []).map(m => m.replace(":", ""));
  if (optimizedTables.length > 0) {
    diagrams.push({
      title: "Data Flow - AFTER Optimization",
      type: "AFTER",
      textDiagram: `
┌─────────────┐
│   SOURCE    │
└──────┬──────┘
       │
${optimizedTables.slice(0, 5).map(t => `       ├──> ${t} (optimized)`).join('\n')}
       │
       v
┌─────────────┐
│  DATA MODEL │ ✅ Faster, leaner
└─────────────┘
`
    });
  }

  return diagrams;
}
