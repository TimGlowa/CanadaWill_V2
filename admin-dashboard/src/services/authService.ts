import { API_BASE_URL, APP_CONFIG } from '../config';
import axios from 'axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

class AuthService {
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.token = localStorage.getItem(APP_CONFIG.auth.tokenKey);
    this.refreshToken = localStorage.getItem(APP_CONFIG.auth.refreshTokenKey);
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}${APP_CONFIG.endpoints.auth.login}`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      
      // Store tokens
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      localStorage.setItem(APP_CONFIG.auth.tokenKey, data.token);
      localStorage.setItem(APP_CONFIG.auth.refreshTokenKey, data.refreshToken);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await axios.post(
          `${API_BASE_URL}${APP_CONFIG.endpoints.auth.logout}`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  async refreshAuth(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}${APP_CONFIG.endpoints.auth.refresh}`,
        { refreshToken: this.refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      
      // Update tokens
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      localStorage.setItem(APP_CONFIG.auth.tokenKey, data.token);
      localStorage.setItem(APP_CONFIG.auth.refreshTokenKey, data.refreshToken);

      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      throw error;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  private clearTokens(): void {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem(APP_CONFIG.auth.tokenKey);
    localStorage.removeItem(APP_CONFIG.auth.refreshTokenKey);
  }
}

export const authService = new AuthService(); 