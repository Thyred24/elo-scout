@echo off
cd /d "%~dp0"
title Futbol Elo - Next.js + Chakra UI

powershell -NoProfile -Command "if (Test-NetConnection 127.0.0.1 -Port 8765 -InformationLevel Quiet) { exit 1 }"
if not errorlevel 1 goto portfree
echo 8765 portu su anda kullanimda. Once eski uygulamanin siyah terminal penceresini kapatip bu dosyayi yeniden calistir.
pause
exit /b 1

:portfree
if not exist "node_modules" (
  echo Next.js ve Chakra UI ilk kez yukleniyor. Internet baglantisi gerekli.
  call npm install
  if errorlevel 1 (
    echo Bagimliliklar yuklenemedi. Node.js 20.9 veya ustunu ve internet baglantisini kontrol et.
    pause
    exit /b 1
  )
)
set "PYTHON_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"
start "Futbol Elo Excel baglantisi" /min "%PYTHON_EXE%" server.py
powershell -NoProfile -Command "for($i=0;$i -lt 24;$i++){try{Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8766/api/status -TimeoutSec 1 | Out-Null; exit 0}catch{Start-Sleep -Milliseconds 500}}; exit 1" >nul 2>&1
if errorlevel 1 (
  echo Excel kayit baglantisi baslatilamadi. Python penceresindeki hatayi kontrol et.
  pause
  exit /b 1
)
start "Futbol Elo Next.js" cmd /k npm run dev
powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){try{Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/api/sync -TimeoutSec 1 | Out-Null; if($?){exit 0}}catch{Start-Sleep -Milliseconds 500}}; exit 1" >nul 2>&1
start "" http://127.0.0.1:8765
