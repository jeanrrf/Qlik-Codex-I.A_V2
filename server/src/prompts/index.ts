/**
 * AINEX Unified Prompt System v2.0
 * 
 * Central export point for all prompt-related modules
 * 
 * @module prompts
 */

// Core definitions
export {
  AINEX_IDENTITY,
  GUARDRAILS,
  buildGuardrailsSection,
  DESIGN_PATTERNS,
  DESIGN_PATTERNS_SECTION,
  OUTPUT_CONFIG,
  OUTPUT_RULES,
  PLANNING_INSTRUCTIONS,
  PROMPT_VERSION,
  PROMPT_CODENAME
} from "./core";

// Task templates and schemas
export {
  TASK_TEMPLATES,
  SCHEMAS,
  getSchemaForTask,
  AnalysisAndPlanSchema,
  CodeGenSchema,
  FinalDeliverySchema,
  DocumentationSchema,
  FormatOnlySchema,
  NvidiaFastSchema
} from "./templates";
export type { TaskId } from "./templates";

// Prompt builders
export {
  buildPrompt,
  buildAnalysisPrompt,
  buildCodeGenPrompt,
  buildFinalDeliveryPrompt,
  buildDocumentationPrompt,
  buildFormatterPrompt,
  buildNvidiaFastPrompt,
  buildGranularStepPrompt,
  buildMegaPrompt
} from "./builders";
export type { PromptBuilderOptions, MegaTaskId } from "./builders";
