// web/src/components/ScriptAnalysisInfo.tsx
import React from "react";
import "./ScriptAnalysisInfo.css";

export interface ScriptAnalysisData {
  fileType: 'qvd' | 'qvs' | 'txt' | 'unknown';
  size: 'small' | 'medium' | 'large' | 'xlarge';
  complexity: 'low' | 'medium' | 'high' | 'critical';
  lines: number;
  estimatedTokens: number;
  qvdOperations?: {
    reads: number;
    writes: number;
  } | null;
  strategy: 'full' | 'optimized';
}

interface ScriptAnalysisInfoProps {
  analysis: ScriptAnalysisData;
}

const getSizeLabel = (size: string) => {
  switch (size) {
    case 'small': return { label: 'Pequeno', color: '#00ff88' };
    case 'medium': return { label: 'Médio', color: '#ffaa00' };
    case 'large': return { label: 'Grande', color: '#ff6600' };
    case 'xlarge': return { label: 'Muito Grande', color: '#ff0066' };
    default: return { label: size, color: '#888' };
  }
};

const getComplexityLabel = (complexity: string) => {
  switch (complexity) {
    case 'low': return { label: 'Baixa', color: '#00ff88', icon: '●' };
    case 'medium': return { label: 'Média', color: '#ffaa00', icon: '●●' };
    case 'high': return { label: 'Alta', color: '#ff6600', icon: '●●●' };
    case 'critical': return { label: 'Crítica', color: '#ff0066', icon: '●●●●' };
    default: return { label: complexity, color: '#888', icon: '●' };
  }
};

const getStrategyLabel = (strategy: string) => {
  switch (strategy) {
    case 'full': return { label: 'Análise Completa', icon: '📋', color: '#00ffff' };
    case 'optimized': return { label: 'Otimizada', icon: '⚡', color: '#ffaa00' };
    default: return { label: strategy, icon: '❓', color: '#888' };
  }
};

export const ScriptAnalysisInfo: React.FC<ScriptAnalysisInfoProps> = ({
  analysis
}) => {
  const sizeInfo = getSizeLabel(analysis.size);
  const complexityInfo = getComplexityLabel(analysis.complexity);
  const strategyInfo = getStrategyLabel(analysis.strategy);

  return (
    <div className="script-analysis-info">
      <div className="analysis-header">
        <div className="analysis-title">
          <span className="analysis-icon">📊</span>
          <span>Análise do Script</span>
        </div>
        <div className="file-type-badge" data-type={analysis.fileType}>
          {analysis.fileType.toUpperCase()}
        </div>
      </div>

      <div className="analysis-grid">
        {/* Tamanho */}
        <div className="analysis-card">
          <div className="card-header">
            <span className="card-icon">📏</span>
            <span className="card-title">Tamanho</span>
          </div>
          <div className="card-content">
            <div className="metric-value" style={{ color: sizeInfo.color }}>
              {sizeInfo.label}
            </div>
            <div className="metric-detail">
              {analysis.lines.toLocaleString()} linhas
            </div>
          </div>
        </div>

        {/* Complexidade */}
        <div className="analysis-card">
          <div className="card-header">
            <span className="card-icon">🧮</span>
            <span className="card-title">Complexidade</span>
          </div>
          <div className="card-content">
            <div className="metric-value" style={{ color: complexityInfo.color }}>
              {complexityInfo.label}
            </div>
            <div className="metric-detail">
              {complexityInfo.icon}
            </div>
          </div>
        </div>

        {/* Tokens */}
        <div className="analysis-card">
          <div className="card-header">
            <span className="card-icon">🔢</span>
            <span className="card-title">Tokens Estimados</span>
          </div>
          <div className="card-content">
            <div className="metric-value">
              {(analysis.estimatedTokens / 1000).toFixed(1)}K
            </div>
            <div className="metric-detail">
              ~{analysis.estimatedTokens.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Estratégia */}
        <div className="analysis-card strategy-card">
          <div className="card-header">
            <span className="card-icon">{strategyInfo.icon}</span>
            <span className="card-title">Estratégia</span>
          </div>
          <div className="card-content">
            <div className="metric-value" style={{ color: strategyInfo.color }}>
              {strategyInfo.label}
            </div>
          </div>
        </div>
      </div>

      {/* QVD Operations */}
      {analysis.qvdOperations && (
        <div className="qvd-operations">
          <div className="qvd-header">
            <span className="qvd-icon">📦</span>
            <span className="qvd-title">Operações QVD</span>
          </div>
          <div className="qvd-stats">
            <div className="qvd-stat">
              <span className="qvd-stat-label">Leituras:</span>
              <span className="qvd-stat-value">{analysis.qvdOperations.reads}</span>
            </div>
            <div className="qvd-stat">
              <span className="qvd-stat-label">Gravações:</span>
              <span className="qvd-stat-value">{analysis.qvdOperations.writes}</span>
            </div>
            <div className="qvd-stat">
              <span className="qvd-stat-label">Total:</span>
              <span className="qvd-stat-value highlight">
                {analysis.qvdOperations.reads + analysis.qvdOperations.writes}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptAnalysisInfo;
