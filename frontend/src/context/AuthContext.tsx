import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, demoLoginApi, registerApi, logoutApi } from '../lib/api/auth';
import { getOrganizationMe } from '../lib/api/organizations';
import { getToken } from '../lib/api/client';
import type {
  LoginPayload,
  RegisterPayload,
  OrganizationResponse,
} from '@/types';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  organization: OrganizationResponse | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshOrg: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [organization, setOrganization] = useState<OrganizationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true);
      const org = await getOrganizationMe();
      setOrganization(org);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch authenticated organization:', err);
      if (err.status === 401) {
        logout();
      } else {
        setError(err.message || 'Failed to fetch organization context.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchOrganization();
    } else {
      setLoading(false);
    }
  }, [token, fetchOrganization]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('ps105_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ps105_unauthorized', handleUnauthorized);
  }, []);

  const login = async (payload: LoginPayload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await loginApi(payload);
      setTokenState(res.access_token);
      const org = await getOrganizationMe();
      setOrganization(org);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await demoLoginApi();
      setTokenState(res.access_token);
      const org = await getOrganizationMe();
      setOrganization(org);
    } catch (err: any) {
      setError(err.message || 'Failed to load demonstration dataset.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      setLoading(true);
      setError(null);
      await registerApi(payload);
      // Auto login after registration
      await login({ email: payload.email, password: payload.password });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ps105_logged_out', 'true');
    }
    logoutApi();
    setTokenState(null);
    setOrganization(null);
    setError(null);
  };

  const refreshOrg = async () => {
    if (token) {
      await fetchOrganization();
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        organization,
        loading,
        error,
        login,
        demoLogin,
        register,
        logout,
        refreshOrg,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
