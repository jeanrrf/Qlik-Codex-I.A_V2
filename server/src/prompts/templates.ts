/**
 * AINEX Unified Prompt System v2.0
 * 
 * Task Templates: Specific instructions for each operation type
 * 
 * @module prompts/templates
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// TASK IDs
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
// JSON SCHEMAS (ZOD)
// ═══════════════════════════════════════════════════════════════════════════════

export const AnalysisAndPlanSchema = z.object({
  analysis: z.object({
    structuralScore: z.number().min(0).max(100),
    complexity: z.enum(["Low", "Medium", "High", "Extreme"]),
    bottlenecks: z.array(z.object({
      severity: z.enum(["Critical", "High", "Medium", "Low"]),
      description: z.string(),
      location: z.string().optional()
    })).max(6),
    dataModelRisks: z.array(z.string()).max(6),
    optimizationOpportunities: z.array(z.string()).max(6),
    analysisSummary: z.string()
  }),
  plan: z.object({
    strategyName: z.string(),
    riskLevel: z.enum(["Low", "Medium", "High"]),
    planSteps: z.array(z.object({
      step: z.number(),
      title: z.string(),
      details: z.string(),
      targetBottleneck: z.string().optional(),
      estimatedEffort: z.enum(["Low", "Medium", "High"])
    })).max(8),
    estimatedImprovement: z.object({
      loadTimeReduction: z.string(),
      ramUsageReduction: z.string(),
      maintainabilityScoreAfter: z.number().min(0).max(100)
    })
  })
});

export const CodeGenSchema = z.object({
  optimizedScript: z.string(),
  changesApplied: z.array(z.object({
    category: z.enum(["performance", "readability", "cleanup", "structure", "model_integrity", "maintainability", "security", "logic"]),
    area: z.string(),
    impact: z.string(),
    riskLevel: z.enum(["none", "low", "medium", "high"])
  })).max(8),
  completenessCheck: z.boolean(),
  designPatternsApplied: z.object({
    asAlignmentApplied: z.boolean(),
    traceSeparatorsAdded: z.number()
  }).optional()
});

export const FinalDeliverySchema = z.object({
  validation: z.object({
    isValid: z.boolean(),
    issuesFound: z.array(z.string()).max(4),
    safetyScore: z.number().min(0).max(100)
  }),
  documentation: z.object({
    title: z.string(),
    diagramMermaid: z.string()
  }),
  report: z.object({
    executiveSummary: z.string().max(600),
    achievedImprovements: z.array(z.string()).max(4),
    deploymentChecklist: z.array(z.string()).max(4)
  })
});

export const DocumentationSchema = z.object({
  title: z.string(),
  description: z.string(),
  tables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    fields: z.array(z.string()),
    source: z.string().optional()
  })),
  diagram_mermaid: z.string(),
  reload_strategy: z.string(),
  key_metrics: z.array(z.string())
});

export const FormatOnlySchema = z.object({
  formattedScript: z.string(),
  notes: z.array(z.string()),
  designPatternsApplied: z.object({
    asAlignmentApplied: z.boolean(),
    traceSeparatorsAdded: z.number()
  })
});

export const NvidiaFastSchema = z.object({
  optimizedScript: z.string(),
  summary: z.string(),
  changes: z.array(z.object({
    category: z.enum(["performance", "readability", "structure"]),
    area: z.string(),
    impact: z.string()
  })).max(8)
});

// ═══════════════════════════════════════════════════════════════════════════════
// TASK TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const TASK_TEMPLATES: Record<TaskId, string> = {
  ANALYSIS_AND_PLAN: `## TASK: DEEP ANALYSIS + STRATEGIC PLAN

PHASE 1 - STRUCTURAL ANALYSIS:
- Audit script structure: tables, joins, data model relationships
- Identify risks: synthetic keys, circular references, cartesian products, LOAD *
- Score structural quality (0-100)
- Classify complexity: Low / Medium / High / Extreme

PHASE 2 - PERFORMANCE ANALYSIS:
- Detect bottlenecks: JOINs without keys, cascading RESIDENTs, missing WHERE clauses
- Identify optimization opportunities: QVD optimization, Autonumber, ApplyMap
- Flag anti-patterns: SELECT *, redundant loads, unnecessary loops

PHASE 3 - STRATEGIC PLAN:
- Create prioritized plan (Impact vs Effort matrix)
- Maximum 8 steps
- Each step must target a specific bottleneck or opportunity

OUTPUT LIMITS:
- Maximum 6 bottlenecks
- Maximum 6 opportunities  
- Maximum 8 plan steps
- Total response under 2800 characters

JSON SCHEMA (no markdown, pure JSON):
{
  "analysis": {
    "structuralScore": number,
    "complexity": "Low" | "Medium" | "High" | "Extreme",
    "bottlenecks": [{ "severity": "Critical"|"High"|"Medium"|"Low", "description": string, "location": string }],
    "dataModelRisks": string[],
    "optimizationOpportunities": string[],
    "analysisSummary": string
  },
  "plan": {
    "strategyName": string,
    "riskLevel": "Low" | "Medium" | "High",
    "planSteps": [{ "step": number, "title": string, "details": string, "targetBottleneck": string, "estimatedEffort": "Low"|"Medium"|"High" }],
    "estimatedImprovement": { "loadTimeReduction": string, "ramUsageReduction": string, "maintainabilityScoreAfter": number }
  }
}`,

  CODE_GEN: `## TASK: CODE GENERATION (Apply Plan + Design Patterns)

REQUIREMENTS:
1. Apply the optimization plan from previous phase
2. Preserve ALL business logic — do not alter calculations, filters, or transformations
3. Apply AINEX Design Patterns (MANDATORY):
   - AS Alignment: Vertically align all AS keywords in each LOAD block
   - TRACE Separators: Add block separators between logical sections

**CRITICAL: COMPLETENESS REQUIREMENT**
- The optimizedScript MUST be a complete, runnable Qlik script
- EVERY field list MUST be preceded by LOAD keyword or SQL SELECT
- EVERY LOAD statement MUST have a data source (FROM, RESIDENT, INLINE, AUTOGENERATE, or SQL SELECT)
- DO NOT generate partial code snippets or incomplete statements
- DO NOT omit keywords like LOAD, SELECT, FROM, WHERE, etc.
- If you cannot complete a section safely, keep the original code for that section

CODE STANDARDS:
- Consistent naming conventions
- Explicit field lists (never LOAD *)
- DROP temporary tables after use
- Proper indentation (4 spaces)
- Keywords in UPPERCASE (LOAD, FROM, WHERE, AS, LEFT JOIN, etc.)

WHAT TO OPTIMIZE:
- Remove redundant loads
- Optimize JOIN sequences
- Add WHERE clauses where beneficial
- Convert RESIDENT cascades to more efficient patterns
- Add QVD optimizations where applicable

WHAT TO PRESERVE:
- All field names exactly as provided
- All table names exactly as provided
- Business logic and calculations
- Data transformations and mappings

**COMMON MISTAKES TO AVOID:**
❌ WRONG (incomplete):
    C7_FILIAL,
    C7_NUM,
    C7_PRODUTO AS CodProduto
FROM SC7010;

✅ CORRECT (complete):
LOAD
    C7_FILIAL,
    C7_NUM,
    C7_PRODUTO AS CodProduto
FROM
    SC7010;

❌ WRONG (missing SELECT):
    B1_COD    AS CodProduto,
    B1_DESC   AS DescProduto
FROM SB1010;

✅ CORRECT:
SQL SELECT
    B1_COD    AS CodProduto,
    B1_DESC   AS DescProduto
FROM
    SB1010;

OR:

LOAD
    B1_COD    AS CodProduto,
    B1_DESC   AS DescProduto
FROM
    [lib://SB1010.qvd] (qvd);

OUTPUT LIMITS:
- Maximum 8 changes in changesApplied array
- Response under 2800 characters (excluding script)

JSON SCHEMA:
{
  "optimizedScript": "FULL_OPTIMIZED_SCRIPT_WITH_DESIGN_PATTERNS",
  "changesApplied": [
    {
      "category": "performance" | "readability" | "cleanup" | "structure" | "model_integrity" | "maintainability",
      "area": "Brief description of what was changed",
      "impact": "Expected impact (e.g., 'Reduced load time')",
      "riskLevel": "none" | "low" | "medium" | "high"
    }
  ],
  "completenessCheck": true,
  "designPatternsApplied": {
    "asAlignmentApplied": true,
    "traceSeparatorsAdded": number
  }
}`,

  FINAL_DELIVERY: `## TASK: VALIDATION + FINAL DOCUMENTATION

PHASE 1 - VALIDATION:
- Verify syntax correctness
- Check for forbidden patterns (DDL/DML, invalid functions)
- Validate data model integrity
- Calculate safety score (0-100)

PHASE 2 - DOCUMENTATION:
- Generate concise title for the optimized script
- Create Mermaid ER diagram of the data model
- Document key relationships

PHASE 3 - DEPLOYMENT REPORT:
- Executive summary (max 600 chars)
- Top 4 achieved improvements
- Deployment checklist (max 4 items)

OUTPUT LIMITS:
- Maximum 4 issues
- Maximum 4 improvements
- Maximum 4 checklist items
- Executive summary max 600 characters

JSON SCHEMA:
{
  "validation": {
    "isValid": boolean,
    "issuesFound": string[],
    "safetyScore": number
  },
  "documentation": {
    "title": string,
    "diagramMermaid": "erDiagram..."
  },
  "report": {
    "executiveSummary": string,
    "achievedImprovements": string[],
    "deploymentChecklist": string[]
  }
}`,

  DOCUMENTATION: `## TASK: TECHNICAL DOCUMENTATION GENERATION

Analyze the Qlik load script and generate comprehensive technical documentation.

REQUIRED OUTPUTS:
1. Descriptive title for the application/script
2. Executive description of the script's purpose
3. Table inventory with:
   - Table name
   - Table type (Fact, Dimension, Mapping, Bridge, Calendar)
   - Key fields
   - Data source (QVD, SQL, Excel, CSV)
4. Mermaid ER diagram showing relationships
5. Recommended reload strategy (Incremental, Full, Daily, Hourly)
6. Identified KPIs and metrics

JSON SCHEMA:
{
  "title": "Suggested title for the App/Script",
  "description": "Executive description of what this script does",
  "tables": [
    {
      "name": "TableName",
      "description": "What this table stores (Fact, Dimension, Mapping, etc.)",
      "fields": ["List", "of", "key", "fields"],
      "source": "Data source (QVD, SQL, Excel)"
    }
  ],
  "diagram_mermaid": "erDiagram Mermaid code for the data model",
  "reload_strategy": "Recommended reload strategy with justification",
  "key_metrics": ["List of KPIs or metrics calculated in this script"]
}`,

  FORMAT_ONLY: `## TASK: FORMAT SCRIPT (No Logic Changes)

Apply formatting and AINEX Design Patterns WITHOUT changing any business logic.

FORMATTING RULES:
1. Keywords in UPPERCASE: LOAD, FROM, WHERE, AS, LEFT JOIN, INNER JOIN, RESIDENT, etc.
2. Indentation: 4 spaces per level
3. One field per line in LOAD statements
4. FROM/RESIDENT on separate line after field list
5. Proper spacing around operators

AINEX DESIGN PATTERNS (MANDATORY):
1. AS Alignment: Vertically align all AS keywords based on longest field
2. TRACE Separators: Add block separators between logical sections

CRITICAL:
- DO NOT change any field names
- DO NOT change any table names
- DO NOT change any calculations or logic
- DO NOT add or remove fields
- ONLY apply formatting and design patterns

JSON SCHEMA:
{
  "formattedScript": "FORMATTED_SCRIPT",
  "notes": ["List of formatting changes applied"],
  "designPatternsApplied": {
    "asAlignmentApplied": true,
    "traceSeparatorsAdded": number
  }
}`,

  NVIDIA_FAST: `## TASK: FAST OPTIMIZATION (Single Pass)

Perform rapid optimization focusing on the highest-impact changes only.

OPTIMIZE:
- Remove SELECT * / LOAD * — use explicit field lists
- Optimize obvious JOIN inefficiencies
- Remove clearly redundant loads
- Add DROP for orphaned temporary tables
- Apply AINEX Design Patterns

PRESERVE:
- All business logic
- All field and table names exactly
- All calculations and transformations

OUTPUT FORMAT (JSON only, no markdown):
{
  "optimizedScript": "OPTIMIZED_SCRIPT",
  "summary": "Concise summary of improvements (PT-BR)",
  "changes": [
    {
      "category": "performance" | "readability" | "structure",
      "area": "What was changed",
      "impact": "Expected impact"
    }
  ]
}`,

  GRANULAR_STEP: `## TASK: GRANULAR OPTIMIZATION STEP

Apply ONLY the specific optimization for this step.
Do not make any other changes beyond what this step requires.

RULES:
- Apply ONLY the optimization described in the step context
- Preserve all other code exactly as-is
- Maintain AINEX Design Patterns if already present
- If adding new code, follow Design Pattern standards

OUTPUT:
Return the complete script with only this step's optimization applied.
If no change is needed for this step, return the script unchanged.

The output should be the raw script text (no JSON wrapper for granular steps).`
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const SCHEMAS: Partial<Record<TaskId, z.ZodSchema>> = {
  ANALYSIS_AND_PLAN: AnalysisAndPlanSchema,
  CODE_GEN: CodeGenSchema,
  FINAL_DELIVERY: FinalDeliverySchema,
  DOCUMENTATION: DocumentationSchema,
  FORMAT_ONLY: FormatOnlySchema,
  NVIDIA_FAST: NvidiaFastSchema
};

export function getSchemaForTask(taskId: TaskId): z.ZodSchema | undefined {
  return SCHEMAS[taskId];
}
