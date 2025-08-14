module.exports = {
  apps: [
    /* ──────────── BACKEND ──────────── */
    {
      name: 'backend-dev',
      cwd: './packages/backend',
      script: 'pnpm',
      args: 'dev',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
    /* ──────────── FRONTEND ─────────── */
    {
      name: 'frontend-dev',
      cwd: './packages/frontend',
      script: 'pnpm',
      args: 'dev',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}; 