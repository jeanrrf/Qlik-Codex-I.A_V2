/**
 * Qlik Codex I.A - History Routes
 * API endpoints para histórico de otimizações
 */

import { Router } from "express";

import { asyncHandler } from "../middleware/asyncHandler";
import { historyService } from "../services/historyService";

const router = Router();

/**
 * GET /api/history/recent
 * Retorna histórico recente de otimizações
 */
router.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await historyService.getRecentOptimizations(limit);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  })
);

/**
 * GET /api/history/stats
 * Retorna estatísticas gerais
 */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = await historyService.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * DELETE /api/history/cleanup
 * Remove registros antigos (admin)
 */
router.delete(
  "/cleanup",
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 90;
    const deleted = await historyService.cleanOldRecords(days);

    res.json({
      success: true,
      message: `Removed ${deleted} old records`,
      deleted
    });
  })
);

export { router as historyRouter };
