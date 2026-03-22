#!/usr/bin/env bash
# Moriarty — Quantum Circuit Debugger - Update Script (Linux/macOS)

ROOT="$HOME/quantum-circuit-debugger"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARNING]${NC} $*"; }
err()     { echo -e "${RED}[ERROR]${NC} $*"; }

stop_services() {
  info "Stopping running services..."
  local pid
  pid=$(lsof -ti:8000 2>/dev/null || true)
  [ -n "$pid" ] && kill "$pid" 2>/dev/null && success "Backend stopped." || warn "Backend not running."
  pid=$(lsof -ti:3000 2>/dev/null || true)
  [ -n "$pid" ] && kill "$pid" 2>/dev/null && success "Frontend stopped." || warn "Frontend not running."
}

pull_code() {
  info "Pulling latest code from $ROOT..."
  if [ -d "$ROOT/.git" ]; then
    git -C "$ROOT" pull origin main && success "Code updated."
  else
    warn "Not a git repository at $ROOT. Skipping git pull."
  fi
}

update_backend() {
  info "Updating backend dependencies..."
  pushd "$ROOT/backend" > /dev/null
  ./venv/bin/pip install --quiet --upgrade pip
  ./venv/bin/pip install --quiet -r requirements.txt
  popd > /dev/null
  success "Backend dependencies updated."
}

update_frontend() {
  info "Updating frontend dependencies..."
  pushd "$ROOT/frontend" > /dev/null
  pnpm install --silent
  popd > /dev/null
  success "Frontend dependencies updated."
}

main() {
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}  Quantum Circuit Debugger - Update                         ${NC}"
  echo -e "${CYAN}  Project: $ROOT${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""

  if [ ! -f "$ROOT/backend/requirements.txt" ]; then
    err "Project not found at $ROOT. Run setup first: bash scripts/linux/setup.sh"
    exit 1
  fi

  stop_services
  pull_code
  update_backend
  update_frontend

  echo ""
  success "Update complete! Run: bash $ROOT/scripts/linux/start.sh"
  echo ""
}

main "$@"
