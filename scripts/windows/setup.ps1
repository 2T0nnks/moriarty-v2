# Moriarty — Quantum Circuit Debugger - Native Windows Setup
# Run as Administrator: Right-click PowerShell -> Run as Administrator

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# Always work in the user's home directory
$REPO_NAME = "quantum-circuit-debugger"
$ROOT      = Join-Path $env:USERPROFILE $REPO_NAME
$REPO_URL  = "https://github.com/2T0nnks/moriarty-public.git"

function Write-Info    { param([string]$Message) Write-Host "[INFO] $Message"    -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warn    { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Err     { param([string]$Message) Write-Host "[ERROR] $Message"   -ForegroundColor Red }

function Test-Cmd { param([string]$Command) return (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null }

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Patterns that indicate an embedded/bundled Python (not a standalone install)
$EMBEDDED_PYTHON_PATTERNS = @(
    "WindowsApps", "LibreOffice", "Blender", "ArcGIS", "QGIS",
    "Autodesk", "Maya", "Nuke", "Houdini", "Inkscape", "GIMP",
    "python-core", "python-embed", "embeddable"
)

function Test-IsEmbeddedPython {
    param([string]$Path)
    foreach ($pattern in $EMBEDDED_PYTHON_PATTERNS) {
        if ($Path -match [regex]::Escape($pattern)) { return $true }
    }
    return $false
}

# Resolve the real standalone python executable
function Get-PythonExe {
    Refresh-Path

    # 1. Known standalone install paths (highest priority)
    $candidates = @(
        "C:\Python311\python.exe",
        "C:\Python312\python.exe",
        "C:\Python313\python.exe",
        "C:\Python310\python.exe",
        "C:\Python39\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "$env:ProgramFiles\Python311\python.exe",
        "$env:ProgramFiles\Python312\python.exe",
        "$env:ProgramFiles\Python313\python.exe"
    )
    foreach ($p in $candidates) {
        if ((Test-Path $p) -and -not (Test-IsEmbeddedPython $p)) { return $p }
    }

    # 2. Chocolatey lib/tools directories
    foreach ($chocoDir in @("lib", "tools")) {
        $dir = Join-Path $env:ChocolateyInstall $chocoDir
        if (Test-Path $dir) {
            $found = Get-ChildItem -Path $dir -Recurse -Filter "python.exe" -ErrorAction SilentlyContinue |
                     Where-Object { -not (Test-IsEmbeddedPython $_.FullName) } |
                     Select-Object -First 1
            if ($found) { return $found.FullName }
        }
    }

    # 3. PATH lookup - skip embedded Pythons
    foreach ($cmd in @("python", "python3")) {
        $found = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($found -and -not (Test-IsEmbeddedPython $found.Source)) { return $found.Source }
    }

    return $null
}

function Install-PythonDirect {
    Write-Info "Installing Python 3.11 directly from python.org..."
    $installer = Join-Path $env:TEMP "python-3.11-installer.exe"
    $url = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    try {
        (New-Object System.Net.WebClient).DownloadFile($url, $installer)
        Write-Info "Running Python installer (silent, for all users)..."
        Start-Process -FilePath $installer -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_launcher=1" -Wait
        Remove-Item $installer -ErrorAction SilentlyContinue
        Refresh-Path
        Write-Success "Python 3.11 installed from python.org."
    } catch {
        Write-Err "Failed to download Python installer: $($_.Exception.Message)"
        Write-Info "Please install Python 3.11 manually from https://python.org/downloads"
        exit 1
    }
}

function Print-Header {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Moriarty — Quantum Circuit Debugger - Native Windows Setup  " -ForegroundColor Cyan
    Write-Host "  Install directory: $ROOT" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Clone-Or-Update-Repo {
    if (Test-Path (Join-Path $ROOT ".git")) {
        Write-Info "Repository already exists at $ROOT. Pulling latest changes..."
        git -C $ROOT pull origin main
        Write-Success "Repository updated."
    } else {
        Write-Info "Cloning repository to $ROOT..."
        git clone $REPO_URL $ROOT
        Write-Success "Repository cloned to $ROOT."
    }
    Set-Location $ROOT
}

function Install-Chocolatey {
    if (Test-Cmd "choco") {
        Write-Success "Chocolatey already installed."
        return
    }
    Write-Info "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString("https://community.chocolatey.org/install.ps1"))
        Refresh-Path
        Write-Success "Chocolatey installed."
    } catch {
        Write-Err "Failed to install Chocolatey: $($_.Exception.Message)"
        Write-Info "Install manually from https://chocolatey.org/install"
        exit 1
    }
}

function Install-Pkg {
    param([string]$Name, [string]$Cmd, [string]$Pkg)
    if (Test-Cmd $Cmd) {
        Write-Success "$Name already installed."
    } else {
        Write-Info "Installing $Name..."
        try {
            choco install $Pkg -y --no-progress
            Refresh-Path
            Write-Success "$Name installed."
        } catch {
            Write-Err "Failed to install ${Name}: $($_.Exception.Message)"
            exit 1
        }
    }
}

function Install-Ollama {
    if (Test-Cmd "ollama") {
        Write-Success "Ollama already installed."
        return
    }
    Write-Info "Downloading Ollama installer..."
    $installer = Join-Path $env:TEMP "OllamaSetup.exe"
    try {
        (New-Object System.Net.WebClient).DownloadFile("https://ollama.com/download/OllamaSetup.exe", $installer)
        Write-Info "Running Ollama installer (silent)..."
        Start-Process -FilePath $installer -ArgumentList "/S" -Wait
        Remove-Item $installer -ErrorAction SilentlyContinue
        Refresh-Path
        Write-Success "Ollama installed."
    } catch {
        Write-Err "Failed to install Ollama: $($_.Exception.Message)"
        Write-Info "Download manually from https://ollama.com/download"
        exit 1
    }
}

function Setup-Backend {
    Write-Info "Setting up Python backend..."

    # Resolve python executable after all installs
    $pythonExe = Get-PythonExe
    if (-not $pythonExe) {
        Write-Warn "No standalone Python found. Installing Python 3.11 from python.org..."
        Install-PythonDirect
        $pythonExe = Get-PythonExe
    }
    if (-not $pythonExe) {
        Write-Err "Python installation failed. Please install Python 3.11 manually from https://python.org/downloads"
        Write-Info "Make sure to check 'Add Python to PATH' during installation, then run this script again."
        exit 1
    }
    Write-Info "Using Python: $pythonExe"

    Push-Location "$ROOT\backend"
    if (-not (Test-Path "venv")) {
        Write-Info "Creating virtual environment..."
        & $pythonExe -m venv venv
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Failed to create Python virtual environment."
            Pop-Location; exit 1
        }
    }
    Write-Info "Installing Python dependencies..."
    & ".\venv\Scripts\pip.exe" install --upgrade pip --quiet
    & ".\venv\Scripts\pip.exe" install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Err "pip install failed."
        Pop-Location; exit 1
    }
    Pop-Location
    Write-Success "Backend ready."
}

function Setup-Frontend {
    Write-Info "Setting up Node.js frontend..."
    Push-Location "$ROOT\frontend"
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err "pnpm install failed."
        Pop-Location; exit 1
    }
    Pop-Location
    Write-Success "Frontend ready."
}

function Pull-Model {
    param([string]$Model)
    Write-Info "Checking AI model: $Model"
    try {
        $list = & ollama list 2>&1
        if ($list -match [regex]::Escape($Model.Split(":")[0])) {
            Write-Success "Model $Model already installed."
        } else {
            Write-Info "Downloading $Model (this may take a few minutes)..."
            ollama pull $Model
            Write-Success "Model $Model downloaded."
        }
    } catch {
        Write-Warn "Could not reach Ollama. Start it from the Start Menu and run: ollama pull $Model"
    }
}

# ---- MAIN ----

Print-Header

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "Please run PowerShell as Administrator."
    exit 1
}

Install-Chocolatey
Install-Pkg "Git"         "git"    "git"
Refresh-Path
Install-Pkg "Python 3.11" "python" "python311"
Refresh-Path
Install-Pkg "Node.js LTS" "node"   "nodejs-lts"
Refresh-Path
Install-Pkg "pnpm"        "pnpm"   "pnpm"
Refresh-Path
Clone-Or-Update-Repo
Install-Ollama
Setup-Backend
Setup-Frontend
Pull-Model "qwen2.5:1.5b"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "  Project:   $ROOT" -ForegroundColor Green
Write-Host "  Run: $ROOT\scripts\windows\start.bat" -ForegroundColor Green
Write-Host "  The app will open at http://localhost:3000" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
