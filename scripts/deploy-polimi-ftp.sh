#!/usr/bin/env bash
# Build static site for Polimi root URL, then upload via FTPS (mirror).
# Prerequisites: brew install lftp
# Credentials: copy deploy.polimi.env.example → deploy.polimi.env (never commit)
#
# Smart incremental deploy (2-step):
#   Step 1: Force-upload HTML/txt/json (small, always change when chunks change)
#   Step 2: Upload static assets only if new (JS/CSS have content hashes in filename)
# This avoids re-uploading hundreds of unchanged assets while ensuring HTML
# always references the correct chunk hashes.
#
# Set FTP_FULL_SYNC=1 to force upload everything (useful for first deploy or debugging).
#
# Skip rebuild: SKIP_BUILD=1 npm run sync:polimi  (out/ must be from npm run build:polimi)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f deploy.polimi.env ]]; then
  echo "Missing deploy.polimi.env — copy deploy.polimi.env.example and fill in credentials."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/deploy.polimi.env"
set +a

: "${FTP_HOST:?Set FTP_HOST in deploy.polimi.env}"
: "${FTP_USER:?Set FTP_USER in deploy.polimi.env}"
: "${FTP_PASS:?Set FTP_PASS in deploy.polimi.env}"
FTP_PORT="${FTP_PORT:-2121}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-htdocs-SSL}"

if ! command -v lftp >/dev/null 2>&1; then
  echo "Install lftp: brew install lftp"
  exit 1
fi

if [[ "${SKIP_BUILD:-}" == "1" ]]; then
  echo "→ Skipping build (SKIP_BUILD=1); using existing out/"
else
  echo "→ Building for Polimi (root basePath, no /mimic)…"
  npm run build:polimi
fi

if [[ ! -d out ]]; then
  echo "Build did not produce out/"
  exit 1
fi

PWENC=$(FTP_PASS="$FTP_PASS" python3 -c "import os, urllib.parse; print(urllib.parse.quote(os.environ['FTP_PASS'], safe=''))")
# Explicit TLS (AUTH TLS) like curl --ssl-reqd; ftps:// is implicit SSL and breaks with "wrong version number"
OPEN_URL="ftp://${FTP_USER}:${PWENC}@${FTP_HOST}:${FTP_PORT}"

COMMON_FLAGS="--parallel=2 --verbose --no-perms --continue"

LFTP_SCRIPT=$(mktemp)
trap 'rm -f "$LFTP_SCRIPT"' EXIT

if [[ "${FTP_FULL_SYNC:-}" == "1" ]]; then
  echo "→ Full sync: uploading ALL files…"
  cat >"$LFTP_SCRIPT" <<EOF
set ssl:verify-certificate no
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ftp:use-site-chmod no
open ${OPEN_URL}
cd ${FTP_REMOTE_DIR}
mirror -R ${COMMON_FLAGS} out .
bye
EOF
else
  echo "→ Smart deploy: Step 1 — force-uploading HTML/txt/json pages…"
  echo "→ Smart deploy: Step 2 — uploading new static assets (size-based skip)…"
  cat >"$LFTP_SCRIPT" <<EOF
set ssl:verify-certificate no
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ftp:use-site-chmod no
open ${OPEN_URL}
cd ${FTP_REMOTE_DIR}

# Step 1: Force-upload all HTML, txt, json, xml files (pages that reference chunk hashes).
# These are small and MUST be updated every deploy to point to the correct JS chunks.
mirror -R ${COMMON_FLAGS} --include-glob=*.html --include-glob=*.txt --include-glob=*.json --include-glob=*.xml --include-glob=*.rss out .

# Step 2: Upload remaining static assets (JS/CSS/images/fonts).
# --ignore-time: skip files whose size matches (Next.js JS chunks have content hashes
# in the filename, so a changed file = new filename = always uploaded as new).
mirror -R ${COMMON_FLAGS} --ignore-time --exclude-glob=*.html --exclude-glob=*.txt --exclude-glob=*.json --exclude-glob=*.xml --exclude-glob=*.rss out .
bye
EOF
fi

echo "→ Uploading to ${FTP_HOST}:${FTP_PORT}/${FTP_REMOTE_DIR} …"
# --norc: ignore ~/.lftprc so nothing re-enables SITE CHMOD (fixes 500 Unknown SITE command)
lftp --norc -f "$LFTP_SCRIPT"
echo "Done."
