@echo off
chcp 65001 >nul
title League Tool - DB Push

cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 LTS 설치 후 다시 실행하세요.
    pause
    exit /b 1
)

if not exist ".env" (
    echo.
    echo [안내] .env 파일이 없습니다.
    echo Vercel 대시보드 - Settings - Environment Variables 에서
    echo   DATABASE_URL  ^(Pooled^)
    echo   DIRECT_URL    ^(Direct^)
    echo 값을 복사해 이 폴더의 .env 파일에 넣어주세요.
    echo ^(.env.example 참고^)
    echo.
    pause
    exit /b 1
)

echo Prisma 스키마를 Neon DB에 반영합니다...
echo.
call npx prisma db push
if errorlevel 1 (
    echo.
    echo [오류] db push 실패. DATABASE_URL / DIRECT_URL 값을 확인하세요.
    pause
    exit /b 1
)

echo.
echo 완료. DiscordWallet 테이블이 생성되었습니다.
pause
