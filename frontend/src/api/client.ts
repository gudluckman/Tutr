import axios from 'axios';

export const tokenStorageKey = 'tutr.authToken';
export const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: apiBaseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenStorageKey);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function assetUrl(url?: string | null) {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  const apiUrl = new URL(apiBaseURL, window.location.origin);
  return `${apiUrl.origin}${url.startsWith('/') ? url : `/${url}`}`;
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!axios.isAxiosError(error)) return fallback;

  const data = error.response?.data as { title?: string; detail?: string; errors?: Record<string, string> } | undefined;
  const validationErrors = data?.errors ? Object.values(data.errors).filter(Boolean) : [];
  if (validationErrors.length > 0) return validationErrors.join(' ');
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;
  if (!error.response) return 'Could not reach the server. Please try again.';
  return fallback;
}
