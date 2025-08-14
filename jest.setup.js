/**
 * Jest Setup File
 * Global test configuration and mocks
 */

import '@testing-library/jest-dom';

// Mock Next.js components and hooks
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NEXT_PUBLIC_API_URL: 'http://localhost:3001',
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  })
);

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockReturnValue(undefined);
  localStorageMock.removeItem.mockReturnValue(undefined);
  localStorageMock.clear.mockReturnValue(undefined);
  
  // Suppress console errors and warnings during tests unless they're part of the test
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.testUtils = {
  // Mock user object
  mockUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    created_at: '2023-01-01T00:00:00Z',
  },
  
  // Mock problem object
  mockProblem: {
    problem_id: 'test-problem',
    problem_name: 'Test Problem',
    difficulty: 800,
    tags: ['test', 'example'],
    is_tagged: true,
  },
  
  // Mock submission object
  mockSubmission: {
    submission_id: 'test-submission',
    problem_id: 'test-problem',
    user_id: 'test-user-id',
    status: 'Accepted',
    language: 'cpp',
    submitted_at: '2023-01-01T00:00:00Z',
  },
  
  // Helper to wait for async operations
  waitFor: (callback, options = {}) => {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 5000;
      const interval = options.interval || 50;
      const startTime = Date.now();
      
      const check = () => {
        try {
          if (callback()) {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(check, interval);
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(check, interval);
          }
        }
      };
      
      check();
    });
  },
};

// Fail tests on console errors (except for expected ones)
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only fail on real errors, not test-related ones
  const message = args.join(' ');
  if (
    !message.includes('Warning:') &&
    !message.includes('jest') &&
    !message.includes('test') &&
    !message.includes('Warning: ReactDOM.render')
  ) {
    originalConsoleError(...args);
    throw new Error(`Console error detected: ${message}`);
  }
}; 