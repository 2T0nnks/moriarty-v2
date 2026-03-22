# ============================================================
#   Moriarty — Quantum Circuit Debugger - Windows Cleanup
#   Removes everything installed by the native setup script
# ============================================================

$ROOT = "$env:USERPROFILE\quantum-circuit-debugger"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Moriarty — Quantum Circuit Debugger - Cleanup" -ForegroundColor Cyan
Write-Host "  This will remove the project directory and stop services." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Target directory: $ROOT" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Are you sure you want to proceed? (y/N)"
if ($confirm -notmatch '^[Yy]$') {
    Write-Host "[CANCELLED] No changes were made." -ForegroundColor Yellow
    exit 0
}

# ── Step 1: Stop running services ─────────────────────────────────────────
Write-Host ""
Write-Host "[INFO] Stopping running services..." -ForegroundColor Cyan

# Stop backend (port 8000)
$backendPid = (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }).OwningProcess
if ($backendPid) {
    Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] Backend process stopped (PID $backendPid)." -ForegroundColor Green
} else {
    Write-Host "[INFO] No backend process found on port 8000." -ForegroundColor Gray
}

# Stop frontend (port 3000)
$frontendPid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }).OwningProcess
if ($frontendPid) {
    Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] Frontend process stopped (PID $frontendPid)." -ForegroundColor Green
} else {
    Write-Host "[INFO] No frontend process found on port 3000." -ForegroundColor Gray
}

# Stop Ollama (port 11434)
$ollamaPid = (Get-NetTCPConnection -LocalPort 11434 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }).OwningProcess
if ($ollamaPid) {
    Stop-Process -Id $ollamaPid -Force -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] Ollama process stopped (PID $ollamaPid)." -ForegroundColor Green
} else {
    Write-Host "[INFO] No Ollama process found on port 11434." -ForegroundColor Gray
}

# ── Step 2: Remove project directory ──────────────────────────────────────
Write-Host ""
Write-Host "[INFO] Removing project directory: $ROOT" -ForegroundColor Cyan

if (Test-Path $ROOT) {
    Remove-Item -Recurse -Force $ROOT -ErrorAction SilentlyContinue
    if (Test-Path $ROOT) {
        Write-Host "[WARNING] Could not fully remove $ROOT. Some files may be locked." -ForegroundColor Yellow
        Write-Host "          Try closing any editors or terminals using the project and run again." -ForegroundColor Yellow
    } else {
        Write-Host "[SUCCESS] Project directory removed." -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] Project directory not found. Nothing to remove." -ForegroundColor Gray
}

# ── Step 3: Remove Ollama models (optional) ────────────────────────────────
Write-Host ""
$removeModels = Read-Host "Remove Ollama AI models (~3 GB)? They will be re-downloaded if needed. (y/N)"
if ($removeModels -match '^[Yy]$') {
    $ollamaModels = "$env:USERPROFILE\.ollama"
    if (Test-Path $ollamaModels) {
        Remove-Item -Recurse -Force $ollamaModels -ErrorAction SilentlyContinue
        Write-Host "[SUCCESS] Ollama models removed ($ollamaModels)." -ForegroundColor Green
    } else {
        Write-Host "[INFO] No Ollama models directory found." -ForegroundColor Gray
    }
} else {
    Write-Host "[INFO] Ollama models kept." -ForegroundColor Gray
}

# ── Done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Cleanup complete!" -ForegroundColor Green
Write-Host "  Installed tools (Python, Node.js, pnpm, Ollama) were NOT" -ForegroundColor Green
Write-Host "  removed, as they may be used by other applications." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
