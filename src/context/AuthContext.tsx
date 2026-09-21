import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  VerifyRegisterOtpDto,
  ResetPasswordDto,
  GenericAuthResponse,
} from '../types';
import { authApi } from '../api/auth.api';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeSiteId: string;
  login: (email: string, password?: string) => Promise<User>;
  registerTechnician: (data: {
    name: string;
    email: string;
    password?: string;
    employeeId?: string;
    defaultSiteId?: string;
  }) => Promise<User>;
  sendRegistrationOtp: (email: string, name?: string) => Promise<GenericAuthResponse>;
  verifyRegistrationOtp: (dto: VerifyRegisterOtpDto) => Promise<User>;
  sendForgotPasswordOtp: (email: string) => Promise<GenericAuthResponse>;
  resetPassword: (dto: ResetPasswordDto) => Promise<GenericAuthResponse>;
  logout: () => void;
  setActiveSiteId: (siteId: string) => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeSiteId, setActiveSiteId] = useState<string>('site_cranbourne_byd');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    setUser(null);
    setToken(null);
    apiClient.setToken(null);
  };

  useEffect(() => {
    // Configure 401 interceptor
    apiClient.setOnUnauthorized(() => {
      logout();
    });

    const initAuth = async () => {
      try {
        const currentToken = apiClient.getToken();
        if (currentToken) {
          const me = await authApi.getMe();
          if (me) {
            setUser(me);
            if (me.defaultSiteId) {
              setActiveSiteId(me.defaultSiteId);
            }
          }
        }
      } catch (err) {
        // If not authenticated, require explicit login
        setUser(null);
        setToken(null);
        apiClient.setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      const currentUser: User = res.user;
      setUser(currentUser);
      if (res.token) {
        setToken(res.token);
        apiClient.setToken(res.token);
      }
      if (currentUser.defaultSiteId) {
        setActiveSiteId(currentUser.defaultSiteId);
      }
      return currentUser;
    } finally {
      setIsLoading(false);
    }
  };

  const registerTechnician = async (data: {
    name: string;
    email: string;
    password?: string;
    employeeId?: string;
    defaultSiteId?: string;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authApi.registerTechnician(data);
      const currentUser: User = res.user;
      setUser(currentUser);
      if (res.token) {
        setToken(res.token);
        apiClient.setToken(res.token);
      }
      if (currentUser.defaultSiteId) {
        setActiveSiteId(currentUser.defaultSiteId);
      }
      return currentUser;
    } finally {
      setIsLoading(false);
    }
  };

  const sendRegistrationOtp = async (
    email: string,
    name?: string
  ): Promise<GenericAuthResponse> => {
    return authApi.sendRegistrationOtp(email, name);
  };

  const verifyRegistrationOtp = async (
    dto: VerifyRegisterOtpDto
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyRegistrationOtp(dto);
      const currentUser: User = res.user;
      setUser(currentUser);
      if (res.token) {
        setToken(res.token);
        apiClient.setToken(res.token);
      }
      if (currentUser.defaultSiteId) {
        setActiveSiteId(currentUser.defaultSiteId);
      }
      return currentUser;
    } finally {
      setIsLoading(false);
    }
  };

  const sendForgotPasswordOtp = async (
    email: string
  ): Promise<GenericAuthResponse> => {
    return authApi.sendForgotPasswordOtp(email);
  };

  const resetPassword = async (
    dto: ResetPasswordDto
  ): Promise<GenericAuthResponse> => {
    return authApi.resetPassword(dto);
  };

  const refreshMe = async () => {
    try {
      const me = await authApi.getMe();
      if (me) setUser(me);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        activeSiteId,
        login,
        registerTechnician,
        sendRegistrationOtp,
        verifyRegistrationOtp,
        sendForgotPasswordOtp,
        resetPassword,
        logout,
        setActiveSiteId,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
