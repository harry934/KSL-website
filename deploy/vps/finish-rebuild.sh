#!/bin/bash
# Finish a portal rebuild AFTER git pull. Skips migrate if migrator env is missing.
# Run on the VPS:
#   cd /opt/kenyashipyards/admin-api
#   bash deploy/vps/finish-rebuild.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
IP="${1:-178.162.219.218}"

echo "Repo: $ROOT"
echo "Commit before build: $(git log -1 --oneline)"

bash deploy/vps/fill-ip.sh --http "$IP"

cd staff-portal
npm install

# Make NEXT_PUBLIC_* visible to next build (and print them for debugging).
set -a
if [[ -f .env.production ]]; then
  # shellcheck disable=SC1091
  . ./.env.production
fi
if [[ -f /etc/ksl-portal.env ]]; then
  # shellcheck disable=SC1091
  . /etc/ksl-portal.env
fi
# fill-ip values must win over older /etc values
if [[ -f .env.production ]]; then
  # shellcheck disable=SC1091
  . ./.env.production
fi
set +a

echo "NEXT_PUBLIC_PORTAL_URL=${NEXT_PUBLIC_PORTAL_URL:-<missing>}"
echo "NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH:-<missing>}"
echo "NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-<missing>}"

if [[ -z "${NEXT_PUBLIC_PORTAL_URL:-}" || -z "${NEXT_PUBLIC_BASE_PATH:-}" ]]; then
  echo "ERROR: portal public URL / base path missing. Aborting build." >&2
  exit 1
fi

if [[ -f /etc/ksl-portal-migrator.env ]]; then
  echo "Running migrations with ksl_migrator..."
  MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate
else
  echo "Skipping migrate (no /etc/ksl-portal-migrator.env). Content delete/invite fixes do not need it."
fi

npm run build
cd ..

echo "Restarting ksl-portal..."
sudo systemctl restart ksl-portal
sleep 2
sudo systemctl --no-pager --full status ksl-portal | head -20

PUBLIC_DEST=/var/www/kenyashipyards
[[ -d "$PUBLIC_DEST" ]] || PUBLIC_DEST=/var/www/ksl
echo "Publishing public site to $PUBLIC_DEST"
DEST="$PUBLIC_DEST" bash deploy/vps/publish-public.sh

sudo cp deploy/vps/nginx/kenyashipyards-ip.conf /etc/nginx/sites-available/kenyashipyards
sudo nginx -t
sudo systemctl reload nginx

echo
echo "Health:"
curl -sS http://127.0.0.1:3000/api/health || true
echo
echo "Login redirect (must NOT be localhost:3000):"
curl -sS -D - -o /dev/null "http://127.0.0.1/kwela/staff" 2>/dev/null | tr -d '\r' | grep -i '^location:' || \
  curl -sS -D - -o /dev/null "http://${IP}/kwela/staff" | tr -d '\r' | grep -i '^location:' || true
echo
echo "DONE. Hard-refresh the browser (Ctrl+Shift+R)."
echo "Commit: $(git log -1 --oneline)"
