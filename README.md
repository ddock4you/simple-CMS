# Simple CMS

Next.js 16 기반의 관리자 CMS(admin) + 공개 웹(web) 모노레포. Prisma + PostgreSQL + PGroonga 한글 검색 + KRDS 공개 웹 UI + 제한형 블록 콘텐츠 + Docker/CI 인프라까지 포함.

## 두 가지 배포 트랙

| 트랙 | 용도 | 인프라 | 가이드 |
|---|---|---|---|
| **운영 self-host** | 실제 운영 환경 | Docker compose (admin + web + Postgres+PGroonga) | [docs/react-cms-운영-배포-가이드.md](docs/react-cms-운영-배포-가이드.md) |
| **시연 모드** | 데모/체험 사이트 | Vercel + Supabase (admin proxy + 격리 sessionId) | [docs/react-cms-시연모드-배포-가이드.md](docs/react-cms-시연모드-배포-가이드.md) |

두 트랙은 같은 코드베이스에서 분기합니다. `DEMO_MODE=true` env 한 줄로 시연 모드 격리 인프라가 활성화됩니다 (운영은 미설정 / 빈 값).

## Quick start (운영 self-host)

```bash
git clone <repo-url> simple-cms
cd simple-cms

# 1. 환경변수
cp .env.example .env
# SESSION_SECRET / FEEDBACK_IP_SALT 등 강한 랜덤 값 입력
# (자세한 키 목록은 운영 가이드 2장 참조)

# 2. db 컨테이너 먼저
docker compose -f docker/docker-compose.yml up -d db

# 3. schema + PGroonga + seed (호스트에서 1회)
pnpm install --frozen-lockfile
pnpm db:push
pnpm db:pgroonga
pnpm db:seed

# 4. admin + web 컨테이너
docker compose -f docker/docker-compose.yml up -d admin web

# 5. 접속
# admin: http://localhost:3001/login
# web:   http://localhost:3000/
```

상세는 [운영 배포 가이드](docs/react-cms-운영-배포-가이드.md).

## Quick start (시연 모드)

Vercel + Supabase 양쪽 계정 + 프로젝트 생성 후:

```bash
# 시연 Supabase에 schema 적용 + 시드
pnpm db:push
pnpm db:pgroonga
pnpm db:demo-seed   # __SEED__ row 22건 prefill
```

이후 Vercel 환경변수 등록 + 시연 도메인 설정. 상세는 [시연 배포 가이드](docs/react-cms-시연모드-배포-가이드.md).

## 개발 환경 (Dev)

```bash
# 1. 의존성
pnpm install

# 2. Postgres+PGroonga (Docker)
docker compose -f docker/docker-compose.yml up -d db

# 3. schema + seed
pnpm db:push
pnpm db:pgroonga
pnpm db:seed

# 4. dev 서버 (admin: 3001 / web: 3000)
pnpm dev
```

### 주요 명령어

| 명령 | 설명 |
|---|---|
| `pnpm dev` | admin + web dev 서버 (Turbo) |
| `pnpm build` | 전체 빌드 |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | 전체 검사 |
| `pnpm e2e` | Playwright E2E (admin/web 서버 사전 기동 필요) |
| `pnpm db:push` | Prisma schema push |
| `pnpm db:seed` | 최초 관리자 시드 |
| `pnpm db:pgroonga` | PGroonga 인덱스 설정 |
| `pnpm db:studio` | Prisma Studio |
| `pnpm storybook` | admin/web Storybook (port 6006 / 6007) |

## 기술 스택

| 영역 | 도구 |
|---|---|
| 프레임워크 | Next.js 16 + React 19.2 + TypeScript (strict) |
| 모노레포 | pnpm workspace + Turborepo |
| 데이터 | PostgreSQL + Prisma ORM 7 |
| 검색 | PGroonga (PostgreSQL 확장) |
| 공개 웹 UI | KRDS + Tailwind v4 |
| 관리자 UI | shadcn/ui + Tailwind + design.md 시스템 |
| 콘텐츠 | Tiptap WYSIWYG (JSON 저장 + plain text 인덱싱) |
| 테스트 | Vitest (unit + Storybook play) + Playwright (E2E) |
| 배포 | Docker compose + GitHub Actions |

## 프로젝트 구조

```
simple-cms/
├── apps/
│   ├── admin/         # 관리자 CMS (port 3001)
│   └── web/           # 공개 웹 (port 3000)
├── packages/
│   ├── db/            # Prisma schema + client + helper
│   ├── editor/        # 공유 Tiptap 확장
│   ├── types/         # 공용 DTO + 도메인 타입
│   └── config/        # tsconfig + eslint 공유 설정
├── docker/            # docker-compose.yml
├── e2e/               # Playwright spec
└── docs/              # 설계서 + 배포 가이드 + 명세서
```

자세한 내용은 [`CLAUDE.md`](CLAUDE.md) (도메인 모델, 운영 정책, Stage 진행 표) 참조.

## 라이선스

비공개 프로젝트.
