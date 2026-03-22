@echo off
title Quantum Circuit Debugger - Starting...
color 0B

:: Always work in the user's home directory
set ROOT=%USERPROFILE%\quantum-circuit-debugger

echo.
echo  ============================================================
echo   Moriarty — Quantum Circuit Debugger - Starting Services
echo   Project: %ROOT%
echo  ============================================================
echo.

if not exist "%ROOT%\backend\requirements.txt" (
    echo [ERROR] Project not found at %ROOT%.
    echo [ERROR] Run setup first: scripts\windows\setup.ps1
    pause
    exit /b 1
)

:: Check if Ollama is running
echo [INFO] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Starting Ollama...
    start "" "ollama" serve
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Ollama is already running.
)

:: Start Backend
echo [INFO] Starting Backend (FastAPI)...
start "QCD Backend" cmd /k "cd /d "%ROOT%\backend" && call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to initialize
echo [INFO] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

:: Start Frontend
echo [INFO] Starting Frontend (Next.js)...
start "QCD Frontend" cmd /k "cd /d "%ROOT%\frontend" && pnpm dev"

:: Wait and open browser
echo [INFO] Waiting for frontend to compile...
timeout /t 10 /nobreak >nul

echo.
echo  ============================================================
echo   Application is starting up!
echo  ============================================================
echo   Frontend:      http://localhost:3000
echo   Backend API:   http://localhost:8000
echo   API Docs:      http://localhost:8000/docs
echo  ============================================================
echo.
echo  Opening browser...
start "" "http://localhost:3000"

echo.
echo  Both terminal windows are open in the background.
echo  Close them to stop the application, or run scripts\windows\stop.bat
echo.
pause
