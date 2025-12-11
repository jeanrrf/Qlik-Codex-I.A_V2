import { config } from "./config";
import { logger } from "./logger";
import { withRetry } from "./resilience";
import type { ProviderName, ProviderResult } from "./llmProviders/types";
import { googleProvider } from "./llmProviders/googleProvider";
import { nvidiaProvider } from "./llmProviders/nvidiaProvider";

/**
 * @deprecated Use ProviderOrchestrator instead for better resilience and rotation.
 * This client is kept for backward compatibility.
 */
const providerMap = {
  google: googleProvider,
  nvidia: nvidiaProvider
};

export interface GenerateStructuredJsonOptions {
  provider?: ProviderName;
  model?: string;
  maxOutputTokens?: number;
  taskType?: string;
}

export async function generateStructuredJson(
  prompt: string,
  options?: GenerateStructuredJsonOptions
): Promise<ProviderResult> {
  const errors: Record<string, string> = {};

  const orderedProviders = options?.provider
    ? [
      options.provider,
      ...config.llmProviders.filter((name) => name !== options.provider)
    ]
    : config.llmProviders;

  for (const providerName of orderedProviders) {
    const provider = providerMap[providerName as keyof typeof providerMap];
    if (!provider) {
      logger.warn("AI provider não registrado", { providerName });
      continue;
    }

    if (!provider.isAvailable()) {
      logger.warn("AI provider indisponível", { providerName });
      continue;
    }

    // Tenta com retry automático
    try {
      const result = await withRetry(
        async () => {
          return await provider.generateStructuredJson(prompt, {
            model: options?.model,
            maxOutputTokens: options?.maxOutputTokens,
            taskType: options?.taskType
          });
        },
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          onRetry: (attempt, error) => {
            logger.warn(`Retry tentativa ${attempt} para provider ${providerName}`, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      );

      logger.info("AINEX provider selecionado", {
        provider: result.provider,
        metadata: result.metadata
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors[providerName] = message;
      logger.error(`AINEX provider ${providerName} falhou após retries`, { error: message });
      continue;
    }
  }

  throw new Error(
    `Nenhum provedor AINEX disponível. Falhas: ${JSON.stringify(errors)}`
  );
}
