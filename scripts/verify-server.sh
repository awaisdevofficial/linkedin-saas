#!/bin/bash
# Run on server after deploy: cd /path/to/linkedin-saas && bash scripts/verify-server.sh
# Checks: code in place, PM2, backend health, automation + webhook job logs.

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "========== 1. Code & files =========="
test -f backend/src/jobs/webhook-like-comment.job.js && echo "  OK webhook-like-comment.job.js" || { echo "  FAIL missing webhook job"; exit 1; }
test ! -f backend/src/jobs/engage.job.js && echo "  OK engage.job.js removed" || { echo "  FAIL old engage job still present"; exit 1; }
test -f supabase/engagement_webhook_last_sent.sql && echo "  OK engagement_webhook_last_sent.sql" || { echo "  FAIL missing migration"; exit 1; }
test -f supabase/linkedin_connections_rls.sql && echo "  OK linkedin_connections_rls.sql" || echo "  (optional) linkedin_connections_rls.sql"
grep -q "runWebhookLikeCommentJob\|webhook_like_comment" backend/src/scheduler/index.js && echo "  OK scheduler registers webhook job" || { echo "  FAIL scheduler missing webhook"; exit 1; }
echo ""

echo "========== 2. PM2 processes =========="
pm2 list 2>&1
echo ""

echo "========== 3. Backend health =========="
curl -sf http://127.0.0.1:4000/health 2>&1 && echo "" && echo "  OK backend responding" || echo "  WARN backend not responding on 4000"
echo ""

echo "========== 4. Automation / webhook job (recent logs) =========="
if pm2 describe postpilot-automation &>/dev/null; then
  echo "  Last 80 automation log lines (look for webhook_like_comment):"
  pm2 logs postpilot-automation --lines 80 --nostream 2>&1 | tail -85
  echo ""
  if pm2 logs postpilot-automation --lines 500 --nostream 2>&1 | grep -q "webhook_like_comment"; then
    echo "  OK webhook_like_comment job appears in logs (cron runs every 5 min)"
  else
    echo "  INFO no webhook_like_comment in last 500 lines yet (wait ~5 min or check cron)"
  fi
else
  echo "  WARN postpilot-automation not in PM2"
fi
echo ""

echo "========== 5. Webhook URL reachable =========="
WEBHOOK_URL="https://auto.nsolbpo.com/webhook/Like&Comment"
if curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 5 "$WEBHOOK_URL" 2>/dev/null | grep -qE '^[0-9]+$'; then
  echo "  OK webhook endpoint reachable (HTTP check)"
else
  echo "  (curl may fail on POST-only endpoint; check automation logs when job runs)"
fi
echo ""

echo "========== Verify done =========="
