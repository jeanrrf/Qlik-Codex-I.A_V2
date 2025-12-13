import { CompactAuditReport, calculateDiffStats, runConsultancyAgent } from "../agents/qlikConsultancyAgent";
import { QlikOptimizeAgent } from "../agents/qlikOptimizeAgent";
import { config } from "../lib/config";
import { nvidiaProvider } from "../lib/llmProviders/nvidiaProvider";
import { logger } from "../lib/logger";
import { compactScriptForPrompt } from "../lib/promptCompactor";
import {
  parseQlikScript,
  // detectSyntheticKeys,
  calculateQualityMetrics
  // type ParsedScript, // REMOVIDO: não utilizado
  // type AntiPattern // REMOVIDO: não utilizado
} from "../lib/qlikParser";
import {
  // analyzeScriptCharacteristics,
  applySmartTruncation,
  SmartTruncationResult
} from "../lib/scriptAnalyzer";
import { sseEmitter } from "../lib/sseEmitter";
import type { ConsultancyDocument } from "../types/consultancy";
import type { LLMOptions } from "../types/optimization";
import type { DeterministicValidationSnapshot, OptimizeMode, OptimizeResult } from "../types/qlik";
import type { RAGContext } from "../types/rag";
import { validateQlikScript } from "../validators/qlikValidator";

import { stepTimingService } from "./stepTimingService";
import { vectorRAGService } from "./vectorRAGService";

export interface FullOptimizeResult extends OptimizeResult {
  explanation?: string;
  consultancyDocument?: ConsultancyDocument;
  compactAuditReport?: CompactAuditReport; // NOVO: relatório compacto
  roiExecutiveSummary?: string;  // REVENUE FEATURE: ROI summary em texto
  ragContext?: RAGContext | null; // RAG: contexto recuperado de otimizações similares
  optimizationId?: string; // RAG: ID para feedback posterior
  analysisOnly?: {
    parsed: {
      keyFindings: string[];
      criticalAlerts: string[];
      overallRisk: 'none' | 'low' | 'medium' | 'high';
      overallHealth: string;
      recommendedAction: string;
    };
    codeComparison: {
      originalCode: string;
      optimizedCode: string;
      markers: unknown[];
      diffStats: {
        linesAdded: number;
        linesRemoved: number;
        linesModified: number;
      };
    };
    qualitativeGains: unknown[];
    recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      impact: 'minimal' | 'low' | 'medium' | 'high';
      effort: 'minimal' | 'low' | 'medium' | 'high';
      category: string;
      actionItems: string[];
    }>;
    tips: unknown[];
    fullDocumentation: string;
    warnings: unknown[];
    notes: unknown[];
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

const RETRYABLE_PROVIDER_ERROR_PATTERNS = [
  /timeout/i,
  /json/i,
  /stream/i,
  /schema/i,
  /provider/i,
  /failed/i,
  /falh/i
];

function isRetryableProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (!message) return false;
  if (/abort/i.test(message)) return false;
  return RETRYABLE_PROVIDER_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

function buildDeterministicValidationSnapshot(originalScript: string, optimizedScript: string): DeterministicValidationSnapshot {
  const optimized = optimizedScript || originalScript;

  return {
    original: validateQlikScript(originalScript),
    optimized: validateQlikScript(optimized)
  };
}

function applyDeterministicValidation(result: FullOptimizeResult): FullOptimizeResult {
  const validationStart = Date.now();
  const optimizedScript = result.optimizedScript || result.originalScript;
  const deterministicValidation = buildDeterministicValidationSnapshot(result.originalScript, optimizedScript);
  const optimizedWarnings = deterministicValidation.optimized.warnings || [];
  const optimizedSafe = deterministicValidation.optimized.safe && optimizedWarnings.length === 0;
  const duration = Date.now() - validationStart;

  result.analysis.deterministicValidation = deterministicValidation;
  result.analysis.validationWarnings = optimizedWarnings;
  result.analysis.safeToApply = result.analysis.safeToApply && optimizedSafe;

  const warningPreview = optimizedWarnings.slice(0, 3).join(" | ");

  sseEmitter.sendToCurrent({
    type: "substep",
    substep: {
      id: "DETERMINISTIC_VALIDATION",
      name: "Validação determinística (qlikValidator)",
      status: optimizedSafe ? "success" : "warning",
      description: optimizedSafe ? undefined : warningPreview,
      duration,
      endTime: new Date().toISOString()
    }
  });

  if (!optimizedSafe) {
    const message = `⚠️ Validação determinística encontrou ${optimizedWarnings.length} alerta(s). Revise antes de aplicar.`;
    result.summary = `${message}\n\n${result.summary}`;
    const note = warningPreview || optimizedWarnings.join(" | ");
    result.analysis.notes = result.analysis.notes
      ? `${result.analysis.notes}\n${message}${note ? `: ${note}` : ""}`
      : `${message}${note ? `: ${note}` : ""}`;
  }

  return result;
}

/**
 * MODO ÚNICO: ULTRA EXPERT (Full Power)
 * Otimização profunda com todas as análises implementadas
 */
async function runUltraExpertMode(
  script: string,
  llmOptions?: LLMOptions,
  _generateConsultancy = true,
  isTruncated = false,
  abortSignal?: AbortSignal,
  userId?: string
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Ultra Expert mode start');
  logger.info("⚡ MODO ULTRA EXPERT - MEGA OPTIMIZER (Gemini 2.5 Flash Architecture)");

  // ========== RAG: BUSCA CONTEXTO DE OTIMIZAÇÕES SIMILARES ==========
  let ragContext: RAGContext | null = null;

  if (vectorRAGService.isEnabled()) {
    try {
      const ragStart = Date.now();
      ragContext = await vectorRAGService.buildRAGContext(script);
      const ragElapsed = Date.now() - ragStart;

      if (ragContext) {
        logger.info('[RAG] Context retrieved', {
          examples: ragContext.examples.length,
          avgSimilarity: ragContext.retrievalMetadata.avgSimilarity.toFixed(3),
          latencyMs: ragElapsed
        });

        sseEmitter.sendToCurrent({
          type: 'rag_context',
          examples: ragContext.examples.length,
          avgSimilarity: ragContext.retrievalMetadata.avgSimilarity,
          latencyMs: ragElapsed
        });
      } else {
        logger.info('[RAG] No similar optimizations found');
      }
    } catch (error) {
      logger.warn('[RAG] Failed to retrieve context, continuing without RAG', { error });
      // Fail-open: continua sem RAG se falhar
    }
  }

  // Instantiate the Mega Optimizer with AbortSignal support + RAG context
  const optimizer = new QlikOptimizeAgent(script, { signal: abortSignal, ragContext });
  const originalLines = script.split(/\r?\n/).length;

  // Run the pipeline
  const megaResult = await optimizer.run();

  // Calculate diff stats properly using the shared utility
  const diffStats = calculateDiffStats(script, megaResult.optimizedScript);

  // Map results to FullOptimizeResult
  const result: FullOptimizeResult = {
    originalScript: script,
    optimizedScript: megaResult.optimizedScript,
    // summary may include a truncation warning when free-tier truncation occurred
    summary: (isTruncated ? `⚠️ SCRIPT TRUNCADO DURANTE A ANÁLISE — resposta parcial\n\n` : '') + String(megaResult.report.executiveSummary || "Optimization completed successfully."),
    diffStats, // Add diffStats to top level result
    explanation: typeof megaResult.report.technicalDetails === 'string' ? megaResult.report.technicalDetails : "See technical details.",
    documentationMarkdown: String(megaResult.report.technicalDetails || ""),
    analysis: {
      changes: [],
      breakingRisk: (typeof megaResult.plan?.riskLevel === 'string' ? (megaResult.plan?.riskLevel as unknown as import('../types/qlik').BreakingRisk) : 'none'),
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
        keyFindings: Array.isArray((megaResult.analysis as Record<string, unknown> | undefined)?.optimizationOpportunities) ? ((megaResult.analysis as Record<string, unknown>).optimizationOpportunities as unknown[]).map(k => String(k)) : [],
        criticalAlerts: (megaResult.analysis.bottlenecks as Array<Record<string, unknown>> | undefined)
          ? (megaResult.analysis.bottlenecks as Array<Record<string, unknown>>)
            .filter((b) => String(b.severity) === 'Critical' || String(b.severity) === 'High')
            .map((b) => `${String(b.severity)}: ${String(b.description)}`)
          : [],
        overallRisk: ((): 'none' | 'low' | 'medium' | 'high' => {
          const r = String(megaResult.plan?.riskLevel ?? 'none');
          return ['none', 'low', 'medium', 'high'].includes(r) ? r as 'none' | 'low' | 'medium' | 'high' : 'none';
        })(),
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
      recommendations: (megaResult.plan.planSteps as Array<Record<string, unknown>> || []).map((s) => {
        const rawPriority = String(s.priority ?? megaResult.plan?.riskLevel ?? 'medium');
        const priority = ['critical', 'high', 'medium', 'low'].includes(rawPriority) ? rawPriority as 'critical' | 'high' | 'medium' | 'low' : 'medium';
        const effortRaw = String((s.estimatedEffort as string | undefined) ?? 'medium').toLowerCase();
        const effort = ['minimal', 'low', 'medium', 'high'].includes(effortRaw) ? (effortRaw as 'minimal' | 'low' | 'medium' | 'high') : 'medium';

        return {
          id: String(s.step ?? ''),
          title: String(s.title ?? ''),
          description: String(s.details ?? ''),
          priority,
          impact: 'high' as 'minimal' | 'low' | 'medium' | 'high',
          effort,
          category: 'performance',
          actionItems: String(s.details ?? '').split('. ').map((d: string) => d.trim()).filter((d: string) => d.length > 0)
        };
      }),
      tips: [],
      fullDocumentation: String(megaResult.report.technicalDetails || ''),
      warnings: [],
      notes: []
    },

    // Map compact audit report
    compactAuditReport: {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      summary: String(megaResult.report.executiveSummary || ''),
      metrics: {
        linesOfCode: originalLines,
        cyclomaticComplexity: 0,
        loadStatements: 0,
        joinStatements: 0,
        maintainabilityIndex: 0
      },
      criticalIssues: [],
      topRecommendations: (megaResult.plan.planSteps as Array<Record<string, unknown>> || []).map((s) => ({ title: String(s.title ?? ''), impact: 'high', effort: (String(s.estimatedEffort ?? 'medium') as 'low' | 'medium' | 'high'), action: String(s.details ?? '') })),
      overallRisk: ((): 'none' | 'low' | 'medium' | 'high' => {
        const r = String(megaResult.plan?.riskLevel ?? 'none');
        return ['none', 'low', 'medium', 'high'].includes(r) ? r as 'none' | 'low' | 'medium' | 'high' : 'none';
      })(),
      safeToApply: true,
      processingTimeMs: 0
    },

    roiExecutiveSummary: typeof megaResult.plan?.estimatedImprovement === 'string' ? megaResult.plan.estimatedImprovement : String(megaResult.plan?.estimatedImprovement ?? '')
  };

  // ========== RAG: INDEXA RESULTADO PARA FUTURAS OTIMIZAÇÕES ==========
  let optimizationId: string | undefined;

  if (vectorRAGService.isEnabled()) {
    try {
      const patterns = [
        ...((megaResult.analysis as Record<string, unknown> | undefined)?.optimizationOpportunities as string[] || []),
        ...(megaResult.plan.planSteps as Array<Record<string, unknown>> || []).map(s => String(s.title || ''))
      ].filter(p => p.length > 0).slice(0, 10);

      const changesSummary = String(megaResult.report.executiveSummary || '');

      const complexity: 'low' | 'medium' | 'high' = originalLines < 100 ? 'low' : originalLines < 500 ? 'medium' : 'high';

      optimizationId = await vectorRAGService.indexOptimization(
        script,
        megaResult.optimizedScript,
        {
          mode: 'ultra-expert',
          provider: llmOptions?.provider || 'google',
          model: llmOptions?.model || config.geminiModel,
          scriptLines: originalLines,
          complexity,
          breakingRisk: ((): 'none' | 'low' | 'medium' | 'high' => {
            const r = String(megaResult.plan?.riskLevel ?? 'none');
            return ['none', 'low', 'medium', 'high'].includes(r) ? r as 'none' | 'low' | 'medium' | 'high' : 'none';
          })(),
          optimizationTags: patterns,
          userId
        },
        changesSummary,
        patterns
      );

      if (optimizationId) {
        logger.info('[RAG] Optimization indexed', { optimizationId });
        result.optimizationId = optimizationId;
      }
    } catch (error) {
      logger.warn('[RAG] Failed to index optimization, continuing', { error });
      // Fail-open: não bloqueia se indexação falhar
    }
  }

  // ========== GERAÇÃO DE RELATÓRIO DE CONSULTORIA ==========
  if (_generateConsultancy) {
    try {
      logger.info("Generating consultancy document...");
      const consultancyDoc = await runConsultancyAgent(result, {
        generateTimeline: true,
        generateMarkers: true,
        generateTips: true
      });
      result.consultancyDocument = consultancyDoc;
      logger.info("Consultancy document generated successfully");
    } catch (error) {
      logger.warn("Failed to generate consultancy document", { error });
    }
  }

  result.ragContext = ragContext;
  return result;
}

/**
 * MODO NVIDIA FAST: Refatoração direta (apenas código)
 * Envia contexto completo em uma única chamada e retorna somente o script otimizado.
 * Usa providerOrchestrator com fallback automático entre modelos NVIDIA.
 */
const NVIDIA_FAST_MAX_RETRIES = 3;
async function runNvidiaFastMode(
  script: string,
  llmOptions?: LLMOptions,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, "NVIDIA Fast mode start");

  if (!nvidiaProvider.isAvailable()) {
    throw new Error("NVIDIA provider indisponível (configure NVIDIA_API_KEY)");
  }

  // Usa modelo NVIDIA centralizado (sem fallback para evitar confusão de permissões)
  const fallbackModels = [llmOptions?.model || config.nvidiaModel];
  const model = fallbackModels[0];

  const compaction = compactScriptForPrompt(script);
  logger.info("[NVIDIA FAST] Script compactado para prompt", compaction.stats);
  const scriptForPrompt = compaction.compacted;

  // Prompt direto: pede script otimizado + resumo + mudanças em JSON
  const prompt = `
Você é o QLIK CODEX I.A. Refatore o script Qlik abaixo para máxima performance e legibilidade.
- Preserve lógica e resultados.
- Remova SELECT *, use listas explícitas.
- Otimize joins, reduza cargas redundantes, elimine loops desnecessários.
- Retorne APENAS JSON no formato:
{
  "optimizedScript": "<script otimizado>",
  "summary": "<resumo conciso das melhorias>",
  "changes": [
    { "category": "performance" | "readability" | "structure", "area": "<onde mudou>", "impact": "<impacto>" }
  ]
}
sem Markdown nem explicações adicionais.

--- SCRIPT ORIGINAL ---
${scriptForPrompt}
`;

  const start = Date.now();

  sseEmitter.sendToCurrent({
    type: "step_progress",
    stepId: "nvidia_fast",
    name: "NVIDIA Fast Mode",
    status: "running",
    timestamp: new Date().toISOString()
  });

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= NVIDIA_FAST_MAX_RETRIES; attempt++) {
    try {
      // Rotate through fallback models on each attempt
      const currentModel = fallbackModels[Math.min(attempt - 1, fallbackModels.length - 1)];
      logger.info(`[NVIDIA FAST] Attempt ${attempt} using model: ${currentModel}`);

      const rawResult = await nvidiaProvider.generateStructuredJson(
        prompt,
        { model: currentModel, signal: abortSignal }
      );

      checkAborted(abortSignal, "NVIDIA Fast mode after LLM");

      let rawResponse = (rawResult.text ?? '').trim();
      // Remove markdown code blocks if present
      rawResponse = rawResponse.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

      let optimizedScript = rawResponse;
      let summary = `NVIDIA Fast Mode (${model}) concluído`;
      let changes: Array<Record<string, unknown>> = [];

      try {
        let parsed:
          | Record<string, unknown>
          | undefined
          | null = undefined;
        try {
          const mod = await import('../lib/structuredResponse.js');
          if (mod && typeof mod.extractJsonFromText === 'function') {
            parsed = mod.extractJsonFromText(rawResponse);
          }
        } catch (_) {
          try {
            parsed = JSON.parse(rawResponse);
          } catch (_e) {
            const first = rawResponse.indexOf('{');
            const last = rawResponse.lastIndexOf('}');
            if (first >= 0 && last > first) {
              try {
                parsed = JSON.parse(rawResponse.substring(first, last + 1));
              } catch (_err) {
                logger.warn('[NVIDIA FAST] structuredResponse.cjs import failed and raw JSON parse failed', { error: String(_err) });
                parsed = undefined;
              }
            }
          }
        }

        if (parsed) {
          if (typeof parsed.optimizedScript === "string") {
            optimizedScript = parsed.optimizedScript;
          }
          if (typeof parsed.summary === "string") {
            summary = parsed.summary;
          }
          if (Array.isArray(parsed.changes)) {
            changes = parsed.changes;
          }
        }
      } catch (err) {
        logger.warn("[NVIDIA FAST] Falha ao parsear JSON completo, usando resposta bruta como script", { error: String(err) });
        // Se falhar o parse, assumimos que o modelo devolveu apenas o script ou o JSON quebrou
        // Tentativa de recuperação simples se for um JSON malformado que contem "optimizedScript"
        const match = rawResponse.match(/"optimizedScript"\s*:\s*"(.*?)"/s);
        if (match && match[1]) {
          try {
            optimizedScript = JSON.parse(`"${match[1]}"`);
          } catch (e) {
            logger.warn('[NVIDIA FAST] fallback parse failed', { error: String(e) });
          }
        }
      }

      const duration = Date.now() - start;

      sseEmitter.sendToCurrent({
        type: "step_progress",
        stepId: "nvidia_fast",
        name: "NVIDIA Fast Mode",
        status: "success",
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      // Calculate diff stats
      const diffStats = calculateDiffStats(script, optimizedScript);

      const result: FullOptimizeResult = {
        originalScript: script,
        optimizedScript,
        summary,
        diffStats,
        documentationMarkdown: "",
        analysis: {
          changes: changes.map((c) => {
            const item = c as Record<string, unknown>;
            const rawCategory = String(item.category ?? 'performance');
            const category = ['performance', 'readability', 'structure', 'cleanup'].includes(rawCategory) ? (rawCategory as 'performance' | 'readability' | 'structure' | 'cleanup') : 'performance';
            return {
              category,
              area: String(item.area ?? 'Geral'),
              impact: String(item.impact ?? 'Otimização aplicada'),
              riskLevel: 'low'
            };
          }),
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

      // Gera documento de consultoria leve para permitir visualização do código
      try {
        const consultancyDoc = await runConsultancyAgent(result, {
          generateTimeline: false,
          generateMarkers: false, // Markers são caros, desativa para manter "Fast"
          generateTips: false
        });
        result.consultancyDocument = consultancyDoc;
      } catch (docErr) {
        logger.warn("[NVIDIA FAST] Failed to generate lightweight consultancy doc", { error: docErr });
      }

      return result;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const aborted = abortSignal?.aborted || /abort/i.test(errorMessage);

      if (aborted) {
        throw error instanceof Error ? error : new Error(errorMessage);
      }

      const canRetry = attempt < NVIDIA_FAST_MAX_RETRIES && isRetryableProviderError(error);

      // Notifica frontend sobre a falha da tentativa
      sseEmitter.sendToCurrent({
        type: "provider_attempt_failed",
        provider: "nvidia",
        model: model,
        error: errorMessage,
        attempt: attempt,
        maxAttempts: NVIDIA_FAST_MAX_RETRIES
      });

      if (canRetry) {
        logger.warn(`[NVIDIA FAST] Tentativa ${attempt} falhou (${errorMessage}). Nova tentativa...`);
        sseEmitter.sendToCurrent({
          type: "step_progress",
          stepId: "nvidia_fast",
          name: `NVIDIA Fast Mode (retry ${attempt + 1}/${NVIDIA_FAST_MAX_RETRIES})`,
          status: "running",
          timestamp: new Date().toISOString()
        });
        continue;
      }

      const failureDuration = Date.now() - start;
      sseEmitter.sendToCurrent({
        type: "step_progress",
        stepId: "nvidia_fast",
        name: "NVIDIA Fast Mode",
        status: "error",
        duration: `${failureDuration}ms`,
        timestamp: new Date().toISOString()
      });

      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("NVIDIA Fast Mode falhou após múltiplas tentativas");
}

/**
 * Otimiza um script Qlik usando o modo selecionado.
 * Esta função orquestra a chamada para o modo de otimização apropriado
 * com base na configuração e nos parâmetros fornecidos.
 */
export async function optimizeScript(
  originalScript: string,
  mode: OptimizeMode = "ultra-expert",
  llmOptions?: LLMOptions,
  generateConsultancy = false,
  applyTruncation = false,
  lineLimit?: number,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  let isTruncated = false;

  // 1. Análise inicial e truncamento inteligente (se necessário)
  let scriptToProcess = originalScript;
  if (applyTruncation) {
    const truncationResult: SmartTruncationResult = applySmartTruncation(
      originalScript,
      lineLimit ?? 200
    );
    scriptToProcess = truncationResult.truncatedScript;
    isTruncated = truncationResult.wasTruncated;

    if (truncationResult.wasTruncated) {
      const warningMessage = truncationResult.warningMessage
        || `⚠️ FREE TIER: Script analisado até linha ${truncationResult.actualLines}. ${truncationResult.originalLines - truncationResult.actualLines} linhas não foram incluídas.`;
      logger.warn(warningMessage);
      sseEmitter.sendToCurrent({
        type: "warning",
        message: warningMessage
      });
    }
  } else if (config.maxInputChars > 0 && originalScript.length > config.maxInputChars) {
    const truncationResult: SmartTruncationResult = applySmartTruncation(
      originalScript,
      config.maxInputChars
    );
    scriptToProcess = truncationResult.truncatedScript;
    isTruncated = true;
    logger.warn(`Script truncado para ${config.maxInputChars} caracteres. Análise pode ser parcial.`);
    sseEmitter.sendToCurrent({
      type: "warning",
      message: `O script original excede o limite de ${config.maxInputChars} caracteres e foi truncado para análise. A otimização pode ser parcial.`
    });
  }

  let result: FullOptimizeResult;

  try {
    stepTimingService.start("TOTAL_OPTIMIZATION");

    switch (mode) {
      case "nvidia-fast":
        result = await runNvidiaFastMode(scriptToProcess, llmOptions, abortSignal);
        break;
      case "ultra-expert":
      default:
        result = await runUltraExpertMode(
          scriptToProcess,
          llmOptions,
          generateConsultancy,
          isTruncated,
          abortSignal
        );
        break;
    }

    // Garante que o script original completo seja retornado
    result.originalScript = originalScript;

    // Aplica validação determinística final
    result = applyDeterministicValidation(result);

    // Calcula métricas de qualidade
    const qualityMetricsStart = Date.now();
    const originalParsed = parseQlikScript(result.originalScript);
    const optimizedParsed = parseQlikScript(result.optimizedScript);
    const originalMetrics = calculateQualityMetrics(originalParsed);
    const optimizedMetrics = calculateQualityMetrics(optimizedParsed);
    result.analysis.qualityMetrics = {
      before: originalMetrics,
      after: optimizedMetrics
    };
    const qualityMetricsDuration = Date.now() - qualityMetricsStart;

    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: "QUALITY_METRICS",
        name: "Cálculo de métricas de qualidade",
        status: "success",
        duration: qualityMetricsDuration,
        endTime: new Date().toISOString()
      }
    });

    // Finaliza o tempo total
    const totalDuration = stepTimingService.stop("TOTAL_OPTIMIZATION");
    logger.info(`🏁 Otimização concluída em ${totalDuration}ms`);

    return result;
  } catch (error) {
    const totalDuration = stepTimingService.stop("TOTAL_OPTIMIZATION");
    logger.error(`❌ Erro fatal durante a otimização após ${totalDuration}ms`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // If error is fatal (parse errors, schema validation, aborts/timeouts), rethrow so HTTP layer can return 5xx
    const errMsg = error instanceof Error ? error.message : String(error);
    if (/JSON\s+Parse\s+Error|Schema\s+Validation\s+Error|Schema\s+validation|ABORTED|TIMEOUT|Todas\s+as|FALLBACK\s+ACIONADO/i.test(errMsg)) {
      throw error instanceof Error ? error : new Error(errMsg);
    }

    // Em caso de erro, retorna uma estrutura de falha consistente
    return {
      originalScript,
      optimizedScript: originalScript, // Retorna o original em caso de falha
      summary: `Falha na otimização: ${error instanceof Error ? error.message : String(error)}`,
      diffStats: { linesAdded: 0, linesRemoved: 0, linesModified: 0 },
      documentationMarkdown: `## Erro\nOcorreu um erro durante o processo de otimização:\n\`\`\`\n${error instanceof Error ? error.stack : String(error)}\n\`\`\``,
      analysis: {
        changes: [],
        breakingRisk: "high",
        safeToApply: false,
        mode,
        metricsEstimate: {
          loadComplexityBefore: "medium",
          loadComplexityAfter: "medium",
          maintainabilityBefore: "medium",
          maintainabilityAfter: "medium"
        },
        notes: `Ocorreu um erro que impediu a conclusão da análise: ${error instanceof Error ? error.message : String(error)}`
      }
    };
  }
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


