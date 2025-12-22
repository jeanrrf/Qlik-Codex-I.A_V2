/**
 * AINEX Unified Prompt System v3.0 - MODERN ARCHITECTURE
 * 
 * Task Templates: Built with component-based architecture
 * Eliminates duplication by composing reusable sections
 * 
 * @module prompts/templates
 */

import { z } from 'zod';

import { createOptimizationTemplate, TemplateBuilder } from './builders/TemplateBuilder';
import { TEMPLATE_LIMITS } from './components/limits';
import { type SchemaName, SCHEMAS } from './schemas';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS (For backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export type TaskId =
  | "ANALYSIS_AND_PLAN"
  | "CODE_GEN"
  | "FINAL_DELIVERY"
  | "DOCUMENTATION"
  | "FORMAT_ONLY"
  | "NVIDIA_FAST"
  | "GRANULAR_STEP";

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA EXPORTS (For backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export const AnalysisAndPlanSchema = SCHEMAS.analysis;
export const CodeGenSchema = SCHEMAS.codeGen;
export const FinalDeliverySchema = SCHEMAS.finalDelivery;
export const DocumentationSchema = SCHEMAS.documentation;
export const FormatOnlySchema = SCHEMAS.formatOnly;
export const NvidiaFastSchema = SCHEMAS.nvidiaFast;

// Map TaskId to Schema (for backward compatibility)
const TASK_SCHEMAS: Record<TaskId, z.ZodSchema> = {
  ANALYSIS_AND_PLAN: AnalysisAndPlanSchema,
  CODE_GEN: CodeGenSchema,
  FINAL_DELIVERY: FinalDeliverySchema,
  DOCUMENTATION: DocumentationSchema,
  FORMAT_ONLY: FormatOnlySchema,
  NVIDIA_FAST: NvidiaFastSchema,
  GRANULAR_STEP: z.object({}) // Placeholder
};

/**
 * Get schema for a specific task (legacy API)
 */
export function getSchemaForTask(taskId: TaskId): z.ZodSchema | undefined {
  return TASK_SCHEMAS[taskId];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE BUILDERS - Modern component-based approach
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build ANALYSIS_AND_PLAN template
 */
function buildAnalysisTemplate(): string {
  return new TemplateBuilder('ANALYSIS_AND_PLAN')
    .withIdentity()
    .withContext('DEEP ANALYSIS + STRATEGIC PLAN')
    .withInstructions(`
**TASK:**
Analyze the script structure and performance. Identify bottlenecks and optimization opportunities.
Create a prioritized plan (Impact vs Effort).

**PHASES:**
1. Structural Analysis (Risks, Complexity)
2. Performance Analysis (Bottlenecks, Opportunities)
3. Strategic Plan (Max ${TEMPLATE_LIMITS.analysis.maxPlanSteps} steps)
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT\n\nReturn JSON matching AnalysisAndPlanSchema.`,
      60
    )
    .build();
}

/**
 * Build CODE_GEN template
 */
function buildCodeGenTemplate(): string {
  return createOptimizationTemplate('CODE_GEN', true)
    .withContext('CODE GENERATION')
    .withInstructions(`
**TASK:**
Apply the optimization plan and AINEX Design Patterns.
Preserve ALL business logic, calculations, and identifiers.

**GUIDELINES:**
- Optimize for performance (QVDs, JOINs, WHERE clauses)
- Preserve initial script headers and TRACE statements
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT\n\nReturn JSON matching CodeGenSchema.`,
      60
    )
    .build();
}

/**
 * Build FINAL_DELIVERY template
 */
function buildFinalDeliveryTemplate(): string {
  return new TemplateBuilder('FINAL_DELIVERY')
    .withIdentity()
    .withContext('VALIDATION + DOCUMENTATION')
    .withInstructions(`
**TASK:**
Validate the optimized script and generate documentation.

**PHASES:**
1. Validation (Syntax, Safety Score)
2. Documentation (ER Diagram, Relationships)
3. Deployment Report (Summary, Improvements, Checklist)
    `)
    .withCustomSection(
      'output-format',
      '## OUTPUT FORMAT\n\nReturn JSON matching FinalDeliverySchema.',
      60
    )
    .build();
}

/**
 * Build DOCUMENTATION template
 */
function buildDocumentationTemplate(): string {
  return new TemplateBuilder('DOCUMENTATION')
    .withIdentity()
    .withContext('GENERATE DOCUMENTATION FOR QLIK SCRIPT')
    .withInstructions(`
**TASK:**
- Analyze the provided Qlik script
- Document all tables, fields, and relationships
- Create Mermaid ER diagram
- Describe reload strategy
- List key business metrics

**OUTPUT:**
- Max ${TEMPLATE_LIMITS.documentation.maxTables} tables
- Max ${TEMPLATE_LIMITS.documentation.maxFieldsPerTable} fields per table
- Max ${TEMPLATE_LIMITS.documentation.maxMetrics} key metrics
    `)
    .withCustomSection(
      'output-format',
      '## OUTPUT FORMAT\n\nReturn JSON matching DocumentationSchema.',
      60
    )
    .build();
}

/**
 * Build FORMAT_ONLY template
 */
function buildFormatOnlyTemplate(): string {
  return createOptimizationTemplate('FORMAT_ONLY', false)
    .withContext('APPLY DESIGN PATTERNS ONLY (No Logic Changes)')
    .withInstructions(`
**TASK:**
- Apply AINEX Design Patterns (AS Alignment + TRACE Separators)
- DO NOT change business logic
- DO NOT optimize performance
- Only format and beautify the code

**NOTES:**
- List any observations about the script (max ${TEMPLATE_LIMITS.formatOnly.maxNotes} notes)
    `)
    .withCustomSection(
      'output-format',
      '## OUTPUT FORMAT\n\nReturn JSON matching FormatOnlySchema.',
      60
    )
    .build();
}

/**
 * Build NVIDIA_FAST template (simplified for speed)
 */
function buildNvidiaFastTemplate(): string {
  return createOptimizationTemplate('NVIDIA_FAST', true)
    .withContext('FAST OPTIMIZATION')
    .withInstructions(`
**TASK:**
Quick optimization focusing on AS Alignment and TRACE Separators.
Preserve all logic, headers, and TRACEs.
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT\n\nReturn JSON matching NvidiaFastSchema.`,
      60
    )
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API - Pre-built templates (backward compatible)
// ═══════════════════════════════════════════════════════════════════════════════

export const TASK_TEMPLATES: Record<TaskId, string> = {
  ANALYSIS_AND_PLAN: buildAnalysisTemplate(),
  CODE_GEN: buildCodeGenTemplate(),
  FINAL_DELIVERY: buildFinalDeliveryTemplate(),
  DOCUMENTATION: buildDocumentationTemplate(),
  FORMAT_ONLY: buildFormatOnlyTemplate(),
  NVIDIA_FAST: buildNvidiaFastTemplate(),
  GRANULAR_STEP: '' // Placeholder for future use
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODERN API - Direct access to builders and schemas
// ═══════════════════════════════════════════════════════════════════════════════

export { createOptimizationTemplate, TemplateBuilder } from './builders/TemplateBuilder';
export { SCHEMAS, SchemaFactory } from './schemas';
export { CODE_EXAMPLES, CORE_RULES, TEMPLATE_LIMITS } from './components';
export type { SchemaName };

/**
 * Get a schema by name
 */
export function getSchema(name: SchemaName) {
  return SCHEMAS[name];
}

/**
 * Get template token estimate
 */
export function estimateTokens(taskId: TaskId): number {
  const template = TASK_TEMPLATES[taskId];
  return Math.ceil(template.length / 4);
}
