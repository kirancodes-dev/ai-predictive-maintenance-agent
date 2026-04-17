import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { tokenManager } from './tokenManager';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>(ENDPOINTS.AUTH_LOGIN, credentials);
    tokenManager.setToken(data.token);
    tokenManager.setRefreshToken(data.refreshToken);
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post(ENDPOINTS.AUTH_LOGOUT);
    } finally {
      tokenManager.clearTokens();
    }
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<{ data: AuthUser }>(ENDPOINTS.AUTH_ME);
    return data.data;
  },

  refreshToken: async (): Promise<string> => {
    const refreshToken = tokenManager.getRefreshToken();
    const { data } = await apiClient.post<{ token: string }>(ENDPOINTS.AUTH_REFRESH, {
      refreshToken,
    });
    tokenManager.setToken(data.token);
    return data.token;
  },

  isAuthenticated: (): boolean => {
    return !!tokenManager.getToken();
  },
};
