@echo off
setlocal enabledelayedexpansion
title Setup Antigravity Tools Windows Startup

echo =====================================================================
echo   Antigravity Tools - Windows Startup Setup
echo =====================================================================
echo.
echo This script sets up Antigravity Tools to automatically start
echo in the background whenever your PC boots up or you log into Windows.
echo.

set "TARGET_EXE=%LOCALAPPDATA%\Antigravity Tools\antigravity-tools.exe"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Antigravity Tools.lnk"

if not exist "%TARGET_EXE%" (
    echo [!] Searching for antigravity-tools.exe...
    if exist "%APPDATA%\Antigravity Tools\antigravity-tools.exe" (
        set "TARGET_EXE=%APPDATA%\Antigravity Tools\antigravity-tools.exe"
    ) else if exist "%ProgramFiles%\Antigravity Tools\antigravity-tools.exe" (
        set "TARGET_EXE=%ProgramFiles%\Antigravity Tools\antigravity-tools.exe"
    ) else (
        echo [!] Could not automatically locate 'antigravity-tools.exe'.
        echo     Please enter the full path to your antigravity-tools.exe:
        set /p "TARGET_EXE=Path: "
    )
)

if not exist "%TARGET_EXE%" (
    echo.
    echo [ERROR] File not found: !TARGET_EXE!
    echo Please make sure Antigravity Tools is installed on this PC.
    echo.
    pause
    exit /b 1
)

echo [*] Target executable: !TARGET_EXE!
echo [*] Creating startup shortcut in: %STARTUP_FOLDER%
echo.

powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell;$s=$w.CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='!TARGET_EXE!';$s.WorkingDirectory=Split-Path '!TARGET_EXE!';$s.Description='Antigravity Tools Background Service';$s.Save();"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Windows startup shortcut created successfully!
    echo.
    echo Antigravity Tools will now automatically start whenever Windows starts.
    echo.
    
    tasklist /FI "IMAGENAME eq antigravity-tools.exe" 2>NUL | find /I /N "antigravity-tools.exe">NUL
    if "%ERRORLEVEL%"=="0" (
        echo [*] Antigravity Tools is currently running. You're all set!
    ) else (
        echo [*] Starting Antigravity Tools right now...
        start "" "!TARGET_EXE!"
    )
) else (
    echo [ERROR] Failed to create shortcut in Startup folder.
)

echo.
echo Press any key to exit.
pause >nul
