# Moriarty — Quantum Circuit Debugger - Bootstrap Script for Windows
# Installs Git (if needed), clones the repository and runs setup.ps1
# Run as Administrator: Right-click PowerShell -> Run as Administrator

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# Always work in the user's home directory
$TARGET_DIR = Join-Path $env:USERPROFILE "quantum-circuit-debugger"
$REPO_URL   = "https://github.com/2T0nnks/moriarty-public.git"

function Write-Info    { param([string]$Message) Write-Host "[INFO] $Message"    -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warn    { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Err     { param([string]$Message) Write-Host "[ERROR] $Message"   -ForegroundColor Red }

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

function Test-Cmd { param([string]$Command) return (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null }

function Print-Header {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Moriarty — Quantum Circuit Debugger - Bootstrap             " -ForegroundColor Cyan
    Write-Host "  Installs Git and clones the repository                    " -ForegroundColor Cyan
    Write-Host "  Install directory: $TARGET_DIR" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Install-Git {
    if (Test-Cmd "git") {
        Write-Success "Git already installed: $(git --version)"
        return
    }
    Write-Info "Git not found. Installing via Chocolatey..."

    # Install Chocolatey if needed
    if (-not (Test-Cmd "choco")) {
        Write-Info "Installing Chocolatey..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString("https://community.chocolatey.org/install.ps1"))
        Refresh-Path
        Write-Success "Chocolatey installed."
    }

    choco install git -y --no-progress
    Refresh-Path

    if (Test-Cmd "git") {
        Write-Success "Git installed: $(git --version)"
    } else {
        Write-Err "Git installed but not found in PATH."
        Write-Info "Please close this window, reopen PowerShell as Administrator and run again."
        exit 1
    }
}

function Clone-Or-Update-Repo {
    if (Test-Path (Join-Path $TARGET_DIR ".git")) {
        Write-Info "Repository already exists at $TARGET_DIR. Pulling latest changes..."
        git -C $TARGET_DIR pull origin main
        Write-Success "Repository updated."
    } else {
        Write-Info "Cloning repository to $TARGET_DIR..."
        git clone $REPO_URL $TARGET_DIR
        Write-Success "Repository cloned."
    }
}

# ---- MAIN ----

Print-Header

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "Please run PowerShell as Administrator."
    exit 1
}

Install-Git
Clone-Or-Update-Repo

$setupScript = Join-Path $TARGET_DIR "scripts\windows\setup.ps1"
if (-not (Test-Path $setupScript)) {
    Write-Err "setup.ps1 not found at: $setupScript"
    exit 1
}

Write-Info ""
Write-Info "Starting main setup..."
Write-Info ""

try {
    & $setupScript
    Write-Success "Bootstrap completed successfully!"
} catch {
    Write-Err "Setup failed: $($_.Exception.Message)"
    exit 1
}
