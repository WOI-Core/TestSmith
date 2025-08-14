const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '../.env.local' }); // Override with root env if exists
const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const progressRoutes = require('./routes/progressRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const rateLimit = require('express-rate-limit');
const PQueue = require('p-queue').default;
const { authenticateToken, optionalAuth } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy for rate limiting and security
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many authentication attempts, please try again later.'
    }
});

const queue = new PQueue({ concurrency: 10 });

app.use(limiter);

app.use((req, res, next) => {
    queue.add(() => next());
});

app.disable('etag');
app.disable('x-powered-by');

// Secure CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', // In case frontend runs on 3001
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://localhost:3000', // HTTPS variants
  'https://localhost:3001',
  'http://34.143.158.179', // Production IP
  'https://34.143.158.179', // Production IP with HTTPS
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  // Add common production domains
  'https://*.vercel.app',
  'https://*.netlify.app'
].filter(Boolean);

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Proxy middleware for Python services
app.use('/searchsmith-api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: { '^/searchsmith-api': '' },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(503).json({
      success: false,
      error: 'Search service temporarily unavailable'
    });
  }
}));

// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('--- INCOMING REQUEST ---');
    console.log(`[Request Logger] Timestamp: ${new Date().toISOString()}`);
    console.log(`[Request Logger] Method: ${req.method}`);
    console.log(`[Request Logger] Path: ${req.originalUrl}`);
    console.log('--------------------------');
    next();
  });
}

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/problems', optionalAuth, problemRoutes);
app.use('/api/submissions', authenticateToken, submissionRoutes);
app.use('/api/progress', authenticateToken, progressRoutes);
app.use('/api/webhooks', webhookRoutes); // Webhooks don't need auth but should have IP validation

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Global error handler
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

app.listen(port, () => {
  console.log('✅ Server initialized successfully');
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  console.log(`🔒 Security middleware enabled`);
  console.log(`📊 Rate limiting: 100 requests per 15 minutes`);
});