@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] pnpm not found. Please install pnpm first.
  echo You can install it with: npm install -g pnpm
  pause
  exit /b 1
)

echo [1/6] Stopping old API/Web processes on ports 3001 and 3002...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(3001,3002); foreach ($port in $ports) { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"

if /I "%~1"=="clean" (
  echo [2/6] Clean mode: removing Web .next cache...
  if exist "%~dp0apps\web\.next" rmdir /s /q "%~dp0apps\web\.next"
) else (
  echo [2/6] Keeping Web .next cache. Use "start-studio.bat clean" to force rebuild.
)

if not exist "%~dp0packages\db\prisma\dev.db" (
  echo [3/6] First run: setting up database...
  call pnpm db:setup
  if errorlevel 1 (
    echo [ERROR] Database setup failed.
    pause
    exit /b 1
  )
) else (
  echo [3/6] Database already exists, skipping setup.
)

echo [4/6] Building workspace packages...
call pnpm build:packages
if errorlevel 1 (
  echo [ERROR] Package build failed.
  pause
  exit /b 1
)

echo [5/6] Starting API and Web...
start "ACS API" cmd /k "cd /d ""%~dp0"" && pnpm dev:api"
start "ACS Web" cmd /k "cd /d ""%~dp0"" && pnpm dev:web"

echo [6/6] Pre-compiling main pages before opening browser...
call pnpm prewarm:web
if errorlevel 1 (
  echo [WARN] Prewarm timed out; first page load may still compile.
)

start "" "http://localhost:3001/login"

echo.
echo Agentic Content Studio is ready.
echo Web: http://localhost:3001/login
echo API: http://localhost:3002
echo Login: admin@acs.local / admin123
echo.
echo Tips:
echo   - Main pages are pre-compiled; keep .next cache for fast restarts.
echo   - Run "start-studio.bat clean" if UI looks stale.
echo   - Production mode (no dev compile): pnpm start:studio:prod
echo.
echo Keep the API and Web windows open while using the platform.
pause
