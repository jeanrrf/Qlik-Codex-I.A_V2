/**
 * AINEX Unified Prompt System v2.0
 * 
 * Prompt Builders: Compose complete prompts from core + templates
 * 
 * @module prompts/builders
 */

import type { RAGContext } from "../types/rag";

import {
  AINEX_IDENTITY,
  buildGuardrailsSection,
  DESIGN_PATTERNS_SECTION,
  OUTPUT_RULES,
  PROMPT_VERSION
} from "./core";
import { TASK_TEMPLATES, TaskId } from "./templates";

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PromptBuilderOptions {
  /** The task to execute */
  taskId: TaskId;
  /** The Qlik script to process */
  script: string;
  /** Parser summary of script structure */
  parserSummary?: string;
  /** Compact history from previous steps */
  history?: string;
  /** RAG context with similar optimizations */
  ragContext?: RAGContext | null;
  /** Include design patterns section (default: true) */
  includeDesignPatterns?: boolean;
  /** Custom context to inject */
  customContext?: string;
  /** Step-specific context for granular optimization */
  stepContext?: {
    stepId: string;
    stepName: string;
    stepDescription: string;
    category: string;
    critical: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildIdentitySection(): string {
  return `# AINEX v${PROMPT_VERSION}\n\n${AINEX_IDENTITY}`;
}

function buildContextSection(options: PromptBuilderOptions): string {
  const parts: string[] = ["## CONTEXT"];

  if (options.parserSummary) {
    parts.push(`\n### Script Structure\n${options.parserSummary}`);
  }

  if (options.history) {
    parts.push(`\n### Previous Steps Summary\n${options.history}`);
  }

  if (options.stepContext) {
    parts.push(`\n### Current Step
- Step ID: ${options.stepContext.stepId}
- Name: ${options.stepContext.stepName}
- Category: ${options.stepContext.category}
- Critical: ${options.stepContext.critical ? "YES" : "NO"}
- Description: ${options.stepContext.stepDescription}`);
  }

  if (options.customContext) {
    parts.push(`\n### Additional Context\n${options.customContext}`);
  }

  return parts.length > 1 ? parts.join("\n") : "";
}

function buildRAGSection(ragContext: RAGContext | null | undefined): string {
  if (!ragContext || ragContext.examples.length === 0) {
    return "";
  }

  const examplesText = ragContext.examples
    .slice(0, 3) // Max 3 examples to save tokens
    .map((ex, i) => `
### Example ${i + 1} (Score: ${ex.rewardScore}/10)

**Original Pattern:**
\`\`\`
${ex.originalSnippet.substring(0, 400)}${ex.originalSnippet.length > 400 ? "..." : ""}
\`\`\`

**Optimized Pattern:**
\`\`\`
${ex.optimizedSnippet.substring(0, 400)}${ex.optimizedSnippet.length > 400 ? "..." : ""}
\`\`\`

**Changes:** ${ex.changesSummary.substring(0, 150)}`)
    .join("\n---\n");

  const patternsText = ragContext.commonPatterns.length > 0
    ? `\n**Common Successful Patterns:** ${ragContext.commonPatterns.join(", ")}`
    : "";

  return `## RAG CONTEXT (Similar Successful Optimizations)

Found ${ragContext.retrievalMetadata.totalResults} similar optimizations.
Average similarity: ${(ragContext.retrievalMetadata.avgSimilarity * 100).toFixed(1)}%

Use these as reference for proven optimization patterns:

${examplesText}${patternsText}`;
}

function buildScriptSection(script: string, taskId: TaskId): string {
  // For FINAL_DELIVERY, we don't need the full script again
  if (taskId === "FINAL_DELIVERY") {
    return `## INPUT

Script context already provided in previous steps. Focus on validation and documentation of the optimized result.`;
  }

  return `## INPUT SCRIPT

\`\`\`qlik
${script}
\`\`\``;
}

function buildTaskSection(taskId: TaskId): string {
  const template = TASK_TEMPLATES[taskId];
  if (!template) {
    throw new Error(`Unknown task ID: ${taskId}`);
  }
  return template;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a complete prompt for any AINEX task
 */
export function buildPrompt(options: PromptBuilderOptions): string {
  const {
    taskId,
    script,
    ragContext,
    includeDesignPatterns = true
  } = options;

  const sections: string[] = [
    buildIdentitySection(),
    buildGuardrailsSection()
  ];

  // Include design patterns for code-generating tasks
  if (includeDesignPatterns && ["CODE_GEN", "FORMAT_ONLY", "NVIDIA_FAST", "GRANULAR_STEP"].includes(taskId)) {
    sections.push(DESIGN_PATTERNS_SECTION);
  }

  // Add context if available
  const contextSection = buildContextSection(options);
  if (contextSection) {
    sections.push(contextSection);
  }

  // Add RAG context if available
  const ragSection = buildRAGSection(ragContext);
  if (ragSection) {
    sections.push(ragSection);
  }

  // Add the script
  sections.push(buildScriptSection(script, taskId));

  // Add task-specific instructions
  sections.push(buildTaskSection(taskId));

  // Add output rules
  sections.push(OUTPUT_RULES);

  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALIZED BUILDERS (Convenience functions)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build prompt for the ANALYSIS_AND_PLAN task
 */
export function buildAnalysisPrompt(
  script: string,
  parserSummary?: string,
  ragContext?: RAGContext | null
): string {
  return buildPrompt({
    taskId: "ANALYSIS_AND_PLAN",
    script,
    parserSummary,
    ragContext,
    includeDesignPatterns: false // Analysis doesn't generate code
  });
}

/**
 * Build prompt for the CODE_GEN task
 */
export function buildCodeGenPrompt(
  script: string,
  parserSummary?: string,
  history?: string,
  ragContext?: RAGContext | null
): string {
  return buildPrompt({
    taskId: "CODE_GEN",
    script,
    parserSummary,
    history,
    ragContext,
    includeDesignPatterns: true
  });
}

/**
 * Build prompt for the FINAL_DELIVERY task
 */
export function buildFinalDeliveryPrompt(
  script: string,
  history?: string
): string {
  return buildPrompt({
    taskId: "FINAL_DELIVERY",
    script,
    history,
    includeDesignPatterns: false
  });
}

/**
 * Build prompt for documentation generation
 */
export function buildDocumentationPrompt(script: string): string {
  return buildPrompt({
    taskId: "DOCUMENTATION",
    script,
    includeDesignPatterns: false
  });
}

/**
 * Build prompt for format-only operation
 */
export function buildFormatterPrompt(script: string): string {
  return buildPrompt({
    taskId: "FORMAT_ONLY",
    script,
    includeDesignPatterns: true
  });
}

/**
 * Build prompt for NVIDIA fast mode
 */
export function buildNvidiaFastPrompt(script: string): string {
  return buildPrompt({
    taskId: "NVIDIA_FAST",
    script,
    includeDesignPatterns: true
  });
}

/**
 * Build prompt for a granular optimization step
 */
export function buildGranularStepPrompt(
  script: string,
  stepContext: PromptBuilderOptions["stepContext"],
  parserSummary?: string
): string {
  return buildPrompt({
    taskId: "GRANULAR_STEP",
    script,
    parserSummary,
    stepContext,
    includeDesignPatterns: true
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEGA PROMPT BUILDER (For QlikOptimizeAgent compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export type MegaTaskId = "ANALYSIS_AND_PLAN" | "CODE_GEN" | "FINAL_DELIVERY";

/**
 * Build a "mega prompt" compatible with QlikOptimizeAgent
 * This maintains backward compatibility while using the new unified system
 */
export function buildMegaPrompt(
  task: MegaTaskId,
  script: string,
  parserSummary: string,
  history?: string,
  ragContext?: RAGContext | null
): string {
  return buildPrompt({
    taskId: task,
    script,
    parserSummary,
    history,
    ragContext,
    includeDesignPatterns: task === "CODE_GEN"
  });
}
