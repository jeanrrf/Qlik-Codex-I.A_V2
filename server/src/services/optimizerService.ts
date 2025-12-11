import { CompactAuditReport, calculateDiffStats } from "../agents/qlikConsultancyAgent";
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
import { validateQlikScript } from "../validators/qlikValidator";

import { stepTimingService } from "./stepTimingService";

export interface FullOptimizeResult extends OptimizeResult {
  explanation?: string;
  consultancyDocument?: ConsultancyDocument;
  compactAuditReport?: CompactAuditReport; // NOVO: relatório compacto
  roiExecutiveSummary?: string;  // REVENUE FEATURE: ROI summary em texto
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
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Ultra Expert mode start');
  logger.info("⚡ MODO ULTRA EXPERT - MEGA OPTIMIZER (Gemini 2.5 Flash Architecture)");

  // Instantiate the Mega Optimizer with AbortSignal support
  const optimizer = new QlikOptimizeAgent(script, { signal: abortSignal });
  const originalLines = script.split(/\r?\n/).length;

  // Run deterministic parser for metadata
  const parsed = parseQlikScript(script);

  // Run the pipeline
  const megaResult = await optimizer.run();

  // Calculate diff stats properly using the shared utility
  const diffStats = calculateDiffStats(script, megaResult.optimizedScript);

  // Map results to FullOptimizeResult
  return {
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
}

/**
 * MODO NVIDIA FAST: Refatoração direta (apenas código)
 * Envia contexto completo em uma única chamada e retorna somente o script otimizado.
 */
const NVIDIA_FAST_MAX_RETRIES = 2;
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
      const response = await nvidiaProvider.generateStructuredJson(prompt, { model, signal: abortSignal });

      checkAborted(abortSignal, "NVIDIA Fast mode after LLM");

      let rawResponse = response.text.trim();
      // Remove markdown code blocks if present
      rawResponse = rawResponse.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

      let optimizedScript = rawResponse;
      let summary = `NVIDIA Fast Mode (${model}) concluído`;
      let changes: Array<Record<string, unknown>> = [];

      try {
        // eslint-disable-next-line import/no-unresolved
        const { extractJsonFromText } = await import('../lib/structuredResponse.js');
        const { extractJsonFromText } = await import('../lib/structuredResponse');
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

      return {
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
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const aborted = abortSignal?.aborted || /abort/i.test(errorMessage);

      if (aborted) {
        throw error instanceof Error ? error : new Error(errorMessage);
      }

      const canRetry = attempt < NVIDIA_FAST_MAX_RETRIES && isRetryableProviderError(error);

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

  result = applyDeterministicValidation(result);

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




