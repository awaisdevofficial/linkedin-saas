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

echo "========== 4. PM2 restart =========="
pm2 restart all 2>/dev/null || true
pm2 list
echo ""

echo "========== Done =========="
