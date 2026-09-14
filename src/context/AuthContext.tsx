import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
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

  useEffect(() => {
    // Initial auto-login fallback / restore session
    const initAuth = async () => {
      try {
        const users = await authApi.getUsers();
        if (users && users.length > 0) {
          // Default to first technician
          const tech = users.find(u => u.role === 'TECHNICIAN') || {
            ...users[0],
            role: 'TECHNICIAN',
          };
          setUser(tech);
          if (tech.defaultSiteId) {
            setActiveSiteId(tech.defaultSiteId);
          }
          setToken(`token_${tech.id}`);
          apiClient.setToken(`token_${tech.id}`);
        }
      } catch (err) {
        // Fallback default technician profile
        const defaultUser: User = {
          id: 'usr_tech_1',
          name: 'Jake Smith',
          email: 'technician@booran.com.au',
          role: 'TECHNICIAN',
          defaultSiteId: 'site_cranbourne_byd',
          authorizedSiteIds: ['site_cranbourne_byd'],
        };
        setUser(defaultUser);
        setActiveSiteId('site_cranbourne_byd');
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
      // Enforce technician role for mobile app
      const techUser: User = {
        ...res.user,
        role: 'TECHNICIAN',
      };
      setUser(techUser);
      if (res.token) {
        setToken(res.token);
        apiClient.setToken(res.token);
      }
      if (techUser.defaultSiteId) {
        setActiveSiteId(techUser.defaultSiteId);
      }
      return techUser;
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
      const techUser: User = {
        ...res.user,
        role: 'TECHNICIAN',
      };
      setUser(techUser);
      if (res.token) {
        setToken(res.token);
        apiClient.setToken(res.token);
      }
      if (techUser.defaultSiteId) {
        setActiveSiteId(techUser.defaultSiteId);
      }
      return techUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    apiClient.setToken(null);
  };

  const refreshMe = async () => {
    try {
      const me = await authApi.getMe();
      if (me) setUser({ ...me, role: 'TECHNICIAN' });
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
