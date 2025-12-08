/**
 * Essential Metrics Service - Sistema minimalista de métricas
 * Rastreia apenas: acessos únicos, uso do otimizador, usuários recorrentes
 * 
 * IMPORTANTE: Usa DbAdapter para persistência confiável (Turso/Postgres/SQLite)
 */

import { DbAdapter } from '../lib/dbAdapter';
import { logger } from '../lib/logger';

export interface DailyMetrics {
  totalUniqueVisitors: number;
  totalOptimizations: number;
  returningUsers: number;
  newUsers: number;
  todayVisitors: number;
  todayOptimizations: number;
}

/**
 * Registra acesso único de usuário (apenas 1x por sessão)
 */
export async function trackVisitor(sessionId: string, userId?: string): Promise<void> {
  try {
    const db = new DbAdapter();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await db.run(`
      INSERT OR IGNORE INTO essential_metrics (
        date, session_id, user_id, event_type
      ) VALUES (?, ?, ?, 'visit')
    `, [today, sessionId, userId || null]);
  } catch (err) {
    logger.error('Error tracking visitor', err);
  }
}

/**
 * Registra uso do otimizador
 */
export async function trackOptimization(sessionId: string, userId?: string, mode?: string): Promise<void> {
  try {
    const db = new DbAdapter();
    const today = new Date().toISOString().split('T')[0];

    await db.run(`
      INSERT INTO essential_metrics (
        date, session_id, user_id, event_type, metadata
      ) VALUES (?, ?, ?, 'optimization', ?)
    `, [today, sessionId, userId || null, mode || 'unknown']);
  } catch (err) {
    logger.error('Error tracking optimization', err);
  }
}

/**
 * Retorna métricas agregadas (apenas números)
 */
export async function getEssentialMetrics(): Promise<DailyMetrics> {
  try {
    const db = new DbAdapter();
    const today = new Date().toISOString().split('T')[0];

    // Total de visitantes únicos (por session_id)
    const totalVisitors = await db.get(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM essential_metrics
      WHERE event_type = 'visit'
    `, []) as { count: number };

    // Total de otimizações
    const totalOpts = await db.get(`
      SELECT COUNT(*) as count
      FROM essential_metrics
      WHERE event_type = 'optimization'
    `, []) as { count: number };

    // Usuários que voltaram (visitaram em mais de 1 dia)
    const returning = await db.get(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM (
        SELECT session_id, COUNT(DISTINCT date) as visit_days
        FROM essential_metrics
        WHERE event_type = 'visit'
        GROUP BY session_id
        HAVING visit_days > 1
      )
    `, []) as { count: number };

    // Usuários novos (visitaram apenas 1 dia)
    const newUsers = await db.get(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM (
        SELECT session_id, COUNT(DISTINCT date) as visit_days
        FROM essential_metrics
        WHERE event_type = 'visit'
        GROUP BY session_id
        HAVING visit_days = 1
      )
    `, []) as { count: number };

    // Visitantes hoje
    const todayVisitors = await db.get(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM essential_metrics
      WHERE event_type = 'visit' AND date = ?
    `, [today]) as { count: number };

    // Otimizações hoje
    const todayOpts = await db.get(`
      SELECT COUNT(*) as count
      FROM essential_metrics
      WHERE event_type = 'optimization' AND date = ?
    `, [today]) as { count: number };

    return {
      totalUniqueVisitors: totalVisitors?.count || 0,
      totalOptimizations: totalOpts?.count || 0,
      returningUsers: returning?.count || 0,
      newUsers: newUsers?.count || 0,
      todayVisitors: todayVisitors?.count || 0,
      todayOptimizations: todayOpts?.count || 0
    };
  } catch (err) {
    logger.error('Error getting essential metrics', err);
    return {
      totalUniqueVisitors: 0,
      totalOptimizations: 0,
      returningUsers: 0,
      newUsers: 0,
      todayVisitors: 0,
      todayOptimizations: 0
    };
  }
}

/**
 * Limpa métricas antigas (GDPR compliance)
 */
export async function cleanOldMetrics(daysToKeep = 90): Promise<void> {
  try {
    const db = new DbAdapter();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    await db.run('DELETE FROM essential_metrics WHERE date < ?', [cutoff]);
    logger.info(`Cleaned old metric records (older than ${daysToKeep} days)`);
  } catch (err) {
    logger.error('Error cleaning old metrics', err);
  }
}
