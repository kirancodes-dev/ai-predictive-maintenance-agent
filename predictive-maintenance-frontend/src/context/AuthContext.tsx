import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api/apiClient';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore user from token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    // Attempt to restore session with the existing token; if it fails,
    // try refreshing before giving up — prevents logout on page refresh
    // when the token just expired.
    apiClient
      .get('/auth/me')
      .then((res) => {
        const u = res.data?.data;
        if (u) setUser(u);
      })
      .catch(async () => {
        // Try a silent refresh before clearing
        try {
          const { data: refreshData } = await apiClient.post('/auth/refresh', { token });
          const newToken = refreshData?.data?.accessToken;
          if (newToken) {
            localStorage.setItem('access_token', newToken);
            const meRes = await apiClient.get('/auth/me');
            const u = meRes.data?.data;
            if (u) { setUser(u); return; }
          }
        } catch { /* refresh also failed */ }
        localStorage.removeItem('access_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const data = res.data?.data;
    if (!data?.accessToken) throw new Error('No token received');
    localStorage.setItem('access_token', data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};
