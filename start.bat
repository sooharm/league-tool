@echo off
chcp 65001 >nul
title League Tool

cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo.
    echo 1. https://nodejs.org 에서 LTS 버전 설치
    echo 2. 설치 후 이 파일을 다시 실행
    echo.
    pause
    exit /b 1
)

echo Node.js:
node --version
echo.

if not exist "node_modules\" (
    echo 패키지 설치 중... (처음 한 번만 시간이 걸립니다)
    call npm.cmd install
    if errorlevel 1 (
        echo [오류] npm install 실패
        pause
        exit /b 1
    )
)

if not exist "prisma\dev.db" (
    echo DB 초기화 중...
    call npm.cmd run db:setup
    if errorlevel 1 (
        echo [오류] DB 설정 실패
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   서버 시작: http://localhost:3000
echo   Ready 가 나오면 브라우저에서 접속
echo   화면이 깨지면 Ctrl+C 후 start.bat 다시 실행
echo   종료: 이 창에서 Ctrl+C
echo ========================================
echo.

call npm.cmd run dev:clean

pause
