#!/bin/bash
# Install or refresh the ksl-portal systemd unit for this VPS layout.
# Usage (from repo root or anywhere):
#   bash deploy/vps/install-portal-service.sh
set -euo pipefail

if [[ -d /opt/kenyashipyards/admin-api/staff-portal ]]; then
  ROOT=/opt/kenyashipyards/admin-api
elif [[ -d /opt/ksl-website/staff-portal ]]; then
  ROOT=/opt/ksl-website
else
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fi

PORTAL_DIR="$ROOT/staff-portal"
if [[ ! -d "$PORTAL_DIR" ]]; then
  echo "ERROR: staff-portal not found at $PORTAL_DIR" >&2
  exit 1
fi

# Run as whoever owns the checkout (npm install/build run as that user on this VPS).
# A dedicated ksl-portal user only works if it also owns staff-portal + STORAGE_DIR.
RUN_USER="$(stat -c '%U' "$PORTAL_DIR")"
RUN_GROUP="$(stat -c '%G' "$PORTAL_DIR")"
if id -u ksl-portal >/dev/null 2>&1; then
  OWNER_OF_STORAGE=""
  if [[ -d /var/lib/ksl-portal ]]; then
    OWNER_OF_STORAGE="$(stat -c '%U' /var/lib/ksl-portal)"
  fi
  if [[ "$RUN_USER" == "ksl-portal" || "$OWNER_OF_STORAGE" == "ksl-portal" ]]; then
    # Keep dedicated user when the tree is already set up for it.
    if [[ "$(stat -c '%U' "$PORTAL_DIR")" == "ksl-portal" ]]; then
      RUN_USER=ksl-portal
      RUN_GROUP=ksl-portal
    fi
  fi
fi

STORAGE_DIR="/var/lib/ksl-portal/files"
if [[ -f /etc/ksl-portal.env ]]; then
  # shellcheck disable=SC1091
  STORAGE_DIR="$(set -a; . /etc/ksl-portal.env; set +a; echo "${STORAGE_DIR:-/var/lib/ksl-portal/files}")"
elif [[ -f "$PORTAL_DIR/.env.production" ]]; then
  # shellcheck disable=SC1091
  STORAGE_DIR="$(set -a; . "$PORTAL_DIR/.env.production"; set +a; echo "${STORAGE_DIR:-/var/lib/ksl-portal/files}")"
fi

NPM_BIN="$(command -v npm || true)"
if [[ -z "$NPM_BIN" ]]; then
  NPM_BIN=/usr/bin/npm
fi
if [[ ! -x "$NPM_BIN" ]]; then
  echo "ERROR: npm not found at $NPM_BIN" >&2
  exit 1
fi

UNIT_PATH=/etc/systemd/system/ksl-portal.service
echo "Installing $UNIT_PATH"
echo "  Root:    $ROOT"
echo "  User:    $RUN_USER"
echo "  Storage: $STORAGE_DIR"
echo "  npm:     $NPM_BIN"

sudo tee "$UNIT_PATH" >/dev/null <<EOF
[Unit]
Description=Kenya Shipyards staff portal
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_GROUP
WorkingDirectory=$PORTAL_DIR
Environment=NODE_ENV=production
EnvironmentFile=-/etc/ksl-portal.env
EnvironmentFile=-$PORTAL_DIR/.env.production
ExecStart=$NPM_BIN run start -- --hostname 127.0.0.1 --port 3000
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$STORAGE_DIR /var/lib/ksl-portal $PORTAL_DIR/.next/cache

[Install]
WantedBy=multi-user.target
EOF

# Ensure runtime dirs exist and are writable by the service user.
sudo mkdir -p "$STORAGE_DIR" "$PORTAL_DIR/.next/cache" /var/lib/ksl-portal
sudo chown -R "$RUN_USER:$RUN_GROUP" /var/lib/ksl-portal "$PORTAL_DIR/.next" 2>/dev/null || true

sudo systemctl daemon-reload
sudo systemctl enable ksl-portal.service
echo "Unit installed and enabled."
