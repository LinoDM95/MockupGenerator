@echo off
timeout /t 2 /nobreak
move /y PrintFlowEngine_new.exe PrintFlowEngine.exe
start "" PrintFlowEngine.exe
del "%~f0"
