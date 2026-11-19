#!/bin/bash
# Ensure the portal process is the new build on 127.0.0.1:3000.
# Installs systemd unit if missing, stops PM2/orphan listeners, then starts ksl-portal.
# Usage:
#   bash deploy/vps/restart-portal.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Restarting portal from $ROOT"

# Stop PM2 copies so they cannot keep serving the old build on :3000.
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete ksl-portal 2>/dev/null || true
  pm2 stop all 2>/dev/null || true
fi

# Install/refresh unit when missing or when WorkingDirectory is wrong for this checkout.
NEED_INSTALL=0
if ! systemctl cat ksl-portal.service >/dev/null 2>&1; then
  echo "ksl-portal.service not installed — installing now."
  NEED_INSTALL=1
else
  CURRENT_WD="$(systemctl show -p WorkingDirectory --value ksl-portal.service 2>/dev/null || true)"
  if [[ "$CURRENT_WD" != "$ROOT/staff-portal" ]]; then
    echo "ksl-portal.service WorkingDirectory is '$CURRENT_WD' (expected $ROOT/staff-portal) — reinstalling."
    NEED_INSTALL=1
  fi
fi

if [[ "$NEED_INSTALL" -eq 1 ]]; then
  bash "$ROOT/deploy/vps/install-portal-service.sh"
fi

# Free :3000 before start (orphan npm/node from earlier manual starts).
if command -v fuser >/dev/null 2>&1; then
  sudo fuser -k 3000/tcp 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  PIDS="$(sudo lsof -t -iTCP:3000 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${PIDS:-}" ]]; then
    # shellcheck disable=SC2086
    sudo kill $PIDS 2>/dev/null || true
  fi
fi
sleep 1

sudo systemctl restart ksl-portal
sleep 2

if ! systemctl is-active --quiet ksl-portal; then
  echo "ERROR: ksl-portal failed to start. Recent logs:" >&2
  sudo journalctl -u ksl-portal -n 40 --no-pager >&2 || true
  exit 1
fi

sudo systemctl --no-pager --full status ksl-portal | head -20
echo
echo "Local health:"
curl -sS --max-time 5 http://127.0.0.1:3000/kwela/api/health || true
echo
