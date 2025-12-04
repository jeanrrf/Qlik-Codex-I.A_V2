import { useOptimizationProgress, OptimizationProgress, OptimizationStage } from "./useOptimizationProgress";
import { useConvexOptimization } from "./useConvexOptimization";
import { USE_CONVEX } from "../lib/config";
import { OptimizeMode, OptimizeScriptApiResponse, OptimizationOptions, OptimizeResult, OptimizeChange, BreakingRisk, MetricsEstimate } from "../types/api";
import { useState, useEffect } from "react";

// Est�gios simulados para o modo Convex (para manter compatibilidade visual)
const CONVEX_STAGES: OptimizationStage[] = [
  { id: "analysis", name: "An�lise Profunda & Estrat�gia", status: "pending", visible: true },
  { id: "optimization", name: "Otimiza��o & Refatora��o", status: "pending", visible: true },
  { id: "validation", name: "Valida��o & Documenta��o", status: "pending", visible: true }
];

export function useOptimizationAdapter() {
  // Se n�o estiver usando Convex, retorna o hook original
  if (!USE_CONVEX) {
    return useOptimizationProgress();
  }

  // Se estiver usando Convex, adapta a interface
  const convex = useConvexOptimization();
  const [stages, setStages] = useState<OptimizationStage[]>(CONVEX_STAGES);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Sincroniza progresso do Convex com os est�gios visuais
  useEffect(() => {
    if (convex.progress.status === "idle") {
      setStages(CONVEX_STAGES.map(s => ({ ...s, status: "pending" })));
      setCurrentStageIndex(0);
      return;
    }

    const percent = convex.progress.percent;

    setStages(prev => prev.map((stage, index) => {
      let status = stage.status;

      // L�gica simples de mapeamento de progresso para est�gios
      if (index === 0) { // An�lise (0-30%)
        if (percent > 0 && percent < 40) status = "running";
        if (percent >= 40) status = "success";
      } else if (index === 1) { // Otimiza��o (40-70%)
        if (percent >= 40 && percent < 70) status = "running";
        if (percent >= 70) status = "success";
      } else if (index === 2) { // Valida��o (70-100%)
        if (percent >= 70 && percent < 100) status = "running";
        if (percent >= 100) status = "success";
      }

      if (convex.progress.status === "error") status = "error";

      return { ...stage, status: status as any };
    }));

    if (percent < 40) setCurrentStageIndex(0);
    else if (percent < 70) setCurrentStageIndex(1);
    else setCurrentStageIndex(2);

  }, [convex.progress.percent, convex.progress.status]);

  const adaptedProgress: OptimizationProgress = {
    stages: stages,
    overallProgress: convex.progress.percent,
    currentStageIndex: currentStageIndex,
    elapsedTime: 0, // Convex n�o retorna tempo decorrido em tempo real ainda
    status: convex.progress.status === "completed" ? "success" : convex.progress.status as any,
    errorMessage: convex.error || undefined
  };

  // Mapeamento do resultado do Convex para o formato esperado pelo frontend
  let mappedResult: OptimizeResult | null = null;
  if (convex.result) {
    const cr = convex.result;

    // Mapeia mudan�as do plano
    const changes: OptimizeChange[] = cr.plan?.planSteps?.map((step: any) => ({
      category: "performance", // Default
      area: step.targetBottleneck || "Script",
      impact: step.estimatedEffort || "Medium",
      riskLevel: "low",
      before: "",
      after: step.details
    })) || [];

    // Mapeia m�tricas estimadas
    const metricsEstimate: MetricsEstimate = {
      loadComplexityBefore: "medium",
      loadComplexityAfter: "low",
      maintainabilityBefore: "low",
      maintainabilityAfter: "high",
      notes: cr.plan?.estimatedImprovement ?
        `Redu��o de tempo: ${cr.plan.estimatedImprovement.loadTimeReduction}, RAM: ${cr.plan.estimatedImprovement.ramUsageReduction}` :
        undefined
    };

    mappedResult = {
      originalScript: cr.originalScript,
      optimizedScript: cr.optimizedScript,
      summary: cr.report?.executiveSummary || "Otimiza��o conclu�da com sucesso.",
      analysis: {
        changes: changes,
        breakingRisk: (cr.plan?.riskLevel?.toLowerCase() as BreakingRisk) || "low",
        safeToApply: true,
        mode: "ultra-expert",
        metricsEstimate: metricsEstimate,
        notes: cr.report?.technicalDetails
      },
      documentationMarkdown: `
# ${cr.documentation?.title || "Documenta��o"}

${cr.documentation?.description || ""}

## Diagrama ER
\`\`\`mermaid
${cr.documentation?.diagramMermaid || ""}
\`\`\`

## Estrat�gia de Recarga
${cr.documentation?.reloadStrategy || ""}
      `,
      explanation: cr.report?.technicalDetails || ""
    };
  }

  const startOptimization = async (options: OptimizationOptions) => {
    await convex.startOptimization(options.script, options.mode);
    // O hook do Convex n�o retorna o resultado imediatamente (� ass�ncrono via query)
    // Mas o componente espera uma promise. Vamos retornar null e deixar o useEffect do componente pegar o resultado
    return null;
  };

  return {
    progress: adaptedProgress,
    result: mappedResult, // Usa o resultado mapeado
    startOptimization,
    // keep backwards-compatible names used by the legacy UI
    reset: convex.reset,
    // alias expected by the components
    resetProgress: convex.reset,
    // Convex reports `isOptimizing` — adapt to the `isRunning` name used in UI
    isRunning: convex.isOptimizing,
    isConnected: true,
    scriptAnalysis: null, // Convex ainda n�o retorna an�lise parcial
    updateMode: () => { }, // N�o necess�rio no Convex por enquanto
    disconnect: () => { },
    connect: () => { },
    currentStep: null,
    error: convex.error,
    stop: () => { },
    // Propriedade extra para acessar o resultado mapeado diretamente
    convexResult: mappedResult
  };
}

