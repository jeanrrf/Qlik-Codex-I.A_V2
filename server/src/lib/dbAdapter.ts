/**
 * Database Factory - Escolhe Turso ou PostgreSQL (produção)
 */

import { logger } from './logger';
import { getPostgresDb, initPostgresDb, closePostgresDb } from './postgresDb';
import { getTursoDb, initTursoDb } from './tursoDb';
import type { Client } from '@libsql/client';

type DbType = 'postgres' | 'turso';

/**
 * Detecta qual banco usar baseado em environment variable
 */
export function getDbType(): DbType {
  // Se TURSO_DATABASE_URL está definida, usar Turso (prioridade)
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return 'turso';
  }

  // Se DATABASE_URL está definida, usar PostgreSQL
  if (process.env.DATABASE_URL) {
    return 'postgres';
  }

  throw new Error('No database configured. Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN or DATABASE_URL');
}

/**
 * Inicializa banco de dados (Turso ou PostgreSQL)
 */
export async function initDb() {
  const dbType = getDbType();

  logger.info(`Initializing database: ${dbType}`);

  if (dbType === 'turso') {
    await initTursoDb();
  } else {
    return initPostgresDb();
  }
}

/**
 * Obtém instância do banco
 */
export function getDb() {
  const dbType = getDbType();

  if (dbType === 'turso') {
    return getTursoDb();
  } else {
    return getPostgresDb();
  }
}

/**
 * Fecha conexão do banco
 */
export async function closeDb() {
  const dbType = getDbType();

  if (dbType === 'turso') {
    // Turso fecha automaticamente
    logger.info('Turso connection closed');
  } else {
    await closePostgresDb();
  }
}

/**
 * Adapter para queries - unifica API Turso e PostgreSQL
 */
export class DbAdapter {
  private dbType: DbType;
  private db: unknown;

  constructor() {
    this.dbType = getDbType();
    this.db = getDb();
  }

  /**
   * Executa query e retorna um único resultado
   */
  async get(sql: string, params: unknown[] = []): Promise<unknown> {
    if (this.dbType === 'postgres') {
      const pg = this.db as { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
      const result = await pg.query(sql, params);
      return result.rows[0] || null;
    } else {
      const client = this.db as Client;
      const result = await client.execute({ sql, args: params as any });
      return result.rows[0] || null;
    }
  }

  /**
   * Executa query e retorna todos os resultados
   */
  async all(sql: string, params: unknown[] = []): Promise<unknown[]> {
    if (this.dbType === 'postgres') {
      const pg = this.db as { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
      const result = await pg.query(sql, params);
      return result.rows;
    } else {
      const client = this.db as Client;
      const result = await client.execute({ sql, args: params as any });
      return result.rows;
    }
  }

  /**
   * Executa query de inserção/update/delete
   */
  async run(sql: string, params: unknown[] = []): Promise<void> {
    if (this.dbType === 'postgres') {
      const pg = this.db as { query: (sql: string, params?: unknown[]) => Promise<unknown> };
      await pg.query(sql, params);
    } else {
      const client = this.db as Client;
      await client.execute({ sql, args: params as any });
    }
  }

  /**
   * Executa script SQL direto
   */
  async exec(sql: string): Promise<void> {
    if (this.dbType === 'postgres') {
      const pg = this.db as { query: (sql: string) => Promise<unknown> };
      await pg.query(sql);
    } else {
      const client = this.db as Client;
      await client.execute(sql);
    }
  }
}
