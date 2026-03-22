#!/usr/bin/env bash
# Moriarty — Quantum Circuit Debugger - Stop Services (Linux/macOS)

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARNING]${NC} $*"; }

stop_port() {
  local port="$1" name="$2"
  local pid
  pid=$(lsof -ti:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && success "$name stopped (PID $pid)."
  else
    warn "$name not running on port $port."
  fi
}

main() {
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}  Quantum Circuit Debugger - Stopping Services              ${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""

  stop_port 8000 "Backend"
  stop_port 3000 "Frontend"

  if pgrep -x ollama &>/dev/null; then
    pkill -x ollama 2>/dev/null && success "Ollama stopped."
  else
    warn "Ollama not running."
  fi

  echo ""
  success "All services stopped."
  echo ""
}

main "$@"
