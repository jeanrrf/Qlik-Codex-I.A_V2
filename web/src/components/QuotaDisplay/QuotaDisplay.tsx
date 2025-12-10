/**
 * Componente de Exibição de Quotas (FREE TIER)
 * Mostra quotas disponíveis para o usuário em tempo real
 */

import React, { useEffect, useState, useCallback } from 'react';
import { getQuotas, UsageQuotaCheck } from '../../api/usage';
import './QuotaDisplay.css';

interface QuotaDisplayProps {
  mode?: 'ultra-expert' | 'nvidia-fast';
  compact?: boolean;
  onQuotaUpdate?: (quota: UsageQuotaCheck) => void;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // reduce polling noise to 5 minutes

export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({
  mode = 'ultra-expert',
  compact = true,
  onQuotaUpdate
}) => {
  const [quota, setQuota] = useState<UsageQuotaCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getQuotas();

      const quotaData = mode === 'ultra-expert'
        ? response.data.ultraExpert
        : response.data.nvidiaFast;

      setQuota(quotaData);

      if (onQuotaUpdate) {
        onQuotaUpdate(quotaData);
      }
    } catch (err) {
      console.error('[QUOTA] Erro ao buscar quotas:', err);
      setError('Não foi possível carregar as quotas');
    } finally {
      setLoading(false);
    }
  }, [mode, onQuotaUpdate]);

  useEffect(() => {
    fetchQuota();

    // Atualizar com intervalo longo para evitar excesso de requisições
    const interval = setInterval(fetchQuota, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [mode, fetchQuota]);

  if (loading && !quota) {
    return (
      <div className={`quota-display ${compact ? 'quota-display--compact' : ''}`}>
        <div className="quota-display__loading">Carregando quotas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`quota-display ${compact ? 'quota-display--compact' : ''}`}>
        <div className="quota-display__error">{error}</div>
      </div>
    );
  }

  if (!quota) {
    return null;
  }

  // Owner tem acesso ilimitado
  const isUnlimited = quota.limit === -1;
  const percentageUsed = isUnlimited ? 0 : (quota.usedToday / quota.limit) * 100;
  const isLowQuota = percentageUsed >= 80;
  const isNoQuota = !quota.allowed;

  const resetDate = new Date(quota.resetAt);
  const now = new Date();
  const hoursUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const resetLabel = resetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (compact) {
    return (
      <div className={`quota-display quota-display--compact ${isNoQuota ? 'quota-display--depleted' : ''}`}>
        <div className="quota-compact__left">
          <span className="quota-display__icon" aria-hidden>
            {mode === 'nvidia-fast' ? '⚡' : '🚀'}
          </span>
          <div className="quota-compact__labels">
            <span className="quota-compact__title">{mode === 'nvidia-fast' ? 'NVIDIA Fast' : 'Ultra Expert'}</span>
            <span className="quota-compact__reset">Reset {resetLabel}</span>
          </div>
        </div>
        <div className="quota-compact__numbers">
          {isUnlimited ? (
            <span className="quota-compact__value">∞</span>
          ) : (
            <>
              <span className={`quota-compact__value ${isNoQuota ? 'depleted' : ''}`}>
                {quota.remaining}
              </span>
              <span className="quota-compact__slash">/</span>
              <span className="quota-compact__limit">{quota.limit}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`quota-display ${isNoQuota ? 'quota-display--depleted' : ''}`}>
      <div className="quota-display__header">
        <h3 className="quota-display__title">
          {mode === 'ultra-expert' ? '🚀 Ultra Expert' : '⚡ NVIDIA Fast'}
        </h3>
        <button
          className="quota-display__refresh"
          onClick={fetchQuota}
          title="Atualizar quotas"
          disabled={loading}
        >
          🔄
        </button>
      </div>

      {isUnlimited ? (
        <div className="quota-display__unlimited">
          <div className="quota-display__unlimited-icon">∞</div>
          <div className="quota-display__unlimited-text">Acesso Ilimitado</div>
          <div className="quota-display__unlimited-subtitle">Conta OWNER</div>
        </div>
      ) : (
        <>
          <div className="quota-display__stats">
            <div className="quota-display__stat">
              <span className="quota-display__stat-label">Usadas hoje</span>
              <span className="quota-display__stat-value">{quota.usedToday}</span>
            </div>
            <div className="quota-display__stat">
              <span className="quota-display__stat-label">Disponíveis</span>
              <span className={`quota-display__stat-value ${isLowQuota ? 'quota-display__stat-value--warning' : ''}`}>
                {quota.remaining}
              </span>
            </div>
            <div className="quota-display__stat">
              <span className="quota-display__stat-label">Limite diário</span>
              <span className="quota-display__stat-value">{quota.limit}</span>
            </div>
          </div>

          <div className="quota-display__progress">
            <div
              className={`quota-display__progress-bar ${isLowQuota ? 'quota-display__progress-bar--warning' : ''}`}
              style={{ width: `${percentageUsed}%` }}
            />
          </div>

          <div className="quota-display__footer">
            {isNoQuota ? (
              <div className="quota-display__message quota-display__message--error">
                ⚠️ Quota diária esgotada. Reset em {hoursUntilReset}h
              </div>
            ) : isLowQuota ? (
              <div className="quota-display__message quota-display__message--warning">
                ⚠️ Poucas otimizações restantes hoje
              </div>
            ) : (
              <div className="quota-display__message">
                ✅ {quota.remaining} otimizações disponíveis
              </div>
            )}
            <div className="quota-display__reset">
              Reset às {resetLabel}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuotaDisplay;
