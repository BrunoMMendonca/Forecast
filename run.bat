@echo off
echo Starting DemandForecastApp...

:: Start Flask Backend
start cmd /k "cd backend && .\venv\Scripts\activate && python app.py"

:: Start React Frontend
start cmd /k "cd frontend && npm start"

echo Both backend and frontend have been started in separate windows.
pause