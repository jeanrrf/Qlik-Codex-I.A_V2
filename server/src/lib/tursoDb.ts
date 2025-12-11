/**
 * Turso Database Client - SQLite na Cloud (Cloudflare)
 * Alternativa simples ao Supabase/PostgreSQL
 */

import type { Client, InValue } from '@libsql/client' assert { "resolution-mode": "import" };


import { logger } from './logger';

let tursoClient: Client | null = null;

/**
 * Inicializa cliente Turso
 */
export async function initTursoDb(): Promise<Client> {
  if (tursoClient) {
    return tursoClient;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    logger.warn('Turso configuration missing - ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in production');
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  }

  const { createClient } = await import('@libsql/client');

  tursoClient = createClient({
    url,
    authToken
  });

  logger.info('Turso database initialized (URL present, token available)');



  return tursoClient;
}



/**
 * Obtém cliente Turso
 */
export function getTursoDb(): Client {
  if (!tursoClient) {
    throw new Error('Turso client not initialized. Call initTursoDb() first.');
  }
  return tursoClient;
}

/**
 * Wrapper compatível com better-sqlite3 para uso transparente
 */
export class TursoSqliteWrapper {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Prepare statement (compatibilidade com better-sqlite3)
   */
  prepare(sql: string) {
    const client = this.client;

    return {
      get: async (...params: InValue[]) => {
        try {
          const result = await client.execute({ sql, args: params });
          return result.rows[0] || null;
        } catch (err) {
          logger.error('Turso query error (get)', { sql, params, error: err });
          throw err;
        }
      },

      all: async (...params: InValue[]) => {
        try {
          const result = await client.execute({ sql, args: params });
          return result.rows;
        } catch (err) {
          logger.error('Turso query error (all)', { sql, params, error: err });
          throw err;
        }
      },

      run: async (...params: InValue[]) => {
        try {
          await client.execute({ sql, args: params });
        } catch (err) {
          logger.error('Turso query error (run)', { sql, params, error: err });
          throw err;
        }
      }
    };
  }

  /**
   * Executa SQL direto (compatibilidade)
   */
  async exec(sql: string): Promise<void> {
    try {
      await this.client.execute(sql);
    } catch (err) {
      logger.error('Turso exec error', { sql, error: err });
      throw err;
    }
  }
}
