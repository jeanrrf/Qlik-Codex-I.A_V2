import React, { useEffect, useState } from 'react';
import './OwnerKpiDashboard.css';

interface OwnerStats {
  ownerVisits: number;
  ownerEvents: number;
  totalOptimizations: number;
}

export function OwnerKpiDashboard() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOwnerKpis = async () => {
      try {
        const res = await fetch('/api/analytics/summary', {
          credentials: 'include'
        });

        if (!res.ok) throw new Error('Falha ao carregar dados');

        const data = await res.json();
        setStats({
          ownerVisits: data.ownerVisits ?? 0,
          ownerEvents: data.ownerEvents ?? 0,
          totalOptimizations: data.totalOptimizations ?? 0
        });
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar KPIs');
      } finally {
        setLoading(false);
      }
    };

    loadOwnerKpis();
  }, []);

  if (loading) return <div className="kpi-loading">Carregando KPIs...</div>;
  if (error) return <div className="kpi-error">{error}</div>;

  return (
    <div className="owner-kpi-dashboard">
      <h3 className="kpi-title">
        <span className="kpi-icon">👑</span>
        KPIs do Proprietário
      </h3>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Visitas (Owner)</div>
          <div className="kpi-value">{stats ? stats.ownerVisits.toLocaleString('pt-BR') : '0'}</div>
          <div className="kpi-note">Capturadas via tracking atual</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Eventos (Owner)</div>
          <div className="kpi-value">{stats ? stats.ownerEvents.toLocaleString('pt-BR') : '0'}</div>
          <div className="kpi-note">Interações rastreadas</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Execuções de IA</div>
          <div className="kpi-value">{stats ? stats.totalOptimizations.toLocaleString('pt-BR') : '0'}</div>
          <div className="kpi-note">Histórico total</div>
        </div>
      </div>
    </div>
  );
}
