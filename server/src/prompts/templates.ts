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
## TASK
Analyze script structure and performance. Create a prioritized plan.

## PHASES
1. **Structural Analysis**: Risks, Complexity.
2. **Performance Analysis**: Bottlenecks, Opportunities.
3. **Strategic Plan**: Max ${TEMPLATE_LIMITS.analysis.maxPlanSteps} steps.
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT

Return a JSON object strictly matching this structure:

\`\`\`json
{
  "analysis": {
    "structuralScore": number, // 0-100
    "complexity": "Low" | "Medium" | "High" | "Extreme",
    "bottlenecks": [
      {
        "severity": "Critical" | "High" | "Medium" | "Low",
        "description": "string",
        "location": "string (optional)"
      }
    ], // Max 6 items
    "dataModelRisks": ["string"], // Max 6 items
    "optimizationOpportunities": ["string"], // Max 6 items
    "analysisSummary": "string"
  },
  "plan": {
    "strategyName": "string",
    "riskLevel": "Low" | "Medium" | "High",
    "planSteps": [
      {
        "step": number,
        "title": "string",
        "details": "string",
        "targetBottleneck": "string (optional)",
        "estimatedEffort": "Low" | "Medium" | "High"
      }
    ], // Max 8 items
    "estimatedImprovement": {
      "loadTimeReduction": "string",
      "ramUsageReduction": "string",
      "maintainabilityScoreAfter": number // 0-100
    }
  }
}
\`\`\`

Ensure valid JSON syntax. No markdown code blocks outside the JSON.`,
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
## TASK
Apply optimization plan and Design Patterns. Preserve ALL logic.

## GUIDELINES
- **Optimize**: QVDs, JOINs, WHERE clauses.
- **Preserve**: Headers, TRACE statements, Identifiers.
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT

Return a JSON object strictly matching this structure:

\`\`\`json
{
  "reasoning": "string (optional)",
  "optimizedScript": "string (the full Qlik script)",
  "changesApplied": [
    {
      "category": "performance" | "readability" | "cleanup" | "structure" | "model_integrity" | "maintainability" | "security" | "logic",
      "area": "string",
      "impact": "string",
      "riskLevel": "none" | "low" | "medium" | "high"
    }
  ], // Max 8 items
  "completenessCheck": boolean,
  "designPatternsApplied": {
    "asAlignmentApplied": boolean,
    "traceSeparatorsAdded": number
  }
}
\`\`\`

Ensure valid JSON syntax. The 'optimizedScript' must be a single string with newlines escaped as \\n.`,
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
## TASK
Validate script and generate documentation.

## PHASES
1. **Validation**: Syntax, Safety Score.
2. **Documentation**: ER Diagram, Relationships.
3. **Deployment**: Summary, Improvements, Checklist.
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT

Return a JSON object strictly matching this structure:

\`\`\`json
{
  "validation": {
    "isValid": boolean,
    "issuesFound": ["string"], // Max 4 items
    "safetyScore": number // 0-100
  },
  "documentation": {
    "title": "string",
    "diagramMermaid": "string (Mermaid ERD syntax)"
  },
  "report": {
    "executiveSummary": "string (max 600 chars)",
    "achievedImprovements": ["string"], // Max 4 items
    "deploymentChecklist": ["string"] // Max 4 items
  }
}
\`\`\`

Ensure valid JSON syntax.`,
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
    .withContext('GENERATE DOCUMENTATION')
    .withInstructions(`
## TASK
Document tables, fields, and relationships.

## OUTPUT
- Max ${TEMPLATE_LIMITS.documentation.maxTables} tables.
- Max ${TEMPLATE_LIMITS.documentation.maxFieldsPerTable} fields per table.
- Max ${TEMPLATE_LIMITS.documentation.maxMetrics} key metrics.
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT

Return a JSON object strictly matching this structure:

\`\`\`json
{
  "title": "string",
  "description": "string",
  "tables": [
    {
      "name": "string",
      "description": "string",
      "fields": ["string"],
      "source": "string (optional)"
    }
  ],
  "diagram_mermaid": "string",
  "reload_strategy": "string",
  "key_metrics": ["string"]
}
\`\`\`

Ensure valid JSON syntax.`,
      60
    )
    .build();
}

/**
 * Build FORMAT_ONLY template
 */
function buildFormatOnlyTemplate(): string {
  return createOptimizationTemplate('FORMAT_ONLY', false)
    .withContext('FORMATTING ONLY (No Logic Changes)')
    .withInstructions(`
## TASK
Apply Design Patterns (AS Alignment + TRACE Separators).

## RESTRICTIONS
- **NO** logic changes.
- **NO** performance optimization.
- **ONLY** formatting.
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT

Return a JSON object strictly matching this structure:

\`\`\`json
{
  "formattedScript": "string",
  "notes": ["string"],
  "designPatternsApplied": {
    "asAlignmentApplied": boolean,
    "traceSeparatorsAdded": number
  }
}
\`\`\`

Ensure valid JSON syntax.`,
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
## TASK
Quick optimization: AS Alignment and TRACE Separators.
Preserve all logic, headers, and TRACEs.
    `)
    .withCustomSection(
      'output-format',
      `## OUTPUT FORMAT

Return a JSON object strictly matching this structure:

\`\`\`json
{
  "reasoning": "string (optional)",
  "optimizedScript": "string",
  "summary": "string",
  "changes": [
    {
      "category": "performance" | "readability" | "structure",
      "area": "string",
      "impact": "string"
    }
  ] // Max 8 items
}
\`\`\`

Ensure valid JSON syntax.`,
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
