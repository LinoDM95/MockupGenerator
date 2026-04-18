@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Mockup Local Upscale Agent
echo.
echo Starte Installation / Agent (PowerShell) ...
echo Bei Sicherheitsfragen: Skript aus dem Ordner local-upscale-agent im Mockup-Generator-Repo.
echo.

set "PS1=%~dp0InstallAndRun.ps1"
if not exist "%PS1%" set "PS1=%~dp0InstallAndRun-MockupLocalAgent.ps1"
if not exist "!PS1!" (
    echo FEHLER: Keine passende PowerShell-Datei gefunden.
    echo Erwartet: InstallAndRun.ps1 oder InstallAndRun-MockupLocalAgent.ps1
    echo in diesem Ordner: %~dp0
    echo.
    pause
    exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "!PS1!"
echo.
pause
endlocal
