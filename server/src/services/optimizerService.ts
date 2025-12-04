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
import { nvidiaProvider } from "../lib/llmProviders/nvidiaProvider";
import { config } from "../lib/config";

export interface FullOptimizeResult extends OptimizeResult {
  explanation?: string;
  consultancyDocument?: ConsultancyDocument;
  compactAuditReport?: CompactAuditReport; // NOVO: relatório compacto
  roiExecutiveSummary?: string;  // REVENUE FEATURE: ROI summary em texto
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
  isTruncated = false,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Ultra Expert mode start');
  logger.info("⚡ MODO ULTRA EXPERT - MEGA OPTIMIZER (Gemini 2.5 Flash Architecture)");

  // Instantiate the Mega Optimizer with AbortSignal support
  const optimizer = new QlikMegaOptimizer(script, { signal: abortSignal });
  const originalLines = script.split(/\r?\n/).length;

  // Run deterministic parser for metadata
  const parsed = parseQlikScript(script);
  const metrics = calculateQualityMetrics(parsed);

  // Run the pipeline
  const megaResult = await optimizer.run();

  // Calculate diff stats properly using the shared utility
  const diffStats = calculateDiffStats(script, megaResult.optimizedScript);

  // Map results to FullOptimizeResult
  return {
    originalScript: script,
    optimizedScript: megaResult.optimizedScript,
    summary: megaResult.report.executiveSummary || "Optimization completed successfully.",
    explanation: megaResult.report.technicalDetails || "See technical details.",
    documentationMarkdown: megaResult.report.technicalDetails || "",
    analysis: {
      changes: [],
      breakingRisk: megaResult.plan.riskLevel as any,
      safeToApply: true,
      mode: 'ultra-expert',
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
      warnings: [],
      notes: []
    },

    // Map compact audit report
    compactAuditReport: {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      summary: megaResult.report.executiveSummary,
      metrics: {
        linesOfCode: originalLines,
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
 * MODO NVIDIA FAST: Refatoração direta (apenas código)
 * Envia contexto completo em uma única chamada e retorna somente o script otimizado.
 */
async function runNvidiaFastMode(
  script: string,
  llmOptions?: LLMOptions,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, "NVIDIA Fast mode start");

  if (!nvidiaProvider.isAvailable()) {
    throw new Error("NVIDIA provider indisponível (configure NVIDIA_API_KEY)");
  }

  const model = llmOptions?.model || config.nvidiaFastModel;

  // Prompt direto: pede somente o script otimizado em JSON (chave optimizedScript)
  const prompt = `
Você é o QLIK CODEX I.A. Refatore o script Qlik abaixo para máxima performance e legibilidade.
- Preserve lógica e resultados.
- Remova SELECT *, use listas explícitas.
- Otimize joins, reduza cargas redundantes, elimine loops desnecessários.
- Retorne APENAS JSON no formato: {"optimizedScript": "<script otimizado>"} sem Markdown nem explicações.

--- SCRIPT ORIGINAL ---
${script}
`;

  const start = Date.now();

  sseEmitter.sendToCurrent({
    type: "step_progress",
    stepId: "nvidia_fast",
    name: "NVIDIA Fast Mode",
    status: "running",
    timestamp: new Date().toISOString()
  });

  const response = await nvidiaProvider.generateStructuredJson(prompt, { model });

  checkAborted(abortSignal, "NVIDIA Fast mode after LLM");

  let optimizedScript = response.text.trim();

  // Tenta extrair JSON, mas tolera texto puro
  try {
    const parsed = JSON.parse(optimizedScript);
    if (parsed && typeof parsed.optimizedScript === "string") {
      optimizedScript = parsed.optimizedScript;
    }
  } catch (err) {
    logger.warn("[NVIDIA FAST] Falha ao parsear JSON, usando texto bruto", { error: String(err) });
  }

  // Limpa code fences acidentais
  optimizedScript = optimizedScript.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

  const duration = Date.now() - start;

  sseEmitter.sendToCurrent({
    type: "step_progress",
    stepId: "nvidia_fast",
    name: "NVIDIA Fast Mode",
    status: "success",
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });

  return {
    originalScript: script,
    optimizedScript,
    summary: `NVIDIA Fast Mode (${model}) concluído em ${duration}ms`,
    documentationMarkdown: "",
    analysis: {
      changes: [],
      breakingRisk: "low",
      safeToApply: true,
      mode: "nvidia-fast",
      metricsEstimate: {
        loadComplexityBefore: "medium",
        loadComplexityAfter: "low",
        maintainabilityBefore: "medium",
        maintainabilityAfter: "high"
      }
    }
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
  logger.debug("optimizeScript called", {
    mode,
    originalLines,
    shouldTruncate,
    lineLimit
  });

  // Verifica cancelamento logo no início
  if (abortSignal?.aborted) {
    throw new Error('Optimization aborted by client');
  }

  let finalScript = script;
  let truncationInfo: SmartTruncationResult | null = null;

  // ✨ APLICAR TRUNCAMENTO INTELIGENTE SE NECESSÁRIO (FREE TIER)
  if (shouldTruncate && lineLimit) {
    logger.info(`🔒 FREE TIER: Aplicando limite de ${lineLimit} linhas com truncamento inteligente...`);

    truncationInfo = applySmartTruncation(script, lineLimit);
    finalScript = truncationInfo.truncatedScript;

    if (truncationInfo.wasTruncated) {
      logger.warn(truncationInfo.warningMessage);
      logger.info(`✂️  Cortado em linha ${truncationInfo.actualLines} (${lineLimit} base + ${truncationInfo.extraLinesAdded} extras)`);

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
    } else {
      logger.info(`✓ Script dentro do limite (${truncationInfo.originalLines} linhas)`);
    }
  }

  // Continua processamento normal com script (possivelmente truncado)
  let result: FullOptimizeResult;

  if (mode === "nvidia-fast") {
    logger.info("MODO NVIDIA FAST - Pipeline direto");
    result = await runNvidiaFastMode(finalScript, llmOptions, abortSignal);
  } else {
    logger.info("MODO ULTRA EXPERT - Pipeline Avancado");
    result = await runUltraExpertMode(finalScript, llmOptions, generateConsultancy, truncationInfo?.wasTruncated || false, abortSignal);
  }

  if (truncationInfo?.wasTruncated) {
    result.summary = `${truncationInfo.warningMessage}\n\n${result.summary}`;
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




