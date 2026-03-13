#!/bin/bash
# Server deploy script - run from project root on the server (e.g. ~/linkedin-saas)
set -e
echo "==> Pulling latest code..."
git pull origin master
echo "==> Installing root dependencies..."
npm install
echo "==> Installing frontend dependencies..."
npm install --prefix frontend
echo "==> Installing backend dependencies..."
npm install --prefix backend
echo "==> Building frontend..."
npm run build:frontend
# Allow nginx (www-data) to read frontend dist
chmod o+x ~ ~/linkedin-saas ~/linkedin-saas/frontend ~/linkedin-saas/frontend/dist 2>/dev/null || true
chmod -R o+r ~/linkedin-saas/frontend/dist 2>/dev/null || true
echo "==> Restarting backend and automation (PM2)..."
pm2 restart all --update-env 2>/dev/null || true
echo "==> Deploy done."
