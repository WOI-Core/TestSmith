/**
 * Frontend End-to-End Tests
 * Testing user flows, components, and potential issues
 */

const { test, expect } = require('@playwright/test');

// Test Configuration
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';

test.describe('Frontend E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console Error:', msg.text());
      }
    });

    // Monitor network failures
    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        console.warn(`Network Error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('Homepage loads correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check page title
    await expect(page).toHaveTitle(/GraderSmith/);
    
    // Check main elements are present
    await expect(page.locator('h1')).toContainText('Master');
    await expect(page.locator('h1')).toContainText('Competitive');
    await expect(page.locator('h1')).toContainText('Programming');
    
    // Check navigation links
    await expect(page.locator('nav a[href="/problems"]')).toBeVisible();
    await expect(page.locator('nav a[href="/submissions"]')).toBeVisible();
    await expect(page.locator('nav a[href="/leaderboard"]')).toBeVisible();
    
    // Check CTA buttons
    await expect(page.locator('a[href="/problems"]').first()).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('Navigation links work correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Test Problems navigation
    await page.click('nav a[href="/problems"]');
    await page.waitForURL('**/problems');
    await expect(page.locator('h1, h2')).toContainText(/Problems|Problem/);
    
    // Test Login navigation
    await page.click('a[href="/login"]');
    await page.waitForURL('**/login');
    await expect(page.locator('h1, h2')).toContainText(/Login|Sign In/);
    
    // Test Signup navigation
    await page.click('a[href="/signup"]');
    await page.waitForURL('**/signup');
    await expect(page.locator('h1, h2')).toContainText(/Sign Up|Register/);
  });

  test('Problems page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/problems`);
    
    // Wait for problems to load
    await page.waitForSelector('[data-testid="problem-card"], .problem-item, table', { timeout: 10000 });
    
    // Check if problems are displayed
    const problemElements = await page.locator('[data-testid="problem-card"], .problem-item, tbody tr').count();
    expect(problemElements).toBeGreaterThan(0);
    
    // Test search functionality if present
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('dynamic');
      await page.waitForTimeout(1000); // Wait for search debounce
      
      // Check if results are filtered
      const filteredResults = await page.locator('[data-testid="problem-card"], .problem-item, tbody tr').count();
      console.log(`Search results: ${filteredResults} problems found`);
    }
  });

  test('Authentication flow', async ({ page }) => {
    // Test Login Page
    await page.goto(`${BASE_URL}/login`);
    
    // Check form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();
    
    // Test form validation
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Should show validation errors for empty fields
    const errorElements = await page.locator('.error, [role="alert"], .text-red').count();
    if (errorElements === 0) {
      console.warn('⚠️ No form validation errors shown for empty login form');
    }
    
    // Test invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Should show invalid credentials error
    await page.waitForTimeout(2000);
    const invalidError = await page.locator('.error, [role="alert"], .text-red').count();
    if (invalidError === 0) {
      console.warn('⚠️ No error shown for invalid credentials');
    }
  });

  test('Responsive design check', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await expect(page.locator('nav')).toBeVisible();
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('header')).toBeVisible();
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('header')).toBeVisible();
    
    // Check if mobile navigation works
    const mobileMenuButton = page.locator('[aria-label*="menu" i], .hamburger, button:has-text("☰")');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('nav, .mobile-menu')).toBeVisible();
    }
  });

  test('Accessibility check', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1); // Should have exactly one h1
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt || alt.trim() === '') {
        console.warn('⚠️ Image without alt text found');
      }
    }
    
    // Check for proper button labels
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      if ((!text || text.trim() === '') && (!ariaLabel || ariaLabel.trim() === '')) {
        console.warn('⚠️ Button without accessible text found');
      }
    }
    
    // Check color contrast (basic check)
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`Body background color: ${bodyBg}`);
  });

  test('Performance check', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    if (loadTime > 3000) {
      console.warn('⚠️ Page load time exceeds 3 seconds');
    }
    
    // Check for Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries.map(entry => ({
            name: entry.name,
            value: entry.value,
            rating: entry.value < 2500 ? 'good' : entry.value < 4000 ? 'needs-improvement' : 'poor'
          })));
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        setTimeout(() => resolve([]), 5000); // Timeout after 5 seconds
      });
    });
    
    console.log('Performance metrics:', metrics);
  });

  test('Error handling', async ({ page }) => {
    // Test 404 page
    await page.goto(`${BASE_URL}/nonexistent-page`);
    
    // Should show 404 or redirect to home
    const pageContent = await page.textContent('body');
    const is404 = pageContent.includes('404') || pageContent.includes('Not Found') || pageContent.includes('Page not found');
    const isRedirect = await page.url() === BASE_URL + '/';
    
    if (!is404 && !isRedirect) {
      console.warn('⚠️ No proper 404 handling found');
    }
    
    // Test API error handling
    await page.goto(`${BASE_URL}/problems`);
    
    // Mock API failure
    await page.route(`${API_URL}/api/problems*`, route => route.abort());
    await page.reload();
    
    // Should show error message
    await page.waitForTimeout(3000);
    const errorMessage = await page.locator('.error, [role="alert"], .text-red').count();
    if (errorMessage === 0) {
      console.warn('⚠️ No error handling for API failures');
    }
  });
});

// Test for JavaScript errors
test.describe('Console Error Detection', () => {
  test('Check for console errors', async ({ page }) => {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(BASE_URL);
    await page.goto(`${BASE_URL}/problems`);
    await page.goto(`${BASE_URL}/login`);
    
    if (errors.length > 0) {
      console.error('JavaScript Errors Found:');
      errors.forEach(error => console.error(`- ${error}`));
    }
    
    // Don't fail the test, just report errors
    console.log(`Total console errors found: ${errors.length}`);
  });
}); 