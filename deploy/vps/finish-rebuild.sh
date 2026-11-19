#!/bin/bash
# Pull latest vps-postgres, rebuild portal, restart. Safe with dirty package.json on the VPS.
# Usage on the VPS:
#   cd /opt/kenyashipyards/admin-api
#   bash deploy/vps/finish-rebuild.sh
#   bash deploy/vps/finish-rebuild.sh 178.162.219.218
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
IP="${1:-178.162.219.218}"

echo "Repo: $ROOT"
echo "Commit before update: $(git log -1 --oneline)"

# #region agent log
echo "[debug:7f13f2] {\"hypothesisId\":\"H1\",\"message\":\"git status before stash\",\"data\":$(git status --porcelain | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}"
# #endregion

# Local npm noise on the VPS must not block pull.
if ! git diff --quiet -- staff-portal/package.json staff-portal/package-lock.json 2>/dev/null \
  || ! git diff --cached --quiet -- staff-portal/package.json staff-portal/package-lock.json 2>/dev/null; then
  echo "Stashing local staff-portal package file changes so git pull can proceed..."
  git stash push -m "vps-finish-rebuild-$(date +%Y%m%d%H%M%S)" -- staff-portal/package.json staff-portal/package-lock.json || true
fi

git fetch origin
git checkout vps-postgres
git pull --ff-only origin vps-postgres

echo "Commit after pull: $(git log -1 --oneline)"
# #region agent log
echo "[debug:7f13f2] {\"hypothesisId\":\"H3\",\"message\":\"commit after pull\",\"data\":{\"commit\":\"$(git rev-parse --short HEAD)\",\"subject\":\"$(git log -1 --pretty=%s)\"}}"
# #endregion

bash deploy/vps/fill-ip.sh --http "$IP"

cd staff-portal
npm install

# Migrate BEFORE sourcing runtime env, so ksl_runtime DATABASE_URL cannot win.
# Invite/delete code fixes do not require new migrations; skip cleanly if migrator is misconfigured.
if [[ -f /etc/ksl-portal-migrator.env ]]; then
  echo "Running migrations with ksl_migrator env file..."
  if ! env -u DATABASE_URL -u DATABASE_SSL MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate; then
    echo "WARNING: migrate failed. Continuing rebuild (content delete/invite fixes are code-only)."
    echo "Fix /etc/ksl-portal-migrator.env so DATABASE_URL uses role ksl_migrator when you need new schema."
  fi
else
  echo "Skipping migrate (no /etc/ksl-portal-migrator.env)."
fi

# Runtime / public URL env for next build.
set -a
if [[ -f .env.production ]]; then
  # shellcheck disable=SC1091
  . ./.env.production
fi
if [[ -f /etc/ksl-portal.env ]]; then
  # shellcheck disable=SC1091
  . /etc/ksl-portal.env
fi
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

npm run build
cd ..

bash deploy/vps/restart-portal.sh

PUBLIC_DEST=/var/www/kenyashipyards
[[ -d "$PUBLIC_DEST" ]] || PUBLIC_DEST=/var/www/ksl
echo "Publishing public site to $PUBLIC_DEST"
DEST="$PUBLIC_DEST" bash deploy/vps/publish-public.sh

sudo cp deploy/vps/nginx/kenyashipyards-ip.conf /etc/nginx/sites-available/kenyashipyards
sudo nginx -t
sudo systemctl reload nginx

echo
echo "Login redirect (must NOT be localhost:3000):"
REDIRECT="$(curl -sS -D - -o /dev/null "http://${IP}/kwela/staff" | tr -d '\r' | grep -i '^location:' || true)"
echo "$REDIRECT"
if echo "$REDIRECT" | grep -qi 'localhost'; then
  echo "FAIL: redirect still points at localhost — portal process was not replaced." >&2
  exit 1
fi
echo
echo "DONE. Hard-refresh the browser (Ctrl+Shift+R)."
echo "Commit: $(git log -1 --oneline)"
