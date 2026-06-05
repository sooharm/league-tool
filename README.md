# League Tool

스타크래프트 팀리그 순위·일정 관리 웹 (디스코드 봇 연동 예정)

## 기능 (Phase 1)

- 시즌별 팀/선수 관리 (팀 수 가변)
- 팀 기본 순위 (승점 자동 계산)
- 개인 순위 (세트 결과 기반)
- 일정 / 로스터 / 규정 페이지
- 로그인 없음 (추후 추가)

## 시작하기 (Windows)

**가장 쉬운 방법:** `start.bat` 더블클릭

또는 터미널에서:

```powershell
cd "C:\Users\user\Desktop\SCR coding\League tool"
npm install
npm run db:setup
npm run dev
```

브라우저에서 http://localhost:3000

### 실행이 안 될 때

| 증상 | 해결 |
|------|------|
| `'npm'은(는) 인식되지 않습니다` | [Node.js LTS](https://nodejs.org) 설치 후 **터미널/Cursor 재시작**, 또는 `start.bat` 사용 |
| `Cannot find module` | `npm install` 실행 |
| DB 관련 오류 | `npm run db:setup` 실행 |
| 포트 사용 중 | 다른 프로그램이 3000 포트 사용 중 → 해당 프로그램 종료 |

## DB

- Neon Postgres + Prisma
- 스키마 반영: `npx prisma db push`
- 시드: `npm run db:seed`

## Vercel + Neon 배포

1. [neon.tech](https://neon.tech)에서 프로젝트 생성 → **Pooled** / **Direct** 연결 문자열 복사
2. GitHub에 코드 push (`.env`는 올리지 않음)
3. [vercel.com](https://vercel.com) → Import → 환경 변수 설정:

| 변수 | 값 |
|------|-----|
| `DATABASE_URL` | Neon **Pooled** URL |
| `DIRECT_URL` | Neon **Direct** URL |
| `DISCORD_CLIENT_ID` | Discord 앱 |
| `DISCORD_CLIENT_SECRET` | Discord 앱 |
| `AUTH_SECRET` | 랜덤 문자열 |
| `AUTH_URL` | `https://프로젝트명.vercel.app` |
| `DISCORD_ADMIN_USER_IDS` | 운영진 Discord ID |

4. 로컬에서 Neon DB 초기화 (최초 1회):

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
$env:DATABASE_URL = "Neon Pooled URL"
$env:DIRECT_URL = "Neon Direct URL"
npx prisma db push
npm run db:seed
```

5. Discord 개발자 포털 → Redirects 추가:

```
https://프로젝트명.vercel.app/api/auth/callback/discord
```

## 승점 규칙

- 경기 승리 +3
- 6인 엔트리 +1
- 에결 패배 +1
- 6:0 완승 +1
