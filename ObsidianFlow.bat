@echo off
title ObsidianFlow Launcher
color 0B

echo.
echo  ================================================
echo    ObsidianFlow ^| Cinematic Task Engine
echo    Starting development environment...
echo  ================================================
echo.

REM ── 1. Start the backend server in a new window ──────────────────────────────
echo  [1/3] Launching backend server (port 8000)...
start "ObsidianFlow - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM ── 2. Start the frontend dev server in a new window ─────────────────────────
echo  [2/3] Launching frontend server (port 3000)...
start "ObsidianFlow - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM ── 3. Wait for servers to boot, then open the browser ───────────────────────
echo  [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo  Opening ObsidianFlow in your browser...
start "" "http://localhost:3000/dashboard"

echo.
echo  ================================================
echo    ObsidianFlow is running!
echo    Backend  : http://localhost:8000
echo    Frontend : http://localhost:3000/dashboard
echo  ================================================
echo.
echo  Both servers are running in separate windows.
echo  Close those windows to stop the servers.
echo.
pause
