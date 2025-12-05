import type { OptimizeScriptRequestBody } from "../types/api";
import { optimizeScript } from "./optimizerService";
import { runQlikDocAgent } from "../agents/qlikDocAgent";
import { GenerateDocPayload } from "../validators/requestSchemas";
import { cacheService } from "./cacheService";
import { logger } from "../lib/logger";

class ScriptService {
  async optimizeScript(payload: OptimizeScriptRequestBody, abortSignal?: AbortSignal) {
    logger.info("Starting optimization", { mode: payload.mode });

    // ✨ FREE TIER DEBUG: Log truncamento
    logger.debug("[FREE TIER] ScriptService recebeu", {
      applySmartTruncation: payload.applySmartTruncation,
      lineLimit: payload.lineLimit,
      scriptLines: payload.script.split(/\r?\n/).length
    });

    // Verifica se já foi abortado antes de começar
    if (abortSignal?.aborted) {
      throw new Error('Optimization aborted before start');
    }

    try {
      // The UI can send the logical agent name 'ainex' to indicate the AINEX pipeline.
      // Map 'ainex' to undefined so the llmClient will use the configured external providers.
      const provider = payload.llmProvider === "ainex" ? undefined : payload.llmProvider;

      // Tenta buscar no cache primeiro
      const cached = cacheService.get(payload.script, payload.mode, provider);

      if (cached) {
        logger.info("Cache HIT - returning cached result", { mode: payload.mode });
        return cached;
      }

      logger.info("Cache MISS - executing optimization", { mode: payload.mode });
      const startTime = Date.now();

      // ✨ FREE TIER: Passar parâmetros de truncamento se aplicável
      const result = await optimizeScript(
        payload.script,
        payload.mode,
        {
          provider,
          model: payload.llmModel
        },
        true, // generateConsultancy
        payload.applySmartTruncation, // Vem do middleware authMiddleware
        payload.lineLimit, // Vem do middleware authMiddleware
        abortSignal // Signal de cancelamento
      );
      const durationMs = Date.now() - startTime;

      const hasValidationWarnings = result.analysis?.validationWarnings && result.analysis.validationWarnings.length > 0;

      // Salva no cache apenas se passou pela validação determinística
      if (!hasValidationWarnings) {
        cacheService.set(payload.script, payload.mode, result, provider);
      } else {
        logger.warn("Cache SKIP - validação determinística encontrou alertas, não persistindo resultado em cache", {
          warnings: result.analysis.validationWarnings?.slice(0, 3)
        });
      }

      logger.info("Optimization completed", { duration: durationMs });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Optimization failed", { error: errorMessage });
      throw err;
    }
  }

  async generateDocumentation(payload: GenerateDocPayload) {
    const provider = payload.llmProvider === "ainex" ? undefined : payload.llmProvider;
    return runQlikDocAgent(payload.script, {
      provider,
      model: payload.llmModel
    });
  }
}

export const scriptService = new ScriptService();
