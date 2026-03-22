#!/usr/bin/env bash
# Moriarty — Quantum Circuit Debugger - Start Services (Linux/macOS)

ROOT="$HOME/quantum-circuit-debugger"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARNING]${NC} $*"; }
err()     { echo -e "${RED}[ERROR]${NC} $*"; }

start_ollama() {
  if curl -s http://localhost:11434/api/tags &>/dev/null; then
    success "Ollama already running."
    return
  fi
  info "Starting Ollama..."
  ollama serve &>"$HOME/.quantum-debugger-ollama.log" &
  local tries=0
  while ! curl -s http://localhost:11434/api/tags &>/dev/null; do
    sleep 1; tries=$((tries+1))
    [ $tries -ge 15 ] && { warn "Ollama slow to start. Check $HOME/.quantum-debugger-ollama.log"; break; }
  done
  success "Ollama started."
}

start_backend() {
  if lsof -ti:8000 &>/dev/null; then
    warn "Port 8000 already in use. Backend may already be running."
    return
  fi
  info "Starting backend (FastAPI on :8000)..."
  pushd "$ROOT/backend" > /dev/null
  nohup ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 >"$HOME/.quantum-debugger-backend.log" 2>&1 &
  popd > /dev/null
  local tries=0
  while ! curl -s http://localhost:8000/health &>/dev/null; do
    sleep 1; tries=$((tries+1))
    [ $tries -ge 30 ] && { err "Backend failed to start. Check $HOME/.quantum-debugger-backend.log"; return 1; }
  done
  success "Backend is up."
}

start_frontend() {
  if lsof -ti:3000 &>/dev/null; then
    warn "Port 3000 already in use. Frontend may already be running."
    return
  fi
  info "Starting frontend (Next.js on :3000)..."
  pushd "$ROOT/frontend" > /dev/null
  nohup pnpm dev >"$HOME/.quantum-debugger-frontend.log" 2>&1 &
  popd > /dev/null
  local tries=0
  while ! curl -s http://localhost:3000 &>/dev/null; do
    sleep 2; tries=$((tries+1))
    [ $tries -ge 30 ] && { warn "Frontend still starting. Check $HOME/.quantum-debugger-frontend.log"; break; }
  done
  success "Frontend is up."
}

main() {
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}  Quantum Circuit Debugger - Starting Services              ${NC}"
  echo -e "${CYAN}  Project: $ROOT${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""

  if [ ! -f "$ROOT/backend/requirements.txt" ]; then
    err "Project not found at $ROOT. Run setup first: bash scripts/linux/setup.sh"
    exit 1
  fi

  start_ollama
  start_backend
  start_frontend

  echo ""
  echo -e "${GREEN}============================================================${NC}"
  echo -e "${GREEN}  All services running!${NC}"
  echo -e "${GREEN}  Frontend:    http://localhost:3000${NC}"
  echo -e "${GREEN}  Backend API: http://localhost:8000${NC}"
  echo -e "${GREEN}  Swagger:     http://localhost:8000/docs${NC}"
  echo -e "${GREEN}============================================================${NC}"
  echo ""
}

main "$@"
