@echo off
title Quantum Circuit Debugger - Stopping...
color 0C

echo.
echo  ============================================================
echo   Moriarty — Quantum Circuit Debugger - Stopping Services
echo  ============================================================
echo.

:: Stop Frontend (Next.js on port 3000)
echo [INFO] Stopping Frontend (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Frontend stopped.

:: Stop Backend (Uvicorn on port 8000)
echo [INFO] Stopping Backend (port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Backend stopped.

:: Close terminal windows
echo [INFO] Closing terminal windows...
taskkill /F /FI "WINDOWTITLE eq QCD Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq QCD Frontend*" >nul 2>&1

echo.
echo  ============================================================
echo   All services stopped.
echo   Run scripts\windows\start.bat to start again.
echo  ============================================================
echo.
pause
