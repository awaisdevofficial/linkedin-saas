#!/bin/bash
# Server deploy script - run from project root on the server (e.g. ~/linkedin-saas)
set -e
echo "==> Pulling latest code..."
git pull origin master
echo "==> Installing root dependencies..."
npm install
echo "==> Building frontend..."
npm run build:frontend
echo "==> Restarting backend (if using PM2)..."
pm2 restart all 2>/dev/null || true
echo "==> Deploy done."
