import React, { useState, useRef } from "react";

import { requestQlikFormatterStream } from "../lib/apiClient";
import { formatQlikScript } from "../lib/qlikFormatter";

type FormatterSource = "ainex" | "fallback";

interface FormatterMeta {
  source: FormatterSource;
  providerLabel: string;
  model?: string;
}

interface FormatterAction {
  id: string;
  description: string;
  category?: string;
  applied?: boolean;
  risk?: string;
}

interface QlikFormatterToolProps {
  isOpen: boolean;
  onClose: () => void;
}

const QlikFormatterTool: React.FC<QlikFormatterToolProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [styleNotes, setStyleNotes] = useState<string[]>([]);
  const [resultMeta, setResultMeta] = useState<FormatterMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [actions, setActions] = useState<FormatterAction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const beforeScrollRef = useRef<HTMLTextAreaElement>(null);
  const afterScrollRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = async () => {
    if (!input.trim()) {
      setError("Cole um script Qlik real para aplicar o formatter.");
      return;
    }

    setLoading(true);
    setError(null);
    setStyleNotes([]);
    setResultMeta(null);
    setProgress(0);
    setProgressMessage(null);
    setActions(null);
    setShowResults(false);

    try {
      const response = await requestQlikFormatterStream({ script: input }, (percent: number, message?: string) => {
        setProgress(Math.max(0, Math.min(100, Math.round(percent))));
        setProgressMessage(message ?? null);
      });
      setOutput(response.formattedScript);
      setStyleNotes(response.styleNotes ?? []);
      setResultMeta({
        source: response.provider === "fallback" ? "fallback" : "ainex",
        providerLabel:
          response.provider === "fallback"
            ? "Formatter local (fallback)"
            : "AINEX Super Formatter",
        model: response.model
      });
      setShowResults(true);
      setActions(response.actions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao acionar a AINEX.";
      const fallbackScript = formatQlikScript(input);
      setOutput(fallbackScript);
      setStyleNotes([
        "Formatter local aplicado porque a requisição à IA falhou."
      ]);
      setResultMeta({
        source: "fallback",
        providerLabel: "Formatter local (fallback)"
      });
      setShowResults(true);
      setError(`${message} • Aplicamos o formatter local de segurança.`);
    } finally {
      setLoading(false);
      setProgress(100);
      setProgressMessage(null);
    }
  };

  const handleCopy = async () => {
    if (!output) {
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      // ignoring clipboard failure keeps UX simple
    }
  };

  const handleSyncScroll = (source: 'before' | 'after') => {
    if (source === 'before' && beforeScrollRef.current && afterScrollRef.current) {
      afterScrollRef.current.scrollTop = beforeScrollRef.current.scrollTop;
    } else if (source === 'after' && afterScrollRef.current && beforeScrollRef.current) {
      beforeScrollRef.current.scrollTop = afterScrollRef.current.scrollTop;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="formatter-modal-backdrop" onClick={onClose}>
      <div className="formatter-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="formatter-modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h3 className="modal-title">Formatador de Script Qlik</h3>
              {showResults ? (
                <p className="modal-subtitle">
                  <span className="modal-subtitle-highlight">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Formatado com sucesso pela <strong>AINEX</strong>
                  </span>
                </p>
              ) : (
                <p className="modal-subtitle">Cole seu script para formatação automática</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div className="formatter-modal-body">
          {!showResults ? (
            /* INPUT: Cole o código aqui */
            <div className="formatter-input-section">
              <div className="modal-editor-header">
                <span className="editor-label">Cole seu script Qlik aqui</span>
                <div className="editor-stats">
                  <span>{input.split('\n').length} linhas</span>
                  <span>•</span>
                  <span>{input.length} caracteres</span>
                </div>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="modal-textarea modal-textarea-input"
                placeholder="Cole seu script Qlik aqui...

Exemplo:
LOAD * FROM [lib://Dados/vendas.qvd] (qvd);

IF vAno = 2024 THEN
  LOAD * RESIDENT TabelaTemp;
END IF;"
                spellCheck={false}
              />
              <div className="formatter-input-footer">
                <div className="editor-info">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  Suporta LOAD, JOIN, IF, FOR, SQL e todas as funções Qlik
                </div>
                <button
                  type="button"
                  className="btn-format"
                  onClick={handleFormat}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <>
                      <div className="spinner" />
                      Formatando...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                        <polyline points="7.5 19.79 7.5 14.6 3 12" />
                        <polyline points="21 12 16.5 14.6 16.5 19.79" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      Formatar com IA
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* RESULTS: Diff side-by-side */
            <>
              <div className="result-actions-bar">
                <button
                  type="button"
                  className="btn-back-to-input"
                  onClick={() => setShowResults(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn-copy-result"
                  onClick={handleCopy}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar Código Formatado
                </button>
              </div>

              <div className="diff-view-container">
                <div className="diff-panel-before">
                  <div className="diff-panel-header">
                    <span className="diff-label">Antes</span>
                    <span className="diff-lines">{input.split('\n').length} linhas</span>
                  </div>
                  <textarea
                    ref={beforeScrollRef}
                    readOnly
                    className="modal-textarea"
                    value={input}
                    spellCheck={false}
                    onScroll={() => handleSyncScroll('before')}
                  />
                </div>

                <div className="diff-panel-after">
                  <div className="diff-panel-header">
                    <span className="diff-label">Depois</span>
                    <span className="diff-lines">{output.split('\n').length} linhas</span>
                  </div>
                  <textarea
                    ref={afterScrollRef}
                    readOnly
                    className="modal-textarea"
                    value={output}
                    spellCheck={false}
                    onScroll={() => handleSyncScroll('after')}
                  />
                </div>
              </div>

              {styleNotes.length > 0 && (
                <div className="style-notes-card">
                  <div className="notes-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <h4>Mudanças aplicadas pela AINEX</h4>
                  </div>
                  <ul className="notes-list">
                    {styleNotes.map((note, index) => (
                      <li key={`note-${index}`} className="note-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="formatter-modal-footer">
          {error && (
            <div className="formatter-alert formatter-alert-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {error}
            </div>
          )}
          {showResults && (
            <button
              type="button"
              className="btn-modal-primary"
              onClick={handleCopy}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar Código
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QlikFormatterTool;
