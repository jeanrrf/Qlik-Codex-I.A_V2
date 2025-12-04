// web/src/hooks/useSystemValidation.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { API_BASE_URL, USE_CONVEX } from "../lib/config";

export interface ValidationStage {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  duration?: number;
  message?: string;
}

export interface ValidationResult {
  success: boolean;
  stages: ValidationStage[];
  systemInfo: {
    version: string;
    environment: string;
    uptime: number;
    memoryUsage: number;
  };
  modelsAvailable: {
    ainex?: boolean;
    gemini: boolean;
    nvidia: boolean;
    defaultProvider: string;
  };
  totalDuration: number;
  timestamp: string;
}

export interface UseSystemValidationReturn {
  /** Resultado completo da validação */
  result: ValidationResult | null;
  /** Indica se está validando */
  isValidating: boolean;
  /** Erro, se houver */
  error: string | null;
  /** Executa a validação completa */
  validate: () => Promise<ValidationResult | null>;
  /** Validação rápida (ping) */
  quickValidate: () => Promise<boolean>;
  /** Progresso atual (0-100) */
  progress: number;
  /** Etapa atual sendo executada */
  currentStage: string | null;
  /** Se o sistema está pronto para uso */
  isSystemReady: boolean;
}

/**
 * Hook para validação real do sistema
 * 
 * Executa 7 etapas de validação:
 * 1. Verificando Configuração
 * 2. Testando Conexão LLM
 * 3. Validando Estrutura
 * 4. Verificando Agentes
 * 5. Testando Amostras
 * 6. Gerando Métricas
 * 7. Conclusão
 */
export function useSystemValidation(): UseSystemValidationReturn {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [isSystemReady, setIsSystemReady] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Convex actions
  const convexValidateSystem = useAction(api.validation.validateSystem);
  const convexQuickValidate = useAction(api.validation.quickValidate);

  const validate = useCallback(async (): Promise<ValidationResult | null> => {
    // Cancela validação anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsValidating(true);
    setError(null);
    setProgress(0);
    setCurrentStage("Iniciando validação...");

    // Simula etapas de UI enquanto espera a resposta real
    const stageNames = [
      "Conectando ao servidor...",
      "Verificando configuração...",
      "Testando conexão LLM...",
      "Validando estrutura...",
      "Verificando agentes...",
      "Testando amostras...",
      "Gerando métricas...",
      "Finalizando..."
    ];

    let stageIndex = 0;
    const progressInterval = setInterval(() => {
      if (stageIndex < stageNames.length) {
        setCurrentStage(stageNames[stageIndex]);
        setProgress(Math.min(90, (stageIndex + 1) * 12));
        stageIndex++;
      }
    }, 200);

    try {
      let data: ValidationResult;

      if (USE_CONVEX) {
        // Usar Convex
        const convexResult = await convexValidateSystem();
        data = {
          ...convexResult,
          systemInfo: {
            ...convexResult.systemInfo,
            uptime: 0,
            memoryUsage: 0
          }
        };
      } else {
        // Usar Express
        const response = await fetch(`${API_BASE_URL}/api/validate/system`, {
          method: "GET",
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`Falha na validação: ${response.status}`);
        }

        data = await response.json();
      }

      clearInterval(progressInterval);

      setResult(data);
      setIsSystemReady(data.success);
      setProgress(100);
      setCurrentStage(data.success ? "Sistema pronto!" : "Sistema com alertas");

      return data;
    } catch (err) {
      clearInterval(progressInterval);

      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }

      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      setIsSystemReady(false);
      setCurrentStage("Falha na validação");

      return null;
    } finally {
      setIsValidating(false);
    }
  }, [convexValidateSystem]);

  const quickValidate = useCallback(async (): Promise<boolean> => {
    try {
      if (USE_CONVEX) {
        // Usar Convex
        const data = await convexQuickValidate();
        const isReady = data.success === true;
        setIsSystemReady(isReady);
        return isReady;
      } else {
        // Usar Express
        const response = await fetch(`${API_BASE_URL}/api/validate/quick`, {
          method: "GET"
        });

        if (!response.ok) {
          setIsSystemReady(false);
          return false;
        }

        const data = await response.json();
        const isReady = data.success === true;
        setIsSystemReady(isReady);
        return isReady;
      }
    } catch {
      setIsSystemReady(false);
      return false;
    }
  }, [convexQuickValidate]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    result,
    isValidating,
    error,
    validate,
    quickValidate,
    progress,
    currentStage,
    isSystemReady
  };
}
