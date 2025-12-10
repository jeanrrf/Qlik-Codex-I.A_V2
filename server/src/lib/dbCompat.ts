import type { InValue } from "@libsql/client";

import { getTursoDb, TursoSqliteWrapper, initTursoDb } from "./tursoDb";

/**
 * Compatibilidade de banco para substituir o antigo SQLite.
 * Expõe uma API semelhante a better-sqlite3 (prepare/get/all/run) usando
 * Turso (libsql).
 */
export interface CompatPrepared {
  get: (...params: InValue[]) => Promise<unknown> | unknown;
  all: (...params: InValue[]) => Promise<unknown[]> | unknown[];
  run: (...params: InValue[]) => Promise<unknown> | unknown;
}

export interface CompatDb {
  prepare: (sql: string) => CompatPrepared;
  exec?: (sql: string) => Promise<void>;
}

export function getCompatDb(): CompatDb {
  // Ensure client initialized before use
  initTursoDb().catch(() => { /* initialization already attempted elsewhere */ });
  return new TursoSqliteWrapper(getTursoDb());
}
