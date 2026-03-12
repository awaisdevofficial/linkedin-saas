#!/bin/bash
# Run on server: bash scripts/log-health.sh
# Quick log health check for backend, automation, and nginx.
set -e
echo "========== PM2 Backend (last 15) =========="
pm2 logs postpilot-backend --lines 15 --nostream 2>&1 | tail -20
echo ""
echo "========== PM2 Automation (last 15) =========="
pm2 logs postpilot-automation --lines 15 --nostream 2>&1 | tail -20
echo ""
echo "========== Nginx error (last 10) =========="
sudo tail -10 /var/log/nginx/error.log 2>&1
echo ""
echo "========== Backend health =========="
curl -s http://127.0.0.1:4000/health 2>&1 || echo "backend not responding"
echo ""
