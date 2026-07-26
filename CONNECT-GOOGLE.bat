@echo off
title Contract Hub - Connect Personal Google Drive
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0connect-google.ps1"
echo.
pause
