import { logger } from "../lib/logger";
import { ProviderOrchestrator, createOrchestrator } from "../lib/providerOrchestrator";
import { parseQlikScript } from "../lib/qlikParser";
import { sseEmitter } from "../lib/sseEmitter";
import { OptimizationStepId, OPTIMIZATION_STEPS, StepExecutionResult } from "../types/optimization";

import { buildGranularPrompt, buildParserSummary } from "./promptPlan";

export interface GranularOptimizerOptions {
  signal?: AbortSignal;
}

export class QlikGranularOptimizer {
  private script: string;
  private orchestrator: ProviderOrchestrator;
  private abortSignal?: AbortSignal;
  private parserSummary: string;

  constructor(script: string, options?: GranularOptimizerOptions) {
    this.script = script;
    this.abortSignal = options?.signal;
    const parsed = parseQlikScript(this.script);
    this.parserSummary = buildParserSummary(parsed);

    // Configuração otimizada para passos granulares (mais rápidos)
    this.orchestrator = createOrchestrator({
      maxAttemptsPerStep: 3,
      providerOrder: ["google", "nvidia"],
      neverRetryProvider: true,
      timeoutPerStep: 60000, // 1 minuto por passo granular
      globalTimeout: 1800000 // 30 minutos total
    });
  }

  /**
   * Executa uma sequência de passos de otimização
   */
  public async executeSequence(stepIds: OptimizationStepId[]): Promise<{ finalScript: string; results: StepExecutionResult[] }> {
    const results: StepExecutionResult[] = [];
    let currentScript = this.script;

    for (const stepId of stepIds) {
      if (this.abortSignal?.aborted) {
        logger.warn(`[GranularOptimizer] Sequência abortada antes do passo ${stepId}`);
        break;
      }

      try {
        const result = await this.executeStep(stepId, currentScript);
        results.push(result);

        if (result.status === 'success' && typeof result.result === 'object' && result.result !== null && 'optimizedScript' in result.result) {
          const r = result.result as Record<string, unknown>;
          if (typeof r.optimizedScript === 'string') {
            currentScript = r.optimizedScript;
          }
        }
      } catch (error) {
        logger.error(`[GranularOptimizer] Erro fatal no passo ${stepId}`, error);
        results.push({
          stepId,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          startTime: new Date(),
          endTime: new Date()
        });

        // Dependendo da criticidade, poderíamos parar ou continuar
        const stepDef = OPTIMIZATION_STEPS.find(s => s.id === stepId);
        if (stepDef?.critical) {
          logger.error('[GranularOptimizer] Passo crítico falhou. Interrompendo sequência.');
          break;
        }
      }
    }

    return { finalScript: currentScript, results };
  }

  /**
   * Executa um único passo de otimização
   */
  public async executeStep(stepId: OptimizationStepId, currentScript: string): Promise<StepExecutionResult> {
    const startTime = new Date();
    const stepDef = OPTIMIZATION_STEPS.find(s => s.id === stepId);

    if (!stepDef) {
      throw new Error(`Passo desconhecido: ${stepId}`);
    }

    logger.info(`[GranularOptimizer] Executando passo: ${stepId}`);

    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: stepId,
        name: stepDef.name,
        description: stepDef.description,
        status: "running",
        startTime: startTime.toISOString()
      }
    });

    try {
      const prompt = buildGranularPrompt(stepDef, currentScript, this.parserSummary);

      // Executa via orquestrador
      const response = await this.orchestrator.executeWithRotation(
        stepId,
        prompt,
        stepDef.timeout || 60000,
        this.abortSignal
      );

      if (!response.result) {
        throw new Error("Nenhum resultado retornado pelo provedor LLM");
      }

      // Extrai o código do resultado (remove markdown, etc)
      // Use extractor util to parse structured JSON or fallback to codeblocks
      let optimizedScript: string;
      try {
        // eslint-disable-next-line import/no-unresolved
        const { extractJsonFromText } = await import('../lib/structuredResponse.js');
        const parsed = extractJsonFromText(response.result);
        if (parsed && typeof parsed.optimizedScript === 'string') {
          optimizedScript = String(parsed.optimizedScript);
        } else if (typeof response.result === 'string') {
          optimizedScript = this.extractCode(response.result);
        } else {
          optimizedScript = String(response.result);
        }
      } catch (_e) {
        optimizedScript = this.extractCode(response.result);
      }

      // Verifica se houve mudança
      const hasChanges = optimizedScript.trim() !== currentScript.trim();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: StepExecutionResult = {
        stepId,
        status: "success",
        startTime,
        endTime,
        duration,
        provider: response.attempts.find(a => a.success)?.provider,
        model: response.attempts.find(a => a.success)?.model,
        result: {
          optimizedScript,
          hasChanges
        }
      };

      sseEmitter.sendToCurrent({
        type: "substep",
        substep: {
          id: stepId,
          name: stepDef.name,
          status: "success",
          duration,
          endTime: endTime.toISOString()
        }
      });

      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logger.error(`[GranularOptimizer] Falha no passo ${stepId}`, error);

      sseEmitter.sendToCurrent({
        type: "substep",
        substep: {
          id: stepId,
          name: stepDef.name,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
          duration,
          endTime: endTime.toISOString()
        }
      });

      return {
        stepId,
        status: "error",
        startTime,
        endTime,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private extractCode(text: string): string {
    // Tenta extrair bloco de código markdown
    const codeBlockMatch = text.match(/```(?:qlik|sql)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    // Se não houver bloco, assume que o texto inteiro é o código (conforme instrução do prompt)
    return text.trim();
  }
}
