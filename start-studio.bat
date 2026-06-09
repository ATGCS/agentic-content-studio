@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Agentic Content Studio - 快速启动
echo ========================================

echo [1/3] 检查 pnpm...
where pnpm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未安装 pnpm，请先运行: npm install -g pnpm
  pause
  exit /b 1
)

echo [2/4] 清理端口和缓存...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
if exist apps\web\.next rmdir /s /q apps\web\.next

echo [3/4] 编译依赖包...
echo.
echo  Web & API: http://localhost:3001
echo.
echo [4/4] 启动开发服务器...
echo.
echo 注意：首次启动会清除缓存，请耐心等待
echo 关闭此窗口即可停止所有服务
echo.
pnpm dev:studio

pause
