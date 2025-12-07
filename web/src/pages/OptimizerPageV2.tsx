// web/src/pages/OptimizerPageV2.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./OptimizerPageV2.css";
import "./ControlPanel.css";
import "./PipelineCard.css";
import "./ModalStyles.css";

import { copyToClipboard } from "../lib/clipboard";
import { apiClient } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { UserRole } from "../types/auth";
import { formatDuration } from "../lib/formatTime";
import { UserMenu } from "../components/UserMenu";
import ConsultancyDocumentViewer from "../components/ConsultancyDocumentViewer";
import ROICard from "../components/ROICard";
import ScriptAnalysisInfo from "../components/ScriptAnalysisInfo";
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
import { useOptimizationProgress } from "../hooks/useOptimizationProgress";
import { useSessionPersistence } from "../hooks/useSessionPersistence";
import { highlightQlikCode } from "../lib/qlikSyntaxHighlighter";

interface OptimizerPageProps {
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
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Unlock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
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

type RunHistoryItem = {
  id: string;
  mode: OptimizeMode;
  status: "success" | "error";
  finishedAt: string;
  provider?: string;
};

const HISTORY_STORAGE_KEY = "qlik_codex_recent_runs_v1";

const loadHistory = (): RunHistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (_err) {
    return [];
  }
};

// Função para syntax highlighting de Qlik usando o módulo centralizado
// highlightQlikCode já faz limpeza de HTML existente antes de aplicar highlighting
const highlightQlikSyntax = (line: string): string => {
  return highlightQlikCode(line);
};

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
  const [isScrollLocked, setIsScrollLocked] = useState(true);
  const originalScrollRef = React.useRef<HTMLDivElement | null>(null);
  const optimizedScrollRef = React.useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = React.useRef(false);
  const [copyState, setCopyState] = useState<{ original: string; optimized: string }>(
    { original: "📋 Copiar", optimized: "📋 Copiar" }
  );

  // === HOOKS ===
  const { user } = useAuth();
  const optimization = useOptimizationProgress();
  const session = useSessionPersistence();
  const { navigateBack } = useNavigation();

  const [recentRuns, setRecentRuns] = useState<RunHistoryItem[]>(loadHistory);
  const pushHistory = useCallback((entry: RunHistoryItem) => {
    setRecentRuns(prev => {
      const next = [entry, ...prev].slice(0, 5);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch (_err) {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // Check if user is OWNER (has full features)
  const isOwner = user?.role === UserRole.OWNER;

  // FREE TIER: Cálculo de linhas e limites
  const scriptLineCount = script ? script.split(/\r?\n/).length : 0;
  const FREE_TIER_LINE_LIMIT = 200;
  const exceedsLineLimit = !isOwner && scriptLineCount > FREE_TIER_LINE_LIMIT;
  const willBeTruncated = exceedsLineLimit;

  // FREE TIER: Controle de visibilidade do banner de aviso
  const [showFreeTierWarning, setShowFreeTierWarning] = useState(true);

  // FREE TIER: Contador de Ultra Expert (4 por DIA para USER) com persistência
  const MAX_ULTRA_EXPERT_RUNS = isOwner ? -1 : 4; // -1 = ilimitado

  // Carregar contador do localStorage e verificar se é do mesmo dia
  const getStoredUsageCount = (): number => {
    try {
      const stored = localStorage.getItem('qlik_codex_usage');
      if (!stored) return 0;
      const { count, date } = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0];
      // Se é um novo dia, resetar contador
      if (date !== today) {
        localStorage.setItem('qlik_codex_usage', JSON.stringify({ count: 0, date: today }));
        return 0;
      }
      return count;
    } catch {
      return 0;
    }
  };

  const [ultraExpertUsageCount, setUltraExpertUsageCount] = useState(getStoredUsageCount);
  const hasUltraExpertQuotaLeft = isOwner || ultraExpertUsageCount < MAX_ULTRA_EXPERT_RUNS;

  // Salvar contador no localStorage quando mudar
  useEffect(() => {
    if (!isOwner) {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('qlik_codex_usage', JSON.stringify({ count: ultraExpertUsageCount, date: today }));
    }
  }, [ultraExpertUsageCount, isOwner]);

  // Sincroniza mudança de modo com o hook de progresso
  const handleModeChange = (newMode: OptimizeMode) => {
    setMode(newMode);
    optimization.updateMode(newMode); // Atualiza as stages visíveis
  };

  const selectedLLM = useMemo(() => getLLMOptionById(llmOptionId), [llmOptionId]);
  const providerForMode = useMemo(() => mode === 'nvidia-fast' ? 'nvidia' as const : selectedLLM.provider, [mode, selectedLLM]);
  const llmModelForMode = useMemo(() => mode === 'nvidia-fast' ? undefined : selectedLLM.model, [mode, selectedLLM]);

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
          if (restored.mode) {
            handleModeChange(restored.mode as OptimizeMode);
          }
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
        llmProvider: providerForMode,
        llmModel: llmModelForMode,
        progressData: optimization.progress,
        isRunning: true
      });
    }
  }, [optimization.isRunning, optimization.progress, script, mode, providerForMode, llmModelForMode, session]);

  // === HANDLERS ===
  const handleBackNavigation = () => {
    navigateBack("landing");
  };

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
          if (optResult.optimizedScript.includes('\\n') && !optResult.optimizedScript.includes('\n')) {
            optResult.optimizedScript = optResult.optimizedScript.replace(/\\n/g, '\n');
          }
          // Trim to avoid leading/trailing empty lines causing offsets
          optResult.optimizedScript = optResult.optimizedScript.trim();
        }

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
          llmProvider: providerForMode,
          llmModel: llmModelForMode,
          progressData: optimization.progress,
          status: "completed"
        }).catch(console.error);

        pushHistory({
          id: session.sessionId,
          mode,
          status: "success",
          finishedAt: new Date().toISOString(),
          provider: providerForMode
        });
      } else if (optimization.progress.errorMessage) {
        setError(optimization.progress.errorMessage);

        // Salva sessão com erro
        await session.saveSession({
          sessionId: session.sessionId,
          mode,
          script: trimmed,
          llmProvider: providerForMode,
          llmModel: llmModelForMode,
          progressData: optimization.progress,
          status: "error"
        }).catch(console.error);

        pushHistory({
          id: session.sessionId,
          mode,
          status: "error",
          finishedAt: new Date().toISOString(),
          provider: providerForMode
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
        provider: providerForMode
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
      helper: "Retorno em poucos segundos • Sem relatórios",
      badge: "NOVO",
      accentClass: "nvidia"
    }
  };

  // NVIDIA Official Logo (Simplified Eye)
  const NvidiaLogo = () => (
    <svg className="nvidia-logo-svg" viewBox="0 0 351.5 67.1" fill="currentColor">
      <path d="M128.5,3.5c-16.2,0.9-30.4,7.7-40.9,19.5c-1.7,1.9-3.2,3.9-4.5,6c-1.3-2.1-2.8-4.1-4.5-6C68.1,11.2,54,4.4,37.7,3.5C17,2.4,0.2,18.5,0.2,39.2v24.4h24.6V39.2c0-8.5,6.3-15.5,14.8-15.5c8.9,0.5,16.1,6.8,17.9,15.5c0.3,1.5,0.5,3,0.5,4.6v19.8h24.6V43.8c0-1.6,0.2-3.1,0.5-4.6c1.8-8.7,9-15,17.9-15.5c8.5,0,14.8,7,14.8,15.5v24.4h24.6V39.2C140.4,18.5,149.2,2.4,128.5,3.5z" />
      <path d="M176.2,3.5h-24.6v60.1h24.6V3.5z" />
      <path d="M230.4,3.5h-30.3l-27.6,60.1h26.2l4.3-9.8h24.5l4.3,9.8h26.2L230.4,3.5z M209.3,41.5l6-13.7l6,13.7H209.3z" />
    </svg>
  );

  // === RENDER ===
  return (
    <div className={`opt-page ${mode === 'nvidia-fast' ? 'nvidia-mode-active' : ''} ${optimization.isOptimizing && mode === 'nvidia-fast' ? 'optimizing-pulse' : ''}`}>
      {/* Background */}
      <div className="opt-bg">
        <div className="bg-gradient" />
        <div className="bg-grid" />
      </div>

      {/* Header Minimalista */}
      <header className="opt-header-minimal">
        <div className="header-brand-minimal">
          <button className="back-btn-minimal" onClick={handleBackNavigation} title="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <BrandMark variant="full" size="sm" showBeta className="opt-brand-mark" />
        </div>

        <div className="header-center">
          {/* NVIDIA Logo Display */}
          {mode === 'nvidia-fast' && (
            <div className="nvidia-header-badge">
              <NvidiaLogo />
              <span className="nvidia-text">NIM INFERENCE NVIDIA</span>
            </div>
          )}
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
              {Object.entries(modeInfo).map(([modeKey, info]) => {
                const option = modeKey as OptimizeMode;
                const isUltra = option === "ultra-expert";
                const isSelected = mode === option;
                const disabled = isUltra && !isOwner && !hasUltraExpertQuotaLeft;
                const quotaTitle = !isOwner && !hasUltraExpertQuotaLeft
                  ? 'Quota diária de Ultra Expert esgotada. Limite geral: 4 execuções/dia. Aguarde renovação.'
                  : undefined;

                return (
                  <button
                    key={option}
                    className={`mode-card-compact ${isSelected ? 'active' : ''} ${isUltra ? 'expert' : ''} ${info.accentClass || ''}`}
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
                        <div className={`ultra-expert-quota ${!hasUltraExpertQuotaLeft ? 'quota-exhausted' : ''}`}>
                          <span className="quota-icon">{hasUltraExpertQuotaLeft ? '🎟️' : '🚫'}</span>
                          <span className="quota-text">
                            {Math.max(0, MAX_ULTRA_EXPERT_RUNS - ultraExpertUsageCount)} de {MAX_ULTRA_EXPERT_RUNS} execuções
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`mode-active-dot ${isUltra ? 'expert' : ''}`} />
                    {isUltra && <div className="expert-flame-mini" />}
                  </button>
                );
              })}
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
            <div className="action-cards-compact">
              {/* Consultoria */}
              <button
                className={`action-btn-compact consultancy ${!consultancyDoc ? 'disabled-blur' : ''}`}
                onClick={() => consultancyDoc && setShowConsultancy(true)}
                disabled={!consultancyDoc}
                title={consultancyDoc ? "Ver Auditoria/Consultoria" : "Auditoria será gerada após otimização"}
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
          <div className="ctrl-card history-card">
            <div className="ctrl-header">
              <Icons.Clock />
              <span>Últimas execuções</span>
            </div>
            {recentRuns.length === 0 ? (
              <div className="ctrl-empty">Nenhuma execução recente.</div>
            ) : (
              <div className="history-list">
                {recentRuns.map((run, index) => (
                  <div key={`${run.id}-${run.finishedAt}-${index}`} className="history-item">
                    <div className="history-main">
                      <span className="history-mode">{run.mode}</span>
                      <span className={`history-status ${run.status}`}>
                        {run.status === 'success' ? 'Sucesso' : 'Erro'}
                      </span>
                    </div>
                    <div className="history-meta">
                      <span>{new Date(run.finishedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {run.provider && <span className="history-provider">{run.provider}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                    const colorConfig = [
                      { hex: '#00f2ff', rgb: '0, 242, 255' },
                      { hex: '#00ff9d', rgb: '0, 255, 157' },
                      { hex: '#ffb800', rgb: '255, 184, 0' },
                      { hex: '#ff6b6b', rgb: '255, 107, 107' }
                    ];
                    const theme = colorConfig[index % colorConfig.length];
                    const color = theme.hex;
                    const rgb = theme.rgb;

                    const icons = [<Icons.Search key="s" />, <Icons.Zap key="z" />, <Icons.Shield key="sh" />, <Icons.CheckCircle key="c" />];
                    const icon = icons[index % icons.length];

                    const subSteps = stage?.subSteps || [];
                    const completedSubSteps = subSteps.filter(s => s.status === "success").length;
                    const totalSubSteps = subSteps.length;
                    const progressPercent = totalSubSteps > 0 ? Math.round((completedSubSteps / totalSubSteps) * 100) : 0;
                    const hasSubSteps = totalSubSteps > 0;
                    const isComplete = stage?.status === "success" || (totalSubSteps > 0 && subSteps.every(s => s.status === "success"));
                    const isActive = stage?.status === "running" || subSteps.some(s => s.status === "running");
                    const hasError = stage?.status === "error" || subSteps.some(s => s.status === "error");
                    const cardDuration = subSteps.reduce((sum, sub) => sum + (sub.duration || 0), 0) || (stage?.duration || 0);
                    const isNvidiaFast = stage.id === "NVIDIA_FAST";
                    const statusLabel = stage.status === "running"
                      ? "Executando"
                      : stage.status === "success"
                        ? "Concluído"
                        : stage.status === "error"
                          ? "Erro"
                          : "Aguardando";
                    const durationLabel = cardDuration ? formatDuration(cardDuration) : "--";

                    return (
                      <details
                        key={stage.id}
                        className={`stage-card-v3 ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''} ${hasError ? 'error' : ''}`}
                        open={true}
                        style={{
                          '--card-color': color,
                          '--card-color-rgb': rgb
                        } as React.CSSProperties}
                      >
                        <summary className="card-summary">
                          <div className="card-top-accent" />

                          <div className="card-top-row">
                            <div className="card-icon-box" style={{ color: color }}>
                              {icon}
                            </div>

                            <div className="card-text-block">
                              <h3 className="card-title-main">{stage.name}</h3>
                              <p className="card-desc">{totalSubSteps} tarefas</p>
                            </div>

                            <div className="card-status-badge-container">
                              {isActive ? (
                                <span className="status-pill active" style={{ color: color, borderColor: color }}>
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
                                  width: `${progressPercent}%`
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
                        <div className={`card-substeps ${isNvidiaFast ? 'nvidia-expanded' : ''}`}>
                          {hasSubSteps ? (
                            subSteps.map((subStep) => {
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
                            })
                          ) : (
                            isNvidiaFast ? (
                              <div className="nvidia-fast-empty">
                                <div className="nvidia-fast-tags">
                                  <span className="nvidia-chip primary">Execução GPU</span>
                                  <span className="nvidia-chip muted">Sem relatório textual</span>
                                  <span className={`nvidia-chip status ${stage.status}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                                <p className="nvidia-fast-desc">
                                  Otimizador NVIDIA Fast retorna apenas o script refatorado direto da GPU, ideal para respostas rápidas.
                                </p>
                                <div className="nvidia-fast-grid">
                                  <div className="nvidia-fast-stat">
                                    <span>Saída</span>
                                    <strong>Script otimizado</strong>
                                  </div>
                                  <div className="nvidia-fast-stat">
                                    <span>Relatório</span>
                                    <strong>Não gera</strong>
                                  </div>
                                  <div className="nvidia-fast-stat">
                                    <span>Tempo</span>
                                    <strong>{durationLabel}</strong>
                                  </div>
                                </div>
                                <div className="nvidia-fast-meta">
                                  <div className="nvidia-fast-section">
                                    <span className="nvidia-fast-label">Modelos GPU</span>
                                    <strong className="nvidia-fast-value">Fila NVIDIA Fast</strong>
                                    <p className="nvidia-fast-note">Execução dedicada em GPU; nomes de modelo aparecem conforme retorno do backend.</p>
                                  </div>
                                  <div className="nvidia-fast-section">
                                    <span className="nvidia-fast-label">Modo de entrega</span>
                                    <strong className="nvidia-fast-value">Script refatorado</strong>
                                    <p className="nvidia-fast-note">Entrega focada no código final, sem relatório textual para reduzir latência.</p>
                                  </div>
                                  <div className="nvidia-fast-section">
                                    <span className="nvidia-fast-label">Uso recomendado</span>
                                    <div className="nvidia-fast-pill-row">
                                      <span className="nvidia-chip muted">Respostas rápidas</span>
                                      <span className="nvidia-chip muted">Reexecução frequente</span>
                                      <span className="nvidia-chip muted">Ajustes pontuais</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="card-empty-text">Nenhuma tarefa listada para esta etapa.</div>
                            )
                          )}
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
                <>
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
                      <div className="kpi">
                        <span className="kpi-label">Mudanças</span>
                        <span className="kpi-value">{result.analysis.changes.length}</span>
                      </div>
                    )}
                  </div>
                  <div className="ainex-training-note">
                    <span className="ainex-training-note-badge">AINEX ENGINE</span>
                    <span>Modelo treinado em milhares de scripts Qlik de produ??o para entregar recomenda??es em n?vel PRO.</span>
                  </div>
                </>
              )
            }
          </div>


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
        <BrandMark variant="wordmark" size="sm" showBeta className="opt-footer-brand" />
        <span style={{ color: '#444' }}>•</span>
        <span style={{ color: '#888', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>© 2025 Sentinnell IA</span>
        <span style={{ color: '#444' }}>•</span>
        <a href="https://github.com/jeanrrf" target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>GitHub</a>
        <a href="https://api.whatsapp.com/send?phone=5548991937304" target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>WhatsApp</a>
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
          (() => {
            const isNvidiaResult = result.analysis?.mode === "nvidia-fast";
            const handleSyncScroll = (source: "original" | "optimized") => (e: React.UIEvent<HTMLDivElement>) => {
              if (!isScrollLocked || isSyncingScrollRef.current) return;
              const target = e.currentTarget;
              const otherRef = source === "original" ? optimizedScrollRef.current : originalScrollRef.current;
              if (!otherRef) return;
              isSyncingScrollRef.current = true;
              otherRef.scrollTop = target.scrollTop;
              otherRef.scrollLeft = target.scrollLeft;
              requestAnimationFrame(() => {
                isSyncingScrollRef.current = false;
              });
            };

            const handleCopy = async (kind: "original" | "optimized", text: string, buttonEl?: HTMLButtonElement | null) => {
              const success = await copyToClipboard(text);
              if (!buttonEl) return;
              if (success) {
                setCopyState(prev => ({ ...prev, [kind]: "✓ Copiado" }));
                setTimeout(() => setCopyState(prev => ({ ...prev, [kind]: "📋 Copiar" })), 1800);
              }
            };

            return (
              <div className="modal-overlay" onClick={() => setShowResultViewer(false)}>
                <div className="modal-container result-viewer-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>📊 Resultado da Otimização</h2>
                    <div className="result-header-actions">
                      <button
                        className={`action-btn small ${isScrollLocked ? 'primary' : 'secondary'}`}
                        onClick={() => setIsScrollLocked(!isScrollLocked)}
                        title={isScrollLocked ? "Desativar rolagem sincronizada" : "Ativar rolagem sincronizada"}
                      >
                        {isScrollLocked ? <Icons.Lock /> : <Icons.Unlock />}
                        {isScrollLocked ? "Scroll Lock On" : "Scroll Lock Off"}
                      </button>
                      <button className="action-btn secondary small" onClick={() => setDownloadModalOpen(true)}>
                        <Icons.Download /> Baixar ZIP
                      </button>
                      <button className="close-btn" onClick={() => setShowResultViewer(false)}>×</button>
                    </div>
                  </div>
                  <div className="modal-body result-viewer-body">
                    {!isNvidiaResult && (
                      <>
                        <div className="result-summary-card">
                          <h4>📝 Resumo</h4>
                          <p>{result.summary}</p>
                        </div>

                        {result.diffStats && (
                          <div className="diff-stats-card">
                            <div className="diff-stat added">
                              <span className="diff-icon">+</span>
                              <span className="diff-value">{result.diffStats.linesAdded}</span>
                              <span className="diff-label">Adicionadas</span>
                            </div>
                            <div className="diff-stat removed">
                              <span className="diff-icon">-</span>
                              <span className="diff-value">{result.diffStats.linesRemoved}</span>
                              <span className="diff-label">Removidas</span>
                            </div>
                            <div className="diff-stat modified">
                              <span className="diff-icon">~</span>
                              <span className="diff-value">{result.diffStats.linesModified}</span>
                              <span className="diff-label">Modificadas</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {isNvidiaResult && (
                      <div className="result-summary-card nvidia-inline">
                        <div>
                          <h4>⚡ NVIDIA Fast</h4>
                          <p>Este modo entrega apenas o script otimizado (sem relatório completo).</p>
                        </div>
                        <div className="pill-row">
                          <span className="pill">Script otimizado</span>
                          <span className="pill">Sem relatório textual</span>
                        </div>
                      </div>
                    )}

                    {/* Code Comparison com Scroll Sincronizado */}
                    <div className={`code-comparison ${isNvidiaResult ? 'single-column' : ''}`}>
                      {!isNvidiaResult && (
                        <div className="code-panel original">
                          <div className="code-panel-header">
                            <span className="panel-label">📄 Original</span>
                            <div className="panel-actions">
                              <span className="line-count">{result.originalScript.split('\n').length} linhas</span>
                              <button
                                className="copy-btn"
                                onClick={(e) => handleCopy("original", result.originalScript, e.currentTarget)}
                                title="Copiar código original"
                              >
                                {copyState.original}
                              </button>
                            </div>
                          </div>
                          <div
                            className="code-content-wrapper"
                            ref={originalScrollRef}
                            onScroll={handleSyncScroll("original")}
                          >
                            <table className="code-table">
                              <tbody>
                                {result.originalScript.split(/\r?\n/).map((line, idx) => (
                                  <tr key={idx}>
                                    <td className="line-number-cell" data-line-number={idx + 1}></td>
                                    <td className="code-cell">
                                      <div className="code-line-content code-content qlik-syntax" dangerouslySetInnerHTML={{ __html: highlightQlikSyntax(line) || '&nbsp;' }} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className={`code-panel optimized ${isNvidiaResult ? 'full-width' : ''}`}>
                        <div className="code-panel-header">
                          <span className="panel-label">✨ Otimizado</span>
                          <div className="panel-actions">
                            <span className="line-count">{result.optimizedScript.split(/\r?\n/).length} linhas</span>
                            <button
                              className="copy-btn"
                              onClick={(e) => handleCopy("optimized", result.optimizedScript, e.currentTarget)}
                              title="Copiar código otimizado"
                            >
                              {copyState.optimized}
                            </button>
                          </div>
                        </div>
                        <div
                          className="code-content-wrapper"
                          ref={optimizedScrollRef}
                          onScroll={handleSyncScroll("optimized")}
                        >
                          <table className="code-table">
                            <tbody>
                              {result.optimizedScript.split(/\r?\n/).map((line, idx) => (
                                <tr key={idx}>
                                  <td className="line-number-cell" data-line-number={idx + 1}></td>
                                  <td className="code-cell">
                                    <div className="code-line-content code-content qlik-syntax" dangerouslySetInnerHTML={{ __html: highlightQlikSyntax(line) || '&nbsp;' }} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {!isNvidiaResult && result.changes && result.changes.length > 0 && (
                      <div className="changes-list">
                        <h4>🔧 Lista de Alterações ({result.changes.length})</h4>
                        <div className="changes-grid">
                          {result.changes.slice(0, 10).map((change, idx) => (
                            <div key={idx} className="change-item">
                              <div className="change-header">
                                <span className="change-category">{change.category}</span>
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
            );
          })()
        )
      }

      
    </div >
  );
};

export default OptimizerPageV2;

