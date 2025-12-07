/**
 * Orquestrador de Rotação de Provedores LLM
 *
 * Regras atuais:
 * 1) Gemini 2.5 Flash
 * 2) Gemini 2.0 Flash (fallback)
 * 3) NVIDIA (modelo grande ~500B) se disponível
 */

import { logger } from "./logger";
import { googleProvider } from "./llmProviders/googleProvider";
import { nvidiaProvider } from "./llmProviders/nvidiaProvider";
import { config } from "./config";
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

  constructor(configOverride?: Partial<ProviderRotationConfig>) {
    this.rotationConfig = {
      ...DEFAULT_ROTATION_CONFIG,
      ...configOverride
    };

    this.providers = new Map([
      ["google", googleProvider],
      ["nvidia", nvidiaProvider]
    ]);
  }

  /**
   * Executa uma chamada LLM seguindo o plano de fallback definido.
   */
  async executeWithRotation(
    stepId: OptimizationStepId,
    prompt: string,
    timeout: number,
    abortSignal?: AbortSignal
  ): Promise<{
    result?: string;
    attempts: ProviderAttempt[];
    fallbackTriggered: boolean;
    fallbackReason?: string;
  }> {
    const ensureNotAborted = () => {
      if (abortSignal?.aborted) {
        logger.warn("Rotação de provedores abortada pelo sinal externo", { stepId });
        throw new Error("ABORTED");
      }
    };

    const stepAttempts: ProviderAttempt[] = [];
    const usedProviders = new Set<string>();
    let attemptCount = 0;

    // Ajusta timeout pelo tamanho do prompt (heurística).
    const estimatedTokens = Math.ceil(prompt.length / 4);
    let adjustedTimeout = timeout;

    if (estimatedTokens > 50000) {
      adjustedTimeout = Math.min(timeout * 2, 300000); // Max 5 min
      logger.info(`Timeout ajustado: ${timeout}ms -> ${adjustedTimeout}ms (prompt grande: ${estimatedTokens.toLocaleString()} tokens)`);
    } else if (estimatedTokens > 25000) {
      adjustedTimeout = Math.min(timeout * 1.5, 240000); // Max 4 min
      logger.info(`Timeout ajustado: ${timeout}ms -> ${adjustedTimeout}ms (prompt medio-grande: ${estimatedTokens.toLocaleString()} tokens)`);
    } else if (estimatedTokens < 10000) {
      adjustedTimeout = Math.max(timeout * 0.8, 120000); // Min 120s (2 min) para evitar timeouts em scripts complexos
      logger.info(`Timeout otimizado: ${timeout}ms -> ${adjustedTimeout}ms (prompt compacto: ${estimatedTokens.toLocaleString()} tokens)`);
    }

    logger.info("Iniciando rotação de provedores", {
      stepId,
      maxAttempts: this.rotationConfig.maxAttemptsPerStep,
      timeout: adjustedTimeout,
      estimatedTokens
    });

    // Plano fixo de fallback por modelo.
    const attemptPlan: Array<{ provider: "google" | "nvidia"; model?: string; label: string }> = [
      { provider: "google", model: config.geminiModel, label: "Gemini 2.5 Flash" },
      { provider: "google", model: config.geminiFallbackModel, label: "Gemini 2.0 Flash (fallback)" },
      { provider: "nvidia", model: config.nvidiaFallbackModel, label: "NVIDIA 500B fallback" }
    ];

    for (const plan of attemptPlan) {
      ensureNotAborted();

      // Se configurado para não repetir o mesmo provider, pule se já usamos esse provider
      if (this.rotationConfig.neverRetryProvider && usedProviders.has(plan.provider)) {
        logger.info("Pular provedor repetido devido a neverRetryProvider=true", { stepId, provider: plan.provider, model: plan.model });
        continue;
      }

      if (attemptCount >= this.rotationConfig.maxAttemptsPerStep) {
        logger.warn("Limite de tentativas atingido", {
          stepId,
          attemptCount,
          maxAttempts: this.rotationConfig.maxAttemptsPerStep
        });
        break;
      }

      const provider = this.providers.get(plan.provider);

      if (!provider || !provider.isAvailable()) {
        logger.warn("Provedor indisponivel - pulando", {
          stepId,
          provider: plan.provider,
          model: plan.model,
          label: plan.label
        });
        continue;
      }

      attemptCount++;
      usedProviders.add(plan.provider);

      logger.info("Tentando provedor", {
        stepId,
        attempt: `${attemptCount}/${this.rotationConfig.maxAttemptsPerStep}`,
        provider: plan.provider,
        model: plan.model,
        label: plan.label,
        timeout: `${adjustedTimeout}ms (${Math.round(adjustedTimeout / 60000)} minutos)`,
        previouslyUsed: Array.from(usedProviders)
      });

      try {
        const attemptResult = await this.attemptProviderCall(
          provider,
          plan.provider,
          prompt,
          adjustedTimeout,
          plan.model,
          plan.label,
          abortSignal
        );

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
            provider: plan.provider,
            model: attemptResult.model,
            attempt: attemptCount,
            duration: attemptResult.duration
          });

          return {
            result: attemptResult.text,
            attempts: stepAttempts,
            fallbackTriggered: false
          };
        }

        const failIcon = attemptResult.timedOut ? "[timeout]" : "[falha]";
        logger.warn(`${failIcon} Provedor falhou, tentando proximo`, {
          stepId,
          provider: plan.provider,
          model: plan.model,
          attempt: `${attemptCount}/${this.rotationConfig.maxAttemptsPerStep}`,
          error: attemptResult.error,
          timedOut: attemptResult.timedOut,
          duration: `${attemptResult.duration}ms`,
          remainingPlans: attemptPlan.length - attemptCount
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage === "ABORTED") {
          throw error;
        }

        logger.error("Erro critico ao chamar provedor", {
          stepId,
          provider: plan.provider,
          model: plan.model,
          attempt: attemptCount,
          error: errorMessage
        });

        const attempt: ProviderAttempt = {
          provider: plan.provider,
          model: plan.model || "unknown",
          timestamp: new Date(),
          success: false,
          error: errorMessage,
          duration: 0
        };

        stepAttempts.push(attempt);
        this.attemptHistory.push(attempt);
      }
    }

    const tested = stepAttempts.map(a => `${a.provider}:${a.model}`).join(", ") || "nenhum";
    const fallbackReason = `Todas as ${attemptCount} tentativas falharam. Provedores testados: ${tested}`;

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
    timeout: number,
    modelOverride?: string,
    label?: string,
    abortSignal?: AbortSignal
  ): Promise<ProviderAttemptResult> {
    const startTime = Date.now();
    let warningTimer: NodeJS.Timeout | undefined;
    let criticalTimer: NodeJS.Timeout | undefined;
    let timeoutTimer: NodeJS.Timeout | undefined;
    const abortCleanupFns: Array<() => void> = [];

    try {
      // Verifica disponibilidade
      if (!provider.isAvailable()) {
        return {
          success: false,
          provider: providerName,
          model: modelOverride || "unavailable",
          error: `${providerName} provider nao disponivel (API key ausente?)`,
          duration: 0,
          timedOut: false
        };
      }

      // Create a per-attempt AbortController so we can cancel the underlying provider
      // call when this attempt times out or when the external abort signal fires.
      const perAttemptController = new AbortController();

      if (abortSignal) {
        // Propagate external aborts to per-attempt controller so the provider call stops.
        if (abortSignal.aborted) {
          perAttemptController.abort();
        } else {
          const outerHandler = () => perAttemptController.abort();
          abortSignal.addEventListener("abort", outerHandler, { once: true });
          // Keep a record of cleanup actions
          abortCleanupFns.push(() => abortSignal.removeEventListener("abort", outerHandler));
        }
      }

      // Single timer that aborts the per-attempt controller and rejects the timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          // Abort the ongoing provider call when we hit our per-attempt timeout so the
          // provider doesn't keep working in the background and consume resources.
          try { perAttemptController.abort(); } catch (_) { /* ignore */ }
          reject(new Error("TIMEOUT"));
        }, timeout);
      });

      const abortPromise = abortSignal
        ? new Promise<never>((_, reject) => {
          if (abortSignal.aborted) {
            reject(new Error("ABORTED"));
            return;
          }
          const handler = () => {
            abortSignal.removeEventListener("abort", handler);
            reject(new Error("ABORTED"));
          };
          abortCleanupFns.push(() => abortSignal.removeEventListener("abort", handler));
          abortSignal.addEventListener("abort", handler, { once: true });
        })
        : null;

      // Avisos de longa duração
      warningTimer = setTimeout(() => {
        logger.warn("Tarefa ainda em execucao...", {
          provider: providerName,
          model: modelOverride,
          label,
          elapsed: "60 segundos",
          timeout: `${Math.round(timeout / 60000)} minutos maximo`
        });
      }, 60000);

      criticalTimer = setTimeout(() => {
        logger.warn("Tarefa proxima do timeout!", {
          provider: providerName,
          model: modelOverride,
          label,
          elapsed: "120 segundos",
          remainingTime: `${Math.round((timeout - 120000) / 1000)} segundos ate timeout`
        });
      }, 120000);

      const callPromise = provider.generateStructuredJson(prompt, {
        model: modelOverride,
        // Use the per-attempt signal so timeout / per-attempt abort will cancel the underlying call
        signal: perAttemptController.signal
      });

      const races = abortPromise ? [callPromise, timeoutPromise, abortPromise] : [callPromise, timeoutPromise];
      const result = await Promise.race(races);

      if (warningTimer) clearTimeout(warningTimer);
      if (criticalTimer) clearTimeout(criticalTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      for (const fn of abortCleanupFns) fn();

      const duration = Date.now() - startTime;

      return {
        success: true,
        text: result.text,
        provider: providerName,
        model: (result.metadata?.model as string) || modelOverride || "unknown",
        duration,
        timedOut: false
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const timedOut = errorMessage === "TIMEOUT";

      if (warningTimer) clearTimeout(warningTimer);
      if (criticalTimer) clearTimeout(criticalTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      for (const fn of abortCleanupFns) fn();

      if (errorMessage === "ABORTED") {
        throw error;
      }

      return {
        success: false,
        provider: providerName,
        model: modelOverride || "failed",
        error: timedOut ? `Timeout apos ${timeout}ms` : errorMessage,
        duration,
        timedOut
      };
    }
  }

  getAttemptHistory(): ProviderAttempt[] {
    return [...this.attemptHistory];
  }

  clearHistory(): void {
    this.attemptHistory = [];
  }

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

export function createOrchestrator(
  configOverride?: Partial<ProviderRotationConfig>
): ProviderOrchestrator {
  return new ProviderOrchestrator(configOverride);
}

export const defaultOrchestrator = new ProviderOrchestrator();
