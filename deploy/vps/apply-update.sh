#!/bin/bash
# One-shot update for the VPS portal + public site.
# Run on the VPS after: git push origin vps-postgres (from your PC).
#
# Usage:
#   bash deploy/vps/apply-update.sh
#   bash deploy/vps/apply-update.sh 178.162.219.218
set -euo pipefail

IP="${1:-178.162.219.218}"

if [[ -d /opt/kenyashipyards/admin-api ]]; then
  ROOT=/opt/kenyashipyards/admin-api
elif [[ -d /opt/ksl-website ]]; then
  ROOT=/opt/ksl-website
else
  echo "Could not find /opt/kenyashipyards/admin-api or /opt/ksl-website"
  exit 1
fi

cd "$ROOT"
echo "Updating repo in $ROOT"
git fetch origin
git checkout vps-postgres
git pull origin vps-postgres

echo "Setting portal URL for $IP ..."
bash deploy/vps/fill-ip.sh --http "$IP"

echo "Migrating database (must use ksl_migrator)..."
cd staff-portal
npm install

MIGRATOR_FILE=""
if [[ -f /etc/ksl-portal-migrator.env ]]; then
  MIGRATOR_FILE=/etc/ksl-portal-migrator.env
elif [[ -f .env.migrator ]]; then
  MIGRATOR_FILE="$(pwd)/.env.migrator"
fi

if [[ -n "$MIGRATOR_FILE" ]]; then
  MIGRATOR_ENV_FILE="$MIGRATOR_FILE" npm run db:migrate
else
  echo "WARNING: No /etc/ksl-portal-migrator.env found."
  echo "Skipping migrate for now. Portal code can still rebuild."
  echo "To migrate later, create that file with:"
  echo "  DATABASE_URL=postgresql://ksl_migrator:PASSWORD@127.0.0.1:5432/ksl"
  echo "  DATABASE_SSL=disable"
fi

# Build with the runtime portal env (NEXT_PUBLIC_*).
set -a
if [[ -f /etc/ksl-portal.env ]]; then
  # shellcheck disable=SC1091
  . /etc/ksl-portal.env
elif [[ -f .env.production ]]; then
  # shellcheck disable=SC1091
  . ./.env.production
elif [[ -f .env.local ]]; then
  # shellcheck disable=SC1091
  . ./.env.local
fi
set +a
# Ensure public URL values from fill-ip are present even if /etc overrides older values.
if [[ -f .env.production ]]; then
  # shellcheck disable=SC1091
  set -a; . ./.env.production; set +a
fi
npm run build
cd ..

echo "Restarting portal..."
if systemctl list-unit-files | grep -q '^ksl-portal\.service'; then
  sudo systemctl restart ksl-portal
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart all
else
  echo "WARNING: could not find ksl-portal systemd unit or pm2. Restart the portal process yourself."
fi

PUBLIC_DEST=/var/www/kenyashipyards
if [[ ! -d "$PUBLIC_DEST" ]]; then
  PUBLIC_DEST=/var/www/ksl
fi
echo "Publishing public site to $PUBLIC_DEST ..."
DEST="$PUBLIC_DEST" bash deploy/vps/publish-public.sh

if [[ -f deploy/vps/nginx/kenyashipyards-ip.conf ]]; then
  echo "Reloading Nginx..."
  sudo cp deploy/vps/nginx/kenyashipyards-ip.conf /etc/nginx/sites-available/kenyashipyards
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo
echo "Done. Current commit:"
git log -1 --oneline
echo "Health:"
curl -sS "http://127.0.0.1:3000/api/health" || curl -sS "http://127.0.0.1/kwela/api/health" || true
echo
echo "Hard-refresh the browser (Ctrl+Shift+R) and re-test Staff + image delete."
