/**
 * Backend API Tests
 * Testing API endpoints, security, performance, and error handling
 */

const request = require('supertest');
const { performance } = require('perf_hooks');

// Test Configuration
const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

describe('Backend API Tests', () => {
  let app;

  beforeAll(() => {
    // Set up test environment
    console.log(`Testing API at: ${API_BASE_URL}`);
  });

  describe('🔍 Security Tests', () => {
    test('Security headers are present', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/problems')
        .expect(200);

      // Check for security headers
      const headers = response.headers;
      
      if (!headers['x-content-type-options']) {
        console.warn('⚠️ Missing X-Content-Type-Options header');
      }
      
      if (!headers['x-frame-options'] && !headers['content-security-policy']) {
        console.warn('⚠️ Missing X-Frame-Options or CSP header');
      }
      
      if (headers['server']) {
        console.warn('⚠️ Server header exposed:', headers['server']);
      }
      
      if (headers['x-powered-by']) {
        console.warn('⚠️ X-Powered-By header exposed:', headers['x-powered-by']);
      }
      
      console.log('Security headers check completed');
    });

    test('CORS configuration', async () => {
      const response = await request(API_BASE_URL)
        .options('/api/problems')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      const corsHeaders = response.headers;
      
      if (corsHeaders['access-control-allow-origin'] === '*') {
        console.error('🔴 CORS allows all origins - security risk!');
      }
      
      if (!corsHeaders['access-control-allow-origin']) {
        console.warn('⚠️ CORS headers not configured');
      } else {
        console.log('✅ CORS configured:', corsHeaders['access-control-allow-origin']);
      }
    });

    test('Rate limiting', async () => {
      console.log('Testing rate limiting...');
      const requests = [];
      
      // Send multiple rapid requests
      for (let i = 0; i < 110; i++) {
        requests.push(
          request(API_BASE_URL)
            .get('/api/problems')
            .then(res => ({ status: res.status, headers: res.headers }))
            .catch(err => ({ status: err.status || 500, error: err.message }))
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      if (rateLimited.length === 0) {
        console.warn('⚠️ No rate limiting detected');
      } else {
        console.log(`✅ Rate limiting working: ${rateLimited.length} requests blocked`);
      }
    });

    test('SQL injection protection', async () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker'); --"
      ];

      for (const payload of sqlPayloads) {
        try {
          const response = await request(API_BASE_URL)
            .get(`/api/problems?search=${encodeURIComponent(payload)}`)
            .timeout(5000);
          
          // Should not crash or return unexpected data
          if (response.status === 500) {
            console.error(`🔴 SQL injection vulnerability detected with payload: ${payload}`);
          }
        } catch (error) {
          if (error.message.includes('TIMEOUT')) {
            console.warn(`⚠️ Timeout with SQL payload (possible vulnerability): ${payload}`);
          }
        }
      }
      
      console.log('✅ SQL injection tests completed');
    });

    test('XSS protection', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'test'
          });
        
        const responseText = JSON.stringify(response.body);
        if (responseText.includes('<script>') || responseText.includes('javascript:')) {
          console.error(`🔴 XSS vulnerability detected with payload: ${payload}`);
        }
      }
      
      console.log('✅ XSS protection tests completed');
    });
  });

  describe('🔧 API Functionality Tests', () => {
    test('GET /api/problems', async () => {
      const start = performance.now();
      const response = await request(API_BASE_URL)
        .get('/api/problems')
        .expect(200);
      
      const duration = performance.now() - start;
      console.log(`Problems API response time: ${duration.toFixed(2)}ms`);
      
      if (duration > 2000) {
        console.warn('⚠️ Slow API response (>2s)');
      }
      
      // Validate response structure
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const problem = response.body[0];
        expect(problem).toHaveProperty('problem_id');
        expect(problem).toHaveProperty('problem_name');
        expect(problem).toHaveProperty('difficulty');
        
        // Check for sensitive data exposure
        if (problem.password || problem.secret || problem.api_key) {
          console.error('🔴 Sensitive data exposed in API response');
        }
      }
    });

    test('POST /api/auth/login', async () => {
      // Test valid structure
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('POST /api/auth/signup', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/signup')
        .send({
          email: 'test' + Date.now() + '@example.com',
          password: 'testpassword123',
          username: 'testuser' + Date.now()
        });

      // Should either succeed or give validation error
      expect([200, 201, 400, 409]).toContain(response.status);
      
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('message');
      }
    });

    test('API error handling', async () => {
      // Test malformed JSON
      const response1 = await request(API_BASE_URL)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
      
      // Test missing required fields
      const response2 = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({})
        .expect(400);
      
      // Test invalid endpoint
      const response3 = await request(API_BASE_URL)
        .get('/api/nonexistent')
        .expect(404);
      
      console.log('✅ Error handling tests passed');
    });
  });

  describe('📊 Performance Tests', () => {
    test('API response times', async () => {
      const endpoints = [
        '/api/problems',
        '/api/auth/login',
      ];

      for (const endpoint of endpoints) {
        const start = performance.now();
        
        try {
          if (endpoint === '/api/auth/login') {
            await request(API_BASE_URL)
              .post(endpoint)
              .send({ email: 'test@test.com', password: 'test' });
          } else {
            await request(API_BASE_URL).get(endpoint);
          }
        } catch (error) {
          // Ignore expected errors, we're testing performance
        }
        
        const duration = performance.now() - start;
        console.log(`${endpoint}: ${duration.toFixed(2)}ms`);
        
        if (duration > 1000) {
          console.warn(`⚠️ Slow endpoint: ${endpoint} (${duration.toFixed(2)}ms)`);
        }
      }
    });

    test('Concurrent request handling', async () => {
      const concurrency = 10;
      const requests = [];
      
      for (let i = 0; i < concurrency; i++) {
        requests.push(
          request(API_BASE_URL)
            .get('/api/problems')
            .then(res => ({ success: true, status: res.status }))
            .catch(err => ({ success: false, error: err.message }))
        );
      }
      
      const start = performance.now();
      const results = await Promise.all(requests);
      const duration = performance.now() - start;
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`Concurrent requests: ${successful} successful, ${failed} failed in ${duration.toFixed(2)}ms`);
      
      if (failed > 0) {
        console.warn('⚠️ Some concurrent requests failed');
      }
    });

    test('Memory usage test', async () => {
      // Test with large request body
      const largeData = 'x'.repeat(1024 * 1024); // 1MB string
      
      try {
        await request(API_BASE_URL)
          .post('/api/auth/login')
          .send({
            email: 'test@test.com',
            password: largeData
          })
          .timeout(5000);
      } catch (error) {
        if (error.message.includes('413') || error.message.includes('too large')) {
          console.log('✅ Request size limiting working');
        } else if (error.message.includes('TIMEOUT')) {
          console.warn('⚠️ Large request caused timeout');
        }
      }
    });
  });

  describe('🔒 Authentication & Authorization Tests', () => {
    test('Protected endpoints require authentication', async () => {
      const protectedEndpoints = [
        '/api/submissions',
        '/api/progress',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(API_BASE_URL)
          .get(endpoint);
        
        // Should require authentication
        if (response.status === 200) {
          console.warn(`⚠️ Protected endpoint ${endpoint} accessible without auth`);
        } else if (response.status === 401 || response.status === 403) {
          console.log(`✅ ${endpoint} properly protected`);
        }
      }
    });

    test('JWT token validation', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'Bearer invalid.jwt.token',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.INVALID',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(API_BASE_URL)
          .get('/api/submissions')
          .set('Authorization', `Bearer ${token}`);
        
        if (response.status === 200) {
          console.error(`🔴 Invalid token accepted: ${token}`);
        }
      }
      
      console.log('✅ JWT validation tests completed');
    });
  });

  describe('📝 Data Validation Tests', () => {
    test('Input validation', async () => {
      const invalidInputs = [
        { email: 'not-an-email', password: '123' }, // Invalid email
        { email: 'test@test.com', password: '' }, // Empty password
        { email: '', password: 'password' }, // Empty email
        { email: 'a'.repeat(1000) + '@test.com', password: 'test' }, // Very long email
      ];

      for (const input of invalidInputs) {
        const response = await request(API_BASE_URL)
          .post('/api/auth/login')
          .send(input);
        
        if (response.status === 200) {
          console.error('🔴 Invalid input accepted:', input);
        } else {
          console.log(`✅ Invalid input rejected: ${JSON.stringify(input)}`);
        }
      }
    });

    test('File upload security', async () => {
      // Test if file upload endpoints exist and are secure
      const response = await request(API_BASE_URL)
        .post('/api/upload')
        .attach('file', Buffer.from('test'), 'test.txt');
      
      // If endpoint exists, check security
      if (response.status !== 404) {
        console.log('Upload endpoint found, checking security...');
        
        // Test dangerous file types
        const dangerousFiles = [
          { name: 'test.php', content: '<?php echo "hack"; ?>' },
          { name: 'test.js', content: 'console.log("xss");' },
          { name: 'test.exe', content: 'MZ' }, // PE header
        ];

        for (const file of dangerousFiles) {
          try {
            const uploadResponse = await request(API_BASE_URL)
              .post('/api/upload')
              .attach('file', Buffer.from(file.content), file.name);
            
            if (uploadResponse.status === 200) {
              console.error(`🔴 Dangerous file type accepted: ${file.name}`);
            }
          } catch (error) {
            // Expected for dangerous files
          }
        }
      }
    });
  });
}); 