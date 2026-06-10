export type TeachingOffering = {
  tutorYear: string;
  subject: string;
};

export type TutorProfile = {
  id: string;
  displayName: string;
  slug: string;
  headline?: string;
  bio?: string;
  location?: string;
  tutorYear?: string;
  teachingOfferings?: TeachingOffering[];
  online: boolean;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  university?: string;
  degree?: string;
  highSchool?: string;
  highSchoolFinishedYear?: number | null;
  atar?: string;
  profileImageUrl?: string | null;
  isPublic: boolean;
};
