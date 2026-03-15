#!/bin/bash
# Run on server: cd /home/ubuntu/linkedin-saas && bash scripts/deploy-server.sh
# Pulls latest, builds frontend, updates nginx (if config changed), restarts PM2.

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "========== 1. Git pull =========="
git pull
echo ""

echo "========== 2. Frontend build =========="
cd frontend && npm run build && cd ..
echo ""

echo "========== 3. Nginx config =========="
if [ -f nginx-postpilot.conf ]; then
  sudo cp nginx-postpilot.conf /etc/nginx/sites-available/postpilot
  sudo nginx -t && sudo systemctl reload nginx && echo "  Nginx reloaded OK" || echo "  WARN nginx reload failed"
else
  echo "  (no nginx-postpilot.conf in repo)"
fi
echo ""

echo "========== 4. Backend .env check =========="
if [ -f backend/.env ]; then
  if ! grep -q '^SUPABASE_URL=.\+' backend/.env 2>/dev/null || ! grep -q '^SUPABASE_SERVICE_ROLE_KEY=.\+' backend/.env 2>/dev/null; then
    echo "  WARN: backend/.env should set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for admin login and DB."
    echo "  Edit backend/.env on this server, then run: pm2 restart postpilot-backend"
  fi
else
  echo "  WARN: backend/.env not found. Copy backend/.env.example to backend/.env and set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc."
fi
echo ""

echo "========== 5. PM2 restart =========="
pm2 restart all 2>/dev/null || true
pm2 list
echo ""

echo "========== Done =========="
