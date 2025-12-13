/**
 * Cliente de API para gerenciamento de sessões ativas
 */

import type { OptimizeMode, LLMProviderName } from "../types/api";
import type { PipelineProgress } from "../types/pipeline";
import { getAuthHeaders } from "./client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://qlik-codex-i-a-v2.onrender.com/api";

export interface SessionData {
  sessionId: string;
  userId?: string;
  script?: string;
  mode: OptimizeMode;
  llmProvider?: LLMProviderName;
  llmModel?: string;
  progressData: PipelineProgress;
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
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
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
    headers: getAuthHeaders(),
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Erro ao remover sessão: ${response.statusText}`);
  }

  return response.json();
}
