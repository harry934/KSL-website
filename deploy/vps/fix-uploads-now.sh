#!/usr/bin/env bash
# One-shot VPS fix for hanging Downloads uploads.
# Run on the VPS as moha:
#   bash /opt/kenyashipyards/admin-api/deploy/vps/fix-uploads-now.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORTAL="$ROOT/staff-portal"
NGINX_SRC="$ROOT/deploy/vps/nginx/kenyashipyards-ip.conf"
NGINX_DST="/etc/nginx/sites-available/kenyashipyards"

echo "==> Pull latest vps-postgres"
cd "$ROOT"
git fetch origin
git checkout vps-postgres
git pull origin vps-postgres

echo "==> Rebuild portal with production env"
cd "$PORTAL"
if [[ ! -f .env.production ]]; then
  echo "Missing $PORTAL/.env.production" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. ./.env.production
set +a
echo "BASE_PATH=${NEXT_PUBLIC_BASE_PATH:-<empty>}"
if [[ "${NEXT_PUBLIC_BASE_PATH:-}" != "/kwela" ]]; then
  echo "ERROR: NEXT_PUBLIC_BASE_PATH must be /kwela" >&2
  exit 1
fi
npm run build
sudo systemctl restart ksl-portal

echo "==> Install Nginx upload fix"
sudo cp "$NGINX_SRC" "$NGINX_DST"
if grep -q 'Connection "upgrade"' "$NGINX_DST"; then
  echo "ERROR: Nginx config still has Connection upgrade" >&2
  exit 1
fi
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done"
echo "Hard-refresh admin (Ctrl+Shift+R), then upload the brochure again."
echo "You should see: File uploaded successfully. Click Save..."
