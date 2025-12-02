/**
 * Qlik Codex I.A - History Service
 * Gerencia histórico de otimizações no SQLite
 */

import { randomUUID } from "node:crypto";

import { getSqliteDb, transaction } from "../lib/sqliteDb";
import { logger } from "../lib/logger";
import type { OptimizeResult } from "../types/qlik";

interface OptimizationRecord {
  id: string;
  user_id?: string;
  mode: string;
  original_lines: number;
  optimized_lines: number;
  breaking_risk: string;
  changes_count: number;
  duration_ms: number;
  llm_provider: string;
  success: number;
  created_at: string;
}

interface PerformanceMetric {
  optimization_id: string;
  phase: string;
  duration_ms: number;
  status: string;
  error_message?: string;
  created_at: string;
}

class HistoryService {
  /**
   * Salva uma otimização completa no histórico
   */
  saveOptimization(result: OptimizeResult, durationMs: number, provider: string): string {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    try {
      transaction((db) => {
        // Inserir registro de otimização
        const stmt = db.prepare(`
          INSERT INTO optimization_history (
            id, mode, original_lines, optimized_lines, breaking_risk,
            changes_count, duration_ms, llm_provider, success, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          id,
          result.analysis.mode || "conservative",
          result.originalScript.split("\n").length,
          result.optimizedScript.split("\n").length,
          result.analysis.breakingRisk,
          result.analysis.changes.length,
          durationMs,
          provider,
          1, // success
          createdAt
        );

        logger.info("Optimization saved to history", { id, provider, duration: durationMs });
      });

      return id;
    } catch (err) {
      logger.error("Failed to save optimization history", err);
      throw err;
    }
  }

  /**
   * Salva métricas de performance de uma fase
   */
  savePerformanceMetric(metric: PerformanceMetric): void {
    try {
      const db = getSqliteDb();
      const stmt = db.prepare(`
        INSERT INTO performance_metrics (
          optimization_id, phase, duration_ms, status, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        metric.optimization_id,
        metric.phase,
        metric.duration_ms,
        metric.status,
        metric.error_message || null,
        metric.created_at
      );
    } catch (err) {
      logger.warn("Failed to save performance metric", err);
    }
  }

  /**
   * Busca histórico de otimizações (últimas N)
   */
  getRecentOptimizations(limit = 50): OptimizationRecord[] {
    try {
      const db = getSqliteDb();
      const stmt = db.prepare(`
        SELECT * FROM optimization_history
        ORDER BY created_at DESC
        LIMIT ?
      `);

      return stmt.all(limit) as OptimizationRecord[];
    } catch (err) {
      logger.error("Failed to get optimization history", err);
      return [];
    }
  }

  /**
   * Estatísticas gerais
   */
  getStatistics(): {
    total_optimizations: number;
    total_lines_saved: number;
    avg_duration_ms: number;
    most_used_provider: string;
  } {
    try {
      const db = getSqliteDb();

      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_optimizations,
          SUM(original_lines - optimized_lines) as total_lines_saved,
          AVG(duration_ms) as avg_duration_ms,
          (SELECT llm_provider FROM optimization_history 
           GROUP BY llm_provider 
           ORDER BY COUNT(*) DESC 
           LIMIT 1) as most_used_provider
        FROM optimization_history
      `).get() as any;

      return {
        total_optimizations: stats.total_optimizations || 0,
        total_lines_saved: stats.total_lines_saved || 0,
        avg_duration_ms: Math.round(stats.avg_duration_ms || 0),
        most_used_provider: stats.most_used_provider || "gemini"
      };
    } catch (err) {
      logger.error("Failed to get statistics", err);
      return {
        total_optimizations: 0,
        total_lines_saved: 0,
        avg_duration_ms: 0,
        most_used_provider: "gemini"
      };
    }
  }

  /**
   * Limpa otimizações antigas (mais de N dias)
   */
  cleanOldRecords(daysToKeep = 90): number {
    try {
      const db = getSqliteDb();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = db.prepare(`
        DELETE FROM optimization_history
        WHERE created_at < ?
      `).run(cutoffDate.toISOString());

      logger.info(`Cleaned ${result.changes} old optimization records`);
      return result.changes;
    } catch (err) {
      logger.error("Failed to clean old records", err);
      return 0;
    }
  }
}

export const historyService = new HistoryService();
