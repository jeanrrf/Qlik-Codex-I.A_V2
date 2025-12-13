import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { OptimizeResult } from '../types/api';
import { copyToClipboard } from '../lib/clipboard';
import { highlightQlikCode } from '../lib/qlikSyntaxHighlighter';
import OptimizationFeedback from './OptimizationFeedback';

interface ResultViewerModalProps {
  result: OptimizeResult;
  onClose: () => void;
  onDownload: () => void;
}

const highlightQlikSyntax = (line: string): string => {
  return highlightQlikCode(line);
};

export const ResultViewerModal: React.FC<ResultViewerModalProps> = ({ result, onClose, onDownload }) => {
  const [isScrollLocked, setIsScrollLocked] = useState(true);
  const [copyState, setCopyState] = useState<{ original: string; optimized: string }>(
    { original: "📋 Copiar", optimized: "📋 Copiar" }
  );

  const originalScrollRef = useRef<HTMLDivElement | null>(null);
  const optimizedScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScrollRef = useRef(false);

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
    <div className="modal-overlay" onClick={onClose}>
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
            <button className="action-btn secondary small" onClick={onDownload}>
              <Icons.Download /> Baixar ZIP
            </button>
            <button className="close-btn" onClick={onClose} aria-label="Fechar modal de resultado">×</button>
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
                      aria-label="Copiar código original"
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
                  {/* Tabelas de código são somente leitura, regra de label não se aplica */}
                  {/* eslint-disable jsx-a11y/control-has-associated-label */}
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
                    aria-label="Copiar código otimizado"
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
                {/* eslint-enable jsx-a11y/control-has-associated-label */}
              </div>
            </div>
          </div>

          {/* RAG Feedback Component */}
          {result.optimizationId && (
            <OptimizationFeedback
              optimizationId={result.optimizationId}
            />
          )}

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
};
