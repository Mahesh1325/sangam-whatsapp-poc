@echo off
title Sangam ngrok Tunnel (Port 3000)
cd /d "%~dp0"

echo ===================================================
echo   Starting Sangam WhatsApp Tunnel on Port 3000...
echo ===================================================
echo.

"C:\Users\mahes\AppData\Roaming\npm\node_modules\ngrok\bin\ngrok.exe" http 3000 --config="%~dp0ngrok.yml"

echo.
echo Tunnel stopped.
pause
