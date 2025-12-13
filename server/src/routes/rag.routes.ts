import { Router, Response } from "express";
import { z } from "zod";

import { logger } from "../lib/logger";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, AuthRequest, requireRole } from "../middleware/authMiddleware";
import { vectorRAGService } from "../services/vectorRAGService";
import { UserRole } from "../types/auth";

export const router = Router();

const ensureRagAvailable = (res: Response): boolean => {
  const availability = vectorRAGService.getAvailability();
  if (!availability.enabled) {
    res.status(503).json({
      success: false,
      message: availability.reason || "RAG desabilitado no servidor"
    });
    return false;
  }
  return true;
};

/**
 * POST /api/rag/feedback
 * Registra feedback do usuário (approve/reject) sobre uma otimização
 */
router.post(
  "/feedback",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!ensureRagAvailable(res)) return;

    const schema = z.object({
      optimizationId: z.string().uuid(),
      feedbackType: z.enum(['approve', 'reject']),
      comment: z.string().optional()
    });

    const payload = schema.parse(req.body);

    logger.info('[RAG] Processing user feedback', {
      optimizationId: payload.optimizationId,
      feedbackType: payload.feedbackType,
      userId: req.user?.id
    });

    await vectorRAGService.processFeedback(
      payload.optimizationId,
      payload.feedbackType,
      req.user?.id,
      payload.comment
    );

    res.json({
      success: true,
      message: `Feedback '${payload.feedbackType}' registrado com sucesso`
    });
  })
);

/**
 * GET /api/rag/stats
 * Retorna estatísticas do sistema RAG
 */
router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!ensureRagAvailable(res)) return;

    logger.info('[RAG] Fetching stats', { userId: req.user?.id });

    const stats = await vectorRAGService.getStats();

    res.json({
      success: true,
      stats
    });
  })
);

/**
 * POST /api/rag/cleanup
 * Limpa documentos rejeitados antigos (admin only)
 */
router.post(
  "/cleanup",
  requireAuth,
  requireRole(UserRole.OWNER),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!ensureRagAvailable(res)) return;

    const schema = z.object({
      olderThanDays: z.number().int().min(1).max(365).default(30)
    });

    const payload = schema.parse(req.body);

    logger.info('[RAG] Cleaning up rejected optimizations', {
      olderThanDays: payload.olderThanDays,
      userId: req.user?.id
    });

    const deleted = await vectorRAGService.cleanupRejected(payload.olderThanDays);

    res.json({
      success: true,
      message: `${deleted} documento(s) rejeitado(s) removido(s)`,
      deleted
    });
  })
);

export default router;
