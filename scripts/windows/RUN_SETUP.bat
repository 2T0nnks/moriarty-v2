@echo off
REM Moriarty — Quantum Circuit Debugger - Windows Setup Launcher
REM This batch file runs setup.ps1 with execution policy bypass
REM Right-click and select "Run as Administrator"

echo.
echo ================================================================
echo   Moriarty — Quantum Circuit Debugger - Setup Launcher
echo ================================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo [INFO] Running as Administrator - OK
echo.

REM Check if setup.ps1 exists
if not exist "%~dp0setup.ps1" (
    echo [ERROR] setup.ps1 not found in the current directory!
    echo.
    echo Please make sure you are in the correct directory.
    echo.
    pause
    exit /b 1
)

echo [INFO] Found setup.ps1
echo [INFO] Starting PowerShell setup with execution policy bypass...
echo.

REM Run PowerShell with execution policy bypass
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

echo.
echo ================================================================
echo   Setup completed. Check the output above for any errors.
echo ================================================================
echo.
pause
