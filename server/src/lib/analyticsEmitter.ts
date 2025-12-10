import { Response } from 'express';

import { logger } from './logger';

/**
 * Small SSE emitter dedicated to analytics streaming.
 */
class AnalyticsSseEmitter {
  private clients = new Set<Response>();
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.keepAliveTimer = setInterval(() => {
      this.sendToAll({ type: 'ping' });
    }, 20000);
  }

  public addClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.clients.add(res);
    logger.info('[Analytics SSE] Client connected', { total: this.clients.size });

    res.on('close', () => {
      this.clients.delete(res);
      logger.info('[Analytics SSE] Client disconnected', { total: this.clients.size });
    });
  }

  public sendToAll(payload: unknown): void {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.write(message);
      } catch (err) {
        logger.error('[Analytics SSE] Failed to send message', { error: err });
        this.clients.delete(client);
      }
    });
  }

  public destroy(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    this.clients.forEach((client) => client.end());
    this.clients.clear();
  }
}

export const analyticsEmitter = new AnalyticsSseEmitter();
