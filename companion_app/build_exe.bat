@echo off
setlocal
cd /d "%~dp0\.."
python companion_app\build_exe.py
if errorlevel 1 exit /b 1
echo.
echo Fertig: PrintFlow Engine — dist\PrintFlowEngine.exe
endlocal
