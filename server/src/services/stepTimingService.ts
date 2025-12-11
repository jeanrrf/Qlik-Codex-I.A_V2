import { logger } from "../lib/logger";
import { sseEmitter } from "../lib/sseEmitter";
import { SubStepExecution } from "../types/optimization";

/**
 * Serviço para rastrear timing de sub-etapas dentro de cada etapa de otimização
 * Exemplo: Análise & Diagnóstico pode ter 4 sub-ações:
 *   1. Validação Sintática
 *   2. Análise de Segurança
 *   3. Extração de Metadados
 *   4. Diagnóstico de Padrões
 */
export class StepTimingService {
  private activeSteps: Map<string, number> = new Map();
  private activeSubSteps: Map<string, SubStepExecution> = new Map();
  private completedSubSteps: Map<string, SubStepExecution[]> = new Map();

  /**
   * Inicia o rastreamento de uma sub-etapa
   */
  startSubStep(
    stepId: string,
    subStepId: string,
    name: string,
    description?: string
  ): SubStepExecution {
    const subStep: SubStepExecution = {
      id: subStepId,
      name,
      description,
      status: "running",
      startTime: new Date()
    };

    this.activeSubSteps.set(`${stepId}:${subStepId}`, subStep);
    logger.info(`[SubStep] Started: ${name}`, { stepId, subStepId });

    // Envia via SSE
    sseEmitter.sendSubStepProgress(stepId, subStepId, name, 'running');

    return subStep;
  }

  /**
   * Completa o rastreamento de uma sub-etapa com sucesso
   */
  completeSubStep(
    stepId: string,
    subStepId: string,
    _result?: unknown
  ): SubStepExecution {
    const key = `${stepId}:${subStepId}`;
    const subStep = this.activeSubSteps.get(key);

    if (!subStep) {
      logger.warn(`[SubStep] Attempted to complete unknown substep`, {
        stepId,
        subStepId
      });
      return {
        id: subStepId,
        name: "Unknown",
        status: "error"
      };
    }

    subStep.endTime = new Date();
    subStep.duration = subStep.endTime.getTime() - (subStep.startTime?.getTime() ?? 0);
    subStep.status = "success";

    this.activeSubSteps.delete(key);

    // Armazenar no histórico completado
    if (!this.completedSubSteps.has(stepId)) {
      this.completedSubSteps.set(stepId, []);
    }
    this.completedSubSteps.get(stepId)!.push(subStep);

    logger.info(`[SubStep] Completed: ${subStep.name}`, {
      stepId,
      subStepId,
      duration: `${subStep.duration}ms`
    });

    // Envia via SSE
    sseEmitter.sendSubStepProgress(stepId, subStepId, subStep.name, 'success', `${subStep.duration}ms`);

    return subStep;
  }

  /**
   * Marca uma sub-etapa como erro
   */
  errorSubStep(
    stepId: string,
    subStepId: string,
    error: string
  ): SubStepExecution {
    const key = `${stepId}:${subStepId}`;
    const subStep = this.activeSubSteps.get(key);

    if (!subStep) {
      return {
        id: subStepId,
        name: "Unknown",
        status: "error",
        error
      };
    }

    subStep.endTime = new Date();
    subStep.duration = subStep.endTime.getTime() - (subStep.startTime?.getTime() ?? 0);
    subStep.status = "error";
    subStep.error = error;

    this.activeSubSteps.delete(key);

    // Armazenar no histórico
    if (!this.completedSubSteps.has(stepId)) {
      this.completedSubSteps.set(stepId, []);
    }
    this.completedSubSteps.get(stepId)!.push(subStep);

    logger.error(`[SubStep] Error: ${subStep.name}`, {
      stepId,
      subStepId,
      error,
      duration: `${subStep.duration}ms`
    });

    // Envia via SSE
    sseEmitter.sendSubStepProgress(stepId, subStepId, subStep.name, 'error', `${subStep.duration}ms`, error);

    return subStep;
  }

  /**
   * Retorna todas as sub-etapas completadas para uma etapa específica
   */
  getCompletedSubSteps(stepId: string): SubStepExecution[] {
    return this.completedSubSteps.get(stepId) ?? [];
  }

  /**
   * Limpa o histórico de sub-etapas (chamado ao iniciar um novo request)
   */
  reset(): void {
    this.activeSubSteps.clear();
    this.completedSubSteps.clear();
    this.activeSteps.clear();
  }

  /**
   * Controla o tempo total de uma etapa principal
   */
  start(stepId: string, name?: string): void {
    this.activeSteps.set(stepId, Date.now());
    sseEmitter.sendStepProgress(stepId, name ?? stepId, 'running');
  }

  stop(stepId: string, name?: string): number {
    const start = this.activeSteps.get(stepId);
    const duration = start ? Date.now() - start : 0;
    this.activeSteps.delete(stepId);
    sseEmitter.sendStepProgress(stepId, name ?? stepId, 'success', `${duration}ms`);
    return duration;
  }

  /**
   * Executa uma função com timing automático de sub-etapa
   */
  async executeWithTiming<T>(
    stepId: string,
    subStepId: string,
    name: string,
    fn: () => Promise<T>,
    description?: string
  ): Promise<T> {
    this.startSubStep(stepId, subStepId, name, description);

    try {
      const result = await fn();
      this.completeSubStep(stepId, subStepId, result);
      return result;
    } catch (error) {
      this.errorSubStep(stepId, subStepId, String(error));
      throw error;
    }
  }
}

export const stepTimingService = new StepTimingService();
