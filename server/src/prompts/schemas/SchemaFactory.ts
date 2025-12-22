/**
 * AINEX Prompt Schemas - SchemaFactory
 * 
 * Re-exports schemas from templates.ts for backward compatibility.
 * Future versions will use generated schemas with consistent limits.
 * 
 * @module prompts/schemas/SchemaFactory
 */

import { z } from 'zod';

/**
 * Schema Factory - Currently imports from legacy templates
 * TODO: Refactor to use TEMPLATE_LIMITS for consistent constraints
 */

// Re-export legacy schemas for now
export const AnalysisSchema = z.object({
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
  reasoning: z.string().optional(),
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
  reasoning: z.string().optional(),
  optimizedScript: z.string(),
  summary: z.string(),
  changes: z.array(z.object({
    category: z.enum(["performance", "readability", "structure"]),
    area: z.string(),
    impact: z.string()
  })).max(8)
});

/**
 * Pre-built schemas for common tasks
 */
export const SCHEMAS = {
  analysis: AnalysisSchema,
  codeGen: CodeGenSchema,
  finalDelivery: FinalDeliverySchema,
  documentation: DocumentationSchema,
  formatOnly: FormatOnlySchema,
  nvidiaFast: NvidiaFastSchema
} as const;

export type SchemaName = keyof typeof SCHEMAS;

/**
 * Schema factory class (placeholder for future use)
 */
export class SchemaFactory {
  // Future: Generate schemas dynamically with TEMPLATE_LIMITS
}
