export type TutorProfile = {
  id: string;
  displayName: string;
  slug: string;
  headline?: string;
  bio?: string;
  location?: string;
  tutorYear?: string;
  online: boolean;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  university?: string;
  degree?: string;
  atar?: string;
  profileImageUrl?: string | null;
  isPublic: boolean;
};
