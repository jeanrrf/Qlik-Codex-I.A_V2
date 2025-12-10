import React, { useRef, useState } from "react";

import { buildUploadedFileMeta } from "../lib/fileMeta";
import { UploadedFilePayload } from "../types/ui";

interface ScriptCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: UploadedFilePayload) => void;
}

type CaptureTab = "upload" | "manual";

const ScriptCaptureModal: React.FC<ScriptCaptureModalProps> = ({
  open,
  onClose,
  onConfirm
}) => {
  const [tab, setTab] = useState<CaptureTab>("upload");
  const [manualName, setManualName] = useState("script-manual.qvs");
  const [manualContent, setManualContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) {
    return null;
  }

  const closeAndReset = () => {
    setError(null);
    setManualContent("");
    setTab("upload");
    onClose();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text.trim()) {
        setError("Conteúdo vazio ou não reconhecido. Tente outro arquivo ou cole manualmente.");
        return;
      }

      const meta = buildUploadedFileMeta({
        name: file.name,
        sizeBytes: file.size,
        content: text
      });
      onConfirm({ content: text, meta });
      event.target.value = "";
      closeAndReset();
    };
    reader.onerror = () => {
      setError("Falha ao ler o arquivo. Tente novamente.");
    };
    reader.readAsText(file, "utf-8");
  };

  const handleManualConfirm = () => {
    setError(null);
    const trimmed = manualContent.trim();
    if (!trimmed) {
      setError("Cole um script válido antes de salvar.");
      return;
    }

    const encoder = new TextEncoder();
    const sizeBytes = encoder.encode(manualContent).length;
    const safeName = manualName.trim() || "script-manual.qvs";
    const meta = buildUploadedFileMeta({
      name: safeName,
      sizeBytes,
      content: manualContent
    });
    onConfirm({ content: manualContent, meta });
    closeAndReset();
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.warn("Botão Selecionar Arquivo clicado");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-6">
          <div>
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">Entrada de Script</p>
            <h3 className="text-xl font-bold">Carregue ou cole o script Qlik</h3>
            <p className="text-secondary text-sm mt-1">
              O conteúdo fica protegido e não aparece na tela principal.
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={closeAndReset}>
            Fechar
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-glass-border pb-4">
          <button
            type="button"
            className={`btn ${tab === "upload" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("upload")}
            style={{ padding: "8px 16px", fontSize: "0.9rem" }}
          >
            Upload de Arquivo
          </button>
          <button
            type="button"
            className={`btn ${tab === "manual" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("manual")}
            style={{ padding: "8px 16px", fontSize: "0.9rem" }}
          >
            Editor Manual
          </button>
        </div>

        {tab === "upload" ? (
          <div className="flex flex-col items-center justify-center p-10 border border-dashed border-glass-border rounded-lg bg-bg-subtle">
            <p className="text-secondary mb-6 text-center">
              Formatos aceitos: .qvs, .qv, .txt, .script, .qlik ou .qvd (header).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".qvs,.qv,.txt,.script,.qlik,.qvd"
              style={{ display: "none" }}
              onChange={handleFileChange}
              id="file-upload-input"
              aria-label="Selecionar arquivo de script"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleButtonClick}
              style={{
                position: "relative",
                zIndex: 10,
                cursor: "pointer",
                pointerEvents: "auto"
              }}
            >
              Selecionar Arquivo
            </button>
          </div>
        ) : (
          <div className="flex-col">
            <label className="flex-col">
              <span className="text-sm text-secondary">Nome do Arquivo</span>
              <input
                id="manual-file-name"
                name="manualFileName"
                type="text"
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="ex: extracao_vendas.qvs"
                aria-label="Nome do arquivo do script"
              />
            </label>
            <label className="flex-col">
              <span className="text-sm text-secondary">Conteúdo do Script</span>
              <textarea
                id="manual-file-content"
                name="manualFileContent"
                value={manualContent}
                onChange={(event) => setManualContent(event.target.value)}
                placeholder="LOAD * FROM [lib://...];"
                rows={12}
                className="font-mono text-sm"
                aria-label="Conteúdo do script"
              />
            </label>
            <div className="flex justify-end mt-4">
              <button type="button" className="btn btn-primary" onClick={handleManualConfirm}>
                Salvar Script
              </button>
            </div>
          </div>
        )}

        {error && <div className="alert error mt-4">{error}</div>}
      </div>
    </div>
  );
};

export default ScriptCaptureModal;
