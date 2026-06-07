import { api } from './client';

export type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  syncEnabled: boolean;
  googleAccountEmail?: string | null;
  calendarId?: string | null;
};

export async function getGoogleCalendarStatus() {
  const { data } = await api.get<GoogleCalendarStatus>('/calendar/google/status');
  return data;
}

export async function getGoogleCalendarAuthUrl() {
  const { data } = await api.get<{ configured: boolean; authUrl?: string | null }>('/calendar/google/auth-url');
  return data;
}

export async function syncGoogleCalendarDeletions() {
  const { data } = await api.post<{ deletedLessons: number }>('/calendar/google/sync-deletions');
  return data;
}

export async function syncGoogleCalendarChanges() {
  const { data } = await api.post<{ updatedLessons: number; deletedLessons: number }>('/calendar/google/sync');
  return data;
}
