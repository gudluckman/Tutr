import { api } from './client';
import type { AnalyticsSummary, EarningsResponse, ImportEarningsResponse, RevenuePeriod } from '../types/analytics';
import type { AxiosProgressEvent } from 'axios';

export async function getAnalyticsSummary(period: RevenuePeriod) {
  const { data } = await api.get<AnalyticsSummary>('/analytics/summary', { params: { period } });
  return data;
}

export async function getEarnings(page: number, year?: number, month?: number, financialYearStart?: number) {
  const { data } = await api.get<EarningsResponse>('/analytics/earnings', { params: { page, year, month, financialYearStart } });
  return data;
}

export async function importEarningsCsv(file: File, replaceExisting = false, onProgress?: (progress: number) => void) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ImportEarningsResponse>('/analytics/earnings/import', formData, {
    params: { replaceExisting },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!onProgress) return;
      if (!event.total) {
        onProgress(95);
        return;
      }
      onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
    },
  });
  return data;
}

export async function exportEarningsCsv(year?: number, month?: number, financialYearStart?: number) {
  const response = await api.get<Blob>('/analytics/earnings/export', { params: { year, month, financialYearStart }, responseType: 'blob' });
  return response.status === 204 ? null : response.data;
}
