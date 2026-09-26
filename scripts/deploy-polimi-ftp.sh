#!/usr/bin/env bash
# Build the static site for Polimi root URL, then upload via FTPS to mimic.polimi.it.
#
# Approach: UPLOAD + SWAP (atomic-ish), with WIPE + RELOAD as fallback.
#   1. Upload out/ to htdocs-SSL.new/ (site stays online on old content).
#   2. Rename htdocs-SSL → htdocs-SSL.old, htdocs-SSL.new → htdocs-SSL.
#   3. Delete htdocs-SSL.old.
# If the server refuses mkdir/rename at the home level, we fall back to the
# legacy behaviour: wipe htdocs-SSL/ and re-upload in place (site briefly 404s).
# NOTE (verified 26/09/2026): the Polimi server home is NOT writable (mkdir →
# 550), so the swap always fails there and the wipe+reload fallback is used.
# The swap path is kept in case the hosting policy changes.
#
# Why not incremental mirror: lftp `mirror` against a non-empty remote folder
# gets stuck in slow TLS comparisons (60-300 B/s, hours per deploy).
#
# Critical FTPS flags (do NOT change):
#   set ftp:ssl-protect-data false   → data channel in clear (login still encrypted).
#                                       This is what makes transfers fast. With true,
#                                       the server stalls at 60-300 B/s.
#   set ftp:passive-mode true        → server requires passive mode
#   set ftp:use-site-chmod false     → server does not support SITE CHMOD (avoids spam)
#   set ftp:use-mdtm false           → skip MDTM (timestamp queries)
#   set cmd:fail-exit true           → abort the whole script on any failed command
#                                       (a failed `cd` must never turn into rm -rf of
#                                       the wrong directory)
#
# Certificate pinning (optional): the server uses a self-signed cert. If
# deploy.polimi.cert.pem exists (gitignored), lftp verifies the connection
# against it; otherwise verification is disabled with a warning. To capture
# the cert (on VPN):
#   openssl s_client -connect 131.175.186.58:2121 -starttls ftp </dev/null \
#     2>/dev/null | openssl x509 > deploy.polimi.cert.pem
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

# Remove junk files that must never reach the server.
echo "→ Cleaning out/ (.DS_Store, .gitkeep)…"
find out \( -name '.DS_Store' -o -name '.gitkeep' \) -delete

PWENC=$(FTP_PASS="$FTP_PASS" python3 -c "import os, urllib.parse; print(urllib.parse.quote(os.environ['FTP_PASS'], safe=''))")
OPEN_URL="ftp://${FTP_USER}:${PWENC}@${FTP_HOST}:${FTP_PORT}"

# TLS settings: pin the server cert if we have a local copy of it.
# NOTE: lftp/gnutls cannot open ssl:ca-file paths containing spaces (even
# quoted), so we copy the cert to a temp path without spaces first.
if [[ -f "$ROOT/deploy.polimi.cert.pem" ]]; then
  echo "→ Using pinned certificate deploy.polimi.cert.pem"
  CERT_TMP=$(mktemp /tmp/mimic-deploy-cert.XXXXXX.pem)
  cp "$ROOT/deploy.polimi.cert.pem" "$CERT_TMP"
  SSL_SETTINGS="set ssl:verify-certificate true
set ssl:ca-file $CERT_TMP
set ssl:check-hostname false"
else
  echo "⚠ No deploy.polimi.cert.pem — TLS certificate NOT verified (see header for how to pin it)."
  SSL_SETTINGS="set ssl:verify-certificate false"
fi

COMMON_SETTINGS="${SSL_SETTINGS}
set ftp:ssl-force true
set ftp:ssl-protect-data false
set ftp:passive-mode true
set ftp:use-site-chmod false
set ftp:use-mdtm false
set cmd:fail-exit true"

LFTP_SWAP=$(mktemp)
LFTP_WIPE=$(mktemp)
trap 'rm -f "$LFTP_SWAP" "$LFTP_WIPE" ${CERT_TMP:-}' EXIT

NEW_DIR="${FTP_REMOTE_DIR}.new"
OLD_DIR="${FTP_REMOTE_DIR}.old"

# --- Strategy A: upload to .new, then swap ---------------------------------
cat >"$LFTP_SWAP" <<EOF
${COMMON_SETTINGS}
open ${OPEN_URL}
echo "→ Removing leftover ${NEW_DIR}/ and ${OLD_DIR}/ if present…"
set cmd:fail-exit false
rm -rf ${NEW_DIR}
rm -rf ${OLD_DIR}
set cmd:fail-exit true
echo "→ Uploading out/ → ${NEW_DIR}/ (parallel=2)…"
mkdir ${NEW_DIR}
mirror -R --parallel=2 --no-perms out ${NEW_DIR}
echo "→ Swapping ${NEW_DIR} → ${FTP_REMOTE_DIR}…"
mv ${FTP_REMOTE_DIR} ${OLD_DIR}
mv ${NEW_DIR} ${FTP_REMOTE_DIR}
echo "→ Deleting ${OLD_DIR}/…"
rm -rf ${OLD_DIR}
bye
EOF

# --- Strategy B (fallback): wipe htdocs-SSL/ in place and re-upload --------
cat >"$LFTP_WIPE" <<EOF
${COMMON_SETTINGS}
open ${OPEN_URL}
echo "→ Cleaning leftover ${NEW_DIR}/ if present…"
set cmd:fail-exit false
rm -rf ${NEW_DIR}
set cmd:fail-exit true
cd ${FTP_REMOTE_DIR}
echo "→ Wiping remote ${FTP_REMOTE_DIR}/ …"
# No -a on the glob: dotfiles are NOT wiped wholesale, so .htaccess survives
# even if the upload below is interrupted (mirror overwrites it anyway).
# Known orphan dotfiles are removed explicitly instead.
glob rm -rf *
set cmd:fail-exit false
rm -f .DS_Store
set cmd:fail-exit true
echo "→ Uploading out/ → ${FTP_REMOTE_DIR}/ (parallel=2)…"
mirror -R --parallel=2 --no-perms out .
bye
EOF

echo "→ Connecting to ${FTP_HOST}:${FTP_PORT} as ${FTP_USER} …"
# --norc: ignore ~/.lftprc so nothing re-enables SITE CHMOD or ssl-protect-data
if lftp --norc -f "$LFTP_SWAP"; then
  echo "✓ Done (upload + swap). Site: https://www.mimic.polimi.it"
else
  echo "⚠ Swap deploy failed (server may not allow mkdir/rename in home)."
  echo "→ Falling back to wipe + reload of ${FTP_REMOTE_DIR}/ (site briefly unavailable)…"
  lftp --norc -f "$LFTP_WIPE"
  echo "✓ Done (wipe + reload). Site: https://www.mimic.polimi.it"
fi
