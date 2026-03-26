#!/usr/bin/env bash
# Build static site for Polimi root URL, then upload via FTPS (mirror).
# Prerequisites: brew install lftp
# Credentials: copy deploy.polimi.env.example → deploy.polimi.env (never commit)
#
# Incremental upload: by default mirror uses --ignore-time so lftp skips files
# whose remote size already matches local (Next rebuild touches mtimes on all files).
# Set FTP_MIRROR_RESPECT_TIME=1 in deploy.polimi.env to compare by time again.
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
MIRROR_FLAGS="--parallel=2 --verbose --no-perms --continue"
if [[ "${FTP_MIRROR_RESPECT_TIME:-}" != "1" ]]; then
  MIRROR_FLAGS="${MIRROR_FLAGS} --ignore-time"
fi

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

LFTP_SCRIPT=$(mktemp)
trap 'rm -f "$LFTP_SCRIPT"' EXIT
cat >"$LFTP_SCRIPT" <<EOF
set ssl:verify-certificate no
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ftp:use-site-chmod no
open ${OPEN_URL}
cd ${FTP_REMOTE_DIR}
mirror -R ${MIRROR_FLAGS} out .
bye
EOF

echo "→ Uploading to ${FTP_HOST}:${FTP_PORT}/${FTP_REMOTE_DIR} …"
# --norc: ignore ~/.lftprc so nothing re-enables SITE CHMOD (fixes 500 Unknown SITE command)
lftp --norc -f "$LFTP_SCRIPT"
echo "Done."
