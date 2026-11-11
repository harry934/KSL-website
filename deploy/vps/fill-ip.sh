#!/bin/bash
# Write the VPS address into the local env file and js/portal-host.js.
# Run this on your computer, before you copy anything to the server.
# Usage: bash deploy/vps/fill-ip.sh 203.0.113.10
set -euo pipefail
IP="${1:-}"
if ! [[ "$IP" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
  echo "Usage: bash deploy/vps/fill-ip.sh YOUR_VPS_IP" >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORTAL="https://${IP}:8443"
SITE="https://${IP}"
ENV_FILE="$ROOT/staff-portal/.env.production"
HOST_JS="$ROOT/js/portal-host.js"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
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
    key = line.split("=", 1)[0]
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
new, n = re.subn(r'var origin = "[^"]*";', f'var origin = "{portal}";', text, count=1)
if n != 1:
    sys.exit("Could not find the origin line in js/portal-host.js")
open(path, "w").write(new)
PY

echo "Portal address set to $PORTAL"
echo "Public site address set to $SITE"
echo "Next: paste any empty secret keys in staff-portal/.env.production, then copy that file to the server."
