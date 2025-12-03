import { Router } from "express";

import type { OptimizeScriptApiResponse } from "../types/api";
import type { SubStepExecution } from "../types/optimization";
import { asyncHandler } from "../middleware/asyncHandler";
import { apiLimiter } from "../middleware/rateLimiter";
import { requireAuth, checkUsageLimits, AuthRequest } from "../middleware/authMiddleware";
import { optimizeScriptSchema, generateDocSchema } from "../validators/requestSchemas";
import { scriptService } from "../services/scriptService";
import { stepTimingService } from "../services/stepTimingService";
import { recordUsage } from "../services/usageQuotaService";
import { sseEmitter } from "../lib/sseEmitter";
import { logger } from "../lib/logger";

export const router = Router();

// Rota SSE para progress streaming (requer autenticação via query param)
router.get("/optimize/stream", requireAuth, (req, res) => {
  logger.info("[SSE] New client connecting for progress stream");
  sseEmitter.addClient(res);
});

router.post(
  "/optimize",
  requireAuth,
  checkUsageLimits,
  apiLimiter, // Rate limiting aplicado
  asyncHandler(async (req: AuthRequest, res) => {
    // ✨ FREE TIER FIX: Preserva campos adicionados pelo middleware antes do parse
    const applySmartTruncation = req.body.applySmartTruncation;
    const lineLimit = req.body.lineLimit;

    const payload = optimizeScriptSchema.parse(req.body);

    // ✨ FREE TIER FIX: Restaura campos de truncamento após parse
    if (applySmartTruncation !== undefined) {
      payload.applySmartTruncation = applySmartTruncation;
    }
    if (lineLimit !== undefined) {
      payload.lineLimit = lineLimit;
    }

    logger.debug("[FREE TIER] Payload final", {
      applySmartTruncation: payload.applySmartTruncation,
      lineLimit: payload.lineLimit,
      scriptLines: payload.script.split(/\r?\n/).length
    });

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility
    res.flushHeaders();

    // Registra este response como cliente atual para receber updates
    sseEmitter.setCurrentClient(res);

    // Limpa steps anteriores
    stepTimingService.reset();

    // Cria AbortController para cancelamento
    const abortController = new AbortController();

    // Monitora desconexão do cliente
    req.on('close', () => {
      logger.warn('[SSE] Client disconnected - aborting optimization');
      abortController.abort();
      sseEmitter.setCurrentClient(null);
    });

    try {
      const result = await scriptService.optimizeScript(payload, abortController.signal);

      // Coleta os sub-steps do modo ultra-expert
      const stepSource = "optimization";
      const completedSubSteps: SubStepExecution[] = stepTimingService.getCompletedSubSteps(stepSource);

      logger.debug("SubSteps collected", { mode: payload.mode, count: completedSubSteps.length });

      // Cast result para ter acesso a todas as propriedades
      const fullResult = result as any;

      const response: OptimizeScriptApiResponse = {
        status: "done",
        originalScript: fullResult.originalScript || "",
        optimizedScript: fullResult.optimizedScript || "",
        summary: fullResult.summary || "",
        documentationMarkdown: fullResult.documentationMarkdown || "",
        explanation: fullResult.explanation,
        consultancyDocument: fullResult.consultancyDocument,
        analysisOnly: fullResult.analysisOnly,
        review: fullResult.review,
        // Adiciona análise com sub-etapas se existirem
        analysis: fullResult.analysis ? {
          ...fullResult.analysis,
          // Adiciona step de "Otimização" com todas as sub-etapas rastreadas
          steps: [{
            stepId: "opt_main",
            stepNumber: 0,
            stepName: "Processo de Otimização",
            category: "performance",
            status: "success",
            subSteps: completedSubSteps.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              status: s.status,
              startTime: s.startTime?.toISOString(),
              endTime: s.endTime?.toISOString(),
              duration: s.duration,
              error: s.error
            })),
            metadata: {
              totalDuration: completedSubSteps.reduce((sum, s) => sum + (s.duration || 0), 0)
            }
          }]
        } : {
          changes: [],
          breakingRisk: "none" as const,
          safeToApply: true,
          mode: payload.mode,
          metricsEstimate: {
            loadComplexityBefore: "low" as const,
            loadComplexityAfter: "low" as const,
            maintainabilityBefore: "low" as const,
            maintainabilityAfter: "low" as const
          },
          steps: []
        }
      };

      // Envia resultado final via SSE
      res.write(`data: ${JSON.stringify({ type: 'complete', result: response })}\n\n`);
      res.end();

      // ✅ Registra uso após sucesso (FREE TIER quota tracking)
      if (req.user?.id) {
        try {
          recordUsage(req.user.id, payload.mode);
          logger.info("[QUOTA] Uso registrado com sucesso", {
            userId: req.user.id,
            mode: payload.mode
          });
        } catch (quotaErr) {
          // Não falha a request se o registro falhar, apenas loga
          logger.error("[QUOTA] Falha ao registrar uso", {
            error: quotaErr,
            userId: req.user.id
          });
        }
      }

      // Limpa o cliente atual
      sseEmitter.setCurrentClient(null);

    } catch (error) {
      logger.error("[SSE] Optimization error", { error: String(error) });
      res.write(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`);
      res.end();

      // Limpa o cliente atual
      sseEmitter.setCurrentClient(null);
    }
  })
);

router.post(
  "/doc",
  requireAuth,
  apiLimiter, // Rate limiting aplicado
  asyncHandler(async (req: AuthRequest, res) => {
    const payload = generateDocSchema.parse(req.body);
    const result = await scriptService.generateDocumentation(payload);
    res.json(result);
  })
);

export default router;
