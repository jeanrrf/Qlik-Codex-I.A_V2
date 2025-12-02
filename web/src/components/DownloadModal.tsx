import React, { useEffect, useState, useCallback } from "react";
import { OptimizeResult } from "../types/api";
import { downloadResultBundle } from "../lib/downloadBundle";

interface DownloadModalProps {
  open: boolean;
  onClose: () => void;
  result: OptimizeResult | null;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ open, onClose, result }) => {
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    if (!result) return;

    try {
      setStatus("generating");
      // Small delay to show the animation/modal
      await new Promise(resolve => setTimeout(resolve, 800));

      await downloadResultBundle(result);

      setStatus("success");
      // Auto close after success
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 1500);

    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro ao gerar ZIP");
    }
  }, [result, onClose]);

  useEffect(() => {
    if (open && result && status === "idle") {
      handleDownload();
    }
  }, [open, result, status, handleDownload]);

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel" style={{ padding: "40px", width: "400px", textAlign: "center" }}>
        {status === "generating" && (
          <div className="flex-col items-center gap-4">
            <div className="animate-pulse" style={{
              width: "60px", height: "60px", borderRadius: "50%",
              border: "4px solid var(--primary)", borderTopColor: "transparent",
              animation: "spin 1s linear infinite"
            }} />
            <h3 className="text-xl font-bold">Gerando Pacote...</h3>
            <p className="text-secondary">Compactando scripts e documentação.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex-col items-center gap-4">
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: "rgba(0, 255, 157, 0.2)", color: "var(--success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem"
            }}>✓</div>
            <h3 className="text-xl font-bold text-success">Download Iniciado!</h3>
            <p className="text-secondary">O modal fechará em instantes.</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex-col items-center gap-4">
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: "rgba(255, 42, 109, 0.2)", color: "var(--danger)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem"
            }}>✕</div>
            <h3 className="text-xl font-bold text-danger">Erro</h3>
            <p className="text-secondary">{errorMessage}</p>
            <button className="btn btn-glass mt-4" onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DownloadModal;
