#!/bin/bash
# Write the VPS address into staff-portal/.env.production (or .env.example copy)
# and js/portal-host.js so the public site talks to the portal on this VPS.
#
# IP smoke test (HTTP, before Nginx / before company DNS):
#   bash deploy/vps/fill-ip.sh --http 203.0.113.10
#     → portal http://IP:3000 , site http://IP:8080
#
# Later with Nginx TLS on 8443 / 443:
#   bash deploy/vps/fill-ip.sh 203.0.113.10
#     → portal https://IP:8443 , site https://IP
#
# Do not use kenyashipyards.co.ke until DNS for that hostname points here.
set -euo pipefail

MODE="https"
IP=""
if [[ "${1:-}" == "--http" ]]; then
  MODE="http"
  IP="${2:-}"
else
  IP="${1:-}"
fi

if ! [[ "$IP" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
  echo "Usage:" >&2
  echo "  bash deploy/vps/fill-ip.sh --http YOUR_VPS_IP   # Stage 1 HTTP smoke test" >&2
  echo "  bash deploy/vps/fill-ip.sh YOUR_VPS_IP          # HTTPS via Nginx :8443 / :443" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ "$MODE" == "http" ]]; then
  PORTAL="http://${IP}:3000"
  SITE="http://${IP}:8080"
else
  PORTAL="https://${IP}:8443"
  SITE="https://${IP}"
fi

ENV_FILE="$ROOT/staff-portal/.env.production"
HOST_JS="$ROOT/js/portal-host.js"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ROOT/staff-portal/.env.example" ]]; then
    cp "$ROOT/staff-portal/.env.example" "$ENV_FILE"
    echo "Created $ENV_FILE from .env.example — fill DATABASE_URL and secrets next."
  else
    echo "Missing $ENV_FILE" >&2
    exit 1
  fi
fi

python3 - "$ENV_FILE" "$PORTAL" "$SITE" <<'PY'
import sys
path, portal, site = sys.argv[1], sys.argv[2], sys.argv[3]
wanted = {
    "NEXT_PUBLIC_PORTAL_URL": portal,
    "NEXT_PUBLIC_SITE_URL": site,
    "PUBLIC_SITE_ORIGIN": site,
}
lines = open(path).read().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else ""
    if key in wanted:
        out.append(f"{key}={wanted[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in wanted.items():
    if key not in seen:
        out.append(f"{key}={value}")
open(path, "w").write("\n".join(out) + "\n")
PY

python3 - "$HOST_JS" "$PORTAL" <<'PY'
import re, sys
path, portal = sys.argv[1], sys.argv[2]
text = open(path).read()
# Only rewrite the executable assignment, not the comment example.
pattern = r'(^[ \t]*var origin = ")[^"]*(";)\s*$'
new, n = re.subn(pattern, rf'\g<1>{portal}\2', text, count=1, flags=re.M)
if n != 1:
    sys.exit("Could not find the executable origin assignment in js/portal-host.js")
open(path, "w").write(new)
PY

echo "Mode: $MODE"
echo "Portal address set to $PORTAL  (js/portal-host.js + NEXT_PUBLIC_PORTAL_URL)"
echo "Public site address set to $SITE  (NEXT_PUBLIC_SITE_URL + PUBLIC_SITE_ORIGIN)"
echo "Next: set DATABASE_URL, STORAGE_DIR, and signing secrets in staff-portal/.env.production"
echo "Rebuild the portal after changing NEXT_PUBLIC_* values."
echo "Keep the env file private; never commit it."
