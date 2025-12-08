/**
 * Essential Metrics Routes - Dashboard minimalista
 * Apenas números: acessos, otimizações, retorno de usuários
 */

import { Router } from 'express';

import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/authMiddleware';
import {
  getEssentialMetrics,
  cleanOldMetrics,
  trackVisitor
} from '../services/essentialMetrics';

const router = Router();

/**
 * POST /api/metrics/visit
 * Registra visita única (público, 1x por sessão)
 */
router.post('/visit', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  await trackVisitor(sessionId, req.user?.id);
  res.json({ success: true });
}));

/**
 * GET /api/metrics/summary
 * Retorna apenas números essenciais (owner only)
 */
router.get('/summary', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  // Apenas owner pode ver métricas
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Access denied. Owner only.' });
    return;
  }

  const metrics = await getEssentialMetrics();

  res.json({
    success: true,
    metrics
  });
}));

/**
 * DELETE /api/metrics/cleanup
 * Limpa métricas antigas (owner only)
 */
router.delete('/cleanup', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  // Apenas owner
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Access denied. Owner only.' });
    return;
  }

  const daysToKeep = parseInt(req.query.days as string) || 90;
  await cleanOldMetrics(daysToKeep);

  res.json({
    success: true,
    message: `Metrics data older than ${daysToKeep} days cleaned`
  });
}));

export default router;
