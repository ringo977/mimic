#!/bin/sh
# Weekly database backup. Run by GitHub Actions in the PRIVATE repo
# ringo977/mimic-backups (.github/workflows/weekly-backup.yml), which checks
# out this file from the public site repo and executes it inside
# postgres:17-alpine on a GitHub-hosted runner, then encrypts the output with
# age before keeping it. Nothing here touches a lab computer.
# (GitLab CI was ruled out on 28/09/2026: its only runner is Marco's Mac.)
#
# Needs: SUPABASE_DB_URL  (repository secret) —
#   postgresql://backup_reader.<ref>:<password>@<session pooler host>:5432/postgres
# The role backup_reader is created by scripts/supabase-2026-09-backup-reader.sql.
#
# Output (encrypted and kept by the workflow):
#   backups/mimic-db-YYYY-MM-DD.json  — backup JSON v2, restorable from
#                                       Admin → Backup → Restore Database
#   backups/mimic-db-YYYY-MM-DD.sql   — plain pg_dump of public data
#                                       (best effort: skipped if the role
#                                       could not get BYPASSRLS)
set -eu

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set — add it in GitLab Settings → CI/CD → Variables}"

DAY="$(date -u +%Y-%m-%d)"
OUT_DIR="${1:-backups}"
JSON="$OUT_DIR/mimic-db-$DAY.json"
DUMP="$OUT_DIR/mimic-db-$DAY.sql"
mkdir -p "$OUT_DIR"

echo "→ Exporting backup JSON…"
psql "$SUPABASE_DB_URL" -X -q -At -v ON_ERROR_STOP=1 \
     -c "SELECT public.backup_export()" > "$JSON"

# The file must be one JSON object with the _meta block: an empty or partial
# file is worse than no backup, so fail loudly instead of archiving it.
first="$(head -c 1 "$JSON")"
if [ "$first" != "{" ] || ! grep -q '"_meta"' "$JSON"; then
  echo "✗ Export does not look like a backup JSON (first byte: '$first')" >&2
  exit 1
fi
echo "✓ $JSON ($(wc -c < "$JSON" | tr -d ' ') bytes)"

echo "→ Row counts:"
psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 -c \
  "SELECT key AS table_name, jsonb_array_length(value) AS n_rows
     FROM jsonb_each(public.backup_export()) WHERE key <> '_meta' ORDER BY 1"

echo "→ pg_dump (best effort)…"
if pg_dump "$SUPABASE_DB_URL" --schema=public --data-only --no-owner --no-privileges \
     --exclude-table=public.db_snapshots --exclude-table=public.row_history \
     --exclude-table-data='public.*page_view*' \
     -f "$DUMP" 2> "$OUT_DIR/pg_dump.log"; then
  echo "✓ $DUMP ($(wc -c < "$DUMP" | tr -d ' ') bytes)"
  rm -f "$OUT_DIR/pg_dump.log"
else
  echo "! pg_dump skipped: $(tail -n 3 "$OUT_DIR/pg_dump.log" | tr '\n' ' ')"
  rm -f "$DUMP" "$OUT_DIR/pg_dump.log"
fi

echo "Done."
