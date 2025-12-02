// web/src/types/api.ts

import type { ConsultancyDocument } from './consultancy';

export interface SubStepExecution {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "running" | "success" | "error" | "timeout";
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
  currentRunningTime?: number; // Tempo em tempo real da tarefa em execução (ms)
}

export type OptimizeMode = "analysis" | "ultra-expert";

export type LLMProviderName = "ainex" | "google" | "nvidia";

export type BreakingRisk = "none" | "low" | "medium" | "high";

export type ChangeCategory =
  | "performance"
  | "readability"
  | "cleanup"
  | "structure";

export interface OptimizeChange {
  category: ChangeCategory;
  area: string;
  before?: string;
  after?: string;
  impact: string;
  riskLevel: BreakingRisk;
}

export interface MetricsEstimate {
  loadComplexityBefore: "low" | "medium" | "high";
  loadComplexityAfter: "low" | "medium" | "high";
  maintainabilityBefore: "low" | "medium" | "high";
  maintainabilityAfter: "low" | "medium" | "high";
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// MÉTRICAS REAIS (v3.0) - Calculadas programaticamente
// ═══════════════════════════════════════════════════════════════
export interface RealMetrics {
  linesOfCode: number;
  codeLines: number;
  commentLines: number;
  commentRatio: number;
  cyclomaticComplexity: number;
  loadStatements: number;
  joinStatements: number;
  loopStatements: number;
  tableCount: number;
  selectStarCount: number;
  syntheticKeysRisk: number;
  cartesianProductRisk: number;
  residentLoadsCount: number;
  qvdOperations: number;
  sqlPushdownOpportunities: number;
  avgComplexityPerLoad: number;
  maintainabilityIndex: number;
}

export interface OptimizeResult {
  originalScript: string;
  optimizedScript: string;
  summary: string;
  analysis: {
    changes: OptimizeChange[];
    breakingRisk: BreakingRisk;
    safeToApply: boolean;
    mode: OptimizeMode;
    metricsEstimate: MetricsEstimate;
    realMetrics?: RealMetrics; // NOVO: métricas reais
    notes?: string;
    steps?: StepExecutionResult[];
  };
  documentationMarkdown: string;
  explanation?: string;
  consultancyDocument?: ConsultancyDocument;
}

export interface OptimizeScriptRequestBody {
  script: string;
  mode: OptimizeMode;
  llmProvider?: LLMProviderName;
  llmModel?: string;
  enableRealTimeProgress?: boolean;
}

export interface OptimizeScriptApiResponse extends OptimizeResult {
  status: "done";
  progress?: OptimizationProgress;
}

export interface QlikFormatterRequestBody {
  script: string;
  model?: string;
}

export interface QlikFormatterResponse {
  formattedScript: string;
  styleNotes?: string[];
  provider: LLMProviderName | "fallback";
  model?: string;
  actions?: Array<{
    id: string;
    applied: boolean;
    description: string;
    risk: "low" | "medium" | "high";
  }>;
}

// Tipos para progresso em tempo real
export type OptimizationStepCategory =
  | "pre_validation"
  | "structural_analysis"
  | "performance"
  | "quality"
  | "post_validation"
  | "result_generation";

export type StepStatus = "pending" | "running" | "success" | "timeout" | "error" | "skipped";

export interface StepExecutionResult {
  stepId: string;
  stepNumber: number;
  stepName: string;
  category: OptimizationStepCategory;
  status: StepStatus;
  startTime?: string;
  endTime?: string;
  duration?: number;
  provider?: LLMProviderName;
  model?: string;
  error?: string;
  metadata?: Record<string, any>;
  subSteps?: SubStepExecution[];
}

export interface ProviderAttempt {
  provider: LLMProviderName;
  model: string;
  timestamp: string;
  success: boolean;
  error?: string;
  duration: number;
}

export interface OptimizationProgress {
  requestId: string;
  totalSteps: number;
  currentStep: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  startTime: string;
  lastUpdate: string;
  estimatedTimeRemaining?: number;
  steps: StepExecutionResult[];
  providerAttempts: ProviderAttempt[];
  fallbackTriggered: boolean;
  fallbackReason?: string;
}

// Eventos de progresso em tempo real
export type ProgressEventType =
  | "step_start"
  | "step_complete"
  | "step_error"
  | "step_timeout"
  | "fallback"
  | "complete";

export interface ProgressEvent {
  type: ProgressEventType;
  requestId: string;
  timestamp: string;
  data: StepProgressData | FallbackData | CompleteData;
}

export interface ProgressData {
  steps: Array<{
    stepId: string;
    name: string;
    status: StepStatus;
    duration?: number;
    subSteps?: Array<{
      id: string;
      name: string;
      status: StepStatus;
      duration?: number;
    }>;
  }>;
  currentStep?: number;
  totalSteps?: number;
  completedSteps?: number;
  failedSteps?: number;
}

export interface StepProgressData {
  stepId: string;
  stepNumber: number;
  totalSteps: number;
  stepName: string;
  category: OptimizationStepCategory;
  status: StepStatus;
  duration?: number;
  provider?: LLMProviderName;
  model?: string;
  error?: string;
  result?: OptimizeChange[] | Record<string, unknown>;
}

export interface FallbackData {
  reason: string;
  failedStepId: string;
  attemptCount: number;
  providerAttempts: Array<{
    provider: string;
    error: string;
  }>;
}

export interface CompleteData {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalDuration: number;
  fallbackTriggered: boolean;
  result?: OptimizeResult;
}
