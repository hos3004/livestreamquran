@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo Root dependencies are missing. Run npm install first.
  pause
  exit /b 1
)

if not exist "client\node_modules" (
  echo Client dependencies are missing. Run "cd client && npm install" first.
  pause
  exit /b 1
)

echo Starting Quran Broadcast server and client...
start "Quran Broadcast" cmd /k "cd /d ""%~dp0"" && npm run dev"

timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

exit /b 0
