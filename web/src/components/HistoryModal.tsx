import React from 'react';
import '../pages/ModalStyles.css';
import { OptimizeMode } from '../types/api';
import { formatDuration } from '../lib/formatTime';

export interface RunHistoryItem {
  id: string;
  mode: OptimizeMode;
  status: "success" | "error";
  finishedAt: string;
  provider?: string;
  duration?: number;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: RunHistoryItem[];
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container history-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">clock</span>
            <h2>Histórico de Execuções</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Fechar histórico">×</button>
        </div>
        <div className="modal-body">
          {history.length === 0 ? (
            <div className="empty-history">
              <p>Nenhuma execução recente encontrada.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Modo</th>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Tempo</th>
                    <th>Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((run, index) => (
                    <tr key={`${run.id}-${index}`}>
                      <td>
                        <span className={`status-badge ${run.status}`}>
                          {run.status === 'success' ? 'Sucesso' : 'Erro'}
                        </span>
                      </td>
                      <td className="mode-cell">
                        <span className={`mode-indicator ${run.mode}`}>
                          {run.mode === 'ultra-expert' ? '⚡ Ultra Expert' :
                            run.mode === 'nvidia-fast' ? '🤖 NVIDIA Fast' : run.mode}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(run.finishedAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="time-cell">
                        {new Date(run.finishedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="duration-cell">
                        {run.duration ? formatDuration(run.duration) : '--'}
                      </td>
                      <td className="provider-cell">
                        {run.provider ? (
                          <span className="provider-tag">{run.provider}</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
