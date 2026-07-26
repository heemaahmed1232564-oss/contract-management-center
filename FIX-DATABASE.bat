@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-database.ps1"
if errorlevel 1 (
  echo.
  echo Database repair did not finish successfully.
  pause
)
endlocal
