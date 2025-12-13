/**
 * Database Factory - Turso (Sole Provider)
 */

import type { Client, InArgs } from "@libsql/client" assert { "resolution-mode": "import" };

import { logger } from "./logger";
import { closeTursoDb, getTursoDb, initTursoDb } from "./tursoDb";

/**
 * Inicializa banco de dados (Turso)
 */
export async function initDb() {
  logger.info("Initializing database: Turso Only");
  await initTursoDb();
}

/**
 * Obtém instância do banco
 */
export function getDb() {
  return getTursoDb();
}

/**
 * Fecha conexão do banco
 */
export async function closeDb() {
  try {
    await closeTursoDb();
    logger.info("Turso connection closed");
  } catch (err) {
    logger.error("Failed to close Turso connection", err);
  }
}

/**
 * Adapter para queries - Wrapper para Turso
 */
export class DbAdapter {
  private db: unknown;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    // Lazily initialize Turso client
    this.db = await initTursoDb();
  }

  /**
   * Executa query e retorna um único resultado
   */
  async get(sql: string, params: unknown[] = []): Promise<unknown> {
    await this.ready;
    const client = this.db as Client;
    const result = await client.execute({ sql, args: params as InArgs });
    return result.rows[0] || null;
  }

  /**
   * Executa query e retorna todos os resultados
   */
  async all(sql: string, params: unknown[] = []): Promise<unknown[]> {
    await this.ready;
    const client = this.db as Client;
    const result = await client.execute({ sql, args: params as InArgs });
    return result.rows;
  }

  /**
   * Executa query de inserção/update/delete
   */
  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.ready;
    const client = this.db as Client;
    await client.execute({ sql, args: params as InArgs });
  }

  /**
   * Executa script SQL direto
   */
  async exec(sql: string): Promise<void> {
    await this.ready;
    const client = this.db as Client;
    await client.execute(sql);
  }
}
