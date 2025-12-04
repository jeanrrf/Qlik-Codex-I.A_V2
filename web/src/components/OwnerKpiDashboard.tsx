import React, { useEffect, useState } from 'react';
import './OwnerKpiDashboard.css';

interface Stats {
  visits: number;
  executions: number;
}

export function OwnerKpiDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar dados');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Erro ao carregar KPIs');
        setLoading(false);
      });
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
          <div className="kpi-value">{stats?.visits || 0}</div>
          <div className="kpi-label">Visitas Totais</div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-value">{stats?.executions || 0}</div>
          <div className="kpi-label">Execuções de IA</div>
        </div>
      </div>
    </div>
  );
}
