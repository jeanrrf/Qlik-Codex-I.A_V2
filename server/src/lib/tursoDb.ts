/**
 * Turso Database Client - SQLite na Cloud (Cloudflare)
 * Único banco de dados utilizado pelo Qlik Codex I.A
 */

import type { Client, InValue } from '@libsql/client' assert { "resolution-mode": "import" };


import { logger } from './logger';

let tursoClient: Client | null = null;

/**
 * Inicializa cliente Turso
 */
export async function initTursoDb(): Promise<Client> {
  if (tursoClient) {
    logger.debug('Turso client already initialized, reusing existing connection');
    return tursoClient;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    logger.warn('Turso configuration missing - ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in production');
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  }

  logger.debug('Importing @libsql/client...');
  const { createClient } = await import('@libsql/client');

  logger.debug('Creating Turso client connection...', {
    url: url.substring(0, 30) + '...',
    hasAuthToken: Boolean(authToken)
  });

  tursoClient = createClient({
    url,
    authToken
  });

  // Test connection with a simple query
  logger.debug('Testing Turso connection...');
  try {
    await tursoClient.execute('SELECT 1');
    logger.info('✓ Turso database connection successful');
  } catch (err) {
    logger.error('✗ Turso connection test failed', err);
    throw new Error(`Failed to connect to Turso: ${err instanceof Error ? err.message : String(err)}`);
  }

  return tursoClient;
}


/**
 * Fecha cliente Turso, se existir.
 */
export async function closeTursoDb(): Promise<void> {
  if (!tursoClient) return;
  try {
    await tursoClient.close();
  } catch (err) {
    logger.error('Turso close error', { error: err });
  } finally {
    tursoClient = null;
  }
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
