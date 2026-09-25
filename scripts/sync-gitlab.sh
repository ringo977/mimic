#!/usr/bin/env bash
# Sync the local website into the mimic-website/ subfolder of the GitLab
# monorepo (gitlab.polimi.it/DEIB/mimic) and push.
#
# SECURITY MODEL (settembre 2026, dopo il leak di "mimic passwd.txt"):
#   - Si sincronizzano SOLO i file tracciati da git (via `git archive HEAD`).
#     I segreti sono gitignorati → per costruzione non possono finire su GitLab.
#   - rsync --delete rimuove dal working tree GitLab qualsiasi file non
#     tracciato qui (inclusi eventuali file leakati in passato).
#   - Il PAT non viene salvato in .gitlab-clone/.git/config: il remote resta
#     senza credenziali e il token si usa solo nei singoli comandi fetch/push.
#
# Prerequisites: deploy.gitlab.env with a valid Personal Access Token.
# Usage:         npm run sync:gitlab
#                npm run sync:gitlab -- "commit message here"

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f deploy.gitlab.env ]]; then
  echo "Missing deploy.gitlab.env — copy deploy.gitlab.env.example and fill in your token."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/deploy.gitlab.env"
set +a

: "${GITLAB_TOKEN:?Set GITLAB_TOKEN in deploy.gitlab.env}"
: "${GITLAB_REPO:?Set GITLAB_REPO in deploy.gitlab.env}"
GITLAB_SUBFOLDER="${GITLAB_SUBFOLDER:-mimic-website}"

AUTHED_URL="${GITLAB_REPO/https:\/\//https://oauth2:${GITLAB_TOKEN}@}"
CACHE_DIR="$ROOT/.gitlab-clone"

# ── Step 1: Clone or update cached copy of GitLab repo ──────────────
# The remote URL stored in config is the clean one (no token); the token
# is passed only per-command via the authed URL.
if [[ -d "$CACHE_DIR/.git" ]]; then
  echo "→ Updating cached GitLab clone…"
  git -C "$CACHE_DIR" remote set-url origin "$GITLAB_REPO"
  git -C "$CACHE_DIR" fetch "$AUTHED_URL" main
  git -C "$CACHE_DIR" reset --hard FETCH_HEAD
else
  echo "→ Cloning GitLab repo (first time, may take a while)…"
  git clone "$AUTHED_URL" "$CACHE_DIR"
  git -C "$CACHE_DIR" remote set-url origin "$GITLAB_REPO"
fi

# ── Step 2: Export tracked files and sync into the subfolder ────────
# `git archive HEAD` contains exactly the files tracked by git: no secrets,
# no build output, no local junk. --delete removes anything else remotely.
TARGET="$CACHE_DIR/$GITLAB_SUBFOLDER"
mkdir -p "$TARGET"

EXPORT_DIR="$(mktemp -d)"
trap 'rm -rf "$EXPORT_DIR"' EXIT

echo "→ Exporting tracked files (git archive HEAD)…"
git archive HEAD | tar -x -C "$EXPORT_DIR"

echo "→ Syncing files to $GITLAB_SUBFOLDER/…"
rsync -a --delete "$EXPORT_DIR/" "$TARGET/"

# ── Step 3: Commit and push ─────────────────────────────────────────
cd "$CACHE_DIR"

git add -A

if git diff --cached --quiet; then
  echo "✓ Nothing changed — GitLab is already up to date."
  exit 0
fi

COMMIT_MSG="${1:-Sync mimic-website from GitHub ($(date +%Y-%m-%d))}"
echo "→ Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "→ Pushing to GitLab…"
git push "$AUTHED_URL" main

echo "✓ Done — GitLab repo updated."
