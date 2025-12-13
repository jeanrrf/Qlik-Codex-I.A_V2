/**
 * IndexedDB storage for session snapshots (per user).
 * Falls back gracefully if IndexedDB is unavailable.
 */

export type SnapshotPayload = {
  userId: string | null | undefined;
  script: string;
  mode: string;
  result: unknown;
  progress: unknown;
  updatedAt: number;
};

const DB_NAME = "qlik-codex";
const DB_VERSION = 1;
const STORE = "sessions";

function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("by_user", "userId", { unique: false });
        store.createIndex("by_updated", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSnapshot(payload: SnapshotPayload): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const record = {
    userId: payload.userId || "anon",
    script: payload.script,
    mode: payload.mode,
    result: payload.result,
    progress: payload.progress,
    updatedAt: payload.updatedAt,
  };
  store.add(record);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadLatestSnapshot(userId?: string | null): Promise<SnapshotPayload | null> {
  if (!isIndexedDbAvailable()) return null;
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const index = store.index("by_user");

  const targetUser = userId || "anon";
  const range = IDBKeyRange.only(targetUser);
  const request = index.openCursor(range, "prev"); // latest updatedAt if sorted? index default not sorted; we will sort manually

  return new Promise((resolve, reject) => {
    const results: any[] = [];
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        if (results.length === 0) {
          resolve(null);
        } else {
          // pick latest updatedAt
          const latest = results.sort((a, b) => b.updatedAt - a.updatedAt)[0];
          resolve(latest as SnapshotPayload);
        }
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearSnapshots(userId?: string | null): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const index = store.index("by_user");
  const targetUser = userId || "anon";
  const range = IDBKeyRange.only(targetUser);
  const request = index.openCursor(range);

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}
