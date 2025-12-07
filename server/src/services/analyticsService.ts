/**
 * Analytics Service Enterprise
 * Sistema avançado de monitoramento de acessos, eventos e comportamento
 */

import { getDbType, closeDb } from '../lib/dbAdapter';
import { logger } from '../lib/logger';
import { getSqliteDb } from '../lib/sqliteDb';
import { getTursoDb, TursoSqliteWrapper } from '../lib/tursoDb';

/**
 * Obtém instância do banco (SQLite local ou Turso)
 */
function getDb() {
  // Se Turso está configurado, usar Turso
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    const tursoClient = getTursoDb();
    return new TursoSqliteWrapper(tursoClient);
  }

  // Caso contrário, usar SQLite local
  return getSqliteDb();
}

export interface PageViewEvent {
  userId?: string;
  sessionId?: string;
  page: string;
  referrer?: string;
  ip?: string;
  userAgent?: string;
  isOwner: boolean;
  metadata?: Record<string, unknown>;
}

export interface CustomEvent {
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventCategory: string;
  eventLabel?: string;
  eventValue?: number;
  isOwner: boolean;
  metadata?: Record<string, unknown>;
}

export interface SessionStart {
  userId?: string;
  sessionId: string;
  ip?: string;
  userAgent?: string;
  isOwner: boolean;
  landingPage?: string;
}

export interface AnalyticsSummary {
  totalVisits: number;
  totalEvents: number;
  totalSessions: number;
  totalOptimizations: number;
  uniqueUsers: number;
  ownerVisits: number;
  ownerEvents: number;
  topPages: Array<{ page: string; count: number }>;
  topEvents: Array<{ eventType: string; count: number }>;
  recentActivity: Array<{
    type: 'pageview' | 'event' | 'session';
    timestamp: string;
    details: string;
    isOwner: boolean;
  }>;
}

export interface DetailedAnalytics {
  pageViews: Array<{
    id: number;
    userId?: string;
    sessionId?: string;
    page: string;
    referrer?: string;
    isOwner: boolean;
    timestamp: string;
  }>;
  events: Array<{
    id: number;
    userId?: string;
    sessionId?: string;
    eventType: string;
    eventCategory: string;
    eventLabel?: string;
    isOwner: boolean;
    timestamp: string;
  }>;
  sessions: Array<{
    id: number;
    sessionId: string;
    userId?: string;
    isOwner: boolean;
    startTime: string;
    lastActivity: string;
    pageCount: number;
    eventCount: number;
  }>;
}

/**
 * Registra visualização de página
 */
export async function trackPageView(event: PageViewEvent): Promise<void> {
  try {
    const db = getDb();

    await db.prepare(`
      INSERT INTO analytics_page_views (
        user_id, session_id, page, referrer, ip, user_agent, is_owner, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.userId || null,
      event.sessionId || null,
      event.page,
      event.referrer || null,
      event.ip || null,
      event.userAgent || null,
      event.isOwner ? 1 : 0,
      event.metadata ? JSON.stringify(event.metadata) : null
    );

    // Atualizar sessão se existir
    if (event.sessionId) {
      await updateSessionActivity(event.sessionId);
    }

    logger.debug('Page view tracked', {
      page: event.page,
      isOwner: event.isOwner,
      sessionId: event.sessionId
    });
  } catch (err) {
    logger.error('Erro ao registrar page view', err);
  }
}

/**
 * Registra evento customizado
 */
export async function trackEvent(event: CustomEvent): Promise<void> {
  try {
    const db = getDb();

    await db.prepare(`
      INSERT INTO analytics_events (
        user_id, session_id, event_type, event_category, event_label, 
        event_value, is_owner, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.userId || null,
      event.sessionId || null,
      event.eventType,
      event.eventCategory,
      event.eventLabel || null,
      event.eventValue || null,
      event.isOwner ? 1 : 0,
      event.metadata ? JSON.stringify(event.metadata) : null
    );

    // Atualizar sessão
    if (event.sessionId) {
      await updateSessionActivity(event.sessionId);
    }

    logger.debug('Event tracked', {
      type: event.eventType,
      category: event.eventCategory,
      isOwner: event.isOwner
    });
  } catch (err) {
    logger.error('Erro ao registrar evento', err);
  }
}

/**
 * Inicia nova sessão
 */
export async function startSession(session: SessionStart): Promise<void> {
  try {
    const db = getDb();

    // Verificar se já existe
    const existing = await db.prepare(
      'SELECT id FROM analytics_sessions WHERE session_id = ?'
    ).get(session.sessionId);

    if (!existing) {
      await db.prepare(`
        INSERT INTO analytics_sessions (
          session_id, user_id, ip, user_agent, is_owner, landing_page
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        session.sessionId,
        session.userId || null,
        session.ip || null,
        session.userAgent || null,
        session.isOwner ? 1 : 0,
        session.landingPage || null
      );

      logger.debug('Session started', {
        sessionId: session.sessionId,
        isOwner: session.isOwner
      });
    }
  } catch (err) {
    logger.error('Erro ao iniciar sessão', err);
  }
}

/**
 * Atualiza última atividade da sessão
 */
async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const db = getDb();

    await db.prepare(`
      UPDATE analytics_sessions 
      SET last_activity = CURRENT_TIMESTAMP,
          page_count = (
            SELECT COUNT(*) FROM analytics_page_views 
            WHERE session_id = ?
          ),
          event_count = (
            SELECT COUNT(*) FROM analytics_events 
            WHERE session_id = ?
          )
      WHERE session_id = ?
    `).run(sessionId, sessionId, sessionId);
  } catch (err) {
    logger.error('Erro ao atualizar sessão', err);
  }
}

/**
 * Retorna resumo de analytics
 */
export async function getAnalyticsSummary(limit = 10): Promise<AnalyticsSummary> {
  try {
    const db = getDb();

    // Total de visitas
    const visitsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM analytics_page_views'
    ).get() as { count: number };

    // Total de eventos
    const eventsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM analytics_events'
    ).get() as { count: number };

    // Total de sessões
    const sessionsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM analytics_sessions'
    ).get() as { count: number };

    // Total de otimizações (do sistema principal)
    let optimizationsResult = { count: 0 };
    try {
      optimizationsResult = await db.prepare(
        'SELECT COUNT(*) as count FROM optimization_history'
      ).get() as { count: number };
    } catch {
      // Tabela pode não existir ainda
    }

    // Usuários únicos
    const uniqueUsersResult = await db.prepare(
      'SELECT COUNT(DISTINCT user_id) as count FROM analytics_page_views WHERE user_id IS NOT NULL'
    ).get() as { count: number };

    // Visitas do owner
    const ownerVisitsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM analytics_page_views WHERE is_owner = 1'
    ).get() as { count: number };

    // Eventos do owner
    const ownerEventsResult = await db.prepare(
      'SELECT COUNT(*) as count FROM analytics_events WHERE is_owner = 1'
    ).get() as { count: number };

    // Top páginas
    const topPages = await db.prepare(`
      SELECT page, COUNT(*) as count 
      FROM analytics_page_views 
      GROUP BY page 
      ORDER BY count DESC 
      LIMIT ?
    `).all(limit) as Array<{ page: string; count: number }>;

    // Top eventos
    const topEvents = await db.prepare(`
      SELECT event_type, COUNT(*) as count 
      FROM analytics_events 
      GROUP BY event_type 
      ORDER BY count DESC 
      LIMIT ?
    `).all(limit) as Array<{ eventType: string; count: number }>;

    // Atividade recente (combinada)
    const recentPageViews = await db.prepare(`
      SELECT 'pageview' as type, timestamp, page as details, is_owner
      FROM analytics_page_views 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);

    const recentEvents = await db.prepare(`
      SELECT 'event' as type, timestamp, 
             (event_type || ': ' || event_category) as details, is_owner
      FROM analytics_events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);

    const recentSessions = await db.prepare(`
      SELECT 'session' as type, start_time as timestamp, 
             ('Session: ' || session_id) as details, is_owner
      FROM analytics_sessions 
      ORDER BY start_time DESC 
      LIMIT ?
    `).all(Math.floor(limit / 2));

    const recentActivity = [
      ...recentPageViews,
      ...recentEvents,
      ...recentSessions
    ]
      .sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit * 2)
      .map((item: any) => ({
        type: item.type,
        timestamp: item.timestamp,
        details: item.details,
        isOwner: Boolean(item.is_owner)
      }));

    return {
      totalVisits: visitsResult.count,
      totalEvents: eventsResult.count,
      totalSessions: sessionsResult.count,
      totalOptimizations: optimizationsResult.count,
      uniqueUsers: uniqueUsersResult.count,
      ownerVisits: ownerVisitsResult.count,
      ownerEvents: ownerEventsResult.count,
      topPages,
      topEvents,
      recentActivity
    };
  } catch (err) {
    logger.error('Erro ao obter resumo de analytics', err);
    throw err;
  }
}

/**
 * Retorna dados detalhados de analytics com filtros
 */
export async function getDetailedAnalytics(options: {
  startDate?: string;
  endDate?: string;
  isOwner?: boolean;
  userId?: string;
  limit?: number;
}): Promise<DetailedAnalytics> {
  try {
    const db = getDb();
    const { startDate, endDate, isOwner, userId, limit = 100 } = options;

    let whereClause = '1=1';
    const params: any[] = [];

    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(endDate);
    }

    if (isOwner !== undefined) {
      whereClause += ' AND is_owner = ?';
      params.push(isOwner ? 1 : 0);
    }

    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    // Page Views
    const pageViews = await db.prepare(`
      SELECT id, user_id, session_id, page, referrer, is_owner, timestamp
      FROM analytics_page_views
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(...params, limit) as any[];

    // Events
    const events = await db.prepare(`
      SELECT id, user_id, session_id, event_type, event_category, 
             event_label, is_owner, timestamp
      FROM analytics_events
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(...params, limit) as any[];

    // Sessions
    let sessionWhereClause = '1=1';
    const sessionParams: any[] = [];

    if (startDate) {
      sessionWhereClause += ' AND start_time >= ?';
      sessionParams.push(startDate);
    }

    if (isOwner !== undefined) {
      sessionWhereClause += ' AND is_owner = ?';
      sessionParams.push(isOwner ? 1 : 0);
    }

    if (userId) {
      sessionWhereClause += ' AND user_id = ?';
      sessionParams.push(userId);
    }

    const sessions = await db.prepare(`
      SELECT id, session_id, user_id, is_owner, start_time, 
             last_activity, page_count, event_count
      FROM analytics_sessions
      WHERE ${sessionWhereClause}
      ORDER BY start_time DESC
      LIMIT ?
    `).all(...sessionParams, limit) as any[];

    return {
      pageViews: pageViews.map((pv: any) => ({
        id: pv.id,
        userId: pv.user_id,
        sessionId: pv.session_id,
        page: pv.page,
        referrer: pv.referrer,
        isOwner: Boolean(pv.is_owner),
        timestamp: pv.timestamp
      })),
      events: events.map((ev: any) => ({
        id: ev.id,
        userId: ev.user_id,
        sessionId: ev.session_id,
        eventType: ev.event_type,
        eventCategory: ev.event_category,
        eventLabel: ev.event_label,
        isOwner: Boolean(ev.is_owner),
        timestamp: ev.timestamp
      })),
      sessions: sessions.map((s: any) => ({
        id: s.id,
        sessionId: s.session_id,
        userId: s.user_id,
        isOwner: Boolean(s.is_owner),
        startTime: s.start_time,
        lastActivity: s.last_activity,
        pageCount: s.page_count || 0,
        eventCount: s.event_count || 0
      }))
    };
  } catch (err) {
    logger.error('Erro ao obter analytics detalhado', err);
    throw err;
  }
}

/**
 * Limpa dados antigos de analytics (GDPR compliance)
 */
export function cleanOldAnalytics(daysToKeep = 90): void {
  try {
    const db = getSqliteDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString();

    db.prepare('DELETE FROM analytics_page_views WHERE timestamp < ?').run(cutoff);
    db.prepare('DELETE FROM analytics_events WHERE timestamp < ?').run(cutoff);
    db.prepare('DELETE FROM analytics_sessions WHERE start_time < ?').run(cutoff);

    logger.info(`Analytics data older than ${daysToKeep} days cleaned`);
  } catch (err) {
    logger.error('Erro ao limpar analytics antigos', err);
  }
}

export async function closeAnalyticsDb(): Promise<void> {
  try {
    const dbType = getDbType();
    logger.info(`[Analytics] Closing ${dbType} database connection...`);
    await closeDb();
    logger.info(`[Analytics] ${dbType} database connection closed.`);
  } finally {
    // This block will run regardless of whether the try block succeeded
  }
}
