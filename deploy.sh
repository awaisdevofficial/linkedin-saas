#!/bin/bash
# Server deploy script - run from project root on the server (e.g. ~/linkedin-saas)
# Usage: cd /path/to/linkedin-saas && bash deploy.sh
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Pulling latest code..."
git pull origin master

echo "==> Verifying key changes are present..."
test -f backend/src/jobs/webhook-like-comment.job.js || { echo "Missing webhook-like-comment.job.js"; exit 1; }
test ! -f backend/src/jobs/engage.job.js || { echo "Old engage.job.js still present"; exit 1; }
test ! -f backend/src/jobs/reply.job.js || { echo "Old reply.job.js still present"; exit 1; }
test -f frontend/src/lib/automation.ts || { echo "Missing frontend automation.ts"; exit 1; }
test -f backend/src/jobs/webhook-reply-comments.job.js || { echo "Missing webhook-reply-comments.job.js"; exit 1; }
test -f supabase/engagement_webhook_last_sent.sql || { echo "Missing migration engagement_webhook_last_sent.sql"; exit 1; }
test -f supabase/reply_webhook_last_sent.sql || { echo "Missing migration reply_webhook_last_sent.sql"; exit 1; }
test -f supabase/engagement_settings_reply_and_window.sql || { echo "Missing migration engagement_settings_reply_and_window.sql"; exit 1; }
grep -q "trigger-like-comment\|trigger-reply-comments" backend/server.js || { echo "Missing automation proxy routes in server.js"; exit 1; }
echo "    OK: webhook jobs (like/comment + reply), automation proxy routes, migrations in place"

echo "==> Installing root dependencies..."
npm install
echo "==> Installing frontend dependencies..."
npm install --prefix frontend
echo "==> Installing backend dependencies..."
npm install --prefix backend
echo "==> Building frontend..."
npm run build:frontend

# Allow nginx (www-data) to read frontend dist (adjust path if not ubuntu)
DIST_DIR="$ROOT/frontend/dist"
chmod o+x "$(dirname "$ROOT")" "$ROOT" "$ROOT/frontend" "$DIST_DIR" 2>/dev/null || true
chmod -R o+r "$DIST_DIR" 2>/dev/null || true

# Copy frontend to nginx docroot so SPA (including /pricing, /terms-and-conditions, etc.) is served
if [ -d "$DIST_DIR" ]; then
  echo "==> Deploying frontend to /var/www/html..."
  sudo cp -r "$DIST_DIR"/* /var/www/html/ && echo "    OK: frontend copied" || echo "    WARN: copy failed (run: sudo cp -r $ROOT/frontend/dist/* /var/www/html/)"
  sudo nginx -t 2>/dev/null && sudo systemctl reload nginx 2>/dev/null && echo "    OK: nginx reloaded" || true
fi

echo "==> Restarting backend and automation (PM2)..."
pm2 restart all --update-env 2>/dev/null || true

echo "==> Deploy done. Changes verified and services restarted."
