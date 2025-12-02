/**
 * Serviço de persistência local usando IndexedDB
 * Fallback para quando o backend não estiver disponível
 */

import type { ProgressData } from "../types/api";

const DB_NAME = "QlikCodexIA";
const DB_VERSION = 1;
const STORE_NAME = "activeSessions";

let db: IDBDatabase | null = null;

/**
 * Inicializa o IndexedDB
 */
export async function initIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Erro ao abrir IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.warn("✓ IndexedDB inicializado");
      resolve();
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Cria object store para sessões ativas
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "sessionId" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("status", "status", { unique: false });
        console.warn("✓ Object store criado");
      }
    };
  });
}

/**
 * Obtém a instância do banco de dados
 */
async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    await initIndexedDB();
  }
  if (!db) {
    throw new Error("IndexedDB não está disponível");
  }
  return db;
}

export interface LocalSessionData {
  sessionId: string;
  mode: string;
  // REMOVIDO: script não é mais persistido localmente
  llmProvider?: string;
  llmModel?: string;
  progressData: ProgressData;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Salva uma sessão no IndexedDB
 */
export async function saveSessionLocal(session: LocalSessionData): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const data = {
      ...session,
      updatedAt: new Date().toISOString()
    };

    const request = store.put(data);

    request.onsuccess = () => {
      console.warn(`✓ Sessão ${session.sessionId} salva localmente`);
      resolve();
    };

    request.onerror = () => {
      console.error("Erro ao salvar sessão local:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Recupera uma sessão do IndexedDB
 */
export async function getSessionLocal(sessionId: string): Promise<LocalSessionData | null> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(sessionId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error("Erro ao recuperar sessão local:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Lista todas as sessões ativas locais
 */
export async function getAllSessionsLocal(): Promise<LocalSessionData[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const sessions = (request.result || []) as LocalSessionData[];
      // Ordena por updatedAt (mais recente primeiro)
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(sessions);
    };

    request.onerror = () => {
      console.error("Erro ao listar sessões locais:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Remove uma sessão do IndexedDB
 */
export async function deleteSessionLocal(sessionId: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(sessionId);

    request.onsuccess = () => {
      console.warn(`✓ Sessão ${sessionId} removida localmente`);
      resolve();
    };

    request.onerror = () => {
      console.error("Erro ao remover sessão local:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Limpa todas as sessões locais
 */
export async function clearAllSessionsLocal(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.warn("✓ Todas as sessões locais foram removidas");
      resolve();
    };

    request.onerror = () => {
      console.error("Erro ao limpar sessões locais:", request.error);
      reject(request.error);
    };
  });
}

// Inicializa automaticamente quando o módulo é importado
initIndexedDB().catch(console.error);
