/**
 * Serviço de Gerenciamento de Sessões Ativas
 * Persiste estado de otimizações em andamento no Firestore
 */

import { getFirestore } from "../lib/firestoreDb";
import { logger } from "../lib/logger";
import type { OptimizeMode } from "../types/qlik";
export type LLMProviderName = "ainex" | "google" | "nvidia";

export interface ActiveSession {
  id: string;
  userId?: string;
  mode: OptimizeMode;
  // REMOVIDO: script não é mais persistido por segurança
  llmProvider?: LLMProviderName;
  llmModel?: string;
  progressData?: any; // JSON do progresso completo (opcional até iniciar)
  status: "running" | "paused" | "completed" | "error";
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const SESSION_EXPIRY_HOURS = 24; // Sessões expiram após 24 horas

/**
 * Cria ou atualiza uma sessão ativa
 */
export async function saveActiveSession(session: Omit<ActiveSession, "createdAt" | "updatedAt" | "expiresAt">): Promise<void> {
  const db = getFirestore();

  const now = new Date();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  try {
    const sessionData = {
      id: session.id,
      user_id: session.userId || null,
      mode: session.mode,
      llm_provider: session.llmProvider || null,
      llm_model: session.llmModel || null,
      progress_data: session.progressData ?? {},
      status: session.status,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    };

    await db.collection("active_sessions").doc(session.id).set(sessionData, { merge: true });

    logger.info(`Sessão ${session.id} salva com sucesso`, { status: session.status });
  } catch (error) {
    logger.error(`Erro ao salvar sessão ${session.id}`, error);
    throw error;
  }
}

/**
 * Recupera uma sessão ativa por ID
 */
export async function getActiveSession(sessionId: string): Promise<ActiveSession | null> {
  const db = getFirestore();

  try {
    const doc = await db.collection("active_sessions").doc(sessionId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    // Verificar expiração
    if (new Date(data.expires_at) < new Date()) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      mode: data.mode,
      llmProvider: data.llm_provider,
      llmModel: data.llm_model,
      progressData: data.progress_data,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      expiresAt: new Date(data.expires_at)
    };
  } catch (error) {
    logger.error(`Erro ao recuperar sessão ${sessionId}`, error);
    return null;
  }
}

/**
 * Lista sessões ativas do usuário (últimas 5)
 */
export async function getUserActiveSessions(userId?: string): Promise<ActiveSession[]> {
  const db = getFirestore();

  try {
    let query = db.collection("active_sessions")
      .where("status", "in", ["running", "paused"])
      .orderBy("updated_at", "desc")
      .limit(5);

    if (userId) {
      query = query.where("user_id", "==", userId);
    }

    const snapshot = await query.get();

    const sessions: ActiveSession[] = [];
    const now = new Date();

    snapshot.forEach(doc => {
      const data = doc.data();
      if (new Date(data.expires_at) > now) {
        sessions.push({
          id: data.id,
          userId: data.user_id,
          mode: data.mode as OptimizeMode,
          llmProvider: data.llm_provider as LLMProviderName,
          llmModel: data.llm_model,
          progressData: data.progress_data,
          status: data.status,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          expiresAt: new Date(data.expires_at)
        });
      }
    });

    return sessions;
  } catch (error) {
    logger.error("Erro ao listar sessões ativas", error);
    return [];
  }
}

/**
 * Atualiza o status de uma sessão
 */
export async function updateSessionStatus(sessionId: string, status: ActiveSession["status"]): Promise<void> {
  const db = getFirestore();

  try {
    await db.collection("active_sessions").doc(sessionId).update({
      status: status,
      updated_at: new Date().toISOString()
    });
    logger.info(`Status da sessão ${sessionId} atualizado para ${status}`);
  } catch (error) {
    logger.error(`Erro ao atualizar status da sessão ${sessionId}`, error);
  }
}

/**
 * Remove uma sessão (quando completada ou cancelada)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = getFirestore();

  try {
    await db.collection("active_sessions").doc(sessionId).delete();
    logger.info(`Sessão ${sessionId} removida`);
  } catch (error) {
    logger.error(`Erro ao remover sessão ${sessionId}`, error);
  }
}

/**
 * Limpa sessões expiradas (chamado periodicamente)
 */
export async function cleanExpiredSessions(): Promise<void> {
  const db = getFirestore();

  try {
    const now = new Date().toISOString();
    const snapshot = await db.collection("active_sessions")
      .where("expires_at", "<", now)
      .limit(100)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`${snapshot.size} sessões expiradas removidas`);
  } catch (error) {
    logger.error("Erro ao limpar sessões expiradas", error);
  }
}

// Limpa sessões expiradas a cada hora
setInterval(cleanExpiredSessions, 60 * 60 * 1000);
