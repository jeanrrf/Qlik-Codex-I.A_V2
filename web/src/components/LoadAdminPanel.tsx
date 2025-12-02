import React from "react";
import { UploadedFileMeta } from "../types/ui";

interface LoadAdminPanelProps {
  meta: UploadedFileMeta | null;
  scriptLineCount: number;
}

const LoadAdminPanel: React.FC<LoadAdminPanelProps> = ({ meta, scriptLineCount }) => {
  if (!meta) {
    // Se não tem meta (arquivo), mas tem script (colado manualmente)
    if (scriptLineCount > 0) {
      return (
        <div className="load-admin-panel">
          <div className="admin-header">
            <h3>📋 Administração de Carga</h3>
            <span className="badge manual">Input Manual</span>
          </div>
          <div className="admin-stats">
            <div className="stat-item">
              <span className="stat-label">Linhas Estimadas</span>
              <span className="stat-value">{scriptLineCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Origem</span>
              <span className="stat-value">Editor de Texto</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="load-admin-panel">
      <div className="admin-header">
        <h3>📋 Administração de Carga</h3>
        <span className="badge file">Arquivo Carregado</span>
      </div>

      <div className="admin-grid">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-info">
            <span className="stat-label">Arquivo</span>
            <span className="stat-value" title={meta.name}>{meta.name}</span>
            <span className="stat-sub">{meta.extension || "Desconhecido"}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-info">
            <span className="stat-label">Tamanho</span>
            <span className="stat-value">{meta.formattedSize}</span>
            <span className="stat-sub">{meta.sizeBytes.toLocaleString()} bytes</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-label">
              {meta.extension === "qvd" ? "Registros (QVD)" : "Linhas"}
            </span>
            <span className="stat-value">
              {meta.extension === "qvd" ? meta.qvdRecords?.toLocaleString() ?? "N/A" : meta.lineCount?.toLocaleString() ?? scriptLineCount}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <span className="stat-label">Carregado em</span>
            <span className="stat-value">{new Date(meta.loadedAt).toLocaleTimeString()}</span>
            <span className="stat-sub">{new Date(meta.loadedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {meta.warnings.length > 0 && (
        <div className="admin-warnings">
          <h4>⚠️ Avisos de Leitura</h4>
          <ul>
            {meta.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <style>{`
        .load-admin-panel {
            background: rgba(15, 20, 35, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            backdrop-filter: blur(10px);
        }
        
        .admin-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .admin-header h3 {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-main);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .badge {
            font-size: 0.75rem;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .badge.manual {
            background: rgba(255, 184, 0, 0.15);
            color: #ffb800;
            border: 1px solid rgba(255, 184, 0, 0.3);
        }

        .badge.file {
            background: rgba(0, 242, 255, 0.15);
            color: #00f2ff;
            border: 1px solid rgba(0, 242, 255, 0.3);
        }

        .admin-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: transform 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.05);
        }

        .stat-icon {
            font-size: 1.5rem;
            opacity: 0.8;
        }

        .stat-info {
            display: flex;
            flex-direction: column;
        }

        .stat-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .stat-value {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 150px;
        }

        .stat-sub {
            font-size: 0.7rem;
            color: var(--text-secondary);
            opacity: 0.7;
        }

        .admin-stats {
            display: flex;
            gap: 24px;
        }

        .admin-warnings {
            margin-top: 16px;
            background: rgba(255, 42, 109, 0.1);
            border: 1px solid rgba(255, 42, 109, 0.3);
            border-radius: 8px;
            padding: 12px;
        }

        .admin-warnings h4 {
            color: #ff2a6d;
            font-size: 0.9rem;
            margin: 0 0 8px 0;
        }

        .admin-warnings ul {
            margin: 0;
            padding-left: 20px;
            color: var(--text-main);
            font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};

export default LoadAdminPanel;
