import { logger } from "../lib/logger";
import { sseEmitter } from "../lib/sseEmitter";
import { runQlikOptimizeAgent } from "../agents/qlikOptimizeAgent";
import { generateCompactAuditReport, CompactAuditReport } from "../agents/qlikConsultancyAgent";
import { calculateROI, formatROIExecutiveSummary } from "./roiCalculator";
import {
  analyzeScriptCharacteristics,
  applySmartTruncation,
  SmartTruncationResult
} from "../lib/scriptAnalyzer";
import type { OptimizeMode, OptimizeResult } from "../types/qlik";
import type { ConsultancyDocument } from "../types/consultancy";
import type { GenerateStructuredJsonOptions } from "../lib/llmClient";
import { stepTimingService } from "./stepTimingService";
import { calculateRealMetrics, getCriticalIssuesFromMetrics, formatMetricsCompact } from "./metricsCalculator";
import {
  parseQlikScript,
  detectSyntheticKeys,
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
 * MODO 1: ANÁLISE (Read-Only)
 * Analisa profundamente sem modificar nada
 */
async function runAnalysisMode(
  script: string,
  llmOptions?: GenerateStructuredJsonOptions,
  isTruncated = false,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Analysis mode start');
  logger.info("🔍 MODO ANÁLISE - Sem modificações no código");

  // ═══════════════════════════════════════════════════════════════
  // ANÁLISE PRÉVIA: DETECTAR CARACTERÍSTICAS DO SCRIPT
  // ═══════════════════════════════════════════════════════════════
  const characteristics = analyzeScriptCharacteristics(script, isTruncated);
  logger.info(`📊 Características: ${characteristics.fileType.toUpperCase()} | ${characteristics.size} | ${characteristics.complexity} complexity`);
  logger.info(`📊 Tokens estimados: ${characteristics.estimatedTokens.toLocaleString()} | Linhas: ${characteristics.lineCount}`);

  // Emite evento de características detectadas
  sseEmitter.sendToCurrent({
    type: 'script_analysis',
    data: {
      fileType: characteristics.fileType,
      size: characteristics.size,
      complexity: characteristics.complexity,
      lines: characteristics.lineCount,
      estimatedTokens: characteristics.estimatedTokens,
      qvdOperations: characteristics.hasQVDOperations ? {
        reads: characteristics.qvdReadCount,
        writes: characteristics.qvdWriteCount
      } : null,
      strategy: 'full'
    }
  });

  if (characteristics.hasQVDOperations) {
    logger.info(`📦 QVD: ${characteristics.qvdReadCount} reads, ${characteristics.qvdWriteCount} writes`);
  }

  logger.info("⚡ Estratégia: MEGA CONTEXT - Análise completa (Gemini 1M+)");

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 1: PARSE E ANÁLISE ESTRUTURAL PROFUNDA
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before structural analysis');
  logger.info("═══ ETAPA 1/3: ANÁLISE ESTRUTURAL ═══");

  const parsed = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_001_main",
    "Análise Estrutural Completa",
    async () => {
      checkAborted(abortSignal, 'Inside structural analysis');
      // Sub 1.1: Parse do Script
      const parsedData = await stepTimingService.executeWithTiming(
        "analysis",
        "ana_001_parse",
        "Parse Qlik Real",
        async () => {
          logger.info("→ Executando parser Qlik...");
          return parseQlikScript(script);
        },
        "Parser proprietário: extrair tabelas, campos, variáveis, joins"
      );

      checkAborted(abortSignal, 'After parse');
      // Sub 1.2: Detecção de Anti-patterns
      await stepTimingService.executeWithTiming(
        "analysis",
        "ana_001_antipatterns",
        "Detecção de Anti-patterns",
        async () => {
          logger.info("→ Detectando anti-patterns programaticamente...");
          const syntheticKeys = detectSyntheticKeys(parsedData);
          parsedData.antiPatterns.push(...syntheticKeys);
          return parsedData.antiPatterns;
        },
        "Detectar SELECT *, Cartesian Products, Synthetic Keys"
      );

      checkAborted(abortSignal, 'After anti-patterns');
      // Sub 1.3: Cálculo de Métricas
      const metrics = await stepTimingService.executeWithTiming(
        "analysis",
        "ana_001_metrics",
        "Cálculo de Métricas de Qualidade",
        async () => {
          logger.info("→ Calculando métricas de qualidade...");
          return calculateQualityMetrics(parsedData);
        },
        "Manutenibilidade, Complexidade Ciclomática, Razão de Comentários"
      );

      return { parsedData, metrics };
    },
    "Parse completo e análise estática do código Qlik"
  );

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 2: ANÁLISE LLM (SEM MODIFICAÇÃO)
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before LLM analysis');
  logger.info("═══ ETAPA 2/3: ANÁLISE INTELIGENTE (LLM) ═══");

  const analysis = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_002_main",
    "Análise LLM Read-Only",
    async () => {
      checkAborted(abortSignal, 'Inside LLM analysis');
      // Sub 2.1: Contexto para LLM
      await stepTimingService.executeWithTiming(
        "analysis",
        "ana_002_context",
        "Preparação de Contexto",
        async () => {
          logger.info("→ Montando contexto rico para LLM...");
          return {
            tables: parsed.parsedData.tables.length,
            antiPatterns: parsed.parsedData.antiPatterns.length
          };
        },
        "Preparar contexto estruturado com métricas calculadas"
      );

      checkAborted(abortSignal, 'Before LLM call');
      // Sub 2.2: LLM Analysis (sem modificação)
      return await stepTimingService.executeWithTiming(
        "analysis",
        "ana_002_llm",
        "Análise LLM - Sugestões Apenas",
        async () => {
          logger.info("→ LLM gerando relatório de análise...");
          // Aqui rodamos o optimize agent mas em modo "analysis-only"
          return await runQlikOptimizeAgent(script, "analysis", llmOptions);
        },
        "LLM analisa e sugere melhorias SEM aplicar mudanças"
      );
    },
    "Análise inteligente do código com sugestões (read-only)"
  );

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 3: RELATÓRIO DE ANÁLISE COM MÉTRICAS REAIS
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before real metrics');
  logger.info("═══ ETAPA 3/4: CÁLCULO DE MÉTRICAS REAIS ═══");

  const realMetrics = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_003_metrics_real",
    "Cálculo de Métricas Reais",
    async () => {
      logger.info("→ Calculando métricas quantitativas reais...");
      const metrics = calculateRealMetrics(script);
      logger.info(`  ✓ ${formatMetricsCompact(metrics)}`);

      // Log de issues críticos
      const criticalIssues = getCriticalIssuesFromMetrics(metrics);
      if (criticalIssues.length > 0) {
        logger.warn(`  ⚠️  ${criticalIssues.length} issue(s) crítico(s):`);
        criticalIssues.forEach(issue => logger.warn(`    - ${issue}`));
      }

      return metrics;
    },
    "Calcular LOC, complexidade ciclomática, anti-patterns, MI"
  );

  // Adicionar métricas reais ao resultado
  analysis.analysis.realMetrics = realMetrics;

  logger.info("═══ ETAPA 4/4: GERAÇÃO DE RELATÓRIO COMPACTO ═══");

  const compactReport = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_004_report_compact",
    "Relatório Compacto v3.0",
    async () => {
      logger.info("→ Gerando relatório compacto (apenas dados críticos)...");
      return await generateCompactAuditReport(analysis, realMetrics);
    },
    "Relatório minimalista: sumário + métricas + top issues"
  );

  // MODO ANÁLISE: não gerar mais relatório completo legado aqui
  // Mantemos apenas o relatório compacto e as métricas reais
  const consultancyDoc = undefined;

  logger.info("✓ ANÁLISE concluída - Script original preservado");
  logger.info(`  📊 Métricas: ${formatMetricsCompact(realMetrics)}`);
  logger.info(`  ⚠️  Issues críticos: ${compactReport.criticalIssues.length}`);
  logger.info(`  💡 Recomendações: ${compactReport.topRecommendations.length}`);

  // === ROI CALCULATION (REVENUE FEATURE) ===
  const roi = calculateROI(analysis);
  logger.info(`  💰 Economia estimada: R$ ${roi.monthly.total.toFixed(2)}/mês | R$ ${roi.annual.total.toFixed(2)}/ano`);
  logger.info(`  📈 ROI: ${roi.payback.roi.toFixed(0)}% | Payback: ${roi.payback.monthsToPayback.toFixed(1)} meses`);

  return {
    ...analysis,
    originalScript: script,
    optimizedScript: script, // MESMO script (não modificou)
    analysis: {
      ...analysis.analysis,
      roi  // Adiciona ROI calculation
    },
    consultancyDocument: consultancyDoc,
    compactAuditReport: compactReport, // NOVO: relatório compacto priorizado
    analysisOnly: {
      parsed: parsed.parsedData,
      qualityMetrics: parsed.metrics,
      allAntiPatterns: parsed.parsedData.antiPatterns,
      roiExecutiveSummary: formatROIExecutiveSummary(roi)  // Summary formatado
    }
  };
}

/**
 * MODO 2: ULTRA EXPERT (Full Power)
 * Otimização profunda com todas as análises implementadas
 */
async function runUltraExpertMode(
  script: string,
  llmOptions?: GenerateStructuredJsonOptions,
  generateConsultancy = true,
  isTruncated = false,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Ultra Expert mode start');
  logger.info("⚡ MODO ULTRA EXPERT - MEGA OPTIMIZER (Gemini 2.5 Flash Architecture)");

  // Instantiate the Mega Optimizer
  const optimizer = new QlikMegaOptimizer(script);
  const originalLines = script.split(/\r?\n/).length;

  // Run deterministic parser for metadata
  const parsed = parseQlikScript(script);
  const metrics = calculateQualityMetrics(parsed);

  // Run the pipeline
  const megaResult = await optimizer.run();

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
      processingTimeMs: 0,
      timeline: [],
      phases: [],
      cronogram: { totalDuration: 0, fastestPhase: 'analysis', slowestPhase: 'analysis' },
      executiveSummary: {
        title: "Optimization Report",
        analyst: "Qlik Codex AI",
        date: new Date().toISOString(),
        overview: megaResult.report.executiveSummary,
        keyFindings: [],
        criticalAlerts: [],
        overallRisk: megaResult.plan.riskLevel as any,
        overallHealth: 'good',
        recommendedAction: 'review'
      },
      codeComparison: {
        originalCode: script,
        optimizedCode: megaResult.optimizedScript,
        markers: [],
        diffStats: { linesAdded: 0, linesRemoved: 0, linesModified: 0, totalOriginal: originalLines, totalOptimized: megaResult.optimizedScript.split('\n').length }
      },
      qualitativeGains: [],
      recommendations: megaResult.plan.planSteps.map((s: any) => ({
        id: s.step.toString(),
        title: s.title,
        description: s.details,
        impact: 'high',
        effort: 'medium',
        category: 'performance'
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
  mode: OptimizeMode,
  llmOptions?: GenerateStructuredJsonOptions,
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

  if (mode === "analysis") {
    result = await runAnalysisMode(finalScript, llmOptions, truncationInfo?.wasTruncated || false, abortSignal);
  } else {
    // ULTRA EXPERT: Por enquanto usa pipeline existente (8 estágios PRO em desenvolvimento)
    logger.info("⚡ MODO ULTRA EXPERT - Pipeline Avançado");
    result = await runUltraExpertMode(finalScript, llmOptions, generateConsultancy, truncationInfo?.wasTruncated || false, abortSignal);
  }

  // Adiciona informação de truncamento ao resultado
  if (truncationInfo?.wasTruncated) {
    result.summary = `${truncationInfo.warningMessage}\n\n${result.summary}`;
  }

  return result;
}

/**
 * MODO ANÁLISE CHUNKED - Para arquivos grandes QVD/QVS
 * Processa o script em chunks para evitar timeout mantendo precisão
 */
function createOptimizerService() {
  const runOptimization = (
    script: string,
    mode: OptimizeMode,
    llmOptions?: GenerateStructuredJsonOptions,
    generateConsultancy = true
  ): Promise<FullOptimizeResult> => {
    return optimizeScript(script, mode, llmOptions, generateConsultancy);
  };

  return {
    runOptimization
  };
}

export const optimizerService = createOptimizerService();




