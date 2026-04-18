@echo off
timeout /t 2 /nobreak
move /y MockupLocalEngine_new.exe MockupLocalEngine.exe
start "" MockupLocalEngine.exe
del "%~f0"
