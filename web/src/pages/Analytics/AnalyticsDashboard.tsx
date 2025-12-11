/**
 * Analytics Dashboard - Monitoramento Enterprise
 * Dashboard completo de visualização de eventos e acessos
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { apiClient } from '../../api/client';
import './AnalyticsDashboard.css';

interface AnalyticsSummary {
  totalVisits: number;
  totalEvents: number;
  totalSessions: number;
  totalOptimizations: number;
  uniqueUsers: number;
  ownerVisits: number;
  ownerEvents: number;
  topPages: Array<{ page: string; count: number }>;
  topEvents: Array<{ eventType: string; count: number }>;
  recentActivity: Array<{
    type: 'pageview' | 'event' | 'session';
    timestamp: string;
    details: string;
    isOwner: boolean;
  }>;
}

interface RealtimeEvent {
  type: 'event' | 'pageview';
  data: Record<string, unknown>;
  page?: string;
}

export default function AnalyticsDashboard() {
  const { isOwner, accessToken } = useAuth();
  const { navigateBack } = useNavigation();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'realtime' | 'detailed'>('summary');

  // Carregar summary
  useEffect(() => {
    if (!isOwner()) {
      setError('Acesso negado. Apenas o proprietário pode visualizar analytics.');
      setLoading(false);
      return;
    }

    loadSummary();
    const interval = setInterval(loadSummary, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, [isOwner]);

  // Realtime SSE
  useEffect(() => {
    if (!isOwner() || activeTab !== 'realtime' || !realtimeEnabled) return;

    const url = accessToken
      ? `/api/analytics/realtime?token=${accessToken}`
      : '/api/analytics/realtime';

    const eventSource = new EventSource(url, {
      withCredentials: true
    });

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event' || data.type === 'pageview') {
          if (data.type === 'pageview' && data.page === '/') return; // ignora root
          setRealtimeEvents((prev) => [data, ...prev].slice(0, 20));
        }
      } catch (err) {
        console.error('Erro ao processar evento SSE', err);
      }
    };

    eventSource.onerror = () => {
      console.error('Erro na conexão SSE');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isOwner, activeTab, realtimeEnabled]);

  async function loadSummary() {
    try {
      const data = await apiClient.get<AnalyticsSummary>('/api/analytics/summary');
      setSummary(data);
      setLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar analytics';
      setError(message);
      setLoading(false);
    }
  }

  async function handleCleanup() {
    if (!confirm('Deseja limpar dados de analytics com mais de 90 dias?')) {
      return;
    }

    try {
      await apiClient.delete('/api/analytics/cleanup?days=90');
      alert('Limpeza concluída com sucesso');
      loadSummary();
    } catch {
      alert('Erro ao limpar dados');
    }
  }

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-error">
          <h3>Erro ao carregar analytics</h3>
          <p>{error}</p>
          <div className="analytics-error-actions">
            <button type="button" onClick={() => navigateBack('landing')}>
              Voltar para a página inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="analytics-topbar">
          <button className="analytics-back" onClick={() => navigateBack('optimizer')}>
            <span className="back-icon">←</span>
            <span>Voltar</span>
          </button>

          <div className="analytics-tabs">
            <button
              className={activeTab === 'summary' ? 'active' : ''}
              onClick={() => setActiveTab('summary')}
            >
              📈 Resumo
            </button>
            <button
              className={activeTab === 'realtime' ? 'active' : ''}
              onClick={() => setActiveTab('realtime')}
            >
              🔴 Tempo Real
            </button>
            <button
              className={activeTab === 'detailed' ? 'active' : ''}
              onClick={() => setActiveTab('detailed')}
            >
              📋 Detalhado
            </button>
          </div>
        </div>

        <div className="analytics-hero">
          <div>
            <p className="eyebrow">Monitoramento em tempo real</p>
            <h1>Analytics Dashboard</h1>
            <p className="analytics-subtitle">
              Sistema de acompanhamento de acessos, eventos e otimizações
            </p>
          </div>
          <div className="badge-pill">Enterprise</div>
        </div>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="analytics-content">
          {/* KPIs Principais */}
          <div className="analytics-kpis">
            <div className="kpi-card">
              <div className="kpi-icon">👁️</div>
              <div className="kpi-value">{(summary.totalVisits ?? 0).toLocaleString()}</div>
              <div className="kpi-label">Total de Visitas</div>
              <div className="kpi-owner">Owner: {summary.ownerVisits ?? 0}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">⚡</div>
              <div className="kpi-value">{(summary.totalEvents ?? 0).toLocaleString()}</div>
              <div className="kpi-label">Total de Eventos</div>
              <div className="kpi-owner">Owner: {summary.ownerEvents ?? 0}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">🔗</div>
              <div className="kpi-value">{(summary.totalSessions ?? 0).toLocaleString()}</div>
              <div className="kpi-label">Sessões</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">🤖</div>
              <div className="kpi-value">{(summary.totalOptimizations ?? 0).toLocaleString()}</div>
              <div className="kpi-label">Otimizações IA</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">👥</div>
              <div className="kpi-value">{(summary.uniqueUsers ?? 0).toLocaleString()}</div>
              <div className="kpi-label">Usuários Únicos</div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="analytics-section">
            <h3>🔝 Páginas Mais Visitadas</h3>
            <div className="analytics-list">
              {(summary.topPages ?? []).map((page, index) => (
                <div key={index} className="list-item">
                  <span className="item-rank">#{index + 1}</span>
                  <span className="item-label">{page.page}</span>
                  <span className="item-value">{page.count} visitas</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Events */}
          <div className="analytics-section">
            <h3>⚡ Eventos Mais Frequentes</h3>
            <div className="analytics-list">
              {(summary.topEvents ?? []).map((event, index) => (
                <div key={index} className="list-item">
                  <span className="item-rank">#{index + 1}</span>
                  <span className="item-label">{event.eventType}</span>
                  <span className="item-value">{event.count} eventos</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="analytics-section">
            <h3>🕒 Atividade Recente</h3>
            <div className="analytics-timeline">
              {(summary.recentActivity ?? []).map((activity, index) => (
                <div
                  key={index}
                  className={`timeline-item ${activity.isOwner ? 'owner' : ''}`}
                >
                  <div className="timeline-icon">
                    {activity.type === 'pageview' && '👁️'}
                    {activity.type === 'event' && '⚡'}
                    {activity.type === 'session' && '🔗'}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-type">{activity.type}</div>
                    <div className="timeline-details">{activity.details}</div>
                    <div className="timeline-time">
                      {new Date(activity.timestamp).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  {activity.isOwner && <div className="owner-badge">👑 OWNER</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="analytics-actions">
            <button onClick={loadSummary} className="btn-refresh">
              🔄 Atualizar
            </button>
            <button onClick={handleCleanup} className="btn-cleanup">
              🗑️ Limpar Dados Antigos
            </button>
          </div>
        </div>
      )}

      {/* Realtime Tab */}
      {activeTab === 'realtime' && (
        <div className="analytics-content">
          <div className="realtime-header">
            <div>
              <h3>🔴 Eventos em Tempo Real</h3>
              <p className="realtime-hint">Desative para poupar recursos.</p>
            </div>
            <div className="realtime-actions">
              <label className="toggle">
                <input
                  id="realtime-toggle"
                  name="realtimeEnabled"
                  type="checkbox"
                  checked={realtimeEnabled}
                  onChange={(e) => {
                    setRealtimeEvents([]);
                    setRealtimeEnabled(e.target.checked);
                  }}
                  aria-label="Ativar eventos em tempo real"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">{realtimeEnabled ? 'Ativo' : 'Pausado'}</span>
              </label>
              <button className="btn-clean" onClick={() => setRealtimeEvents([])}>
                Limpar feed
              </button>
            </div>
          </div>

          <div className="realtime-feed">
            {!realtimeEnabled && (
              <p className="realtime-empty">Streaming pausado. Ative para visualizar eventos.</p>
            )}

            {realtimeEnabled && realtimeEvents.length === 0 && (
              <p className="realtime-empty">Aguardando eventos...</p>
            )}

            {realtimeEnabled && realtimeEvents.length > 0 && (
              realtimeEvents.map((event, index) => (
                <div key={index} className="realtime-event">
                  <div className="event-icon">
                    {event.type === 'event' ? '⚡' : '👁️'}
                  </div>
                  <div className="event-content">
                    <div className="event-type">{event.type === 'event' ? 'Evento' : 'Pageview'}</div>
                    <div className="event-details">
                      {event.type === 'pageview' && (event.data.page || '—')}
                      {event.type === 'event' &&
                        `${event.data.event_type || 'evento'} - ${event.data.event_category || ''}`}
                    </div>
                    <div className="event-time">
                      {new Date(event.data.timestamp).toLocaleTimeString('pt-BR')}
                    </div>
                  </div>
                  {event.data.is_owner === 1 && (
                    <div className="owner-badge">👑</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Detailed Tab */}
      {activeTab === 'detailed' && (
        <div className="analytics-content">
          <div className="detailed-placeholder">
            <h3>📋 Análise Detalhada</h3>
            <p>
              Em breve: filtros avançados, exportação de dados, gráficos
              detalhados e análise de funil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
