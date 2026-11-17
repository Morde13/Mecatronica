@echo off
echo ======================================================
echo   Iniciando Sistema Mecatronica (FastAPI + React Vite)
echo ======================================================
start "FastAPI Mecatronica (Puerto 8001)" cmd /k "cd /d %~dp0 && .\env\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8001"
start "React Mecatronica (Puerto 5174)" cmd /k "cd /d %~dp0\frontend && npm run dev"
echo.
echo Servidor Backend Mecatronica: http://127.0.0.1:8001/docs
echo Interfaz React Mecatronica:   http://localhost:5174
pause
