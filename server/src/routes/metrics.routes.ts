import { Router } from "express";

import { config } from "../lib/config";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthRequest, optionalAuth } from "../middleware/authMiddleware";
import { recordVisit } from "../services/analyticsService";
import { vectorRAGService } from "../services/vectorRAGService";
import { UserRole } from "../types/auth";

const router = Router();

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const asMetadata = (
  value: unknown
): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;

router.post(
  "/visit",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as Record<string, unknown>;
    await recordVisit({
      sessionId: asString(body.sessionId),
      userId: asString(body.userId) ?? req.user?.id,
      metadata: asMetadata(body.metadata),
      isOwner: req.user?.role === UserRole.OWNER
    });
    res.status(201).json({ success: true });
  })
);

/**
 * GET /api/metrics/stats
 * Retorna estatísticas do sistema incluindo RAG
 */
router.get(
  "/stats",
  optionalAuth,
  asyncHandler(async (_req: AuthRequest, res) => {
    const stats: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      rag: {
        enabled: config.rag.enabled,
      }
    };

    // Adicionar stats do RAG se habilitado
    if (config.rag.enabled) {
      try {
        const ragStats = await vectorRAGService.getStats();
        stats.rag = {
          enabled: true,
          ...ragStats
        };
      } catch (_err) {
        stats.rag = {
          enabled: true,
          error: 'Failed to fetch RAG stats'
        };
      }
    }

    res.json(stats);
  })
);

export { router as metricsRouter };
export default router;
