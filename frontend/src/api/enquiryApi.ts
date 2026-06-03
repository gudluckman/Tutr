import { api } from './client';
import type { Enquiry, EnquiryStatus } from '../types/enquiry';

export async function listEnquiries() {
  const { data } = await api.get<Enquiry[]>('/enquiries');
  return data;
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  const { data } = await api.put<Enquiry>(`/enquiries/${id}/status`, { status });
  return data;
}

