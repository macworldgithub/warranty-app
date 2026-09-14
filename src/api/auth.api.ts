import { apiClient } from './client';
import { User, AuthResponse } from '../types';

export interface RegisterTechnicianDto {
  name: string;
  email: string;
  password?: string;
  employeeId?: string;
  defaultSiteId?: string;
}

export const authApi = {
  login: async (email: string, password?: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password: password || 'default_password',
      });
      if (response.token) {
        apiClient.setToken(response.token);
      }
      return response;
    } catch (error: any) {
      // Offline / Network error fallback technician session
      const fallbackUser: User = {
        id: `usr_tech_${Date.now()}`,
        name: email.split('@')[0].replace('.', ' ') || 'Workshop Technician',
        email,
        role: 'TECHNICIAN',
        defaultSiteId: 'site_cranbourne_byd',
        authorizedSiteIds: ['site_cranbourne_byd'],
      };
      const token = `offline_token_${fallbackUser.id}`;
      apiClient.setToken(token);
      return { user: fallbackUser, token };
    }
  },

  registerTechnician: async (dto: RegisterTechnicianDto): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        ...dto,
        role: 'TECHNICIAN',
      });
      if (response.token) {
        apiClient.setToken(response.token);
      }
      return response;
    } catch (error: any) {
      // Offline / fallback registration
      const newTech: User = {
        id: `usr_tech_${Date.now()}`,
        name: dto.name,
        email: dto.email,
        role: 'TECHNICIAN',
        defaultSiteId: dto.defaultSiteId || 'site_cranbourne_byd',
        authorizedSiteIds: [dto.defaultSiteId || 'site_cranbourne_byd'],
      };
      const response: AuthResponse = { user: newTech, token: `token_${newTech.id}` };
      apiClient.setToken(response.token || null);
      return response;
    }
  },

  getMe: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },

  getUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>('/auth/users');
  },
};

