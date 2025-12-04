/**
 * Cliente de API para gerenciamento de sessões ativas
 */

import type { OptimizeMode, LLMProviderName, ProgressData } from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export interface SessionData {
  sessionId: string;
  userId?: string;
  mode: OptimizeMode;
  script: string;
  llmProvider?: LLMProviderName;
  llmModel?: string;
  progressData: ProgressData;
  status: "running" | "paused" | "completed" | "error";
}

export interface ActiveSession extends SessionData {
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Salva ou atualiza uma sessão no backend
 */
export async function saveSession(session: SessionData): Promise<{ success: boolean; sessionId: string }> {
  const response = await fetch(`${API_BASE}/sessions/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(session)
  });

  if (!response.ok) {
    throw new Error(`Erro ao salvar sessão: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Recupera uma sessão específica
 */
export async function getSession(sessionId: string): Promise<ActiveSession | null> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    credentials: "include"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Erro ao recuperar sessão: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Lista sessões ativas do usuário
 */
export async function getUserSessions(userId?: string): Promise<ActiveSession[]> {
  const url = userId ? `${API_BASE}/sessions/user/${userId}` : `${API_BASE}/sessions/user/`;
  const response = await fetch(url, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar sessões: ${response.statusText}`);
  }

  const data = await response.json();
  return data.sessions || [];
}

/**
 * Atualiza status de uma sessão
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionData["status"]
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove uma sessão
 */
export async function deleteSession(sessionId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Erro ao remover sessão: ${response.statusText}`);
  }

  return response.json();
}
