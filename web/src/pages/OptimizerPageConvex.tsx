/**
 * OptimizerPageConvex - Página simplificada que usa Convex
 * Versão alternativa para deploy sem backend Express
 */
import React, { useState } from "react";
import { useConvexOptimization } from "../hooks/useConvexOptimization";
import { useAuth } from "../contexts/AuthContext";
import { UserMenu } from "../components/UserMenu";
import { highlightQlikCode } from "../lib/qlikSyntaxHighlighter";
import "./OptimizerPageConvex.css";

interface Props {
  onBackToLanding: () => void;
}

export default function OptimizerPageConvex({ onBackToLanding }: Props) {
  const [script, setScript] = useState("");
  const [activeTab, setActiveTab] = useState<"original" | "optimized">("original");
  const { user } = useAuth();
  const { startOptimization, progress, isOptimizing, error, reset, result } = useConvexOptimization();

  const handleOptimize = async () => {
    if (!script.trim()) return;
    await startOptimization(script, "ultra-expert");
  };

  const handleReset = () => {
    setScript("");
    reset();
    setActiveTab("original");
  };

  const lineCount = script.split(/\r?\n/).length;

  return (
    <div className="optimizer-page">
      {/* Background Effects */}
      <div className="opt-bg">
        <div className="bg-gradient" />
        <div className="bg-grid" />
      </div>

      {/* Header */}
      <header className="optimizer-header">
        <div className="header-left">
          <button className="back-button" onClick={onBackToLanding}>
            ← Voltar
          </button>
          <h1 className="logo-title">
            <span className="logo-icon">⚡</span>
            AINEX Optimizer
          </h1>
        </div>
        <div className="header-right">
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="optimizer-main">
        {/* Script Input */}
        <section className="input-section glass-card">
          <div className="section-header">
            <h2>📝 Script Qlik</h2>
            <span className="line-count">{lineCount} linhas</span>
          </div>
          <textarea
            className="script-input"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Cole seu script Qlik aqui..."
            disabled={isOptimizing}
          />
          <div className="input-actions">
            <button
              className="btn-primary"
              onClick={handleOptimize}
              disabled={!script.trim() || isOptimizing}
            >
              {isOptimizing ? "⏳ Otimizando..." : "🚀 Otimizar Script"}
            </button>
            <button className="btn-secondary" onClick={handleReset} disabled={isOptimizing}>
              🔄 Limpar
            </button>
          </div>
        </section>

        {/* Progress */}
        {isOptimizing && (
          <section className="progress-section glass-card">
            <h2>⚙️ Progresso</h2>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="progress-message">{progress.message}</p>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="error-section glass-card">
            <h2>❌ Erro</h2>
            <p>{error}</p>
          </section>
        )}

        {/* Result */}
        {result && (
          <section className="result-section glass-card">
            <div className="section-header">
              <h2>✅ Resultado</h2>
              <div className="tab-buttons">
                <button
                  className={`tab-btn ${activeTab === "original" ? "active" : ""}`}
                  onClick={() => setActiveTab("original")}
                >
                  Original
                </button>
                <button
                  className={`tab-btn ${activeTab === "optimized" ? "active" : ""}`}
                  onClick={() => setActiveTab("optimized")}
                >
                  Otimizado
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="result-metrics">
              <div className="metric">
                <span className="metric-label">Linhas Originais</span>
                <span className="metric-value">{result.originalScript.split("\n").length}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Linhas Otimizadas</span>
                <span className="metric-value">{result.optimizedScript.split("\n").length}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Tempo Total</span>
                <span className="metric-value">{Math.round(result.metrics.totalTime / 1000)}s</span>
              </div>
            </div>

            {/* Script View */}
            <div className="script-view">
              <pre
                className="code-block"
                dangerouslySetInnerHTML={{
                  __html: highlightQlikCode(
                    activeTab === "original" ? result.originalScript : result.optimizedScript
                  ),
                }}
              />
            </div>

            {/* Analysis */}
            {result.analysis && (
              <div className="analysis-section">
                <h3>📊 Análise</h3>
                <p><strong>Complexidade:</strong> {result.analysis.complexity}</p>
                <p><strong>Score Estrutural:</strong> {result.analysis.structuralScore}/100</p>
                {result.analysis.bottlenecks?.length > 0 && (
                  <div>
                    <strong>Gargalos Encontrados:</strong>
                    <ul>
                      {result.analysis.bottlenecks.map((b: any, i: number) => (
                        <li key={i}>
                          [{b.severity}] {b.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Download Button */}
            <div className="result-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  const blob = new Blob([result.optimizedScript], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "script_optimized.qvs";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                📥 Download Script Otimizado
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="optimizer-footer">
        <p>AINEX Optimizer • Powered by Gemini AI • Convex Backend</p>
      </footer>
    </div>
  );
}
