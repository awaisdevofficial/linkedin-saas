#!/bin/bash
# Run on server: bash scripts/log-dump.sh
# Dump all available backend and automation logs for debugging.
# Paste the output and share for analysis.

echo "========== PM2 list =========="
pm2 list 2>&1
echo ""

echo "========== Backend (last 500 lines) =========="
pm2 logs postpilot-backend --lines 500 --nostream 2>&1
echo ""

echo "========== Backend raw out log =========="
cat ~/.pm2/logs/postpilot-backend-out.log 2>/dev/null || echo "(no file)"
echo ""

echo "========== Backend raw error log =========="
cat ~/.pm2/logs/postpilot-backend-error.log 2>/dev/null || echo "(no file)"
echo ""

echo "========== Automation OUT (last 500 lines) =========="
pm2 logs postpilot-automation --lines 500 --nostream 2>&1
echo ""

echo "========== Automation raw out log =========="
cat ~/.pm2/logs/postpilot-automation-out.log 2>/dev/null || echo "(no file)"
echo ""

echo "========== Automation raw error log =========="
cat ~/.pm2/logs/postpilot-automation-error.log 2>/dev/null || echo "(no file)"
echo ""

echo "========== Backend health =========="
curl -s http://127.0.0.1:4000/health 2>&1 || echo "backend not responding"
