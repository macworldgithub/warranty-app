export type UserRole = 'TECHNICIAN' | 'CLERK' | 'SERVICE_ADVISOR' | 'SERVICE_MANAGER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  defaultSiteId?: string;
  authorizedSiteIds?: string[];
  avatarUrl?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
}
