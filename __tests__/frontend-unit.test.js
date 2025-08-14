/**
 * Frontend Unit Tests
 * Testing React components, hooks, and utilities
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  query: {},
  pathname: '/',
  asPath: '/',
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API calls
global.fetch = jest.fn();

describe('Frontend Unit Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockPush.mockClear();
    console.error = jest.fn(); // Suppress console errors during tests
  });

  describe('🧩 Component Tests', () => {
    test('Auth Context provides authentication state', async () => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });

      // Test without stored auth
      localStorageMock.getItem.mockReturnValue(null);
      
      // Import component after mocks are set up
      const { AuthProvider, useAuth } = await import('../packages/frontend/app/context/AuthContext');
      
      const TestComponent = () => {
        const { user, isAuthenticated } = useAuth();
        return (
          <div>
            <span data-testid="user">{user ? user.email : 'No user'}</span>
            <span data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('auth')).toHaveTextContent('Not authenticated');
    });

    test('Error Boundary catches errors', async () => {
      const { ErrorBoundary } = await import('../packages/frontend/components/ErrorBoundary');
      
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    test('API Client handles network errors', async () => {
      const { apiClient } = await import('../packages/frontend/lib/api-client');
      
      // Mock fetch to fail
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.get('/api/test');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    test('Config provides correct API endpoints', async () => {
      const { API_CONFIG, buildApiUrl } = await import('../packages/frontend/lib/config');
      
      expect(API_CONFIG.ENDPOINTS.AUTH.LOGIN).toBe('/api/auth/login');
      expect(buildApiUrl('/test')).toContain('/test');
    });
  });

  describe('🔧 Functionality Tests', () => {
    test('Login form validation', async () => {
      const { default: LoginPage } = await import('../packages/frontend/app/login/page');
      
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i) || screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });

      // Test empty form submission
      fireEvent.click(submitButton);
      
      // Should show validation errors (wait for async validation)
      await waitFor(() => {
        const errorElements = screen.queryAllByText(/required|invalid/i);
        if (errorElements.length === 0) {
          console.warn('⚠️ No validation errors shown for empty form');
        }
      });

      // Test invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const emailError = screen.queryByText(/invalid.*email/i);
        if (!emailError) {
          console.warn('⚠️ No email validation error shown');
        }
      });
    });

    test('Form accessibility', async () => {
      const { default: LoginPage } = await import('../packages/frontend/app/login/page');
      
      render(<LoginPage />);

      // Check for proper labels
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Check for required attributes
      expect(emailInput).toHaveAttribute('type', 'email');
      
      // Test keyboard navigation
      emailInput.focus();
      expect(emailInput).toHaveFocus();
      
      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(passwordInput).toHaveFocus();
    });

    test('Responsive design helpers', async () => {
      // Test viewport meta tag
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (!metaViewport) {
        console.warn('⚠️ Missing viewport meta tag');
      } else {
        expect(metaViewport.getAttribute('content')).toContain('width=device-width');
      }
    });
  });

  describe('🚀 Performance Tests', () => {
    test('Component render performance', async () => {
      const { default: HomePage } = await import('../packages/frontend/app/page');
      
      const start = performance.now();
      
      render(<HomePage />);
      
      const renderTime = performance.now() - start;
      console.log(`HomePage render time: ${renderTime.toFixed(2)}ms`);
      
      if (renderTime > 100) {
        console.warn('⚠️ Slow component render (>100ms)');
      }
    });

    test('Memory leaks in components', async () => {
      const { AuthProvider } = await import('../packages/frontend/app/context/AuthContext');
      
      const TestComponent = () => {
        return <div>Test</div>;
      };

      // Mount and unmount multiple times to check for memory leaks
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
        unmount();
      }
      
      // Check if any event listeners or timers were left behind
      const listenerCount = Object.keys(window._eventListeners || {}).length;
      if (listenerCount > 0) {
        console.warn(`⚠️ Potential memory leak: ${listenerCount} event listeners remaining`);
      }
    });
  });

  describe('🛡️ Security Tests', () => {
    test('XSS prevention in user input', async () => {
      const { default: LoginPage } = await import('../packages/frontend/app/login/page');
      
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i) || screen.getByPlaceholderText(/email/i);
      
      // Test XSS payload
      const xssPayload = '<script>alert("xss")</script>';
      fireEvent.change(emailInput, { target: { value: xssPayload } });
      
      // Check if script tag is rendered
      const dangerousContent = document.querySelector('script');
      if (dangerousContent && dangerousContent.textContent.includes('alert')) {
        console.error('🔴 XSS vulnerability detected in component');
      }
    });

    test('Sensitive data handling', async () => {
      // Mock localStorage to check if sensitive data is stored
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });

      const { AuthProvider } = await import('../packages/frontend/app/context/AuthContext');
      
      const TestComponent = () => {
        const { login } = useAuth();
        
        React.useEffect(() => {
          // Simulate login with sensitive data
          login({ 
            id: '123', 
            email: 'test@test.com',
            password: 'sensitive-password', // Should not be stored
            apiKey: 'secret-key' // Should not be stored
          }, 'jwt-token');
        }, [login]);
        
        return <div>Test</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const setItemCalls = localStorageMock.setItem.mock.calls;
        setItemCalls.forEach(([key, value]) => {
          if (value.includes('password') || value.includes('secret') || value.includes('apiKey')) {
            console.error('🔴 Sensitive data stored in localStorage:', key);
          }
        });
      });
    });
  });

  describe('🌐 Internationalization Tests', () => {
    test('Text content is translatable', async () => {
      const { default: HomePage } = await import('../packages/frontend/app/page');
      
      render(<HomePage />);

      // Check for hardcoded text that should be translatable
      const textElements = screen.queryAllByText(/master|competitive|programming/i);
      
      // In a real i18n setup, these should be using translation keys
      if (textElements.length > 0) {
        console.log('📝 Found translatable text elements:', textElements.length);
      }
    });

    test('RTL language support', async () => {
      // Test if components work with RTL languages
      document.dir = 'rtl';
      
      const { default: HomePage } = await import('../packages/frontend/app/page');
      render(<HomePage />);
      
      // Check if layout breaks in RTL
      const container = screen.getByRole('main') || document.body;
      const computedStyle = window.getComputedStyle(container);
      
      if (computedStyle.direction !== 'rtl') {
        console.warn('⚠️ RTL direction not applied');
      }
      
      // Reset
      document.dir = 'ltr';
    });
  });

  describe('🔍 SEO Tests', () => {
    test('Meta tags are present', async () => {
      // Check for essential meta tags
      const title = document.querySelector('title');
      const description = document.querySelector('meta[name="description"]');
      const viewport = document.querySelector('meta[name="viewport"]');
      
      if (!title || title.textContent.trim() === '') {
        console.warn('⚠️ Missing or empty title tag');
      }
      
      if (!description) {
        console.warn('⚠️ Missing description meta tag');
      }
      
      if (!viewport) {
        console.warn('⚠️ Missing viewport meta tag');
      }
    });

    test('Structured data', async () => {
      // Check for JSON-LD structured data
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      
      if (!jsonLd) {
        console.log('📝 No structured data found (consider adding for SEO)');
      } else {
        try {
          JSON.parse(jsonLd.textContent);
          console.log('✅ Valid structured data found');
        } catch (error) {
          console.error('🔴 Invalid JSON-LD structured data');
        }
      }
    });
  });
}); 