/**
 * Analytics Routes - Sistema Enterprise de Monitoramento
 */

import { Router } from 'express';

import { logger } from '../lib/logger';
import { getSqliteDb } from '../lib/sqliteDb';
import { asyncHandler } from '../middleware/asyncHandler';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware';
import type { AuthRequest } from '../middleware/authMiddleware';
import {
  trackPageView,
  trackEvent,
  startSession,
  getAnalyticsSummary,
  getDetailedAnalytics,
  cleanOldAnalytics
} from '../services/analyticsService';

const router = Router();

// ========== ENDPOINTS PÚBLICOS (tracking) ==========

/**
 * POST /api/analytics/pageview
 * Rastreia visualização de página
 */
router.post('/pageview', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { page, referrer, metadata } = req.body;
  const sessionId = req.body.sessionId || req.sessionId;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  await trackPageView({
    userId: req.user?.id,
    sessionId,
    page: page || 'unknown',
    referrer,
    ip,
    userAgent,
    isOwner: req.user?.role === 'owner',
    metadata
  });

  res.json({ success: true });
}));

/**
 * POST /api/analytics/event
 * Rastreia evento customizado
 */
router.post('/event', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { eventType, eventCategory, eventLabel, eventValue, metadata } = req.body;
  const sessionId = req.body.sessionId || req.sessionId;

  if (!eventType || !eventCategory) {
    res.status(400).json({ error: 'eventType and eventCategory are required' });
    return;
  }

  await trackEvent({
    userId: req.user?.id,
    sessionId,
    eventType,
    eventCategory,
    eventLabel,
    eventValue,
    isOwner: req.user?.role === 'owner',
    metadata
  });

  res.json({ success: true });
}));

/**
 * POST /api/analytics/session/start
 * Inicia nova sessão de navegação
 */
router.post('/session/start', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId, landingPage } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  await startSession({
    userId: req.user?.id,
    sessionId,
    ip,
    userAgent,
    isOwner: req.user?.role === 'owner',
    landingPage
  });

  res.json({ success: true, sessionId });
}));

// ========== ENDPOINTS PROTEGIDOS (visualização) ==========

/**
 * GET /api/analytics/summary
 * Retorna resumo de analytics (apenas owner)
 */
router.get('/summary', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  // Apenas owner pode ver analytics
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Access denied. Owner only.' });
    return;
  }

  const limit = parseInt(req.query.limit as string) || 10;
  const summary = await getAnalyticsSummary(limit);

  res.json(summary);
}));

/**
 * GET /api/analytics/detailed
 * Retorna dados detalhados com filtros (apenas owner)
 */
router.get('/detailed', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  // Apenas owner pode ver analytics
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Access denied. Owner only.' });
    return;
  }

  const { startDate, endDate, isOwner, userId, limit } = req.query;

  const detailed = await getDetailedAnalytics({
    startDate: startDate as string,
    endDate: endDate as string,
    isOwner: isOwner === 'true' ? true : isOwner === 'false' ? false : undefined,
    userId: userId as string,
    limit: limit ? parseInt(limit as string) : undefined
  });

  res.json(detailed);
}));

/**
 * GET /api/analytics/realtime
 * Stream de eventos em tempo real via SSE (apenas owner)
 */
router.get('/realtime', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  // Apenas owner
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Access denied. Owner only.' });
    return;
  }

  // Setup SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write('data: {"status":"connected"}\n\n');

  // Pooling a cada 2 segundos para novos eventos
  const db = getSqliteDb();
  let lastEventId = 0;
  let lastPageViewId = 0;

  const interval = setInterval(() => {
    try {
      // Buscar novos eventos
      const newEvents = db.prepare(`
        SELECT id, event_type, event_category, event_label, is_owner, timestamp
        FROM analytics_events
        WHERE id > ?
        ORDER BY id ASC
        LIMIT 10
      `).all(lastEventId);

      if (newEvents.length > 0) {
        for (const rawEvent of newEvents as unknown[]) {
          const event = rawEvent as Record<string, unknown>;
          const id = Number(event.id ?? 0);
          res.write(`data: ${JSON.stringify({ type: 'event', data: event })}\n\n`);
          if (id > lastEventId) lastEventId = id;
        }
      }

      // Buscar novos page views
      const newPageViews = db.prepare(`
        SELECT id, page, is_owner, timestamp
        FROM analytics_page_views
        WHERE id > ?
        ORDER BY id ASC
        LIMIT 10
      `).all(lastPageViewId);

      if (newPageViews.length > 0) {
        for (const rawPv of newPageViews as unknown[]) {
          const pv = rawPv as Record<string, unknown>;
          const id = Number(pv.id ?? 0);
          res.write(`data: ${JSON.stringify({ type: 'pageview', data: pv })}\n\n`);
          if (id > lastPageViewId) lastPageViewId = id;
        }
      }
    } catch (error) {
      logger.error('Erro no realtime analytics', error);
    }
  }, 2000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}));

/**
 * DELETE /api/analytics/cleanup
 * Limpa dados antigos (apenas owner)
 */
router.delete('/cleanup', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  // Apenas owner
  if (req.user?.role !== 'owner') {
    res.status(403).json({ error: 'Access denied. Owner only.' });
    return;
  }

  const daysToKeep = parseInt(req.query.days as string) || 90;
  cleanOldAnalytics(daysToKeep);

  res.json({
    success: true,
    message: `Analytics data older than ${daysToKeep} days cleaned`
  });
}));

// ========== BACKWARD COMPATIBILITY ==========

/**
 * POST /api/analytics/visit (legacy)
 * Mantido para compatibilidade
 */
router.post('/visit', asyncHandler(async (req, res) => {
  const db = getSqliteDb();
  const { page, referrer } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  // Criar tabela antiga se não existir (backward compatibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT,
      referrer TEXT,
      ip TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.prepare(`
    INSERT INTO page_visits (page, referrer, ip, user_agent)
    VALUES (?, ?, ?, ?)
  `).run(page || 'unknown', referrer || '', ip || '', userAgent || '');

  res.json({ success: true });
}));

/**
 * GET /api/analytics/stats (legacy)
 * Mantido para compatibilidade
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const db = getSqliteDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT,
      referrer TEXT,
      ip TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const visits = db.prepare('SELECT COUNT(*) as count FROM page_visits').get() as { count: number };

  let executions = { count: 0 };
  try {
    executions = db.prepare('SELECT COUNT(*) as count FROM optimization_history').get() as { count: number };
  } catch {
    // Ignore
  }

  res.json({
    visits: visits.count,
    executions: executions.count
  });
}));

export default router;
