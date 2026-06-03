export type PreferredMode = 'ONLINE' | 'IN_PERSON' | 'BOTH';
export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';

export type Enquiry = {
  id: string;
  tutorSlug: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  studentYear?: string;
  subject?: string;
  message?: string;
  preferredLocation?: string;
  preferredMode?: PreferredMode;
  status: EnquiryStatus;
  createdAt: string;
};

export type EnquiryPayload = Omit<Enquiry, 'id' | 'tutorSlug' | 'status' | 'createdAt'>;

