#!/bin/bash
# Finish a portal rebuild AFTER git pull. Skips migrate if migrator env is missing.
# Run on the VPS:
#   cd /opt/kenyashipyards/admin-api
#   bash deploy/vps/finish-rebuild.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Repo: $ROOT"
echo "Commit: $(git log -1 --oneline)"

bash deploy/vps/fill-ip.sh --http "${1:-178.162.219.218}"

cd staff-portal
npm install

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
sudo systemctl --no-pager --full status ksl-portal | head -20

PUBLIC_DEST=/var/www/kenyashipyards
[[ -d "$PUBLIC_DEST" ]] || PUBLIC_DEST=/var/www/ksl
echo "Publishing public site to $PUBLIC_DEST"
DEST="$PUBLIC_DEST" bash deploy/vps/publish-public.sh

sudo cp deploy/vps/nginx/kenyashipyards-ip.conf /etc/nginx/sites-available/kenyashipyards
sudo nginx -t
sudo systemctl reload nginx

echo
echo "DONE. Hard-refresh the browser (Ctrl+Shift+R)."
curl -sS http://127.0.0.1:3000/api/health || true
echo
git log -1 --oneline
