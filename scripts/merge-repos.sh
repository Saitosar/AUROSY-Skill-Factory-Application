#!/bin/bash
# ============================================================
# AUROSY Skill Factory — Monorepo Migration Script
# ============================================================
#
# Merges two repos into one monorepo with preserved git history:
#   - AUROSY-Skill-Factory-Application  → app/
#   - AUROSY-Skill-Factory-Platform     → platform/
#
# Usage:
#   cd /path/to/parent/dir
#   bash AUROSY-Skill-Factory-Application/scripts/merge-repos.sh
#
# Prerequisites:
#   - Both repos cloned side by side
#   - Clean working trees (no uncommitted changes)
#   - GitHub CLI (gh) or manual repo creation on GitHub
#
# Result: new repo "AUROSY-Skill-Factory" with full history from both repos
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Config ──
PARENT_DIR="$(pwd)"
APP_REPO="AUROSY-Skill-Factory-Application"
PLATFORM_REPO="AUROSY-Skill-Factory-Platform"
MONOREPO="AUROSY-Skill-Factory"
GITHUB_ORG="Saitosar"

# ── Checks ──
[[ -d "$APP_REPO/.git" ]]      || error "$APP_REPO not found in $(pwd)"
[[ -d "$PLATFORM_REPO/.git" ]] || error "$PLATFORM_REPO not found in $(pwd)"
[[ -d "$MONOREPO" ]]           && error "$MONOREPO already exists. Remove it first."

echo ""
echo "========================================="
echo "  AUROSY — Monorepo Migration"
echo "========================================="
echo ""
echo "  Source 1: $APP_REPO      → app/"
echo "  Source 2: $PLATFORM_REPO → platform/"
echo "  Target:   $MONOREPO"
echo ""

# ── Step 1: Create new monorepo ──
info "Step 1/6: Creating monorepo..."
mkdir "$MONOREPO"
cd "$MONOREPO"
git init
git commit --allow-empty -m "Initial commit: monorepo created"

# ── Step 2: Import Application repo → app/ ──
info "Step 2/6: Importing $APP_REPO → app/ ..."
git remote add app "../$APP_REPO"
git fetch app --tags
git merge app/main --allow-unrelated-histories --no-edit -m "Merge $APP_REPO into monorepo"

# Move all files into app/ subdirectory (preserving .git)
mkdir -p app
git ls-files -z | while IFS= read -r -d '' file; do
  dir="app/$(dirname "$file")"
  mkdir -p "$dir"
  git mv "$file" "app/$file" 2>/dev/null || true
done
git commit -m "Move $APP_REPO files into app/"
git remote remove app

# ── Step 3: Import Platform repo → platform/ ──
info "Step 3/6: Importing $PLATFORM_REPO → platform/ ..."
git remote add platform "../$PLATFORM_REPO"
git fetch platform --tags
git merge platform/main --allow-unrelated-histories --no-edit -m "Merge $PLATFORM_REPO into monorepo"

# Move files (skip app/ which already exists)
mkdir -p platform
git ls-files -z | grep -z -v '^app/' | while IFS= read -r -d '' file; do
  dir="platform/$(dirname "$file")"
  mkdir -p "$dir"
  git mv "$file" "platform/$file" 2>/dev/null || true
done
git commit -m "Move $PLATFORM_REPO files into platform/"
git remote remove platform

# ── Step 4: Copy monorepo root files ──
info "Step 4/6: Setting up monorepo root..."

# Root files will be created from templates in app/scripts/monorepo-root/
if [[ -d "app/scripts/monorepo-root" ]]; then
  cp -r app/scripts/monorepo-root/* .
  cp -r app/scripts/monorepo-root/.* . 2>/dev/null || true
  git add -A
  git commit -m "Add monorepo root files (instructions, gitignore, deploy)"
fi

info "Step 5/6: Verifying structure..."
echo ""
echo "Monorepo structure:"
echo "  $(find . -maxdepth 2 -not -path './.git/*' -not -path './.git' | sort | head -40)"
echo ""

info "Step 6/6: Ready for GitHub push"
echo ""
echo "  Next steps:"
echo "  1. Create repo on GitHub:"
echo "     gh repo create $GITHUB_ORG/$MONOREPO --private --source=. --push"
echo ""
echo "  2. Or manually:"
echo "     git remote add origin https://github.com/$GITHUB_ORG/$MONOREPO.git"
echo "     git push -u origin main"
echo ""
echo "  3. Verify both histories are preserved:"
echo "     git log --oneline --all | head -20"
echo ""
info "Migration complete!"
