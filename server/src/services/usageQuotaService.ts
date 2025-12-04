/**
 * Usage Quota Service
 * Controla limites de uso diário (FREE TIER)
 */

import { getSqliteDb } from "../lib/sqliteDb";
import { logger } from "../lib/logger";
import { UserRole, RoleUsageLimits, User } from "../types/auth";
import type { OptimizeMode } from "../types/qlik";

export interface UsageQuotaCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp do próximo reset (meia-noite)
  usedToday: number;
}

/**
 * Verifica se o usuário pode executar uma otimização
 */
export function checkDailyQuota(user: User, mode: OptimizeMode): UsageQuotaCheck {
  // Owner tem acesso ilimitado
  if (user.role === UserRole.OWNER) {
    return {
      allowed: true,
      remaining: -1, // -1 = ilimitado
      limit: -1,
      resetAt: getNextMidnight(),
      usedToday: 0
    };
  }

  const limits = RoleUsageLimits[user.role];
  const totalLimit = limits.optimizationsPerDay;

  // Se limite for -1 (ilimitado), permitir
  if (totalLimit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      resetAt: getNextMidnight(),
      usedToday: 0
    };
  }

  // Contar usos nas últimas 24 horas
  const usedToday = countDailyUsage(user.id);

  const remaining = Math.max(0, totalLimit - usedToday);
  const allowed = usedToday < totalLimit;

  logger.debug("[QUOTA] Verificação diária", {
    userId: user.id,
    mode,
    usedToday,
    limit: totalLimit,
    remaining,
    allowed
  });

  return {
    allowed,
    remaining,
    limit: totalLimit,
    resetAt: getNextMidnight(),
    usedToday
  };
}

/**
 * Registra uma execução de otimização
 */
export function recordUsage(userId: string, mode: OptimizeMode): void {
  const db = getSqliteDb();
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO user_daily_usage (user_id, mode, executed_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(userId, mode, now);

    logger.info("[QUOTA] Uso registrado", { userId, mode, timestamp: now });
  } catch (err) {
    logger.error("[QUOTA] Erro ao registrar uso", { error: err, userId, mode });
    throw err;
  }
}

/**
 * Conta quantas execuções o usuário fez nas últimas 24 horas
 */
function countDailyUsage(userId: string): number {
  const db = getSqliteDb();
  const last24Hours = get24HoursAgo();

  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_daily_usage
      WHERE user_id = ? AND executed_at >= ?
    `);

    const result = stmt.get(userId, last24Hours) as { count: number };
    return result.count;
  } catch (err) {
    logger.error("[QUOTA] Erro ao contar uso diário", { error: err, userId });
    return 0; // Em caso de erro, permitir uso (fail-open)
  }
}

/**
 * Retorna timestamp ISO de 24 horas atrás
 */
function get24HoursAgo(): string {
  const date = new Date();
  date.setHours(date.getHours() - 24);
  return date.toISOString();
}

/**
 * Retorna timestamp ISO da próxima meia-noite (UTC)
 */
function getNextMidnight(): string {
  const date = new Date();
  date.setUTCHours(24, 0, 0, 0); // Próxima meia-noite UTC
  return date.toISOString();
}

/**
 * Limpa registros antigos (mais de 30 dias) - pode ser chamado por cron job
 */
export function cleanupOldUsageRecords(): number {
  const db = getSqliteDb();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString();

  try {
    const stmt = db.prepare(`
      DELETE FROM user_daily_usage
      WHERE executed_at < ?
    `);

    const result = stmt.run(cutoffDate);
    const deleted = result.changes;

    if (deleted > 0) {
      logger.info("[QUOTA] Limpeza de registros antigos", { deleted, cutoffDate });
    }

    return deleted;
  } catch (err) {
    logger.error("[QUOTA] Erro ao limpar registros antigos", err);
    return 0;
  }
}

/**
 * Obtém estatísticas de uso de um usuário
 */
export function getUserUsageStats(userId: string): {
  last24h: number;
  last7days: number;
  last30days: number;
  ultraExpertModeCount: number;
  nvidiaFastModeCount: number;
} {
  const db = getSqliteDb();

  try {
    const now = new Date();

    const last24h = new Date(now);
    last24h.setHours(last24h.getHours() - 24);

    const last7days = new Date(now);
    last7days.setDate(last7days.getDate() - 7);

    const last30days = new Date(now);
    last30days.setDate(last30days.getDate() - 30);

    const stmt24h = db.prepare(`
      SELECT COUNT(*) as count FROM user_daily_usage
      WHERE user_id = ? AND executed_at >= ?
    `);
    const count24h = (stmt24h.get(userId, last24h.toISOString()) as { count: number }).count;

    const stmt7d = db.prepare(`
      SELECT COUNT(*) as count FROM user_daily_usage
      WHERE user_id = ? AND executed_at >= ?
    `);
    const count7d = (stmt7d.get(userId, last7days.toISOString()) as { count: number }).count;

    const stmt30d = db.prepare(`
      SELECT COUNT(*) as count FROM user_daily_usage
      WHERE user_id = ? AND executed_at >= ?
    `);
    const count30d = (stmt30d.get(userId, last30days.toISOString()) as { count: number }).count;

    const stmtUltraExpert = db.prepare(`
      SELECT COUNT(*) as count FROM user_daily_usage
      WHERE user_id = ? AND mode = 'ultra-expert'
    `);
    const ultraExpertCount = (stmtUltraExpert.get(userId) as { count: number }).count;

    const stmtNvidiaFast = db.prepare(`
      SELECT COUNT(*) as count FROM user_daily_usage
      WHERE user_id = ? AND mode = 'nvidia-fast'
    `);
    const nvidiaFastCount = (stmtNvidiaFast.get(userId) as { count: number }).count;

    return {
      last24h: count24h,
      last7days: count7d,
      last30days: count30d,
      ultraExpertModeCount: ultraExpertCount,
      nvidiaFastModeCount: nvidiaFastCount
    };
  } catch (err) {
    logger.error("[QUOTA] Erro ao obter estatísticas de uso", { error: err, userId });
    return {
      last24h: 0,
      last7days: 0,
      last30days: 0,
      ultraExpertModeCount: 0,
      nvidiaFastModeCount: 0
    };
  }
}
