@echo off
setlocal

set "PROJECT_DIR=%~dp0..\"
cd /d "%PROJECT_DIR%"

call "%PROJECT_DIR%start-studio.bat" %*
