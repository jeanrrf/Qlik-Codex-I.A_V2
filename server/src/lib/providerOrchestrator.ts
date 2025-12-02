/**
 * Orquestrador de Rotação de Provedores LLM
 * 
 * Funcionalidades:
 * - Rotação automática entre provedores sem repetir o mesmo
 * - Timeout por tentativa
 * - Fallback após 4 falhas
 * - Logging detalhado de cada tentativa
 */

import { logger } from "./logger";
import { googleProvider } from "./llmProviders/googleProvider";
import { nvidiaProvider } from "./llmProviders/nvidiaProvider";
import type { LLMProvider } from "./llmProviders/types";
import {
  OptimizationStepId,
  ProviderAttempt,
  ProviderRotationConfig,
  DEFAULT_ROTATION_CONFIG
} from "../types/optimization";

export interface ProviderAttemptResult {
  success: boolean;
  text?: string;
  provider: "google" | "nvidia";
  model: string;
  error?: string;
  duration: number;
  timedOut: boolean;
}

export class ProviderOrchestrator {
  private rotationConfig: ProviderRotationConfig;
  private providers: Map<string, LLMProvider>;
  private attemptHistory: ProviderAttempt[] = [];

  constructor(config?: Partial<ProviderRotationConfig>) {
    this.rotationConfig = {
      ...DEFAULT_ROTATION_CONFIG,
      ...config
    };

    this.providers = new Map([
      ["google", googleProvider],
      ["nvidia", nvidiaProvider]
    ]);
  }

  /**
   * Executa uma chamada LLM com rotação automática de provedores
   * 
   * @param stepId - ID do step para tracking
   * @param prompt - Prompt para o LLM
   * @param timeout - Timeout em ms (ajustável dinamicamente por tipo de análise)
   */
  async executeWithRotation(
    stepId: OptimizationStepId,
    prompt: string,
    timeout: number
  ): Promise<{
    result?: string;
    attempts: ProviderAttempt[];
    fallbackTriggered: boolean;
    fallbackReason?: string;
  }> {
    const stepAttempts: ProviderAttempt[] = [];
    const usedProviders = new Set<string>();
    let attemptCount = 0;

    // Ajusta timeout baseado no tamanho do prompt (heurística)
    const estimatedTokens = Math.ceil(prompt.length / 4);
    let adjustedTimeout = timeout;

    if (estimatedTokens > 50000) {
      // Prompts muito grandes (>50k tokens) → aumenta timeout
      adjustedTimeout = Math.min(timeout * 1.5, 240000); // Max 240s
      logger.info(`🕐 Timeout ajustado: ${timeout}ms → ${adjustedTimeout}ms (prompt grande: ${estimatedTokens.toLocaleString()} tokens)`);
    } else if (estimatedTokens < 10000) {
      // Prompts pequenos (<10k tokens) → reduz timeout
      adjustedTimeout = Math.max(timeout * 0.7, 60000); // Min 60s
      logger.info(`🕐 Timeout otimizado: ${timeout}ms → ${adjustedTimeout}ms (prompt compacto: ${estimatedTokens.toLocaleString()} tokens)`);
    }

    logger.info("Iniciando rotação de provedores", {
      stepId,
      maxAttempts: this.rotationConfig.maxAttemptsPerStep,
      timeout: adjustedTimeout,
      estimatedTokens
    });

    // Tenta até maxAttemptsPerStep vezes
    while (attemptCount < this.rotationConfig.maxAttemptsPerStep) {
      attemptCount++;

      // Seleciona próximo provedor disponível
      const providerName = this.selectNextProvider(usedProviders);

      if (!providerName) {
        logger.error("Nenhum provedor disponível", {
          stepId,
          attemptCount,
          usedProviders: Array.from(usedProviders)
        });
        break;
      }

      const provider = this.providers.get(providerName)!;

      // Marca provider como usado (se configurado para não repetir)
      if (this.rotationConfig.neverRetryProvider) {
        usedProviders.add(providerName);
      }

      logger.info("🔄 Tentando provedor", {
        stepId,
        attempt: `${attemptCount}/${this.rotationConfig.maxAttemptsPerStep}`,
        provider: providerName,
        timeout: `${adjustedTimeout}ms (${Math.round(adjustedTimeout / 60000)} minutos)`,
        previouslyUsed: Array.from(usedProviders)
      });

      try {
        const attemptResult = await this.attemptProviderCall(
          provider,
          providerName as "google" | "nvidia",
          prompt,
          adjustedTimeout  // Usa timeout ajustado
        );

        // Registra tentativa
        const attempt: ProviderAttempt = {
          provider: attemptResult.provider,
          model: attemptResult.model,
          timestamp: new Date(),
          success: attemptResult.success,
          error: attemptResult.error,
          duration: attemptResult.duration
        };

        stepAttempts.push(attempt);
        this.attemptHistory.push(attempt);

        if (attemptResult.success && attemptResult.text) {
          logger.info("Provedor retornou sucesso", {
            stepId,
            provider: providerName,
            attempt: attemptCount,
            duration: attemptResult.duration
          });

          return {
            result: attemptResult.text,
            attempts: stepAttempts,
            fallbackTriggered: false
          };
        }

        // Se falhou, loga e continua
        const failIcon = attemptResult.timedOut ? "⏱️" : "❌";
        logger.warn(`${failIcon} Provedor falhou, tentando próximo`, {
          stepId,
          provider: providerName,
          attempt: `${attemptCount}/${this.rotationConfig.maxAttemptsPerStep}`,
          error: attemptResult.error,
          timedOut: attemptResult.timedOut,
          duration: `${attemptResult.duration}ms`,
          remainingProviders: this.rotationConfig.providerOrder.filter(p => !usedProviders.has(p)).length
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error("Erro crítico ao chamar provedor", {
          stepId,
          provider: providerName,
          attempt: attemptCount,
          error: errorMessage
        });

        const attempt: ProviderAttempt = {
          provider: providerName as "google" | "nvidia",
          model: "unknown",
          timestamp: new Date(),
          success: false,
          error: errorMessage,
          duration: 0
        };

        stepAttempts.push(attempt);
        this.attemptHistory.push(attempt);
      }
    }

    // Fallback: todas as tentativas falharam
    const fallbackReason = `Todas as ${attemptCount} tentativas falharam. Provedores testados: ${Array.from(usedProviders).join(", ")}`;

    logger.error("FALLBACK ACIONADO", {
      stepId,
      totalAttempts: attemptCount,
      reason: fallbackReason,
      attempts: stepAttempts
    });

    return {
      attempts: stepAttempts,
      fallbackTriggered: true,
      fallbackReason
    };
  }

  /**
   * Tenta chamar um provedor com timeout
   */
  private async attemptProviderCall(
    provider: LLMProvider,
    providerName: "google" | "nvidia",
    prompt: string,
    timeout: number
  ): Promise<ProviderAttemptResult> {
    const startTime = Date.now();
    let warningTimer: NodeJS.Timeout | undefined;
    let criticalTimer: NodeJS.Timeout | undefined;

    try {
      // Verifica disponibilidade
      if (!provider.isAvailable()) {
        return {
          success: false,
          provider: providerName,
          model: "unavailable",
          error: `${providerName} provider não disponível (API key ausente?)`,
          duration: 0,
          timedOut: false
        };
      }

      // Cria promise de timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), timeout);
      });

      // Aviso intermediário se a tarefa demorar mais de 1 minuto
      warningTimer = setTimeout(() => {
        logger.warn("⏳ Tarefa ainda em execução...", {
          provider: providerName,
          elapsed: "60 segundos",
          timeout: `${Math.round(timeout / 60000)} minutos máximo`,
          message: "A tarefa está demorando mais que o esperado, mas ainda dentro do limite"
        });
      }, 60000); // 1 minuto

      // Aviso crítico se passar de 2 minutos
      criticalTimer = setTimeout(() => {
        logger.warn("⚠️ Tarefa próxima do timeout!", {
          provider: providerName,
          elapsed: "120 segundos",
          remainingTime: `${Math.round((timeout - 120000) / 1000)} segundos até timeout`,
          message: "Tarefa está demorando muito, próxima do limite de 3 minutos"
        });
      }, 120000); // 2 minutos

      // Cria promise da chamada
      const callPromise = provider.generateStructuredJson(prompt);

      // Race entre timeout e chamada
      const result = await Promise.race([callPromise, timeoutPromise]);

      // Limpa os timers de aviso
      if (warningTimer) clearTimeout(warningTimer);
      if (criticalTimer) clearTimeout(criticalTimer);

      const duration = Date.now() - startTime;

      return {
        success: true,
        text: result.text,
        provider: providerName,
        model: (result.metadata?.model as string) || "unknown",
        duration,
        timedOut: false
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const timedOut = errorMessage === "TIMEOUT";

      // Limpa os timers se houve erro
      if (warningTimer) clearTimeout(warningTimer);
      if (criticalTimer) clearTimeout(criticalTimer);

      return {
        success: false,
        provider: providerName,
        model: "failed",
        error: timedOut ? `Timeout após ${timeout}ms` : errorMessage,
        duration,
        timedOut
      };
    }
  }

  /**
   * Seleciona próximo provedor disponível
   */
  private selectNextProvider(usedProviders: Set<string>): string | null {
    for (const providerName of this.rotationConfig.providerOrder) {
      // Se não deve repetir e já foi usado, pula
      if (this.rotationConfig.neverRetryProvider && usedProviders.has(providerName)) {
        continue;
      }

      // Verifica se está disponível
      const provider = this.providers.get(providerName);
      if (provider && provider.isAvailable()) {
        return providerName;
      }
    }

    return null;
  }

  /**
   * Retorna histórico de tentativas
   */
  getAttemptHistory(): ProviderAttempt[] {
    return [...this.attemptHistory];
  }

  /**
   * Limpa histórico de tentativas
   */
  clearHistory(): void {
    this.attemptHistory = [];
  }

  /**
   * Retorna estatísticas do orquestrador
   */
  getStats(): {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    timeouts: number;
    providerStats: Record<string, { success: number; failed: number }>;
  } {
    const stats = {
      totalAttempts: this.attemptHistory.length,
      successfulAttempts: 0,
      failedAttempts: 0,
      timeouts: 0,
      providerStats: {} as Record<string, { success: number; failed: number }>
    };

    for (const attempt of this.attemptHistory) {
      if (attempt.success) {
        stats.successfulAttempts++;
      } else {
        stats.failedAttempts++;
        if (attempt.error?.includes("Timeout")) {
          stats.timeouts++;
        }
      }

      const providerName = attempt.provider;
      if (!stats.providerStats[providerName]) {
        stats.providerStats[providerName] = { success: 0, failed: 0 };
      }

      if (attempt.success) {
        stats.providerStats[providerName].success++;
      } else {
        stats.providerStats[providerName].failed++;
      }
    }

    return stats;
  }
}

/**
 * Factory para criar orquestrador com configurações padrão ou customizadas
 */
export function createOrchestrator(
  config?: Partial<ProviderRotationConfig>
): ProviderOrchestrator {
  return new ProviderOrchestrator(config);
}

/**
 * Instância singleton para uso geral
 */
export const defaultOrchestrator = new ProviderOrchestrator();
