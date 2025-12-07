/**
 * Database Factory - Escolhe SQLite (dev), Turso ou PostgreSQL (produção)
 */

import { getSqliteDb, initSqliteDb, closeSqliteDb } from './sqliteDb';
import { getPostgresDb, initPostgresDb, closePostgresDb } from './postgresDb';
import { getTursoDb, initTursoDb } from './tursoDb';
import { logger } from './logger';

type DbType = 'sqlite' | 'postgres' | 'turso';

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

  // Em produção, exigir DB externo (Turso ou Postgres) — não usar SQLite
  if (process.env.NODE_ENV === 'production') {
    throw new Error('No production database configured. Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN or DATABASE_URL for Postgres');
  }

  // Caso contrário (dev), usar SQLite local
  return 'sqlite';
}

/**
 * Inicializa banco de dados (SQLite, Turso ou PostgreSQL)
 */
export async function initDb() {
  const dbType = getDbType();

  logger.info(`Initializing database: ${dbType}`);

  if (dbType === 'turso') {
    await initTursoDb();
  } else if (dbType === 'postgres') {
    return initPostgresDb();
  } else {
    return initSqliteDb();
  }
}

/**
 * Obtém instância do banco
 */
export function getDb() {
  const dbType = getDbType();

  if (dbType === 'turso') {
    return getTursoDb();
  } else if (dbType === 'postgres') {
    return getPostgresDb();
  } else {
    return getSqliteDb();
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
  } else if (dbType === 'postgres') {
    await closePostgresDb();
  } else {
    closeSqliteDb();
  }
}

/**
 * Adapter para queries - unifica API SQLite e PostgreSQL
 */
export class DbAdapter {
  private dbType: DbType;
  private db: any;

  constructor() {
    this.dbType = getDbType();
    this.db = getDb();
  }

  /**
   * Executa query e retorna um único resultado
   */
  async get(sql: string, params: any[] = []): Promise<any> {
    if (this.dbType === 'postgres') {
      const result = await this.db.query(sql, params);
      return result.rows[0] || null;
    } else {
      return this.db.prepare(sql).get(...params);
    }
  }

  /**
   * Executa query e retorna todos os resultados
   */
  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (this.dbType === 'postgres') {
      const result = await this.db.query(sql, params);
      return result.rows;
    } else {
      return this.db.prepare(sql).all(...params);
    }
  }

  /**
   * Executa query de inserção/update/delete
   */
  async run(sql: string, params: any[] = []): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.db.query(sql, params);
    } else {
      this.db.prepare(sql).run(...params);
    }
  }

  /**
   * Executa script SQL direto
   */
  async exec(sql: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.db.query(sql);
    } else {
      this.db.exec(sql);
    }
  }
}

// Explicit instantiation is avoided here to prevent premature DB initialization
// before the environment variables are loaded at startup.
