/**
 * Qlik Codex I.A - History Service
 * Gerencia histórico de otimizações no Firestore
 */

import { randomUUID } from "node:crypto";

import { getFirestore } from "../lib/firestoreDb";
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
  async saveOptimization(result: OptimizeResult, durationMs: number, provider: string): Promise<string> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    try {
      const db = getFirestore();

      const record: OptimizationRecord = {
        id,
        mode: result.analysis.mode || "conservative",
        original_lines: result.originalScript.split("\n").length,
        optimized_lines: result.optimizedScript.split("\n").length,
        breaking_risk: result.analysis.breakingRisk,
        changes_count: result.analysis.changes.length,
        duration_ms: durationMs,
        llm_provider: provider,
        success: 1,
        created_at: createdAt
      };

      await db.collection("optimization_history").doc(id).set(record);

      logger.info("Optimization saved to history", { id, provider, duration: durationMs });

      return id;
    } catch (err) {
      logger.error("Failed to save optimization history", err);
      // Não lançar erro para não quebrar o fluxo principal se o log falhar
      return id;
    }
  }

  /**
   * Salva métricas de performance de uma fase
   */
  async savePerformanceMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const db = getFirestore();
      await db.collection("performance_metrics").add(metric);
    } catch (err) {
      logger.warn("Failed to save performance metric", err);
    }
  }

  /**
   * Busca histórico de otimizações (últimas N)
   */
  async getRecentOptimizations(limit = 50): Promise<OptimizationRecord[]> {
    try {
      const db = getFirestore();
      const snapshot = await db.collection("optimization_history")
        .orderBy("created_at", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as OptimizationRecord);
    } catch (err) {
      logger.error("Failed to get optimization history", err);
      return [];
    }
  }

  /**
   * Estatísticas gerais
   * Nota: Firestore não tem agregação nativa eficiente para SUM/AVG em tempo real sem custo.
   * Implementação simplificada.
   */
  async getStatistics(): Promise<{
    total_optimizations: number;
    total_lines_saved: number;
    avg_duration_ms: number;
    most_used_provider: string;
  }> {
    try {
      const db = getFirestore();

      // Para estatísticas reais em Firestore, o ideal é incrementar contadores em um documento separado
      // Aqui faremos uma query limitada para estimativa ou count() se disponível

      const snapshot = await db.collection("optimization_history").count().get();
      const total = snapshot.data().count;

      // Retornando dados parciais pois scan completo é caro
      return {
        total_optimizations: total,
        total_lines_saved: 0, // Requer agregação
        avg_duration_ms: 0, // Requer agregação
        most_used_provider: "gemini" // Placeholder
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
  async cleanOldRecords(daysToKeep = 90): Promise<number> {
    try {
      const db = getFirestore();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const snapshot = await db.collection("optimization_history")
        .where("created_at", "<", cutoffDate.toISOString())
        .limit(500) // Limite para batch
        .get();

      if (snapshot.empty) return 0;

      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      logger.info(`Cleaned ${snapshot.size} old optimization records`);
      return snapshot.size;
    } catch (err) {
      logger.error("Failed to clean old records", err);
      return 0;
    }
  }
}

export const historyService = new HistoryService();
