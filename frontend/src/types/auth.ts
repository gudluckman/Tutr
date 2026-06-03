export type UserRole = 'TUTOR' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

