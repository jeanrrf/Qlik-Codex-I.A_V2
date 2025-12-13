// web/src/components/Pipeline/SubTaskItem.tsx
import React from 'react';
import type { SubStepExecution } from '../../types/api';
import { formatDuration } from '../../lib/formatTime';
import './Pipeline.css';

// ═══════════════════════════════════════════════════════════════
// ICONS SVG INLINE
// ═══════════════════════════════════════════════════════════════

const Spinner: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg
    className="subtask-spinner"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
  >
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ClockIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface SubTaskItemProps {
  /** Dados da sub-tarefa */
  subStep: SubStepExecution;
  /** Cor do tema (hex) */
  themeColor?: string;
  /** Threshold para warning de timeout (ms) */
  timeoutWarningThreshold?: number;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export const SubTaskItem: React.FC<SubTaskItemProps> = ({
  subStep,
  themeColor = '#00f2ff',
  timeoutWarningThreshold = 150000, // 2.5 min
}) => {
  const isRunning = subStep.status === 'running';
  const isSuccess = subStep.status === 'success';
  const isError = subStep.status === 'error' || subStep.status === 'timeout';
  const runningTime = isRunning && subStep.currentRunningTime ? subStep.currentRunningTime : 0;
  const isNearTimeout = runningTime > timeoutWarningThreshold;

  return (
    <div
      className={`subtask-item ${subStep.status} ${isNearTimeout ? 'warning-timeout' : ''}`}
      style={{ '--subtask-color': themeColor } as React.CSSProperties}
    >
      {/* Indicador de Status */}
      <div className="subtask-indicator">
        {isRunning ? (
          <Spinner size={12} />
        ) : isSuccess ? (
          <CheckIcon />
        ) : isError ? (
          <XIcon />
        ) : (
          <div className="subtask-dot" />
        )}
      </div>

      {/* Nome da Tarefa */}
      <span className="subtask-name" title={subStep.description}>
        {subStep.name}
      </span>

      {/* Tempo em Execução (running) */}
      {isRunning && runningTime > 0 && (
        <span className={`subtask-running-time ${isNearTimeout ? 'warning' : ''}`}>
          <ClockIcon />
          {formatDuration(runningTime)}
        </span>
      )}

      {/* Duração Final (success) */}
      {isSuccess && subStep.duration && (
        <span className="subtask-duration">
          {formatDuration(subStep.duration)}
        </span>
      )}

      {/* Erro (error/timeout) */}
      {isError && subStep.error && (
        <span className="subtask-error" title={subStep.error}>
          ⚠️
        </span>
      )}
    </div>
  );
};

export default SubTaskItem;
