# 시연 모드 배포 가이드 (Vercel + Supabase)

> **최종 검토**: 2026-05-20 — Supabase 대시보드 개편(Connect 패널 신설, API Keys 리네임), 신규 API 키 체계(`sb_publishable_*` / `sb_secret_*`), Prisma `DIRECT_URL` Session pooler 권장 전환, Vercel Hobby cron 100개 한도 갱신, **Storybook 2개를 web 빌드 산출물에 동봉**해 시연 admin + web + Storybook admin/web을 **단일 Vercel web 프로젝트**에서 서빙(10장), 검색엔진 차단 정책(11장).
>
> 이 가이드는 시연 모드 인프라(PR1~7)가 모두 완료된 후 **한 번에 배포 환경을 구성**할 때 사용한다. 운영 배포는 별도(`DEMO_MODE` 미설정)이며 본 가이드는 시연 전용 환경만 다룬다.
>
> **대상 시점**: master 브랜치에 PR1~PR7이 모두 머지된 상태. PR6 또는 PR7 미완료 시점에 미리 배포해보고 싶다면 5장(시드 적재) → "방법 A — `db:demo-seed` only"만 따르면 된다 (CLI/Admin UI 미사용).
>
> **PR1~7 한 줄 요약**:
>
> - PR1 단일 도메인 rewrites + admin basePath
> - PR2 17모델 sessionId 컬럼
> - PR3 Prisma extension + AsyncLocalStorage 격리 인프라
> - PR4 visitor 자동 진입 (cloneSeedToSession + bootstrap + layout gate + 1h TTL)
> - PR5 Storage 격리 + cleanup cron + Reset API + DemoBanner UI
> - PR6 Snapshot Export/Import 코어 + Walker + CLI (`pnpm demo:export` / `demo:import`)
> - PR7 Admin UI (`/settings/demo-snapshot` — 미리보기 통계 + 다운로드 + 즉시 적용)

---

## 0. 사전 준비물

- Vercel 계정 (Hobby plan으로 충분 — cron 최대 100개 / daily 빈도 / hourly 정밀도 한도 내)
- (선택) Storybook 카탈로그를 시연 환경에 같이 노출하려면 10장 절차 적용 — **추가 Vercel 프로젝트 없이** web 빌드 산출물에 동봉되어 단일 도메인에서 함께 서빙됨
- Supabase 계정 (Free plan으로 충분 — DB 500MB / Storage 1GB)
- 도메인(선택) — 시연 전용 커스텀 도메인을 쓰려면 미리 확보. 없으면 Vercel이 발급하는 `*.vercel.app` 사용
- 로컬에 git/pnpm/node 22 설치
- master 브랜치 최신 상태 (PR7까지 머지 완료)

---

## 1. Supabase 시연 프로젝트 생성

### 1-1. 프로젝트 생성

1. https://supabase.com → **New project**
2. 이름: 자유 (예: `simple-cms-demo`)
3. Database Password: 반드시 메모 (강한 랜덤 권장 — 나중에 재확인 어려움)
4. Region: 서비스 대상 가까운 곳 (한국이면 `Northeast Asia (Seoul)` 권장)
5. Plan: **Free** (시연용 충분)

### 1-2. PGroonga 확장 활성화

1. 좌측 사이드바 **Database** → **Extensions** (대시보드 navigation)
2. 검색창에 `pgroonga`
3. 토글 활성화 (자동으로 `CREATE EXTENSION pgroonga` 실행됨)

> Free plan에서도 PGroonga 활성화 가능. 첫 활성화 시 1~2분 소요.

### 1-3. Storage bucket 생성

1. 좌측 사이드바 **Storage** → **New bucket**
2. Name: `demo-uploads`
3. Public bucket: ☑ 체크 (시연 자료는 공개 URL로 서빙)
4. **Save**

### 1-4. 연결 정보 복사 (메모장에 임시 보관)

> 📍 **2024년 후반부터 Supabase 대시보드가 개편됐다.** 연결 문자열은 더 이상 "Project Settings → Database" 탭에 없다.
> 대시보드 상단의 **[Connect] 버튼**(또는 좌측 메뉴 `Project Settings → Database`의 "Connection string" 섹션) 패널을 사용한다.

#### A. DB 연결 문자열 (Connect 패널)

1. 프로젝트 대시보드 상단의 **[Connect]** 버튼 클릭 (정확한 위치는 Supabase UI 개편에 따라 변경 가능 — 상단 navigation에서 "Connect" 라벨 검색)
2. Connect 패널에서 **Prisma용 connection string** 섹션 또는 framework/ORM 선택 영역에서 Prisma 선택
3. 다음 2개 값을 복사:

| 패널 라벨                          | Vercel 환경변수명 | 형식 예시                                                                                                   |
| ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **Transaction pooler** (port 6543) | `DATABASE_URL`    | `postgres://postgres.xxx:PASS@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| **Session pooler** (port 5432)     | `DIRECT_URL`      | `postgres://postgres.xxx:PASS@aws-0-...pooler.supabase.com:5432/postgres`                                   |

> ⚠️ **변경된 권장사항** (2025년 이후):
>
> - `DATABASE_URL`은 `?pgbouncer=true&connection_limit=1`까지 포함 (둘 다 권장 — pgbouncer는 prepared statement 충돌 방지, connection_limit는 serverless 함수당 풀 제어).
> - `DIRECT_URL`은 **Session pooler**(`pooler.supabase.com:5432`)를 사용.
>   기존 가이드의 "Direct connection"(`db.xxx.supabase.co:5432`)은 IPv6 기본이라 일반 ISP/Vercel에서 IPv4 Add-On(유료) 없이 연결 실패 가능. IPv6 지원 환경이라면 Direct connection도 동작하나, 시연 환경은 **Session pooler 권장**.

#### B. Project URL + API Key (Settings → API Keys)

1. 좌측 사이드바 **Project Settings** → **API Keys** (구 "API" 탭이 "API Keys"로 리네임됨)
2. 다음 2개 값을 복사:

| 라벨                                                                | Vercel 환경변수명           | 형식                                       |
| ------------------------------------------------------------------- | --------------------------- | ------------------------------------------ |
| **Project URL**                                                     | `SUPABASE_URL`              | `https://xxx.supabase.co`                  |
| **secret key** (`sb_secret_xxx`) 또는 **service_role key** (legacy) | `SUPABASE_SERVICE_ROLE_KEY` | 신규: `sb_secret_...` / 구: `eyJ...` (JWT) |

> 🔐 **API 키 마이그레이션 안내**:
>
> - Supabase가 2024년부터 신규 키 체계(`sb_publishable_*` / `sb_secret_*`)로 전환 중. legacy `anon` / `service_role` 키는 **2026년 말까지만 동작**.
> - 본 코드베이스의 환경변수명은 그대로 `SUPABASE_SERVICE_ROLE_KEY` 유지하되, **값은 신규 `sb_secret_xxx`로 복사**할 것 (서버 사이드 권한이 같음).
> - 절대 `NEXT_PUBLIC_` 접두 금지 (client bundle에 secret 노출됨).

---

## 2. Vercel 프로젝트 생성 (admin / web 2개)

### 2-1. admin 프로젝트

1. https://vercel.com → **Add New** → **Project**
2. GitHub 레포 선택 (`simple-CMS` 또는 본인 fork)
3. **Configure Project**:
   - **Project Name**: `simple-cms-admin-demo` (자유)
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `apps/admin` ← **꼭 변경**
   - **Build Command**: `cd ../.. && pnpm --filter @simple-cms/admin build`
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
   - **Output Directory**: 기본값 (`.next`)
   - **Node.js Version**: `22.x`
4. **Environment Variables**: 일단 **3장 마스터 리스트의 admin 값들을 모두 등록한 후 Deploy**
5. **Deploy** 클릭 (1차 빌드는 cron 설정 자동 인식 + 환경변수 검증 목적)

> **Prisma client 자동 생성**: `packages/db`의 `postinstall: prisma generate`가 Install 단계에서 자동 실행되어 `packages/db/src/generated/prisma/`를 만든다. 별도 build step 추가 불필요. `packages/db/src/generated/`는 `.gitignore` 대상이라 Git에 없으므로 이 postinstall이 누락되면 빌드가 `Module not found: Can't resolve './generated/prisma/client'`로 실패한다.

### 2-2. admin 배포 URL 확보

- 배포 성공 후 Production Domain 복사 (예: `https://simple-cms-admin-demo.vercel.app`)
- 이 URL을 다음 단계의 `NEXT_PUBLIC_ADMIN_REWRITE_URL`에 사용

### 2-3. web 프로젝트

1. **Add New** → **Project** (같은 GitHub 레포 다시 선택)
2. **Configure Project**:
   - **Project Name**: `simple-cms-web-demo` (자유)
   - **Root Directory**: `apps/web` ← **꼭 변경**
   - **Build Command**: `cd ../.. && pnpm --filter @simple-cms/web build:demo` ← **`build`가 아니라 `build:demo`** (Storybook 2개를 web 빌드에 동봉 — 10장 참조)
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
   - **Node.js Version**: `22.x`
3. Environment Variables — 3장 마스터 리스트의 web 값들 등록 (`NEXT_PUBLIC_ADMIN_REWRITE_URL`은 2-2에서 받은 admin URL)
4. **Deploy**

> `build:demo`는 `pnpm bundle-storybooks && next build` 흐름이라 admin/web Storybook 두 개를 `apps/web/public/_cms/storybook/{admin,web}/`에 출력한 뒤 web Next.js 빌드를 진행한다. 운영 self-host에서는 그대로 `build` 사용 (Storybook 동봉 불필요).

### 2-4. 커스텀 도메인 (선택)

- web 프로젝트 Settings → Domains에 시연 도메인(예: `demo.example.com`) 연결
- DNS A 레코드 또는 CNAME을 Vercel이 안내하는 값으로 설정
- admin 프로젝트는 도메인 안 붙여도 됨 — web origin에서 `/_cms/admin/*` rewrite로 자동 프록시

---

## 3. 환경변수 마스터 리스트

각 변수의 **Environments**는 모두 **Production**만 체크 (Preview/Development는 해제 — 시연은 prod 단일 환경).

### admin 프로젝트 환경변수

| Key                         | Value 예시                                                                                                    | 출처                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `DEMO_MODE`                 | `true`                                                                                                        | 고정                                                                                            |
| `DATABASE_URL`              | `postgresql://postgres.xxx:PASS@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | 1-4의 Transaction pooler                                                                        |
| `DIRECT_URL`                | `postgresql://postgres.xxx:PASS@aws-0-...pooler.supabase.com:5432/postgres`                                   | 1-4의 Session pooler (Prisma migrate 전용)                                                      |
| `STORAGE_PROVIDER`          | `supabase`                                                                                                    | 고정                                                                                            |
| `SUPABASE_URL`              | `https://xxx.supabase.co`                                                                                     | 1-4                                                                                             |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`                                                                                                      | 1-4 (서버 전용, 절대 NEXT*PUBLIC* 접두 금지)                                                    |
| `SUPABASE_STORAGE_BUCKET`   | `demo-uploads`                                                                                                | 1-3에서 만든 이름                                                                               |
| `CRON_SECRET`               | `openssl rand -hex 32`로 생성한 64자 hex                                                                      | 신규 생성 (PR5에서 추가됨)                                                                      |
| `WEB_BASE_URL`              | `/`                                                                                                           | 시연은 단일 origin이라 상대 경로                                                                |
| `NEXT_PUBLIC_SITE_URL`      | `https://demo.example.com` (커스텀 도메인) 또는 web 프로젝트의 vercel.app URL                                 | 시연 메인 URL                                                                                   |
| `INITIAL_ADMIN_USERNAME`    | `admin` (자유)                                                                                                | seed.ts용. 시연에선 demo-seed가 별도 demo_admin 생성하므로 영향 적지만 운영 seed 호환 위해 등록 |
| `INITIAL_ADMIN_PASSWORD`    | 강한 임시 비밀번호                                                                                            | 운영 seed 호환용                                                                                |

### web 프로젝트 환경변수

| Key                             | Value 예시                                 | 출처                           |
| ------------------------------- | ------------------------------------------ | ------------------------------ |
| `DEMO_MODE`                     | `true`                                     | 고정                           |
| `DATABASE_URL`                  | admin과 동일 값                            | 1-4                            |
| `NEXT_PUBLIC_ADMIN_REWRITE_URL` | `https://simple-cms-admin-demo.vercel.app` | 2-2의 admin Production URL     |
| `NEXT_PUBLIC_SITE_URL`          | `https://demo.example.com`                 | admin과 동일                   |
| `FEEDBACK_IP_SALT`              | `openssl rand -hex 16`로 생성              | Stage 10 — 익명 피드백 IP 해싱 |

> web에는 `SUPABASE_*` / `STORAGE_PROVIDER` / `SERVICE_ROLE_KEY` 모두 **불필요**. web은 업로드를 하지 않고 Media 공개 URL은 이미 DB에 절대 경로로 저장되어 있음. service_role key는 서버 전용 권한이라 web에서 보유할 이유 없음 (보안 최소 원칙).

### 등록 방법 (Dashboard)

1. 프로젝트 → **Settings** → **Environment Variables**
2. 각 항목 입력 후 **Save**
3. 모든 변수 등록 후 **Settings → Deployments** 또는 git push로 재배포 (환경변수 변경은 재배포해야 반영됨)

### 등록 방법 (CLI 일괄)

```bash
npm i -g vercel
vercel login

# admin 프로젝트
cd apps/admin
vercel link    # 기존 프로젝트 선택
vercel env add DEMO_MODE production           # 프롬프트에서 'true' 입력
vercel env add DATABASE_URL production
vercel env add CRON_SECRET production
# ... (모든 변수 반복)

# 또는 .env 파일을 한번에 push (vercel pull/push)
# vercel env push는 vercel CLI v34+ 지원
```

---

## 4. DB 초기화 (로컬에서 한 번 실행)

배포된 admin/web 프로젝트가 새 Supabase DB에 schema를 만들어주지 않는다. 로컬에서 1회 실행:

```bash
# 1. .env 파일에 시연 Supabase의 DATABASE_URL/DIRECT_URL 임시 적재
#    DATABASE_URL = Transaction pooler (port 6543, ?pgbouncer=true&connection_limit=1)
#    DIRECT_URL   = Session pooler (port 5432). 1-4절 참조
echo "DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" >> .env
echo "DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres" >> .env

# 2. Prisma client 재생성 (사실 schema 변동 없으면 skip 가능)
pnpm db:generate

# 3. schema 적용 (prisma db push 사용 — 운영 정책)
pnpm db:push

# 4. PGroonga 인덱스 + 검색 설정 (멱등 SQL)
pnpm db:pgroonga
```

### 주의

- `pnpm db:push` 사용 (운영 정책. `migrate dev`는 reset 위험으로 금지)
- 이 단계는 **시연 Supabase URL**로 실행 — 운영 DB 건드리지 않게 `.env`의 `DATABASE_URL`을 임시 교체했다가 작업 후 원복
- 또는 별도 `.env.demo`를 만들고 `dotenv-cli`로 격리 실행 권장

---

## 5. 시드 데이터 적재

PR 진행 상황 + 운영자 선호에 따라 세 방법 중 선택.

| 방법                                  | 가능 시점 | 콘텐츠 풍부도          | 운영자 도구 | 추천 시점                     |
| ------------------------------------- | --------- | ---------------------- | ----------- | ----------------------------- |
| A. `pnpm db:demo-seed`                | PR4+      | 최소 22 row 빈 골격    | CLI         | 첫 배포 검증 / PR6 미완료     |
| B. `pnpm demo:export → demo:import`   | PR6+      | 풍부 (운영 dev 콘텐츠) | CLI 양쪽    | 첫 배포 후 본격 시드 / 자동화 |
| C. Admin UI `/settings/demo-snapshot` | PR7+      | 풍부                   | 브라우저    | 운영자 친화적 / 정기 갱신     |

### 방법 A — `pnpm db:demo-seed` (PR4 완료 시점부터 가능, 최소 22 row)

```bash
# 시연 Supabase URL이 .env에 적재된 상태에서
pnpm --filter @simple-cms/db db:demo-seed
```

생성되는 시드 (sessionId='**SEED**'):

- Role 2개 (총괄/일반 관리자)
- User 1개 (`demo_admin` / `demo_password`, ACTIVE 총괄)
- SiteSettings 6개 (CONCURRENT*LOGIN, SITE_NAME='시연 CMS', SITE_DESCRIPTION, UPLOAD*\*)
- NavigationMenu 2개 (Header, Footer)
- Board 1개 (`notice`)
- Subpage 1개 (`about`, PUBLISHED)
- PageBlock 1개 (about RICH_TEXT)
- HomeSection 6개 (HERO/RECOMMENDED/SHORTCUT/LATEST_POSTS/CTA/NOTICE 비어있는 상태)
- NavigationMenuItem 2개 (Header/Footer에 about 링크)

→ 빈 메인 + 1개 서브페이지 + 빈 게시판 시연 환경

### 방법 B — `pnpm demo:import ./snapshot.json` (PR6 완료 후 권장)

운영 DB나 별도 환경에서 실제 콘텐츠를 가진 snapshot을 만들어 적재.

```bash
# (먼저) 운영 또는 dev 환경에서 export
pnpm demo:export ./snapshot.json

# (그 다음) 시연 Supabase에 import (.env가 시연 URL을 가리킨 상태에서)
pnpm demo:import ./snapshot.json
```

이 흐름은 풍부한 콘텐츠를 시연용으로 익명화/리사이즈해서 적재한다 (sharp 1600px / Media base64 / Tiptap walker / SubpageVersion + SubpageFeedback 포함, AuditLog/ErrorLog/Session/PreviewToken/User.password 제외).

### 방법 C — Admin UI `/settings/demo-snapshot` (PR7 완료 후, 운영자 친화적)

브라우저에서 운영자가 직접 export/import. 운영자가 SQL/CLI 모르고도 시드 갱신 가능.

**준비**:

1. 운영 또는 dev 환경의 admin에 총괄 관리자(또는 `demo-snapshot:create + update` 권한 보유 사용자)로 로그인
2. 사이드바 → **사이트 설정** → **시연 스냅샷** 탭
   - 일반 관리자에게는 이 탭이 안 보임 (운영자 전용 권한 게이팅)
3. 14모델 row count + Media 합계 사이즈 미리보기 확인 (운영 sentinel `__PROD__` 통계)

**Export (운영/dev에서 다운로드)**:

1. **[스냅샷 내보내기]** 버튼 클릭
2. 브라우저가 `demo-snapshot-{ISO시각}.json` 자동 다운로드
3. toast로 row count + 사이즈 표시

**Import (시연 환경에서 적용)**:

1. 시연 admin에 운영자로 로그인 (시연 URL의 `/_cms/admin/settings/demo-snapshot`)
2. **[Supabase에 즉시 적용]** 버튼 클릭 → file 선택 dialog
3. 1번에서 다운로드한 JSON 선택 → AlertDialog 확인 모달 → **[적용]**
4. 진행 중 indicator 표시. 완료 시 toast + import 결과 카드 (생성 row / 업로드 file / 부분 실패 details)

> [Supabase 즉시 적용]은 `DEMO_MODE=true` 시연 환경에서만 동작. 운영 환경은 버튼 자체가 비활성화 + 안내 표시. 운영 환경에서 시드를 만들려면 export만 사용.

**감사 로그**:

- export: `entityType: 'SITE_SETTINGS'` + `entityId: 'DEMO_SNAPSHOT_EXPORT'` (운영 데이터가 외부로 나가는 추적용)
- import: `entityType: 'SITE_SETTINGS'` + `entityId: 'DEMO_SNAPSHOT_IMPORT'` + 결과 통계

### 시드 적재 후 검증

```bash
# Supabase SQL Editor에서
SELECT "sessionId", COUNT(*) FROM "User" GROUP BY "sessionId";
-- '__SEED__' 1개 row만 보이면 정상
```

---

## 6. cron 활성화 확인

배포 후 admin 프로젝트의 `vercel.json`(`apps/admin/vercel.json`)이 자동 인식된다.

1. admin 프로젝트 → **Settings** → **Crons**
2. `/api/demo/cleanup` schedule `0 3 * * *` 항목 표시 확인
3. **Trigger now** 버튼으로 즉시 실행해서 200 응답 확인 (또는 아래 curl)

```bash
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://demo.example.com/_cms/admin/api/demo/cleanup
# 응답: {"success":true,"data":{"sessionsScanned":0,...}}
```

401 응답 시 `CRON_SECRET` 환경변수 미설정/오타. 503 응답 시 `DEMO_MODE` 미설정.

> Vercel Hobby plan: cron 최대 **100개** 등록 가능 (2024년 변경). 단 빈도는 **daily만** + 정밀도는 hourly(±59분 윈도우). 시연 cleanup + keepalive + healthcheck 모두 등록해도 한도 여유 충분. 분 단위 정밀도 / 잦은 실행이 필요하면 Pro plan (cron 자체 한도는 plan별로 100개 동일).

---

## 7. 일시정지 회피 (Supabase Free plan)

Supabase Free plan은 **7일 미사용 시 DB 자동 일시정지**된다. 시연 트래픽이 일주일 끊기면 다음 방문자 첫 접속 시 splash 무한 로딩.

### 회피책 — GitHub Actions keepalive (권장)

`.github/workflows/demo-keepalive.yml`:

> GitHub Actions를 권장하는 이유는 **slot 한도 회피가 아니라** Supabase 외부 ping이 자연스럽고 Vercel cron 의존성을 줄이기 위해서다. Vercel cron으로 keepalive 추가해도 한도 문제 없음 (6장 참조).

```yaml
name: Demo Keepalive
on:
  schedule:
    - cron: '0 0 * * 1' # 매주 월요일 00:00 UTC
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping demo home
        run: curl -fSL https://demo.example.com/
```

### 대안

- UptimeRobot / BetterUptime 등 외부 모니터링으로 주 1회 ping
- `/api/healthcheck` 엔드포인트 추가 (PR8+ 검토)

---

## 8. 검증 체크리스트

배포 직후 시크릿 창에서:

- [ ] `https://demo.example.com/` 접근 → splash → 메인 진입
- [ ] 상단 노란 banner — Badge "시연 모드" + 카운트다운 1초마다 감소
- [ ] sticky chain — 스크롤 시 banner > AdminHeader > PageToolbar 순서로 stack
- [ ] `https://demo.example.com/_cms/admin/dashboard` 접근 → 같은 시연 세션으로 admin 진입 (자동 로그인)
- [ ] `/media` 페이지에서 임의 이미지 업로드 → Supabase Storage `<sessionId>/home/...` 폴더 자동 생성 확인
- [ ] 다른 시크릿 창으로 동일 진입 → 첫 창의 콘텐츠 안 보이는지 격리 확인
- [ ] `/media`에서 시드 이미지(**SEED**/...) [삭제] 시도 → DB Media row만 사라지고 Supabase 파일은 보존되는지 (가장 중요한 가드)
- [ ] DemoBanner [새 세션 시작] 클릭 → AlertDialog 확인 → splash → 새 sessionId로 재진입
- [ ] cron 수동 트리거 (6장) → 200 응답
- [ ] 1시간 후 자동 redirect 또는 Supabase SQL로 강제 만료 후 cron 트리거 → 만료 sessionId 데이터 삭제 + Storage 파일 삭제 + `__SEED__/`/`__PROD__/` 보존 확인
- [ ] (PR7) 시연 admin → 사이드바 → **사이트 설정** → **시연 스냅샷** 탭 표시 확인 + 운영자 통계 정상 회수 (운영 sentinel `__PROD__` row count + Media 합계 사이즈)
- [ ] (PR7) 시연 admin에서 **[스냅샷 내보내기]** 버튼 클릭 → JSON 다운로드 + toast 결과 표시
- [ ] (PR7) 일반 관리자로 시연 admin 진입 → **시연 스냅샷** 탭이 SettingsNav에서 안 보이는지 (운영자 전용 권한 게이팅 검증)
- [ ] (PR7) 운영 admin(`DEMO_MODE` 미설정)에서 시연 스냅샷 탭 진입 → **[Supabase에 즉시 적용]** 버튼이 비활성화 + 안내 표시 (운영 환경 import 차단)
- [ ] **검색엔진 차단** (11장) — 시연 admin + web 단일 origin의 4개 경로(`/`, `/_cms/admin/dashboard`, `/_cms/storybook/admin/`, `/_cms/storybook/web/`) 모두 `curl -I` 응답 헤더에 `X-Robots-Tag: noindex, nofollow, noarchive` 포함 확인
- [ ] **robots.txt** — `curl https://demo.example.com/robots.txt` 응답이 `User-agent: *` + `Disallow: /` (DEMO_MODE=true 분기). sitemap/host 라인이 없는지 확인

---

## 9. 운영

### 시드 갱신 (콘텐츠 변경 적용)

**옵션 1 — Admin UI (PR7+, 운영자 권장)**:

1. 운영 admin에 운영자로 로그인
2. 사이드바 → **사이트 설정** → **시연 스냅샷** 탭
3. **[스냅샷 내보내기]** → 브라우저 다운로드
4. 시연 admin URL(`https://demo.example.com/_cms/admin/settings/demo-snapshot`)로 이동
5. **[Supabase에 즉시 적용]** → 다운로드한 파일 선택 → AlertDialog 확인 → 적용
6. 결과 카드의 row count + 부분 실패 details 검토. 새 visitor부터 새 시드 자동 반영 (기존 visitor는 1시간 후 만료)

**옵션 2 — CLI (자동화/CI 적용)**:

```bash
# (운영 환경에서 export)
pnpm demo:export ./snapshot.json

# (시연 .env로 격리 실행 — 부록 A 참조)
dotenv -e .env.demo -- pnpm demo:import ./snapshot.json

# 또는 시연 .env가 메인 .env에 적재된 경우 직접
DEMO_MODE=true STORAGE_PROVIDER=supabase ... pnpm demo:import ./snapshot.json
```

CLI는 CI/CD 자동화나 운영자가 SQL/CLI 친숙할 때. 두 옵션 모두 같은 백엔드(`importSnapshotToSeed`)를 호출하므로 결과 동일.

### 운영자 수동 cleanup

```bash
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://demo.example.com/_cms/admin/api/demo/cleanup
```

### 시연 dormant 시 (1주 이상 트래픽 없음)

- Supabase Dashboard → Project가 일시정지 상태면 **Restore** 클릭
- GitHub Actions keepalive 워크플로우 활성화 추천

### 환경변수 변경 시 주의

- 변수 변경 후 **재배포 필수** (`vercel deploy --prod` 또는 git push)
- 단순 변수 추가는 자동 재배포 트리거 안 됨 → Settings에서 **Redeploy** 클릭

---

## 10. Storybook 카탈로그 동봉 (시연 web 빌드 내 정적 동봉)

admin/web 각각의 Storybook을 **시연 web 프로젝트의 빌드 산출물에 직접 동봉**해 단일 도메인에서 4가지(admin 시연 + web 시연 + Storybook 2개)를 모두 서빙한다. **별도 Vercel 프로젝트 추가 없음** — 2-3절에서 web Build Command를 `build:demo`로 설정하면 본 동작이 자동 발생.

> Stage 17까지 정비된 디자인 시스템 카탈로그(admin 6 파일 + web 6 파일 + 컴포넌트/widget stories)를 시연 평가자에게 공개하기 위한 절차다. 카탈로그 공개를 원하지 않으면 web Build Command를 평범한 `build`로 두면 됨 (`build:demo` 미선택 시 동봉이 발생하지 않음).

### 10-1. 동작 원리

`apps/web/package.json`의 `build:demo` 스크립트는 `pnpm bundle-storybooks && next build` 순서로 실행한다.

```
pnpm bundle-storybooks
  ├─ apps/web/scripts/bundle-storybooks.mjs
  │   ├─ 1. apps/web/public/_cms/storybook/ 비우기
  │   ├─ 2. admin Storybook build → apps/web/public/_cms/storybook/admin/
  │   └─ 3. web   Storybook build → apps/web/public/_cms/storybook/web/
  └─ next build
      └─ web 일반 Next.js 빌드 (public/ 디렉토리가 정적 산출물에 그대로 포함됨)
```

배포 후 단일 origin에서 다음 4 경로가 모두 노출된다:

| 경로                                      | 처리 위치                                    | 비고                    |
| ----------------------------------------- | -------------------------------------------- | ----------------------- |
| `demo.example.com/`                       | web Next.js                                  | 메인                    |
| `demo.example.com/_cms/admin/*`           | web Next.js rewrites → admin Vercel 프로젝트 | 기존 시연 인프라 그대로 |
| `demo.example.com/_cms/storybook/admin/*` | web `public/_cms/storybook/admin/` (정적)    | 빌드 시 동봉            |
| `demo.example.com/_cms/storybook/web/*`   | web `public/_cms/storybook/web/` (정적)      | 빌드 시 동봉            |

### 10-2. 코드 위치 (이미 반영됨)

- `apps/web/scripts/bundle-storybooks.mjs` — `child_process.spawn`으로 `pnpm --filter @simple-cms/{admin,web} exec storybook build --output-dir <abs>` 2회 실행. cross-platform (`shell: true`)
- `apps/web/package.json` scripts:
  - `"build:demo": "pnpm bundle-storybooks && next build"` ← **Vercel web 프로젝트가 호출하는 명령**
  - `"bundle-storybooks": "node scripts/bundle-storybooks.mjs"`
  - `"build": "next build"` ← 운영(Docker self-host)이 호출하는 명령. Storybook 동봉 없음
- `.gitignore`: `apps/web/public/_cms/storybook/` 추가 (build artifact)

운영 self-host의 Dockerfile은 `pnpm --filter @simple-cms/web build`를 사용하므로 영향 0.

### 10-3. Vercel 설정 (2-3절에서 이미 처리)

2-3절의 web 프로젝트 Build Command가 `build:demo`이면 자동 동봉. 이미 배포된 web 프로젝트라면 Settings → Build & Development Settings에서 Build Command를 다음으로 변경 후 Redeploy:

```
cd ../.. && pnpm --filter @simple-cms/web build:demo
```

> **환경변수 더미 추가 불요** — admin/web Storybook은 web 시연 프로젝트의 실제 환경변수(`DATABASE_URL`/`SUPABASE_*` 등)가 이미 적재된 빌드 컨텍스트에서 실행되므로 별도 더미 세팅이 필요 없다. 이전 가이드 버전이 요구하던 dummy `DATABASE_URL`/`SESSION_SECRET`/`FEEDBACK_IP_SALT` 세트는 더 이상 불필요.

### 10-4. 빌드 시간 영향

- 기본 `build` → admin/web 시연 본체만 빌드 (수십 초)
- `build:demo` → 위 + Storybook 2개 추가 빌드 → **약 3~6분 증가** (story 100+ 기준)
- 빌드 산출물 크기: web `.vercel/output/static/_cms/storybook/`에 약 20~50MB 추가
- Vercel Hobby plan 빌드 시간 한도는 build당 45분이라 충분히 여유

빌드 시간이 부담되면 `bundle-storybooks.mjs`를 환경변수(`SKIP_STORYBOOKS=true`)로 가드해서 PR preview에서만 skip하는 식으로 확장 가능 (현재 가이드 범위 외).

### 10-5. 검증 체크리스트

로컬에서 1회:

```bash
# 모노레포 루트에서
pnpm --filter @simple-cms/web build:demo
# 또는 apps/web 디렉토리에서
pnpm build:demo
```

- [ ] `apps/web/public/_cms/storybook/admin/index.html` 생성 확인
- [ ] `apps/web/public/_cms/storybook/web/index.html` 생성 확인
- [ ] `apps/web/.next/` 정상 생성 (next build 단계 통과)

배포 직후 시크릿 창에서:

- [ ] `https://demo.example.com/_cms/storybook/admin/` 접근 → Storybook UI 표시 + 좌측 sidebar에 `Admin/Design System/*` 6개 항목 노출
- [ ] `Admin/Design System/Colors` 진입 → 모든 토큰 시각화 (light/dark 양쪽)
- [ ] `Admin/Features/Auth/LoginForm` 진입 → 컴포넌트 렌더 + Controls 패널 정상
- [ ] `https://demo.example.com/_cms/storybook/web/` 접근 → `Web/Design System/*` 6개 항목 노출
- [ ] `Web/Design System/KRDS Colors` 진입 → 31개 팔레트 렌더 + Pretendard 폰트 로드 정상
- [ ] `Web/Shared/Carousel > Regression22M` 진입 → 우측 **Interactions** 패널에서 모든 step ✓ 표시 확인 (Stage 7i ResizeObserver 회귀 자동 감지기. play function은 정적 Storybook UI에서 자동 실행됨)

### 10-6. 한계 / 운영 시 유의

- **Storybook만 수정해도 web 전체 재배포**: Storybook 변경 빈도가 낮아 부담은 크지 않으나, 디자인 시스템 카탈로그를 자주 갱신한다면 Vercel **Ignored Build Step**으로 `git diff --quiet HEAD^ HEAD -- apps/{admin,web}/.storybook apps/{admin,web}/src/**/*.stories.tsx` 검사 추가 (선택 최적화)
- **검색엔진 인덱싱 차단은 11장에서 일괄 처리** — `apps/web/vercel.json`의 `X-Robots-Tag: noindex, nofollow, noarchive` 헤더가 web origin 전체에 적용되므로 `/_cms/storybook/*` 경로도 자동 차단. 추가 작업 불필요
- **시연 모드와 무관**: 본 동봉은 web Build Command(`build:demo`) 단계에서 발생할 뿐 런타임 DEMO_MODE/세션/AsyncLocalStorage와 무관. 운영 self-host도 동일 스크립트를 호출하면 동일 동작이 가능하나, 운영 도메인에서 디자인 시스템을 공개하는 것은 보안상 권장 안 함
- **빌드 캐시 회귀**: Storybook addon-vitest dep cache 이슈(Stage 7g) 재발 시 `node_modules/.cache/storybook + .vite` 삭제 후 재빌드. Vercel에서는 Settings → **Clear Build Cache** 버튼 사용
- **mock 데이터 노출**: Storybook story에 등장하는 mock(사용자 이름, 게시글 제목, 미디어 URL)은 fixture 데이터이지만 한국어 fixture가 운영 도메인 가까운 톤이면 평가자가 실 운영 데이터로 오인할 수 있음 — story 작성 시 명백한 fixture 표기(`[Demo] ...`, `샘플 게시글 ...`) 권장 (현 코드 변경 범위 외)
- **uploads/ 동봉 bloat**: `@storybook/nextjs-vite`가 Next.js `public/` 전체를 자동으로 staticDirs로 흡수하므로 `apps/web/public/uploads/` 안의 dev 업로드 파일이 두 Storybook 산출물(`/_cms/storybook/admin/uploads/...`, `/_cms/storybook/web/uploads/...`)에 그대로 복사된다. 운영 시연 환경의 `public/uploads/`는 일반적으로 비어있지만, dev에서 빌드를 실행했다면 자기 dev 미디어 URL이 정적 산출물에 섞일 수 있음 — Vercel 배포 시 항상 clean checkout에서 빌드되므로 운영 영향은 없으나, 로컬 빌드 산출물을 외부 공유할 때는 주의
- **Windows long-path 한계 (로컬 빌드 1회차)**: 이전 버전의 스크립트(빌드 순서 admin→web)에서는 web Storybook이 자기 `public/_cms/storybook/admin/`을 재귀 흡수해 self-nesting 폭주가 발생했다. **현 스크립트는 `apps/web/.tmp-storybook/`(public 바깥)에 먼저 빌드한 뒤 rename으로 이동**하므로 self-nesting 자체가 차단되지만, 만약 stale 산출물이 이미 `public/_cms/storybook/` 안에 self-nested로 남아있다면 첫 빌드의 `rm(finalBase)`가 EPERM/long-path 한도 때문에 실패할 수 있다. 시스템 재부팅 후 Windows 우클릭 삭제 또는 WSL `rm -rf` 로 cleanup 후 재시도 권장

---

## 11. 검색엔진 차단 정책 (시연 2개 프로젝트 공통)

시연 환경은 평가용이라 검색엔진에 노출돼서는 안 된다. 시연 admin + 시연 web = **2개 Vercel 프로젝트 모두**에 동일 차단을 적용한다. Storybook 2개는 10장 패턴(web 빌드 동봉)을 따르므로 web의 `vercel.json` headers가 자동 적용 → 별도 차단 작업 불요.

### 11-1. 차단 방식 (defense in depth)

| 계층                 | 적용 위치                                                          | 효과                                                                                                   |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| HTTP 응답 헤더 (1차) | `apps/admin/vercel.json` + `apps/web/vercel.json`의 `headers` 섹션 | 모든 응답에 `X-Robots-Tag: noindex, nofollow, noarchive` — Google/Bing 모두 인덱싱·링크 추적·캐시 차단 |
| robots.txt (2차)     | `apps/web/app/robots.ts`의 `DEMO_MODE=true` 분기                   | `User-agent: *` + `Disallow: /` — 정중한 크롤러는 진입 전 차단. sitemap·host 라인은 출력하지 않음      |

X-Robots-Tag는 HTTP 레벨이라 robots.txt를 무시하는 크롤러에도 강제 효과가 있다. robots.txt는 보조 — `<head>`의 `<meta name="robots">`는 정적 HTML(Storybook)에 자동 삽입되지 않으므로 채택하지 않음.

### 11-2. 코드 위치 (이미 반영됨)

```jsonc
// apps/admin/vercel.json
{
  "crons": [...],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive" }
      ]
    }
  ]
}
```

```jsonc
// apps/web/vercel.json (신규)
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive" },
      ],
    },
  ],
}
```

```typescript
// apps/web/app/robots.ts
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (process.env.DEMO_MODE === 'true') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  // ... 운영 분기 (SiteSettings 기반 동적 robots)
}
```

### 11-3. 적용 범위 매트릭스

| Vercel 프로젝트                           | Root Directory           | vercel.json 적용                                                       | robots.txt 동작                                                                                    |
| ----------------------------------------- | ------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 시연 admin (`simple-cms-admin-demo`)      | `apps/admin`             | ✅ admin/vercel.json의 headers + crons                                 | robots.txt 라우트 없음 (admin은 Next.js 동적 — `/_cms/admin/*` rewrite 받는 API/UI 전용)           |
| 시연 web (`simple-cms-web-demo`)          | `apps/web`               | ✅ web/vercel.json의 headers                                           | ✅ `DEMO_MODE=true`라 전체 Disallow                                                                |
| `/_cms/storybook/admin/*` (web 빌드 동봉) | (web 산출물의 정적 파일) | ✅ web/vercel.json의 headers — `source: "/(.*)"` 라 정적 파일에도 적용 | 동봉된 정적 자원이라 robots.txt 영향 없음 (web origin robots.txt의 `Disallow: /`가 이 경로도 포괄) |
| `/_cms/storybook/web/*` (web 빌드 동봉)   | (web 산출물의 정적 파일) | ✅ web/vercel.json의 headers                                           | 동봉된 정적 자원이라 robots.txt 영향 없음                                                          |

> 시연 web 본체는 X-Robots-Tag + robots.txt 양쪽 차단. Storybook 2개는 web 빌드 산출물에 동봉되어 같은 origin에서 서빙되므로 web의 `vercel.json` headers가 자동 적용 — Vercel 프로젝트 수가 2개로 유지되고 매트릭스도 단순해진다. 추가 보안이 필요하면 Vercel Deployment Protection 활성화 (web 프로젝트 1개에만 적용하면 Storybook 경로도 같이 보호됨).

### 11-4. 검증

```bash
# 단일 origin 4 경로 모두 동일 응답 헤더 확인 — 302든 200이든 응답 헤더에 X-Robots-Tag 포함되어야 함
curl -I https://demo.example.com/                                  # 시연 web (200)
curl -I https://demo.example.com/_cms/admin/dashboard               # 시연 admin (비로그인 시 302 → /login. 302 응답 자체에 X-Robots-Tag 포함 확인)
curl -I https://demo.example.com/_cms/storybook/admin/              # admin Storybook 동봉 (200)
curl -I https://demo.example.com/_cms/storybook/web/                # web Storybook 동봉 (200)
# 응답 헤더에 다음이 포함돼야 함:
#   X-Robots-Tag: noindex, nofollow, noarchive

# 시연 web의 robots.txt
curl https://demo.example.com/robots.txt
# 응답:
#   User-agent: *
#   Disallow: /
# (sitemap / host 라인 없음)
```

### 11-5. 운영 self-host 영향

- `vercel.json`은 **Vercel 배포에서만 읽힘**. Docker self-host 운영 환경에는 영향 없음 — Caddy/Nginx 등 reverse proxy가 자체적으로 응답 헤더를 처리.
- `apps/web/app/robots.ts`의 `DEMO_MODE === 'true'` 분기는 환경변수 기준이라 운영(`DEMO_MODE` 미설정)에서는 기존 SiteSettings 기반 동적 robots가 그대로 동작 (Stage 9 정책 유지).

### 11-6. 향후 Vercel에 운영 배포를 추가할 경우

운영 도메인을 Vercel에 배포하면 동일한 `vercel.json` headers가 자동 적용돼 **검색엔진이 운영 사이트도 인덱싱 못 함**. 이 경우:

- 운영용으로 vercel.json을 분리하지 말고 — 동일 코드베이스라 `vercel.json` 자체를 운영 환경에서는 비우거나 Vercel Settings → Project → Headers UI에서 시연용만 override
- 또는 `apps/web/vercel.json` 자체를 시연 전용 lockdown으로 두고, 운영은 Docker self-host로 분리 (현재 권장 트랙)

---

## 부록 A — `.env.demo` 템플릿 (로컬 작업용)

DB 초기화/시드 적재 시 시연 환경변수를 임시로 격리하려면 `.env.demo`를 만들고 `dotenv-cli`로 사용:

```dotenv
# apps/.env.demo (gitignore에 포함 권장)
DEMO_MODE=true
DATABASE_URL=postgresql://postgres.xxx:PASS@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xxx:PASS@aws-0-...pooler.supabase.com:5432/postgres
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...    # legacy(`eyJ...` JWT)도 2026년 말까지 호환
SUPABASE_STORAGE_BUCKET=demo-uploads
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=changeme
```

```bash
pnpm add -D -w dotenv-cli
dotenv -e .env.demo -- pnpm db:push
dotenv -e .env.demo -- pnpm db:pgroonga
dotenv -e .env.demo -- pnpm --filter @simple-cms/db db:demo-seed
# PR6 완료 후
dotenv -e .env.demo -- pnpm demo:import ./snapshot.json
```

`.env`(운영 dev용)와 분리되어 실수로 운영 DB를 건드릴 위험 차단.

---

## 부록 B — 문제 해결

| 증상                                                                      | 원인 추정                                                                          | 조치                                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| splash 무한 로딩                                                          | bootstrap API 503(SeedNotFoundError)                                               | Supabase에 `__SEED__` row 없음. 5장 시드 적재 재실행                                                                                                 |
| splash → 500                                                              | cloneSeedToSession 트랜잭션 실패                                                   | Supabase 로그 확인. 자주 발생 시 `DATABASE_URL`에 `?pgbouncer=true&connection_limit=1` 누락 의심                                                     |
| banner의 [새 세션 시작] 클릭 → 401                                        | admin Vercel 프로젝트의 reset endpoint 미인식                                      | admin 재배포. basePath 설정(`apps/admin/next.config.ts`) 확인                                                                                        |
| cron 미실행                                                               | `apps/admin/vercel.json` 미인식                                                    | admin 프로젝트 root directory 설정이 `apps/admin`인지 확인. Settings → Crons에 항목 표시되는지                                                       |
| 시드 이미지 [삭제]했는데 다른 visitor의 시드 이미지가 사라짐              | adapter `__SEED__` 가드 미작동 (회귀)                                              | `apps/admin/src/shared/lib/storage/supabaseAdapter.ts`의 `delete()` 분기 검증. PR5 회귀                                                              |
| visitor 격리 안 됨 (다른 창에서 같은 콘텐츠 보임)                         | `DEMO_MODE` 환경변수 미적용 또는 extension 미작용                                  | admin/web 양쪽에 `DEMO_MODE=true` 등록 확인. 빌드 캐시 초기화(`vercel deploy --prod --force`)                                                        |
| Supabase Free 5분 connection limit 초과                                   | pgbouncer 설정 누락                                                                | `DATABASE_URL` 끝에 `?pgbouncer=true&connection_limit=1` 추가. `DIRECT_URL`은 그대로 (마이그레이션 전용)                                             |
| Supabase 대시보드에 "Project Settings → Database" 탭이 없음               | 2024년 후반 UI 개편                                                                | 대시보드 상단의 **[Connect] 버튼** 사용. `Project Settings → API`는 `API Keys`로 리네임됨. 1-4절 참조                                                |
| Prisma migrate가 timeout / IPv6 관련 에러                                 | `DIRECT_URL`이 Direct connection(`db.xxx.supabase.co`)이고 환경이 IPv4 only        | `DIRECT_URL`을 **Session pooler**(`pooler.supabase.com:5432`)로 교체. IPv4 add-on 결제 불필요                                                        |
| API 키가 `eyJ...` 형식이 아니라 `sb_secret_xxx`                           | Supabase 신규 키 체계 (2024+)                                                      | 그대로 `SUPABASE_SERVICE_ROLE_KEY` 환경변수에 적재. legacy 키 호환 (2026년 말 만료)                                                                  |
| 1시간 지나도 만료 안 됨                                                   | `SESSION_MAX_AGE` 분기 누락                                                        | `apps/admin/src/shared/lib/cookies.ts` + `packages/db/src/sessionHelper.ts` 양쪽 분기 확인 (PR4)                                                     |
| `pnpm demo:export` 실행 시 "DATABASE_URL environment variable is not set" | ESM import hoisting로 `dotenv.config()`가 client.ts 평가 후 실행                   | `packages/db/package.json`의 demo-export script가 `tsx --env-file=../../.env`로 시작하는지 확인 (PR6 처리됨)                                         |
| `pnpm demo:import` 실행 시 "DEMO_MODE !== true" 에러                      | 운영 DB 보호 가드 작동 — .env에 시연 환경변수 미적재                               | `.env.demo`로 격리 실행 (`dotenv -e .env.demo -- pnpm demo:import ...`) 또는 임시로 `.env`에 `DEMO_MODE=true` + 시연 URL 적재                        |
| Admin UI [Supabase 즉시 적용] 503 응답                                    | 운영 환경에서 호출 (`DEMO_MODE !== 'true'`) 또는 `STORAGE_PROVIDER !== 'supabase'` | 시연 admin URL(`https://demo.example.com/_cms/admin/settings/demo-snapshot`)에서 호출. 운영 환경에서는 [내보내기]만 가능                             |
| Admin UI 시드 적용 후 일부 image broken                                   | walker mediaId 위치 누락 (회귀)                                                    | `snapshotWalker.ts` 분기 + 단위 테스트 14건 검증. SubpageVersion.snapshot 같은 깊은 경로 confirm                                                     |
| Admin UI에서 일반 관리자에게 시연 스냅샷 탭이 보임                        | demo-snapshot 권한 잘못 부여                                                       | `packages/db/prisma/seed.ts`의 `DEFAULT_PERMISSIONS`에 demo-snapshot이 빠져있는지 확인. `pnpm db:seed` 재실행 후 일반 관리자 역할 권한 매트릭스 검토 |
| Admin UI import 후 통계가 갱신 안 됨                                      | `router.refresh()` 호출 누락 또는 캐시 문제                                        | 페이지 hard reload (Ctrl+Shift+R). DemoSnapshotForm의 import 성공 흐름에 `router.refresh()` 호출 확인                                                |

### 실전 배포 디버깅 (PR4-7 후속 검증으로 발견된 함정)

| 증상                                                                      | 원인 추정                                                                          | 조치                                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel admin/web 빌드: `Module not found: Can't resolve './generated/prisma/client'` 6건 | `packages/db/src/generated/`는 `.gitignore` 대상 + `postinstall: prisma generate` 누락 | `packages/db/package.json` `scripts.postinstall: "prisma generate"` 1줄 추가. Vercel `pnpm install --frozen-lockfile` 시 자동 생성. Dockerfile은 무관(별도 명시 실행) |
| Vercel web 빌드: `Failed to collect page data ... DATABASE_URL environment variable is not set` + Turbo warning `missing from "turbo.json"` | Vercel 자동 감지로 `turbo run build` 실행 → Turborepo env sandbox가 환경변수 차단. Root Directory 수정 시 Build/Install Command가 자동 reset됨 | Vercel Dashboard → Settings → Build & Development Settings에서 **Override 토글 켜고** Build Command(`cd ../.. && pnpm --filter @simple-cms/web build:demo`) + Install Command(`cd ../.. && pnpm install --frozen-lockfile`) 명시 입력 |
| Vercel web 빌드: `The file ".next/routes-manifest.json" couldn't be found` + path가 admin을 가리킴 | web 프로젝트의 Root Directory가 `apps/admin`으로 잘못 설정 | Vercel Dashboard → Settings → General → Root Directory를 `apps/web`으로 변경 + Build/Install Command 재설정 (자동 reset되므로 위 행 참조) |
| `/_cms/admin` 접속 시 `ERR_TOO_MANY_REDIRECTS` (모두 308 + Location `/_cms/admin`) | web rewrites `:path*`이 empty match 시 destination을 trailing slash로 만들고 admin Vercel CDN의 자동 trailing slash 정규화와 충돌 | `apps/web/next.config.ts` rewrites 배열의 첫 룰로 `{ source: '/_cms/admin', destination: ${adminRewriteUrl}/_cms/admin/dashboard }` 명시 (`/_cms/admin/:path*` catch-all 위에) |
| admin splash 진입 시 콘솔 `POST /api/demo/bootstrap 404` + "일시적 오류" | `apps/admin/app/demo-bootstrap/DemoBootstrapClient.tsx`의 `BOOTSTRAP_ENDPOINT`가 basePath 누락 (`/api/demo/bootstrap`) | `/_cms/admin/api/demo/bootstrap` 명시. Next.js client-side fetch는 basePath 자동 prepend 안 함 (admin AGENTS.md 명시 정책) |
| Storybook (`/_cms/storybook/admin`) 빈 화면 + manager asset 404 (sb-manager/sb-addons) | `.storybook/main.ts`에 base path 미설정 → vite preview만 절대 path 됨, manager builder는 `./sb-manager/...` relative 그대로 박힘 → trailing slash 없는 URL에서 부모 디렉토리로 resolve | `bundle-storybooks.mjs`가 4-layer 처리: (1) `STORYBOOK_BASE_PATH` env로 viteFinal `config.base` 주입 (2) HTML `src=`/`href=` 절대 path 치환 (3) inline ES module `import './...'` 절대 path 치환 (4) `<base href>` 명시 주입 |
| Storybook 사이드 메뉴 오류 + 콘솔에 `NEXT_REDIRECT;/demo-bootstrap?next=%2F_cms%2Fstorybook%2Findex.json` | Storybook이 stories 목록용 `fetch('./index.json')` 호출 → base URL이 sub-dir 부모로 해석되어 `/_cms/storybook/index.json` 요청 → web Next.js layout gate가 splash로 redirect | bundle-storybooks 4-layer fix의 `<base href>` 주입(4)이 모든 JS fetch / CSS url() 안전망 — index.html에 `<base href="/_cms/storybook/{name}/" />` 1줄 |
| `pnpm db:push` P1013 `invalid port number in database URL`              | 비밀번호 특수문자(`:`, `@`, `/`, `?`, `#`) 미인코딩 또는 Supabase 복사 시 `[YOUR-PASSWORD]` placeholder 미치환 | Supabase Dashboard → Project Settings → Database → **Reset database password** → 영숫자만 사용. `.env` 양쪽 URL과 Vercel admin/web 환경변수 동시 갱신 |
| `pnpm db:push` P1001 `Can't reach database server` (TCP 응답하는데도)   | hostname region 오타(`aws-0-...` vs 실제 `aws-1-...`) — 가이드 예시는 `aws-0-...`인데 실제 프로젝트는 region별로 cluster 번호 다름 | Supabase Dashboard → **Connect** 패널에서 정확한 connection string 다시 복사. `Test-NetConnection -ComputerName <hostname> -Port 6543`로 정확한 host 검증 |
| `.env` 수정해도 P1001 같은 에러 반복                                    | shell 환경변수 우선순위 — `$env:DATABASE_URL`이 export되어 있으면 `.env`보다 우선해 무력화 | `Remove-Item Env:DATABASE_URL` / `Remove-Item Env:DIRECT_URL` 후 **새 PowerShell 창** 열고 재시도. `node -e "require('dotenv').config({path:'.env'}); console.log(process.env.DATABASE_URL?.replace(/(:)[^@]+(@)/,'$1****$2'))"`로 실제 적재값 확인 |
| Vercel admin URL 직접 접속 시 404 (`https://admin.vercel.app/`)        | admin은 basePath `/_cms/admin`이라 root 라우트 없음 — **정상 동작** | 시연 단일 origin은 **web URL**. visitor는 항상 `https://web-demo.vercel.app/` 또는 `/_cms/admin/dashboard`로 접근. admin Vercel URL은 backend 전용 (web rewrites로 proxy) |
| Storybook patch 적용했는데 production은 여전히 404                       | Vercel edge cache 또는 browser cache stale | curl로 production 검증 우선: `curl -s https://web.vercel.app/_cms/storybook/admin/index.html \| grep '<base'`. 시크릿 창 + DevTools "Disable cache" + Ctrl+Shift+R |
| web 메인 `/` 500 + Vercel function logs `Failed to load external module jsdom: ERR_REQUIRE_ESM` | `renderContent.ts`의 `isomorphic-dompurify` → jsdom lazy load 시 turbopack server-side 번들링이 `@exodus/bytes/encoding-lite.js` (ESM) ↔ `html-encoding-sniffer` (CJS) interop 깨뜨림 | `apps/web/next.config.ts`에 `serverExternalPackages: ['isomorphic-dompurify', 'jsdom']` 등록. Node.js 표준 모듈 해석으로 fallback. 로컬 build 통과해도 Vercel runtime에서만 발견되므로 preview/production 검증 필수 |

> **실전 배포 회귀 자동 검증** (commit 전):
> ```bash
> # 로컬에서 bundle-storybooks 실행 후
> grep '<base href=' apps/web/public/_cms/storybook/admin/index.html  # base href 주입 확인
> grep "import '/_cms" apps/web/public/_cms/storybook/admin/index.html  # ES module import 절대 path 확인
> grep -oE '(src|href)="\.\/' apps/web/public/_cms/storybook/admin/*.html  # 누락된 relative path 없는지 (출력 0줄이어야 정상)
> ```
> 셋 모두 통과 후 commit. Vercel 빌드 1회로 끝낼 수 있음 (push cycle 회피).

---

## 참고

- 시연 모드 정책 단일 출처: 루트 `AGENTS.md` "시연 모드 격리 인프라" 섹션
- 상세 명세: `docs/react-cms-시연모드-배포-가이드.md` (v3 — Supabase 단일 PostgreSQL 스택)
- PR별 진행 상황: 루트 `AGENTS.md`의 "진행 단계 (시연 모드 구현 로드맵)" 표
