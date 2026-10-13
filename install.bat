@echo off
setlocal enabledelayedexpansion
title BetterGravity Account Pool Plugin - Installer

echo =====================================================================
echo   BetterGravity Account Pool Plugin - 1-Click Installer
echo =====================================================================
echo.

set "TARGET_DIR=%APPDATA%\BetterGravity\plugins\account-pool"
set "SOURCE_DIR=%~dp0"

echo [*] Target directory: %TARGET_DIR%
echo.

if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%" 2>nul
)

if not exist "%TARGET_DIR%\styles" (
    mkdir "%TARGET_DIR%\styles" 2>nul
)

echo [*] Copying plugin files...
copy /y "%SOURCE_DIR%plugin.json" "%TARGET_DIR%\plugin.json" >nul
copy /y "%SOURCE_DIR%index.js" "%TARGET_DIR%\index.js" >nul
copy /y "%SOURCE_DIR%styles\sidebar.css" "%TARGET_DIR%\styles\sidebar.css" >nul

if exist "%TARGET_DIR%\index.js" (
    echo [SUCCESS] Plugin successfully installed into BetterGravity!
    echo.
    echo Next steps:
    echo 1. Open Google Antigravity / BetterGravity.
    echo 2. Press Ctrl + Shift + G to open BetterGravity Settings.
    echo 3. Enable 'Account Pool Monitor' if it is not already enabled.
    echo 4. Enter your Proxy API Key under the Account Pool section.
    echo.
    
    set /p "RUN_AUTOSTART=Would you like to set up Antigravity Tools Windows autostart now? (Y/N): "
    if /i "!RUN_AUTOSTART!"=="Y" (
        call "%SOURCE_DIR%enable-autostart.bat"
    )
) else (
    echo [ERROR] Installation failed. Could not write to %TARGET_DIR%.
)

echo.
echo Press any key to exit.
pause >nul
