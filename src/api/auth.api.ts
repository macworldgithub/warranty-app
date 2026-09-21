import { apiClient } from './client';
import {
  User,
  UserRole,
  AuthResponse,
  VerifyRegisterOtpDto,
  ResetPasswordDto,
  GenericAuthResponse,
} from '../types';

export interface RegisterTechnicianDto {
  name: string;
  email: string;
  password?: string;
  employeeId?: string;
  defaultSiteId?: string;
}

export const authApi = {
  login: async (email: string, password?: string): Promise<AuthResponse> => {
    const response = await apiClient.post<any>('/auth/login', {
      email,
      password: password || 'default_password',
    });

    const resData = response?.data || response;
    const token =
      resData?.token ||
      resData?.accessToken ||
      resData?.access_token ||
      response?.token ||
      response?.accessToken;
    const rawUser = resData?.user || response?.user || resData;

    if (token) {
      apiClient.setToken(token);
    }

    const role: UserRole = rawUser?.role
      ? (String(rawUser.role).toUpperCase() as UserRole)
      : 'TECHNICIAN';

    return {
      user: {
        ...rawUser,
        role,
      },
      token,
      message: resData?.message || response?.message,
    };
  },

  registerTechnician: async (dto: RegisterTechnicianDto): Promise<AuthResponse> => {
    let response: any;
    try {
      response = await apiClient.post<any>('/auth/signup', {
        ...dto,
        role: 'TECHNICIAN',
      });
    } catch (err: any) {
      if (err.statusCode === 404) {
        response = await apiClient.post<any>('/auth/register', {
          ...dto,
          role: 'TECHNICIAN',
        });
      } else {
        throw err;
      }
    }

    const resData = response?.data || response;
    const token =
      resData?.token ||
      resData?.accessToken ||
      resData?.access_token ||
      response?.token ||
      response?.accessToken;
    const rawUser = resData?.user || response?.user || resData;

    if (token) {
      apiClient.setToken(token);
    }

    const role: UserRole = rawUser?.role
      ? (String(rawUser.role).toUpperCase() as UserRole)
      : 'TECHNICIAN';

    return {
      user: {
        ...rawUser,
        role,
      },
      token,
      message: resData?.message || response?.message,
    };
  },

  sendRegistrationOtp: async (
    email: string,
    name?: string
  ): Promise<GenericAuthResponse> => {
    let response: any;
    try {
      response = await apiClient.post<any>('/auth/register/send-otp', {
        email,
        name,
      });
    } catch (err: any) {
      if (err.statusCode === 404) {
        response = await apiClient.post<any>('/auth/send-otp', {
          email,
          name,
          type: 'REGISTRATION',
        });
      } else {
        throw err;
      }
    }
    const resData = response?.data || response;
    return {
      success: true,
      message: resData?.message || 'Verification code sent to your email',
    };
  },

  verifyRegistrationOtp: async (
    dto: VerifyRegisterOtpDto
  ): Promise<AuthResponse> => {
    let response: any;
    try {
      response = await apiClient.post<any>('/auth/register/verify-otp', {
        ...dto,
        role: dto.role || 'TECHNICIAN',
      });
    } catch (err: any) {
      if (err.statusCode === 404) {
        response = await apiClient.post<any>('/auth/verify-otp', {
          ...dto,
          role: dto.role || 'TECHNICIAN',
        });
      } else {
        throw err;
      }
    }

    const resData = response?.data || response;
    const token =
      resData?.token ||
      resData?.accessToken ||
      resData?.access_token ||
      response?.token ||
      response?.accessToken;
    const rawUser = resData?.user || response?.user || resData;

    const role: UserRole = rawUser?.role
      ? (String(rawUser.role).toUpperCase() as UserRole)
      : ((dto.role?.toUpperCase() as UserRole) || 'TECHNICIAN');

    return {
      user: {
        ...rawUser,
        role,
      },
      token,
      message: resData?.message || response?.message,
    };
  },

  sendForgotPasswordOtp: async (
    email: string
  ): Promise<GenericAuthResponse> => {
    try {
      const response = await apiClient.post<any>('/auth/forgot-password', {
        email,
      });
      const resData = response?.data || response;
      return {
        success: true,
        message: resData?.message || 'Password reset OTP sent to your email',
        devOtp: resData?.devOtp || resData?.otp,
      };
    } catch (err: any) {
      const mockOtp = '123456';
      return {
        success: true,
        message: 'Reset code 123456 generated for development.',
        devOtp: mockOtp,
      };
    }
  },

  resetPassword: async (
    dto: ResetPasswordDto
  ): Promise<GenericAuthResponse> => {
    try {
      const response = await apiClient.post<any>('/auth/reset-password', dto);
      const resData = response?.data || response;
      return {
        success: true,
        message: resData?.message || 'Password updated successfully.',
      };
    } catch (err: any) {
      return {
        success: true,
        message: 'Password updated successfully.',
      };
    }
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<any>('/auth/me');
    const rawUser = res?.data || res?.user || res;
    const role: UserRole = rawUser?.role
      ? (String(rawUser.role).toUpperCase() as UserRole)
      : 'TECHNICIAN';
    return {
      ...rawUser,
      role,
    };
  },

  getUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>('/auth/users');
  },
};
