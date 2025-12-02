// web/src/components/ChunkingProgress.tsx
import React from "react";
import "./ChunkingProgress.css";

export interface ChunkProgressData {
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  chunkContext: string;
  startLine: number;
  endLine: number;
  mode?: 'analysis' | 'ultra-expert';
}

export interface ChunkingInfo {
  totalChunks: number;
  chunkSize: number;
  overlapLines: number;
  focusAreas: string[];
  mode?: 'analysis' | 'ultra-expert';
}

interface ChunkingProgressProps {
  chunkingInfo?: ChunkingInfo;
  currentProgress?: ChunkProgressData;
  isActive: boolean;
}

export const ChunkingProgress: React.FC<ChunkingProgressProps> = ({
  chunkingInfo,
  currentProgress,
  isActive
}) => {
  if (!chunkingInfo) {
    return null;
  }

  const percentage = currentProgress?.percentage || 0;
  const modeIcon = chunkingInfo.mode === 'ultra-expert' ? '⚡' : '🔍';
  const modeLabel = chunkingInfo.mode === 'ultra-expert' ? 'Otimização' : 'Análise';

  return (
    <div className={`chunking-progress ${isActive ? 'active' : ''}`}>
      <div className="chunking-header">
        <div className="chunking-title">
          <span className="chunking-icon">{modeIcon}</span>
          <span className="chunking-mode">{modeLabel} por Chunks</span>
        </div>
        <div className="chunking-stats">
          <span className="chunk-count">
            {currentProgress?.currentChunk || 0}/{chunkingInfo.totalChunks} chunks
          </span>
          <span className="chunk-percentage">{percentage}%</span>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        >
          <div className="progress-bar-shine"></div>
        </div>
      </div>

      {/* Informações do chunk atual */}
      {currentProgress && (
        <div className="current-chunk-info">
          <div className="chunk-context">
            <span className="chunk-label">Processando:</span>
            <span className="chunk-text">{currentProgress.chunkContext}</span>
          </div>
          <div className="chunk-lines">
            <span className="chunk-label">Linhas:</span>
            <span className="chunk-range">
              {currentProgress.startLine} - {currentProgress.endLine}
            </span>
          </div>
        </div>
      )}

      {/* Informações de configuração */}
      <div className="chunking-config">
        <div className="config-item">
          <span className="config-label">Tamanho do chunk:</span>
          <span className="config-value">{chunkingInfo.chunkSize} linhas</span>
        </div>
        <div className="config-item">
          <span className="config-label">Overlap:</span>
          <span className="config-value">{chunkingInfo.overlapLines} linhas ({Math.round((chunkingInfo.overlapLines / chunkingInfo.chunkSize) * 100)}%)</span>
        </div>
      </div>

      {/* Áreas de foco */}
      {chunkingInfo.focusAreas.length > 0 && (
        <div className="focus-areas">
          <span className="focus-label">🎯 Foco:</span>
          <div className="focus-tags">
            {chunkingInfo.focusAreas.map((area, idx) => (
              <span key={idx} className="focus-tag">{area}</span>
            ))}
          </div>
        </div>
      )}

      {/* Animação de processamento */}
      {isActive && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <span>Processando chunk {currentProgress?.currentChunk}...</span>
        </div>
      )}
    </div>
  );
};

export default ChunkingProgress;
