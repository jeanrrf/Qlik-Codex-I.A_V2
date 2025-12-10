/**
 * Usage Quota Service
 * Controla limites de uso diário (FREE TIER)
 */

import { DbAdapter } from "../lib/dbAdapter";
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

const db = new DbAdapter();

// Cache em memória para reduzir consultas repetitivas ao verificar quotas.
// TTL curto para não deixar dados desatualizados após uso real.
const QUOTA_CACHE_TTL_MS = 25_000; // 25s (frontend consulta ~30s)
const quotaCache = new Map<string, { data: UsageQuotaCheck; expiresAt: number }>();

function quotaCacheKey(userId: string, mode: OptimizeMode): string {
  return `${userId}:${mode}`;
}

function getCachedQuota(userId: string, mode: OptimizeMode): UsageQuotaCheck | null {
  const key = quotaCacheKey(userId, mode);
  const cached = quotaCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  quotaCache.delete(key);
  return null;
}

function setCachedQuota(userId: string, mode: OptimizeMode, data: UsageQuotaCheck): void {
  const key = quotaCacheKey(userId, mode);
  quotaCache.set(key, { data, expiresAt: Date.now() + QUOTA_CACHE_TTL_MS });
}

export function invalidateQuotaCacheForUser(userId: string): void {
  for (const key of quotaCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      quotaCache.delete(key);
    }
  }
}

/**
 * Verifica se o usuário pode executar uma otimização
 */
export async function checkDailyQuota(user: User, mode: OptimizeMode): Promise<UsageQuotaCheck> {
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
  const cached = getCachedQuota(user.id, mode);
  if (cached) {
    logger.debug("[QUOTA] Retornando quota do cache", { userId: user.id, mode, remaining: cached.remaining });
    return cached;
  }

  const usedToday = await countDailyUsage(user.id);

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

  const result: UsageQuotaCheck = {
    allowed,
    remaining,
    limit: totalLimit,
    resetAt: getNextMidnight(),
    usedToday
  };

  setCachedQuota(user.id, mode, result);
  return result;
}

/**
 * Registra uma execução de otimização
 */
export async function recordUsage(userId: string, mode: OptimizeMode): Promise<void> {
  const now = new Date().toISOString();

  try {
    await db.run(`
      INSERT INTO user_daily_usage (user_id, mode, executed_at)
      VALUES (?, ?, ?)
    `, [userId, mode, now]);

    logger.info("[QUOTA] Uso registrado", { userId, mode, timestamp: now });
    invalidateQuotaCacheForUser(userId);
  } catch (err) {
    logger.error("[QUOTA] Erro ao registrar uso", { error: err, userId, mode });
    throw err;
  }
}

/**
 * Conta quantas execuções o usuário fez nas últimas 24 horas
 */
async function countDailyUsage(userId: string): Promise<number> {
  const last24Hours = get24HoursAgo();

  try {
    const result = await db.get(`
      SELECT COUNT(*) as count
      FROM user_daily_usage
      WHERE user_id = ? AND executed_at >= ?
    `, [userId, last24Hours]) as { count: number } | undefined;

    return result?.count ?? 0;
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
export async function cleanupOldUsageRecords(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString();

  try {
    // Note: DbAdapter.run doesn't return changes count easily.
    // We can assume success if no error.
    await db.run(`
      DELETE FROM user_daily_usage
      WHERE executed_at < ?
    `, [cutoffDate]);

    logger.info("[QUOTA] Limpeza de registros antigos executada", { cutoffDate });
    return 1; // Placeholder
  } catch (err) {
    logger.error("[QUOTA] Erro ao limpar registros antigos", err);
    return 0;
  }
}

/**
 * Obtém estatísticas de uso de um usuário
 */
export async function getUserUsageStats(userId: string): Promise<{
  last24h: number;
  last7days: number;
  last30days: number;
  ultraExpertModeCount: number;
  nvidiaFastModeCount: number;
}> {
  try {
    const now = new Date();

    const last24h = new Date(now);
    last24h.setHours(last24h.getHours() - 24);

    const last7days = new Date(now);
    last7days.setDate(last7days.getDate() - 7);

    const last30days = new Date(now);
    last30days.setDate(last30days.getDate() - 30);

    // Parallelize queries for performance
    const results = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM user_daily_usage WHERE user_id = ? AND executed_at >= ?`, [userId, last24h.toISOString()]),
      db.get(`SELECT COUNT(*) as count FROM user_daily_usage WHERE user_id = ? AND executed_at >= ?`, [userId, last7days.toISOString()]),
      db.get(`SELECT COUNT(*) as count FROM user_daily_usage WHERE user_id = ? AND executed_at >= ?`, [userId, last30days.toISOString()]),
      db.get(`SELECT COUNT(*) as count FROM user_daily_usage WHERE user_id = ? AND mode = 'ultra-expert'`, [userId]),
      db.get(`SELECT COUNT(*) as count FROM user_daily_usage WHERE user_id = ? AND mode = 'nvidia-fast'`, [userId])
    ]) as Array<{ count: number } | undefined>;

    const [res24h, res7d, res30d, resUltra, resNvidia] = results;

    return {
      last24h: res24h?.count ?? 0,
      last7days: res7d?.count ?? 0,
      last30days: res30d?.count ?? 0,
      ultraExpertModeCount: resUltra?.count ?? 0,
      nvidiaFastModeCount: resNvidia?.count ?? 0
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
