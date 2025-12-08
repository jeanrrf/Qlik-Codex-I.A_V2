/**
 * Serviço de Gerenciamento de Sessões Ativas
 * Persiste estado de otimizações em andamento no SQLite
 */

import { logger } from "../lib/logger";
import { getSqliteDb } from "../lib/sqliteDb";
import type { OptimizeMode } from "../types/qlik";
export type LLMProviderName = "ainex" | "google" | "nvidia";

export interface ActiveSession {
  id: string;
  userId?: string;
  mode: OptimizeMode;
  // REMOVIDO: script não é mais persistido por segurança
  llmProvider?: LLMProviderName;
  llmModel?: string;
  progressData?: Record<string, unknown>; // JSON do progresso completo (opcional até iniciar)
  status: "running" | "paused" | "completed" | "error";
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const SESSION_EXPIRY_HOURS = 24; // Sessões expiram após 24 horas

/**
 * Cria ou atualiza uma sessão ativa
 */
export function saveActiveSession(session: Omit<ActiveSession, "createdAt" | "updatedAt" | "expiresAt">): void {
  const db = getSqliteDb();

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  try {
    // Scripts NÃO são persistidos, apenas metadados da sessão
    const stmt = db.prepare(`
      INSERT INTO active_sessions (
        id, user_id, mode, llm_provider, llm_model,
        progress_data, status, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        progress_data = excluded.progress_data,
        status = excluded.status,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      session.id,
      session.userId || null,
      session.mode,
      session.llmProvider || null,
      session.llmModel || null,
      JSON.stringify(session.progressData ?? {}),
      session.status,
      now,
      now,
      expiresAt
    );

    logger.info(`Sessão ${session.id} salva com sucesso`, { status: session.status });
  } catch (error) {
    logger.error(`Erro ao salvar sessão ${session.id}`, error);
    throw error;
  }
}

/**
 * Recupera uma sessão ativa por ID
 */
export function getActiveSession(sessionId: string): ActiveSession | null {
  const db = getSqliteDb();

  try {
    const stmt = db.prepare(`
      SELECT * FROM active_sessions 
      WHERE id = ? AND expires_at > datetime('now')
    `);

    const row = stmt.get(sessionId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      mode: String(row.mode) as OptimizeMode,
      // script não retornado (não é mais persistido)
      llmProvider: row.llm_provider as LLMProviderName | undefined,
      llmModel: row.llm_model as string | undefined,
      progressData: row.progress_data ? JSON.parse(String(row.progress_data)) : {},
      status: String(row.status) as ActiveSession['status'],
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      expiresAt: new Date(String(row.expires_at))
    };
  } catch (error) {
    logger.error(`Erro ao recuperar sessão ${sessionId}`, error);
    return null;
  }
}

/**
 * Lista sessões ativas do usuário (últimas 5)
 */
export function getUserActiveSessions(userId?: string): ActiveSession[] {
  const db = getSqliteDb();

  try {
    const stmt = db.prepare(`
      SELECT * FROM active_sessions 
      WHERE (user_id = ? OR user_id IS NULL)
        AND expires_at > datetime('now')
        AND status IN ('running', 'paused')
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    const rows = stmt.all(userId || null) as Array<Record<string, unknown>>;

    return rows.map(row => ({
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      mode: String(row.mode) as OptimizeMode,
      llmProvider: (row.llm_provider ? String(row.llm_provider) : undefined) as LLMProviderName | undefined,
      llmModel: row.llm_model ? String(row.llm_model) : undefined,
      progressData: row.progress_data ? JSON.parse(String(row.progress_data)) : {},
      status: String(row.status) as ActiveSession['status'],
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      expiresAt: new Date(String(row.expires_at))
    }));
  } catch (error) {
    logger.error("Erro ao listar sessões ativas", error);
    return [];
  }
}

/**
 * Atualiza o status de uma sessão
 */
export function updateSessionStatus(sessionId: string, status: ActiveSession["status"]): void {
  const db = getSqliteDb();

  try {
    const stmt = db.prepare(`
      UPDATE active_sessions 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, new Date().toISOString(), sessionId);
    logger.info(`Status da sessão ${sessionId} atualizado para ${status}`);
  } catch (error) {
    logger.error(`Erro ao atualizar status da sessão ${sessionId}`, error);
  }
}

/**
 * Remove uma sessão (quando completada ou cancelada)
 */
export function deleteSession(sessionId: string): void {
  const db = getSqliteDb();

  try {
    const stmt = db.prepare("DELETE FROM active_sessions WHERE id = ?");
    stmt.run(sessionId);
    logger.info(`Sessão ${sessionId} removida`);
  } catch (error) {
    logger.error(`Erro ao remover sessão ${sessionId}`, error);
  }
}

/**
 * Limpa sessões expiradas (chamado periodicamente)
 */
export function cleanExpiredSessions(): void {
  const db = getSqliteDb();

  try {
    const stmt = db.prepare("DELETE FROM active_sessions WHERE expires_at < datetime('now')");
    const result = stmt.run();

    if (result.changes > 0) {
      logger.info(`${result.changes} sessões expiradas removidas`);
    }
  } catch (error) {
    logger.error("Erro ao limpar sessões expiradas", error);
  }
}

// Limpa sessões expiradas a cada hora
setInterval(cleanExpiredSessions, 60 * 60 * 1000);
