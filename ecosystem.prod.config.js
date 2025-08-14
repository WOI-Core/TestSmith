module.exports = {
  apps: [
    /* ──────────── BACKEND ──────────── */
    {
      name: 'backend-prod',
      cwd: './packages/backend',
      script: 'node',
      args: 'index.js',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
    },
    /* ──────────── FRONTEND ─────────── */
    {
      name: 'frontend-prod',
      cwd: './packages/frontend',
      script: 'pnpm',
      args: 'start',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: '/api',
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
}; 