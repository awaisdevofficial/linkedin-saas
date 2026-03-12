/**
 * PM2 ecosystem file. Run from repo root: pm2 start ecosystem.config.cjs
 * Backend runs with cwd=backend so server.js finds backend/.env.
 */
module.exports = {
  apps: [
    {
      name: 'postpilot-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'postpilot-automation',
      cwd: './backend',
      script: 'automation.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
