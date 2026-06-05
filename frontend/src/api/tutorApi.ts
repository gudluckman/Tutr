import { api } from './client';
import type { EnquiryPayload } from '../types/enquiry';
import type { TutorProfile } from '../types/tutor';

export async function searchTutors(params?: { subject?: string; location?: string; tutorYear?: string; online?: boolean }) {
  const { data } = await api.get<TutorProfile[]>('/public/tutors', { params });
  return data;
}

export async function getPublicTutor(slug: string) {
  const { data } = await api.get<TutorProfile>(`/public/tutors/${slug}`);
  return data;
}

export async function createEnquiry(slug: string, payload: EnquiryPayload) {
  const { data } = await api.post(`/public/tutors/${slug}/enquiries`, payload);
  return data;
}

export async function getTutorProfile() {
  const { data } = await api.get<TutorProfile>('/tutor/profile');
  return data;
}

export async function updateTutorProfile(payload: TutorProfile) {
  const { data } = await api.put<TutorProfile>('/tutor/profile', payload);
  return data;
}

export async function uploadTutorProfileImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<TutorProfile>('/tutor/profile/image', formData);
  return data;
}
