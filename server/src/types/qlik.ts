export type OptimizeMode = "ultra-expert" | "nvidia-fast";

export type BreakingRisk = "none" | "low" | "medium" | "high";

export type ChangeCategory = "performance" | "readability" | "cleanup" | "structure";

export interface OptimizeChange {
  category: ChangeCategory;
  area: string;
  before?: string;
  after?: string;
  impact: string;
  riskLevel: BreakingRisk;
}

// ══════════════════════════════════════════════════════════════
// MÉTRICAS REAIS (Calculadas programaticamente, não fake)
// ══════════════════════════════════════════════════════════════
export interface RealMetrics {
  // Código
  linesOfCode: number;
  codeLines: number;
  commentLines: number;
  commentRatio: number; // 0-100

  // Complexidade
  cyclomaticComplexity: number;
  loadStatements: number;
  joinStatements: number;
  loopStatements: number;
  tableCount: number;

  // Anti-patterns
  selectStarCount: number;
  syntheticKeysRisk: number; // 0-10
  cartesianProductRisk: number; // 0-10

  // Performance
  residentLoadsCount: number;
  qvdOperations: number;
  sqlPushdownOpportunities: number;

  // Qualidade
  avgComplexityPerLoad: number;
  maintainabilityIndex: number; // 0-100

  // Métricas Qlik-específicas avançadas
  qlikOptimizationScore: number; // 0-100 (score geral de otimização Qlik)
  qvdOptimizationRatio: number; // 0-100% (% de LOADs QVD otimizados)
  denormalizationFactor: number; // 0-100 (quanto menor, mais desnormalizado/eficiente)
  fieldUsageEfficiency: number; // 0-100% (campos listados explicitamente vs LOAD *)
}

// DEPRECATED: Mantido para compatibilidade, mas não usar em novos reports
export interface MetricsEstimate {
  loadComplexityBefore: "low" | "medium" | "high";
  loadComplexityAfter: "low" | "medium" | "high";
  maintainabilityBefore: "low" | "medium" | "high";
  maintainabilityAfter: "low" | "medium" | "high";
  notes?: string;
}

export interface AgentReviewResult {
  summary: string;
  changes: OptimizeChange[];
  recommendedRisk?: BreakingRisk;
  notes?: string;
}

export interface OptimizeResult {
  originalScript: string;
  optimizedScript: string;
  summary: string;
  analysis: {
    changes: OptimizeChange[];
    breakingRisk: BreakingRisk;
    safeToApply: boolean;
    mode: OptimizeMode;
    metricsEstimate: MetricsEstimate; // DEPRECATED
    realMetrics?: RealMetrics; // NOVO: métricas reais calculadas
    roi?: {  // REVENUE FEATURE: ROI calculation
      monthly: { total: number;[key: string]: number };
      annual: { total: number; breakdown: Record<string, number> };
      impact: Record<string, number>;
      payback: { monthsToPayback: number; roi: number;[key: string]: number };
      confidence: 'low' | 'medium' | 'high';
      notes: string[];
    };
    notes?: string;
    steps?: Array<{
      stepId: string;
      stepNumber: number;
      stepName: string;
      category: string;
      status: string;
      subSteps?: Array<{
        id: string;
        name: string;
        description?: string;
        status: string;
        startTime?: string;
        endTime?: string;
        duration?: number;
        error?: string;
      }>;
      metadata?: Record<string, any>;
    }>;
  };
  documentationMarkdown: string;
  review?: AgentReviewResult;
  explanation?: string;
  consultancyDocument?: any; // ConsultancyDocument type
  analysisOnly?: any; // Para modo analysis
  diffStats?: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
  };
}
