/**
 * Hook para gerenciar persistência de sessão com fallback automático
 * Tenta salvar no backend (SQLite), se falhar usa IndexedDB local
 */

import { useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import * as sessionAPI from "../api/sessionClient";
import * as indexedDB from "../lib/indexedDBService";
import type { OptimizationProgress } from "./useOptimizationProgress";
import type { OptimizeMode, LLMProviderName } from "../types/api";

const SESSION_ID_STORAGE_KEY = "qlik-codex-active-session-id";
const SESSION_META_STORAGE_KEY = "qlik-codex-session-meta";

interface SessionMeta {
  sessionId: string;
  savedInBackend: boolean;
  updatedAt: string;
}

interface SessionPersistenceOptions {
  sessionId?: string;
  mode: OptimizeMode;
  llmProvider?: LLMProviderName;
  llmModel?: string;
  progress: OptimizationProgress;
  isRunning: boolean;
  status?: 'paused' | 'running' | 'completed' | 'error';
}

/**
 * Gets persisted sessionId from localStorage or generates a new one
 */
function getOrCreateSessionId(): string {
  try {
    const stored = localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (stored) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }
  return uuidv4();
}

/**
 * Persists sessionId to localStorage (only after a session is actually saved)
 */
function persistSessionId(sessionId: string): void {
  try {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch {
    // localStorage may be unavailable
  }
}

function persistSessionMeta(meta: SessionMeta): void {
  try {
    localStorage.setItem(SESSION_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Clears persisted sessionId from localStorage
 */
function clearPersistedSessionId(): void {
  try {
    localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }
}

function clearSessionMeta(): void {
  try {
    localStorage.removeItem(SESSION_META_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Checks if there's a persisted session ID in localStorage
 */
function hasPersistedSessionId(): boolean {
  try {
    return localStorage.getItem(SESSION_ID_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function getPersistedSessionMeta(): SessionMeta | null {
  try {
    const raw = localStorage.getItem(SESSION_META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionMeta;
    if (!parsed.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useSessionPersistence() {
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  // eslint-disable-next-line no-undef
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Salva sessão com fallback automático
   */
  const saveSession = useCallback(async (options: SessionPersistenceOptions): Promise<void> => {
    const sessionId = options.sessionId || sessionIdRef.current;

    const sessionData = {
      sessionId,
      mode: options.mode,
      llmProvider: options.llmProvider,
      llmModel: options.llmModel,
      progressData: options.progress,
      status: options.isRunning ? "running" as const : "paused" as const
    };

    try {
      // Tenta salvar no backend (SQLite)
      await sessionAPI.saveSession(sessionData);
      // Persiste o sessionId após salvar com sucesso
      persistSessionId(sessionId);
      persistSessionMeta({ sessionId, savedInBackend: true, updatedAt: new Date().toISOString() });
      console.warn("✓ Sessão salva no backend");
    } catch (_error) {
      console.warn("⚠️ Backend indisponível, salvando localmente (IndexedDB):", _error);

      // Fallback: salva no IndexedDB local
      try {
        await indexedDB.saveSessionLocal({
          ...sessionData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        // Persiste o sessionId após salvar localmente com sucesso
        persistSessionId(sessionId);
        persistSessionMeta({ sessionId, savedInBackend: false, updatedAt: new Date().toISOString() });
        console.warn("✓ Sessão salva localmente");
      } catch (localError) {
        console.error("❌ Erro ao salvar sessão localmente:", localError);
      }
    }
  }, []);

  /**
   * Salva sessão com debounce (evita salvar muito frequentemente)
   */
  const saveSessionDebounced = useCallback((options: SessionPersistenceOptions): void => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSession(options).catch(console.error);
    }, 2000); // Salva após 2 segundos de inatividade
  }, [saveSession]);

  /**
   * Recupera sessão ativa (tenta backend primeiro, depois IndexedDB)
   * Returns null immediately if no session was previously saved (avoids 404 errors)
   */
  const restoreSession = useCallback(async (sessionId?: string): Promise<sessionAPI.ActiveSession | indexedDB.LocalSessionData | null> => {
    const id = sessionId || sessionIdRef.current;
    const meta = getPersistedSessionMeta();
    const savedInBackend = meta?.sessionId === id && meta.savedInBackend;
    const shouldTryBackend = Boolean(sessionId) || !meta || Boolean(savedInBackend);

    // If no explicit sessionId provided and no persisted session exists,
    // don't attempt to fetch from backend (avoids 404 errors for new sessions)
    if (!sessionId && !hasPersistedSessionId()) {
      return null;
    }

    try {
      if (shouldTryBackend) {
        // Tenta recuperar do backend
        const session = await sessionAPI.getSession(id);
        if (session) {
          console.warn("✓ Sessão recuperada do backend");
          return session;
        }

        // Se não encontrou, marque como não disponível no backend para evitar 404 repetidos
        if (meta) {
          persistSessionMeta({ ...meta, savedInBackend: false, updatedAt: new Date().toISOString() });
        }
      }
    } catch {
      console.warn("⚠️ Backend indisponível, tentando IndexedDB local");
    }

    // Fallback: tenta recuperar do IndexedDB
    try {
      const localSession = await indexedDB.getSessionLocal(id);
      if (localSession) {
        console.warn("✓ Sessão recuperada localmente");
        return localSession;
      }
    } catch (_error) {
      console.error("❌ Erro ao recuperar sessão local:", _error);
    }

    // Session not found - clear the persisted ID since it's stale
    clearPersistedSessionId();
    clearSessionMeta();

    return null;
  }, []);

  /**
   * Lista sessões ativas (backend + local)
   */
  const listActiveSessions = useCallback(async (): Promise<Array<sessionAPI.ActiveSession | indexedDB.LocalSessionData>> => {
    const sessions: Array<sessionAPI.ActiveSession | indexedDB.LocalSessionData> = [];

    try {
      // Tenta listar do backend
      const backendSessions = await sessionAPI.getUserSessions();
      sessions.push(...backendSessions);
    } catch {
      console.warn("⚠️ Não foi possível listar sessões do backend");
    }

    try {
      // Lista do IndexedDB local
      const localSessions = await indexedDB.getAllSessionsLocal();

      // Adiciona apenas sessões que não estão no backend
      const backendIds = new Set(sessions.map(s => s.sessionId));
      const uniqueLocalSessions = localSessions.filter(s => !backendIds.has(s.sessionId));
      sessions.push(...uniqueLocalSessions);
    } catch {
      console.warn("⚠️ Não foi possível listar sessões locais");
    }

    return sessions;
  }, []);

  /**
   * Remove sessão (backend + local)
   */
  const removeSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await sessionAPI.deleteSession(sessionId);
      console.warn("✓ Sessão removida do backend");
    } catch {
      console.warn("⚠️ Não foi possível remover do backend");
    }

    try {
      await indexedDB.deleteSessionLocal(sessionId);
      console.warn("✓ Sessão removida localmente");
    } catch {
      console.warn("⚠️ Não foi possível remover localmente");
    }

    // Clear persisted sessionId if this was the active session
    if (sessionId === sessionIdRef.current) {
      clearPersistedSessionId();
      clearSessionMeta();
    }
  }, []);

  /**
   * Resets the current session (generates new ID, clears persisted state)
   * Use when starting a fresh optimization
   */
  const resetSession = useCallback((): string => {
    clearPersistedSessionId();
    clearSessionMeta();
    const newId = uuidv4();
    sessionIdRef.current = newId;
    return newId;
  }, []);

  /**
   * Limpa timeout ao desmontar
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    sessionId: sessionIdRef.current,
    hasPersistedSession: hasPersistedSessionId(),
    saveSession,
    saveSessionDebounced,
    restoreSession,
    listActiveSessions,
    removeSession,
    resetSession
  };
}
