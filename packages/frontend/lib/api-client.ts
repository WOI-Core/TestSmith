/**
 * Centralized API Client
 * Handles authentication, request/response interceptors, and error handling
 */

import { buildApiUrl, REQUEST_CONFIG } from './config';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  requireAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    this.defaultHeaders = REQUEST_CONFIG.DEFAULT_HEADERS;
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(options: RequestOptions): Record<string, string> {
    const headers = { ...this.defaultHeaders, ...options.headers };
    
    if (options.requireAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return headers;
  }

  /**
   * Handle API response and extract data/errors
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse response',
      };
    }
  }

  /**
   * Main request method
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      timeout = REQUEST_CONFIG.TIMEOUT,
      requireAuth = false,
    } = options;

    const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);
    const headers = this.buildHeaders(options);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestConfig: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body && method !== 'GET') {
        requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, requireAuth = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', requireAuth });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    requireAuth = false
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data,
      requireAuth,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    requireAuth = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
      requireAuth,
    });
  }

  async delete<T = any>(endpoint: string, requireAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', requireAuth });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    requireAuth = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data,
      requireAuth,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export commonly used API methods
export const api = {
  // Auth methods
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiClient.post('/api/auth/login', { email, password });
      if (response.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response;
    },
    signup: async (email: string, password: string, username: string) => {
      const response = await apiClient.post('/api/auth/signup', { email, password, username });
      if (response.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response;
    },
    adminSignup: (data: { username: string; email: string; password: string; adminKey: string }) =>
      apiClient.post('/api/auth/admin-signup', data),
  },

  // Problems methods
  problems: {
    getAll: () => apiClient.get('/api/problems'),
    getById: (id: string) => apiClient.get(`/api/problems/details-from-storage/${id}`),
    search: (query: string) => apiClient.post('/api/problems/search', { query }),
    fromStorage: () => apiClient.get('/api/problems/from-storage'),
  },

  // Submissions methods
  submissions: {
    submit: (data: any) => apiClient.post('/api/submissions/submit', data, true),
    getByUser: (userId: string) =>
      apiClient.get(`/api/submissions/user/${userId}`, true),
    getById: (id: string) => apiClient.get(`/api/submissions/${id}`, true),
  },

  // Progress methods
  progress: {
    getByUser: (userId: string) => apiClient.get(`/api/progress/${userId}`, true),
    getLeaderboard: () => apiClient.get('/api/progress/leaderboard', true),
  },
}; 