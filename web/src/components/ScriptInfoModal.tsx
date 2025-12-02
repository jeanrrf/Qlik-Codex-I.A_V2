// web/src/components/ScriptInfoModal.tsx
import React from "react";
import "./ScriptInfoModal.css";

export interface ScriptInfo {
  lines: number;
  size: number;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  estimatedTokens?: number;
  fileName?: string;
  fileType?: string;
}

interface ScriptInfoModalProps {
  info: ScriptInfo;
  onClose: () => void;
}

const getComplexityConfig = (complexity: string) => {
  switch (complexity) {
    case 'low':
      return {
        label: 'Baixa',
        color: '#00ff88',
        icon: '●',
        description: 'Script simples com estrutura básica'
      };
    case 'medium':
      return {
        label: 'Média',
        color: '#ffaa00',
        icon: '●●',
        description: 'Script com estrutura moderada'
      };
    case 'high':
      return {
        label: 'Alta',
        color: '#ff6600',
        icon: '●●●',
        description: 'Script complexo com múltiplas operações'
      };
    case 'critical':
      return {
        label: 'Crítica',
        color: '#ff0066',
        icon: '●●●●',
        description: 'Script muito complexo - requer atenção'
      };
    default:
      return {
        label: 'Desconhecida',
        color: '#888',
        icon: '●',
        description: 'Complexidade não determinada'
      };
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const ScriptInfoModal: React.FC<ScriptInfoModalProps> = ({ info, onClose }) => {
  const complexityConfig = getComplexityConfig(info.complexity);

  return (
    <div className="script-info-modal-overlay" onClick={onClose}>
      <div className="script-info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        <div className="modal-header-section">
          <div className="modal-icon">📊</div>
          <h2 className="modal-title">Análise do Script</h2>
          <p className="modal-subtitle">Informações detectadas automaticamente</p>
        </div>

        <div className="modal-content-grid">
          {/* Arquivo */}
          {info.fileName && (
            <div className="info-card">
              <div className="info-card-header">
                <span className="info-icon">📄</span>
                <span className="info-label">Arquivo</span>
              </div>
              <div className="info-value">{info.fileName}</div>
              {info.fileType && (
                <div className="info-detail">{info.fileType.toUpperCase()}</div>
              )}
            </div>
          )}

          {/* Linhas */}
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-icon">📏</span>
              <span className="info-label">Linhas</span>
            </div>
            <div className="info-value">{info.lines.toLocaleString()}</div>
            <div className="info-detail">Linhas de código</div>
          </div>

          {/* Tamanho */}
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-icon">💾</span>
              <span className="info-label">Tamanho</span>
            </div>
            <div className="info-value">{formatBytes(info.size)}</div>
            <div className="info-detail">{info.size.toLocaleString()} bytes</div>
          </div>

          {/* Complexidade */}
          <div className="info-card complexity-card">
            <div className="info-card-header">
              <span className="info-icon">🧮</span>
              <span className="info-label">Complexidade</span>
            </div>
            <div className="info-value" style={{ color: complexityConfig.color }}>
              {complexityConfig.label}
            </div>
            <div className="info-detail">{complexityConfig.icon}</div>
            <div className="complexity-bar">
              <div
                className="complexity-fill"
                style={{
                  width: info.complexity === 'low' ? '25%' :
                    info.complexity === 'medium' ? '50%' :
                      info.complexity === 'high' ? '75%' : '100%',
                  backgroundColor: complexityConfig.color
                }}
              />
            </div>
          </div>

          {/* Tokens */}
          {info.estimatedTokens && (
            <div className="info-card">
              <div className="info-card-header">
                <span className="info-icon">🔢</span>
                <span className="info-label">Tokens</span>
              </div>
              <div className="info-value">
                {(info.estimatedTokens / 1000).toFixed(1)}K
              </div>
              <div className="info-detail">
                ~{info.estimatedTokens.toLocaleString()} tokens
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-info">
            <span className="footer-icon">✨</span>
            <span className="footer-text">{complexityConfig.description}</span>
          </div>
          <button className="btn-primary-action" onClick={onClose}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptInfoModal;
