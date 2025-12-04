import { useOptimizationProgress, OptimizationProgress, OptimizationStage } from "./useOptimizationProgress";
import { useConvexOptimization } from "./useConvexOptimization";
import { USE_CONVEX } from "../lib/config";
import { OptimizeMode, OptimizeScriptApiResponse, OptimizationOptions, OptimizeResult, OptimizeChange, BreakingRisk, MetricsEstimate } from "../types/api";
import { useState, useEffect } from "react";

// Estágios simulados para o modo Convex (para manter compatibilidade visual)
const CONVEX_STAGES: OptimizationStage[] = [
  { id: "analysis", name: "Análise Profunda & Estratégia", status: "pending", visible: true },
  { id: "optimization", name: "Otimização & Refatoração", status: "pending", visible: true },
  { id: "validation", name: "Validação & Documentação", status: "pending", visible: true }
];

export function useOptimizationAdapter() {
  // Se não estiver usando Convex, retorna o hook original
  if (!USE_CONVEX) {
    return useOptimizationProgress();
  }

  // Se estiver usando Convex, adapta a interface
  const convex = useConvexOptimization();
  const [stages, setStages] = useState<OptimizationStage[]>(CONVEX_STAGES);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Sincroniza progresso do Convex com os estágios visuais
  useEffect(() => {
    const stageData = convex.progress.stages ?? [];
    if (stageData.length > 0) {
      const clonedStages = stageData.map(stage => ({
        ...stage,
        subSteps: stage.subSteps ? stage.subSteps.map(sub => ({ ...sub })) : undefined
      }));
      setStages(clonedStages);
      const runningIndex = clonedStages.findIndex(stage =>
        stage.status === "running" || stage.subSteps?.some(sub => sub.status === "running")
      );
      let fallbackIndex = runningIndex;
      if (fallbackIndex === -1) {
        fallbackIndex = clonedStages.findIndex(stage => stage.status !== "success");
      }
      if (fallbackIndex === -1) {
        fallbackIndex = clonedStages.length - 1;
      }
      setCurrentStageIndex(Math.max(0, fallbackIndex));
      return;
    }

    if (convex.progress.status === "idle") {
      setStages(CONVEX_STAGES.map(s => ({ ...s, status: "pending" })));
      setCurrentStageIndex(0);
      return;
    }

    const percent = convex.progress.percent;

    setStages(prev => prev.map((stage, index) => {
      let status = stage.status;

      // Lógica simples de mapeamento de progresso para estágios
      if (index === 0) { // Análise (0-30%)
        if (percent > 0 && percent < 40) status = "running";
        if (percent >= 40) status = "success";
      } else if (index === 1) { // Otimização (40-70%)
        if (percent >= 40 && percent < 70) status = "running";
        if (percent >= 70) status = "success";
      } else if (index === 2) { // Validação (70-100%)
        if (percent >= 70 && percent < 100) status = "running";
        if (percent >= 100) status = "success";
      }

      if (convex.progress.status === "error") status = "error";

      return { ...stage, status: status as any };
    }));

    if (percent < 40) setCurrentStageIndex(0);
    else if (percent < 70) setCurrentStageIndex(1);
    else setCurrentStageIndex(2);

  }, [convex.progress.stages, convex.progress.percent, convex.progress.status]);

  const adaptedProgress: OptimizationProgress = {
    stages: stages,
    overallProgress: convex.progress.percent,
    currentStageIndex: currentStageIndex,
    elapsedTime: 0, // Convex não retorna tempo decorrido em tempo real ainda
    status: convex.progress.status === "completed" ? "success" : convex.progress.status as any,
    errorMessage: convex.error || undefined
  };

  // Mapeamento do resultado do Convex para o formato esperado pelo frontend
  let mappedResult: OptimizeResult | null = null;
  if (convex.result) {
    const cr = convex.result;

    // Mapeia mudanças do plano
    const changes: OptimizeChange[] = cr.plan?.planSteps?.map((step: any) => ({
      category: "performance", // Default
      area: step.targetBottleneck || "Script",
      impact: step.estimatedEffort || "Medium",
      riskLevel: "low",
      before: "",
      after: step.details
    })) || [];

    // Mapeia métricas estimadas
    const metricsEstimate: MetricsEstimate = {
      loadComplexityBefore: "medium",
      loadComplexityAfter: "low",
      maintainabilityBefore: "low",
      maintainabilityAfter: "high",
      notes: cr.plan?.estimatedImprovement ?
        `Redução de tempo: ${cr.plan.estimatedImprovement.loadTimeReduction}, RAM: ${cr.plan.estimatedImprovement.ramUsageReduction}` :
        undefined
    };

    mappedResult = {
      originalScript: cr.originalScript,
      optimizedScript: cr.optimizedScript,
      summary: cr.report?.executiveSummary || "Otimização concluída com sucesso.",
      analysis: {
        changes: changes,
        breakingRisk: (cr.plan?.riskLevel?.toLowerCase() as BreakingRisk) || "low",
        safeToApply: true,
        mode: "ultra-expert",
        metricsEstimate: metricsEstimate,
        notes: cr.report?.technicalDetails
      },
      documentationMarkdown: `
# ${cr.documentation?.title || "Documentação"}

${cr.documentation?.description || ""}

## Diagrama ER
\`\`\`mermaid
${cr.documentation?.diagramMermaid || ""}
\`\`\`

## Estratégia de Recarga
${cr.documentation?.reloadStrategy || ""}
      `,
      explanation: cr.report?.technicalDetails || "",
      consultancyDocument: cr.consultancyReport ? {
        id: cr.consultancyReport.id,
        generatedAt: cr.consultancyReport.generatedAt,
        summary: cr.consultancyReport.summary,
        metrics: cr.consultancyReport.metrics,
        criticalIssues: cr.consultancyReport.criticalIssues,
        topRecommendations: cr.consultancyReport.topRecommendations,
        overallRisk: cr.consultancyReport.overallRisk,
        safeToApply: cr.consultancyReport.safeToApply,
        processingTimeMs: cr.consultancyReport.processingTimeMs
      } : undefined
    };
  }

  const startOptimization = async (options: OptimizationOptions) => {
    await convex.startOptimization(options.script, options.mode);
    // O hook do Convex não retorna o resultado imediatamente (é assíncrono via query)
    // Mas o componente espera uma promise. Vamos retornar null e deixar o useEffect do componente pegar o resultado
    return null;
  };

  return {
    progress: adaptedProgress,
    result: mappedResult,
    startOptimization,
    reset: convex.reset,
    resetProgress: convex.reset,
    isRunning: convex.isOptimizing,
    isConnected: true,
    scriptAnalysis: null,
    updateMode: () => { },
    disconnect: () => { },
    connect: () => { },
    currentStep: null,
    error: convex.error,
    stop: () => { },
    convexResult: mappedResult
  };
}
