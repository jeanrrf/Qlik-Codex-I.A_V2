// web/src/pages/OptimizerPageV2.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import "./OptimizerPageV2.css";
import "./ControlPanel.css";
import "./ModalStyles.css";

import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { UserRole } from "../types/auth";
import { formatDuration } from "../lib/formatTime";
import { UserMenu } from "../components/UserMenu";
import ConsultancyDocumentViewer from "../components/ConsultancyDocumentViewer";
import ScriptInfoModal, { ScriptInfo } from "../components/ScriptInfoModal";
import { BrandMark } from "../components/BrandMark";
import { getLLMOptionById, LLM_OPTIONS } from "../lib/llmOptions";
import {
  OptimizationIntent,
  OptimizeMode,
  OptimizeResult
} from "../types/api";
import type { ConsultancyDocument } from "../types/consultancy";
import { UploadedFileMeta, UploadedFilePayload } from "../types/ui";
import ScriptCaptureModal from "../components/ScriptCaptureModal";
import DownloadModal from "../components/DownloadModal";
import HistoryModal from "../components/HistoryModal";
import { useOptimizationProgress } from "../hooks/useOptimizationProgress";
import { useSessionPersistence } from "../hooks/useSessionPersistence";
import QuotaDisplay from "../components/QuotaDisplay/QuotaDisplay";
import { getQuotas, UsageQuotaCheck } from "../api/usage";

// Pipeline Components - Refatorados
import { PipelineContainer, PipelineKPIs } from "../components/Pipeline";
import type { PipelineProgress } from "../types/pipeline";

// New Components
import { Icons } from "../components/Icons";
import { Spinner } from "../components/Spinner";
import { useRunHistory } from "../hooks/useRunHistory";
import { ResultViewerModal } from "../components/ResultViewerModal";
import { ScriptAnalysisCard } from "../components/ScriptAnalysisCard";
import { ScriptInputCard } from "../components/ScriptInputCard";
import { analyzeScriptComplexity } from "../lib/scriptAnalysis";
import { loadLatestSnapshot, saveSnapshot } from "../lib/indexedStorage";
import { AdsterraAd } from "../components/AdsterraAd";

type OptimizerPageProps = Record<string, never>;

const OptimizerPageV2: React.FC<OptimizerPageProps> = () => {
  // === STATE ===
  const [script, setScript] = useState<string>("");
  const [mode, setMode] = useState<OptimizeMode>("ultra-expert");
  const [intent, setIntent] = useState<OptimizationIntent>("refactor");
  const [llmOptionId, setLlmOptionId] = useState<string>(LLM_OPTIONS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadedFileMeta | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [showResultViewer, setShowResultViewer] = useState(false);
  const [consultancyDoc, setConsultancyDoc] = useState<ConsultancyDocument | null>(null);
  const [showConsultancy, setShowConsultancy] = useState(false);
  const [showScriptInfo, setShowScriptInfo] = useState(false);
  const [scriptInfo, setScriptInfo] = useState<ScriptInfo | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [snapshotAvailable, setSnapshotAvailable] = useState(false);

  const isRestoringRef = useRef(false);

  // === HOOKS ===
  const { user } = useAuth();
  const optimization = useOptimizationProgress();
  const session = useSessionPersistence();
  const { navigateBack } = useNavigation();
  const { recentRuns, pushHistory } = useRunHistory();

  // Check if user is OWNER (has full features)
  const isOwner = user?.role === UserRole.OWNER;

  // FREE TIER: Cálculo de linhas e limites
  const scriptLineCount = script ? script.split(/\r?\n/).length : 0;
  const FREE_TIER_LINE_LIMIT = 200;
  const exceedsLineLimit = !isOwner && scriptLineCount > FREE_TIER_LINE_LIMIT;
  const willBeTruncated = exceedsLineLimit;

  // FREE TIER: Controle de visibilidade do banner de aviso
  const [showFreeTierWarning, setShowFreeTierWarning] = useState(true);

  // FREE TIER: Estado de quotas (do backend)
  const [quotaData, setQuotaData] = useState<UsageQuotaCheck | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  // Buscar quotas do backend
  const fetchQuotas = useCallback(async (bustCache = false) => {
    if (isOwner) {
      // Owner tem acesso ilimitado
      setQuotaData({ allowed: true, remaining: -1, limit: -1, resetAt: new Date().toISOString(), usedToday: 0 });
      setQuotaLoading(false);
      return;
    }

    try {
      setQuotaLoading(true);
      const response = await getQuotas(bustCache);
      const modeQuota = mode === "ultra-expert" ? response.data.ultraExpert : response.data.nvidiaFast;
      setQuotaData(modeQuota);
    } catch (err) {
      console.error("[QUOTA] Erro ao buscar quotas:", err);
      // Fallback: permitir uso em caso de erro (fail-open)
      setQuotaData({ allowed: true, remaining: 4, limit: 4, resetAt: new Date().toISOString(), usedToday: 0 });
    } finally {
      setQuotaLoading(false);
    }
  }, [isOwner, mode]);

  // Buscar quotas na montagem e quando mudar o modo
  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  // Computed values baseados em quotaData
  const hasUltraExpertQuotaLeft = quotaData?.allowed ?? true;
  const ultraExpertUsageCount = quotaData?.usedToday ?? 0;
  const MAX_ULTRA_EXPERT_RUNS = quotaData?.limit ?? 4;

  // Sincroniza mudança de modo com o hook de progresso
  const handleModeChange = useCallback((newMode: OptimizeMode) => {
    setMode(newMode);
    // Reseta intent para "refactor" quando muda para nvidia-fast (não suporta audit)
    const effectiveIntent = newMode === "nvidia-fast" ? "refactor" : intent;
    if (newMode === "nvidia-fast" && intent === "audit") {
      setIntent("refactor");
    }
    optimization.updateMode(newMode, effectiveIntent); // Atualiza as stages visíveis
  }, [optimization, intent]);

  const selectedLLM = useMemo(() => getLLMOptionById(llmOptionId), [llmOptionId]);
  const providerForMode = useMemo(() => mode === "nvidia-fast" ? "nvidia" as const : selectedLLM.provider, [mode, selectedLLM]);
  const llmModelForMode = useMemo(() => mode === "nvidia-fast" ? undefined : selectedLLM.model, [mode, selectedLLM]);

  // === AUTO SHOW SCRIPT INFO WHEN SCRIPT IS LOADED ===
  useEffect(() => {
    // Se há script carregado mas o modal não foi exibido ainda, exibe
    if (script && script?.trim().length > 50 && !scriptInfo && uploadMeta) {
      const metrics = analyzeScriptComplexity(script);

      setScriptInfo({
        lines: metrics.lines,
        size: metrics.size,
        complexity: metrics.complexity,
        estimatedTokens: metrics.estimatedTokens,
        fileName: uploadMeta.name,
        fileType: uploadMeta.extension || "txt"
      });
      setShowScriptInfo(true);
    }
  }, [script, uploadMeta, scriptInfo]);

  // === AUTO RESTORE SESSION ON MOUNT ===
  useEffect(() => {
    // Tenta recuperar sessão ativa ao carregar
    const restoreActiveSession = async () => {
      try {
        const snapshot = await loadLatestSnapshot(user?.id);
        setSnapshotAvailable(Boolean(snapshot));

        const restored = await session.restoreSession();
        const snapshotResult = snapshot as unknown as { script?: string; progress?: PipelineProgress; mode?: OptimizeMode; result?: OptimizeResult | null; llmProvider?: string };

        const candidateScript = restored?.script ?? snapshotResult?.script ?? "";
        if (restored && restored.progressData) {
          console.warn(" Sessão ativa restaurada");
          isRestoringRef.current = true;

          setScript(candidateScript);
          if (restored.mode) {
            handleModeChange(restored.mode as OptimizeMode);
          }
          if (restored.llmProvider) {
            const llmOption = LLM_OPTIONS.find(opt => opt.provider === restored.llmProvider);
            if (llmOption) setLlmOptionId(llmOption.id);
          }

          if (restored.progressData) {
            // Only restore progress, do NOT auto-resume execution
            // optimization.restoreProgress(restored.progressData);

            // If the session was running, we might want to show the last state but paused
            // or ask the user if they want to resume. For now, let's just restore the data
            // and set status to paused/idle to prevent auto-execution.
            const safeProgress = {
              ...restored.progressData,
              status: 'idle' as const // Force idle to prevent auto-run
            };
            optimization.restoreProgress(safeProgress);
          }

          setTimeout(() => {
            isRestoringRef.current = false;
          }, 500);
        } else if (snapshotResult && snapshotResult.progress) {
          console.warn(" Snapshot local restaurado");
          isRestoringRef.current = true;
          setScript(candidateScript);
          if (snapshotResult.mode) {
            handleModeChange(snapshotResult.mode as OptimizeMode);
          }
          if (snapshotResult.result) {
            setResult(snapshotResult.result as OptimizeResult);
          }

          // Same safety for local snapshot
          const safeProgress = {
            ...snapshotResult.progress,
            status: 'idle' as const
          };
          optimization.restoreProgress(safeProgress as PipelineProgress);

          setTimeout(() => {
            isRestoringRef.current = false;
          }, 300);
        }
      } catch (error) {
        console.warn("Não foi possível restaurar sessão:", error);
      }
    };

    restoreActiveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === RESET PROGRESS WHEN MODE CHANGES ===
  useEffect(() => {
    if (isRestoringRef.current) return; // Skip reset if restoring session

    optimization.resetProgress();
    setResult(null);
    setConsultancyDoc(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // === AUTO-SAVE SESSION DURING OPTIMIZATION ===
  useEffect(() => {
    if (optimization.isRunning && script?.trim()) {
      // Salva sessão automaticamente a cada mudança de progresso
      session.saveSessionDebounced({
        sessionId: session.sessionId,
        mode,
        llmProvider: providerForMode,
        llmModel: llmModelForMode,
        progress: optimization.progress,
        isRunning: true
      });
    }
    if (script?.trim()) {
      saveSnapshot({
        userId: user?.id,
        script,
        mode,
        result,
        progress: optimization.progress,
        updatedAt: Date.now()
      }).then(() => setSnapshotAvailable(true)).catch(() => { });
    }
  }, [optimization.isRunning, optimization.progress, script, mode, providerForMode, llmModelForMode, session, user?.id, result]);

  // === HANDLERS ===
  const handleQuotaUpdate = useCallback((quota: UsageQuotaCheck) => {
    setQuotaData(quota);
  }, []);

  const handleBackNavigation = () => {
    navigateBack("landing");
  };

  const applySnapshot = useCallback((snap: { script?: string; mode?: OptimizeMode; result?: OptimizeResult | null; progress?: PipelineProgress }) => {
    if (!snap) return;
    isRestoringRef.current = true;
    setScript(snap.script || "");
    if (snap.mode) handleModeChange(snap.mode);
    if (snap.result !== undefined) setResult(snap.result || null);
    if (snap.progress) optimization.restoreProgress(snap.progress);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 300);
  }, [handleModeChange, optimization]);

  const handleRestoreSnapshot = useCallback(async () => {
    try {
      const snap = await loadLatestSnapshot(user?.id);
      if (!snap || !snap.progress) {
        setError("Nenhum snapshot local disponível.");
        return;
      }
      applySnapshot(snap as unknown as { script?: string; mode?: OptimizeMode; result?: OptimizeResult | null; progress?: PipelineProgress });
    } catch (err) {
      console.warn("[Snapshot] Falha ao restaurar snapshot local:", err);
      setError("Falha ao restaurar snapshot local.");
    }
  }, [applySnapshot, user?.id]);

  const handleOptimize = async () => {
    setError(null);
    setResult(null);
    setConsultancyDoc(null);

    const trimmed = script?.trim() || "";
    if (!trimmed) {
      setError("Cole um script Qlik ou importe um arquivo antes de otimizar.");
      return;
    }

    // FREE TIER: Verifica quota de Ultra Expert
    if (!isOwner && mode === "ultra-expert" && !hasUltraExpertQuotaLeft) {
      setError(`FREE TIER: Você atingiu o limite de ${MAX_ULTRA_EXPERT_RUNS} otimizações por dia. Aguarde renovação diária (meia-noite).`);
      return;
    }

    // Connect to SSE stream for real-time progress
    optimization.connect();

    try {
      const res = await optimization.startOptimization({
        script: trimmed,
        mode,
        intent,
        llmProvider: providerForMode,
        llmModel: llmModelForMode
      });

      if (res) {
        const { consultancyDocument, ...optResult } = res;

        // Fix for NVIDIA/LLM sometimes returning literal escaped newlines
        if (optResult.optimizedScript) {
          if (optResult.optimizedScript.includes("\\n") && !optResult.optimizedScript.includes("\n")) {
            optResult.optimizedScript = optResult.optimizedScript.replace(/\\n/g, "\n");
          }
          // Trim to avoid leading/trailing empty lines causing offsets
          optResult.optimizedScript = optResult.optimizedScript.trim();
        }

        setResult(optResult);
        if (mode === "ultra-expert" && consultancyDocument) {
          setConsultancyDoc(consultancyDocument);
        } else {
          setConsultancyDoc(null);
        }

        // FREE TIER: Atualiza quotas após sucesso (backend registra uso automaticamente)
        // Força bypass de cache para obter saldo atualizado imediatamente
        await fetchQuotas(true);

        // Salva sessão completa após finalização
        await session.saveSession({
          sessionId: session.sessionId,
          mode,
          llmProvider: providerForMode,
          llmModel: llmModelForMode,
          progress: optimization.progress,
          status: "completed",
          isRunning: false
        }).catch(console.error);

        pushHistory({
          id: session.sessionId,
          mode,
          status: "success",
          finishedAt: new Date().toISOString(),
          provider: providerForMode,
          duration: optimization.progress.elapsedTime
        });
      } else if (optimization.progress.errorMessage) {
        setError(optimization.progress.errorMessage);

        // Salva sessão com erro
        await session.saveSession({
          sessionId: session.sessionId,
          mode,
          llmProvider: providerForMode,
          llmModel: llmModelForMode,
          progress: optimization.progress,
          status: "error",
          isRunning: false
        }).catch(console.error);

        pushHistory({
          id: session.sessionId,
          mode,
          status: "error",
          finishedAt: new Date().toISOString(),
          provider: providerForMode,
          duration: optimization.progress.elapsedTime
        });
      }
    } catch (err) {
      console.error("Optimization error:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);

      pushHistory({
        id: session.sessionId,
        mode,
        status: "error",
        finishedAt: new Date().toISOString(),
        provider: providerForMode,
        duration: optimization.progress.elapsedTime
      });
    } finally {
      // Disconnect SSE stream
      optimization.disconnect();
    }
  };

  const handlePayloadLoaded = (payload: UploadedFilePayload) => {
    setScript(payload.content);
    setUploadMeta(payload.meta);
    setError(null);
    setResult(null);
    optimization.reset();
    setCaptureOpen(false);

    // Calcular informações do script e exibir modal
    const metrics = analyzeScriptComplexity(payload.content);

    setScriptInfo({
      lines: metrics.lines,
      size: metrics.size,
      complexity: metrics.complexity,
      estimatedTokens: metrics.estimatedTokens,
      fileName: payload.meta.name,
      fileType: payload.meta.extension || "txt"
    });
    setShowScriptInfo(true);
  };

  // === COMPUTED ===
  const canOptimize = script?.trim().length > 0 && !optimization.isRunning;
  const hasResult = Boolean(result?.optimizedScript);
  const isNvidiaMode = mode === "nvidia-fast";
  const runningStage = optimization.progress.stages?.[optimization.progress.currentStageIndex] || null;
  const computedProgress = optimization.progress.overallProgress || 0;
  const liveProgress = optimization.isRunning ? Math.min(99, Math.max(computedProgress, runningStage ? 5 : 2)) : computedProgress;
  const liveStatusMessage = optimization.liveMessage || (optimization.isRunning ? `Executando ${runningStage?.name || "pipeline"}...` : null);

  const resultStats = useMemo(() => {
    if (!result) return null;
    const originalLines = result.originalScript ? result.originalScript.split(/\r?\n/).length : 0;
    const optimizedLines = result.optimizedScript ? result.optimizedScript.split(/\r?\n/).length : 0;
    const apiStats = result.diffStats;
    const added = apiStats?.linesAdded ?? Math.max(optimizedLines - originalLines, 0);
    const removed = apiStats?.linesRemoved ?? Math.max(originalLines - optimizedLines, 0);
    const modified = apiStats?.linesModified ?? (result.analysis?.changes?.length ?? 0);

    return { originalLines, optimizedLines, added, removed, modified };
  }, [result]);

  const modeInfo: Record<OptimizeMode, {
    title: string;
    icon: React.ReactNode;
    color: string;
    risk: string;
    description: string;
    helper?: string;
    badge?: string;
    accentClass?: string;
  }> = {
    "ultra-expert": {
      title: "Ultra Expert",
      icon: <Icons.Zap />,
      color: "#ff2a6d",
      risk: "Pipeline Completo",
      description: intent === "audit" ? "Gera relatório de consultoria" : "Gera código otimizado",
      helper: intent === "audit" ? "📋 Modo Relatório (sem código)" : "💻 Modo Código (sem relatório)"
    },
    "nvidia-fast": {
      title: "NVIDIA Fast",
      icon: <Icons.Robot />,
      color: "#39ff14",
      risk: "Apenas Código",
      description: "Código otimizado rápido (sem relatório)",
      helper: "⚡ Retorno em segundos",
      badge: "RÁPIDO",
      accentClass: "nvidia"
    }
  };

  // === RENDER ===
  return (
    <div className={`opt-page ${mode === "nvidia-fast" ? "nvidia-mode-active" : ""} ${optimization.isRunning && mode === "nvidia-fast" ? "optimizing-pulse" : ""}`}>
      {/* Background */}
      <div className="opt-bg">
        <div className="bg-gradient" />
        <div className="bg-grid" />
      </div>

      {/* Header Unificado */}
      <header className="opt-header-minimal unified-header">
        <div className="header-left-section">
          <div className="header-brand-minimal">
            <button className="back-btn-minimal" onClick={handleBackNavigation} title="Voltar" aria-label="Voltar para a tela anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <BrandMark variant="full" size="sm" showBeta className="opt-brand-mark" />
          </div>

          <div className="header-separator"></div>

          {/* Modos */}
          <div className="mode-cards-horizontal header-mode-selector">
            {Object.entries(modeInfo).map(([modeKey, info]) => {
              const option = modeKey as OptimizeMode;
              const isUltra = option === "ultra-expert";
              const isSelected = mode === option;
              const disabled = isUltra && !isOwner && !hasUltraExpertQuotaLeft;
              const quotaTitle = !isOwner && !hasUltraExpertQuotaLeft
                ? "Quota diária de Ultra Expert esgotada. Limite geral: 4 execuções/dia. Aguarde renovação."
                : undefined;

              return (
                <button
                  key={option}
                  className={`mode-card-compact ${isSelected ? "active" : ""} ${isUltra ? "expert" : ""} ${info.accentClass || ""}`}
                  onClick={() => handleModeChange(option)}
                  disabled={disabled}
                  title={isUltra ? quotaTitle : info.description}
                >
                  <div className="mode-card-icon-compact">
                    {info.icon}
                  </div>
                  <div className="mode-card-text-compact">
                    <div className="mode-card-heading">
                      <h4>{info.title}</h4>
                      {info.badge && <span className="mode-card-badge">{info.badge}</span>}
                    </div>
                    <p>{info.description}</p>
                    {info.helper && (
                      <span className="mode-card-helper">{info.helper}</span>
                    )}
                    {isUltra && !isOwner && (
                      <div className={`ultra-expert-quota ${!hasUltraExpertQuotaLeft ? "quota-exhausted" : ""}`}>
                        <span className="quota-icon">{hasUltraExpertQuotaLeft ? "" : ""}</span>
                        <span className="quota-text">
                          {Math.max(0, MAX_ULTRA_EXPERT_RUNS - ultraExpertUsageCount)} de {MAX_ULTRA_EXPERT_RUNS} execuções
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`mode-active-dot ${isUltra ? "expert" : ""}`} />
                  {isUltra && <div className="expert-flame-mini" />}
                </button>
              );
            })}
          </div>

          {/* Intent Toggle: Análise vs Otimizar (apenas Ultra Expert) */}
          {mode === "ultra-expert" && (
            <div className="intent-toggle-container">
              <button
                className={`intent-toggle-btn ${intent === "audit" ? "active" : ""}`}
                onClick={() => {
                  setIntent("audit");
                  optimization.updateIntent("audit");
                }}
                title="Gera RELATÓRIO de diagnóstico (sem código otimizado)"
              >
                <span className="intent-icon">📋</span>
                <span className="intent-label">Relatório</span>
              </button>
              <button
                className={`intent-toggle-btn ${intent === "refactor" ? "active" : ""}`}
                onClick={() => {
                  setIntent("refactor");
                  optimization.updateIntent("refactor");
                }}
                title="Gera CÓDIGO otimizado (sem relatório de consultoria)"
              >
                <span className="intent-icon">💻</span>
                <span className="intent-label">Código</span>
              </button>
            </div>
          )}
        </div>

        <div className="header-center-section">
          <div className="execution-controls header-execution">
            {!optimization.isRunning ? (
              <button
                className={`btn-execute-main ${!canOptimize ? "disabled" : ""}`}
                onClick={handleOptimize}
                disabled={!canOptimize}
                title={canOptimize ? "Executar otimização" : "Carregue um script para executar"}
              >
                <div className="btn-execute-icon">
                  <Icons.Play />
                </div>
                <div className="btn-execute-text">
                  <span className="btn-execute-label">Executar</span>
                  <span className="btn-execute-sublabel">{modeInfo[mode].title}</span>
                </div>
                {mode === "ultra-expert" && canOptimize && (
                  <div className="btn-execute-glow" />
                )}
              </button>
            ) : (
              <>
                <button className="btn-executing-main" disabled>
                  <div className="btn-execute-icon">
                    <Spinner size={24} />
                  </div>
                  <div className="btn-execute-text">
                    <span className="btn-execute-label">Processando...</span>
                    <span className="btn-execute-sublabel">{formatDuration(optimization.progress.elapsedTime)}</span>
                  </div>
                  <div className="btn-execute-pulse" />
                </button>
                <button
                  className="btn-stop-main"
                  onClick={() => optimization.stop()}
                  title="Parar otimização"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  <span>Parar</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="header-right-section">
          <div className="action-cards-compact header-actions">
            {/* Consultoria */}
            <button
              className={`action-btn-compact consultancy ${!consultancyDoc ? "disabled-blur" : ""}`}
              onClick={() => consultancyDoc && setShowConsultancy(true)}
              disabled={!consultancyDoc}
              title={consultancyDoc ? "Ver Auditoria/Consultoria" : "Auditoria será gerada após otimização"}
              aria-label={consultancyDoc ? "Ver Auditoria/Consultoria" : "Auditoria será gerada após otimização"}
            >
              <Icons.Document />
            </button>

            {/* Ver Resultado */}
            <button
              type="button"
              className={`action-btn-compact result ${!result ? "disabled-blur" : ""}`}
              onClick={() => result && setShowResultViewer(true)}
              disabled={!result}
              title={result ? "Ver resultado da otimização" : "Resultado será exibido após otimização"}
              aria-label={result ? "Ver resultado da otimização" : "Resultado será exibido após otimização"}
            >
              <Icons.Eye />
            </button>

            {/* Baixar */}
            <button
              type="button"
              className={`action-btn-compact download ${!result ? "disabled-blur" : ""}`}
              onClick={() => result && setDownloadModalOpen(true)}
              disabled={!result}
              title={result ? "Baixar arquivos" : "Download disponível após otimização"}
              aria-label={result ? "Baixar arquivos" : "Download disponível após otimização"}
            >
              <Icons.Download />
            </button>

            {/* Restaurar última sessão */}
            <button
              type="button"
              className={`action-btn-compact ${!snapshotAvailable ? "disabled-blur" : ""}`}
              onClick={handleRestoreSnapshot}
              disabled={!snapshotAvailable}
              title={snapshotAvailable ? "Restaurar última sessão salva localmente" : "Nenhum snapshot salvo"}
              aria-label={snapshotAvailable ? "Restaurar última sessão salva localmente" : "Nenhum snapshot salvo"}
            >
              <Icons.Clock />
            </button>

            {/* Histórico */}
            <button
              type="button"
              className="action-btn-compact history"
              onClick={() => setShowHistoryModal(true)}
              title="Histórico de Execuções"
              aria-label="Abrir histórico de execuções"
            >
              <Icons.Clock />
            </button>
          </div>

          <div className="header-user">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* FREE TIER WARNING BANNER */}
      {!isOwner && willBeTruncated && showFreeTierWarning && (
        <div className="free-tier-warning-banner">
          <div className="warning-icon"></div>
          <div className="warning-content">
            <strong>FREE TIER - Limite de Linhas Excedido</strong>
            <p>
              Seu script tem <strong>{scriptLineCount} linhas</strong>, mas o FREE TIER limita a <strong>{FREE_TIER_LINE_LIMIT} linhas</strong>.
              O script será automaticamente truncado com <strong>corte inteligente</strong> (até +30 linhas extras para completar blocos).
            </p>
          </div>
          <button className="warning-dismiss" onClick={() => setShowFreeTierWarning(false)} title="Entendi" aria-label="Dispensar aviso de limite de linhas">

          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="opt-content">
        {/* Left Panel - Controls */}
        <aside className="opt-sidebar">
          {/* Script Input with File Details */}
          <ScriptInputCard
            script={script}
            uploadMeta={uploadMeta}
            onCaptureOpen={() => setCaptureOpen(true)}
            exceedsLineLimit={exceedsLineLimit}
            scriptLineCount={scriptLineCount}
            FREE_TIER_LINE_LIMIT={FREE_TIER_LINE_LIMIT}
          />

          {/* Quota Display - FREE TIER */}
          {!isOwner && quotaData && !quotaLoading && (
            <div className="ctrl-card quota-card">
              <QuotaDisplay
                mode={mode}
                compact
                onQuotaUpdate={handleQuotaUpdate}
              />
            </div>
          )}

          {/* Análise do Script - Sidebar */}
          <ScriptAnalysisCard
            script={script}
            uploadMeta={uploadMeta}
            optimization={optimization}
          />
        </aside>

        {/* Main Area */}
        <main className="opt-main">
          {/* Guest Mode Warning for Ultra-Expert */}
          {!user && mode === "ultra-expert" && (
            <div className="error-alert" style={{
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              border: '2px solid #667eea',
              color: '#2d3748',
              padding: '16px 20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <span style={{ fontSize: '2rem' }}>🔐</span>
              <div className="error-text" style={{ flex: 1 }}>
                <strong style={{ fontSize: '1.1rem', color: '#667eea' }}>Modo Ultra-Expert Requer Login</strong>
                <p style={{ margin: '8px 0 0 0', lineHeight: '1.5' }}>
                  Faça login com Google para desbloquear <strong>Ultra-Expert</strong>,
                  mais quotas diárias e recursos avançados.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                <button
                  onClick={async () => {
                    try {
                      const { getGoogleAuthUrl } = await import('../api/authClient');
                      const authUrl = await getGoogleAuthUrl();
                      window.location.href = authUrl;
                    } catch (err) {
                      console.error('Failed to get auth URL:', err);
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  aria-label="Fazer Login com Google"
                >
                  🔓 Fazer Login
                </button>
                <button
                  className="error-close"
                  onClick={() => setMode("nvidia-fast")}
                  aria-label="Mudar para NVIDIA Fast"
                  style={{
                    background: '#e2e8f0',
                    color: '#4a5568',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Usar NVIDIA Fast
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="error-alert">
              <span className="error-icon"></span>
              <div className="error-text">
                <strong>Erro</strong>
                <p>{error}</p>
              </div>
              <button className="error-close" onClick={() => setError(null)} aria-label="Fechar mensagem de erro"></button>
            </div>
          )}

          {/* Status em tempo real */}
          {optimization.isRunning && (
            <div className="live-status-card">
              <div className="live-status-left">
                <span className="pill live">Tempo real</span>
                <h3>{runningStage?.name || "Pipeline em execucao"}</h3>
                <p className="live-message">{liveStatusMessage || "Processando..."}</p>
                {(runningStage?.provider || runningStage?.model) && (
                  <p className="live-model">🤖 {runningStage.provider}{runningStage.provider && runningStage.model ? '/' : ''}{runningStage.model}</p>
                )}
                {runningStage?.tokensConsumed && (
                  <p className="live-tokens">Tokens: {runningStage.tokensConsumed.totalTokens} (prompt {runningStage.tokensConsumed.promptTokens} / completion {runningStage.tokensConsumed.completionTokens})</p>
                )}
              </div>
              <div className="live-status-right">
                <div className="live-progress-bar">
                  <div
                    className="live-progress-fill"
                    style={{ width: `${Math.min(100, Math.round(liveProgress || 0))}%` }}
                  />
                </div>
                <div className="live-progress-meta">
                  <span className="live-progress-value">{Math.round(liveProgress || 0)}%</span>
                  <span className="live-progress-time">{formatDuration(optimization.progress.elapsedTime)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pipeline Progress - REFATORADO */}
          <PipelineContainer
            progress={optimization.progress}
            mode={mode}
            title=" Pipeline de Otimização"
            modeInfo={{
              title: modeInfo[mode].title,
              icon: modeInfo[mode].icon,
            }}
            activeModel={`${providerForMode}${llmModelForMode ? '/' + llmModelForMode : ''}`}
          />

          {/* Pipeline KPIs */}
          <PipelineKPIs
            progress={optimization.progress}
            result={result}
            showAinexNote={true}
          />

          {/* Resultado inline */}
          {hasResult && result && (
            <>
              <section className="result-inline-card">
                <div className="result-inline-header">
                  <div>
                    <h3>Resultado da Otimização</h3>
                    <p className="result-mode-label">
                      {modeInfo[mode].title}
                      {isNvidiaMode ? " · apenas código otimizado" : " · código + análise"}
                    </p>
                  </div>
                  <div className="result-inline-actions">
                    {!isNvidiaMode && consultancyDoc && (
                      <button
                        type="button"
                        className="action-btn-compact"
                        onClick={() => setShowConsultancy(true)}
                        title="Ver auditoria/consultoria"
                        aria-label="Ver auditoria/consultoria"
                      >
                        <Icons.Document />
                      </button>
                    )}
                    <button
                      type="button"
                      className="action-btn-compact"
                      onClick={() => setShowResultViewer(true)}
                      title="Ver detalhado lado a lado"
                      aria-label="Ver detalhado lado a lado"
                    >
                      <Icons.Eye />
                    </button>
                    <button
                      type="button"
                      className="action-btn-compact"
                      onClick={() => setDownloadModalOpen(true)}
                      title="Baixar ZIP"
                      aria-label="Baixar ZIP"
                    >
                      <Icons.Download />
                    </button>
                  </div>
                </div>

                {!isNvidiaMode && result.summary && (
                  <div className="result-summary-inline">
                    <h4>Resumo</h4>
                    <p>{result.summary}</p>
                  </div>
                )}

                {resultStats && (
                  <div className="result-metrics-grid">
                    <div className="result-metric">
                      <span className="metric-label">Linhas originais</span>
                      <strong className="metric-value">{resultStats.originalLines}</strong>
                    </div>
                    <div className="result-metric">
                      <span className="metric-label">Linhas otimizadas</span>
                      <strong className="metric-value">{resultStats.optimizedLines}</strong>
                    </div>
                    <div className="result-metric">
                      <span className="metric-label">Adicionadas</span>
                      <strong className="metric-value">+{resultStats.added}</strong>
                    </div>
                    <div className="result-metric">
                      <span className="metric-label">Removidas</span>
                      <strong className="metric-value">-{resultStats.removed}</strong>
                    </div>
                    <div className="result-metric">
                      <span className="metric-label">Modificadas</span>
                      <strong className="metric-value">{resultStats.modified}</strong>
                    </div>
                  </div>
                )}

                <div className={`result-code-panels ${isNvidiaMode ? "single" : "dual"}`}>
                  {!isNvidiaMode && (
                    <div className="code-card">
                      <div className="code-card-header">
                        <span className="pill">Original</span>
                        <span className="muted">{result.originalScript.split(/\r?\n/).length} linhas</span>
                      </div>
                      <pre className="code-block">{result.originalScript}</pre>
                    </div>
                  )}

                  <div className="code-card">
                    <div className="code-card-header">
                      <span className="pill primary">Otimizado</span>
                      <span className="muted">{result.optimizedScript.split(/\r?\n/).length} linhas</span>
                    </div>
                    <pre className="code-block">{result.optimizedScript}</pre>
                  </div>
                </div>
              </section>

              {!user && (
                <div className="adsterra-inline-container">
                  <AdsterraAd
                    format="banner"
                    title="🎯 Apoie o Qlik Codex I.A"
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* FOOTER HORIZONTAL - FORA DO OPT-CONTENT */}
      <div style={{
        width: "100%",
        height: "48px",
        minHeight: "48px",
        maxHeight: "48px",
        padding: "0 24px",
        background: "#0a0e17",
        borderTop: "1px solid rgba(0, 242, 255, 0.15)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        flexWrap: "nowrap",
        overflow: "hidden",
        flexShrink: 0
      }}>
        <BrandMark variant="wordmark" size="sm" showBeta className="opt-footer-brand" />
        <span style={{ color: "#444" }}></span>
        <span style={{ color: "#888", fontSize: "0.75rem", whiteSpace: "nowrap" }}> 2025 Sentinnell IA</span>
        <span style={{ color: "#444" }}></span>
        <a href="https://github.com/jeanrrf" target="_blank" rel="noopener noreferrer" style={{ color: "#888", fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}>GitHub</a>
        <a href="https://api.whatsapp.com/send?phone=5548991937304" target="_blank" rel="noopener noreferrer" style={{ color: "#888", fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}>WhatsApp</a>
      </div>

      {/* Modals */}
      < ScriptCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onConfirm={handlePayloadLoaded}
      />

      <DownloadModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        result={result}
      />

      {
        showConsultancy && consultancyDoc && (
          <ConsultancyDocumentViewer
            document={consultancyDoc}
            onClose={() => setShowConsultancy(false)}
          />
        )
      }

      {/* SCRIPT INFO MODAL - Informações do script carregado */}
      {showScriptInfo && scriptInfo && (
        <ScriptInfoModal
          info={scriptInfo}
          onClose={() => setShowScriptInfo(false)}
        />
      )}

      {/* RESULT VIEWER MODAL - Visualização lado a lado */}
      {showResultViewer && result && (
        <ResultViewerModal
          result={result}
          onClose={() => setShowResultViewer(false)}
          onDownload={() => setDownloadModalOpen(true)}
        />
      )}

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={recentRuns}
      />

    </div >
  );
};

export default OptimizerPageV2;
