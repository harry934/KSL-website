#!/bin/bash
# Run on the VPS after the restore tarball is unpacked outside the repo.
# Preserves KEEP_ADMIN_USERNAME (default harry934). Does not drop the database.
#
# Usage:
#   KEEP_ADMIN_USERNAME=harry934 \
#   RESTORE_DIR=/var/lib/ksl-portal/imports/ksl-restore \
#   bash deploy/vps/run-content-restore.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORTAL="$ROOT/staff-portal"
RESTORE_DIR="${RESTORE_DIR:-/var/lib/ksl-portal/imports/ksl-restore}"
KEEP_ADMIN_USERNAME="${KEEP_ADMIN_USERNAME:-harry934}"
ENV_FILE="${ENV_FILE:-$PORTAL/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi
if [[ ! -f "$RESTORE_DIR/content-export.json" ]]; then
  echo "Missing $RESTORE_DIR/content-export.json" >&2
  exit 1
fi
if [[ ! -d "$RESTORE_DIR/storage" ]]; then
  echo "Missing $RESTORE_DIR/storage" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" || -z "${STORAGE_DIR:-}" ]]; then
  echo "DATABASE_URL and STORAGE_DIR must be set in $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$STORAGE_DIR" 2>/dev/null || true
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
# Prefer the shared backups dir when writable; otherwise use /tmp (avoids root-owned Permission denied).
if [[ -n "${BACKUP_DIR:-}" ]]; then
  mkdir -p "$BACKUP_DIR"
elif mkdir -p /var/lib/ksl-portal/backups 2>/dev/null && [[ -w /var/lib/ksl-portal/backups ]]; then
  BACKUP_DIR=/var/lib/ksl-portal/backups
else
  BACKUP_DIR="${TMPDIR:-/tmp}/ksl-portal-backups"
  mkdir -p "$BACKUP_DIR"
fi
BACKUP_FILE="$BACKUP_DIR/ksl-before-restore-$STAMP.sql"

echo "==> pg_dump backup → $BACKUP_FILE"
pg_dump "$DATABASE_URL" --no-owner --no-acl -f "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"

cd "$PORTAL"
echo "==> content import"
npm run import:content-export -- "$RESTORE_DIR/content-export.json"

echo "==> storage import"
npm run import:storage-objects -- "$RESTORE_DIR/storage"

echo "==> staff cleanup dry-run"
KEEP_ADMIN_USERNAME="$KEEP_ADMIN_USERNAME" npm run cleanup:staff -- --dry-run

echo "==> staff cleanup apply (preserve $KEEP_ADMIN_USERNAME)"
KEEP_ADMIN_USERNAME="$KEEP_ADMIN_USERNAME" npm run cleanup:staff -- --apply

echo "==> inventory"
npm run inventory:postgres

echo "==> done"
echo "Backup kept at: $BACKUP_FILE"
echo "Verify: http://127.0.0.1:3000/api/public/news (or /kwela/api/public/news via Nginx)"
echo "Verify uploads under Website images still work after rebuild if not yet deployed."
