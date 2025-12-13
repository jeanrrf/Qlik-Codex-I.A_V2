// web/src/pages/OptimizerPageV2.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import "./OptimizerPageV2.css";
import "./ControlPanel.css";
import "./PipelineCard.css";
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
import { analyzeScriptComplexity, ScriptComplexityMetrics } from "../lib/scriptAnalysis";
import { loadLatestSnapshot, saveSnapshot } from "../lib/indexedStorage";

type OptimizerPageProps = Record<string, never>;

const OptimizerPageV2: React.FC<OptimizerPageProps> = () => {
  // === STATE ===
  const [script, setScript] = useState<string>("");
  const [mode, setMode] = useState<OptimizeMode>("ultra-expert");
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
  const handleModeChange = (newMode: OptimizeMode) => {
    setMode(newMode);
    optimization.updateMode(newMode); // Atualiza as stages visíveis
  };

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
        if (restored && restored.progressData) {
          console.warn(" Sessão ativa restaurada");
          isRestoringRef.current = true;

          setScript(restored.script);
          if (restored.mode) {
            handleModeChange(restored.mode as OptimizeMode);
          }
          if (restored.llmProvider) {
            const llmOption = LLM_OPTIONS.find(opt => opt.provider === restored.llmProvider);
            if (llmOption) setLlmOptionId(llmOption.id);
          }

          // Restaura progresso completo
          if (restored.progressData) {
            optimization.restoreProgress(restored.progressData);
          }

          // Se estava concluído, tenta restaurar resultado se disponível (não persistido atualmente, mas preparado)
          if (restored.status === "completed") {
            // TODO: Persistir resultado final também para restauração completa
          }

          // Reset flag after a short delay to allow effects to run
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 500);
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
          status: "completed"
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
          status: "error"
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
      risk: "Otimização Máxima",
      description: "Otimização agressiva com todas as análises"
    },
    "nvidia-fast": {
      title: "NVIDIA Fast",
      icon: <Icons.Robot />,
      color: "#39ff14",
      risk: "Refatoração Direta",
      description: "Somente código otimizado direto da GPU",
      helper: "Retorno em poucos segundos  Sem relatórios",
      badge: "NOVO",
      accentClass: "nvidia"
    }
  };

  // === RENDER ===
  return (
    <div className={`opt-page ${mode === "nvidia-fast" ? "nvidia-mode-active" : ""} ${optimization.isOptimizing && mode === "nvidia-fast" ? "optimizing-pulse" : ""}`}>
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
            >

            </button>

            {/* Ver Resultado */}
            <button
              className={`action-btn-compact result ${!result ? "disabled-blur" : ""}`}
              onClick={() => result && setShowResultViewer(true)}
              disabled={!result}
              title={result ? "Ver resultado da otimização" : "Resultado será exibido após otimização"}
            >

            </button>

            {/* Baixar */}
            <button
              className={`action-btn-compact download ${!result ? "disabled-blur" : ""}`}
              onClick={() => result && setDownloadModalOpen(true)}
              disabled={!result}
              title={result ? "Baixar arquivos" : "Download disponível após otimização"}
            >
              <Icons.Download />
            </button>

            {/* Histórico */}
            <button
              className="action-btn-compact history"
              onClick={() => setShowHistoryModal(true)}
              title="Histórico de Execuções"
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

          {/* Pipeline Progress - REFATORADO */}
          <PipelineContainer
            progress={optimization.progress as unknown as PipelineProgress}
            mode={mode}
            title=" Pipeline de Otimização"
            modeInfo={{
              title: modeInfo[mode].title,
              icon: modeInfo[mode].icon,
            }}
          />

          {/* Pipeline KPIs */}
          <PipelineKPIs
            progress={optimization.progress as unknown as PipelineProgress}
            result={result}
            showAinexNote={true}
          />

          {/* Resultado inline */}
          {hasResult && result && (
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
                      className="action-btn-compact"
                      onClick={() => setShowConsultancy(true)}
                      title="Ver auditoria/consultoria"
                    >
                      <Icons.Document />
                    </button>
                  )}
                  <button
                    className="action-btn-compact"
                    onClick={() => setShowResultViewer(true)}
                    title="Ver detalhado lado a lado"
                  >
                    <Icons.Eye />
                  </button>
                  <button
                    className="action-btn-compact"
                    onClick={() => setDownloadModalOpen(true)}
                    title="Baixar ZIP"
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
