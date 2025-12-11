import { createHash } from "crypto";

import { ZodSchema } from "zod";

import { logger } from "../lib/logger";
import { ProviderOrchestrator, createOrchestrator } from "../lib/providerOrchestrator";
import { parseQlikScript } from "../lib/qlikParser";
import { sseEmitter } from "../lib/sseEmitter";
import type { OptimizationStepId } from "../types/optimization";
import { AnalysisAndPlanSchema, CodeGenSchema, FinalDeliverySchema } from "../validators/megaOptimizerSchemas";

import { buildMegaPrompt, buildParserSummary, MegaTaskId } from "./promptPlan";
import { QlikGranularOptimizer } from "./qlikGranularOptimizer";
// Performance constants
const MAX_HISTORY_TOKENS = 500; // Limite de chars para resumo do histórico
const ANALYSIS_CACHE = new Map<string, { result: Record<string, unknown>; timestamp: number }>();
const ANALYSIS_CACHE_TTL = 1800000; // 30 minutos
const ANALYSIS_CACHE_MAX_SIZE = 50;

// Task timeout configuration (in ms) - Otimizado para Kimi K2 + Gemini 2.5
const TASK_TIMEOUTS: Record<string, number> = {
  ANALYSIS_AND_PLAN: 150000,  // 2.5 min - análise completa com reasoning
  CODE_GEN: 120000,            // 2 min - geração de código
  FINAL_DELIVERY: 90000       // 1.5 min - documentação final
};
const MAX_TASK_RETRIES = 3;
const RETRYABLE_TASK_ERROR_PATTERNS = [
  /timeout/i,
  /json/i,
  /schema/i,
  /stream/i,
  /provider/i,
  /failed/i,
  /falh/i
];

function isRetryableTaskError(message: string | undefined): boolean {
  if (!message) return false;
  if (/abort/i.test(message)) return false;
  return RETRYABLE_TASK_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

interface MegaOptimizerResult {
  originalScript: string;
  optimizedScript: string;
  analysis: Record<string, unknown>;
  changes?: Array<Record<string, unknown>>; // Added for frontend compatibility
  plan: Record<string, unknown>;
  validation: Record<string, unknown>;
  documentation: Record<string, unknown>;
  report: Record<string, unknown>;
  metrics: {
    totalTime: number;
    taskTimes: Record<string, number>;
    providerStats?: Record<string, { success: number; failed: number }>;
  };
}

interface MegaOptimizerOptions {
  signal?: AbortSignal;
}

export class QlikMegaOptimizer {
  private script: string;
  private scriptHash: string;
  private compactHistory: string = ""; // Resumo compacto em vez de histórico completo
  private taskTimes: Record<string, number> = {};
  private orchestrator: ProviderOrchestrator;
  private abortSignal?: AbortSignal;
  private parserSummary: string;

  constructor(script: string, options?: MegaOptimizerOptions) {
    // Sanitize input script to remove any HTML tags if the user pasted formatted code
    // Uses a smart regex to preserve "WHERE Value < 10" but remove "<span...>"
    this.script = QlikMegaOptimizer.sanitizeScript(script);
    this.scriptHash = createHash('sha256').update(this.script).digest('hex').substring(0, 16);
    this.abortSignal = options?.signal;
    const parsed = parseQlikScript(this.script);
    this.parserSummary = buildParserSummary(parsed);

    // Cria orquestrador com configuração otimizada para MegaOptimizer + Kimi K2
    this.orchestrator = createOrchestrator({
      maxAttemptsPerStep: 4,
      providerOrder: ["google", "nvidia"],  // Gemini primeiro, Kimi K2 como fallback
      neverRetryProvider: true,
      timeoutPerStep: 120000,  // 2 min default por step
      globalTimeout: 420000   // 7 min total (scripts grandes)
    });
  }

  /**
   * Gera resumo compacto de um resultado de task para histórico
   * OTIMIZAÇÃO: Evita acumulação exponencial de tokens
   */
  private summarizeTaskResult(taskName: string, result: unknown): string {
    const maxLen = MAX_HISTORY_TOKENS;
    let summary = `[${taskName}]: `;

    if (taskName === "ANALYSIS_AND_PLAN") {
      // Extrai apenas pontos críticos da análise
      let criticalIssues: unknown[] = [];
      let planObj = undefined as { steps?: unknown[] } | undefined;
      if (typeof result === 'object' && result !== null) {
        const r = result as Record<string, unknown>;
        if (r.analysis && typeof r.analysis === 'object') {
          const analysis = r.analysis as Record<string, unknown>;
          if (Array.isArray(analysis.issues)) {
            criticalIssues = (analysis.issues as unknown[]).slice(0, 3);
          }
        }
        planObj = r.plan as { steps?: unknown[] } | undefined;
      }
      const topPriorities = Array.isArray(planObj?.steps)
        ? (planObj.steps as unknown[]).slice(0, 3).map((s) => {
          if (typeof s === 'object' && s !== null && 'action' in (s as Record<string, unknown>)) {
            return String((s as Record<string, unknown>).action);
          }
          return String(s);
        })
        : [];
      summary += `Issues: ${criticalIssues.join(', ').substring(0, 150)}. Priorities: ${topPriorities.join(', ').substring(0, 150)}`;
    } else if (taskName === "CODE_GEN") {
      // Apenas confirma que script foi gerado, não inclui o script
      let lineCount = 0;
      if (typeof result === 'object' && result !== null && 'optimizedScript' in (result as Record<string, unknown>)) {
        const rs = (result as Record<string, unknown>).optimizedScript;
        if (typeof rs === 'string') lineCount = rs.split('\n').length;
      }
      summary += `Script gerado (${lineCount} linhas). Mudanças aplicadas com sucesso.`;
    } else {
      summary += "Concluído.";
    }

    return summary.substring(0, maxLen);
  }

  /**
   * Verifica cache de análise por hash do script
   */
  private getCachedAnalysis(): Record<string, unknown> | null {
    const cached = ANALYSIS_CACHE.get(this.scriptHash);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > ANALYSIS_CACHE_TTL) {
      ANALYSIS_CACHE.delete(this.scriptHash);
      return null;
    }

    logger.info(`[MegaOptimizer] CACHE HIT para análise`, { hash: this.scriptHash, age: `${Math.round(age / 1000)}s` });
    return cached.result;
  }

  /**
   * Armazena análise no cache
   */
  private setCachedAnalysis(result: Record<string, unknown>): void {
    // Limpa cache se muito grande
    if (ANALYSIS_CACHE.size >= ANALYSIS_CACHE_MAX_SIZE) {
      const oldestKey = Array.from(ANALYSIS_CACHE.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0];
      if (oldestKey) ANALYSIS_CACHE.delete(oldestKey);
    }

    ANALYSIS_CACHE.set(this.scriptHash, { result, timestamp: Date.now() });
    logger.info(`[MegaOptimizer] Análise cacheada`, { hash: this.scriptHash });
  }

  /**
   * Removes HTML tags and entities from script text.
   * Preserves valid Qlik operators like < > in expressions.
   */
  private static sanitizeScript(text: string): string {
    if (!text) return text;
    return text
      .replace(/<\/?\s*[a-zA-Z][^>]*>/g, '')  // Remove HTML tags like <span>, </div>
      .replace(/<span\s+[^>]*$/gm, '')        // Remove incomplete opening tags
      .replace(/^\s*<\/span>/gm, '')          // Remove orphan closing tags
      .replace(/&lt;/g, '<')                  // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/class="[^"]*"/g, '')          // Remove orphan class attributes
      .replace(/<\/?>/g, '');                 // Remove empty tags
  }

  private async executeTask(taskName: MegaTaskId, schema?: ZodSchema): Promise<Record<string, unknown>> {
    const totalStart = Date.now();

    const fullPrompt = buildMegaPrompt(taskName, this.script, this.parserSummary, this.compactHistory);

    const timeout = TASK_TIMEOUTS[taskName] || 90000;
    const stepId = `mega_${taskName.toLowerCase()}` as OptimizationStepId;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_TASK_RETRIES; attempt++) {
      if (this.abortSignal?.aborted) {
        throw new Error(`Task ${taskName} abortada pelo usuário`);
      }

      logger.info(`[MegaOptimizer] Starting task: ${taskName} (attempt ${attempt}/${MAX_TASK_RETRIES})`);

      const statusLabel = attempt > 1
        ? `Regenerando ${taskName} (tentativa ${attempt}/${MAX_TASK_RETRIES})`
        : `Executando ${taskName}...`;

      sseEmitter.sendToCurrent({
        type: "substep",
        substep: {
          id: `${taskName.toLowerCase()}_attempt_${attempt}` as OptimizationStepId,
          name: statusLabel,
          description: attempt > 1
            ? `Retry automático ${attempt}/${MAX_TASK_RETRIES}`
            : `Primeira tentativa de ${taskName}`,
          status: "running",
          startTime: new Date().toISOString()
        }
      });

      try {
        logger.info(`[MegaOptimizer] >>> SENDING [${taskName}] via Orchestrator`, {
          contextSizeChars: fullPrompt.length,
          timeout: `${timeout}ms`,
          sentAt: new Date().toISOString(),
          attempt
        });

        const orchestratorResult = await this.orchestrator.executeWithRotation(
          stepId,
          fullPrompt,
          timeout,
          this.abortSignal
        );

        if (this.abortSignal?.aborted) {
          throw new Error(`Task ${taskName} abortada após retorno do LLM`);
        }

        if (orchestratorResult.fallbackTriggered || !orchestratorResult.result) {
          const errorMessage = orchestratorResult.fallbackReason || "Todas as tentativas falharam";
          throw new Error(`Task ${taskName} failed: ${errorMessage}`);
        }

        const responseText = orchestratorResult.result;
        const successfulProvider = orchestratorResult.attempts.find(a => a.success);

        logger.info(`[MegaOptimizer] <<< RECEIVED [${taskName}] via Orchestrator`, {
          responseSizeChars: responseText.length,
          provider: successfulProvider?.provider || 'unknown',
          model: successfulProvider?.model || 'unknown',
          attempts: orchestratorResult.attempts.length,
          receivedAt: new Date().toISOString(),
          attempt
        });

        let parsedResult: Record<string, unknown> = {};
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
          const raw = JSON.parse(jsonStr);
          if (typeof raw === 'object' && raw !== null) {
            parsedResult = raw as Record<string, unknown>;
          } else {
            // Wrap non-object responses (string/script) into a predictable shape
            parsedResult = { optimizedScript: String(raw) };
          }

          // Fix: Handle cases where NVIDIA/LLM returns double-escaped newlines in scripts
          // This manifests as "1 line" code in frontend because \n is literal, not control char
          const opt = parsedResult.optimizedScript;
          if (typeof opt === 'string') {
            if (opt.includes('\\n') && !opt.includes('\n')) {
              parsedResult.optimizedScript = opt.replace(/\\n/g, '\n');
            }
          }
        } catch (e) {
          logger.warn(`[MegaOptimizer] Failed to parse JSON for ${taskName}`, { error: e, attempt });
          throw new Error(`JSON Parse Error for ${taskName}`);
        }

        if (schema) {
          const validation = schema.safeParse(parsedResult);
          if (!validation.success) {
            const formattedIssues = validation.error.format();

            logger.warn(`[MegaOptimizer] Schema validation failed for ${taskName}`, {
              issues: formattedIssues,
              attempt
            });

            sseEmitter.sendToCurrent({
              type: "substep",
              substep: {
                id: `${taskName.toLowerCase()}_schema_error_attempt_${attempt}` as OptimizationStepId,
                name: `Erro de schema em ${taskName}`,
                description: `Tentativa ${attempt}/${MAX_TASK_RETRIES} falhou na validação de schema. Ver detalhes técnicos nos logs.`,
                status: attempt < MAX_TASK_RETRIES ? "warning" : "error",
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
              }
            });

            throw new Error(`Schema Validation Error: ${JSON.stringify(formattedIssues)}`);
          }
          parsedResult = validation.data;
        }

        const duration = Date.now() - totalStart;
        this.taskTimes[taskName] = duration;

        const summary = this.summarizeTaskResult(taskName, parsedResult);
        this.compactHistory = this.compactHistory
          ? `${this.compactHistory}\n${summary}`
          : summary;

        if (this.compactHistory.length > MAX_HISTORY_TOKENS * 3) {
          this.compactHistory = this.compactHistory.substring(this.compactHistory.length - MAX_HISTORY_TOKENS * 2);
        }

        const providerInfo = successfulProvider
          ? `${successfulProvider.provider}/${successfulProvider.model}`
          : 'unknown';
        logger.info(`[MegaOptimizer] Completed task: ${taskName} using ${providerInfo} in ${duration}ms (attempt ${attempt})`);

        sseEmitter.sendToCurrent({
          type: "substep",
          substep: {
            id: `${taskName.toLowerCase()}_attempt_${attempt}` as OptimizationStepId,
            name: `${taskName} concluída (tentativa ${attempt})`,
            status: "success",
            duration,
            endTime: new Date().toISOString()
          }
        });

        return parsedResult;
      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const wasAborted = this.abortSignal?.aborted || /abort/i.test(errorMessage || "");

        if (wasAborted) {
          throw error instanceof Error ? error : new Error(errorMessage || `Task ${taskName} aborted`);
        }

        const canRetry = attempt < MAX_TASK_RETRIES && isRetryableTaskError(errorMessage);

        if (canRetry) {
          logger.warn(`[MegaOptimizer] ${taskName} attempt ${attempt} falhou (${errorMessage}). Regenerando...`);
          sseEmitter.sendToCurrent({
            type: "substep",
            substep: {
              id: `${taskName.toLowerCase()}_retry_${attempt}` as OptimizationStepId,
              name: `Retry ${taskName} (${attempt + 1}/${MAX_TASK_RETRIES})`,
              status: "running",
              error: errorMessage,
              startTime: new Date().toISOString()
            }
          });
          continue;
        }

        const failureDuration = Date.now() - totalStart;
        sseEmitter.sendToCurrent({
          type: "substep",
          substep: {
            id: `${taskName.toLowerCase()}_failed` as OptimizationStepId,
            name: `Falha definitiva em ${taskName}`,
            status: "error",
            error: errorMessage,
            duration: failureDuration,
            endTime: new Date().toISOString()
          }
        });

        throw error instanceof Error ? error : new Error(errorMessage || `Task ${taskName} failed`);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Task ${taskName} failed sem detalhes`);
  }

  public async run(): Promise<MegaOptimizerResult> {
    const globalStart = Date.now();

    // Verifica abort antes de iniciar
    if (this.abortSignal?.aborted) {
      throw new Error("Otimização abortada pelo usuário antes de iniciar");
    }

    // OTIMIZAÇÃO: Verificar cache de análise antes de chamar LLM
    let analysisAndPlan = this.getCachedAnalysis();

    if (analysisAndPlan) {
      logger.info("[MegaOptimizer] Usando análise do CACHE - economizando ~30s de LLM");

      // Emitir SSE para UI saber que veio do cache
      sseEmitter.sendToCurrent({
        type: "substep",
        substep: {
          id: "ANALYSIS_AND_PLAN",
          name: "Análise recuperada do cache",
          status: "success",
          duration: 0,
          endTime: new Date().toISOString()
        }
      });
    } else {
      // 1 & 2. Analysis & Plan (Fused for Speed)
      logger.info("[MegaOptimizer] Running Fused Task: ANALYSIS_AND_PLAN");
      analysisAndPlan = await this.executeTask("ANALYSIS_AND_PLAN", AnalysisAndPlanSchema);

      // Cachear resultado para próximas execuções com mesmo script
      this.setCachedAnalysis(analysisAndPlan);
    }

    // Verifica abort após análise
    if (this.abortSignal?.aborted) {
      throw new Error("Otimização abortada após fase de análise");
    }

    const { analysis, plan } = analysisAndPlan;

    // VIRTUAL LOGGING: Simulate individual task completion for UX/Logs consistency
    // This satisfies the user requirement "quero log igual o anterior" while keeping the fusion speed.
    const fusionDuration = this.taskTimes["ANALYSIS_AND_PLAN"] || 0;
    const splitDuration = Math.round(fusionDuration / 2);

    logger.info(`[MegaOptimizer] Completed task: DEEP_ANALYSIS using Fused Strategy in ${splitDuration}ms`);
    logger.info(`[MegaOptimizer] Completed task: STRATEGIC_PLAN using Fused Strategy in ${splitDuration}ms`);

    // Emit SSE for UI consistency
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: { id: "DEEP_ANALYSIS", name: "Completed DEEP_ANALYSIS (Fused)", status: "success", duration: splitDuration, endTime: new Date().toISOString() }
    });
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: { id: "STRATEGIC_PLAN", name: "Completed STRATEGIC_PLAN (Fused)", status: "success", duration: splitDuration, endTime: new Date().toISOString() }
    });

    // CORREÇÃO: Execução sequencial para evitar encavalamento de provedores
    // O paralelismo causava falhas de quota e concorrência no SSE
    logger.info("[MegaOptimizer] Iniciando CODE_GEN e FINAL_DELIVERY em SEQUÊNCIA");

    // Emitir evento de início de CodeGen para UX
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: "CODE_GEN_START",
        name: "Iniciando Geração de Código (Sequencial)",
        status: "running",
        startTime: new Date().toISOString()
      }
    });

    const codeGen = await this.executeTask("CODE_GEN", CodeGenSchema);

    // Emitir evento de transição para Final Delivery
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: "FINAL_DELIVERY_START",
        name: "Iniciando Validação e Documentação",
        status: "running",
        startTime: new Date().toISOString()
      }
    });

    const delivery = await this.executeTask("FINAL_DELIVERY", FinalDeliverySchema);

    logger.info(`[MegaOptimizer] Tarefas sequenciais concluídas`);

    // Sanitize optimizedScript using the same method as input
    if (typeof codeGen.optimizedScript === 'string') {
      codeGen.optimizedScript = QlikMegaOptimizer.sanitizeScript(codeGen.optimizedScript as string);
    }

    const totalTime = Date.now() - globalStart;

    // Coleta estatísticas do orquestrador
    const orchestratorStats = this.orchestrator.getStats();

    // Prepare changes list
    const changes = Array.isArray(codeGen.changesApplied) ? (codeGen.changesApplied as unknown[]) : [];

    // Inject changes into analysis for frontend compatibility (KPIs)
    const analysisObj = typeof analysis === 'object' && analysis !== null ? (analysis as Record<string, unknown>) : {};
    const analysisWithChanges = {
      ...analysisObj,
      changes: changes
    };

    // Inject provider stats into report for transparency
    const reportObj = typeof delivery.report === 'object' && delivery.report !== null ? (delivery.report as Record<string, unknown>) : {};
    const reportWithStats = {
      ...reportObj,
      providerStats: orchestratorStats.providerStats
    };

    return {
      originalScript: this.script,
      optimizedScript: typeof codeGen.optimizedScript === 'string' ? codeGen.optimizedScript : this.script,
      analysis: analysisWithChanges,
      changes: Array.isArray(changes) ? (changes.map((c) => (typeof c === 'object' && c !== null ? (c as Record<string, unknown>) : {})) as Array<Record<string, unknown>>) : [], // Add to root for list view
      plan: typeof plan === 'object' && plan !== null ? (plan as Record<string, unknown>) : {},
      validation: typeof delivery.validation === 'object' && delivery.validation !== null ? (delivery.validation as Record<string, unknown>) : {},
      documentation: typeof delivery.documentation === 'object' && delivery.documentation !== null ? (delivery.documentation as Record<string, unknown>) : {},
      report: reportWithStats,
      metrics: {
        totalTime,
        taskTimes: this.taskTimes,
        providerStats: orchestratorStats.providerStats
      }
    };
  }

  /**
   * Executa otimização granular usando a nova Base de Conhecimento
   */
  public async runGranularOptimization(stepIds: OptimizationStepId[]): Promise<{ finalScript: string; results: import("../types/optimization").StepExecutionResult[] }> {
    const granularOptimizer = new QlikGranularOptimizer(this.script, { signal: this.abortSignal });
    return await granularOptimizer.executeSequence(stepIds);
  }
}
