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

export interface SendOtpDto {
  email: string;
  type?: 'REGISTRATION' | 'FORGOT_PASSWORD';
  name?: string;
}

export interface VerifyRegisterOtpDto {
  name: string;
  email: string;
  password?: string;
  otp: string;
  employeeId?: string;
  defaultSiteId?: string;
  role?: UserRole;
}

export interface ResetPasswordDto {
  email: string;
  otp: string;
  newPassword: string;
}

export interface GenericAuthResponse {
  success: boolean;
  message: string;
  devOtp?: string;
}

