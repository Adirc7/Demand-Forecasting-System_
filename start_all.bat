@echo off
echo Starting Dropex Smart Inventory AI System...
echo.

echo Starting AI Model Server (Port 8001)...
start "AI Model - Port 8001" cmd /k "cd AI-Model && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

timeout /t 3 /nobreak >nul

echo Starting Backend Server (Port 8000)...
start "Backend - Port 8000" cmd /k "cd Backend && call venv\Scripts\activate && cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server (Port 5173/+) ...
start "Frontend - Vite UI" cmd /k "cd Frontend\frontend && npm run dev"

echo.
echo All servers are starting up in separate windows!
echo Once they are completely loaded, you can access the frontend at: http://localhost:5173
echo You can close this command window.
pause
