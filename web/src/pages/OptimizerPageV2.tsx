// web/src/pages/OptimizerPageV2.tsx
import React, { useMemo, useState, useEffect } from "react";
import "./OptimizerPageV2.css";
import "./ControlPanel.css";
import "./PipelineCard.css";
import "./ModalStyles.css";

import { apiClient } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types/auth";
import { formatDuration } from "../lib/formatTime";
import { UserMenu } from "../components/UserMenu";
import ConsultancyDocumentViewer from "../components/ConsultancyDocumentViewer";
import ROICard from "../components/ROICard";
import ScriptAnalysisInfo from "../components/ScriptAnalysisInfo";
import ScriptInfoModal, { ScriptInfo } from "../components/ScriptInfoModal";
import { getLLMOptionById, LLM_OPTIONS } from "../lib/llmOptions";
import {
  OptimizeMode,
  OptimizeResult
} from "../types/api";
import type { ConsultancyDocument } from "../types/consultancy";
import { UploadedFileMeta, UploadedFilePayload } from "../types/ui";
import ScriptCaptureModal from "../components/ScriptCaptureModal";
import DownloadModal from "../components/DownloadModal";
import { useOptimizationProgress } from "../hooks/useOptimizationProgress";
import { useSessionPersistence } from "../hooks/useSessionPersistence";

interface OptimizerPageProps {
  onBackToLanding: () => void;
}

// Icons
const Icons = {
  Back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  ),
  Download: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Play: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  File: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  ),
  Search: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <circle cx="11" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  Zap: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12H12l1-8Z" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
    </svg>
  ),
  Shield: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
      <circle cx="17" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  Clipboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Robot: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  ),
  Document: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  Analytics: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
      <circle cx="18.7" cy="8" r="1" fill="currentColor" />
      <circle cx="13.6" cy="13.2" r="1" fill="currentColor" />
      <circle cx="10.8" cy="10.5" r="1" fill="currentColor" />
      <circle cx="7" cy="14.3" r="1" fill="currentColor" />
    </svg>
  )
};

const Spinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// Função para syntax highlighting simples de Qlik
const highlightQlikSyntax = (line: string): string => {
  // Escape HTML
  let highlighted = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Keywords Qlik (case insensitive)
  const keywords = /\b(LOAD|FROM|WHERE|SELECT|AS|JOIN|LEFT|RIGHT|INNER|OUTER|RESIDENT|CONCATENATE|IF|THEN|ELSE|ENDIF|FOR|TO|NEXT|DO|LOOP|WHILE|STORE|DROP|FIELD|FIELDS|TABLE|TABLES|QUALIFY|UNQUALIFY|LET|SET|CALL|SUB|ENDSUB|EXIT|SCRIPT|WHEN|CASE|END|REPLACE|MAPPING|APPLYMAP|PEEK|PREVIOUS|EXISTS|KEEP|ONLY|NOCONCATENATE|AUTOGENERATE|INLINE|BUFFER|QVD|TXT|CSV|SQL)\b/gi;
  highlighted = highlighted.replace(keywords, '<span class="syntax-keyword">$1</span>');

  // Strings (entre aspas simples ou duplas)
  highlighted = highlighted.replace(/('[^']*')/g, '<span class="syntax-string">$1</span>');
  highlighted = highlighted.replace(/("[^"]*")/g, '<span class="syntax-string">$1</span>');

  // Números
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="syntax-number">$1</span>');

  // Comentários (// ou REM)
  highlighted = highlighted.replace(/(\/\/.*$|REM .*$)/gi, '<span class="syntax-comment">$1</span>');

  // Funções (palavra seguida de parêntese)
  highlighted = highlighted.replace(/\b([A-Za-z_]\w*)\s*\(/g, '<span class="syntax-function">$1</span>(');

  // Operadores
  highlighted = highlighted.replace(/([+\-*/%=<>!&|])/g, '<span class="syntax-operator">$1</span>');

  return highlighted;
};

const OptimizerPageV2: React.FC<OptimizerPageProps> = ({ onBackToLanding }) => {
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
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  // === HOOKS ===
  const { user } = useAuth();
  const optimization = useOptimizationProgress();
  const session = useSessionPersistence();

  // Check if user is OWNER (has full features)
  const isOwner = user?.role === UserRole.OWNER;

  // FREE TIER: Cálculo de linhas e limites
  const scriptLineCount = script ? script.split(/\r?\n/).length : 0;
  const FREE_TIER_LINE_LIMIT = 200;
  const exceedsLineLimit = !isOwner && scriptLineCount > FREE_TIER_LINE_LIMIT;
  const willBeTruncated = exceedsLineLimit;

  // FREE TIER: Controle de visibilidade do banner de aviso
  const [showFreeTierWarning, setShowFreeTierWarning] = useState(true);

  // FREE TIER: Contador de Ultra Expert (1 por DIA para USER)
  const [ultraExpertUsageCount, setUltraExpertUsageCount] = useState(0);
  const MAX_ULTRA_EXPERT_RUNS = isOwner ? -1 : 1; // -1 = ilimitado
  const hasUltraExpertQuotaLeft = isOwner || ultraExpertUsageCount < MAX_ULTRA_EXPERT_RUNS;

  // Sincroniza mudança de modo com o hook de progresso
  const handleModeChange = (newMode: OptimizeMode) => {
    setMode(newMode);
    optimization.updateMode(newMode); // Atualiza as stages visíveis
  };

  // Force Ultra Expert mode on mount
  useEffect(() => {
    if (mode !== 'ultra-expert') {
      handleModeChange('ultra-expert');
    }
  }, []);

  const selectedLLM = useMemo(() => getLLMOptionById(llmOptionId), [llmOptionId]);

  // === AUTO SHOW SCRIPT INFO WHEN SCRIPT IS LOADED ===
  useEffect(() => {
    // Se há script carregado mas o modal não foi exibido ainda, exibe
    if (script && script?.trim().length > 50 && !scriptInfo && uploadMeta) {
      const lines = script.split(/\r?\n/).length;
      const size = new Blob([script]).size;
      const estimatedTokens = Math.ceil(script.length / 4);

      let complexity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (lines > 1000 || size > 100000) {
        complexity = 'critical';
      } else if (lines > 500 || size > 50000) {
        complexity = 'high';
      } else if (lines > 200 || size > 20000) {
        complexity = 'medium';
      }

      setScriptInfo({
        lines,
        size,
        complexity,
        estimatedTokens,
        fileName: uploadMeta.name,
        fileType: uploadMeta.extension || 'txt'
      });
      setShowScriptInfo(true);
    }
  }, [script, uploadMeta, scriptInfo]);

  // === AUTO RESTORE SESSION ON MOUNT ===
  useEffect(() => {
    // Tenta recuperar sessão ativa ao carregar
    const restoreActiveSession = async () => {
      try {
        const restored = await session.restoreSession();
        if (restored && restored.progressData) {
          console.warn("✓ Sessão ativa restaurada");
          setScript(restored.script);
          // Force Ultra Expert as Analysis mode is deprecated
          setMode("ultra-expert");
          if (restored.llmProvider) {
            const llmOption = LLM_OPTIONS.find(opt => opt.provider === restored.llmProvider);
            if (llmOption) setLlmOptionId(llmOption.id);
          }
          // Restaura progresso se estava em execução
          if (restored.status === "running") {
            console.warn("ℹ️ Sessão estava em execução, mas não pode ser retomada automaticamente");
            // Usuário precisará executar novamente
          }
        }
      } catch (error) {
        console.warn("Não foi possível restaurar sessão:", error);
      }
    };

    restoreActiveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === RESET PROGRESS WHEN MODE CHANGES ===
  // Reset UI progress when the selected mode changes.
  // Only depend on `mode` and the specific reset function from the hook
  // to avoid re-running on every render due to the whole `optimization` object
  // changing identity (which caused a maximum update depth loop).
  useEffect(() => {
    optimization.resetProgress();
    setResult(null);
    setConsultancyDoc(null);
    setError(null);
    // Note: do NOT include the whole `optimization` object here — it's created
    // as a fresh object on each render which breaks the effect. Depend only on
    // `mode` (and the stable `resetProgress` function implicitly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // === AUTO-SAVE SESSION DURING OPTIMIZATION ===
  useEffect(() => {
    if (optimization.isRunning && script?.trim()) {
      // Salva sessão automaticamente a cada mudança de progresso
      session.saveSessionDebounced({
        sessionId: session.sessionId,
        mode,
        script: script?.trim() || '',
        llmProvider: selectedLLM.provider,
        llmModel: selectedLLM.model,
        progressData: optimization.progress,
        isRunning: true
      });
    }
  }, [optimization.isRunning, optimization.progress, script, mode, selectedLLM, session]);

  // === HANDLERS ===
  const handleOptimize = async () => {
    setError(null);
    setResult(null);
    setConsultancyDoc(null);

    const trimmed = script?.trim() || '';
    if (!trimmed) {
      setError("Cole um script Qlik ou importe um arquivo antes de otimizar.");
      return;
    }

    // FREE TIER: Verifica quota de Ultra Expert
    if (!isOwner && mode === 'ultra-expert' && !hasUltraExpertQuotaLeft) {
      setError(`FREE TIER: Você atingiu o limite de ${MAX_ULTRA_EXPERT_RUNS} execução(ões) Ultra Expert POR DIA. O limite geral é de 4 execuções/dia (análise + ultra expert). Aguarde renovação diária.`);
      return;
    }

    // Connect to SSE stream for real-time progress
    optimization.connect();

    try {
      const res = await optimization.startOptimization({
        script: trimmed,
        mode,
        llmProvider: selectedLLM.provider,
        llmModel: selectedLLM.model
      });

      if (res) {
        const { consultancyDocument, ...optResult } = res;
        setResult(optResult);
        if (consultancyDocument) {
          setConsultancyDoc(consultancyDocument);
        }

        // FREE TIER: Incrementa contador de Ultra Expert após sucesso
        if (!isOwner && mode === 'ultra-expert') {
          setUltraExpertUsageCount(prev => prev + 1);
        }

        // Salva sessão completa após finalização
        await session.saveSession({
          sessionId: session.sessionId,
          mode,
          script: trimmed,
          llmProvider: selectedLLM.provider,
          llmModel: selectedLLM.model,
          progressData: optimization.progress,
          status: "completed"
        }).catch(console.error);
      } else if (optimization.progress.errorMessage) {
        setError(optimization.progress.errorMessage);

        // Salva sessão com erro
        await session.saveSession({
          sessionId: session.sessionId,
          mode,
          script: trimmed,
          llmProvider: selectedLLM.provider,
          llmModel: selectedLLM.model,
          progressData: optimization.progress,
          status: "error"
        }).catch(console.error);
      }
    } catch (err) {
      console.error("Optimization error:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
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
    const lines = payload.content.split(/\r?\n/).length;
    const size = new Blob([payload.content]).size;
    const estimatedTokens = Math.ceil(payload.content.length / 4);

    // Calcular complexidade baseada em linhas e caracteres
    let complexity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (lines > 1000 || size > 100000) {
      complexity = 'critical';
    } else if (lines > 500 || size > 50000) {
      complexity = 'high';
    } else if (lines > 200 || size > 20000) {
      complexity = 'medium';
    }

    setScriptInfo({
      lines,
      size,
      complexity,
      estimatedTokens,
      fileName: payload.meta.name,
      fileType: payload.meta.extension || 'txt'
    });
    setShowScriptInfo(true);
  };



  // === COMPUTED ===
  const canOptimize = script?.trim().length > 0 && !optimization.isRunning;

  const modeInfo = {
    "ultra-expert": {
      title: "Ultra Expert",
      icon: <Icons.Zap />,
      color: "#ff2a6d",
      risk: "Otimização Máxima",
      description: "Otimização agressiva com todas as análises"
    }
  };

  // === RENDER ===
  return (
    <div className="opt-page">
      {/* Background */}
      <div className="opt-bg">
        <div className="bg-gradient" />
        <div className="bg-grid" />
      </div>

      {/* Header Minimalista */}
      <header className="opt-header-minimal">
        <div className="header-brand-minimal">
          <button className="back-btn-minimal" onClick={onBackToLanding} title="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="brand-logo">
            <div className="brand-icon">⚡</div>
            <div className="brand-info">
              <span className="brand-name">SENTINNEL IA</span>
              <span className="brand-product">Qlik Codex</span>
            </div>
          </div>
        </div>

        <div className="header-center">
          <div className="header-title-badge">
            <span className="badge-dot"></span>
            <span>QLIK CODEX I.A</span>
          </div>
        </div>

        <div className="header-user">
          <UserMenu />
        </div>
      </header>

      {/* FREE TIER WARNING BANNER */}
      {!isOwner && willBeTruncated && showFreeTierWarning && (
        <div className="free-tier-warning-banner">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <strong>FREE TIER - Limite de Linhas Excedido</strong>
            <p>
              Seu script tem <strong>{scriptLineCount} linhas</strong>, mas o FREE TIER limita a <strong>{FREE_TIER_LINE_LIMIT} linhas</strong>.
              O script será automaticamente truncado com <strong>corte inteligente</strong> (até +30 linhas extras para completar blocos).
            </p>
          </div>
          <button className="warning-dismiss" onClick={() => setShowFreeTierWarning(false)} title="Entendi">
            ✕
          </button>
        </div>
      )}

      {/* Control Panel Master - Layout Grid Redesigned */}
      <div className={`control-panel-master-compact expert-mode`}>
        {/* Coluna Esquerda: Modo + Status */}
        <div className="control-left-section">
          {/* Modos */}
          <div className="control-section-compact mode-section-compact">
            <div className="section-icon-compact">🎯</div>
            <div className="mode-cards-horizontal">
              <button
                className={`mode-card-compact active expert ${!isOwner && !hasUltraExpertQuotaLeft ? 'disabled-quota' : ''}`}
                onClick={() => { }}
                disabled={!isOwner && !hasUltraExpertQuotaLeft}
                title={!isOwner && !hasUltraExpertQuotaLeft ? 'Quota diária de Ultra Expert esgotada. Limite geral: 4 execuções/dia. Aguarde renovação.' : undefined}
                style={{ cursor: 'default', width: '100%' }}
              >
                <div className="mode-card-icon-compact expert-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
                  </svg>
                </div>
                <div className="mode-card-text-compact">
                  <h4>Ultra Expert</h4>
                  <p>Otimização máxima</p>
                  {!isOwner && (
                    <div className={`ultra-expert-quota ${!hasUltraExpertQuotaLeft ? 'quota-exhausted' : ''}`}>
                      <span className="quota-icon">{hasUltraExpertQuotaLeft ? '🎟️' : '🚫'}</span>
                      <span className="quota-text">
                        {MAX_ULTRA_EXPERT_RUNS - ultraExpertUsageCount} de {MAX_ULTRA_EXPERT_RUNS} execuções
                      </span>
                    </div>
                  )}
                </div>
                <div className="mode-active-dot expert" />
                <div className="expert-flame-mini" />
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Central: Executar + Stop (Grande e Destacado) */}
        <div className="control-center-section">
          <div className="execution-controls">
            {!optimization.isRunning ? (
              <button
                className={`btn-execute-main ${!canOptimize ? 'disabled' : ''}`}
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
                {mode === 'ultra-expert' && canOptimize && (
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

        {/* Coluna Direita: Ações Secundárias */}
        <div className="control-right-section">
          <div className="control-section-compact actions-section-compact">
            <div className="section-icon-compact">⚡</div>
            <div className="action-cards-compact">
              {/* Consultoria */}
              <button
                className={`action-btn-compact consultancy ${!consultancyDoc ? 'disabled-blur' : ''}`}
                onClick={() => consultancyDoc && setShowConsultancy(true)}
                disabled={!consultancyDoc}
                title={consultancyDoc ? "Consultoria disponível" : "Consultoria será gerada após otimização"}
              >
                📊
              </button>

              {/* Ver Resultado */}
              <button
                className={`action-btn-compact result ${!result ? 'disabled-blur' : ''}`}
                onClick={() => result && setShowResultViewer(true)}
                disabled={!result}
                title={result ? "Ver resultado da otimização" : "Resultado será exibido após otimização"}
              >
                📄
              </button>

              {/* Baixar */}
              <button
                className={`action-btn-compact download ${!result ? 'disabled-blur' : ''}`}
                onClick={() => result && setDownloadModalOpen(true)}
                disabled={!result}
                title={result ? "Baixar arquivos" : "Download disponível após otimização"}
              >
                <Icons.Download />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="opt-content">
        {/* Left Panel - Controls */}
        <aside className="opt-sidebar">
          {/* Script Input with File Details */}
          <div className="ctrl-card script-card">
            <div className="ctrl-header">
              <Icons.File />
              <span>Script</span>
              <button className="ctrl-btn" onClick={() => setCaptureOpen(true)}>
                {uploadMeta || script?.trim() ? "Trocar" : "Carregar"}
              </button>
            </div>
            {(uploadMeta || script?.trim()) ? (
              <>
                <div className="script-filename">
                  <span className="filename-text">{uploadMeta?.name || "Input Manual"}</span>
                  <span className="filename-ext">.qvs</span>
                </div>

                {/* Administração de Carga Section */}
                <div className="file-admin-section">
                  <div className="admin-header">
                    <span className="admin-icon"><Icons.Clipboard /></span>
                    <span className="admin-title">Administração de Carga</span>
                  </div>
                  <span className="admin-badge">ARQUIVO CARREGADO</span>

                  <div className="admin-details">
                    <div className="admin-row">
                      <span className="admin-label">ARQUIVO</span>
                      <div className="admin-value-row">
                        <span className="admin-file-icon"><Icons.File /></span>
                        <span className="admin-value">{uploadMeta?.name || "script"}</span>
                      </div>
                    </div>
                    <div className="admin-row">
                      <span className="admin-label">TAMANHO</span>
                      <span className="admin-value">{uploadMeta?.size ? `${(uploadMeta.size / 1024).toFixed(1)} KB` : 'N/A'}</span>
                      <span className="admin-sub">{uploadMeta?.size ? `${uploadMeta.size.toLocaleString()} bytes` : ''}</span>
                    </div>
                    <div className="admin-row">
                      <span className="admin-label">LINHAS</span>
                      <span className={`admin-value lines-value ${exceedsLineLimit ? 'warning' : ''}`}>
                        {uploadMeta?.lineCount ?? scriptLineCount}
                      </span>
                      {exceedsLineLimit && (
                        <span className="admin-warning-badge">⚠️ Limite FREE TIER</span>
                      )}
                    </div>
                    {exceedsLineLimit && (
                      <div className="admin-row truncation-notice">
                        <span className="truncation-icon">✂️</span>
                        <div className="truncation-text">
                          <strong>Será truncado para {FREE_TIER_LINE_LIMIT} linhas</strong>
                          <small>(+até 30 linhas extras para blocos completos)</small>
                        </div>
                      </div>
                    )}
                    <div className="admin-row">
                      <span className="admin-label">CARREGADO EM</span>
                      <div className="admin-value-row">
                        <span className="admin-time-icon"><Icons.Clock /></span>
                        <span className="admin-value">{new Date().toLocaleTimeString('pt-BR')}</span>
                      </div>
                      <span className="admin-sub">{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="ctrl-empty">Nenhum script carregado</div>
            )}
          </div>

          {/* Análise do Script - Sidebar */}
          {(script?.trim() || uploadMeta) && (
            <div className="ctrl-card analysis-card">
              <div className="ctrl-header">
                <Icons.Analytics />
                <span>Análise do Script</span>
              </div>
              <div className="analysis-metrics">
                <div className="analysis-metric">
                  <span className="analysis-label">Complexidade</span>
                  <span className={`analysis-value complexity-${optimization.scriptAnalysis?.complexity || 'medium'}`}>
                    {optimization.scriptAnalysis?.complexity
                      ? optimization.scriptAnalysis.complexity === 'low' ? 'Baixa'
                        : optimization.scriptAnalysis.complexity === 'medium' ? 'Média'
                          : optimization.scriptAnalysis.complexity === 'high' ? 'Alta'
                            : 'Crítica'
                      : 'Média'}
                  </span>
                </div>
                <div className="analysis-metric">
                  <span className="analysis-label">Tokens Est.</span>
                  <span className="analysis-value">
                    {optimization.scriptAnalysis?.estimatedTokens
                      ? `${(optimization.scriptAnalysis.estimatedTokens / 1000).toFixed(1)}K`
                      : `${(Math.ceil(script.length / 4) / 1000).toFixed(1)}K`}
                  </span>
                </div>
                {optimization.scriptAnalysis?.strategy && (
                  <div className="analysis-metric">
                    <span className="analysis-label">Estratégia</span>
                    <span className="analysis-value strategy-value">
                      {optimization.scriptAnalysis.strategy === 'full' ? 'Completa'
                        : optimization.scriptAnalysis.strategy === 'chunked' ? 'Chunks'
                          : 'Otimizada'}
                    </span>
                  </div>
                )}
                {optimization.scriptAnalysis?.qvdOperations && optimization.scriptAnalysis.qvdOperations.total > 0 && (
                  <div className="analysis-metric qvd">
                    <span className="analysis-label">QVD Ops</span>
                    <span className="analysis-value qvd-value">
                      L:{optimization.scriptAnalysis.qvdOperations.reads} G:{optimization.scriptAnalysis.qvdOperations.writes}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Main Area */}
        <main className="opt-main">
          {/* Error Alert */}
          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <div className="error-text">
                <strong>Erro</strong>
                <p>{error}</p>
              </div>
              <button className="error-close" onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Pipeline Progress - REAL */}
          <div className="pipeline-card">
            <div className="pipeline-header">
              <h2>⚡ Pipeline de Otimização</h2>
              <span className={`mode-badge ${mode}`}>
                {modeInfo[mode].icon} {modeInfo[mode].title}
              </span>
            </div>

            {/* Cards Superiores com Subtasks Integradas */}
            {(() => {
              const visibleStages = optimization.progress.stages.filter(stage => stage.visible !== false);
              const stageCount = visibleStages.length;
              return (
                <div className={`stage-cards-row stages-${stageCount}`}>
                  {visibleStages.map((stage, index) => {
                    const colors = ['#00f2ff', '#00ff9d', '#ffb800', '#ff6b6b'];
                    const icons = [<Icons.Search key="s" />, <Icons.Zap key="z" />, <Icons.Shield key="sh" />, <Icons.CheckCircle key="c" />];
                    const color = colors[index % colors.length];
                    const icon = icons[index % icons.length];

                    const subSteps = stage?.subSteps || [];
                    const completedSubSteps = subSteps.filter(s => s.status === "success").length;
                    const totalSubSteps = subSteps.length;
                    const progressPercent = totalSubSteps > 0 ? Math.round((completedSubSteps / totalSubSteps) * 100) : 0;
                    const isComplete = stage?.status === "success" || (totalSubSteps > 0 && subSteps.every(s => s.status === "success"));
                    const isActive = stage?.status === "running" || subSteps.some(s => s.status === "running");
                    const hasError = stage?.status === "error" || subSteps.some(s => s.status === "error");
                    const cardDuration = subSteps.reduce((sum, sub) => sum + (sub.duration || 0), 0) || (stage?.duration || 0);

                    return (
                      <details
                        key={stage.id}
                        className={`stage-card-v3 ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                        open={true}
                        style={{
                          '--card-color': color,
                          borderColor: isComplete ? '#00ff9d' : isActive ? color : undefined,
                          background: `linear-gradient(145deg, ${color}10, rgba(12, 16, 30, 0.95))`
                        } as React.CSSProperties}
                      >
                        <summary className="card-summary">
                          <div className="card-top-accent" style={{ background: isComplete ? '#00ff9d' : color }} />

                          <div className="card-top-row">
                            <div className="card-icon-box" style={{ background: `${color}15`, borderColor: `${color}40`, color: color }}>
                              {icon}
                            </div>

                            <div className="card-text-block">
                              <h3 className="card-title-main">{stage.name}</h3>
                              <p className="card-desc">{totalSubSteps} tarefas</p>
                            </div>

                            <div className="card-status-badge-container">
                              {isActive ? (
                                <span className="status-pill active" style={{ borderColor: color, color: color, background: `${color}15` }}>
                                  EXEC
                                </span>
                              ) : isComplete ? (
                                <span className="status-pill complete">✓</span>
                              ) : hasError ? (
                                <span className="status-pill error">!</span>
                              ) : (
                                <span className="status-pill pending">...</span>
                              )}
                            </div>
                          </div>

                          <div className="card-progress-area">
                            <div className="card-progress-track">
                              <div
                                className="card-progress-bar"
                                style={{
                                  width: `${progressPercent}%`,
                                  background: isComplete ? '#00ff9d' : color,
                                  boxShadow: `0 0 10px ${isComplete ? '#00ff9d' : color}`
                                }}
                              />
                            </div>
                            <div className="card-progress-labels">
                              <span className="card-steps-count">{completedSubSteps}/{totalSubSteps}</span>
                              <span className="card-percent-value">{progressPercent}%</span>
                            </div>
                          </div>

                          {isActive && <div className="card-glow-pulse" style={{ borderColor: color }} />}
                        </summary>

                        {/* SUBTASKS DENTRO DO CARD */}
                        <div className="card-substeps">
                          {subSteps.map((subStep) => {
                            const isRunning = subStep.status === "running";
                            const runningTime = isRunning && subStep.currentRunningTime ? subStep.currentRunningTime : 0;
                            const isNearTimeout = runningTime > 150000;

                            return (
                              <div key={subStep.id} className={`substep-item ${subStep.status} ${isNearTimeout ? 'warning-timeout' : ''}`}>
                                <div className="substep-indicator">
                                  {isRunning ? (
                                    <Spinner size={10} />
                                  ) : subStep.status === "success" ? (
                                    <Icons.Check />
                                  ) : subStep.status === "error" ? (
                                    <Icons.X />
                                  ) : (
                                    <div className="substep-dot" />
                                  )}
                                </div>
                                <span className="substep-name">{subStep.name}</span>
                                {isRunning && runningTime > 0 && (
                                  <span className={`substep-time ${isNearTimeout ? 'warning' : ''}`}>
                                    🕐 {formatDuration(runningTime)}
                                  </span>
                                )}
                                {subStep.duration && subStep.status === "success" && (
                                  <span className="substep-duration">{formatDuration(subStep.duration)}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              );
            })()}

            {/* Real KPIs */}
            {
              (optimization.progress.status === "success" || result) && (
                <div className="pipeline-kpis">
                  <div className="kpi">
                    <span className="kpi-label">⏱️ Tempo Total</span>
                    <span className="kpi-value">{formatDuration(optimization.progress.elapsedTime)}</span>
                  </div>
                  <div className="kpi">
                    <span className="kpi-label">Etapas</span>
                    <span className="kpi-value">
                      {optimization.progress.stages.filter(s => s.visible !== false && s.status === "success").length}/
                      {optimization.progress.stages.filter(s => s.visible !== false).length}
                    </span>
                  </div>
                  {result && (
                    <>
                      <div className="kpi">
                        <span className="kpi-label">Mudanças</span>
                        <span className="kpi-value">{result.analysis.changes.length}</span>
                      </div>
                      <div className="kpi">
                        <span className="kpi-label">Risco</span>
                        <span className={`kpi-value risk-${result.analysis.breakingRisk}`}>
                          {result.analysis.breakingRisk === "none" ? "Nenhum" :
                            result.analysis.breakingRisk === "low" ? "Baixo" :
                              result.analysis.breakingRisk === "medium" ? "Médio" : "Alto"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )
            }
          </div>

          {/* Onboarding Tooltip - Shows where to start */}
          {!script?.trim() && !uploadMeta && !optimization.isRunning && !dismissOnboarding && (
            <div className="onboarding-overlay" onClick={() => setDismissOnboarding(true)}>
              <div className="onboarding-spotlight" onClick={(e) => e.stopPropagation()} />
              <div className="onboarding-tooltip" onClick={(e) => e.stopPropagation()}>
                <div className="tooltip-content">
                  <button className="tooltip-close" onClick={() => setDismissOnboarding(true)}>
                    ×
                  </button>
                  <div className="tooltip-icon">🚀</div>
                  <h2 className="tooltip-title">Bem-vindo ao Qlik Codex I.A!</h2>
                  <p className="tooltip-description">
                    Para começar a otimizar seus scripts Qlik, clique no botão <strong>"Carregar"</strong> no painel lateral esquerdo.
                  </p>
                  <div className="tooltip-arrow-container">
                    <div className="tooltip-arrow">←</div>
                    <span className="tooltip-arrow-text">Clique aqui para iniciar</span>
                  </div>
                  <button className="tooltip-dismiss-btn" onClick={() => setDismissOnboarding(true)}>
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FOOTER HORIZONTAL - FORA DO OPT-CONTENT */}
      <div style={{
        width: '100%',
        height: '48px',
        minHeight: '48px',
        maxHeight: '48px',
        padding: '0 24px',
        background: '#0a0e17',
        borderTop: '1px solid rgba(0, 242, 255, 0.15)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <span style={{ color: '#00f2ff', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>⚡ QLIK CODEX I.A</span>
        <span style={{ color: '#333' }}>•</span>
        <span style={{ color: '#888', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>© 2025 Sentinnell IA</span>
        <span style={{ color: '#333' }}>•</span>
        <span style={{ color: '#00ff9d', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>AINEX</span>
        <span style={{ color: '#333' }}>•</span>
        <a href="https://github.com/jeanrrf" target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>GitHub</a>
        <a href="https://api.whatsapp.com/send?phone=5548999373041" target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>WhatsApp</a>
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
      {
        showResultViewer && result && (
          <div className="modal-overlay" onClick={() => setShowResultViewer(false)}>
            <div className="modal-container result-viewer-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📊 Resultado da Otimização</h2>
                <div className="result-header-actions">
                  <button className="action-btn secondary small" onClick={() => setDownloadModalOpen(true)}>
                    <Icons.Download /> Baixar ZIP
                  </button>
                  <button className="close-btn" onClick={() => setShowResultViewer(false)}>×</button>
                </div>
              </div>
              <div className="modal-body result-viewer-body">
                {/* Summary */}
                <div className="result-summary-card">
                  <h4>📝 Resumo</h4>
                  <p>{result.summary}</p>
                  {result.changes && result.changes.length > 0 && (
                    <div className="changes-count">
                      <span className="badge">{result.changes.length} mudanças</span>
                      <span className="badge safe">{result.changes.filter(c => c.riskLevel === 'low').length} baixo risco</span>
                      <span className="badge warning">{result.changes.filter(c => c.riskLevel === 'medium').length} médio</span>
                      <span className="badge danger">{result.changes.filter(c => c.riskLevel === 'high').length} alto</span>
                    </div>
                  )}
                </div>

                {/* Code Comparison com Scroll Sincronizado */}
                <div className="code-comparison">
                  <div className="code-panel original">
                    <div className="code-panel-header">
                      <span className="panel-label">📄 Original</span>
                      <span className="line-count">{result.originalScript.split('\n').length} linhas</span>
                    </div>
                    <div
                      className="code-content-wrapper"
                      onScroll={(e) => {
                        const target = e.currentTarget;
                        const optimizedPanel = target.parentElement?.parentElement?.querySelector('.optimized .code-content-wrapper') as HTMLDivElement;
                        if (optimizedPanel && optimizedPanel !== target) {
                          optimizedPanel.scrollTop = target.scrollTop;
                          optimizedPanel.scrollLeft = target.scrollLeft;
                        }
                      }}
                    >
                      <pre className="code-content qlik-syntax">
                        {result.originalScript.split('\n').map((line, idx) => (
                          <div key={idx} className="code-line">
                            <span className="line-number">{idx + 1}</span>
                            <span className="line-content" dangerouslySetInnerHTML={{ __html: highlightQlikSyntax(line) }} />
                          </div>
                        ))}
                      </pre>
                    </div>
                  </div>
                  <div className="code-panel optimized">
                    <div className="code-panel-header">
                      <span className="panel-label">✨ Otimizado</span>
                      <span className="line-count">{result.optimizedScript.split('\n').length} linhas</span>
                    </div>
                    <div
                      className="code-content-wrapper"
                      onScroll={(e) => {
                        const target = e.currentTarget;
                        const originalPanel = target.parentElement?.parentElement?.querySelector('.original .code-content-wrapper') as HTMLDivElement;
                        if (originalPanel && originalPanel !== target) {
                          originalPanel.scrollTop = target.scrollTop;
                          originalPanel.scrollLeft = target.scrollLeft;
                        }
                      }}
                    >
                      <pre className="code-content qlik-syntax">
                        {result.optimizedScript.split('\n').map((line, idx) => (
                          <div key={idx} className="code-line">
                            <span className="line-number">{idx + 1}</span>
                            <span className="line-content" dangerouslySetInnerHTML={{ __html: highlightQlikSyntax(line) }} />
                          </div>
                        ))}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Changes List */}
                {result.changes && result.changes.length > 0 && (
                  <div className="changes-list">
                    <h4>🔧 Lista de Alterações</h4>
                    <div className="changes-grid">
                      {result.changes.slice(0, 10).map((change, idx) => (
                        <div key={idx} className={`change-item risk-${change.riskLevel}`}>
                          <div className="change-header">
                            <span className="change-category">{change.category}</span>
                            <span className={`risk-badge ${change.riskLevel}`}>{change.riskLevel}</span>
                          </div>
                          <p className="change-description">{change.area}</p>
                          {change.impact && <p className="change-impact">💡 {change.impact}</p>}
                        </div>
                      ))}
                      {result.changes.length > 10 && (
                        <p className="more-changes">... e mais {result.changes.length - 10} alterações</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        /* ================ */
        /* OPTIMIZER V2     */
        /* ================ */

        .opt-page {
          min-height: 100vh;
          background: #030508;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* Background */
        .opt-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .bg-gradient {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at top left, rgba(0, 242, 255, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(112, 0, 255, 0.05) 0%, transparent 50%);
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 242, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 255, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at center, black 0%, transparent 80%);
        }

        /* Header */
        .opt-header {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: rgba(3, 5, 8, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .header-left, .header-center, .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* MODE TOGGLE - Modern Segmented Control */
        .mode-toggle-modern {
          position: relative;
          display: flex;
          background: rgba(10, 15, 25, 0.95);
          border-radius: 12px;
          padding: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .mode-toggle-track {
          position: absolute;
          top: 4px;
          left: 4px;
          right: 4px;
          bottom: 4px;
          pointer-events: none;
        }

        .mode-toggle-thumb {
          position: absolute;
          width: calc(50% - 2px);
          height: 100%;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--primary) 0%, #00c8d4 100%);
          box-shadow: 0 2px 12px rgba(0, 242, 255, 0.5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          left: 0;
        }

        .mode-toggle-thumb.ultra {
          left: calc(50% + 2px);
          background: linear-gradient(135deg, var(--warning) 0%, #ff9500 100%);
          box-shadow: 0 2px 12px rgba(255, 184, 0, 0.5);
        }

        .mode-btn-modern {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
          white-space: nowrap;
        }

        .mode-btn-modern svg {
          transition: all 0.3s;
        }

        .mode-btn-modern:hover:not(.active) {
          color: var(--text-secondary);
        }

        .mode-btn-modern.active {
          color: #000;
        }

        .mode-btn-modern.ultra.active {
          color: #000;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .back-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }

        .header-sep {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.1);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .brand-dot {
          width: 6px;
          height: 6px;
          background: var(--primary);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--primary);
        }

        .brand-name {
          font-weight: 700;
          font-size: 0.9rem;
          letter-spacing: -0.01em;
        }

        /* System Status Button */
        .system-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
          background: rgba(15, 20, 35, 0.8);
          font-family: inherit;
        }

        .system-status.ready {
          border-color: rgba(0, 255, 157, 0.3);
          color: var(--success);
        }

        .system-status.ready:hover {
          background: rgba(0, 255, 157, 0.1);
        }

        .system-status.checking {
          border-color: rgba(255, 184, 0, 0.3);
          color: var(--warning);
        }

        .system-status.error {
          border-color: rgba(255, 42, 109, 0.3);
          color: var(--danger);
        }

        .status-time {
          font-size: 0.7rem;
          opacity: 0.7;
        }

        /* Action Buttons */
        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, var(--primary) 0%, #00c8d4 100%);
          color: #000;
        }

        .action-btn.primary:hover:not(:disabled) {
          box-shadow: 0 0 25px rgba(0, 242, 255, 0.4);
        }

        .action-btn.primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .action-btn.primary.running {
          background: linear-gradient(135deg, var(--warning) 0%, #ffcc00 100%);
        }

        .action-btn.secondary {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--primary);
        }

        .action-btn.consultancy {
          background: linear-gradient(135deg, rgba(112, 0, 255, 0.2) 0%, rgba(0, 242, 255, 0.2) 100%);
          color: var(--text-main);
          border: 1px solid rgba(112, 0, 255, 0.4);
        }

        .action-btn.consultancy:hover {
          box-shadow: 0 0 15px rgba(112, 0, 255, 0.3);
        }

        /* Validation Panel */
        .validation-panel {
          background: rgba(15, 20, 35, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding: 16px 24px;
          position: relative;
          z-index: 9;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .validation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .validation-header h3 {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .revalidate-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(0, 242, 255, 0.1);
          border: 1px solid rgba(0, 242, 255, 0.2);
          border-radius: 6px;
          color: var(--primary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .revalidate-btn:hover:not(:disabled) {
          background: rgba(0, 242, 255, 0.2);
        }

        .revalidate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .validation-progress {
          margin-bottom: 16px;
        }

        .validation-progress .progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .validation-progress .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--success));
          transition: width 0.3s;
        }

        .validation-progress .progress-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .validation-stages {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .v-stage {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          font-size: 0.75rem;
          border: 1px solid transparent;
        }

        .v-stage.success {
          border-color: rgba(0, 255, 157, 0.2);
        }

        .v-stage.error {
          border-color: rgba(255, 42, 109, 0.2);
        }

        .v-stage.running {
          border-color: rgba(255, 184, 0, 0.2);
        }

        .v-stage-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
        }

        .v-stage.success .v-stage-icon { color: var(--success); }
        .v-stage.error .v-stage-icon { color: var(--danger); }
        .v-stage.running .v-stage-icon { color: var(--warning); }

        .v-stage-name {
          color: var(--text-main);
          font-weight: 500;
        }

        .v-stage-msg {
          color: var(--text-secondary);
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .v-stage-time {
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
        }

        .validation-info {
          display: flex;
          gap: 24px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-label {
          font-size: 0.65rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 0.8rem;
          font-weight: 500;
          font-family: 'JetBrains Mono', monospace;
        }

        .validation-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: rgba(255, 42, 109, 0.1);
          border: 1px solid rgba(255, 42, 109, 0.2);
          border-radius: 6px;
          color: var(--danger);
          font-size: 0.8rem;
        }

        /* Main Content */
        .opt-content {
          position: relative;
          z-index: 1;
          flex: 1;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 12px;
          padding: 12px 16px;
          min-height: 0;
          height: 100%;
        }

        /* Sidebar */
        .opt-sidebar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          height: 100%;
          padding-right: 4px;
        }

        .ctrl-card {
          background: rgba(15, 20, 35, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 8px;
          backdrop-filter: blur(10px);
        }

        .ctrl-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .ctrl-header span:first-child {
          font-size: 0.8rem;
        }

        .ctrl-header span:nth-child(2) {
          flex: 1;
          font-weight: 500;
        }

        .ctrl-btn {
          background: rgba(0, 242, 255, 0.1);
          border: none;
          padding: 3px 8px;
          border-radius: 4px;
          color: var(--primary);
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }

        .ctrl-btn:hover {
          background: rgba(0, 242, 255, 0.2);
        }

        .ctrl-value {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ctrl-filename {
          font-size: 0.8rem;
          font-family: 'JetBrains Mono', monospace;
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ctrl-meta {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .ctrl-empty {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* Script Card */
        .script-card {
          border-left: 3px solid var(--primary);
          position: relative;
        }

        .script-filename {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }

        .filename-text {
          font-size: 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-main);
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .filename-ext {
          font-size: 0.65rem;
          font-family: 'JetBrains Mono', monospace;
          color: var(--primary);
        }

        .file-admin-section {
          background: rgba(0, 242, 255, 0.03);
          border: 1px solid rgba(0, 242, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          margin-top: 8px;
        }

        .admin-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .admin-icon {
          font-size: 1rem;
        }

        .admin-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-main);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .admin-badge {
          display: inline-block;
          background: rgba(0, 255, 157, 0.15);
          color: var(--success);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .admin-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .admin-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .admin-label {
          font-size: 0.6rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .admin-value-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .admin-file-icon,
        .admin-time-icon {
          font-size: 0.8rem;
        }

        .admin-value {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-main);
          font-family: 'JetBrains Mono', monospace;
        }

        .admin-value.lines-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--primary);
        }

        .admin-sub {
          font-size: 0.65rem;
          color: var(--text-secondary);
        }

        /* Analysis Card - Sidebar */
        .analysis-card {
          border-left: 3px solid rgba(0, 255, 157, 0.6);
        }

        .analysis-metrics {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .analysis-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .analysis-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .analysis-value {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-main);
          font-family: 'JetBrains Mono', monospace;
        }

        .analysis-value.complexity-low {
          color: var(--success);
        }

        .analysis-value.complexity-medium {
          color: var(--warning);
        }

        .analysis-value.complexity-high,
        .analysis-value.complexity-critical {
          color: var(--danger);
        }

        .analysis-value.strategy-value {
          color: var(--primary);
          font-size: 0.7rem;
        }

        .analysis-value.qvd-value {
          color: rgba(0, 255, 157, 0.9);
          font-size: 0.7rem;
        }

        /* Mode Card - ✨ Diferenciação Visual Melhorada */
        .mode-card {
          border-left: 3px solid;
        }

        .mode-card-analysis {
          border-left-color: var(--primary);
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.02) 0%, rgba(15, 20, 35, 0.6) 100%);
        }

        .mode-card-ultra-expert {
          border-left-color: var(--warning);
          background: linear-gradient(135deg, rgba(255, 184, 0, 0.02) 0%, rgba(15, 20, 35, 0.6) 100%);
        }

        .mode-header-enhanced {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .mode-section-title {
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0;
          color: var(--text-main);
        }

        .mode-badge-current {
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          border: 1px solid;
        }

        .mode-selection-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .mode-option-card {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1.5px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .mode-option-card:hover {
          background: rgba(255, 255, 255, 0.04);
          transform: translateY(-1px);
        }

        .mode-option-card.active {
          border-color: var(--primary);
          background: rgba(0, 242, 255, 0.05);
          box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);
        }

        .mode-option-card.ultra-expert.active {
          border-color: var(--warning);
          background: rgba(255, 184, 0, 0.05);
          box-shadow: 0 0 15px rgba(255, 184, 0, 0.1);
        }

        .mode-option-icon {
          font-size: 1.3rem;
          margin-bottom: 6px;
        }

        .mode-option-title {
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: var(--text-main);
        }

        .mode-option-description {
          font-size: 0.7rem;
          line-height: 1.4;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .mode-option-features {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }

        .feature-tag {
          padding: 2px 6px;
          background: rgba(0, 242, 255, 0.1);
          border: 1px solid rgba(0, 242, 255, 0.2);
          border-radius: 3px;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--primary);
        }

        .feature-tag.pro {
          background: rgba(255, 184, 0, 0.1);
          border-color: rgba(255, 184, 0, 0.2);
          color: var(--warning);
        }

        .mode-select-btn {
          width: 100%;
          padding: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .mode-select-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .mode-select-btn.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #000;
          font-weight: 700;
        }

        .mode-select-btn.ultra.active {
          background: var(--warning);
          border-color: var(--warning);
          color: #000;
        }

        .mode-limit-note {
          font-size: 0.65rem;
          color: var(--warning);
          margin-top: 6px;
          text-align: center;
        }

        .mode-card.analysis {
          border-left-color: var(--primary);
        }

        .mode-card.ultra-expert {
          border-left-color: var(--danger);
        }

        .mode-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .mode-icon {
          font-size: 1.4rem;
        }

        .mode-info h4 {
          font-size: 0.9rem;
          margin: 0;
        }

        .mode-risk {
          font-size: 0.7rem;
          font-weight: 600;
        }

        .mode-toggle {
          display: flex;
          gap: 6px;
        }

        .mode-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-icon svg {
          width: 14px;
          height: 14px;
        }

        .mode-btn:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .mode-btn.active {
          background: rgba(0, 242, 255, 0.1);
          border-color: var(--primary);
          color: var(--primary);
        }

        .mode-card.ultra-expert .mode-btn.active {
          background: rgba(255, 42, 109, 0.1);
          border-color: var(--danger);
          color: var(--danger);
        }

        /* LLM */
        .mode-description {
          margin-bottom: 12px;
        }

        .mode-desc-text {
          font-size: 0.9rem;
          line-height: 1.3;
          color: var(--text-secondary);
          margin: 0;
        }

        .mode-desc-text strong {
          color: var(--text-main);
          font-weight: 700;
        }

        .llm-current {
          margin-bottom: 8px;
        }

        .llm-name {
          font-size: 0.85rem;
          font-weight: 500;
        }

        /* Main Area */
        .opt-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
          height: 100%;
          padding-right: 4px;
        }

        /* Load Admin Card - Movido para área principal */
        .load-admin-card {
          background: linear-gradient(135deg, rgba(15, 20, 35, 0.7), rgba(10, 15, 30, 0.8));
          border: 1px solid rgba(0, 242, 255, 0.15);
          border-left: 3px solid var(--primary);
          border-radius: 12px;
          padding: 16px 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .load-admin-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .load-admin-icon {
          font-size: 1.4rem;
          filter: drop-shadow(0 0 8px rgba(0, 242, 255, 0.4));
        }

        .load-admin-header h3 {
          flex: 1;
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-main);
          letter-spacing: 0.02em;
        }

        .load-admin-badge {
          display: inline-block;
          background: rgba(0, 255, 157, 0.15);
          color: var(--success);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .load-admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .load-info-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s;
        }

        .load-info-item:hover {
          border-color: rgba(0, 242, 255, 0.2);
          background: rgba(0, 242, 255, 0.05);
          transform: translateY(-1px);
        }

        .load-info-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .load-info-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .load-info-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .load-info-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          font-family: 'JetBrains Mono', monospace;
        }

        .load-info-sub {
          font-size: 0.65rem;
          color: var(--text-secondary);
        }

        /* Script Info Card - Sempre Visível */
        .script-info-card-fixed {
          background: linear-gradient(135deg, rgba(15, 20, 35, 0.7), rgba(10, 15, 30, 0.8));
          border: 1px solid rgba(0, 242, 255, 0.15);
          border-radius: 12px;
          padding: 16px 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .script-info-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .script-info-icon {
          font-size: 1.4rem;
          filter: drop-shadow(0 0 8px rgba(0, 242, 255, 0.4));
        }

        .script-info-header h3 {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-main);
          letter-spacing: 0.02em;
        }

        .script-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .info-metric {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s;
        }

        .info-metric:hover {
          border-color: rgba(0, 242, 255, 0.2);
          background: rgba(0, 242, 255, 0.05);
          transform: translateY(-1px);
        }

        .info-metric.strategy,
        .info-metric.qvd {
          grid-column: span 2;
        }

        .metric-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .metric-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .metric-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          font-family: 'JetBrains Mono', monospace;
        }

        .metric-value.complexity-low {
          color: var(--success);
        }

        .metric-value.complexity-medium {
          color: var(--warning);
        }

        .metric-value.complexity-high,
        .metric-value.complexity-critical {
          color: var(--danger);
        }

        .metric-value.strategy-value {
          color: var(--primary);
          font-size: 0.75rem;
        }

        .metric-value.qvd-value {
          color: rgba(0, 255, 157, 0.9);
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .script-info-grid {
            grid-template-columns: 1fr;
          }

          .info-metric.strategy,
          .info-metric.qvd {
            grid-column: span 1;
          }
        }

        /* Error Alert */
        .error-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 42, 109, 0.1);
          border: 1px solid rgba(255, 42, 109, 0.2);
          border-radius: 8px;
        }

        .error-icon {
          font-size: 1.2rem;
        }

        .error-text {
          flex: 1;
        }

        .error-text strong {
          display: block;
          font-size: 0.85rem;
          margin-bottom: 2px;
        }

        .error-text p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .error-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        /* Pipeline Card */
        .pipeline-card {
          background: rgba(15, 20, 35, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 12px 16px;
          backdrop-filter: blur(10px);
        }

        .pipeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .pipeline-header h2 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .mode-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .mode-badge.analysis {
          background: rgba(0, 242, 255, 0.1);
          color: var(--primary);
        }

        .mode-badge.ultra-expert {
          background: rgba(255, 42, 109, 0.1);
          color: var(--danger);
        }

        /* Progress */
        .pipeline-progress {
          margin-bottom: 20px;
        }

        .progress-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }

        .progress-fill.idle {
          background: rgba(255, 255, 255, 0.2);
        }

        .progress-fill.running {
          background: linear-gradient(90deg, var(--primary), var(--warning));
          animation: progress-pulse 1s ease-in-out infinite;
        }

        .progress-fill.success {
          background: linear-gradient(90deg, var(--primary), var(--success));
        }

        .progress-fill.error {
          background: var(--danger);
        }

        @keyframes progress-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }

        .progress-percent {
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }

        .progress-time {
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
        }

        /* ================================ */
        /* STAGE CARDS ROW - Design da Imagem */
        /* ================================ */
        .stage-cards-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 16px;
        }

        /* Dynamic columns based on stage count */
        .stage-cards-row.stages-3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .stage-cards-row.stages-4 {
          grid-template-columns: repeat(4, 1fr);
        }

        .stage-cards-row.stages-5 {
          grid-template-columns: repeat(5, 1fr);
        }

        .stage-card {
          position: relative;
          background: rgba(15, 20, 35, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 18px;
          padding-top: 24px;
          min-height: 180px;
          transition: all 0.3s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Barra cyan no topo do card */
        .stage-card-top-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          border-radius: 12px 12px 0 0;
          transition: all 0.3s ease;
        }

        .stage-card-top-bar.active {
          box-shadow: 0 0 12px var(--card-color, #00f2ff);
          animation: top-bar-glow 1.5s ease-in-out infinite;
        }

        @keyframes top-bar-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .stage-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .stage-card.active {
          border-color: var(--card-color, var(--primary));
          background: rgba(0, 242, 255, 0.03);
        }

        .stage-card.complete {
          border-color: rgba(0, 255, 157, 0.2);
        }

        .stage-card.error {
          border-color: rgba(255, 42, 109, 0.2);
        }

        /* Card Header */
        .stage-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 8px;
        }

        .stage-card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid;
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .stage-card-title-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .stage-card-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.3;
        }

        .stage-card-badge {
          flex-shrink: 0;
        }

        .card-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .card-badge.pending {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.5);
        }

        .card-badge.executing {
          background: rgba(0, 242, 255, 0.2);
          color: #00f2ff;
          animation: badge-blink 1.5s ease-in-out infinite;
        }

        @keyframes badge-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .card-badge.complete {
          background: rgba(0, 255, 157, 0.2);
          color: var(--success);
        }

        .card-badge.error {
          background: rgba(255, 42, 109, 0.2);
          color: var(--danger);
        }

        /* Card Subtitle */
        .stage-card-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 4px 0 16px 0;
          line-height: 1.4;
        }

        /* Card Progress */
        .stage-card-progress {
          margin-top: auto;
          padding-top: 12px;
        }

        .stage-card-progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .stage-card-progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        .stage-card-progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stage-card-steps {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .stage-card-percent {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          font-family: 'JetBrains Mono', monospace;
        }

        /* Card Pulse */
        .stage-card-pulse {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          border: 2px solid var(--card-color, var(--primary));
          opacity: 0;
          animation: card-pulse 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes card-pulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.3; }
        }

        /* ================================ */
        /* PIPELINE SEPARATOR */
        /* ================================ */
        .pipeline-separator {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          padding: 0 4px;
        }

        .separator-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .separator-counter {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-main);
          font-family: 'JetBrains Mono', monospace;
        }

        .separator-status {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        /* ================================ */
        /* PIPELINE CATEGORIES LIST */
        /* ================================ */
        .pipeline-categories {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .category-item {
          background: rgba(15, 20, 35, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .category-item:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .category-item.active {
          border-color: rgba(0, 242, 255, 0.3);
          background: rgba(0, 242, 255, 0.02);
        }

        .category-item.complete {
          border-color: rgba(0, 255, 157, 0.15);
        }

        .category-item.error {
          border-color: rgba(255, 42, 109, 0.2);
        }

        /* Category Header (Summary) */
        .category-header {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          padding-left: 20px;
          cursor: pointer;
          list-style: none;
          transition: background 0.2s;
        }

        /* Barra cyan na esquerda quando ativo */
        .category-left-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 10px 0 0 10px;
          transition: all 0.3s ease;
        }

        .category-left-bar.active {
          box-shadow: 0 0 10px var(--primary);
          animation: left-bar-glow 1.5s ease-in-out infinite;
        }

        @keyframes left-bar-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .category-header::-webkit-details-marker {
          display: none;
        }

        .category-header:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .category-icon-wrapper {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid;
          flex-shrink: 0;
        }

        .category-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .category-icon svg {
          width: 20px;
          height: 20px;
        }

        .category-info {
          flex: 1;
          min-width: 0;
        }

        .category-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }

        .category-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .category-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .category-badge.pending {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.5);
        }

        .category-badge.executing {
          background: rgba(0, 242, 255, 0.2);
          color: #00f2ff;
          animation: badge-blink 1.5s ease-in-out infinite;
        }

        .category-badge.complete {
          background: rgba(0, 255, 157, 0.2);
          color: var(--success);
        }

        .category-badge.error {
          background: rgba(255, 42, 109, 0.2);
          color: var(--danger);
        }

        .category-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .category-counter {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .category-steps {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
        }

        .category-expand {
          font-size: 0.7rem;
          color: var(--text-secondary);
          transition: transform 0.2s;
        }

        .category-item[open] .category-expand {
          transform: rotate(180deg);
        }

        /* Category Content */
        .category-content {
          padding: 0 16px 16px 72px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          animation: slide-down 0.2s ease-out;
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .category-stage {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          border-left: 2px solid transparent;
        }

        .category-stage.pending {
          border-left-color: rgba(255, 255, 255, 0.1);
          opacity: 0.5;
        }

        .category-stage.running {
          border-left-color: var(--warning);
          background: rgba(255, 184, 0, 0.05);
        }

        .category-stage.success {
          border-left-color: var(--success);
        }

        .category-stage.error {
          border-left-color: var(--danger);
          background: rgba(255, 42, 109, 0.05);
        }

        .category-stage-indicator {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .category-stage.success .category-stage-indicator { color: var(--success); }
        .category-stage.error .category-stage-indicator { color: var(--danger); }
        .category-stage.running .category-stage-indicator { color: var(--warning); }

        .category-stage-dot {
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
        }

        .category-stage-name {
          flex: 1;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .category-stage-msg {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .category-stage-duration {
          font-size: 0.7rem;
          color: #00f2ff;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          margin-left: auto;
          padding-left: 12px;
        }

        /* Relógio em tempo real para tarefas em execução */
        .category-stage-realtime {
          font-size: 0.75rem;
          color: #00ff9d;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          margin-left: auto;
          padding: 4px 10px;
          background: rgba(0, 255, 157, 0.1);
          border: 1px solid rgba(0, 255, 157, 0.3);
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: realtime-pulse 1s ease-in-out infinite;
        }

        @keyframes realtime-pulse {
          0%, 100% { 
            box-shadow: 0 0 8px rgba(0, 255, 157, 0.3);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 15px rgba(0, 255, 157, 0.5);
            transform: scale(1.02);
          }
        }

        .category-stage-realtime.warning {
          color: #ffb800;
          background: rgba(255, 184, 0, 0.15);
          border-color: rgba(255, 184, 0, 0.4);
          animation: warning-blink 0.8s ease-in-out infinite;
        }

        @keyframes warning-blink {
          0%, 100% { 
            box-shadow: 0 0 12px rgba(255, 184, 0, 0.4);
            opacity: 1;
          }
          50% { 
            box-shadow: 0 0 20px rgba(255, 184, 0, 0.7);
            opacity: 0.85;
          }
        }

        .timeout-warning {
          color: #ff6b6b;
          font-size: 0.65rem;
          font-weight: 600;
          animation: blink-text 0.6s ease-in-out infinite;
        }

        @keyframes blink-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .category-stage-timeout-msg {
          font-size: 0.7rem;
          color: #ff6b6b;
          font-weight: 600;
          margin-left: auto;
          padding: 4px 8px;
          background: rgba(255, 107, 107, 0.15);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 6px;
        }

        .category-stage.warning-timeout {
          border-left: 3px solid #ffb800;
          background: rgba(255, 184, 0, 0.05);
        }

        .category-stage.timeout {
          border-left: 3px solid #ff6b6b;
          background: rgba(255, 107, 107, 0.08);
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .stage-cards-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .stage-cards-row {
            grid-template-columns: 1fr;
          }
          
          .category-content {
            padding-left: 16px;
          }
        }

        /* Onboarding Overlay & Tooltip */
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: overlay-fade-in 0.4s ease-out;
        }

        @keyframes overlay-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .onboarding-spotlight {
          position: absolute;
          top: 80px;
          left: 20px;
          width: 260px;
          height: 220px;
          background: rgba(0, 242, 255, 0.08);
          border: 3px solid rgba(0, 242, 255, 0.6);
          border-radius: 16px;
          box-shadow: 
            0 0 40px rgba(0, 242, 255, 0.4),
            inset 0 0 30px rgba(0, 242, 255, 0.1);
          animation: spotlight-pulse 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes spotlight-pulse {
          0%, 100% { 
            box-shadow: 
              0 0 40px rgba(0, 242, 255, 0.4),
              inset 0 0 30px rgba(0, 242, 255, 0.1);
          }
          50% { 
            box-shadow: 
              0 0 60px rgba(0, 242, 255, 0.6),
              inset 0 0 40px rgba(0, 242, 255, 0.2);
          }
        }

        .onboarding-tooltip {
          position: relative;
          max-width: 500px;
          margin-left: -100px;
          animation: tooltip-slide-in 0.5s ease-out 0.2s both;
        }

        @keyframes tooltip-slide-in {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tooltip-content {
          background: linear-gradient(145deg, rgba(15, 25, 45, 0.98), rgba(10, 15, 30, 0.98));
          border: 2px solid rgba(0, 242, 255, 0.5);
          border-radius: 20px;
          padding: 32px 40px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(0, 242, 255, 0.3);
          text-align: center;
          position: relative;
        }

        .tooltip-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          color: var(--text-main);
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .tooltip-close:hover {
          background: rgba(255, 42, 109, 0.2);
          border-color: var(--danger);
          color: var(--danger);
          transform: rotate(90deg);
        }

        .tooltip-icon {
          font-size: 3.5rem;
          margin-bottom: 16px;
          animation: icon-float 3s ease-in-out infinite;
        }

        @keyframes icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .tooltip-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0 0 16px 0;
          background: linear-gradient(135deg, var(--primary), #00ff9d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tooltip-description {
          font-size: 1.05rem;
          color: var(--text-main);
          line-height: 1.6;
          margin: 0 0 28px 0;
        }

        .tooltip-description strong {
          color: var(--primary);
          font-weight: 700;
          text-shadow: 0 0 10px rgba(0, 242, 255, 0.3);
        }

        .tooltip-arrow-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .tooltip-arrow {
          font-size: 3rem;
          color: var(--primary);
          animation: arrow-bounce-left 1.5s ease-in-out infinite;
          text-shadow: 0 0 20px rgba(0, 242, 255, 0.5);
        }

        @keyframes arrow-bounce-left {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-15px); }
        }

        .tooltip-arrow-text {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--primary);
          text-shadow: 0 0 10px rgba(0, 242, 255, 0.3);
        }

        .tooltip-dismiss-btn {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          border: none;
          border-radius: 12px;
          padding: 14px 40px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(0, 242, 255, 0.3);
          margin: 0 auto;
          display: block;
          font-family: inherit;
        }

        .tooltip-dismiss-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 242, 255, 0.5);
        }

        /* KPIs */
        .pipeline-kpis {
          display: flex;
          gap: 20px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .kpi {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .kpi-label {
          font-size: 0.65rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-value {
          font-size: 1rem;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
        }

        .kpi-value.risk-none,
        .kpi-value.risk-low {
          color: var(--success);
        }

        .kpi-value.risk-medium {
          color: var(--warning);
        }

        .kpi-value.risk-high {
          color: var(--danger);
        }

        /* Spinner */
        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ================================ */
        /* STAGE CARD V3 - Design Novo */
        /* ================================ */
        .stage-card-v3 {
          position: relative;
          background: linear-gradient(145deg, rgba(20, 28, 50, 0.9), rgba(12, 16, 30, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          padding-top: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.3s ease;
          overflow: hidden;
          min-height: 280px;
        }

        .stage-card-v3:hover {
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }

        .stage-card-v3.active {
          border-color: var(--card-color, var(--primary));
          background: linear-gradient(145deg, rgba(0, 242, 255, 0.05), rgba(12, 16, 30, 0.95));
        }

        /* Barra accent no topo */
        .card-top-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          border-radius: 16px 16px 0 0;
          transition: all 0.3s ease;
          box-shadow: 0 0 10px var(--card-color, var(--primary));
        }

        /* Background Number */
        .card-bg-number {
          position: absolute;
          top: 10px;
          right: 15px;
          font-size: 4rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.03);
          pointer-events: none;
          font-family: 'JetBrains Mono', monospace;
          z-index: 0;
        }

        /* Top Row Layout */
        .card-top-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        /* Ícone box */
        .card-icon-box {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .card-icon-box svg {
          width: 26px;
          height: 26px;
        }

        .stage-card-v3.active .card-icon-box {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(0, 242, 255, 0.2);
        }

        /* Texto block */
        .card-text-block {
          flex: 1;
          min-width: 0;
        }

        .card-title-main {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
          line-height: 1.3;
          letter-spacing: -0.3px;
        }

        .card-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 4px 0 0 0;
          line-height: 1.3;
          opacity: 0.8;
        }

        /* Status Badge */
        .card-status-badge-container {
          flex-shrink: 0;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border: 1px solid transparent;
          min-width: 80px;
        }

        .status-pill.pending {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .status-pill.active {
          animation: status-blink 1.5s ease-in-out infinite;
        }

        @keyframes status-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .status-pill.complete {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .status-pill.error {
          background: rgba(255, 42, 109, 0.15);
          color: var(--danger);
          border-color: var(--danger);
        }

        /* Progress area */
        .card-progress-area {
          margin-top: auto;
          position: relative;
          z-index: 1;
        }

        .card-progress-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .card-progress-bar {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
          position: relative;
        }

        .stage-card-v3.active .card-progress-bar {
          animation: progress-shimmer 2s ease-in-out infinite;
        }

        @keyframes progress-shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .card-progress-labels {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-steps-count {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .card-percent-value {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-main);
          font-family: 'JetBrains Mono', monospace;
        }

        .card-duration-display {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 6px 10px;
          background: rgba(0, 242, 255, 0.08);
          border-radius: 6px;
          border: 1px solid rgba(0, 242, 255, 0.2);
        }

        .duration-icon {
          font-size: 0.9rem;
        }

        .duration-time {
          font-size: 0.75rem;
          font-weight: 600;
          color: #00f2ff;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Card Summary (clickable) */
        .card-summary {
          cursor: pointer;
          list-style: none;
          display: contents;
        }

        .card-summary::-webkit-details-marker {
          display: none;
        }

        /* Substeps dentro do card */
        .card-substeps {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: none;
          overflow-y: visible;
        }

        .substep-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .substep-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .substep-item.running {
          background: rgba(0, 242, 255, 0.08);
          border-left: 2px solid #00f2ff;
        }

        .substep-item.success {
          opacity: 0.7;
        }

        .substep-item.error {
          background: rgba(255, 42, 109, 0.08);
          border-left: 2px solid var(--danger);
        }

        .substep-indicator {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .substep-indicator svg {
          width: 12px;
          height: 12px;
        }

        .substep-dot {
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
        }

        .substep-name {
          flex: 1;
          color: var(--text-main);
          font-weight: 500;
        }

        .substep-time {
          font-size: 0.65rem;
          color: #00f2ff;
          font-family: 'JetBrains Mono', monospace;
        }

        .substep-time.warning {
          color: var(--warning);
          animation: time-pulse 1s ease-in-out infinite;
        }

        @keyframes time-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .substep-duration {
          font-size: 0.65rem;
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
        }

        /* Glow pulse quando ativo */
        .card-glow-pulse {
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          border: 2px solid;
          opacity: 0;
          animation: glow-pulse 2s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.01); }
        }

        /* Saved Scripts Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 2rem;
        }

        .saved-scripts-modal {
          background: #1a1a1a;
          border-radius: 12px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #e0e0e0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
        }

        /* Result Viewer Modal */
        .result-viewer-modal {
          background: #0d1117;
          border-radius: 16px;
          max-width: 95vw;
          width: 1400px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(0, 242, 255, 0.2);
        }

        .result-viewer-modal .modal-header {
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.1) 0%, rgba(0, 255, 157, 0.05) 100%);
          border-bottom: 1px solid rgba(0, 242, 255, 0.2);
        }

        .result-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .result-viewer-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
        }

        .result-summary-card {
          background: rgba(0, 242, 255, 0.05);
          border: 1px solid rgba(0, 242, 255, 0.15);
          border-radius: 12px;
          padding: 1rem 1.5rem;
        }

        .result-summary-card h4 {
          margin: 0 0 0.5rem 0;
          color: var(--primary);
          font-size: 1rem;
        }

        .result-summary-card p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.5;
          font-size: 0.9rem;
        }

        .changes-count {
          display: flex;
          gap: 8px;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .changes-count .badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        }

        .changes-count .badge.safe { background: rgba(0, 255, 157, 0.15); color: var(--success); }
        .changes-count .badge.warning { background: rgba(255, 184, 0, 0.15); color: var(--warning); }
        .changes-count .badge.danger { background: rgba(255, 42, 109, 0.15); color: var(--danger); }

        .code-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          flex: 1;
          min-height: 300px;
        }

        .code-panel {
          background: #161b22;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .code-panel.original { border-color: rgba(255, 255, 255, 0.1); }
        .code-panel.optimized { border-color: rgba(0, 255, 157, 0.3); }

        .code-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .panel-label {
          font-weight: 600;
          font-size: 0.85rem;
        }

        .code-panel.original .panel-label { color: var(--text-secondary); }
        .code-panel.optimized .panel-label { color: var(--success); }

        .line-count {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .code-content-wrapper {
          flex: 1;
          overflow: auto;
          max-height: 500px;
          background: rgba(0, 0, 0, 0.4);
          position: relative;
        }

        .code-content {
          margin: 0;
          padding: 0;
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #c9d1d9;
        }

        .code-line {
          display: flex;
          min-height: 22px;
          padding: 1px 14px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-left: 2px solid transparent;
        }

        .code-line:hover {
          background: rgba(0, 242, 255, 0.04);
          border-left-color: rgba(0, 242, 255, 0.5);
          box-shadow: inset 0 0 20px rgba(0, 242, 255, 0.05);
        }

        /* EXTREME MODE - Enhanced Line Hover */
        .control-panel-master-compact.expert-mode ~ * .code-line:hover {
          background: rgba(255, 140, 0, 0.06);
          border-left-color: rgba(255, 140, 0, 0.7);
          box-shadow: 
            inset 0 0 25px rgba(255, 140, 0, 0.08),
            inset 2px 0 10px rgba(255, 200, 0, 0.15);
        }

        .line-number {
          flex-shrink: 0;
          width: 52px;
          text-align: right;
          padding-right: 18px;
          color: rgba(255, 255, 255, 0.35);
          user-select: none;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .code-line:hover .line-number {
          color: rgba(0, 242, 255, 0.7);
          text-shadow: 0 0 6px rgba(0, 242, 255, 0.3);
        }

        .control-panel-master-compact.expert-mode ~ * .code-line:hover .line-number {
          color: rgba(255, 184, 0, 0.9);
          text-shadow: 0 0 8px rgba(255, 140, 0, 0.4);
        }

        .line-content {
          flex: 1;
          white-space: pre;
          word-break: break-all;
        }

        /* Syntax Highlighting Premium - Base Colors */
        .syntax-keyword {
          color: #00e5ff;
          font-weight: 700;
          text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
          letter-spacing: 0.02em;
          transition: all 0.2s;
        }

        .syntax-keyword:hover {
          color: #00f2ff;
          text-shadow: 0 0 12px rgba(0, 242, 255, 0.6);
        }

        .syntax-string {
          color: #ffd700;
          font-weight: 500;
          text-shadow: 0 0 6px rgba(255, 215, 0, 0.3);
        }

        .syntax-number {
          color: #c792ea;
          font-weight: 600;
          text-shadow: 0 0 6px rgba(199, 146, 234, 0.3);
        }

        .syntax-comment {
          color: #546e7a;
          font-style: italic;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .syntax-comment:hover {
          opacity: 1;
        }

        .syntax-function {
          color: #69f0ae;
          font-weight: 600;
          text-shadow: 0 0 6px rgba(105, 240, 174, 0.3);
        }

        .syntax-operator {
          color: #ff6b9d;
          font-weight: 700;
          text-shadow: 0 0 6px rgba(255, 107, 157, 0.3);
        }

        /* EXTREME MODE - Enhanced Syntax Highlighting */
        .control-panel-master-compact.expert-mode ~ * .syntax-keyword {
          color: #ff9100;
          font-weight: 800;
          text-shadow: 
            0 0 10px rgba(255, 145, 0, 0.5),
            0 0 20px rgba(255, 145, 0, 0.3);
          animation: extreme-keyword-pulse 3s ease-in-out infinite;
        }

        @keyframes extreme-keyword-pulse {
          0%, 100% { 
            text-shadow: 0 0 10px rgba(255, 145, 0, 0.5), 0 0 20px rgba(255, 145, 0, 0.3);
          }
          50% { 
            text-shadow: 0 0 15px rgba(255, 200, 0, 0.7), 0 0 30px rgba(255, 200, 0, 0.4);
          }
        }

        .control-panel-master-compact.expert-mode ~ * .syntax-string {
          color: #ffeb3b;
          font-weight: 600;
          text-shadow: 
            0 0 8px rgba(255, 235, 59, 0.5),
            0 0 16px rgba(255, 235, 59, 0.3);
        }

        .control-panel-master-compact.expert-mode ~ * .syntax-function {
          color: #76ff03;
          font-weight: 700;
          text-shadow: 
            0 0 8px rgba(118, 255, 3, 0.5),
            0 0 16px rgba(118, 255, 3, 0.3);
          animation: extreme-function-glow 2.5s ease-in-out infinite;
        }

        @keyframes extreme-function-glow {
          0%, 100% { 
            filter: brightness(1);
          }
          50% { 
            filter: brightness(1.3);
          }
        }

        .control-panel-master-compact.expert-mode ~ * .syntax-operator {
          color: #ff1744;
          font-weight: 800;
          text-shadow: 
            0 0 10px rgba(255, 23, 68, 0.6),
            0 0 20px rgba(255, 23, 68, 0.4);
        }

        .control-panel-master-compact.expert-mode ~ * .syntax-number {
          color: #e040fb;
          font-weight: 700;
          text-shadow: 
            0 0 8px rgba(224, 64, 251, 0.5),
            0 0 16px rgba(224, 64, 251, 0.3);
        }

        /* Custom Scrollbar */
        .code-content-wrapper::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .code-content-wrapper::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }

        .code-content-wrapper::-webkit-scrollbar-thumb {
          background: rgba(0, 242, 255, 0.3);
          border-radius: 5px;
        }

        .code-content-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 242, 255, 0.5);
        }

        .code-content-wrapper::-webkit-scrollbar-corner {
          background: rgba(0, 0, 0, 0.3);
        }

        .changes-list {
          background: rgba(255, 184, 0, 0.03);
          border: 1px solid rgba(255, 184, 0, 0.1);
          border-radius: 12px;
          padding: 1rem 1.5rem;
        }

        .changes-list h4 {
          margin: 0 0 1rem 0;
          color: var(--warning);
          font-size: 1rem;
        }

        .changes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .change-item {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 12px;
          border-left: 3px solid transparent;
        }

        .change-item.risk-low { border-left-color: var(--success); }
        .change-item.risk-medium { border-left-color: var(--warning); }
        .change-item.risk-high { border-left-color: var(--danger); }

        .change-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .change-category {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .risk-badge {
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .risk-badge.low { background: rgba(0, 255, 157, 0.15); color: var(--success); }
        .risk-badge.medium { background: rgba(255, 184, 0, 0.15); color: var(--warning); }
        .risk-badge.high { background: rgba(255, 42, 109, 0.15); color: var(--danger); }

        .change-description {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-main);
        }

        .change-impact {
          margin: 8px 0 0 0;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .more-changes {
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 1rem 0 0 0;
        }

        /* Result Button Style */
        .action-btn.result-btn {
          background: linear-gradient(135deg, rgba(0, 255, 157, 0.2) 0%, rgba(0, 242, 255, 0.2) 100%);
          border: 1px solid rgba(0, 255, 157, 0.4);
          color: var(--success);
        }

        .action-btn.result-btn:hover {
          background: linear-gradient(135deg, rgba(0, 255, 157, 0.3) 0%, rgba(0, 242, 255, 0.3) 100%);
          border-color: var(--success);
        }

        .action-btn.small {
          padding: 6px 12px;
          font-size: 0.8rem;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .opt-content {
            grid-template-columns: 1fr;
          }

          .opt-sidebar {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .ctrl-card {
            flex: 1;
            min-width: 200px;
          }

          .saved-scripts-modal,
          .result-viewer-modal {
            max-width: 100%;
            max-height: 100%;
            border-radius: 0;
          }

          .code-comparison {
            grid-template-columns: 1fr;
          }
        }

        /* ================ */
        /* CONTROL PANEL COMPACTO */
        /* ================ */

        .control-panel-master-compact {
          position: relative;
          z-index: 9;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 32px;
          padding: 12px 40px;
          background: rgba(3, 5, 8, 0.6);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .control-panel-master-compact.expert-mode {
          position: relative;
          background: linear-gradient(180deg, 
            rgba(3, 5, 8, 0.7) 0%, 
            rgba(20, 5, 0, 0.6) 50%,
            rgba(3, 5, 8, 0.7) 100%);
          border-bottom: 2px solid transparent;
          animation: expert-border-booster 2s ease-in-out infinite;
        }

        @keyframes expert-border-booster {
          0%, 100% {
            border-bottom-color: rgba(255, 100, 0, 0.6);
            box-shadow: 
              inset 0 -2px 30px rgba(255, 100, 0, 0.15),
              0 4px 30px rgba(255, 100, 0, 0.2);
          }
          50% {
            border-bottom-color: rgba(255, 200, 0, 0.8);
            box-shadow: 
              inset 0 -2px 40px rgba(255, 150, 0, 0.25),
              0 4px 40px rgba(255, 150, 0, 0.4);
          }
        }

        .control-panel-master-compact.expert-mode::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%,
            rgba(255, 100, 0, 0.8) 25%,
            rgba(255, 200, 0, 0.9) 50%,
            rgba(255, 100, 0, 0.8) 75%,
            transparent 100%);
          animation: expert-top-line 3s linear infinite;
        }

        @keyframes expert-top-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .control-panel-master-compact.expert-mode::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at center top, 
            rgba(255, 140, 0, 0.12) 0%, 
            transparent 70%);
          pointer-events: none;
          animation: expert-radial-pulse 2s ease-in-out infinite;
        }

        @keyframes expert-radial-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* Seção Compacta */
        .control-section-compact {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: rgba(15, 20, 35, 0.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          transition: all 0.3s;
        }

        .control-section-compact:hover {
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(15, 20, 35, 0.7);
        }

        .section-icon-compact {
          font-size: 1.2rem;
          filter: drop-shadow(0 0 6px currentColor);
        }

        /* Módulo de Modos - Horizontal */
        .mode-section-compact {
          border-left: 2px solid var(--primary);
        }

        .mode-cards-horizontal {
          display: flex;
          gap: 8px;
        }

        .mode-card-compact {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(10, 14, 23, 0.7);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          overflow: hidden;
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .mode-card-compact::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.03) 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .mode-card-compact:hover::before {
          opacity: 1;
        }

        .mode-card-compact:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(15, 20, 30, 0.85);
          transform: scale(1.03) translateY(-2px);
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .mode-card-compact.disabled-quota {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .mode-card-compact.disabled-quota .mode-card-icon-compact {
          filter: grayscale(1);
        }

        .mode-card-compact.active {
          border-color: var(--primary);
          background: linear-gradient(135deg, 
            rgba(0, 242, 255, 0.12) 0%, 
            rgba(0, 200, 220, 0.08) 100%);
          box-shadow: 
            0 0 24px rgba(0, 242, 255, 0.3),
            0 6px 20px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(0, 242, 255, 0.2);
        }

        .mode-card-compact.active::after {
          content: '';
          position: absolute;
          inset: 0;
          border: 1px solid rgba(0, 242, 255, 0.3);
          border-radius: 10px;
          animation: analysis-border-flow 3s linear infinite;
        }

        @keyframes analysis-border-flow {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }

        /* EXTREME MODE - Visual Premium Supremo */
        .mode-card-compact.active.expert {
          border-color: #ff6d00;
          background: linear-gradient(135deg, 
            rgba(255, 109, 0, 0.18) 0%, 
            rgba(255, 140, 0, 0.12) 50%,
            rgba(255, 184, 0, 0.08) 100%);
          box-shadow: 
            0 0 32px rgba(255, 109, 0, 0.5),
            0 0 48px rgba(255, 140, 0, 0.3),
            0 8px 24px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 200, 0, 0.3),
            inset 0 -1px 20px rgba(255, 109, 0, 0.2);
          animation: extreme-card-master-glow 2s ease-in-out infinite;
        }

        @keyframes extreme-card-master-glow {
          0%, 100% {
            box-shadow: 
              0 0 32px rgba(255, 109, 0, 0.5),
              0 0 48px rgba(255, 140, 0, 0.3),
              0 8px 24px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 200, 0, 0.3),
              inset 0 -1px 20px rgba(255, 109, 0, 0.2);
            transform: scale(1);
          }
          50% {
            box-shadow: 
              0 0 40px rgba(255, 140, 0, 0.7),
              0 0 60px rgba(255, 184, 0, 0.4),
              0 10px 30px rgba(0, 0, 0, 0.6),
              inset 0 2px 0 rgba(255, 235, 59, 0.4),
              inset 0 -2px 30px rgba(255, 140, 0, 0.3);
            transform: scale(1.01);
          }
        }

        .mode-card-compact.active.expert::after {
          content: '';
          position: absolute;
          inset: -2px;
          border: 2px solid rgba(255, 140, 0, 0.6);
          border-radius: 10px;
          animation: extreme-border-rotation 3s linear infinite;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255, 140, 0, 0.4) 25%,
            rgba(255, 200, 0, 0.6) 50%,
            rgba(255, 140, 0, 0.4) 75%,
            transparent 100%);
          background-size: 200% 100%;
        }

        @keyframes extreme-border-rotation {
          0% { background-position: 200% 0; opacity: 0.6; }
          50% { opacity: 1; }
          100% { background-position: -200% 0; opacity: 0.6; }
        }

        .mode-card-compact.active.expert::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center,
            rgba(255, 200, 0, 0.15) 0%,
            rgba(255, 140, 0, 0.08) 40%,
            transparent 70%);
          animation: extreme-radial-expand 2.5s ease-in-out infinite;
        }

        @keyframes extreme-radial-expand {
          0%, 100% { 
            opacity: 0.5; 
            transform: scale(0.95);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.05);
          }
        }

        .mode-card-icon-compact {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          flex-shrink: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .mode-card-icon-compact::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.1) 0%, 
            transparent 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .mode-card-compact:hover .mode-card-icon-compact::before {
          opacity: 1;
        }

        .mode-card-compact.active .mode-card-icon-compact {
          background: linear-gradient(135deg, 
            var(--primary) 0%, 
            rgba(0, 200, 220, 0.9) 100%);
          color: #000;
          box-shadow: 
            0 0 16px rgba(0, 242, 255, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        /* EXTREME MODE ICON - Premium Visual Effects */
        .mode-card-compact.active.expert .mode-card-icon-compact {
          background: linear-gradient(135deg, 
            #ff6d00 0%, 
            #ff8c00 50%,
            #ffa726 100%);
          color: #000;
          box-shadow: 
            0 0 20px rgba(255, 109, 0, 0.7),
            0 0 40px rgba(255, 140, 0, 0.4),
            inset 0 2px 0 rgba(255, 235, 59, 0.4),
            inset 0 -2px 8px rgba(255, 69, 0, 0.3);
          animation: extreme-icon-mega-pulse 2s ease-in-out infinite;
          transform: scale(1.08);
        }

        @keyframes extreme-icon-mega-pulse {
          0%, 100% {
            box-shadow: 
              0 0 20px rgba(255, 109, 0, 0.7),
              0 0 40px rgba(255, 140, 0, 0.4),
              inset 0 2px 0 rgba(255, 235, 59, 0.4),
              inset 0 -2px 8px rgba(255, 69, 0, 0.3);
            filter: brightness(1) saturate(1.2);
          }
          50% {
            box-shadow: 
              0 0 30px rgba(255, 140, 0, 0.9),
              0 0 60px rgba(255, 184, 0, 0.6),
              inset 0 3px 0 rgba(255, 255, 100, 0.6),
              inset 0 -3px 12px rgba(255, 100, 0, 0.5);
            filter: brightness(1.3) saturate(1.5);
          }
        }

        .mode-card-compact.active.expert .mode-card-icon-compact::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center,
            rgba(255, 255, 255, 0.3) 0%,
            transparent 70%);
          animation: extreme-icon-flash 1.5s ease-in-out infinite;
        }

        @keyframes extreme-icon-flash {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .mode-card-text-compact h4 {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
          line-height: 1.2;
          letter-spacing: 0.03em;
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }

        .mode-card-compact.active h4 {
          color: var(--primary);
          text-shadow: 0 0 10px rgba(0, 242, 255, 0.4);
        }

        .mode-card-compact.active.expert h4 {
          color: #ffa726;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-shadow: 
            0 0 12px rgba(255, 140, 0, 0.6),
            0 0 24px rgba(255, 140, 0, 0.3);
          animation: extreme-text-intensity 2s ease-in-out infinite;
        }

        @keyframes extreme-text-intensity {
          0%, 100% {
            text-shadow: 
              0 0 12px rgba(255, 140, 0, 0.6),
              0 0 24px rgba(255, 140, 0, 0.3);
            filter: brightness(1);
          }
          50% {
            text-shadow: 
              0 0 18px rgba(255, 184, 0, 0.8),
              0 0 36px rgba(255, 184, 0, 0.4);
            filter: brightness(1.2);
          }
        }

        .mode-card-text-compact p {
          font-size: 0.72rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.3;
          font-weight: 500;
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }

        .mode-card-compact.active p {
          color: rgba(0, 242, 255, 0.8);
        }

        .mode-card-compact.active.expert p {
          color: rgba(255, 200, 100, 0.9);
          font-weight: 600;
        }

        .mode-active-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 7px;
          height: 7px;
          background: var(--primary);
          border-radius: 50%;
          box-shadow: 
            0 0 10px var(--primary),
            0 0 20px rgba(0, 242, 255, 0.4);
          animation: analysis-dot-pulse 2s ease-in-out infinite;
          z-index: 2;
        }

        @keyframes analysis-dot-pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            box-shadow: 
              0 0 10px var(--primary),
              0 0 20px rgba(0, 242, 255, 0.4);
          }
          50% { 
            opacity: 0.6; 
            transform: scale(0.85);
            box-shadow: 
              0 0 6px var(--primary),
              0 0 12px rgba(0, 242, 255, 0.3);
          }
        }

        .mode-active-dot.expert {
          background: #ff6d00;
          box-shadow: 
            0 0 14px #ff8c00,
            0 0 28px rgba(255, 140, 0, 0.5),
            0 0 42px rgba(255, 140, 0, 0.3);
          animation: extreme-dot-mega-pulse 1.5s ease-in-out infinite;
        }

        @keyframes extreme-dot-mega-pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            box-shadow: 
              0 0 14px #ff8c00,
              0 0 28px rgba(255, 140, 0, 0.5),
              0 0 42px rgba(255, 140, 0, 0.3);
          }
          50% { 
            opacity: 0.8; 
            transform: scale(0.9);
            box-shadow: 
              0 0 20px #ffa726,
              0 0 40px rgba(255, 184, 0, 0.7),
              0 0 60px rgba(255, 184, 0, 0.4);
          }
        }

        .expert-flame-mini {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 8px;
          background: radial-gradient(ellipse at center, rgba(255, 140, 0, 0.15) 0%, transparent 70%);
          opacity: 0;
          animation: flame-flicker-mini 2.5s ease-in-out infinite;
        }

        .mode-card-compact.active.expert .expert-flame-mini {
          opacity: 1;
        }

        @keyframes flame-flicker-mini {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Módulo de Status - Compacto */
        .status-section-compact {
          border-left: 2px solid var(--success);
        }

        .status-card-compact {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          font-family: inherit;
        }

        .status-indicator-compact {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
          transition: all 0.3s;
        }

        .status-card-compact.ready .status-indicator-compact {
          background: var(--success);
          color: #000;
          box-shadow: 0 0 12px rgba(0, 255, 157, 0.5);
        }

        .status-card-compact.checking .status-indicator-compact {
          background: var(--warning);
          color: #000;
        }

        .status-card-compact.error .status-indicator-compact {
          background: var(--danger);
          color: #fff;
        }

        .status-text-compact h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 2px 0;
          line-height: 1.2;
        }

        .status-text-compact p {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.2;
        }

        /* Módulo de Ações - Compacto */
        .actions-section-compact {
          border-left: 2px solid var(--warning);
        }

        .action-cards-compact {
          display: flex;
          gap: 8px;
        }

        .action-btn-compact {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(10, 14, 23, 0.7);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          overflow: hidden;
        }

        .action-btn-compact:hover:not(.disabled) {
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(10, 14, 23, 0.9);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .action-btn-compact.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .action-btn-compact.disabled-blur {
          opacity: 0.35;
          cursor: not-allowed;
          filter: blur(0.5px) grayscale(0.3);
          transition: all 0.3s;
        }

        .action-btn-compact.disabled-blur:hover {
          opacity: 0.5;
          filter: blur(0.3px) grayscale(0.2);
          transform: none;
          box-shadow: none;
        }

        .action-btn-compact.consultancy:hover:not(.disabled) {
          border-color: rgba(0, 150, 255, 0.4);
          box-shadow: 0 4px 12px rgba(0, 150, 255, 0.2);
        }

        .action-btn-compact.result:hover:not(.disabled) {
          border-color: rgba(0, 242, 255, 0.4);
          box-shadow: 0 4px 12px rgba(0, 242, 255, 0.2);
        }

        .action-btn-compact.download:hover:not(.disabled) {
          border-color: rgba(0, 255, 157, 0.4);
          box-shadow: 0 4px 12px rgba(0, 255, 157, 0.2);
        }

        .action-btn-compact.execute {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.15), rgba(112, 0, 255, 0.15));
          border-color: var(--primary);
          border-width: 2px;
        }

        .action-btn-compact.execute:hover:not(.disabled):not(.running) {
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.25), rgba(112, 0, 255, 0.25));
          box-shadow: 0 4px 16px rgba(0, 242, 255, 0.3);
          transform: translateY(-3px) scale(1.05);
        }

        .action-btn-compact.execute.running {
          animation: pulse-execute 2s ease-in-out infinite;
        }

        @keyframes pulse-execute {
          0%, 100% {
            box-shadow: 0 0 12px rgba(0, 242, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 24px rgba(0, 242, 255, 0.5);
          }
        }

        .execute-glow-mini {
          position: absolute;
          inset: 0;
          border-radius: 8px;
          background: radial-gradient(circle at center, rgba(255, 140, 0, 0.25), transparent 70%);
          opacity: 0;
          animation: glow-pulse-mini 2s ease-in-out infinite;
          pointer-events: none;
        }

        .control-panel-master-compact.expert-mode .action-btn-compact.execute .execute-glow-mini {
          opacity: 1;
        }

        @keyframes glow-pulse-mini {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        /* === NOVO LAYOUT: Grid com 3 Colunas === */
        .control-left-section,
        .control-right-section {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .control-left-section {
          justify-content: flex-start;
        }

        .control-right-section {
          justify-content: flex-end;
        }

        .control-center-section {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* === BOTÃO EXECUTAR PRINCIPAL (Grande e Centralizado) === */
        .execution-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-execute-main {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 28px;
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.2), rgba(112, 0, 255, 0.2));
          border: 2px solid var(--primary);
          border-radius: 12px;
          color: var(--text-main);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 242, 255, 0.2);
        }

        .btn-execute-main:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(0, 242, 255, 0.4);
          border-color: rgba(0, 242, 255, 0.8);
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.3), rgba(112, 0, 255, 0.3));
        }

        .btn-execute-main.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .btn-execute-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(0, 242, 255, 0.15);
          border-radius: 10px;
          border: 1px solid rgba(0, 242, 255, 0.3);
        }

        .btn-execute-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
        }

        .btn-execute-label {
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .btn-execute-sublabel {
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.2;
        }

        .btn-execute-glow {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: radial-gradient(circle at center, rgba(255, 140, 0, 0.3), transparent 70%);
          opacity: 0;
          animation: glow-pulse-execute 2s ease-in-out infinite;
          pointer-events: none;
        }

        .control-panel-master-compact.expert-mode .btn-execute-main .btn-execute-glow {
          opacity: 1;
        }

        @keyframes glow-pulse-execute {
          0%, 100% {
            opacity: 0.5;
            transform: scale(0.98);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
          }
        }

        /* Botão Executando (pulsando) */
        .btn-executing-main {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 28px;
          background: linear-gradient(135deg, rgba(255, 184, 0, 0.25), rgba(255, 140, 0, 0.25));
          border: 2px solid var(--warning);
          border-radius: 12px;
          color: var(--text-main);
          font-weight: 700;
          font-size: 1rem;
          cursor: not-allowed;
          font-family: inherit;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(255, 184, 0, 0.3);
          animation: pulse-executing 2s ease-in-out infinite;
        }

        @keyframes pulse-executing {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(255, 184, 0, 0.3);
            border-color: var(--warning);
          }
          50% {
            box-shadow: 0 6px 35px rgba(255, 184, 0, 0.5);
            border-color: rgba(255, 200, 0, 0.8);
          }
        }

        .btn-execute-pulse {
          position: absolute;
          inset: -2px;
          border-radius: 12px;
          border: 2px solid var(--warning);
          opacity: 0;
          animation: pulse-border 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes pulse-border {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
          100% {
            opacity: 0;
            transform: scale(1.1);
          }
        }

        /* Botão Stop */
        .btn-stop-main {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 42, 109, 0.2);
          border: 2px solid var(--danger);
          border-radius: 12px;
          color: var(--danger);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          box-shadow: 0 4px 15px rgba(255, 42, 109, 0.2);
        }

        .btn-stop-main:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(255, 42, 109, 0.4);
          background: rgba(255, 42, 109, 0.3);
          border-color: rgba(255, 60, 120, 0.8);
        }

        .btn-stop-main svg {
          filter: drop-shadow(0 0 4px currentColor);
        }

        /* Responsividade */
        @media (max-width: 1400px) {
          .mode-card-compact {
            padding: 6px 10px;
          }

          .mode-card-icon-compact {
            width: 28px;
            height: 28px;
          }

          .mode-card-text-compact h4 {
            font-size: 0.8rem;
          }

          .mode-card-text-compact p {
            font-size: 0.65rem;
          }
        }

        @media (max-width: 1200px) {
          .control-panel-master-compact {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .control-left-section,
          .control-center-section,
          .control-right-section {
            justify-content: center;
          }

          .mode-cards-horizontal {
            width: 100%;
            justify-content: center;
          }

          .mode-card-compact {
            flex: 1;
            max-width: 200px;
          }
        }

        @media (max-width: 768px) {
          .control-panel-master-compact {
            padding: 12px 16px;
            gap: 12px;
          }

          .control-left-section,
          .control-right-section {
            flex-direction: column;
            width: 100%;
          }

          .control-section-compact {
            width: 100%;
            justify-content: space-between;
          }

          .mode-cards-horizontal {
            flex-direction: column;
            width: 100%;
            gap: 10px;
          }

          .mode-card-compact {
            max-width: 100%;
            padding: 10px 14px;
            justify-content: flex-start;
          }

          .mode-card-icon-compact {
            width: 36px;
            height: 36px;
          }

          .mode-card-text-compact h4 {
            font-size: 0.9rem;
          }

          .mode-card-text-compact p {
            font-size: 0.75rem;
          }

          .btn-execute-main,
          .btn-executing-main {
            width: 100%;
            justify-content: center;
          }
        }

        /* Header Minimalista */
        .opt-header-minimal {
          position: relative;
          z-index: 100;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 14px 32px;
          background: rgba(3, 5, 8, 0.96);
          backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid rgba(0, 242, 255, 0.1);
          box-shadow: 
            0 4px 24px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .opt-header-minimal::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.6) 50%, transparent);
          filter: blur(0.5px);
          animation: header-glow 3s ease-in-out infinite;
        }

        @keyframes header-glow {
          0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
          50% { opacity: 1; transform: scaleX(1); }
        }

        .header-brand-minimal {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .back-btn-minimal {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          padding: 0;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }

        .back-btn-minimal svg {
          transition: transform 0.3s;
        }

        .back-btn-minimal:hover {
          background: rgba(0, 242, 255, 0.12);
          border-color: rgba(0, 242, 255, 0.35);
          color: var(--primary);
          box-shadow: 
            0 4px 16px rgba(0, 242, 255, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transform: translateX(-2px);
        }

        .back-btn-minimal:hover svg {
          transform: translateX(-2px);
        }

        .back-btn-minimal:active {
          transform: translateX(-1px) scale(0.96);
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: linear-gradient(135deg, rgba(0, 242, 255, 0.18) 0%, rgba(0, 200, 212, 0.1) 100%);
          border: 1px solid rgba(0, 242, 255, 0.25);
          font-size: 1.4rem;
          box-shadow: 
            0 4px 16px rgba(0, 242, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          animation: icon-pulse 3s ease-in-out infinite;
        }

        @keyframes icon-pulse {
          0%, 100% { 
            box-shadow: 0 4px 16px rgba(0, 242, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 6px 24px rgba(0, 242, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            transform: scale(1.02);
          }
        }

        .brand-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .brand-name {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: var(--text-primary);
          line-height: 1;
        }

        .brand-product {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .header-center {
          display: flex;
          justify-content: center;
        }

        .header-title-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 24px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(0, 242, 255, 0.2);
          border-radius: 12px;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-primary);
          box-shadow: 
            0 2px 12px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;\n          background: var(--primary);
          box-shadow: 0 0 10px var(--primary), 0 0 20px rgba(0, 242, 255, 0.4);
          animation: badge-pulse 2s ease-in-out infinite;
        }

        @keyframes badge-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.88); }
        }

        .header-user {
          display: flex;
          justify-content: flex-end;
        }

        /* ================ */
        /* FREE TIER VISUAL WARNINGS */
        /* ================ */
        
        /* Banner de aviso FREE TIER */
        .free-tier-warning-banner {
          position: relative;
          z-index: 8;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 24px;
          background: linear-gradient(135deg, rgba(255, 184, 0, 0.12) 0%, rgba(255, 140, 0, 0.08) 100%);
          border-bottom: 2px solid rgba(255, 184, 0, 0.3);
          border-top: 1px solid rgba(255, 184, 0, 0.15);
          backdrop-filter: blur(10px);
          animation: banner-slide-down 0.4s ease-out;
        }

        @keyframes banner-slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .warning-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          filter: drop-shadow(0 0 8px rgba(255, 184, 0, 0.5));
          animation: warning-pulse 2s ease-in-out infinite;
        }

        @keyframes warning-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }

        .warning-content {
          flex: 1;
        }

        .warning-content strong {
          display: block;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--warning);
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }

        .warning-content p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-main);
          line-height: 1.5;
        }

        .warning-content p strong {
          display: inline;
          color: var(--warning);
          font-weight: 700;
        }

        .warning-dismiss {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 1.2rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          padding: 0;
          flex-shrink: 0;
        }

        .warning-dismiss:hover {
          background: rgba(255, 42, 109, 0.2);
          border-color: var(--danger);
          color: var(--danger);
          transform: rotate(90deg);
        }

        /* Badge de quota Ultra Expert */
        .ultra-expert-quota {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding: 4px 8px;
          background: rgba(255, 184, 0, 0.12);
          border: 1px solid rgba(255, 184, 0, 0.25);
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--warning);
          animation: quota-glow 2s ease-in-out infinite;
        }

        .ultra-expert-quota.quota-exhausted {
          background: rgba(255, 68, 68, 0.12);
          border-color: rgba(255, 68, 68, 0.3);
          color: #ff4444;
          animation: quota-exhausted-pulse 2s ease-in-out infinite;
        }

        @keyframes quota-glow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(255, 184, 0, 0.2);
          }
          50% {
            box-shadow: 0 0 16px rgba(255, 184, 0, 0.4);
          }
        }

        @keyframes quota-exhausted-pulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(255, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 0 16px rgba(255, 68, 68, 0.5);
          }
        }

        .quota-icon {
          font-size: 0.9rem;
          filter: drop-shadow(0 0 4px currentColor);
        }

        .quota-text {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.02em;
        }

        /* Aviso de linhas excedidas no admin */
        .admin-value.warning {
          color: var(--warning) !important;
          font-weight: 800 !important;
          animation: value-warning-pulse 2s ease-in-out infinite;
        }

        @keyframes value-warning-pulse {
          0%, 100% {
            text-shadow: 0 0 8px rgba(255, 184, 0, 0.4);
          }
          50% {
            text-shadow: 0 0 16px rgba(255, 184, 0, 0.6);
          }
        }

        .admin-warning-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 3px 8px;
          background: rgba(255, 184, 0, 0.15);
          border: 1px solid rgba(255, 184, 0, 0.3);
          border-radius: 4px;
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--warning);
          letter-spacing: 0.5px;
        }

        /* Notice de truncamento */
        .admin-row.truncation-notice {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255, 184, 0, 0.08);
          border: 1px solid rgba(255, 184, 0, 0.2);
          border-radius: 8px;
          margin-top: 4px;
        }

        .truncation-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          filter: drop-shadow(0 0 6px rgba(255, 184, 0, 0.5));
        }

        .truncation-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .truncation-text strong {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--warning);
          line-height: 1.3;
        }

        .truncation-text small {
          font-size: 0.65rem;
          color: var(--text-secondary);
          line-height: 1.3;
        }

        /* Responsividade do Header */
        @media (max-width: 768px) {
          .opt-header-minimal {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 12px 20px;
          }

          .header-brand-minimal,
          .header-user {
            justify-content: center;
          }

          .header-center {
            order: -1;
          }

          .header-title-badge {
            font-size: 0.8rem;
            padding: 7px 18px;
          }

          .free-tier-warning-banner {
            padding: 12px 16px;
            gap: 12px;
          }

          .warning-icon {
            font-size: 1.2rem;
          }

          .warning-content strong {
            font-size: 0.85rem;
          }

          .warning-content p {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div >
  );
};

export default OptimizerPageV2;
