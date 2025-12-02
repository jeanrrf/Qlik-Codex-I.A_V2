/**
 * Usage Routes
 * Endpoints para consultar quota e estatísticas de uso (FREE TIER)
 */

import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, AuthRequest } from "../middleware/authMiddleware";
import { checkDailyQuota, getUserUsageStats } from "../services/usageQuotaService";
import { logger } from "../lib/logger";

export const router = Router();

/**
 * GET /api/usage/quota
 * Retorna quota diária atual do usuário
 */
router.get(
  "/quota",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Verifica quota para ambos os modos
    const analysisQuota = checkDailyQuota(req.user, "analysis");
    const ultraExpertQuota = checkDailyQuota(req.user, "ultra-expert");

    logger.debug("[USAGE API] Quota consultada", {
      userId: req.user.id,
      analysis: analysisQuota,
      ultraExpert: ultraExpertQuota
    });

    res.json({
      success: true,
      data: {
        analysis: analysisQuota,
        ultraExpert: ultraExpertQuota,
        combined: {
          // Total diário (analysis + ultra-expert contam juntos)
          used: analysisQuota.usedToday,
          limit: analysisQuota.limit,
          remaining: analysisQuota.remaining,
          resetAt: analysisQuota.resetAt
        }
      }
    });
  })
);

/**
 * GET /api/usage/stats
 * Retorna estatísticas de uso do usuário
 */
router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const stats = getUserUsageStats(req.user.id);

    logger.debug("[USAGE API] Estatísticas consultadas", {
      userId: req.user.id,
      stats
    });

    res.json({
      success: true,
      data: stats
    });
  })
);

export default router;
