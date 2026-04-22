@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Mockup Generator - Starter

echo Starte Mockup Generator...
echo CPU-Prioritaet /HIGH fuer Dev-Server und Browser ^(kein /REALTIME – stabil^).
echo Minimierte Konsolenfenster fuer Backend/Frontend bitte offen lassen (oder dort Strg+C zum Beenden).
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend\frontend"
set "APP_URL=http://localhost:5173/?launcher=batch"
set "USE_REMOTE="

REM ---------------------------------------------------------------------------
REM Optional: Echter Online-Server (Produktion). Wenn /healthz erreichbar ist,
REM werden kein lokales Backend (8000), kein Vite (5173) und keine Local Engine (8001) gestartet.
REM
REM Variante A — vor dem Start in dieser Konsole:
REM   set "MOCKUP_ONLINE_URL=https://deine-domain.de"
REM   StartMockupApp.bat
REM
REM Variante B — dauerhaft (Benutzer-Umgebungsvariable MOCKUP_ONLINE_URL setzen).
REM
REM Ohne MOCKUP_ONLINE_URL: wie bisher nur lokaler Stack.
REM ---------------------------------------------------------------------------
if not defined MOCKUP_ONLINE_URL set "MOCKUP_ONLINE_URL="
if not "!MOCKUP_ONLINE_URL!"=="" (
  echo Pruefe Online-Server ^(!MOCKUP_ONLINE_URL!^) ...
  call :remote_health_ok
  if not errorlevel 1 (
    set "USE_REMOTE=1"
    set "BASE=!MOCKUP_ONLINE_URL!"
    if "!BASE:~-1!"=="/" set "BASE=!BASE:~0,-1!"
    if "!BASE:~-1!"=="\" set "BASE=!BASE:~0,-1!"
    set "APP_URL=!BASE!/?launcher=batch"
    echo Online-Server ist erreichbar — lokale Dienste werden nicht gestartet.
    echo Browser: !APP_URL!
    echo.
  ) else (
    echo Online-Server nicht erreichbar ^(/healthz^) — starte lokalen Stack.
    echo.
  )
)

if defined USE_REMOTE goto :open_browser

set "STARTED_SERVER="

call :port_listening 8000
if errorlevel 1 (
  echo Starte Backend - Port 8000 ist frei.
  if exist "%BACKEND%\env\Scripts\activate.bat" (
    start "" /MIN /HIGH /D "%BACKEND%" cmd /k "call env\Scripts\activate.bat && python manage.py runserver"
  ) else if exist "%BACKEND%\venv\Scripts\activate.bat" (
    start "" /MIN /HIGH /D "%BACKEND%" cmd /k "call venv\Scripts\activate.bat && python manage.py runserver"
  ) else (
    echo Hinweis: Kein venv unter backend\env oder backend\venv - verwende python aus PATH.
    start "" /MIN /HIGH /D "%BACKEND%" cmd /k "python manage.py runserver"
  )
  set "STARTED_SERVER=1"
) else (
  echo Backend laeuft bereits auf Port 8000 - kein neuer Start.
)

call :port_listening 5173
if errorlevel 1 (
  echo Starte Frontend-Dev-Server - Port 5173 ist frei.
  REM VITE_PRINTFLOW_LOCAL_STACK: Upscaler zeigt PrintFlow Engine (lokal); reines npm run dev ohne diese Variable nicht.
  start "" /MIN /HIGH /D "%FRONTEND%" cmd /k "set VITE_PRINTFLOW_LOCAL_STACK=1&& npm run dev"
  set "STARTED_SERVER=1"
) else (
  echo Vite laeuft bereits auf Port 5173 - kein neuer Start.
)

call :port_listening 8001
if errorlevel 1 (
  if exist "%BACKEND%\env\Scripts\activate.bat" (
    echo Starte Local Engine - Port 8001 frei ^(minimiertes Konsolenfenster, venv env^).
    start "" /MIN /HIGH /D "%ROOT%" cmd /k "call backend\env\Scripts\activate.bat && python -m uvicorn companion_app.main:app --host 127.0.0.1 --port 8001"
    set "STARTED_SERVER=1"
  ) else if exist "%BACKEND%\venv\Scripts\activate.bat" (
    echo Starte Local Engine - Port 8001 frei ^(minimiertes Konsolenfenster, venv venv^).
    start "" /MIN /HIGH /D "%ROOT%" cmd /k "call backend\venv\Scripts\activate.bat && python -m uvicorn companion_app.main:app --host 127.0.0.1 --port 8001"
    set "STARTED_SERVER=1"
  ) else (
    where python >nul 2>&1
    if not errorlevel 1 (
      echo Starte Local Engine - Port 8001 frei ^(minimiertes Konsolenfenster, python aus PATH^).
      start "" /MIN /HIGH /D "%ROOT%" cmd /k "python -m uvicorn companion_app.main:app --host 127.0.0.1 --port 8001"
      set "STARTED_SERVER=1"
    ) else if exist "%ROOT%PrintFlowEngine.exe" (
      echo Starte PrintFlowEngine.exe - Port 8001 frei ^(Tray-App ohne Konsole; bei dev lieber venv nutzen^).
      start "" /D "%ROOT%" "%ROOT%PrintFlowEngine.exe"
      set "STARTED_SERVER=1"
    ) else (
      echo Hinweis: Kein backend\env|venv, kein python in PATH, keine PrintFlowEngine.exe - Local Engine nicht gestartet.
    )
  )
) else (
  echo Local Engine laeuft bereits auf Port 8001 - kein neuer Start.
)

if defined STARTED_SERVER (
  echo Warte kurz, bis Dienste hochgefahren sind...
  timeout /t 4 /nobreak >nul
) else (
  echo Kein neuer Server gestartet - oeffne nur den Browser.
  timeout /t 1 /nobreak >nul
)

:open_browser
REM Chrome: oft unter Program Files, haeufig aber nur unter LocalAppData (User-Install)
set "CHROME_PF=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_PF86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "CHROME_LA=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
REM Edge: gleiches Muster
set "EDGE_PF=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "EDGE_PF86=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if exist "%CHROME_PF%" (
  start "" /HIGH "%CHROME_PF%" --app="!APP_URL!"
) else if exist "%CHROME_PF86%" (
  start "" /HIGH "%CHROME_PF86%" --app="!APP_URL!"
) else if exist "%CHROME_LA%" (
  start "" /HIGH "%CHROME_LA%" --app="!APP_URL!"
) else if exist "%EDGE_PF%" (
  start "" /HIGH "%EDGE_PF%" --app="!APP_URL!"
) else if exist "%EDGE_PF86%" (
  start "" /HIGH "%EDGE_PF86%" --app="!APP_URL!"
) else (
  where chrome >nul 2>&1 && start "" /HIGH chrome --app="!APP_URL!" && goto :opened
  where msedge >nul 2>&1 && start "" /HIGH msedge --app="!APP_URL!" && goto :opened
  echo Weder Chrome noch Edge gefunden. Bitte manuell !APP_URL! im App-Modus oeffnen.
  pause
  exit /b 1
)
:opened

echo Fertig. Der Browser sollte im App-Modus erscheinen (ohne Tabs/Leiste).
exit /b 0

REM ---------- GET /healthz — exit 0 wenn HTTP 200, sonst 1 (Windows PowerShell 5.1+) ----------
:remote_health_ok
set "MOCKUP_REMOTE_BASE=%MOCKUP_ONLINE_URL%"
powershell -NoProfile -Command "$raw = $env:MOCKUP_REMOTE_BASE; if ($null -eq $raw) { $raw = '' }; $u = $raw.Trim().TrimEnd('/'); if (-not $u) { exit 1 }; try { $r = Invoke-WebRequest -Uri ($u + '/healthz') -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 0; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b %ERRORLEVEL%

REM ---------- Hilfsroutine: errorlevel 0 = Port belegt (Listen), 1 = frei ----------
:port_listening
powershell -NoProfile -Command "if ((Get-NetTCPConnection -State Listen -LocalPort %~1 -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) { exit 0 } else { exit 1 }"
exit /b
