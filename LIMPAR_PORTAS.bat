@echo off
chcp 65001 >nul
echo Limpando portas 3088 e 3089...
echo.

powershell -NoProfile -Command ^
  "$p88 = (Get-NetTCPConnection -LocalPort 3088 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique; " ^
  "if ($p88) { $p88 | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; echo 'Porta 3088 liberada.' } else { echo 'Porta 3088 nao estava em uso.' }; " ^
  "$p89 = (Get-NetTCPConnection -LocalPort 3089 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique; " ^
  "if ($p89) { $p89 | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; echo 'Porta 3089 liberada.' } else { echo 'Porta 3089 nao estava em uso.' }"

echo.
echo Concluido.
pause
