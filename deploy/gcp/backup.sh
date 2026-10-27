#!/usr/bin/env bash
# Nightly KV backup → GCS. Requires BUCKET in /etc/mission-control/backup.env
set -euo pipefail
source /etc/mission-control/backup.env
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
if command -v sqlite3 >/dev/null; then
  sqlite3 /var/lib/mission-control/kv.db ".backup '$TMP/kv.db'"
else
  cp /var/lib/mission-control/kv.db* "$TMP"/
fi
gcloud storage cp "$TMP"/kv.db "$BUCKET/kv-$(date +%F).db"
