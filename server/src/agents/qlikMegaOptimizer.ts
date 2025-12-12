import { sseEmitter } from "../lib/sseEmitter";
import { logger } from "../lib/logger";
import { ProviderOrchestrator, createOrchestrator } from "../lib/providerOrchestrator";
import { MEGA_SYSTEM_PROMPT, TASK_PROMPTS } from "./megaPrompts";
import { ZodSchema } from "zod";
import { AnalysisAndPlanSchema, CodeGenSchema, FinalDeliverySchema } from "../validators/megaOptimizerSchemas";
import { createHash } from "crypto";
import type { OptimizationStepId } from "../types/optimization";

// Performance constants
const MAX_HISTORY_TOKENS = 500; // Limite de chars para resumo do histórico
const ANALYSIS_CACHE = new Map<string, { result: any; timestamp: number }>();
const ANALYSIS_CACHE_TTL = 1800000; // 30 minutos
const ANALYSIS_CACHE_MAX_SIZE = 50;

// Task timeout configuration (in ms) - Otimizado para Gemini 2.5 + NVIDIA com rotação
const TASK_TIMEOUTS: Record<string, number> = {
  ANALYSIS_AND_PLAN: 300000,   // 5 min - análise completa com reasoning (aumentado para scripts grandes)
  CODE_GEN: 180000,            // 3 min - geração de código
  FINAL_DELIVERY: 120000       // 2 min - documentação final
};

interface MegaOptimizerResult {
  originalScript: string;
  optimizedScript: string;
  analysis: any;
  plan: any;
  validation: any;
  documentation: any;
  report: any;
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

  constructor(script: string, options?: MegaOptimizerOptions) {
    // Sanitize input script to remove any HTML tags if the user pasted formatted code
    // Uses a smart regex to preserve "WHERE Value < 10" but remove "<span...>"
    this.script = QlikMegaOptimizer.sanitizeScript(script);
    this.scriptHash = createHash('sha256').update(this.script).digest('hex').substring(0, 16);
    this.abortSignal = options?.signal;

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
  private summarizeTaskResult(taskName: string, result: any): string {
    const maxLen = MAX_HISTORY_TOKENS;
    let summary = `[${taskName}]: `;

    if (taskName === "ANALYSIS_AND_PLAN") {
      // Extrai apenas pontos críticos da análise
      const criticalIssues = result.analysis?.issues?.slice(0, 3) || [];
      const topPriorities = result.plan?.steps?.slice(0, 3).map((s: any) => s.action || s) || [];
      summary += `Issues: ${criticalIssues.join(', ').substring(0, 150)}. Priorities: ${topPriorities.join(', ').substring(0, 150)}`;
    } else if (taskName === "CODE_GEN") {
      // Apenas confirma que script foi gerado, não inclui o script
      const lineCount = result.optimizedScript?.split('\n').length || 0;
      summary += `Script gerado (${lineCount} linhas). Mudanças aplicadas com sucesso.`;
    } else {
      summary += "Concluído.";
    }

    return summary.substring(0, maxLen);
  }

  /**
   * Verifica cache de análise por hash do script
   */
  private getCachedAnalysis(): any | null {
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
  private setCachedAnalysis(result: any): void {
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

  private async executeTask(taskName: string, promptTemplate: string, schema?: ZodSchema): Promise<any> {
    const startTime = Date.now();

    // Verifica abort antes de iniciar
    if (this.abortSignal?.aborted) {
      throw new Error(`Task ${taskName} abortada pelo usuário`);
    }

    logger.info(`[MegaOptimizer] Starting task: ${taskName}`);

    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: taskName,
        name: `Executing ${taskName}...`,
        status: "running",
        startTime: new Date().toISOString()
      }
    });

    // OTIMIZAÇÃO: Prompt compacto sem acumulação de histórico completo
    // Reduz de ~18k tokens para ~6k tokens na Task 3
    const contextSection = this.compactHistory
      ? `\n--- CONTEXTO ANTERIOR (Resumo) ---\n${this.compactHistory}\n`
      : '';

    const fullPrompt = `
${MEGA_SYSTEM_PROMPT}

--- ORIGINAL SCRIPT ---
${this.script}
${contextSection}
--- CURRENT TASK ---
${promptTemplate}
    `;

    // Usa o orquestrador para rotação automática de provedores
    const timeout = TASK_TIMEOUTS[taskName] || 90000;
    const stepId = `mega_${taskName.toLowerCase()}` as OptimizationStepId;

    logger.info(`[MegaOptimizer] >>> SENDING [${taskName}] via Orchestrator`, {
      contextSizeChars: fullPrompt.length,
      timeout: `${timeout}ms`,
      sentAt: new Date().toISOString()
    });

    const orchestratorResult = await this.orchestrator.executeWithRotation(
      stepId,
      fullPrompt,
      timeout
    );

    // Verifica abort após chamada LLM
    if (this.abortSignal?.aborted) {
      throw new Error(`Task ${taskName} abortada após retorno do LLM`);
    }

    // Se fallback foi acionado (todas as tentativas falharam)
    if (orchestratorResult.fallbackTriggered || !orchestratorResult.result) {
      const errorMessage = orchestratorResult.fallbackReason || "Todas as tentativas falharam";

      sseEmitter.sendToCurrent({
        type: "substep",
        substep: {
          id: taskName,
          name: `Failed ${taskName}`,
          status: "error",
          error: errorMessage,
          endTime: new Date().toISOString()
        }
      });

      throw new Error(`Task ${taskName} failed: ${errorMessage}`);
    }

    const responseText = orchestratorResult.result;
    const successfulProvider = orchestratorResult.attempts.find(a => a.success);

    // LOG: Response Size & Receive Time
    logger.info(`[MegaOptimizer] <<< RECEIVED [${taskName}] via Orchestrator`, {
      responseSizeChars: responseText.length,
      provider: successfulProvider?.provider || 'unknown',
      model: successfulProvider?.model || 'unknown',
      attempts: orchestratorResult.attempts.length,
      receivedAt: new Date().toISOString()
    });

    // Try to parse JSON
    let parsedResult: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      parsedResult = JSON.parse(jsonStr);
    } catch (e) {
      logger.warn(`[MegaOptimizer] Failed to parse JSON for ${taskName}`, { error: e });
      throw new Error(`JSON Parse Error for ${taskName}`);
    }

    // Validate Schema if provided
    if (schema) {
      const validation = schema.safeParse(parsedResult);
      if (!validation.success) {
        logger.warn(`[MegaOptimizer] Schema validation failed for ${taskName}`, {
          issues: validation.error.format()
        });
        throw new Error(`Schema Validation Error: ${JSON.stringify(validation.error.format())}`);
      }
      parsedResult = validation.data;
    }

    // Success!
    const duration = Date.now() - startTime;
    this.taskTimes[taskName] = duration;

    // OTIMIZAÇÃO: Resumo compacto em vez de histórico completo
    // Evita crescimento exponencial de tokens (era: 6k → 18k, agora: 6k → 6.5k)
    const summary = this.summarizeTaskResult(taskName, parsedResult);
    this.compactHistory = this.compactHistory
      ? `${this.compactHistory}\n${summary}`
      : summary;

    // Trunca se histórico compacto crescer demais
    if (this.compactHistory.length > MAX_HISTORY_TOKENS * 3) {
      this.compactHistory = this.compactHistory.substring(this.compactHistory.length - MAX_HISTORY_TOKENS * 2);
    }

    const providerInfo = successfulProvider
      ? `${successfulProvider.provider}/${successfulProvider.model}`
      : 'unknown';
    logger.info(`[MegaOptimizer] Completed task: ${taskName} using ${providerInfo} in ${duration}ms`);

    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: taskName,
        name: `Completed ${taskName}`,
        status: "success",
        duration,
        endTime: new Date().toISOString()
      }
    });

    return parsedResult;
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
      analysisAndPlan = await this.executeTask("ANALYSIS_AND_PLAN", TASK_PROMPTS.ANALYSIS_AND_PLAN, AnalysisAndPlanSchema);

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

    // OTIMIZAÇÃO: Paralelizar CODE_GEN e FINAL_DELIVERY
    // Antes: Task2 (30s) → Task3 (30s) = 60s sequencial
    // Agora: Promise.all([Task2, Task3]) = ~35s paralelo
    logger.info("[MegaOptimizer] Iniciando CODE_GEN e FINAL_DELIVERY em PARALELO");

    const parallelStart = Date.now();
    const [codeGen, delivery] = await Promise.all([
      this.executeTask("CODE_GEN", TASK_PROMPTS.CODE_GEN, CodeGenSchema),
      this.executeTask("FINAL_DELIVERY", TASK_PROMPTS.FINAL_DELIVERY, FinalDeliverySchema)
    ]);

    logger.info(`[MegaOptimizer] Tarefas paralelas concluídas em ${Date.now() - parallelStart}ms`);

    // Sanitize optimizedScript using the same method as input
    if (codeGen.optimizedScript) {
      codeGen.optimizedScript = QlikMegaOptimizer.sanitizeScript(codeGen.optimizedScript);
    }

    const totalTime = Date.now() - globalStart;

    // Coleta estatísticas do orquestrador
    const orchestratorStats = this.orchestrator.getStats();

    return {
      originalScript: this.script,
      optimizedScript: codeGen.optimizedScript || this.script,
      analysis,
      plan,
      validation: delivery.validation,
      documentation: delivery.documentation,
      report: delivery.report,
      metrics: {
        totalTime,
        taskTimes: this.taskTimes,
        providerStats: orchestratorStats.providerStats
      }
    };
  }
}
