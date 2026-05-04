#!/usr/bin/env bash
# Build the static site for Polimi root URL, then upload via FTPS to mimic.polimi.it.
#
# Approach: WIPE + RELOAD (not incremental).
# Tests showed that lftp `mirror` against a non-empty remote folder gets stuck in slow
# TLS comparisons (60-300 B/s, hours per deploy). Emptying htdocs-SSL/ first and then
# uploading from scratch is much faster (~5 min for ~300 files / ~100 MB at ~310 KiB/s).
#
# Critical FTPS flags (do NOT change):
#   set ftp:ssl-protect-data false   → data channel in clear (login still encrypted).
#                                       This is what makes transfers fast. With true,
#                                       the server stalls at 60-300 B/s.
#   set ssl:verify-certificate false → server uses a self-signed cert for web462.dmz
#   set ftp:passive-mode true        → server requires passive mode
#   set ftp:use-site-chmod false     → server does not support SITE CHMOD (avoids spam)
#   set ftp:use-mdtm false           → skip MDTM (timestamp queries)
#
# Network: must be on Polimi network or GlobalProtect VPN covering 131.175.0.0/16.
#
# Prerequisites: brew install lftp
# Credentials: copy deploy.polimi.env.example → deploy.polimi.env (never commit)
# Skip rebuild: SKIP_BUILD=1 npm run sync:polimi (out/ must exist from npm run build:polimi)

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
OPEN_URL="ftp://${FTP_USER}:${PWENC}@${FTP_HOST}:${FTP_PORT}"

LFTP_SCRIPT=$(mktemp)
trap 'rm -f "$LFTP_SCRIPT"' EXIT

cat >"$LFTP_SCRIPT" <<EOF
set ssl:verify-certificate false
set ftp:ssl-force true
set ftp:ssl-protect-data false
set ftp:passive-mode true
set ftp:use-site-chmod false
set ftp:use-mdtm false
open ${OPEN_URL}
cd ${FTP_REMOTE_DIR}
echo "→ Wiping remote ${FTP_REMOTE_DIR}/ …"
glob -a rm -rf *
echo "→ Uploading out/ → ${FTP_REMOTE_DIR}/ (parallel=2) …"
mirror -R --parallel=2 --verbose --no-perms out .
bye
EOF

echo "→ Connecting to ${FTP_HOST}:${FTP_PORT} as ${FTP_USER} …"
# --norc: ignore ~/.lftprc so nothing re-enables SITE CHMOD or ssl-protect-data
lftp --norc -f "$LFTP_SCRIPT"
echo "✓ Done. Site available at https://mimic.polimi.it (once the Apache 301 redirect is removed)."
