#!/usr/bin/env bash
# Sync the local website into the mimic-website/ subfolder of the GitLab
# monorepo (gitlab.polimi.it/DEIB/mimic) and push.
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
if [[ -d "$CACHE_DIR/.git" ]]; then
  echo "→ Updating cached GitLab clone…"
  git -C "$CACHE_DIR" fetch origin
  git -C "$CACHE_DIR" reset --hard origin/main
else
  echo "→ Cloning GitLab repo (first time, may take a while)…"
  git clone "$AUTHED_URL" "$CACHE_DIR"
fi

# ── Step 2: Rsync website files into the subfolder ──────────────────
TARGET="$CACHE_DIR/$GITLAB_SUBFOLDER"
mkdir -p "$TARGET"

echo "→ Syncing files to $GITLAB_SUBFOLDER/…"
rsync -a --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='out' \
  --exclude='.DS_Store' \
  --exclude='deploy.polimi.env' \
  --exclude='deploy.gitlab.env' \
  --exclude='.gitlab-clone' \
  --exclude='.vercel' \
  --exclude='mimic passwd.txt' \
  --exclude='.claude' \
  --exclude='public/images/news/Post' \
  --exclude='EUROoCS2026-Full-program.pdf' \
  --exclude='Pennati_MPS2025_award.jpg' \
  --exclude='Bianca Aterini EUROTOX2025 Ecopa.jpg' \
  --exclude='sofia_belardinelli_originale.jpg' \
  "$ROOT/" "$TARGET/"

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
git push origin main

echo "✓ Done — GitLab repo updated."
