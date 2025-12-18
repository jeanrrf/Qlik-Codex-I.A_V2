import { useState, useCallback, useRef } from "react";

import { OptimizeScriptApiResponse, OptimizeMode, LLMProviderName, StepExecutionResult } from "../types/api";

import { SubStepExecution } from "../types/api";

import { getAuthHeaders, resolveApiUrl } from "../api/client";

// Importar tipos centralizados do pipeline
import {
  PipelineStage,
  PipelineProgress,
  TASK_TIMEOUT_MS,
  getStagesForMode as getStagesFromPipeline,
  resetStagesToPending as resetStagesFromPipeline,
  calculateOverallProgress as calcProgressFromPipeline,
  calculateStageStatus as calcStatusFromPipeline,
} from '../types/pipeline';

// Importar tipos dos componentes de progresso

import type { ScriptAnalysisData } from '../types/ui';

// Re-export tipos para retrocompatibilidade
export type OptimizationStage = PipelineStage;
export type OptimizationProgress = PipelineProgress;



interface OptimizationOptions {

  script: string;

  mode: OptimizeMode;

  llmProvider?: LLMProviderName;

  llmModel?: string;

}

// Usar funções centralizadas do pipeline
const getStagesForMode = getStagesFromPipeline;
const resetStagesToPending = resetStagesFromPipeline;
const calculateOverallProgress = calcProgressFromPipeline;
const calculateStageStatus = calcStatusFromPipeline;

// Initial stages usa as definições centralizadas
const INITIAL_STAGES = getStagesForMode('ultra-expert');



export interface UseOptimizationProgressReturn {

  /** Progresso atual */

  progress: OptimizationProgress;

  /** Resultado da otimização quando completa */

  result: OptimizeScriptApiResponse | null;

  /** Inicia a otimização com progresso real */

  startOptimization: (options: OptimizationOptions) => Promise<OptimizeScriptApiResponse | null>;

  /** Reseta o progresso */

  reset: () => void;

  /** Reseta o progresso (alias) */

  resetProgress: () => void;

  /** Atualiza o modo e stages correspondentes */

  updateMode: (mode: OptimizeMode) => void;

  /** Se está em execução */

  isRunning: boolean;

  /** SSE: Conectar ao stream de progresso (não usado para agora, API é POST, não SSE) */

  connect: () => void;

  /** SSE: Desconectar do stream */

  disconnect: () => void;

  /** SSE: Status da conexão (sempre false para API POST) */

  isConnected: boolean;

  /** Mensagem de status em tempo real */
  liveMessage: string | null;

  /** SSE: Análise do script (estrutura, QVD operations, estratégia) */

  scriptAnalysis: ScriptAnalysisData | null;



  /** SSE: Passo atual em execução */

  currentStep: string | null;

  /** SSE: Mensagem de erro do stream */

  error: string | null;

  /** Para a otimização em andamento */

  stop: () => void;

  /** Restaura o progresso de uma sessão salva */
  restoreProgress: (savedProgress: OptimizationProgress) => void;
}

/**

 * Hook para gerenciar progresso real da otimização

 * 

 * Sincroniza etapas de UI com a execução real da API,

 * usando timing estimado baseado na complexidade do script.

 */

export function useOptimizationProgress(): UseOptimizationProgressReturn {

  const [currentMode, setCurrentMode] = useState<OptimizeMode>("ultra-expert");

  const [progress, setProgress] = useState<OptimizationProgress>({

    stages: INITIAL_STAGES.map(s => ({ ...s })),

    overallProgress: 0,

    currentStageIndex: -1,

    elapsedTime: 0,

    status: "idle"

  });



  const [result, setResult] = useState<OptimizeScriptApiResponse | null>(null);

  const [isRunning, setIsRunning] = useState(false);



  // Estados SSE para progresso de chunking e análise

  const [isConnected] = useState(false); // POST com SSE - conexão via fetch stream

  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysisData | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);



  const startTimeRef = useRef<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const taskStartTimeRef = useRef<Map<string, number>>(new Map()); // Rastrear início de cada tarefa

  const taskTimeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map()); // Timeouts individuais

  // Auto-retry state
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);



  const updateStage = useCallback((stageIndex: number, updates: Partial<OptimizationStage>) => {

    setProgress(prev => {

      const newStages = [...prev.stages];

      if (stageIndex >= 0 && stageIndex < newStages.length) {

        newStages[stageIndex] = { ...newStages[stageIndex], ...updates };

      }



      return {

        ...prev,

        stages: newStages,

        overallProgress: calculateOverallProgress(newStages),

        currentStageIndex: stageIndex

      };

    });

  }, []);



  const reset = useCallback(() => {

    if (intervalRef.current) {

      clearInterval(intervalRef.current);

      intervalRef.current = null;

    }

    if (abortRef.current) {

      abortRef.current.abort();

      abortRef.current = null;

    }



    // Limpa todos os timeouts de tarefas

    taskTimeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));

    taskTimeoutRefs.current.clear();

    taskStartTimeRef.current.clear();



    // Usa as stages do modo atual

    const stagesToReset = getStagesForMode(currentMode);

    setProgress({

      stages: resetStagesToPending(stagesToReset),

      overallProgress: 0,

      currentStageIndex: -1,

      elapsedTime: 0,

      status: "idle"

    });

    setResult(null);

    setIsRunning(false);
    setLiveMessage(null);

  }, [currentMode]);



  // Adicionado para cancelar a otimização

  const stop = useCallback(() => {

    if (abortRef.current) {

      abortRef.current.abort();

      console.warn("Optimization aborted by user.");

    }

    if (intervalRef.current) {

      clearInterval(intervalRef.current);

    }

    setIsRunning(false);
    setLiveMessage("Otimização cancelada pelo usuário.");

    setProgress(prev => ({

      ...prev,

      status: "error",

      errorMessage: "Otimização cancelada pelo usuário."

    }));

  }, []);



  // Método para atualizar o modo e stages correspondentes

  const updateMode = useCallback((newMode: OptimizeMode) => {

    if (isRunning) return; // Não permite mudança durante execução



    setCurrentMode(newMode);

    const newStages = getStagesForMode(newMode);

    setProgress(prev => ({

      ...prev,

      stages: resetStagesToPending(newStages)

    }));

  }, [isRunning]);



  const startOptimization = useCallback(async (options: OptimizationOptions): Promise<OptimizeScriptApiResponse | null> => {

    // Reset retry count on a fresh start
    retryCountRef.current = 0;
    isRetryingRef.current = false;

    // Atualiza o modo atual e seleciona as stages corretas

    setCurrentMode(options.mode);

    const stagesToUse = getStagesForMode(options.mode);



    // Limpa estados SSE de execução anterior

    setScriptAnalysis(null);

    setCurrentStep(null);

    setError(null);
    setLiveMessage("Inicializando pipeline...");



    setIsRunning(true);

    startTimeRef.current = Date.now();

    abortRef.current = new AbortController();

    // Global Timeout Safeguard (15 min) — abort and fail fast, no auto-restarts
    const globalTimeoutId = setTimeout(() => {
      console.warn("[GLOBAL TIMEOUT] Tempo limite global excedido.");

      if (abortRef.current) abortRef.current.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setError("Tempo limite global excedido (15 min). A operação foi cancelada.");
      setLiveMessage("Tempo limite global excedido (15 min).");
      setProgress(prev => ({ ...prev, status: "error", errorMessage: "Tempo limite global excedido (15 min)." }));
      setIsRunning(false);
    }, 15 * 60 * 1000);

    // Inicia com as stages corretas para este modo

    setProgress(prev => ({

      ...prev,

      stages: stagesToUse,

      overallProgress: 0,

      currentStageIndex: 0,

      elapsedTime: 0,

      status: "running"

    }));
    setLiveMessage(`Iniciando ${stagesToUse[0]?.name || 'pipeline'}...`);



    // Timer para atualizar tempo decorrido E tempo real de cada tarefa em execução

    intervalRef.current = setInterval(() => {

      const now = Date.now();

      setProgress(prev => {

        // Atualiza tempo geral

        const newProgress = {

          ...prev,

          elapsedTime: now - startTimeRef.current

        };



        // Atualiza tempo real de cada tarefa em execução
        newProgress.stages = prev.stages.map(stage => {
          // Update stage running time if stage itself is running
          let stageRunningTime = stage.currentRunningTime;
          if (stage.status === 'running' && stage.startTime) {
            stageRunningTime = now - stage.startTime;
          }

          if (!stage.subSteps) {
            return { ...stage, currentRunningTime: stageRunningTime };
          }

          const updatedSubSteps = stage.subSteps.map(sub => {
            if (sub.status === 'running') {
              const taskStartTime = taskStartTimeRef.current.get(sub.id);
              if (taskStartTime) {
                const runningTime = now - taskStartTime;
                return { ...sub, currentRunningTime: runningTime };
              }
            }
            return sub;
          });

          return { ...stage, subSteps: updatedSubSteps, currentRunningTime: stageRunningTime };
        });



        return newProgress;

      });

    }, 100); // Atualiza a cada 100ms



    // Marca primeira etapa como rodando

    updateStage(0, { status: "running", startTime: Date.now() });



    try {

      const response = await fetch(resolveApiUrl("/scripts/optimize"), {

        method: "POST",

        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",

          "Accept": "text/event-stream",

        },

        body: JSON.stringify({

          script: btoa(unescape(encodeURIComponent(options.script))),

          encoding: "base64",

          mode: options.mode,

          llmProvider: options.llmProvider,

          llmModel: options.llmModel

        }),

        credentials: "include",

        signal: abortRef.current.signal

      });



      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;

        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          }

          // Add helpful context for common errors
          if (response.status === 403) {
            if (errorData?.requiresAuth) {
              errorMessage = `🔒 ${errorMessage}\n\nDica: Faça login ou use o modo NVIDIA Fast para visitantes.`;
            } else {
              errorMessage = `🔒 Acesso negado: ${errorMessage}`;
            }
          } else if (response.status === 429) {
            errorMessage = `⏱️ ${errorMessage}`;
          }
        } catch {
          // If JSON parsing fails, try plain text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // Keep default error message
          }
        }

        throw new Error(errorMessage);
      }



      if (!response.body) {

        throw new Error("Resposta sem body stream");

      }



      const reader = response.body.getReader();

      const decoder = new TextDecoder();

      let buffer = "";



      // Processa stream SSE

      while (true) {

        const { done, value } = await reader.read();

        if (done) break;



        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');

        buffer = lines.pop() || "";



        for (const line of lines) {

          if (!line.trim() || !line.startsWith('data: ')) continue;



          const jsonStr = line.slice(6).trim();

          if (!jsonStr) continue;



          try {

            const event = JSON.parse(jsonStr);

            // DEBUG: Log all SSE events for troubleshooting
            console.warn('[SSE Event]', event.type, {
              stepId: event.stepId,
              substepId: event.substep?.id,
              status: event.substep?.status || event.status
            });

            // Tratamento de eventos SSE

            if (event.type === 'script_analysis') {

              setScriptAnalysis(event.data);
              setLiveMessage("AnA­lise do script em execuAAœo...");

            } else if (event.type === 'provider_disabled') {

              const providerMsg = `Provedor ${event.provider}/${event.model} desativado nesta sessão por limite: ${event.reason || 'cota atingida'}`;
              setError(providerMsg);
              setProgress(prev => ({
                ...prev,
                errorMessage: providerMsg
              }));
              setLiveMessage(providerMsg);

            } else if (event.type === 'token_usage') {
              // NOVO: Captura tokens consumidos e propaga para a UI
              console.warn('[SSE Frontend] token_usage:', event);
              setLiveMessage(`Gerando código (${event.provider}/${event.model})`);
              setProgress(prev => {
                const newStages = prev.stages.map(stage => {
                  const stageId = event.taskName; // e.g., "CODE_GEN"
                  if (stage.id === stageId || (stage.subSteps && stage.subSteps.some(s => s.id.includes(stageId)))) {
                    return {
                      ...stage,
                      tokensConsumed: event.tokensConsumed,
                      provider: event.provider,
                      model: event.model
                    };
                  }
                  return stage;
                });
                return {
                  ...prev,
                  stages: newStages,
                  overallProgress: calculateOverallProgress(newStages),
                  currentStageIndex: newStages.findIndex(s => s.status === 'running')
                };
              });

            } else if (event.type === 'thinking') {
              // NOVO: Captura thinking content do Gemini 2.5 Flash Thinking Mode
              console.warn('[SSE Frontend] thinking:', event.taskName, event.thinkingContent?.substring(0, 100) + '...');
              setLiveMessage("Modelo estruturando resposta...");
              setProgress(prev => {
                const newStages = prev.stages.map(stage => {
                  const stageId = event.taskName;
                  if (stage.id === stageId || (stage.subSteps && stage.subSteps.some(s => s.id.includes(stageId)))) {
                    return {
                      ...stage,
                      thinkingContent: event.thinkingContent
                    };
                  }
                  return stage;
                });
                return {
                  ...prev,
                  stages: newStages,
                  overallProgress: calculateOverallProgress(newStages),
                  currentStageIndex: newStages.findIndex(s => s.status === 'running')
                };
              });

            } else if (event.type === 'provider_attempt_failed') {
              const warningMsg = `Tentativa falhou (${event.attempt}/${event.maxAttempts}): ${event.provider} - ${event.error}`;
              console.warn('[SSE Frontend]', warningMsg);
              setProgress(prev => ({
                ...prev,
                warnings: [...(prev.warnings || []), warningMsg]
              }));
              setLiveMessage(warningMsg);

            } else if (event.type === 'step_progress') {
              // Backend sending coarse-grained progress (e.g., NVIDIA Fast)
              const stepId: string = event.stepId || event.name || 'unknown';
              const status = event.status as 'pending' | 'running' | 'success' | 'error' | 'timeout' | 'skipped' | undefined;
              const duration = typeof event.duration === 'string' && event.duration.endsWith('ms')
                ? Number(event.duration.replace('ms', ''))
                : (typeof event.duration === 'number' ? event.duration : undefined);

              const mapStepToStage = (id: string): string | null => {
                if (id === 'nvidia_fast' || id === 'NVIDIA_FAST') return 'NVIDIA_FAST';
                if (id.toLowerCase().includes('analysis')) return 'ANALYSIS_AND_PLAN';
                if (id.toLowerCase().includes('code')) return 'CODE_GEN';
                if (id.toLowerCase().includes('final') || id.toLowerCase().includes('delivery')) return 'FINAL_DELIVERY';
                return null;
              };

              const targetStageId = mapStepToStage(stepId);
              if (targetStageId) {
                setProgress(prev => {
                  const newStages = prev.stages.map(stage => {
                    if (stage.id !== targetStageId) return stage;
                    return {
                      ...stage,
                      status: status || stage.status,
                      duration: duration ?? stage.duration,
                      endTime: (status === 'success' || status === 'error' || status === 'timeout') ? Date.now() : stage.endTime,
                      subSteps: stage.subSteps?.map(sub => ({
                        ...sub,
                        status: status === 'success' ? 'success' : sub.status,
                        endTime: status === 'success' ? Date.now() : sub.endTime,
                        duration: status === 'success' && sub.duration ? sub.duration : sub.duration
                      }))
                    };
                  });

                  return {
                    ...prev,
                    stages: newStages,
                    overallProgress: calculateOverallProgress(newStages),
                    currentStageIndex: newStages.findIndex(s => s.status === 'running')
                  };
                });
              }

            } else if (event.type === 'substep') {

              // Atualiza substep em tempo real

              console.warn('[SSE Frontend] Received substep event:', event.substep);

              const sub = event.substep as SubStepExecution;



              // Se está iniciando uma tarefa (status = running), registra o tempo e inicia timeout

              if (sub.status === 'running') {

                const taskId = sub.id;

                taskStartTimeRef.current.set(taskId, Date.now());
                setLiveMessage(`Executando ${sub.name || sub.id}...`);



                // Configura timeout de 3 minutos para esta tarefa (sem auto-restart)
                const timeoutId = setTimeout(() => {
                  console.warn(`[TIMEOUT] Tarefa ${taskId} excedeu ${TASK_TIMEOUT_MS / 1000}s!`);

                  if (abortRef.current) {
                    abortRef.current.abort();
                  }
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                  }
                  clearTimeout(globalTimeoutId);

                  setError('Timeout: Tarefa excedeu 3 minutos');

                  setLiveMessage('Timeout: Tarefa excedeu 3 minutos');

                  setProgress(prev => {

                    const newStages = prev.stages.map(stage => {

                      if (!stage.subSteps) return stage;

                      const subIdx = stage.subSteps.findIndex(s => s.id === taskId);

                      if (subIdx === -1) return stage;



                      const newSubSteps = [...stage.subSteps];

                      newSubSteps[subIdx] = {

                        ...newSubSteps[subIdx],

                        status: 'timeout' as const,

                        error: 'Timeout: Tarefa excedeu 3 minutos',

                        duration: TASK_TIMEOUT_MS,

                        endTime: Date.now()

                      };



                      return {

                        ...stage,

                        subSteps: newSubSteps,

                        status: 'error' as const

                      };

                    });

                    return { ...prev, stages: newStages, status: 'error' as const, errorMessage: 'Timeout: Tarefa excedeu 3 minutos' };

                  });

                  setIsRunning(false);

                }, TASK_TIMEOUT_MS);



                taskTimeoutRefs.current.set(taskId, timeoutId);

              }



              // Se finalizou (success/error), limpa o timeout

              if (sub.status === 'success' || sub.status === 'error') {

                const taskId = sub.id;

                const timeoutId = taskTimeoutRefs.current.get(taskId);

                if (timeoutId) {

                  clearTimeout(timeoutId);

                  taskTimeoutRefs.current.delete(taskId);

                }

                taskStartTimeRef.current.delete(taskId);
                if (sub.status === 'success') {
                  setLiveMessage(`${sub.name || sub.id} concluA­do`);
                } else if (sub.status === 'error') {
                  setLiveMessage(`Erro em ${sub.name || sub.id}`);
                }

              }



              // Helper para mapear tasks dinâmicas para suas parent stages
              const getStageIdForSubTask = (taskId: string): string | null => {
                const upper = taskId.toUpperCase();
                // ANALYSIS_AND_PLAN stage
                if (upper.includes('ANALYSIS') || upper.includes('DEEP_ANALYSIS') || upper.includes('STRATEGIC_PLAN') || upper === 'ANALYSIS_AND_PLAN') return 'ANALYSIS_AND_PLAN';
                // CODE_GEN stage
                if (upper.includes('CODE_GEN') || upper.includes('CODEGEN')) return 'CODE_GEN';
                // FINAL_DELIVERY stage
                if (upper.includes('FINAL_DELIVERY') || upper.includes('VALIDATION') || upper.includes('DELIVERY')) return 'FINAL_DELIVERY';
                // NVIDIA_FAST stage
                if (upper.includes('NVIDIA') || upper.includes('GPU')) return 'NVIDIA_FAST';
                return null;
              };

              setProgress(prev => {
                const newStages = prev.stages.map(stage => {
                  let newSubSteps = stage.subSteps ? [...stage.subSteps] : [];

                  // Tenta encontrar a task existente
                  let subIdx = newSubSteps.findIndex(s => s.id === sub.id);

                  // Se não encontrou por ID exato, tenta encontrar por "match" de stage ou conteúdo
                  if (subIdx === -1) {
                    const targetStageId = getStageIdForSubTask(sub.id);
                    if (targetStageId === stage.id) {
                      // Tenta encontrar um substep que "contém" o ID ou vice-versa
                      // Ex: sub.id="CODE_GEN_ATTEMPT_1" matches stage substep "CODE_GEN"
                      const matchIdx = newSubSteps.findIndex(s =>
                        sub.id.toUpperCase().includes(s.id.toUpperCase()) ||
                        s.id.toUpperCase().includes(sub.id.toUpperCase())
                      );

                      if (matchIdx !== -1) {
                        subIdx = matchIdx;
                      } else {
                        // Se não tem match de nome mas pertence a esta stage, 
                        // tenta atualizar o primeiro pendente para evitar criar tasks infinitas
                        const firstPending = newSubSteps.findIndex(s => s.status === 'pending');
                        if (firstPending !== -1) {
                          subIdx = firstPending;
                        }
                      }
                    }
                  }

                  if (subIdx !== -1) {
                    // ATUALIZA task existente
                    newSubSteps[subIdx] = {
                      ...newSubSteps[subIdx],
                      status: sub.status,
                      startTime: sub.startTime || newSubSteps[subIdx].startTime,
                      endTime: sub.endTime || newSubSteps[subIdx].endTime,
                      duration: sub.duration || newSubSteps[subIdx].duration,
                      error: sub.error || newSubSteps[subIdx].error
                    };
                  } else {
                    // Tenta adicionar NOVA task dinâmica se pertencer a esta stage
                    const targetStageId = getStageIdForSubTask(sub.id);
                    if (targetStageId === stage.id) {
                      console.warn(`[Frontend] Adicionando task dinâmica ${sub.id} para stage ${stage.id}`);
                      newSubSteps.push({
                        id: sub.id,
                        name: sub.name || sub.id, // Fallback name
                        status: sub.status,
                        startTime: sub.startTime || Date.now(),
                        endTime: sub.endTime,
                        duration: sub.duration,
                        error: sub.error
                      });
                    } else {
                      // Se não pertence a esta stage, retorna sem alterações (exceto se tivermos que recalcular status)
                      return stage;
                    }
                  }

                  // Atualiza status da stage pai baseado nos substeps
                  const stageStatus = calculateStageStatus(newSubSteps);

                  return {
                    ...stage,
                    subSteps: newSubSteps,
                    status: stageStatus,
                    startTime: stageStatus === 'running' && !stage.startTime ? Date.now() : stage.startTime,
                    endTime: stageStatus === 'success' || stageStatus === 'error' ? Date.now() : undefined
                  };
                });

                return {
                  ...prev,
                  stages: newStages,
                  overallProgress: calculateOverallProgress(newStages),
                  currentStageIndex: newStages.findIndex(s => s.status === 'running')
                };
              });


            } else if (event.type === 'complete') {

              // Processamento final

              const data: OptimizeScriptApiResponse = event.result;

              // Vamos atualizar stages e só finalizar quando todas as etapas estiverem concluídas
              let isFullyComplete = false;
              let finalElapsed = 0;

              setProgress(prev => {
                // Força conclusão para modos sem granularidade (ex.: NVIDIA Fast)
                const needsForce = prev.stages.every(s => s.status !== 'success');
                const baseStages = needsForce ? prev.stages.map(stage => ({
                  ...stage,
                  status: 'success' as const,
                  endTime: Date.now(),
                  duration: stage.duration ?? (stage.currentRunningTime || 0),
                  subSteps: stage.subSteps?.map(sub => ({
                    ...sub,
                    status: 'success' as const,
                    endTime: Date.now(),
                    duration: sub.duration ?? sub.currentRunningTime
                  }))
                })) : prev.stages.map(stage => ({
                  ...stage,
                  subSteps: stage.subSteps?.map(sub => ({ ...sub }))
                }));

                // Determina se a otimização foi bem-sucedida
                const isOptimizationSuccess = !!(data.optimizedScript || data.response?.optimizedScript);

                const updatedStages = [...baseStages];

                // Se otimização foi sucesso, força TODAS as stages e subtasks para success
                // Isso resolve o problema de IDs dinâmicos que não fazem match com o backend
                if (isOptimizationSuccess) {
                  updatedStages.forEach(stage => {
                    stage.status = "success";
                    if (stage.subSteps) {
                      stage.subSteps.forEach(sub => {
                        sub.status = "success";
                      });
                      // Calcula duração total da stage somando subtasks
                      const totalDuration = stage.subSteps.reduce((acc, sub) => acc + (sub.duration || 0), 0);
                      if (totalDuration > 0) {
                        stage.duration = totalDuration;
                      }
                    }
                  });
                } else {
                  // Fallback: tenta atualizar os sub-steps com dados reais da API
                  if (data.analysis?.steps) {
                    const optStep = data.analysis.steps.find((s: StepExecutionResult) => s.stepId === "opt_main");

                    if (optStep?.subSteps && Array.isArray(optStep.subSteps)) {
                      optStep.subSteps.forEach((realSub: SubStepExecution) => {
                        for (const stage of updatedStages) {
                          if (!stage.subSteps) continue;
                          const subIdx = stage.subSteps.findIndex(s => s.id === realSub.id);
                          if (subIdx !== -1) {
                            stage.subSteps[subIdx] = {
                              ...stage.subSteps[subIdx],
                              status: realSub.status || "success",
                              startTime: realSub.startTime,
                              endTime: realSub.endTime,
                              duration: realSub.duration,
                              error: realSub.error
                            };
                            break;
                          }
                        }
                      });
                    }
                  }

                  // Recalcula status/duração das stages baseado nos sub-steps atualizados
                  updatedStages.forEach(stage => {
                    if (stage.subSteps && stage.subSteps.length > 0) {
                      stage.status = calculateStageStatus(stage.subSteps);
                      if (stage.status === "success") {
                        stage.duration = stage.subSteps.reduce((acc, sub) => acc + (sub.duration || 0), 0);
                      }
                    }
                  });
                }



                const overall = calculateOverallProgress(updatedStages);
                const finalStages = overall === 100 ? updatedStages : baseStages;
                const finalOverall = overall === 100 ? overall : calculateOverallProgress(finalStages);

                isFullyComplete = finalOverall === 100;

                if (isFullyComplete) {
                  finalElapsed = Date.now() - startTimeRef.current;
                }

                return {
                  ...prev,
                  stages: finalStages,
                  overallProgress: finalOverall,
                  status: "success",
                  elapsedTime: isFullyComplete ? finalElapsed : prev.elapsedTime
                };

              });



              setLiveMessage("Otimização concluída");

              // Só congela o timer e marca como concluído quando todas as etapas terminaram
              if (isFullyComplete) {

                if (intervalRef.current) {

                  clearInterval(intervalRef.current);

                }

                clearTimeout(globalTimeoutId);

                setResult(data);

                setIsRunning(false);



                return data;

              }

              // Mesmo se não 100% (ex.: mapeamento dinâmico), garanta que o resultado chegue à UI
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              setResult(data);
              setIsRunning(false);
              clearTimeout(globalTimeoutId);
              return data;

            } else if (event.type === 'error') {

              setError(event.error || 'Erro no backend');
              setLiveMessage(event.error || 'Erro no backend');

              throw new Error(event.error || 'Erro no processamento');

            }

          } catch (parseErr) {

            console.error("[SSE] Parse error (trailing)", parseErr, "JSON:", jsonStr);

          }

        }

      }


      throw new Error("Stream finalizado sem evento 'complete'");

    } catch (err) {
      clearTimeout(globalTimeoutId);

      if (err instanceof Error && err.name === "AbortError") {

        reset();

        return null;

      }



      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";

      setError(errorMessage);
      setLiveMessage(errorMessage);



      setProgress(prev => {

        // Marca etapa atual como erro

        const newStages = prev.stages.map(s => {

          if (s.status === "running") return { ...s, status: "error" as const, message: errorMessage };

          return s;

        });



        return {

          ...prev,

          stages: newStages,

          status: "error",

          errorMessage,

          elapsedTime: Date.now() - startTimeRef.current

        };

      });



      if (intervalRef.current) {

        clearInterval(intervalRef.current);

      }



      setIsRunning(false);

      return null;

    }

  }, [updateStage, reset]);



  const restoreProgress = useCallback((savedProgress: OptimizationProgress) => {
    setProgress(savedProgress);

    // NEVER auto-resume execution from restored state
    // The user must explicitly click "Execute" to restart
    // This prevents the "ghost execution" bug where restoring a session
    // that was 'running' would trigger UI timers without a real backend process.
    if (savedProgress.status === 'running') {
      console.warn("[restoreProgress] Session was running, setting to paused/idle to prevent auto-execution");
      setIsRunning(false);
      setLiveMessage("Sessão restaurada (pausada)");

      // Force status to idle/paused in the state
      setProgress(prev => ({
        ...prev,
        status: 'idle'
      }));
    }
  }, []);

  return {
    progress,
    result,
    startOptimization,
    reset,
    resetProgress: reset,
    restoreProgress,
    updateMode,
    isRunning,

    // Propriedades SSE

    connect: () => { }, // Stub para compatibilidade com interface

    disconnect: () => { }, // Stub para compatibilidade com interface

    isConnected,

    liveMessage,

    scriptAnalysis,

    currentStep,

    error,

    stop,

  };

}
