import { Response } from 'express';
import { logger } from './logger';

/**
 * Gerenciador de Server-Sent Events para streaming de progresso
 */
export class SSEEmitter {
  private clients: Set<Response> = new Set();
  private currentClient: Response | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Keep-alive a cada 15s
    this.keepAliveInterval = setInterval(() => {
      this.sendToAll({ type: 'ping' });
    }, 15000);
  }

  /**
   * Adiciona um cliente SSE
   */
  addClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.clients.add(res);
    logger.info('[SSE] Client connected', { total: this.clients.size });

    // Remove cliente ao desconectar
    res.on('close', () => {
      this.clients.delete(res);
      logger.info('[SSE] Client disconnected', { total: this.clients.size });
    });
  }

  /**
   * Define o cliente atual para receber atualizações de progresso
   */
  setCurrentClient(res: Response | null): void {
    this.currentClient = res;
    if (res) {
      logger.info('[SSE] Current client set for streaming');
    } else {
      logger.info('[SSE] Current client cleared');
    }
  }

  /**
   * Verifica se o cliente atual ainda está conectado
   */
  isCurrentClientConnected(): boolean {
    if (!this.currentClient) {
      return false;
    }

    // Verifica se a resposta ainda está aberta
    // @ts-ignore - accessing internal property
    const isOpen = !this.currentClient.writableEnded && !this.currentClient.destroyed;

    if (!isOpen) {
      logger.warn('[SSE] Current client disconnected during processing');
      this.currentClient = null;
      return false;
    }

    return true;
  }

  /**
   * Envia evento para todos os clientes
   */
  sendToAll(data: any): void {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(message);
      } catch (err) {
        logger.error('[SSE] Failed to send to client', { err });
        this.clients.delete(client);
      }
    });
  }

  /**
   * Envia evento para o cliente da requisição atual (durante otimização)
   */
  sendToCurrent(data: any): void {
    if (!this.currentClient) {
      logger.debug('[SSE] No current client set, skipping sendToCurrent');
      return;
    }

    // Verifica se o cliente ainda está conectado antes de enviar
    if (!this.isCurrentClientConnected()) {
      logger.warn('[SSE] Client disconnected, aborting send');
      return;
    }

    const message = `data: ${JSON.stringify(data)}\n\n`;
    try {
      this.currentClient.write(message);
      logger.debug('[SSE] Sent to current client', { type: data.type });
    } catch (err) {
      logger.error('[SSE] Failed to send to current client', { err });
      this.currentClient = null;
    }
  }

  /**
   * Envia progresso de sub-step
   */
  sendSubStepProgress(stepId: string, subStepId: string, name: string, status: 'running' | 'success' | 'error', duration?: string, error?: string): void {
    const data = {
      type: 'substep',
      substep: {
        id: subStepId,
        name,
        status,
        startTime: status === 'running' ? new Date().toISOString() : undefined,
        endTime: status === 'success' || status === 'error' ? new Date().toISOString() : undefined,
        duration: duration ? parseInt(duration) : undefined,
        error
      },
      stepId,
      timestamp: new Date().toISOString()
    };

    // Envia para o cliente atual (durante request ativa)
    this.sendToCurrent(data);
    // Também envia para todos os clientes conectados via /stream
    this.sendToAll(data);
  }

  /**
   * Envia progresso de etapa principal
   */
  sendStepProgress(stepId: string, name: string, status: 'running' | 'success' | 'error', duration?: string): void {
    const data = {
      type: 'step_progress',
      stepId,
      name,
      status,
      duration,
      timestamp: new Date().toISOString()
    };

    this.sendToCurrent(data);
    this.sendToAll(data);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    this.clients.forEach(client => client.end());
    this.clients.clear();
    this.currentClient = null;
  }
}

// Singleton global
export const sseEmitter = new SSEEmitter();
