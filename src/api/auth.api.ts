import { apiClient } from './client';
import {
  User,
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
    const user = resData?.user || response?.user || resData;

    if (token) {
      apiClient.setToken(token);
    }

    return {
      user: {
        ...user,
        role: user?.role || 'TECHNICIAN',
      },
      token,
      message: resData?.message || response?.message,
    };
  },

  registerTechnician: async (dto: RegisterTechnicianDto): Promise<AuthResponse> => {
    const response = await apiClient.post<any>('/auth/register', {
      ...dto,
      role: 'TECHNICIAN',
    });

    const resData = response?.data || response;
    const token =
      resData?.token ||
      resData?.accessToken ||
      resData?.access_token ||
      response?.token ||
      response?.accessToken;
    const user = resData?.user || response?.user || resData;

    if (token) {
      apiClient.setToken(token);
    }

    return {
      user: {
        ...user,
        role: 'TECHNICIAN',
      },
      token,
      message: resData?.message || response?.message,
    };
  },

  sendRegistrationOtp: async (
    email: string,
    name?: string
  ): Promise<GenericAuthResponse> => {
    const response = await apiClient.post<any>('/auth/register/send-otp', {
      email,
      name,
    });
    const resData = response?.data || response;
    return {
      success: true,
      message: resData?.message || 'Verification code sent to your email',
      devOtp: resData?.devOtp || resData?.otp,
    };
  },

  verifyRegistrationOtp: async (
    dto: VerifyRegisterOtpDto
  ): Promise<AuthResponse> => {
    const response = await apiClient.post<any>('/auth/register/verify-otp', {
      ...dto,
      role: dto.role || 'TECHNICIAN',
    });

    const resData = response?.data || response;
    const token =
      resData?.token ||
      resData?.accessToken ||
      resData?.access_token ||
      response?.token ||
      response?.accessToken;
    const user = resData?.user || response?.user || resData;

    if (token) {
      apiClient.setToken(token);
    }

    return {
      user: {
        ...user,
        role: 'TECHNICIAN',
      },
      token,
      message: resData?.message || response?.message,
    };
  },

  sendForgotPasswordOtp: async (
    email: string
  ): Promise<GenericAuthResponse> => {
    const response = await apiClient.post<any>('/auth/forgot-password', {
      email,
    });
    const resData = response?.data || response;
    return {
      success: true,
      message: resData?.message || 'Password reset OTP sent to your email',
      devOtp: resData?.devOtp || resData?.otp,
    };
  },

  resetPassword: async (
    dto: ResetPasswordDto
  ): Promise<GenericAuthResponse> => {
    const response = await apiClient.post<any>('/auth/reset-password', dto);
    const resData = response?.data || response;
    return {
      success: true,
      message: resData?.message || 'Password updated successfully.',
    };
  },

  getMe: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },

  getUsers: async (): Promise<User[]> => {
    return apiClient.get<User[]>('/auth/users');
  },
};


