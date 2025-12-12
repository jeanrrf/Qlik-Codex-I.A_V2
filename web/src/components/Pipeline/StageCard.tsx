// web/src/components/Pipeline/StageCard.tsx
import React from 'react';
import type { PipelineStage, StageTheme } from '../../types/pipeline';
import { calculateStageDuration, getStatusLabel } from '../../types/pipeline';
import { formatDuration } from '../../lib/formatters';
import { SubTaskItem } from './SubTaskItem';
import './Pipeline.css';

// ═══════════════════════════════════════════════════════════════
// ICONS SVG INLINE
// ═══════════════════════════════════════════════════════════════

const Icons = {
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Code: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Cpu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  Zap: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

const getIconComponent = (icon: StageTheme['icon']) => {
  const iconMap: Record<StageTheme['icon'], React.FC> = {
    search: Icons.Search,
    code: Icons.Code,
    'file-text': Icons.FileText,
    cpu: Icons.Cpu,
    zap: Icons.Zap,
    shield: Icons.Shield,
    check: Icons.Check,
  };
  return iconMap[icon] || Icons.Zap;
};

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface StageCardProps {
  /** Dados da etapa */
  stage: PipelineStage;
  /** Índice da etapa (para fallback de tema) */
  index?: number;
  /** Se o card deve iniciar expandido */
  defaultOpen?: boolean;
  /** Modo de exibição */
  mode?: 'ultra-expert' | 'nvidia-fast';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export const StageCard: React.FC<StageCardProps> = ({
  stage,
  index = 0,
  defaultOpen = true,
  mode = 'ultra-expert',
}) => {
  // Tema visual
  const fallbackThemes: StageTheme[] = [
    { id: 'default-0', hex: '#00f2ff', rgb: '0, 242, 255', icon: 'search' },
    { id: 'default-1', hex: '#00ff9d', rgb: '0, 255, 157', icon: 'code' },
    { id: 'default-2', hex: '#ffb800', rgb: '255, 184, 0', icon: 'file-text' },
    { id: 'default-3', hex: '#76b900', rgb: '118, 185, 0', icon: 'cpu' },
  ];
  const theme = stage.theme || fallbackThemes[index % fallbackThemes.length];
  const IconComponent = getIconComponent(theme.icon);

  // Cálculos de estado
  const subSteps = stage.subSteps || [];
  const totalSubSteps = subSteps.length;
  const completedSubSteps = subSteps.filter(s => s.status === 'success').length;
  const progressPercent = totalSubSteps > 0 ? Math.round((completedSubSteps / totalSubSteps) * 100) : 0;

  const isComplete = stage.status === 'success';
  const isActive = stage.status === 'running';
  const hasError = stage.status === 'error' || stage.status === 'timeout';
  const isNvidiaFast = stage.id === 'NVIDIA_FAST' || mode === 'nvidia-fast';

  // Duração
  const cardDuration = calculateStageDuration(stage);
  const durationLabel = cardDuration > 0 ? formatDuration(cardDuration) : '--';

  return (
    <details
      className={`stage-card ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''} ${hasError ? 'error' : ''} ${isNvidiaFast ? 'nvidia-mode' : ''}`}
      open={defaultOpen}
      style={{
        '--card-color': theme.hex,
        '--card-color-rgb': theme.rgb,
      } as React.CSSProperties}
    >
      <summary className="stage-card-summary">
        {/* Acento superior */}
        <div className="stage-card-accent" />

        {/* Header Row */}
        <div className="stage-card-header">
          <div className="stage-card-icon" style={{ color: theme.hex }}>
            <IconComponent />
          </div>

          <div className="stage-card-info">
            <h3 className="stage-card-title">{stage.name}</h3>
            <p className="stage-card-subtitle">
              {totalSubSteps > 0 ? `${totalSubSteps} tarefa${totalSubSteps > 1 ? 's' : ''}` : stage.description || 'Processamento'}
            </p>
          </div>

          <div className="stage-card-status">
            {isActive ? (
              <span className="status-badge active" style={{ color: theme.hex, borderColor: theme.hex }}>
                EXEC
              </span>
            ) : isComplete ? (
              <span className="status-badge complete">✓</span>
            ) : hasError ? (
              <span className="status-badge error">!</span>
            ) : (
              <span className="status-badge pending">...</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="stage-card-progress">
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{ width: `${isComplete ? 100 : progressPercent}%` }}
            />
          </div>
          <div className="progress-labels">
            <span className="progress-count">
              {completedSubSteps}/{totalSubSteps || 1}
            </span>
            <span className="progress-percent">
              {isComplete ? 100 : progressPercent}%
            </span>
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="stage-card-metadata">
          {stage.tokensConsumed && stage.tokensConsumed.totalTokens > 0 && (
            <span
              className="metadata-badge tokens"
              title={`Prompt: ${stage.tokensConsumed.promptTokens.toLocaleString()} | Completion: ${stage.tokensConsumed.completionTokens.toLocaleString()}`}
            >
              🪙 {stage.tokensConsumed.totalTokens.toLocaleString()}
            </span>
          )}
          {cardDuration > 0 && (
            <span className="metadata-badge duration" title="Tempo decorrido">
              ⏱️ {durationLabel}
            </span>
          )}
          {stage.provider && stage.model && (
            <span className="metadata-badge provider" title="Provider / Model">
              🤖 {stage.provider}/{stage.model}
            </span>
          )}
        </div>

        {/* Glow Pulse (ativo) */}
        {isActive && <div className="stage-card-glow" style={{ borderColor: theme.hex }} />}
      </summary>

      {/* Conteúdo Expandido - SubTasks */}
      <div className={`stage-card-content ${isNvidiaFast && totalSubSteps === 0 ? 'nvidia-content' : ''}`}>
        {totalSubSteps > 0 ? (
          <div className="subtasks-list">
            {subSteps.map((subStep) => (
              <SubTaskItem
                key={subStep.id}
                subStep={subStep}
                themeColor={theme.hex}
              />
            ))}
          </div>
        ) : isNvidiaFast ? (
          <NvidiaFastContent stage={stage} statusLabel={getStatusLabel(stage.status)} durationLabel={durationLabel} />
        ) : (
          <div className="stage-card-empty">
            Nenhuma tarefa listada para esta etapa.
          </div>
        )}

        {/* Thinking Content (Gemini 2.5) */}
        {stage.thinkingContent && (
          <details className="thinking-section">
            <summary className="thinking-summary">
              <span className="thinking-icon">💭</span>
              <span>Ver raciocínio do modelo (Thinking Mode)</span>
            </summary>
            <div className="thinking-content">
              <pre>{stage.thinkingContent}</pre>
            </div>
          </details>
        )}
      </div>
    </details>
  );
};

// ═══════════════════════════════════════════════════════════════
// NVIDIA FAST CONTENT (INLINE)
// ═══════════════════════════════════════════════════════════════

interface NvidiaFastContentProps {
  stage: PipelineStage;
  statusLabel: string;
  durationLabel: string;
}

const NvidiaFastContent: React.FC<NvidiaFastContentProps> = ({ stage, statusLabel, durationLabel }) => (
  <div className="nvidia-fast-panel">
    <div className="nvidia-fast-chips">
      <span className="nvidia-chip primary">Execução GPU</span>
      <span className="nvidia-chip muted">Sem relatório textual</span>
      <span className={`nvidia-chip status ${stage.status}`}>
        {statusLabel}
      </span>
    </div>

    <p className="nvidia-fast-description">
      Otimizador NVIDIA Fast retorna apenas o script refatorado direto da GPU, ideal para respostas rápidas.
    </p>

    <div className="nvidia-fast-grid">
      <div className="nvidia-fast-stat">
        <span className="stat-label">Saída</span>
        <strong className="stat-value">Script otimizado</strong>
      </div>
      <div className="nvidia-fast-stat">
        <span className="stat-label">Relatório</span>
        <strong className="stat-value">Não gera</strong>
      </div>
      <div className="nvidia-fast-stat">
        <span className="stat-label">Tempo</span>
        <strong className="stat-value">
          {stage.status === 'running' && <span className="running-indicator">⏱️</span>}
          {durationLabel}
        </strong>
      </div>
    </div>

    <div className="nvidia-fast-details">
      <div className="nvidia-detail-section">
        <span className="detail-label">Modelos GPU</span>
        <strong className="detail-value">Fila NVIDIA Fast</strong>
        <p className="detail-note">Execução dedicada em GPU; nomes de modelo aparecem conforme retorno do backend.</p>
      </div>
      <div className="nvidia-detail-section">
        <span className="detail-label">Modo de entrega</span>
        <strong className="detail-value">Script refatorado</strong>
        <p className="detail-note">Entrega focada no código final, sem relatório textual para reduzir latência.</p>
      </div>
      <div className="nvidia-detail-section">
        <span className="detail-label">Uso recomendado</span>
        <div className="nvidia-use-cases">
          <span className="nvidia-chip muted">Respostas rápidas</span>
          <span className="nvidia-chip muted">Reexecução frequente</span>
          <span className="nvidia-chip muted">Ajustes pontuais</span>
        </div>
      </div>
    </div>
  </div>
);

export default StageCard;
