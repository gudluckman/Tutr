import { api } from './client';
import type { AnalyticsSummary, EarningsResponse, RevenuePeriod } from '../types/analytics';

export async function getAnalyticsSummary(period: RevenuePeriod) {
  const { data } = await api.get<AnalyticsSummary>('/analytics/summary', { params: { period } });
  return data;
}

export async function getEarnings(page: number) {
  const { data } = await api.get<EarningsResponse>('/analytics/earnings', { params: { page } });
  return data;
}
