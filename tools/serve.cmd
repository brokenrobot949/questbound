@echo off
rem Double-click to start the Questbound test server and open the game in your browser.
rem Close this window to stop the server.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8000 -Open
pause
