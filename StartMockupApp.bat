@echo off
setlocal EnableExtensions
title Mockup Generator - Starter

echo Starte Mockup Generator...
echo Minimierte Konsolenfenster fuer Backend/Frontend bitte offen lassen (oder dort Strg+C zum Beenden).
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend\frontend"

if exist "%BACKEND%\venv\Scripts\activate.bat" (
  start "" /MIN /D "%BACKEND%" cmd /k "call venv\Scripts\activate.bat && python manage.py runserver"
) else (
  echo Hinweis: Kein venv unter backend\venv gefunden - verwende python aus PATH.
  start "" /MIN /D "%BACKEND%" cmd /k "python manage.py runserver"
)

start "" /MIN /D "%FRONTEND%" cmd /k "npm run dev"

echo Warte kurz, bis Vite und Django hochgefahren sind…
timeout /t 4 /nobreak >nul

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME%" (
  start "" "%CHROME%" --app="http://localhost:5173"
) else if exist "%CHROME86%" (
  start "" "%CHROME86%" --app="http://localhost:5173"
) else (
  where chrome >nul 2>&1 && start "" chrome --app="http://localhost:5173" && goto :opened
  where msedge >nul 2>&1 && start "" msedge --app="http://localhost:5173" && goto :opened
  echo Weder Chrome noch Edge gefunden. Bitte manuell http://localhost:5173 im App-Modus oeffnen.
  pause
  exit /b 1
)
:opened

echo Fertig. Der Browser sollte im App-Modus erscheinen (ohne Tabs/Leiste).
exit /b 0
