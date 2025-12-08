/**
 * Usage Routes
 * Endpoints para consultar quota e estatísticas de uso (FREE TIER)
 */

import { Router } from "express";

import { logger } from "../lib/logger";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, AuthRequest } from "../middleware/authMiddleware";
import { checkDailyQuota, getUserUsageStats } from "../services/usageQuotaService";

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

    // Quotas por modo
    const ultraExpertQuota = await checkDailyQuota(req.user, "ultra-expert");
    const nvidiaFastQuota = await checkDailyQuota(req.user, "nvidia-fast");

    logger.debug("[USAGE API] Quota consultada", {
      userId: req.user.id,
      ultraExpert: ultraExpertQuota,
      nvidiaFast: nvidiaFastQuota
    });

    res.json({
      success: true,
      data: {
        ultraExpert: ultraExpertQuota,
        nvidiaFast: nvidiaFastQuota
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

    const stats = await getUserUsageStats(req.user.id);

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
