/**
 * Health Check Routes - PRODUCTION READY
 * Monitora saúde do sistema e disponibilidade dos serviços
 */

import os from 'os';

import { Router } from "express";

import { config } from "../lib/config";
import { googleProvider } from '../lib/llmProviders/googleProvider';
import { nvidiaProvider } from '../lib/llmProviders/nvidiaProvider';
import { logger } from '../lib/logger';
import { getTursoDb, initTursoDb } from "../lib/tursoDb";
import { cacheService } from '../services/cacheService';

export const healthRouter = Router();

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  latency?: number;
}

async function checkDatabase(): Promise<ServiceHealth> {
  try {
    const start = Date.now();
    // Turso only
    await initTursoDb();
    const client = getTursoDb();
    await client.execute("SELECT 1");

    const latency = Date.now() - start;
    return { status: 'up', latency };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkAIProvider(
  provider: { isAvailable: () => boolean },
  _name: string
): Promise<ServiceHealth> {
  try {
    const available = provider.isAvailable();
    return {
      status: available ? 'up' : 'down',
      message: available ? 'Ready' : 'Not configured'
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Health check completo
healthRouter.get("/health", async (_req, res) => {
  try {
    const [database, aiPrimary, aiSecondary] = await Promise.all([
      checkDatabase(),
      checkAIProvider(googleProvider, 'AINEX Primary'),
      checkAIProvider(nvidiaProvider, 'AINEX Secondary')
    ]);

    const cacheStats = cacheService.getStats();
    const services = { database, aiPrimary, aiSecondary, cache: cacheStats };

    const criticalDown = [database, aiPrimary, aiSecondary].filter(s => s.status === 'down').length;
    const status = criticalDown === 0 ? 'healthy' : criticalDown === 1 ? 'degraded' : 'unhealthy';

    const statusCode = status === 'unhealthy' ? 503 : 200;

    res.status(statusCode).json({
      status,
      service: "qlik-codex-ia-backend",
      version: config.version,
      mode: config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      services,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(os.totalmem() / 1024 / 1024)
      }
    });

    if (status !== 'healthy') {
      logger.warn('System health check: not healthy', { status, services });
    }
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness probe (Kubernetes)
healthRouter.get("/ready", async (_req, res) => {
  try {
    const db = await checkDatabase();
    const llm = await checkAIProvider(googleProvider, 'AINEX');

    if (db.status === 'up' && llm.status === 'up') {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Services not ready' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, error: String(error) });
  }
});

// Liveness probe (Kubernetes)
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ alive: true, uptime: process.uptime() });
});
