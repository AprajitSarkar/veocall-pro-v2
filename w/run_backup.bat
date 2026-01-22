@echo off
cd /d "%~dp0"

echo Launching Chrome Backup...
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python to use the automatic secret export feature.
    echo Download: https://www.python.org/downloads/
    pause
    exit /b
)

echo Installing dependencies...
lib\pip install -r requirements.txt >nul 2>&1
if %errorlevel% neq 0 (
    :: Try global pip if lib path fails (unlikely setup but covering bases)
    pip install -r requirements.txt
)

echo.
echo Running Automatic Secret Export...
python export_secrets.py

echo.
echo Launching Chrome Backup...
powershell -NoProfile -ExecutionPolicy Bypass -File "backup_chrome.ps1"

echo.
echo Backup Process Finished.
pause
