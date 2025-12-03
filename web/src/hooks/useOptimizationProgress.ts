import { useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "../lib/config";

import { OptimizeScriptApiResponse, OptimizeMode, LLMProviderName } from "../types/api";

import { SubStepExecution } from "../types/api";



// Importar tipos dos componentes de progresso

import type { ScriptAnalysisData } from '../components/ScriptAnalysisInfo';



interface AnalysisSubStep {

  id: string;

  name: string;

  status: string;

}



export interface OptimizationStage {

  id: string;

  name: string;

  status: "pending" | "running" | "success" | "error" | "skipped" | "timeout";

  startTime?: number;

  endTime?: number;

  message?: string;

  duration?: number;

  subSteps?: SubStepExecution[];

  visible?: boolean; // Nova propriedade para controlar visibilidade

  currentRunningTime?: number; // Tempo em tempo real da tarefa em execução

}



export interface OptimizationProgress {

  /** Etapas do processo */

  stages: OptimizationStage[];

  /** Progresso geral (0-100) */

  overallProgress: number;

  /** Etapa atual */

  currentStageIndex: number;

  /** Tempo total decorrido em ms */

  elapsedTime: number;

  /** Status geral */

  status: "idle" | "running" | "success" | "error";

  /** Mensagem de erro, se houver */

  errorMessage?: string;

}



interface OptimizationOptions {

  script: string;

  mode: OptimizeMode;

  llmProvider?: LLMProviderName;

  llmModel?: string;

}



// Sub-steps para modo ULTRA EXPERT (opt_*)
const ULTRA_EXPERT_STAGES: OptimizationStage[] = [
  {
    id: "ANALYSIS_AND_PLAN",
    name: "Analysis & Strategy (Fusion)",
    status: "pending",
    visible: true,
    subSteps: [
      { id: "DEEP_ANALYSIS", name: "Deep Analysis", status: "pending" },
      { id: "STRATEGIC_PLAN", name: "Strategic Planning", status: "pending" }
    ]
  },
  {
    id: "CODE_GEN",
    name: "Code Generation",
    status: "pending",
    visible: true,
    subSteps: [
      { id: "CODE_GEN", name: "Generating Optimized Qlik Script", status: "pending" }
    ]
  },
  {
    id: "FINAL_DELIVERY",
    name: "Final Delivery & Report",
    status: "pending",
    visible: true,
    subSteps: [
      { id: "FINAL_DELIVERY", name: "Validating, Documenting & Reporting", status: "pending" }
    ]
  }
];



// Default para backward compatibility

const INITIAL_STAGES: OptimizationStage[] = ULTRA_EXPERT_STAGES;



// Timeout de 3 minutos por tarefa (em milissegundos)

const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 300000ms = 5 minutos



function getStagesForMode(_: OptimizeMode): OptimizationStage[] {
  return ULTRA_EXPERT_STAGES.map(s => ({ ...s, visible: true }));
}



/** Utilitário: Reseta stages para status pending */

function resetStagesToPending(stages: OptimizationStage[]): OptimizationStage[] {

  return stages.map(s => ({

    ...s,

    status: "pending" as const,

    subSteps: s.subSteps?.map(sub => ({ ...sub, status: "pending" as const }))

  }));

}



/** Utilitário: Calcula progresso geral baseado em stages completas */

function calculateOverallProgress(stages: OptimizationStage[]): number {

  const completedCount = stages.filter(s => s.status === "success").length;

  return Math.round((completedCount / stages.length) * 100);

}



/** Utilitário: Determina status da stage baseado nos substeps */

function calculateStageStatus(subSteps: SubStepExecution[]): 'pending' | 'running' | 'success' | 'error' | 'skipped' {

  const allCompleted = subSteps.every(s => s.status === 'success');

  const hasError = subSteps.some(s => s.status === 'error');

  const hasRunning = subSteps.some(s => s.status === 'running');



  if (hasError) return 'error';

  if (allCompleted) return 'success';

  if (hasRunning) return 'running';

  return 'pending';

}



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

  /** SSE: Análise do script (estrutura, QVD operations, estratégia) */

  scriptAnalysis: ScriptAnalysisData | null;



  /** SSE: Passo atual em execução */

  currentStep: string | null;

  /** SSE: Mensagem de erro do stream */

  error: string | null;

  /** Para a otimização em andamento */

  stop: () => void;

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





  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);



  const startTimeRef = useRef<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const taskStartTimeRef = useRef<Map<string, number>>(new Map()); // Rastrear início de cada tarefa

  const taskTimeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map()); // Timeouts individuais



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

  }, [currentMode]);



  // Adicionado para cancelar a otimização

  const stop = useCallback(() => {

    if (abortRef.current) {

      abortRef.current.abort();

      console.log("Optimization aborted by user.");

    }

    if (intervalRef.current) {

      clearInterval(intervalRef.current);

    }

    setIsRunning(false);

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

    // Atualiza o modo atual e seleciona as stages corretas

    setCurrentMode(options.mode);

    const stagesToUse = getStagesForMode(options.mode);



    // Limpa estados SSE de execução anterior

    setScriptAnalysis(null);

    setCurrentStep(null);

    setError(null);



    setIsRunning(true);

    startTimeRef.current = Date.now();

    abortRef.current = new AbortController();



    // Inicia com as stages corretas para este modo

    setProgress(prev => ({

      ...prev,

      stages: stagesToUse,

      overallProgress: 0,

      currentStageIndex: 0,

      elapsedTime: 0,

      status: "running"

    }));



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

          if (!stage.subSteps) return stage;



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



          return { ...stage, subSteps: updatedSubSteps };

        });



        return newProgress;

      });

    }, 100); // Atualiza a cada 100ms



    // Marca primeira etapa como rodando

    updateStage(0, { status: "running", startTime: Date.now() });



    try {

      const response = await fetch(`${API_BASE_URL}/api/scripts/optimize`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "Accept": "text/event-stream"

        },

        body: JSON.stringify({

          script: options.script,

          mode: options.mode,

          llmProvider: options.llmProvider,

          llmModel: options.llmModel

        }),

        credentials: "include",

        signal: abortRef.current.signal

      });



      if (!response.ok) {

        const errorText = await response.text();

        throw new Error(`HTTP ${response.status}: ${errorText}`);

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



            // Tratamento de eventos SSE

            if (event.type === 'script_analysis') {

              setScriptAnalysis(event.data);

            } else if (event.type === 'substep') {

              // Atualiza substep em tempo real

              console.warn('[SSE Frontend] Received substep event:', event.substep);

              const sub = event.substep as SubStepExecution;



              // Se está iniciando uma tarefa (status = running), registra o tempo e inicia timeout

              if (sub.status === 'running') {

                const taskId = sub.id;

                taskStartTimeRef.current.set(taskId, Date.now());



                // Configura timeout de 3 minutos para esta tarefa

                const timeoutId = setTimeout(() => {

                  console.warn(`[TIMEOUT] Tarefa ${taskId} excedeu 3 minutos!`);

                  setProgress(prev => {

                    const newStages = prev.stages.map(stage => {

                      if (!stage.subSteps) return stage;

                      const subIdx = stage.subSteps.findIndex(s => s.id === taskId);

                      if (subIdx === -1) return stage;



                      const newSubSteps = [...stage.subSteps];

                      newSubSteps[subIdx] = {

                        ...newSubSteps[subIdx],

                        status: 'timeout' as any,

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

                    return { ...prev, stages: newStages };

                  });

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

              }



              setProgress(prev => {

                const newStages = prev.stages.map((stage, stageIdx) => {

                  if (!stage.subSteps) return stage;



                  const subIdx = stage.subSteps.findIndex(s => s.id === sub.id);

                  if (subIdx === -1) return stage;



                  const newSubSteps = [...stage.subSteps];

                  newSubSteps[subIdx] = {

                    ...newSubSteps[subIdx],

                    status: sub.status,

                    startTime: sub.startTime,

                    endTime: sub.endTime,

                    duration: sub.duration,

                    error: sub.error

                  };



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



              // Atualiza os sub-steps com dados reais da API

              if (data.analysis?.steps) {

                interface AnalysisStep {

                  stepId: string;

                  name?: string;

                  status: string;

                  subSteps?: AnalysisSubStep[];

                }



                interface AnalysisSubStep {

                  id: string;

                  name: string;

                  status: string;

                }



                const optStep = data.analysis.steps.find((s: AnalysisStep) => s.stepId === "opt_main");



                if (optStep?.subSteps && Array.isArray(optStep.subSteps)) {

                  setProgress(prev => {

                    const newStages = prev.stages.map(stage => ({

                      ...stage,

                      subSteps: stage.subSteps?.map(sub => ({ ...sub }))

                    }));



                    // Para cada sub-step real retornado pela API

                    optStep.subSteps.forEach((realSub: AnalysisSubStep) => {

                      // Encontra a etapa pai que contém este sub-step

                      for (const stage of newStages) {

                        if (stage.subSteps) {

                          const subIdx = stage.subSteps.findIndex(s => s.id === realSub.id);

                          if (subIdx !== -1) {

                            // Atualiza com dados reais

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

                      }

                    });



                    // Atualiza status e duração das etapas pai baseado nos sub-steps

                    newStages.forEach(stage => {

                      if (stage.subSteps && stage.subSteps.length > 0) {

                        stage.status = calculateStageStatus(stage.subSteps) as any;

                        if (stage.status === "success") {

                          stage.duration = stage.subSteps.reduce((acc, sub) => acc + (sub.duration || 0), 0);

                        }

                      }

                    });



                    return { ...prev, stages: newStages, overallProgress: calculateOverallProgress(newStages) };

                  });

                }

              }



              // Finaliza tudo com sucesso

              setProgress(prev => ({

                ...prev,

                status: "success",

                overallProgress: 100,

                elapsedTime: Date.now() - startTimeRef.current,

                stages: prev.stages.map(s => ({ ...s, status: "success" }))

              }));



              if (intervalRef.current) {

                clearInterval(intervalRef.current);

              }



              setResult(data);

              setIsRunning(false);



              return data;

            } else if (event.type === 'error') {

              setError(event.error || 'Erro no backend');

              throw new Error(event.error || 'Erro no processamento');

            }

          } catch (parseErr) {

            console.error("[SSE] Parse error:", parseErr, "JSON:", jsonStr);

          }

        }

      }



      throw new Error("Stream finalizado sem evento 'complete'");

    } catch (err) {

      if (err instanceof Error && err.name === "AbortError") {

        reset();

        return null;

      }



      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";

      setError(errorMessage);



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



  return {

    progress,

    result,

    startOptimization,

    reset,

    resetProgress: reset,

    updateMode,

    isRunning,

    // Propriedades SSE

    connect: () => { }, // Stub para compatibilidade com interface

    disconnect: () => { }, // Stub para compatibilidade com interface

    isConnected,

    scriptAnalysis,

    currentStep,

    error,

    stop,

  };

}

