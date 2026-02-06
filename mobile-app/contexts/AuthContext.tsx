/**
 * Authentication Context for Mobile App
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiClient } from '../lib/api-client';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isAdmin?: boolean;
}

/** When login requires 2FA, return this so UI can show code input */
export type LoginRequires2FA = { requiresTwoFactor: true; userId: string };

/** When register requires email verification, return this so UI can show code input */
export type RegisterRequiresVerification = { requiresVerification: true; user: User };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<LoginRequires2FA | void>;
  register: (username: string, email: string, password: string) => Promise<RegisterRequiresVerification | void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  verifyTwoFactor: (userId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOGIN_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyAuth = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setIsLoading(true);
      const response = await apiClient.get<{ user: User }>(API_ENDPOINTS.AUTH.VERIFY, {
        timeout: 8000,
      });
      if (response.user) {
        setUser(response.user);
      }
    } catch (error: any) {
      if (!silent) console.log('Not authenticated:', error.message || 'No token found');
      setUser(null);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const verifyRef = useRef(verifyAuth);
  verifyRef.current = verifyAuth;

  // Verify authentication on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      verifyAuth().catch((error) => {
        console.error('Auth verification error:', error);
        setIsLoading(false);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Re-verify when app comes to foreground (e.g. after saving avatar on My Dice in WebView)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') verifyRef.current({ silent: true }).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const login = async (username: string, password: string, rememberMe = false): Promise<LoginRequires2FA | void> => {
    const base = API_BASE_URL.replace(/\/$/, '');
    const url = `${base}${API_ENDPOINTS.AUTH.LOGIN}`;
    const body = JSON.stringify({ username, password, rememberMe });

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

    const req = new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      signal: controller.signal,
    });

    let res: Response;
    try {
      res = await fetch(req);
    } catch (err: any) {
      clearTimeout(to);
      const isAbort = err?.name === 'AbortError' || /abort/i.test(err?.message || '');
      throw new Error(isAbort ? 'Connection timed out. Please check your network and try again.' : (err?.message || 'Network error'));
    }
    clearTimeout(to);

    const text = await res.text();
    let data: { user?: User; token?: string; message?: string; requiresTwoFactor?: boolean; userId?: string };
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(res.ok ? 'Invalid response from server' : text || `HTTP ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(data.message || `Login failed (${res.status})`);
    }

    if (data.requiresTwoFactor && data.userId) {
      return { requiresTwoFactor: true, userId: data.userId };
    }

    if (data.token) {
      await apiClient.setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<RegisterRequiresVerification | void> => {
    const response = await apiClient.post<{ user: User; token?: string; requiresVerification?: boolean }>(
      API_ENDPOINTS.AUTH.REGISTER,
      { username, email, password }
    );

    if (response.requiresVerification && response.user) {
      return { requiresVerification: true, user: response.user };
    }

    if (response.token) {
      await apiClient.setToken(response.token);
    }
    if (response.user) {
      setUser(response.user);
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    const data = await apiClient.post<{ user: User; token: string }>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { email, code });
    if (data.token) await apiClient.setToken(data.token);
    if (data.user) setUser(data.user);
  };

  const verifyTwoFactor = async (userId: string, code: string) => {
    const data = await apiClient.post<{ user: User; token: string }>(API_ENDPOINTS.AUTH.VERIFY_2FA, { userId, code });
    if (data.token) await apiClient.setToken(data.token);
    if (data.user) setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await apiClient.clearToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyEmail,
        verifyTwoFactor,
        logout,
        verifyAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
