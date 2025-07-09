const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config({ path: '../.env.local' });

const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const progressRoutes = require('./routes/progressRoutes');

const app = express();
const port = process.env.PORT || 3001;

console.log('--- SERVER INITIALIZING ---');

// --- Middleware ---

console.log('[Middleware] Configuring CORS...');
app.use(cors({ origin: 'http://localhost:3000' }));

console.log('[Middleware] Configuring body parser...');
app.use(express.json());

console.log('[Middleware] Configuring proxy...');
app.use('/searchsmith-api', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: { '^/searchsmith-api': '' },
}));

// --- Global Request Logger ---
app.use((req, res, next) => {
  console.log('--- INCOMING REQUEST ---');
  console.log(`[Request Logger] Timestamp: ${new Date().toISOString()}`);
  console.log(`[Request Logger] Method: ${req.method}`);
  console.log(`[Request Logger] Path: ${req.originalUrl}`);
  console.log(`[Request Logger] Headers:`, req.headers);
  console.log('--------------------------');
  next();
});

// --- API Routes ---
console.log('[Routes] Configuring API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/progress', progressRoutes);


// --- Server Initialization ---
app.listen(port, () => {
    console.log('✅ Server initialized successfully');
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
});