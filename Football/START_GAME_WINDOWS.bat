@echo off
cd /d "%~dp0"
title Educational Football - Offline
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0offline-server.ps1"
pause
