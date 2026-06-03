import { api } from './client';
import type { Student, StudentPayload } from '../types/student';

export async function listStudents() {
  const { data } = await api.get<Student[]>('/students');
  return data;
}

export async function createStudent(payload: StudentPayload) {
  const { data } = await api.post<Student>('/students', payload);
  return data;
}

export async function updateStudent(id: string, payload: StudentPayload) {
  const { data } = await api.put<Student>(`/students/${id}`, payload);
  return data;
}

export async function deleteStudent(id: string) {
  await api.delete(`/students/${id}`);
}

