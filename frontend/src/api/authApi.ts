import { api, tokenStorageKey } from './client';
import type { AuthResponse, AuthUser } from '../types/auth';

export async function register(payload: { email: string; password: string; displayName: string }) {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  localStorage.setItem(tokenStorageKey, data.token);
  return data;
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  localStorage.setItem(tokenStorageKey, data.token);
  return data;
}

export async function me() {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export function logout() {
  localStorage.removeItem(tokenStorageKey);
}

export function hasToken() {
  return Boolean(localStorage.getItem(tokenStorageKey));
}

