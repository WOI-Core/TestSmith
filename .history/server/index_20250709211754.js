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

// --- Middleware ---

// 1. CORS Middleware: Allows requests from your frontend.
app.use(cors({
  origin: 'http://localhost:3000', // The origin of your Next.js app
}));

// 2. Body Parser Middleware: To parse JSON request bodies.
app.use(express.json());

// 3. Proxy Middleware: Forwards specific requests.
// Ensure this path is unique and does not conflict with your own API routes.
app.use('/searchsmith-api', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/searchsmith-api': '', // remove the base path
    },
}));


// --- API Routes ---

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/progress', progressRoutes);


// --- Server Initialization ---

app.listen(port, () => {
    console.log('✅ Server initialized successfully');
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
    console.log(`🕐 Server timezone set to ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});