import { api } from './client';
import type { Lesson, LessonPayload, LessonStatusPayload, RecurringLessonPayload } from '../types/lesson';

export async function listLessons() {
  const { data } = await api.get<Lesson[]>('/lessons');
  return data;
}

export async function createLesson(payload: LessonPayload) {
  const { data } = await api.post<Lesson>('/lessons', payload);
  return data;
}

export async function createRecurringLessons(payload: RecurringLessonPayload) {
  const { data } = await api.post<{ lessons: Lesson[] }>('/lessons/recurring', payload);
  return data;
}

export async function updateLesson(id: string, payload: LessonPayload) {
  const { data } = await api.put<Lesson>(`/lessons/${id}`, payload);
  return data;
}

export async function updateLessonStatuses(id: string, payload: LessonStatusPayload) {
  const { data } = await api.put<Lesson>(`/lessons/${id}/statuses`, payload);
  return data;
}

export async function deleteLesson(id: string) {
  await api.delete(`/lessons/${id}`);
}
