/**
 * Input Validation Utilities
 * Centralized validation for forms and user inputs
 */

import { APP_CONFIG } from './config';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Email validation with comprehensive checks
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  if (email.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  if (!APP_CONFIG.VALIDATION.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for common security issues
  if (email.includes('<script') || email.includes('javascript:')) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
};

/**
 * Password validation with security requirements
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < APP_CONFIG.VALIDATION.PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${APP_CONFIG.VALIDATION.PASSWORD_MIN_LENGTH} characters long` 
    };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (max 128 characters)' };
  }

  // Check for basic complexity
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const complexityScore = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChar].filter(Boolean).length;

  if (complexityScore < 3) {
    return { 
      isValid: false, 
      error: 'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters' 
    };
  }

  // Check for common weak patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /123456/, // Sequential numbers
    /password/i, // Contains "password"
    /admin/i, // Contains "admin"
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      return { isValid: false, error: 'Password contains common patterns and is not secure' };
    }
  }

  return { isValid: true };
};

/**
 * Username validation
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < APP_CONFIG.VALIDATION.USERNAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Username must be at least ${APP_CONFIG.VALIDATION.USERNAME_MIN_LENGTH} characters long` 
    };
  }

  if (username.length > APP_CONFIG.VALIDATION.USERNAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Username must be no more than ${APP_CONFIG.VALIDATION.USERNAME_MAX_LENGTH} characters long` 
    };
  }

  // Only allow alphanumeric and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(username)) {
    return { isValid: false, error: 'Username must start with a letter' };
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'user', 'guest', 'test', 'demo',
    'api', 'www', 'mail', 'ftp', 'localhost', 'moderator', 'support'
  ];

  if (reservedUsernames.includes(username.toLowerCase())) {
    return { isValid: false, error: 'This username is reserved' };
  }

  // Check for XSS attempts
  if (username.includes('<') || username.includes('>') || username.includes('&')) {
    return { isValid: false, error: 'Username contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * File validation for uploads
 */
export const validateFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  // Check file size
  if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = APP_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  // Check file type
  const allowedExtensions = APP_CONFIG.SUPPORTED_LANGUAGES.map(lang => lang.extension);
  const fileName = file.name.toLowerCase();
  const isAllowedType = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!isAllowedType) {
    return { 
      isValid: false, 
      error: `File type not supported. Allowed types: ${allowedExtensions.join(', ')}` 
    };
  }

  // Check for dangerous file names
  const dangerousPatterns = [
    /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i, /\.pif$/i,
    /\.php$/i, /\.asp$/i, /\.jsp$/i, /\.sh$/i, /\.com$/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(fileName)) {
      return { isValid: false, error: 'File type not allowed for security reasons' };
    }
  }

  return { isValid: true };
};

/**
 * Generic text input validation (for descriptions, comments, etc.)
 */
export const validateTextInput = (text: string, maxLength: number = 1000): ValidationResult => {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Text is required' };
  }

  if (text.length > maxLength) {
    return { isValid: false, error: `Text must be no more than ${maxLength} characters` };
  }

  // Check for XSS attempts
  const xssPatterns = [
    /<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<object/i, /<embed/i
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(text)) {
      return { isValid: false, error: 'Text contains invalid content' };
    }
  }

  return { isValid: true };
};

/**
 * Validate multiple fields at once
 */
export const validateForm = (fields: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): {
  isValid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    const validator = rules[fieldName];
    if (validator) {
      const result = validator(value);
      if (!result.isValid && result.error) {
        errors[fieldName] = result.error;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Custom validation hook for React components
 */
export const useValidation = () => {
  const validate = (value: any, validator: (value: any) => ValidationResult) => {
    return validator(value);
  };

  const validateField = (fieldName: string, value: any, rules: Record<string, (value: any) => ValidationResult>) => {
    const validator = rules[fieldName];
    return validator ? validator(value) : { isValid: true };
  };

  return { validate, validateField, validateForm };
}; 