// web/src/types/pipeline.ts
// Tipos robustos para o pipeline de otimização

import type { SubStepExecution } from './api';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES DE CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════

/** Timeout por tarefa individual (5 minutos) */
export const TASK_TIMEOUT_MS = 5 * 60 * 1000;

/** Timeout global do pipeline (15 minutos) */
export const GLOBAL_TIMEOUT_MS = 15 * 60 * 1000;

/** Intervalo de atualização do timer (100ms) */
export const TIMER_INTERVAL_MS = 100;

// ═══════════════════════════════════════════════════════════════
// TIPOS DE STATUS
// ═══════════════════════════════════════════════════════════════

export type StageStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'timeout';
export type PipelineStatus = 'idle' | 'running' | 'success' | 'error';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE TEMAS VISUAIS
// ═══════════════════════════════════════════════════════════════

export interface StageTheme {
  id: string;
  hex: string;
  rgb: string;
  icon: 'search' | 'zap' | 'shield' | 'check' | 'cpu' | 'code' | 'file-text';
}

export const STAGE_THEMES: StageTheme[] = [
  { id: 'analysis', hex: '#00f2ff', rgb: '0, 242, 255', icon: 'search' },
  { id: 'generation', hex: '#00ff9d', rgb: '0, 255, 157', icon: 'code' },
  { id: 'delivery', hex: '#ffb800', rgb: '255, 184, 0', icon: 'file-text' },
  { id: 'nvidia', hex: '#76b900', rgb: '118, 185, 0', icon: 'cpu' },
];

// ═══════════════════════════════════════════════════════════════
// INTERFACE DE STAGE (ETAPA)
// ═══════════════════════════════════════════════════════════════

export interface PipelineStage {
  /** Identificador único da etapa */
  id: string;
  /** Nome de exibição */
  name: string;
  /** Descrição curta */
  description?: string;
  /** Status atual */
  status: StageStatus;
  /** Se a etapa é visível na UI */
  visible: boolean;
  /** Timestamp de início */
  startTime?: number;
  /** Timestamp de fim */
  endTime?: number;
  /** Duração total em ms */
  duration?: number;
  /** Tempo de execução em tempo real (atualizado pelo timer) */
  currentRunningTime?: number;
  /** Mensagem de erro ou status */
  message?: string;
  /** Sub-tarefas da etapa */
  subSteps?: SubStepExecution[];
  /** Tema visual */
  theme?: StageTheme;
  /** Metadados do LLM */
  tokensConsumed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  thinkingContent?: string;
  provider?: string;
  model?: string;
}

// ═══════════════════════════════════════════════════════════════
// INTERFACE DE PROGRESSO DO PIPELINE
// ═══════════════════════════════════════════════════════════════

export interface PipelineProgress {
  /** Etapas do processo */
  stages: PipelineStage[];
  /** Progresso geral (0-100) */
  overallProgress: number;
  /** Índice da etapa atual */
  currentStageIndex: number;
  /** Tempo total decorrido em ms */
  elapsedTime: number;
  /** Status geral do pipeline */
  status: PipelineStatus;
  /** Mensagem de erro, se houver */
  errorMessage?: string;
  /** Lista de avisos (retries, etc) */
  warnings?: string[];
}

// ═══════════════════════════════════════════════════════════════
// DEFINIÇÕES DE STAGES POR MODO
// ═══════════════════════════════════════════════════════════════

/**
 * Cria uma sub-tarefa padrão
 */
function createSubStep(id: string, name: string, description?: string): SubStepExecution {
  return {
    id,
    name,
    description,
    status: 'pending',
  };
}

/**
 * Cria uma stage padrão
 */
function createStage(
  id: string,
  name: string,
  theme: StageTheme,
  subSteps?: SubStepExecution[],
  description?: string
): PipelineStage {
  return {
    id,
    name,
    description,
    status: 'pending',
    visible: true,
    theme,
    subSteps,
  };
}

// ═══════════════════════════════════════════════════════════════
// STAGES: ULTRA EXPERT MODE
// ═══════════════════════════════════════════════════════════════

export const ULTRA_EXPERT_STAGES: PipelineStage[] = [
  createStage(
    'ANALYSIS_AND_PLAN',
    'Análise & Estratégia',
    STAGE_THEMES[0],
    [
      createSubStep('ANALYSIS_AND_PLAN', 'Análise & Planejamento', 'Análise estrutural e planejamento de otimizações'),
    ],
    'Análise do script e planejamento de otimizações'
  ),
  createStage(
    'CODE_GEN',
    'Geração de Código',
    STAGE_THEMES[1],
    [
      createSubStep('CODE_GEN', 'Gerando Código Otimizado', 'Aplicando otimizações ao script Qlik'),
    ],
    'Geração do código otimizado com base no plano'
  ),
  createStage(
    'FINAL_DELIVERY',
    'Entrega Final & Relatório',
    STAGE_THEMES[2],
    [
      createSubStep('FINAL_DELIVERY', 'Validação & Documentação', 'Validando, documentando e gerando relatório'),
    ],
    'Validação final e geração de documentação'
  ),
];

// ═══════════════════════════════════════════════════════════════
// STAGES: NVIDIA FAST MODE
// ═══════════════════════════════════════════════════════════════

export const NVIDIA_FAST_STAGES: PipelineStage[] = [
  createStage(
    'NVIDIA_FAST',
    'NVIDIA Fast Refactor',
    STAGE_THEMES[3],
    [
      createSubStep('GPU_OPTIMIZATION', 'Otimização GPU', 'Refatoração acelerada via GPU NVIDIA'),
    ],
    'Refatoração rápida usando aceleração GPU'
  ),
];

// ═══════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════

/**
 * Retorna as stages para o modo especificado
 */
export function getStagesForMode(mode: 'ultra-expert' | 'nvidia-fast'): PipelineStage[] {
  const stages = mode === 'nvidia-fast' ? NVIDIA_FAST_STAGES : ULTRA_EXPERT_STAGES;
  return stages.map(s => ({
    ...s,
    status: 'pending' as const,
    subSteps: s.subSteps?.map(sub => ({ ...sub, status: 'pending' as const })),
  }));
}

/**
 * Retorna as stages filtradas por intent
 * - "audit": Remove CODE_GEN (apenas análise + relatório)
 * - "refactor": Remove FINAL_DELIVERY (apenas código, sem relatório)
 */
export function getStagesForIntent(
  mode: 'ultra-expert' | 'nvidia-fast',
  intent: 'audit' | 'refactor' = 'refactor'
): PipelineStage[] {
  const stages = getStagesForMode(mode);

  if (mode === 'ultra-expert') {
    if (intent === 'audit') {
      // Modo Relatório: Remove CODE_GEN (apenas análise + relatório)
      return stages.filter(s => s.id !== 'CODE_GEN');
    } else {
      // Modo Código: Remove FINAL_DELIVERY (apenas código, sem relatório)
      return stages.filter(s => s.id !== 'FINAL_DELIVERY');
    }
  }

  return stages;
}

/**
 * Reseta todas as stages para pending
 */
export function resetStagesToPending(stages: PipelineStage[]): PipelineStage[] {
  return stages.map(s => ({
    ...s,
    status: 'pending' as const,
    startTime: undefined,
    endTime: undefined,
    duration: undefined,
    currentRunningTime: undefined,
    message: undefined,
    tokensConsumed: undefined,
    thinkingContent: undefined,
    provider: undefined,
    model: undefined,
    subSteps: s.subSteps?.map(sub => ({
      ...sub,
      status: 'pending' as const,
      startTime: undefined,
      endTime: undefined,
      duration: undefined,
      currentRunningTime: undefined,
      error: undefined,
    })),
  }));
}

/**
 * Calcula progresso geral baseado em stages completas
 */
export function calculateOverallProgress(stages: PipelineStage[]): number {
  if (stages.length === 0) return 0;
  const progressSum = stages.reduce((sum, stage) => {
    // Etapas concluA-das, ignoradas ou com erro contam como finalizadas
    if (stage.status === 'success' || stage.status === 'skipped' || stage.status === 'error' || stage.status === 'timeout') {
      return sum + 1;
    }

    // Etapas com subtarefas usam o progresso relativo dos substeps
    if (stage.subSteps && stage.subSteps.length > 0) {
      const completed = stage.subSteps.filter(s => s.status === 'success').length;
      const running = stage.subSteps.filter(s => s.status === 'running').length;
      const hasActivity = completed + running > 0;
      const fraction = (completed + running * 0.5) / stage.subSteps.length;
      return sum + (hasActivity ? fraction : 0.15);
    }

    // Etapa sem subtarefas em execuA-ao recebe peso parcial para evitar pulo de 0->100
    if (stage.status === 'running') {
      return sum + 0.3;
    }

    return sum;
  }, 0);

  return Math.min(100, Math.round((progressSum / stages.length) * 100));
}

/**
 * Determina status da stage baseado nos substeps
 */
export function calculateStageStatus(subSteps: SubStepExecution[]): StageStatus {
  if (!subSteps || subSteps.length === 0) return 'pending';

  const hasError = subSteps.some(s => s.status === 'error');
  const hasTimeout = subSteps.some(s => s.status === 'timeout');
  const allCompleted = subSteps.every(s => s.status === 'success');
  const hasRunning = subSteps.some(s => s.status === 'running');

  if (hasError) return 'error';
  if (hasTimeout) return 'timeout';
  if (allCompleted) return 'success';
  if (hasRunning) return 'running';
  return 'pending';
}

/**
 * Calcula duração total de uma stage baseado nos substeps
 */
export function calculateStageDuration(stage: PipelineStage): number {
  if (!stage.subSteps || stage.subSteps.length === 0) {
    return (stage.duration || 0) + (stage.currentRunningTime || 0);
  }

  return stage.subSteps.reduce((sum, sub) => {
    const baseDuration = sub.duration || 0;
    const runningTime = sub.status === 'running' && sub.currentRunningTime ? sub.currentRunningTime : 0;
    return sum + baseDuration + runningTime;
  }, 0);
}

/**
 * Obtém label de status localizado
 */
export function getStatusLabel(status: StageStatus): string {
  const labels: Record<StageStatus, string> = {
    pending: 'Aguardando',
    running: 'Executando',
    success: 'Concluído',
    error: 'Erro',
    skipped: 'Ignorado',
    timeout: 'Timeout',
  };
  return labels[status] || 'Desconhecido';
}

/**
 * Estado inicial do pipeline
 */
export function createInitialProgress(mode: 'ultra-expert' | 'nvidia-fast' = 'ultra-expert'): PipelineProgress {
  return {
    stages: getStagesForMode(mode),
    overallProgress: 0,
    currentStageIndex: -1,
    elapsedTime: 0,
    status: 'idle',
    warnings: [],
  };
}
