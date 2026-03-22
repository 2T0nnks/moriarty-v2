@echo off
title Quantum Circuit Debugger - Updating...
color 0E

:: Always work in the user's home directory
set ROOT=%USERPROFILE%\quantum-circuit-debugger

echo.
echo  ============================================================
echo   Moriarty — Quantum Circuit Debugger - Update
echo   Project: %ROOT%
echo  ============================================================
echo.

if not exist "%ROOT%\backend\requirements.txt" (
    echo [ERROR] Project not found at %ROOT%.
    echo [ERROR] Run setup first: scripts\windows\setup.ps1
    pause
    exit /b 1
)

:: Stop services first
echo [INFO] Stopping services before update...
call "%~dp0stop.bat"

:: Pull latest code
echo [INFO] Pulling latest changes from GitHub...
git -C "%ROOT%" pull origin main
if %errorlevel% neq 0 (
    echo [WARNING] Could not pull from GitHub. Continuing with local version.
)

:: Update backend dependencies
echo [INFO] Updating backend dependencies...
cd /d "%ROOT%\backend"
call venv\Scripts\activate.bat
pip install -r requirements.txt --upgrade
echo [OK] Backend dependencies updated.

:: Update frontend dependencies
echo [INFO] Updating frontend dependencies...
cd /d "%ROOT%\frontend"
pnpm install
echo [OK] Frontend dependencies updated.

echo.
echo  ============================================================
echo   Update complete! Run scripts\windows\start.bat to restart.
echo  ============================================================
echo.
pause
