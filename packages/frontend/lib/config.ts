/**
 * Frontend Configuration
 * Centralized configuration for API endpoints, URLs, and constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      SIGNUP: '/api/auth/signup',
      LOGOUT: '/api/auth/logout',
    },
    PROBLEMS: {
      LIST: '/api/problems',
      SEARCH: '/api/problems/search',
      BY_ID: (id: string) => `/api/problems/${id}`,
      FROM_STORAGE: '/api/problems/from-storage',
      SYNC: '/api/problems/sync-searchsmith',
    },
    SUBMISSIONS: {
      SUBMIT: '/api/submissions/submit',
      BY_USER: (userId: string) => `/api/submissions/user/${userId}`,
      BY_ID: (id: string) => `/api/submissions/${id}`,
    },
    PROGRESS: {
      USER: (userId: string) => `/api/progress/${userId}`,
    },
    TOOLSMITH: {
      GENERATE: '/api/toolsmith',
    },
  },
} as const;

// Build full URL helper
export const buildApiUrl = (endpoint: string): string => {
  // If endpoint already starts with /api, don't prepend base URL
  if (endpoint.startsWith('/api')) {
    return endpoint;
  }
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Request configuration defaults
export const REQUEST_CONFIG = {
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
  TIMEOUT: 30000, // 30 seconds
} as const;

// Application Constants
export const APP_CONFIG = {
  NAME: 'GraderSmith',
  VERSION: '1.0.0',
  DESCRIPTION: 'Competitive Programming Platform',
  
  // UI Constants
  ITEMS_PER_PAGE: 20,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_LANGUAGES: [
    { id: 'cpp', name: 'C++', extension: '.cpp' },
    { id: 'python', name: 'Python', extension: '.py' },
    { id: 'java', name: 'Java', extension: '.java' },
    { id: 'javascript', name: 'JavaScript', extension: '.js' },
  ],
  
  // Validation
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
  },
} as const;

// Environment-specific configurations
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDebugMode: process.env.NEXT_PUBLIC_DEBUG === 'true',
} as const;

// Export types for better TypeScript support
export type ApiEndpoint = keyof typeof API_CONFIG.ENDPOINTS;
export type SupportedLanguage = typeof APP_CONFIG.SUPPORTED_LANGUAGES[number]; 