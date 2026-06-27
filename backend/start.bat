@echo off
echo [Trust Guard] Installing dependencies...
pip install -r requirements.txt

echo [Trust Guard] Starting backend on http://localhost:8000
set PYTHONIOENCODING=utf-8
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
