/**
 * Analytics Dashboard - Monitoramento Enterprise
 * Dashboard completo de visualização de eventos e acessos
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  data: any;
}

export default function AnalyticsDashboard() {
  const { isOwner } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
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
    if (!isOwner() || activeTab !== 'realtime') return;

    const eventSource = new EventSource('/api/analytics/realtime', {
      withCredentials: true
    });

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'event' || data.type === 'pageview') {
          setRealtimeEvents((prev) => [data, ...prev].slice(0, 50));
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
  }, [isOwner, activeTab]);

  async function loadSummary() {
    try {
      const response = await fetch('/api/analytics/summary', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar analytics');
      }

      const data = await response.json();
      setSummary(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleCleanup() {
    if (!confirm('Deseja limpar dados de analytics com mais de 90 dias?')) {
      return;
    }

    try {
      const response = await fetch('/api/analytics/cleanup?days=90', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        alert('Limpeza concluída com sucesso');
        loadSummary();
      }
    } catch (err) {
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
          <h3>❌ {error}</h3>
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
        <h1>📊 Analytics Dashboard</h1>
        <p className="analytics-subtitle">
          Sistema de monitoramento enterprise de acessos e eventos
        </p>
      </div>

      {/* Tabs */}
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

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="analytics-content">
          {/* KPIs Principais */}
          <div className="analytics-kpis">
            <div className="kpi-card">
              <div className="kpi-icon">👁️</div>
              <div className="kpi-value">{summary.totalVisits.toLocaleString()}</div>
              <div className="kpi-label">Total de Visitas</div>
              <div className="kpi-owner">Owner: {summary.ownerVisits}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">⚡</div>
              <div className="kpi-value">{summary.totalEvents.toLocaleString()}</div>
              <div className="kpi-label">Total de Eventos</div>
              <div className="kpi-owner">Owner: {summary.ownerEvents}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">🔗</div>
              <div className="kpi-value">{summary.totalSessions.toLocaleString()}</div>
              <div className="kpi-label">Sessões</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">🤖</div>
              <div className="kpi-value">{summary.totalOptimizations.toLocaleString()}</div>
              <div className="kpi-label">Otimizações IA</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">👥</div>
              <div className="kpi-value">{summary.uniqueUsers.toLocaleString()}</div>
              <div className="kpi-label">Usuários Únicos</div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="analytics-section">
            <h3>🔝 Páginas Mais Visitadas</h3>
            <div className="analytics-list">
              {summary.topPages.map((page, index) => (
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
              {summary.topEvents.map((event, index) => (
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
              {summary.recentActivity.map((activity, index) => (
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
            <h3>🔴 Eventos em Tempo Real</h3>
            <div className="realtime-status">
              <span className="status-indicator"></span>
              Conectado
            </div>
          </div>

          <div className="realtime-feed">
            {realtimeEvents.length === 0 ? (
              <p className="realtime-empty">Aguardando eventos...</p>
            ) : (
              realtimeEvents.map((event, index) => (
                <div key={index} className="realtime-event">
                  <div className="event-icon">
                    {event.type === 'event' ? '⚡' : '👁️'}
                  </div>
                  <div className="event-content">
                    <div className="event-type">{event.type}</div>
                    <div className="event-details">
                      {event.type === 'pageview' && event.data.page}
                      {event.type === 'event' &&
                        `${event.data.event_type} - ${event.data.event_category}`}
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
