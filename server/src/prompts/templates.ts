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
**PHASE 1 - STRUCTURAL ANALYSIS:**
- Audit script structure: tables, joins, data model relationships
- Identify risks: synthetic keys, circular references, cartesian products, LOAD *
- Score structural quality (0-100)
- Classify complexity: Low / Medium / High / Extreme

**PHASE 2 - PERFORMANCE ANALYSIS:**
- Detect bottlenecks: JOINs without keys, cascading RESIDENTs, missing WHERE clauses
- Identify optimization opportunities: QVD optimization, Autonumber, ApplyMap
- Flag anti-patterns: SELECT *, redundant loads, unnecessary loops

**PHASE 3 - STRATEGIC PLAN:**
- Create prioritized plan (Impact vs Effort matrix)
- Maximum ${TEMPLATE_LIMITS.analysis.maxPlanSteps} steps
- Each step must target a specific bottleneck or opportunity
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT\n\nReturn JSON matching AnalysisAndPlanSchema.\nMax ${TEMPLATE_LIMITS.analysis.maxBottlenecks} bottlenecks, ${TEMPLATE_LIMITS.analysis.maxOpportunities} opportunities, ${TEMPLATE_LIMITS.analysis.maxPlanSteps} plan steps.`,
      60
    )
    .build();
}

/**
 * Build CODE_GEN template
 */
function buildCodeGenTemplate(): string {
  return createOptimizationTemplate('CODE_GEN', true)
    .withContext('CODE GENERATION (Apply Plan + Design Patterns)')
    .withInstructions(`
**REQUIREMENTS:**
1. Apply the optimization plan from previous phase
2. Preserve ALL business logic — do not alter calculations, filters, or transformations
3. Apply AINEX Design Patterns (see above)

**WHAT TO OPTIMIZE:**
- Remove redundant loads
- Optimize JOIN sequences
- Add WHERE clauses where beneficial
- Convert RESIDENT cascades to more efficient patterns
- Add QVD optimizations where applicable

**WHAT TO PRESERVE:**
- All field names exactly as provided
- All table names exactly as provided
- Business logic and calculations
- Data transformations and mappings
- All subroutines (SUB/END SUB) and mapping tables
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT\n\nReturn JSON matching CodeGenSchema.\nMax ${TEMPLATE_LIMITS.codeGen.maxChanges} changes in changesApplied.`,
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
    .withContext('VALIDATION + FINAL DOCUMENTATION')
    .withInstructions(`
**PHASE 1 - VALIDATION:**
- Verify syntax correctness
- Check for forbidden patterns (DDL/DML, invalid functions)
- Validate data model integrity
- Calculate safety score (0-100)

**PHASE 2 - DOCUMENTATION:**
- Generate concise title for the optimized script
- Create Mermaid ER diagram of the data model
- Document key relationships

**PHASE 3 - DEPLOYMENT REPORT:**
- Executive summary (max ${TEMPLATE_LIMITS.finalDelivery.maxSummaryChars} chars)
- Top ${TEMPLATE_LIMITS.finalDelivery.maxImprovements} achieved improvements
- Deployment checklist (max ${TEMPLATE_LIMITS.finalDelivery.maxChecklistItems} items)
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
    .withContext('FAST OPTIMIZATION (Nvidia Provider)')
    .withInstructions(`
**TASK:**
- Quick optimization focusing on AS Alignment and TRACE Separators
- Preserve all logic
- Maximum ${TEMPLATE_LIMITS.nvidiaFast.maxChanges} changes
- Brief summary (max ${TEMPLATE_LIMITS.nvidiaFast.maxSummaryChars} chars)
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT\n\nReturn JSON matching NvidiaFastSchema.\nMax ${TEMPLATE_LIMITS.nvidiaFast.maxChanges} changes.`,
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
