import { logger } from "../lib/logger";
import { sseEmitter } from "../lib/sseEmitter";
// import { runQlikOptimizeAgent } from "../agents/qlikOptimizeAgent";
import { CompactAuditReport, calculateDiffStats } from "../agents/qlikConsultancyAgent";
// import { calculateROI, formatROIExecutiveSummary } from "./roiCalculator";
import {
  // analyzeScriptCharacteristics,
  applySmartTruncation,
  SmartTruncationResult
} from "../lib/scriptAnalyzer";
import type { OptimizeMode, OptimizeResult } from "../types/qlik";
import type { ConsultancyDocument } from "../types/consultancy";
import type { LLMOptions } from "../types/optimization";
// import type { GenerateStructuredJsonOptions } from "../lib/llmClient";
import { stepTimingService } from "./stepTimingService";
// import { calculateRealMetrics, getCriticalIssuesFromMetrics, formatMetricsCompact } from "./metricsCalculator";
import {
  parseQlikScript,
  // detectSyntheticKeys,
  calculateQualityMetrics,
  type ParsedScript,
  type AntiPattern
} from "../lib/qlikParser";
import { QlikMegaOptimizer } from "../agents/qlikMegaOptimizer";

export interface FullOptimizeResult extends OptimizeResult {
  explanation?: string;
  consultancyDocument?: ConsultancyDocument;
  compactAuditReport?: CompactAuditReport; // NOVO: relatório compacto
  roiExecutiveSummary?: string;  // REVENUE FEATURE: ROI summary em texto
  processedScript?: string;
  truncationInfo?: SmartTruncationResult | null;
  originalLineCount?: number;
  processedLineCount?: number;
  analysisOnly?: {
    parsed: ParsedScript;
    qualityMetrics: ReturnType<typeof calculateQualityMetrics>;
    allAntiPatterns: AntiPattern[];
    roiExecutiveSummary?: string;  // ROI summary também no analysis mode
  };
}

/**
 * Helper: Verifica se a operação foi cancelada
 */
function checkAborted(signal?: AbortSignal, context?: string): void {
  if (signal?.aborted) {
    logger.warn(`⛔ Optimization aborted${context ? ` at ${context}` : ''}`);
    throw new Error(`Optimization aborted${context ? ` at ${context}` : ''}`);
  }
}

/**
 * MODO ÚNICO: ULTRA EXPERT (Full Power)
 * Otimização profunda com todas as análises implementadas
 */
async function runUltraExpertMode(
  script: string,
  llmOptions?: LLMOptions,
  generateConsultancy = true,
  truncationInfo: SmartTruncationResult | null = null,
  abortSignal?: AbortSignal,
  originalScript?: string
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Ultra Expert mode start');
  logger.info("⚡ MODO ULTRA EXPERT - MEGA OPTIMIZER (Gemini 2.5 Flash Architecture)");

  // Instantiate the Mega Optimizer with AbortSignal support
  const optimizer = new QlikMegaOptimizer(script, { signal: abortSignal });
  const processedLines = script.split(/\r?\n/).length;
  const originalLines = truncationInfo?.originalLines ?? processedLines;

  if (truncationInfo?.wasTruncated) {
    logger.warn(`✂️ Script truncado: ${originalLines - processedLines} linhas fora do processamento.`);
    sseEmitter.sendSubStepProgress(
      "FREE_TIER_GUARD",
      "SCRIPT_TRUNCATED",
      `Script truncado para ${processedLines}/${originalLines} linhas (FREE TIER).`,
      "success"
    );
  }

  // Run deterministic parser for metadata
  const parsed = parseQlikScript(script);
  const metrics = calculateQualityMetrics(parsed);

  // Run the pipeline
  const megaResult = await optimizer.run();

  // Calculate diff stats properly using the shared utility
  const diffStats = calculateDiffStats(script, megaResult.optimizedScript);

  // Map results to FullOptimizeResult
  return {
    originalScript: originalScript ?? script,
    optimizedScript: megaResult.optimizedScript,
    processedScript: script,
    truncationInfo,
    originalLineCount: originalLines,
    processedLineCount: processedLines,
    summary: megaResult.report.executiveSummary || "Optimization completed successfully.",
    explanation: megaResult.report.technicalDetails || "See technical details.",
    documentationMarkdown: megaResult.report.technicalDetails || "",
    analysis: {
      changes: [],
      breakingRisk: megaResult.plan.riskLevel as any,
      safeToApply: true,
      mode: 'ultra-expert',
      notes: truncationInfo?.wasTruncated ? [truncationInfo.warningMessage] : undefined,
      metricsEstimate: {
        loadComplexityBefore: "medium",
        loadComplexityAfter: "low",
        maintainabilityBefore: "medium",
        maintainabilityAfter: "high"
      }
    },

    // Map analysis data
    analysisOnly: {
      parsed: {
        tables: parsed.tables,
        joins: parsed.joins,
        variables: parsed.variables,
        complexity: parsed.complexity,
        antiPatterns: parsed.antiPatterns,
        metrics: parsed.metrics
      },
      qualityMetrics: metrics,
      allAntiPatterns: parsed.antiPatterns
    },

    // Map consultancy document
    consultancyDocument: {
      id: Date.now().toString(),
      version: "1.0",
      generatedAt: new Date().toISOString(),
      processingTimeMs: megaResult.metrics.totalTime, // Use actual processing time
      timeline: [],
      phases: [],
      cronogram: { totalDuration: megaResult.metrics.totalTime, fastestPhase: 'analysis', slowestPhase: 'analysis' },
      executiveSummary: {
        title: "Optimization Report",
        analyst: "Qlik Codex AI",
        date: new Date().toISOString(),
        overview: megaResult.report.executiveSummary,
        keyFindings: megaResult.analysis.optimizationOpportunities || [],
        criticalAlerts: megaResult.analysis.bottlenecks?.filter((b: any) => b.severity === 'Critical' || b.severity === 'High').map((b: any) => `${b.severity}: ${b.description}`) || [],
        overallRisk: megaResult.plan.riskLevel as any,
        overallHealth: 'good',
        recommendedAction: 'review'
      },
      codeComparison: {
        originalCode: script,
        optimizedCode: megaResult.optimizedScript,
        markers: [],
        diffStats: diffStats // Use calculated stats
      },
      qualitativeGains: [],
      recommendations: megaResult.plan.planSteps.map((s: any) => ({
        id: s.step.toString(),
        title: s.title,
        description: s.details,
        impact: 'high',
        effort: s.estimatedEffort ? s.estimatedEffort.toLowerCase() : 'medium',
        category: 'performance',
        actionItems: s.details ? s.details.split('. ').map((d: string) => d.trim()).filter((d: string) => d.length > 0) : []
      })),
      tips: [],
      fullDocumentation: megaResult.report.technicalDetails,
      warnings: truncationInfo?.wasTruncated ? [truncationInfo.warningMessage] : [],
      notes: []
    },

    // Map compact audit report
    compactAuditReport: {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      summary: megaResult.report.executiveSummary,
      metrics: {
        linesOfCode: processedLines,
        cyclomaticComplexity: 0,
        loadStatements: 0,
        joinStatements: 0,
        maintainabilityIndex: 0
      },
      criticalIssues: [],
      topRecommendations: megaResult.plan.planSteps.map((s: any) => ({ title: s.title, impact: 'high' })),
      overallRisk: megaResult.plan.riskLevel,
      safeToApply: true,
      processingTimeMs: 0
    },

    roiExecutiveSummary: megaResult.plan.estimatedImprovement
  };
}















/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AINEX PRO PIPELINE — 8 ESTÁGIOS INTELIGENTES (EM DESENVOLVIMENTO)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ROADMAP DE IMPLEMENTAÇÃO:
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ Stage 1: Deep Parse & Syntax Check - Agente criado (precisa ajustes de tipo)
 * ✅ Stage 2: Semantic Analysis & Performance Profiling - Agente criado (precisa ajustes)
 * ✅ Stage 3: Strategic Refactor Planning - Agente criado (precisa ajustes)
 * ✅ Stage 4: Code Generation - Agente criado (precisa ajustes)
 * ✅ Stage 5: Multi-Layer Validation - Agente criado (precisa ajustes)
 * ✅ Stage 6: Differential Review & Impact Analysis - Agente criado (precisa ajustes)
 * ✅ Stage 7: Technical Explain - Agente criado (precisa ajustes)
 * ✅ Stage 8: Final Metrics & Report - Agente criado (precisa ajustes)
 * 
 * PRÓXIMOS PASSOS:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Ajustar tipos para compatibilidade com qlikParser (QlikJoin, QlikTable)
 * 2. Adaptar generateStructuredJson para nova assinatura (wrapper compatível)
 * 3. Integrar ValidationResult corretamente (success/errors structure)
 * 4. Criar eventos SSE específicos para cada stage
 * 5. Atualizar frontend para consumir novos eventos
 * 6. Adicionar testes unitários para cada agente
 * 
 * BENEFÍCIOS ESPERADOS:
 * ─────────────────────────────────────────────────────────────────────────────
 * - Análise 5x mais profunda (AST real, profiling de performance)
 * - Planejamento estratégico antes de gerar código
 * - Validação em 4 camadas (sintaxe, semântica, performance, equivalência)
 * - Diff linha-a-linha com justificativa técnica
 * - Explicações multi-persona (DEV, SÊNIOR, ARQUITETO)
 * - ROI estimado com checklist de deploy
 * 
 * Tempo estimado: 38-57 segundos (vs. 15-20s atuais) com valor 5x maior
 */

/*
async function runUltraExpertProMode(
  script: string,
  llmOptions?: GenerateStructuredJsonOptions,
  generateConsultancy = true,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  // IMPLEMENTAÇÃO COMENTADA TEMPORARIAMENTE
  // Código completo disponível nos arquivos dos agentes criados
  throw new Error("AINEX PRO Pipeline em desenvolvimento - use runUltraExpertMode por enquanto");
}
*/

/**
 * Entry point: Roteamento por modo
 * ✨ FREE TIER: Suporta truncamento inteligente para limites de linhas
 */
export async function optimizeScript(
  script: string,
  mode: OptimizeMode, // Mantido para compatibilidade de API, mas ignorado internamente
  llmOptions?: LLMOptions,
  generateConsultancy = true,
  shouldTruncate?: boolean,
  lineLimit?: number,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  stepTimingService.reset();

  // Debug: Log parâmetros recebidos
  const originalLines = script.split(/\r?\n/).length;
  const estimatedTokens = Math.ceil(script.length / 4); // para fins de logging apenas
  const freeTierLineLimit = lineLimit ?? 200;
  logger.debug("optimizeScript called", {
    mode: "FORCED_ULTRA_EXPERT",
    originalLines,
    estimatedTokens,
    shouldTruncate,
    lineLimit: freeTierLineLimit
  });

  // Verifica cancelamento logo no início
  if (abortSignal?.aborted) {
    throw new Error('Optimization aborted by client');
  }

  let finalScript = script;
  let truncationInfo: SmartTruncationResult | null = null;

  // ✨ APLICAR TRUNCAMENTO INTELIGENTE SE NECESSÁRIO (FREE TIER)
  const enforceTruncation = shouldTruncate !== false;
  const exceedsLimits = originalLines > freeTierLineLimit;

  if (enforceTruncation && exceedsLimits) {
    logger.info(`🔒 FREE TIER: Aplicando limite de ${freeTierLineLimit} linhas com truncamento inteligente...`);

    truncationInfo = applySmartTruncation(script, freeTierLineLimit);
    finalScript = truncationInfo.truncatedScript;

    if (truncationInfo.wasTruncated) {
      logger.warn(truncationInfo.warningMessage);
      logger.info(`✂️  Cortado em linha ${truncationInfo.actualLines} (${freeTierLineLimit} base + ${truncationInfo.extraLinesAdded} extras)`);

      // Emite aviso via SSE
      sseEmitter.sendToCurrent({
        type: 'truncation_warning',
        data: {
          originalLines: truncationInfo.originalLines,
          truncatedLines: truncationInfo.actualLines,
          extraLines: truncationInfo.extraLinesAdded,
          cutPoint: truncationInfo.cutPoint,
          message: truncationInfo.warningMessage
        }
      });

      sseEmitter.sendSubStepProgress(
        "FREE_TIER_GUARD",
        "TRUNCATION_APPLIED",
        `FREE TIER: ${truncationInfo.originalLines - truncationInfo.actualLines} linhas ficaram fora da otimização`,
        "success"
      );
    } else {
      logger.info(`✓ Script dentro do limite (${truncationInfo.originalLines} linhas / ${estimatedTokens} tokens estimados)`);
    }
  }

  // Continua processamento normal com script (possivelmente truncado)
  let result: FullOptimizeResult;

  // Always force Ultra Expert Mode for now as it is the new standard
  logger.info("MODO ULTRA EXPERT - Pipeline Avancado");
  result = await runUltraExpertMode(finalScript, llmOptions, generateConsultancy, truncationInfo, abortSignal, script);

  if (truncationInfo?.wasTruncated) {
    result.summary = `${truncationInfo.warningMessage}\n\n${result.summary}`;
    result.truncationInfo = truncationInfo;
  }

  return result;
}

/**
 * Service Factory
 */
function createOptimizerService() {
  const runOptimization = (
    script: string,
    mode: OptimizeMode,
    llmOptions?: LLMOptions,
    generateConsultancy = true
  ): Promise<FullOptimizeResult> => {
    return optimizeScript(script, mode, llmOptions, generateConsultancy);
  };

  return {
    runOptimization
  };
}

export const optimizerService = createOptimizerService();




