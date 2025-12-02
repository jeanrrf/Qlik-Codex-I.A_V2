/**
 * ROI Card Component - Business Value Display
 * 
 * REVENUE FEATURE: Mostra economia em R$ para justificar compra do produto
 */

import React from 'react';

export interface ROIData {
  monthly: {
    total: number;
    reloadTimeSavings: number;
    ramCostSavings: number;
    cpuCostSavings: number;
    developerTimeSavings: number;
  };
  annual: {
    total: number;
  };
  impact: {
    reloadTimeMinutesSaved: number;
    ramGBSaved: number;
    developerHoursSaved: number;
    complexityReductionPoints: number;
  };
  payback: {
    monthsToPayback: number;
    roi: number;
  };
  confidence: 'low' | 'medium' | 'high';
  notes: string[];
}

interface ROICardProps {
  roi: ROIData;
}

export const ROICard: React.FC<ROICardProps> = ({ roi }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getConfidenceBadge = (confidence: string) => {
    const badges = {
      low: { bg: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: 'rgba(234, 179, 8, 0.3)', label: 'Baixa' },
      medium: { bg: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: 'rgba(59, 130, 246, 0.3)', label: 'Média' },
      high: { bg: 'rgba(34, 197, 94, 0.2)', color: '#86efac', border: 'rgba(34, 197, 94, 0.3)', label: 'Alta' }
    };
    return badges[confidence as keyof typeof badges] || badges.medium;
  };

  const badge = getConfidenceBadge(roi.confidence);

  return (
    <div style={{
      borderRadius: '12px',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
      backdropFilter: 'blur(8px)'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            💰
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#fff', margin: 0 }}>
              Valor de Negócio
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#e9d5ff', margin: '4px 0 0 0' }}>
              Economia estimada com otimizações
            </p>
          </div>
        </div>
        <div style={{
          borderRadius: '9999px',
          border: `1px solid ${badge.border}`,
          background: badge.bg,
          color: badge.color,
          padding: '4px 12px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          Confiança: {badge.label}
        </div>
      </div>

      {/* Main Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        padding: '1.5rem'
      }}>
        {/* Monthly Savings */}
        <div style={{
          borderRadius: '8px',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          background: 'rgba(34, 197, 94, 0.1)',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.125rem' }}>📊</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#bbf7d0' }}>
              Economia Mensal
            </span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#4ade80' }}>
            {formatCurrency(roi.monthly.total)}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#bbf7d0' }}>
            <div>Reload: {formatCurrency(roi.monthly.reloadTimeSavings)}</div>
            <div>RAM: {formatCurrency(roi.monthly.ramCostSavings)}</div>
            <div>Dev Time: {formatCurrency(roi.monthly.developerTimeSavings)}</div>
          </div>
        </div>

        {/* Annual Projection */}
        <div style={{
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'rgba(59, 130, 246, 0.1)',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.125rem' }}>📈</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#bfdbfe' }}>
              Projeção Anual
            </span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#60a5fa' }}>
            {formatCurrency(roi.annual.total)}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#bfdbfe' }}>
            ROI: {roi.payback.roi.toFixed(0)}% | Payback: {roi.payback.monthsToPayback.toFixed(1)} meses
          </div>
        </div>
      </div>

      {/* Impact Details */}
      <div style={{ borderTop: '1px solid rgba(168, 85, 247, 0.3)', padding: '1.5rem' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '0.875rem', fontWeight: '600', color: '#e9d5ff' }}>
          Impacto Técnico
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          fontSize: '0.875rem'
        }}>
          <div style={{
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '12px'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Reload</div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#fff' }}>
              -{roi.impact.reloadTimeMinutesSaved.toFixed(1)} min
            </div>
          </div>
          <div style={{
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '12px'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>RAM</div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#fff' }}>
              -{roi.impact.ramGBSaved.toFixed(2)} GB
            </div>
          </div>
          <div style={{
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '12px'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Dev Time</div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#fff' }}>
              +{roi.impact.developerHoursSaved.toFixed(1)} h/mês
            </div>
          </div>
          <div style={{
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '12px'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Complexidade</div>
            <div style={{ marginTop: '4px', fontWeight: '600', color: '#fff' }}>
              -{roi.impact.complexityReductionPoints} CC
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {roi.notes.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(168, 85, 247, 0.3)', padding: '1.5rem' }}>
          <h4 style={{ marginBottom: '8px', fontSize: '0.875rem', fontWeight: '600', color: '#e9d5ff' }}>
            Destaques
          </h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.75rem', color: '#d1d5db' }}>
            {roi.notes.slice(0, 3).map((note, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#c084fc', marginTop: '2px' }}>•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ROICard;
