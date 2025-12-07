import { z } from "zod";

export const DeepAnalysisSchema = z.object({
  structuralScore: z.number().min(0).max(100).describe("Score de 0 a 100 da estrutura do script"),
  complexity: z.enum(["Low", "Medium", "High", "Extreme"]).describe("Nível de complexidade geral"),
  bottlenecks: z.array(z.object({
    severity: z.enum(["Critical", "High", "Medium", "Low"]),
    description: z.string(),
    location: z.string().optional()
  })).describe("Lista de gargalos de performance identificados"),
  dataModelRisks: z.array(z.string()).describe("Riscos ao modelo de dados (chaves sintéticas, loops, etc)"),
  optimizationOpportunities: z.array(z.string()).describe("Oportunidades de otimização (QVDs, Autonumber, etc)"),
  analysisSummary: z.string().describe("Resumo executivo da análise técnica")
});

export type DeepAnalysisResult = z.infer<typeof DeepAnalysisSchema>;

export const StrategicPlanSchema = z.object({
  strategyName: z.string().describe("Nome da estratégia de otimização adotada"),
  riskLevel: z.enum(["Low", "Medium", "High"]).describe("Risco geral da aplicação do plano"),
  planSteps: z.array(z.object({
    step: z.number(),
    title: z.string(),
    details: z.string(),
    targetBottleneck: z.string().optional().describe("Qual gargalo identificado isso resolve"),
    estimatedEffort: z.enum(["Low", "Medium", "High"])
  })).describe("Passos sequenciais do plano de refatoração"),
  estimatedImprovement: z.object({
    loadTimeReduction: z.string().describe("Estimativa de redução de tempo de carga (ex: '30%')"),
    ramUsageReduction: z.string().describe("Estimativa de redução de RAM (ex: '20%')"),
    maintainabilityScoreAfter: z.number().min(0).max(100).describe("Score de manutenibilidade projetado")
  })
});

export type StrategicPlanResult = z.infer<typeof StrategicPlanSchema>;

export const AnalysisAndPlanSchema = z.object({
  analysis: DeepAnalysisSchema,
  plan: StrategicPlanSchema
});

export type AnalysisAndPlanResult = z.infer<typeof AnalysisAndPlanSchema>;

export const CodeGenSchema = z.object({
  optimizedScript: z.string().describe("The full, executable Qlik Load Script with optimizations applied"),
  changesApplied: z.array(z.object({
    category: z.enum(["performance", "readability", "cleanup", "structure"]).describe("Category of the change"),
    area: z.string().describe("Description of what was changed"),
    impact: z.string().describe("Impact of the change (e.g., 'High performance gain')"),
    riskLevel: z.enum(["none", "low", "medium", "high"]).describe("Risk level of this change")
  })).describe("List of specific changes made to the script"),
  completenessCheck: z.boolean().describe("True if the script is complete and not truncated")
});

export type CodeGenResult = z.infer<typeof CodeGenSchema>;

export const FinalDeliverySchema = z.object({
  validation: z.object({
    isValid: z.boolean(),
    issuesFound: z.array(z.string()),
    safetyScore: z.number()
  }),
  documentation: z.object({
    title: z.string(),
    description: z.string(),
    diagramMermaid: z.string(),
    reloadStrategy: z.string()
  }),
  report: z.object({
    executiveSummary: z.string(),
    technicalDetails: z.string(),
    achievedImprovements: z.array(z.string()),
    deploymentChecklist: z.array(z.string())
  })
});

export type FinalDeliveryResult = z.infer<typeof FinalDeliverySchema>;
