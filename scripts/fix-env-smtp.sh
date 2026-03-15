#!/bin/bash
# Quote SMTP_PASS in backend/.env if not already quoted (for values with spaces)
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "No $ENV_FILE found"
  exit 0
fi
if grep -q '^SMTP_PASS="' "$ENV_FILE" 2>/dev/null; then
  echo "SMTP_PASS already quoted"
else
  sed -i.bak 's/^SMTP_PASS=\([^"]*\)$/SMTP_PASS="\1"/' "$ENV_FILE"
  echo "SMTP_PASS quoted"
fi
grep '^SMTP_PASS=' "$ENV_FILE" || true
