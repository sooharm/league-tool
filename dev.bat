@echo off
chcp 65001 >nul
title League Tool - Dev Server

cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 LTS 설치 후 다시 실행하세요.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo 패키지 설치 중...
    call npm.cmd install
    if errorlevel 1 (
        echo [오류] npm install 실패
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   http://localhost:3000
echo   Ready 가 나오면 브라우저에서 접속
echo   종료: Ctrl+C
echo ========================================
echo.

call npm.cmd run dev

pause
