module.exports = {
  apps: [
    /* ──────────── BACKEND ──────────── */
    {
      name: 'backend-dev',
      cwd: './packages/backend',
      script: 'pnpm',
      args: 'dev',          // runs `pnpm dev` (≙ next dev)
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
      args: 'dev',          // runs `pnpm dev` (≙ next dev; auto-picks port)
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
}; 