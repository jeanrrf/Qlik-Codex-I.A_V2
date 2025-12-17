import { z } from "zod";

export const MetricsEstimateSchema = z.object({
  load_complexity_before: z.enum(["low", "medium", "high"]),
  load_complexity_after: z.enum(["low", "medium", "high"]),
  maintainability_before: z.enum(["low", "medium", "high"]),
  maintainability_after: z.enum(["low", "medium", "high"]),
  notes: z.string().optional()
});

export const LLMSchemaV1 = z.object({
  schema_version: z.literal("v1"),
  optimized_code: z.string(),
  summary: z.string().optional(),
  changes: z
    .array(
      z.object({
        category: z.enum(["performance", "readability", "cleanup", "structure"]),
        area: z.string(),
        before: z.string().optional(),
        after: z.string().optional(),
        impact: z.string(),
        risk_level: z.enum(["none", "low", "medium", "high"])
      })
    )
    .optional(),
  metrics_estimate: MetricsEstimateSchema.optional(),
  breaking_risk: z.enum(["none", "low", "medium", "high"]).optional(),
  documentation_markdown: z.string().optional(),
  notes: z.string().optional()
});

export type LLMSchemaV1Type = z.infer<typeof LLMSchemaV1>;

export const ReviewSchema = z.object({
  summary: z.string(),
  changes: z.array(
    z.object({
      category: z.enum(["performance", "readability", "cleanup", "structure"]),
      area: z.string(),
      impact: z.string(),
      risk_level: z.enum(["none", "low", "medium", "high"])
    })
  ),
  recommended_risk: z.enum(["none", "low", "medium", "high"]).optional(),
  notes: z.string().optional()
});

export const NvidiaFastSchema = z.object({
  optimizedScript: z.string(),
  summary: z.string().optional(),
  changes: z.array(
    z.object({
      category: z.string().optional(),
      area: z.string().optional(),
      impact: z.string().optional()
    })
  ).optional(),
  asAlignmentApplied: z.boolean().optional()
});

export const SupportedSchemas = {
  v1: LLMSchemaV1,
  review: ReviewSchema,
  nvidia_fast: NvidiaFastSchema
};
