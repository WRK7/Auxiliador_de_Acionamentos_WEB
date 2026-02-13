@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Iniciando Frontend (3088) e Backend (3089)...
echo.
echo Local:    http://localhost:3088
echo Backend:  http://localhost:3089
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=1" %%b in ("%%a") do (
    echo Rede:     http://%%b:3088
    goto :done_ip
  )
)
:done_ip
echo.
echo Feche esta janela para encerrar os dois.
echo.

call npm run start:all

pause
