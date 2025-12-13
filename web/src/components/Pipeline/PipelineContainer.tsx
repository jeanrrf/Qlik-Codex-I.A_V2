// web/src/components/Pipeline/PipelineContainer.tsx
import React from 'react';
import type { PipelineProgress, PipelineStage } from '../../types/pipeline';
import type { OptimizeMode } from '../../types/api';
import { StageCard } from './StageCard';
import './Pipeline.css';

// ═══════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════

const Icons = {
  Zap: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Cpu: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface PipelineContainerProps {
  /** Progresso atual do pipeline */
  progress: PipelineProgress;
  /** Modo de otimização */
  mode: OptimizeMode;
  /** Título customizado */
  title?: string;
  /** Informações do modo */
  modeInfo?: {
    title: string;
    icon?: React.ReactNode;
  };
}

// ═══════════════════════════════════════════════════════════════
// MODE INFO DEFAULTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_MODE_INFO: Record<OptimizeMode, { title: string; icon: React.ReactNode }> = {
  'ultra-expert': {
    title: 'Ultra Expert',
    icon: <Icons.Zap />,
  },
  'nvidia-fast': {
    title: 'NVIDIA Fast',
    icon: <Icons.Cpu />,
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export const PipelineContainer: React.FC<PipelineContainerProps> = ({
  progress,
  mode,
  title = '⚡ Pipeline de Otimização',
  modeInfo,
}) => {
  const visibleStages = (progress?.stages || []).filter(
    (stage: PipelineStage) => stage.visible !== false
  );
  const stageCount = visibleStages.length;
  const currentModeInfo = modeInfo || DEFAULT_MODE_INFO[mode];

  return (
    <div className="pipeline-container">
      {/* Header */}
      <div className="pipeline-header">
        <h2 className="pipeline-title">{title}</h2>
        <span className={`pipeline-mode-badge ${mode}`}>
          {currentModeInfo.icon}
          <span>{currentModeInfo.title}</span>
        </span>
      </div>

      {/* Warnings */}
      {progress.warnings && progress.warnings.length > 0 && (
        <div className="pipeline-warnings">
          {progress.warnings.map((warning, i) => (
            <div key={i} className="pipeline-warning-item">
              ⚠️ {warning}
            </div>
          ))}
        </div>
      )}

      {/* Stage Cards Grid */}
      <div className={`pipeline-stages-grid stages-${stageCount}`}>
        {visibleStages.map((stage, index) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={index}
            mode={mode}
            defaultOpen={true}
          />
        ))}
      </div>
    </div>
  );
};

export default PipelineContainer;
