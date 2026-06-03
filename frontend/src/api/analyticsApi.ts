import { api } from './client';
import type { AnalyticsSummary, EarningsResponse, ImportEarningsResponse, RevenuePeriod } from '../types/analytics';

export async function getAnalyticsSummary(period: RevenuePeriod) {
  const { data } = await api.get<AnalyticsSummary>('/analytics/summary', { params: { period } });
  return data;
}

export async function getEarnings(page: number) {
  const { data } = await api.get<EarningsResponse>('/analytics/earnings', { params: { page } });
  return data;
}

export async function importEarningsCsv(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ImportEarningsResponse>('/analytics/earnings/import', formData);
  return data;
}

export async function exportEarningsCsv() {
  const response = await api.get<Blob>('/analytics/earnings/export', { responseType: 'blob' });
  return response.status === 204 ? null : response.data;
}
