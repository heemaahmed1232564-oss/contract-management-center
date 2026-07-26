@echo off
title Contract Management Center - Update
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-app.ps1"
echo.
pause
