#!/bin/bash
# AUROSY Skill Factory — Deploy Script
# Usage: ./deploy.sh [frontend|backend|all]
#
# This script deploys from LOCAL BUILD to production server.
# ALWAYS commit and push to GitHub BEFORE running this script.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_HOST="aurosy"
WEB_ROOT="/var/www/aurosy.io"
BACKEND_DIR="/root/aurosy-backend"
FRONTEND_DIR="$SCRIPT_DIR/web/frontend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check git status
check_git() {
  cd "$SCRIPT_DIR"
  
  # Check for uncommitted changes
  if [[ -n $(git status --porcelain) ]]; then
    error "Uncommitted changes detected! Commit and push first.\n  git add -A && git commit -m 'message' && git push origin main"
  fi
  
  # Check if pushed to remote
  git fetch origin main --quiet
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)
  
  if [[ "$LOCAL" != "$REMOTE" ]]; then
    error "Local commits not pushed to GitHub!\n  git push origin main"
  fi
  
  info "Git status: clean, synced with origin/main"
}

deploy_frontend() {
  info "Building frontend..."
  cd "$FRONTEND_DIR"
  npm run build || error "Build failed!"
  
  info "Deploying frontend to $SSH_HOST:$WEB_ROOT ..."
  rsync -av --delete dist/ "$SSH_HOST:$WEB_ROOT/"
  
  info "Frontend deployed successfully!"
}

deploy_backend() {
  BACKEND_LOCAL="$SCRIPT_DIR/../aurosy-backend"
  
  if [[ ! -d "$BACKEND_LOCAL" ]]; then
    error "Backend directory not found at $BACKEND_LOCAL"
  fi
  
  info "Deploying backend to $SSH_HOST:$BACKEND_DIR ..."
  rsync -av \
    --exclude '.env' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude '.git' \
    "$BACKEND_LOCAL/" "$SSH_HOST:$BACKEND_DIR/"
  
  info "Restarting API service..."
  ssh "$SSH_HOST" "cd $BACKEND_DIR && source .venv/bin/activate && pip install -r requirements.txt --quiet && systemctl restart aurosy-api"
  
  info "Backend deployed successfully!"
}

# Main
echo ""
echo "========================================="
echo "  AUROSY Skill Factory — Deploy"
echo "========================================="
echo ""

check_git

case "${1:-all}" in
  frontend)
    deploy_frontend
    ;;
  backend)
    deploy_backend
    ;;
  all)
    deploy_frontend
    deploy_backend
    ;;
  *)
    echo "Usage: ./deploy.sh [frontend|backend|all]"
    exit 1
    ;;
esac

echo ""
info "Deploy complete! 🚀"
echo "  Site: https://aurosy.io"
echo "  API:  https://aurosy.io/api/health"
echo ""
