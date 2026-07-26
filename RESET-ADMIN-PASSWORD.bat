@echo off
setlocal
chcp 65001 >nul
title Contract Management Center - Reset Password

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0RESET-ADMIN-PASSWORD.ps1"
set "RESET_EXIT=%ERRORLEVEL%"

echo.
if not "%RESET_EXIT%"=="0" (
  echo Password reset was not completed. Review the message above.
)
pause
exit /b %RESET_EXIT%
