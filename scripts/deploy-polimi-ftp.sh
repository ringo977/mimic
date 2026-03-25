#!/usr/bin/env bash
# Build static site for Polimi root URL, then upload via FTPS (mirror).
# Prerequisites: brew install lftp
# Credentials: copy deploy.polimi.env.example → deploy.polimi.env (never commit)

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

echo "→ Building for Polimi (root basePath, no /mimic)…"
BASE_PATH= npm run build

if [[ ! -d out ]]; then
  echo "Build did not produce out/"
  exit 1
fi

PWENC=$(FTP_PASS="$FTP_PASS" python3 -c "import os, urllib.parse; print(urllib.parse.quote(os.environ['FTP_PASS'], safe=''))")
# Explicit TLS (AUTH TLS) like curl --ssl-reqd; ftps:// is implicit SSL and breaks with "wrong version number"
OPEN_URL="ftp://${FTP_USER}:${PWENC}@${FTP_HOST}:${FTP_PORT}"

LFTP_SCRIPT=$(mktemp)
trap 'rm -f "$LFTP_SCRIPT"' EXIT
cat >"$LFTP_SCRIPT" <<EOF
set ssl:verify-certificate no
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ftp:use-site-chmod no
open ${OPEN_URL}
cd ${FTP_REMOTE_DIR}
mirror -R --parallel=2 --verbose --no-perms --continue out .
bye
EOF

echo "→ Uploading to ${FTP_HOST}:${FTP_PORT}/${FTP_REMOTE_DIR} …"
# --norc: ignore ~/.lftprc so nothing re-enables SITE CHMOD (fixes 500 Unknown SITE command)
lftp --norc -f "$LFTP_SCRIPT"
echo "Done."
