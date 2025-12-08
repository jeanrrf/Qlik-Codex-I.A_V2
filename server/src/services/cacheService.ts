/**
 * Cache Service - Evita reprocessamento de scripts idênticos
 * TTL: 1 hora por padrão
 */

import { createHash } from 'crypto';

import { logger } from '../lib/logger';

interface CacheEntry<T> {
  result: T;
  timestamp: number;
  hits: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly TTL: number;
  private readonly MAX_SIZE: number;

  constructor(ttlMs: number = 3600000, maxSize: number = 100) {
    this.TTL = ttlMs;
    this.MAX_SIZE = maxSize;

    // Cleanup automático a cada 5 minutos
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Gera chave de cache baseada no conteúdo
   */
  private generateKey(script: string, mode: string, provider?: string): string {
    const hash = createHash('sha256')
      .update(`${script}:${mode}:${provider || 'default'}`)
      .digest('hex');
    return hash;
  }

  /**
   * Busca no cache
   */
  get<T>(script: string, mode: string, provider?: string): T | null {
    const key = this.generateKey(script, mode, provider);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.TTL) {
      this.cache.delete(key);
      logger.debug('Cache entry expired', { key: key.substring(0, 8) });
      return null;
    }

    entry.hits++;
    logger.info('Cache HIT', {
      key: key.substring(0, 8),
      hits: entry.hits,
      age: `${Math.round(age / 1000)}s`
    });

    return entry.result as T;
  }

  /**
   * Armazena no cache
   */
  set<T>(script: string, mode: string, result: T, provider?: string): void {
    // Se cache está cheio, remove entrada mais antiga
    if (this.cache.size >= this.MAX_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0];

      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.debug('Cache eviction (max size reached)');
      }
    }

    const key = this.generateKey(script, mode, provider);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0
    });

    logger.info('Cache SET', {
      key: key.substring(0, 8),
      size: this.cache.size
    });
  }

  /**
   * Limpa entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info('Cache cleanup completed', { removed, remaining: this.cache.size });
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Estatísticas do cache
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const avgAge = entries.length > 0
      ? entries.reduce((sum, e) => sum + (Date.now() - e.timestamp), 0) / entries.length
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      totalHits,
      avgHits: entries.length > 0 ? totalHits / entries.length : 0,
      avgAgeMs: Math.round(avgAge),
      hitRate: totalHits > 0 ? (totalHits / (totalHits + this.cache.size)) : 0
    };
  }
}

// Singleton instance
export const cacheService = new CacheService();
