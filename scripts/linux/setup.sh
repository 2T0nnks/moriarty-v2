#!/usr/bin/env bash
# Moriarty — Quantum Circuit Debugger - Native Linux/macOS Setup
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/2T0nnks/moriarty-public/main/scripts/linux/setup.sh)
# Or after cloning: bash scripts/linux/setup.sh

set -euo pipefail

# Always work in the user's home directory
REPO_NAME="quantum-circuit-debugger"
ROOT="$HOME/$REPO_NAME"
REPO_URL="https://github.com/2T0nnks/moriarty-public.git"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARNING]${NC} $*"; }
err()     { echo -e "${RED}[ERROR]${NC} $*"; }

print_header() {
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}  Moriarty — Quantum Circuit Debugger - Native Setup          ${NC}"
  echo -e "${CYAN}  Supports: Ubuntu/Debian, Fedora/RHEL, Arch, macOS         ${NC}"
  echo -e "${CYAN}  Install directory: $ROOT${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""
}

detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
  elif [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
      ubuntu|debian|linuxmint) OS="debian" ;;
      fedora|rhel|centos|rocky|almalinux) OS="fedora" ;;
      arch|manjaro) OS="arch" ;;
      *) OS="unknown" ;;
    esac
  else
    OS="unknown"
  fi
  info "Detected OS: $OS"
}

has_cmd() { command -v "$1" &>/dev/null; }

pkg_install() {
  local pkg="$1"
  case "$OS" in
    debian) sudo apt-get install -y "$pkg" ;;
    fedora) sudo dnf install -y "$pkg" ;;
    arch)   sudo pacman -Sy --noconfirm "$pkg" ;;
    macos)  brew install "$pkg" ;;
    *)      err "Unsupported OS. Install $pkg manually."; return 1 ;;
  esac
}

clone_or_update_repo() {
  if [ -d "$ROOT/.git" ]; then
    info "Repository already exists at $ROOT. Pulling latest changes..."
    git -C "$ROOT" pull origin main
    success "Repository updated."
  else
    info "Cloning repository to $ROOT..."
    git clone "$REPO_URL" "$ROOT"
    success "Repository cloned."
  fi
  cd "$ROOT"
}

install_python() {
  if has_cmd python3; then
    success "Python already installed: $(python3 --version)"
    return
  fi
  info "Installing Python 3..."
  case "$OS" in
    debian)
      sudo apt-get update -qq
      pkg_install python3
      pkg_install python3-pip
      pkg_install python3-venv
      ;;
    fedora) pkg_install python3 && pkg_install python3-pip ;;
    arch)   pkg_install python ;;
    macos)  brew install python@3.11 ;;
    *)      err "Install Python 3.11+ from https://python.org"; exit 1 ;;
  esac
  success "Python installed: $(python3 --version)"
}

install_node() {
  if has_cmd node; then
    success "Node.js already installed: $(node --version)"
    return
  fi
  info "Installing Node.js LTS..."
  case "$OS" in
    debian)
      curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ;;
    fedora)
      curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
      sudo dnf install -y nodejs
      ;;
    arch) pkg_install nodejs && pkg_install npm ;;
    macos) brew install node ;;
    *) err "Install Node.js LTS from https://nodejs.org"; exit 1 ;;
  esac
  success "Node.js installed: $(node --version)"
}

install_pnpm() {
  if has_cmd pnpm; then
    success "pnpm already installed: $(pnpm --version)"
    return
  fi
  info "Installing pnpm..."
  npm install -g pnpm
  success "pnpm installed: $(pnpm --version)"
}

install_ollama() {
  if has_cmd ollama; then
    success "Ollama already installed."
    return
  fi
  info "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
  success "Ollama installed."
}

start_ollama() {
  if curl -s http://localhost:11434/api/tags &>/dev/null; then
    success "Ollama is already running."
    return
  fi
  info "Starting Ollama service..."
  ollama serve &>"$HOME/.quantum-debugger-ollama.log" &
  local tries=0
  while ! curl -s http://localhost:11434/api/tags &>/dev/null; do
    sleep 1
    tries=$((tries + 1))
    if [ $tries -ge 15 ]; then
      warn "Ollama did not start in time. Run manually: ollama serve"
      return 1
    fi
  done
  success "Ollama is running."
}

pull_model() {
  local model="${1:-qwen2.5:1.5b}"
  info "Checking AI model: $model"
  if ollama list 2>/dev/null | grep -q "${model%%:*}"; then
    success "Model $model already installed."
  else
    info "Downloading $model (this may take a few minutes)..."
    if ollama pull "$model"; then
      success "Model $model downloaded."
    else
      warn "Failed to download $model. Retry with: ollama pull $model"
    fi
  fi
}

setup_backend() {
  info "Setting up Python backend..."
  pushd "$ROOT/backend" > /dev/null
  if [ ! -d "venv" ]; then
    info "Creating virtual environment..."
    python3 -m venv venv
  fi
  info "Installing Python dependencies..."
  ./venv/bin/pip install --quiet --upgrade pip
  ./venv/bin/pip install --quiet -r requirements.txt
  popd > /dev/null
  success "Backend ready."
}

setup_frontend() {
  info "Setting up Node.js frontend..."
  pushd "$ROOT/frontend" > /dev/null
  pnpm install --silent
  popd > /dev/null
  success "Frontend ready."
}

setup_env() {
  if [ ! -f "$ROOT/frontend/.env.local" ]; then
    info "Creating frontend/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > "$ROOT/frontend/.env.local"
    success ".env.local created."
  fi
}

start_services() {
  info "Starting backend (FastAPI on :8000)..."
  pushd "$ROOT/backend" > /dev/null
  nohup ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 >"$HOME/.quantum-debugger-backend.log" 2>&1 &
  popd > /dev/null

  info "Starting frontend (Next.js on :3000)..."
  pushd "$ROOT/frontend" > /dev/null
  nohup pnpm dev >"$HOME/.quantum-debugger-frontend.log" 2>&1 &
  popd > /dev/null

  info "Waiting for backend..."
  local tries=0
  while ! curl -s http://localhost:8000/health &>/dev/null; do
    sleep 1; tries=$((tries+1))
    [ $tries -ge 30 ] && { err "Backend failed to start. Check $HOME/.quantum-debugger-backend.log"; return 1; }
  done
  success "Backend is up."

  tries=0
  while ! curl -s http://localhost:3000 &>/dev/null; do
    sleep 2; tries=$((tries+1))
    [ $tries -ge 30 ] && { warn "Frontend still starting. Check $HOME/.quantum-debugger-frontend.log"; break; }
  done
  success "Frontend is up."
}

main() {
  print_header
  detect_os
  clone_or_update_repo
  install_python
  install_node
  install_pnpm
  install_ollama
  setup_env
  setup_backend
  setup_frontend
  start_ollama
  pull_model "qwen2.5:1.5b"
  start_services

  echo ""
  echo -e "${GREEN}============================================================${NC}"
  echo -e "${GREEN}  Setup complete!${NC}"
  echo -e "${GREEN}  Project:     $ROOT${NC}"
  echo -e "${GREEN}  Frontend:    http://localhost:3000${NC}"
  echo -e "${GREEN}  Backend API: http://localhost:8000${NC}"
  echo -e "${GREEN}  Swagger:     http://localhost:8000/docs${NC}"
  echo -e "${GREEN}============================================================${NC}"
  echo ""
  echo "  Useful commands:"
  echo "    Start:        bash $ROOT/scripts/linux/start.sh"
  echo "    Stop:         bash $ROOT/scripts/linux/stop.sh"
  echo "    Update:       bash $ROOT/scripts/linux/update.sh"
  echo "    Backend log:  tail -f \$HOME/.quantum-debugger-backend.log"
  echo "    Frontend log: tail -f \$HOME/.quantum-debugger-frontend.log"
  echo ""
}

main "$@"
