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

app.use(cors({
  origin: 'http://localhost:3000',
}));

app.use(express.json());

app.use('/searchsmith-api', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/searchsmith-api': '',
    },
}));

// --- New Request Logger Middleware ---
app.use((req, res, next) => {
  console.log(`[Request Logger] Method: ${req.method}, Path: ${req.originalUrl}`);
  next();
});

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