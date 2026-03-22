@echo off
REM Moriarty — Quantum Circuit Debugger - Windows Bootstrap Launcher
REM This batch file runs bootstrap.ps1 with execution policy bypass
REM Right-click and select "Run as Administrator"

echo.
echo ================================================================
echo   Moriarty — Quantum Circuit Debugger - Bootstrap Launcher
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

REM Check if bootstrap.ps1 exists
if not exist "%~dp0bootstrap.ps1" (
    echo [ERROR] bootstrap.ps1 not found in the current directory!
    echo.
    echo Please make sure you downloaded bootstrap.ps1 to this location.
    echo.
    pause
    exit /b 1
)

echo [INFO] Found bootstrap.ps1
echo [INFO] Starting PowerShell bootstrap with execution policy bypass...
echo.

REM Run PowerShell with execution policy bypass
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1"

echo.
echo ================================================================
echo   Bootstrap completed. Check the output above for any errors.
echo ================================================================
echo.
pause
