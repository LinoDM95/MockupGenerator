@echo off
setlocal EnableExtensions
title Mockup Generator - Starter

echo Starte Mockup Generator...
echo CPU-Prioritaet /HIGH fuer Dev-Server und Browser ^(kein /REALTIME – stabil^).
echo Minimierte Konsolenfenster fuer Backend/Frontend bitte offen lassen (oder dort Strg+C zum Beenden).
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend\frontend"
set "APP_URL=http://localhost:5173/?launcher=batch"

REM Ports: 8000 = Django, 5173 = Vite (vite.config proxy), 8001 = Mockup Local Engine
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
  start "" /MIN /HIGH /D "%FRONTEND%" cmd /k "npm run dev"
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
    ) else if exist "%ROOT%MockupLocalEngine.exe" (
      echo Starte MockupLocalEngine.exe - Port 8001 frei ^(Tray-App ohne Konsole; bei dev lieber venv nutzen^).
      start "" /D "%ROOT%" "%ROOT%MockupLocalEngine.exe"
      set "STARTED_SERVER=1"
    ) else (
      echo Hinweis: Kein backend\env|venv, kein python in PATH, keine MockupLocalEngine.exe - Local Engine nicht gestartet.
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

REM Chrome: oft unter Program Files, haeufig aber nur unter LocalAppData (User-Install)
set "CHROME_PF=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_PF86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "CHROME_LA=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
REM Edge: gleiches Muster
set "EDGE_PF=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "EDGE_PF86=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if exist "%CHROME_PF%" (
  start "" /HIGH "%CHROME_PF%" --app="%APP_URL%"
) else if exist "%CHROME_PF86%" (
  start "" /HIGH "%CHROME_PF86%" --app="%APP_URL%"
) else if exist "%CHROME_LA%" (
  start "" /HIGH "%CHROME_LA%" --app="%APP_URL%"
) else if exist "%EDGE_PF%" (
  start "" /HIGH "%EDGE_PF%" --app="%APP_URL%"
) else if exist "%EDGE_PF86%" (
  start "" /HIGH "%EDGE_PF86%" --app="%APP_URL%"
) else (
  where chrome >nul 2>&1 && start "" /HIGH chrome --app="%APP_URL%" && goto :opened
  where msedge >nul 2>&1 && start "" /HIGH msedge --app="%APP_URL%" && goto :opened
  echo Weder Chrome noch Edge gefunden. Bitte manuell %APP_URL% im App-Modus oeffnen.
  pause
  exit /b 1
)
:opened

echo Fertig. Der Browser sollte im App-Modus erscheinen (ohne Tabs/Leiste).
exit /b 0

REM ---------- Hilfsroutine: errorlevel 0 = Port belegt (Listen), 1 = frei ----------
:port_listening
powershell -NoProfile -Command "if ((Get-NetTCPConnection -State Listen -LocalPort %~1 -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) { exit 0 } else { exit 1 }"
exit /b
