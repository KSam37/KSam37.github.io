@echo off
rem Double-click to preview the site at http://localhost:4000 (live-refreshes as you edit).
cd /d "%~dp0"
if not exist "engine\node_modules" (
  echo Installing, first run only...
  call npm --prefix engine install
)
node engine\dev.mjs --open
pause
