import type { InValue } from "@libsql/client";
import type { Pool } from "pg";

import { getDbType } from "./dbAdapter";
import { getPostgresDb } from "./postgresDb";
import { getTursoDb, TursoSqliteWrapper } from "./tursoDb";

/**
 * Compatibilidade de banco para substituir o antigo SQLite.
 * Expõe uma API semelhante a better-sqlite3 (prepare/get/all/run) usando
 * Turso (libsql) ou PostgreSQL, convertendo placeholders automaticamente.
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

function replacePgPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

class PostgresCompatWrapper {
  constructor(private readonly pool: Pool) { }

  prepare(sql: string): CompatPrepared {
    const text = replacePgPlaceholders(sql);

    return {
      get: async (...params: InValue[]) => {
        const result = await this.pool.query(text, params);
        return result.rows[0] ?? null;
      },
      all: async (...params: InValue[]) => {
        const result = await this.pool.query(text, params);
        return result.rows;
      },
      run: async (...params: InValue[]) => {
        await this.pool.query(text, params);
      }
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }
}

export function getCompatDb(): CompatDb {
  const dbType = getDbType();

  if (dbType === "turso") {
    return new TursoSqliteWrapper(getTursoDb());
  }

  return new PostgresCompatWrapper(getPostgresDb());
}

export { PostgresCompatWrapper };
