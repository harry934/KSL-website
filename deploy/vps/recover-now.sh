#!/bin/bash
# One-shot VPS recovery. Paste-friendly. Does not depend on unpushed local commits.
# Usage on the VPS:
#   cd /opt/kenyashipyards/admin-api && bash deploy/vps/recover-now.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
IP="${1:-178.162.219.218}"

echo "=== RECOVER START ==="
echo "Repo: $ROOT"
echo "Before: $(git log -1 --oneline)"

# Unblock pull (dirty package files from prior npm install).
git stash push -m "vps-recover-$(date +%Y%m%d%H%M%S)" -- staff-portal/package.json staff-portal/package-lock.json 2>/dev/null || true
git fetch origin
git checkout vps-postgres
git reset --hard origin/vps-postgres
echo "After pull: $(git log -1 --oneline)"

bash deploy/vps/fill-ip.sh --http "$IP"

cd staff-portal
npm install

# Prefer migrator file; never let runtime DATABASE_URL win. Migrate is optional for this recovery.
if [[ -f /etc/ksl-portal-migrator.env ]]; then
  echo "Attempting migrate..."
  if ! env -u DATABASE_URL -u DATABASE_SSL MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate; then
    echo "WARNING: migrate failed — continuing (delete/invite/redirect fixes are code-only)."
  fi
else
  echo "No migrator env file — skipping migrate."
fi

set -a
# shellcheck disable=SC1091
[[ -f .env.production ]] && . ./.env.production
# shellcheck disable=SC1091
[[ -f /etc/ksl-portal.env ]] && . /etc/ksl-portal.env
# shellcheck disable=SC1091
[[ -f .env.production ]] && . ./.env.production
set +a

echo "NEXT_PUBLIC_PORTAL_URL=${NEXT_PUBLIC_PORTAL_URL:-<missing>}"
echo "NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH:-<missing>}"
if [[ -z "${NEXT_PUBLIC_PORTAL_URL:-}" || -z "${NEXT_PUBLIC_BASE_PATH:-}" ]]; then
  echo "ERROR: missing NEXT_PUBLIC_PORTAL_URL or NEXT_PUBLIC_BASE_PATH" >&2
  exit 1
fi

npm run build
cd ..

bash deploy/vps/restart-portal.sh

PUBLIC_DEST=/var/www/kenyashipyards
[[ -d "$PUBLIC_DEST" ]] || PUBLIC_DEST=/var/www/ksl
DEST="$PUBLIC_DEST" bash deploy/vps/publish-public.sh

if [[ -f deploy/vps/nginx/kenyashipyards-ip.conf ]]; then
  sudo cp deploy/vps/nginx/kenyashipyards-ip.conf /etc/nginx/sites-available/kenyashipyards
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo
echo "=== VERIFY ==="
REDIRECT="$(curl -sS -D - -o /dev/null "http://${IP}/kwela/staff" | tr -d '\r' | grep -i '^location:' || true)"
echo "$REDIRECT"
echo "Commit: $(git log -1 --oneline)"
if echo "$REDIRECT" | grep -qi 'localhost'; then
  echo "FAIL: redirect still points at localhost — portal process was not replaced or NEXT_PUBLIC_PORTAL_URL was wrong at build time."
  exit 1
fi
echo "=== RECOVER OK ==="
