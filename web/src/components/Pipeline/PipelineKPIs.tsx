// web/src/components/Pipeline/PipelineKPIs.tsx
import React from 'react';
import type { PipelineProgress, PipelineStage } from '../../types/pipeline';
import type { OptimizeResult } from '../../types/api';
import { formatDuration } from '../../lib/formatTime';
import './Pipeline.css';

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface PipelineKPIsProps {
  /** Progresso do pipeline */
  progress: PipelineProgress;
  /** Resultado da otimização (opcional) */
  result?: OptimizeResult | null;
  /** Mostrar nota do AINEX */
  showAinexNote?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export const PipelineKPIs: React.FC<PipelineKPIsProps> = ({
  progress,
  result,
  showAinexNote = true,
}) => {
  const visibleStages = (progress?.stages || []).filter(
    (stage: PipelineStage) => stage.visible !== false
  );
  const completedStages = visibleStages.filter(s => s.status === 'success').length;
  const totalStages = visibleStages.length;

  // Só mostra se tiver sucesso ou resultado
  if (progress.status !== 'success' && !result) {
    return null;
  }

  return (
    <div className="pipeline-kpis-container">
      {/* KPIs Grid */}
      <div className="pipeline-kpis">
        <div className="kpi-item">
          <span className="kpi-icon">⏱️</span>
          <span className="kpi-label">Tempo Total</span>
          <span className="kpi-value">{formatDuration(progress.elapsedTime)}</span>
        </div>

        <div className="kpi-item">
          <span className="kpi-icon">📊</span>
          <span className="kpi-label">Etapas</span>
          <span className="kpi-value">
            {completedStages}/{totalStages}
          </span>
        </div>

        {result && (
          <div className="kpi-item">
            <span className="kpi-icon">🔧</span>
            <span className="kpi-label">Mudanças</span>
            <span className="kpi-value">
              {result.analysis?.changes?.length || 0}
            </span>
          </div>
        )}

        {result?.analysis?.breakingRisk && (
          <div className="kpi-item">
            <span className="kpi-icon">⚠️</span>
            <span className="kpi-label">Risco</span>
            <span className={`kpi-value risk-${result.analysis.breakingRisk}`}>
              {result.analysis.breakingRisk.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* AINEX Note */}
      {showAinexNote && (
        <div className="ainex-note">
          <span className="ainex-badge">AINEX ENGINE</span>
          <span className="ainex-text">
            Modelo treinado em milhares de scripts Qlik de produção para entregar recomendações em nível PRO.
          </span>
        </div>
      )}
    </div>
  );
};

export default PipelineKPIs;
