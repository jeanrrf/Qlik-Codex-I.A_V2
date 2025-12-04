/**
 * Hook para otimização de scripts Qlik usando Convex
 * Substitui o hook antigo que usava SSE/fetch
 */
import { useState, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface OptimizationResult {
  originalScript: string;
  optimizedScript: string;
  analysis: any;
  plan: any;
  validation: any;
  documentation: any;
  report: any;
  metrics: {
    totalTime: number;
    provider: string;
  };
}

export interface OptimizationProgress {
  percent: number;
  message: string;
  status: "idle" | "running" | "completed" | "error";
  result?: OptimizationResult;
}

export function useConvexOptimization() {
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries e Mutations
  const createSession = useMutation(api.sessions.createSession);
  const optimizeScript = useAction(api.optimizer.optimizeScript);

  // Query reativa para obter progresso da sessão atual
  const session = useQuery(
    api.sessions.getSession,
    sessionId ? { sessionId } : "skip"
  );

  // Calcula progresso baseado na sessão
  const progress: OptimizationProgress = session
    ? {
      percent: session.progressData?.percent ?? 0,
      message: session.progressData?.message ?? "",
      status: session.status as "idle" | "running" | "completed" | "error",
      result: session.progressData?.result
    }
    : {
      percent: 0,
      message: "",
      status: "idle"
    };

  const startOptimization = useCallback(
    async (script: string, mode: string = "ultra-expert") => {
      setError(null);
      setIsOptimizing(true);

      try {
        // 1. Criar sessão
        const newSessionId = await createSession({
          mode,
          llmProvider: "gemini"
        });
        setSessionId(newSessionId);

        // 2. Iniciar otimização (a query reativa vai atualizar o progresso)
        await optimizeScript({
          script,
          mode,
          sessionId: newSessionId,
          llmProvider: "gemini"
        });

        // A query reativa vai atualizar automaticamente quando a sessão mudar
      } catch (err: any) {
        setError(err.message || "Erro ao otimizar script");
        setIsOptimizing(false);
      }
    },
    [createSession, optimizeScript]
  );

  // Atualiza isOptimizing quando o status muda
  if (session && (session.status === "completed" || session.status === "error")) {
    if (isOptimizing) {
      setIsOptimizing(false);
    }
  }

  const reset = useCallback(() => {
    setSessionId(null);
    setIsOptimizing(false);
    setError(null);
  }, []);

  return {
    startOptimization,
    progress,
    isOptimizing,
    error,
    reset,
    result: progress.result
  };
}
