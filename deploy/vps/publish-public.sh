#!/bin/bash
# Copy only the public website out of the git clone.
# Usage on the VPS, after git clone:
#   bash /srv/ksl/repo/deploy/vps/publish-public.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="${DEST:-/var/www/ksl}"
mkdir -p "$DEST"
rsync -a --delete \
  --include='*.html' \
  --include='css/***' \
  --include='js/***' \
  --include='lib/***' \
  --include='img/***' \
  --include='docs/***' \
  --include='data/***' \
  --exclude='*' \
  "$SRC/" "$DEST/"
echo "Public files are in $DEST"
