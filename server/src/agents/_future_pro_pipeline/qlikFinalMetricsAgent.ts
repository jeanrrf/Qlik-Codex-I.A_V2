/**
 * AINEX Stage 8: Final Metrics & Recommendation Report
 * Score final + ganho estimado + checklist de deploy + monitoramento
 */

import { logger } from "../lib/logger";
import { type DeepParseResult } from "./qlikDeepParseAgent";
import { type SemanticAnalysisResult } from "./qlikSemanticAgent";
import { type MultiLayerValidationResult } from "./qlikMultiValidationAgent";
import { type DifferentialReviewResult } from "./qlikDifferentialAgent";

export interface FinalMetricsReport {
  scores: {
    overall: number; // 0-100
    performance: number;
    maintainability: number;
    security: number;
    improvement: number; // Delta antes/depois
  };
  estimatedGains: {
    loadTimeReduction: string;
    memoryReduction: string;
    complexityReduction: string;
  };
  deploymentChecklist: ChecklistItem[];
  monitoringRecommendations: MonitoringRecommendation[];
  summary: ExecutiveSummary;
}

export interface ChecklistItem {
  category: "PRE_DEPLOY" | "TESTING" | "VALIDATION" | "POST_DEPLOY";
  task: string;
  critical: boolean;
  completed: boolean;
}

export interface MonitoringRecommendation {
  metric: string;
  target: string;
  alert: string;
  rationale: string;
}

export interface ExecutiveSummary {
  headline: string;
  keyAchievements: string[];
  risks: string[];
  nextActions: string[];
}

/**
 * Gera relatório final de métricas e recomendações
 */
export async function runFinalMetrics(
  deepParse: DeepParseResult,
  semanticAnalysis: SemanticAnalysisResult,
  validation: MultiLayerValidationResult,
  diffReview: DifferentialReviewResult
): Promise<FinalMetricsReport> {
  logger.info("📊 [STAGE 8] Final Metrics & Recommendation Report");

  // Calcula scores finais
  const scores = calculateFinalScores(deepParse, semanticAnalysis, validation);
  logger.info(`📈 Overall Score: ${scores.overall}/100 (improvement: +${scores.improvement})`);

  // Estima ganhos reais
  const estimatedGains = {
    loadTimeReduction: diffReview.impactAnalysis.estimatedROI.timeReduction,
    memoryReduction: diffReview.impactAnalysis.estimatedROI.memoryReduction,
    complexityReduction: calculateComplexityReduction(deepParse, semanticAnalysis)
  };
  logger.info(`💰 Gains: ${estimatedGains.loadTimeReduction} time, ${estimatedGains.memoryReduction} memory`);

  // Gera checklist de deploy
  const deploymentChecklist = generateDeploymentChecklist(validation, diffReview);

  // Recomendações de monitoramento
  const monitoringRecommendations = generateMonitoringRecommendations(semanticAnalysis, diffReview);

  // Executive summary
  const summary = generateExecutiveSummary(scores, estimatedGains, validation, diffReview);

  return {
    scores,
    estimatedGains,
    deploymentChecklist,
    monitoringRecommendations,
    summary
  };
}

function calculateFinalScores(
  deepParse: DeepParseResult,
  semanticAnalysis: SemanticAnalysisResult,
  validation: MultiLayerValidationResult
) {
  const performance = Math.round((semanticAnalysis.performanceScore + validation.layers.performance.score) / 2);
  const maintainability = Math.round((deepParse.structuralScore + validation.layers.semantic.score) / 2);
  const security = validation.layers.syntax.passed ? 100 : 50;
  const overall = Math.round((performance + maintainability + security) / 3);

  // Improvement = diferença antes/depois
  const beforeScore = Math.round((deepParse.structuralScore + semanticAnalysis.performanceScore) / 2);
  const improvement = overall - beforeScore;

  return { overall, performance, maintainability, security, improvement };
}

function calculateComplexityReduction(
  deepParse: DeepParseResult,
  semanticAnalysis: SemanticAnalysisResult
): string {
  const criticalWarnings = deepParse.complexityWarnings.filter(w => w.severity === "CRITICAL").length;
  const bottlenecks = semanticAnalysis.bottlenecks.filter(b => b.severity === "CRITICAL").length;

  const totalComplexityIssues = criticalWarnings + bottlenecks;
  if (totalComplexityIssues === 0) return "Low complexity maintained";
  if (totalComplexityIssues >= 5) return "40-60% complexity reduction";
  return "20-40% complexity reduction";
}

function generateDeploymentChecklist(
  validation: MultiLayerValidationResult,
  diffReview: DifferentialReviewResult
): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];

  // PRE-DEPLOY
  checklist.push({
    category: "PRE_DEPLOY",
    task: "Backup current production script",
    critical: true,
    completed: false
  });

  checklist.push({
    category: "PRE_DEPLOY",
    task: "Review all breaking changes",
    critical: diffReview.breakingChanges.length > 0,
    completed: false
  });

  // TESTING
  checklist.push({
    category: "TESTING",
    task: "Run full reload in DEV environment",
    critical: true,
    completed: false
  });

  checklist.push({
    category: "TESTING",
    task: "Compare output data with baseline (row counts, aggregations)",
    critical: true,
    completed: false
  });

  checklist.push({
    category: "TESTING",
    task: "Test all dependent visualizations and reports",
    critical: diffReview.breakingChanges.length > 0,
    completed: false
  });

  // VALIDATION
  checklist.push({
    category: "VALIDATION",
    task: "Verify syntax validation passed",
    critical: true,
    completed: validation.layers.syntax.passed
  });

  checklist.push({
    category: "VALIDATION",
    task: "Verify performance validation passed",
    critical: false,
    completed: validation.layers.performance.passed
  });

  // POST-DEPLOY
  checklist.push({
    category: "POST_DEPLOY",
    task: "Monitor first reload time and memory usage",
    critical: true,
    completed: false
  });

  checklist.push({
    category: "POST_DEPLOY",
    task: "Verify data freshness and accuracy",
    critical: true,
    completed: false
  });

  return checklist;
}

function generateMonitoringRecommendations(
  semanticAnalysis: SemanticAnalysisResult,
  diffReview: DifferentialReviewResult
): MonitoringRecommendation[] {
  const recommendations: MonitoringRecommendation[] = [];

  // Monitoramento de performance
  recommendations.push({
    metric: "Script Reload Time",
    target: `< ${semanticAnalysis.estimatedImpact.estimatedLoadTime}`,
    alert: "Alert if reload time exceeds baseline by 20%",
    rationale: "Detect performance regressions early"
  });

  recommendations.push({
    metric: "Peak Memory Usage",
    target: `< ${semanticAnalysis.estimatedImpact.memoryUsage}`,
    alert: "Alert if memory usage exceeds 80% of available RAM",
    rationale: "Prevent out-of-memory errors"
  });

  // Monitoramento de dados
  recommendations.push({
    metric: "Row Count per Table",
    target: "Within ±5% of baseline",
    alert: "Alert if any table row count deviates >10%",
    rationale: "Detect data integrity issues"
  });

  // Monitoramento de erros
  recommendations.push({
    metric: "Script Errors/Warnings",
    target: "Zero errors",
    alert: "Alert immediately on any script error",
    rationale: "Ensure reload reliability"
  });

  return recommendations;
}

function generateExecutiveSummary(
  scores: FinalMetricsReport["scores"],
  gains: FinalMetricsReport["estimatedGains"],
  validation: MultiLayerValidationResult,
  diffReview: DifferentialReviewResult
): ExecutiveSummary {
  const headline = scores.improvement > 10
    ? `✅ Significant optimization achieved: +${scores.improvement} points improvement`
    : scores.improvement > 0
      ? `✅ Moderate optimization achieved: +${scores.improvement} points improvement`
      : `ℹ️  Script analyzed, minor optimization applied`;

  const keyAchievements: string[] = [];
  if (scores.performance > 80) keyAchievements.push(`High performance score: ${scores.performance}/100`);
  if (scores.maintainability > 80) keyAchievements.push(`High maintainability score: ${scores.maintainability}/100`);
  if (validation.layers.syntax.passed) keyAchievements.push("All syntax validations passed");
  if (gains.loadTimeReduction) keyAchievements.push(`Estimated ${gains.loadTimeReduction} load time reduction`);

  const risks: string[] = [];
  if (diffReview.breakingChanges.length > 0) {
    risks.push(`${diffReview.breakingChanges.length} breaking changes require careful testing`);
  }
  if (diffReview.impactAnalysis.riskAssessment === "HIGH") {
    risks.push("High number of changes - thorough testing recommended");
  }
  if (!validation.layers.performance.passed) {
    risks.push("Performance validation warnings detected");
  }

  const nextActions: string[] = [
    "Deploy to DEV environment and run full reload",
    "Compare results with production baseline",
    "Test all dependent visualizations",
    "Monitor first production reload closely"
  ];

  return { headline, keyAchievements, risks, nextActions };
}
