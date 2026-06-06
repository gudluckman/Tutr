import { api } from './client';
import type { Enquiry, EnquiryStatus } from '../types/enquiry';
import type { Student } from '../types/student';

export async function listEnquiries() {
  const { data } = await api.get<Enquiry[]>('/enquiries');
  return data;
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  const { data } = await api.put<Enquiry>(`/enquiries/${id}/status`, { status });
  return data;
}

export type ConvertEnquiryPayload = {
  studentName: string;
  hourlyRate?: number;
  notes?: string;
};

export async function convertEnquiryToStudent(id: string, payload: ConvertEnquiryPayload) {
  const { data } = await api.post<{ enquiry: Enquiry; student: Student }>(`/enquiries/${id}/convert`, payload);
  return data;
}

export async function deleteEnquiry(id: string) {
  await api.delete(`/enquiries/${id}`);
}
