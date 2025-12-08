/**
 * API Client para Quotas e Uso (FREE TIER)
 */

import { apiClient } from './client';

export interface UsageQuotaCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp
  usedToday: number;
}

export interface QuotaResponse {
  success: boolean;
  data: {
    ultraExpert: UsageQuotaCheck;
    nvidiaFast: UsageQuotaCheck;
  };
}

export interface UsageStatsResponse {
  success: boolean;
  data: {
    last24h: number;
    last7days: number;
    last30days: number;
    ultraExpertModeCount: number;
    nvidiaFastModeCount: number;
  };
}

/**
 * Busca quotas diárias do usuário
 */
export async function getQuotas(): Promise<QuotaResponse> {
  return apiClient.get<QuotaResponse>('/api/usage/quota');
}

/**
 * Busca estatísticas de uso do usuário
 */
export async function getUsageStats(): Promise<UsageStatsResponse> {
  return apiClient.get<UsageStatsResponse>('/api/usage/stats');
}
