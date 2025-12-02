import type { OptimizeScriptRequestBody } from "../types/api";
import { optimizeScript } from "./optimizerService";
import { runQlikDocAgent } from "../agents/qlikDocAgent";
import { GenerateDocPayload } from "../validators/requestSchemas";
import { cacheService } from "./cacheService";
import { logger } from "../lib/logger";

class ScriptService {
  async optimizeScript(payload: OptimizeScriptRequestBody) {
    logger.info("Starting optimization", { mode: payload.mode });

    // ✨ FREE TIER DEBUG: Log truncamento
    logger.debug("[FREE TIER] ScriptService recebeu", {
      applySmartTruncation: payload.applySmartTruncation,
      lineLimit: payload.lineLimit,
      scriptLines: payload.script.split(/\r?\n/).length
    });

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

      // Salva no cache
      cacheService.set(payload.script, payload.mode, result, provider);

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
