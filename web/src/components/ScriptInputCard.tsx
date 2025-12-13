import React from 'react';
import { Icons } from './Icons';
import { UploadedFileMeta } from '../types/ui';

interface ScriptInputCardProps {
  script: string;
  uploadMeta: UploadedFileMeta | null;
  onCaptureOpen: () => void;
  exceedsLineLimit: boolean;
  scriptLineCount: number;
  FREE_TIER_LINE_LIMIT: number;
}

export const ScriptInputCard: React.FC<ScriptInputCardProps> = ({
  script,
  uploadMeta,
  onCaptureOpen,
  exceedsLineLimit,
  scriptLineCount,
  FREE_TIER_LINE_LIMIT
}) => {
  return (
    <div className="ctrl-card script-card">
      <div className="ctrl-header">
        <Icons.File />
        <span>Script</span>
        <button className="ctrl-btn" onClick={onCaptureOpen} aria-label="Abrir modal de upload de script">
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
                <span className="admin-value">{uploadMeta?.sizeBytes ? `${(uploadMeta.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}</span>
                <span className="admin-sub">{uploadMeta?.sizeBytes ? `${uploadMeta.sizeBytes.toLocaleString()} bytes` : ''}</span>
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
  );
};
