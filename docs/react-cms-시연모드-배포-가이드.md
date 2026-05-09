# 시연 모드 배포 가이드 (Vercel + Supabase)

> 이 가이드는 시연 모드 인프라(PR1~7)가 모두 완료된 후 **한 번에 배포 환경을 구성**할 때 사용한다. 운영 배포는 별도(`DEMO_MODE` 미설정)이며 본 가이드는 시연 전용 환경만 다룬다.
>
> **대상 시점**: master 브랜치에 PR1~PR7이 모두 머지된 상태. PR6 또는 PR7 미완료 시점에 미리 배포해보고 싶다면 5장(시드 적재) → "방법 A — `db:demo-seed` only"만 따르면 된다 (CLI/Admin UI 미사용).
>
> **PR1~7 한 줄 요약**:
> - PR1 단일 도메인 rewrites + admin basePath
> - PR2 17모델 sessionId 컬럼
> - PR3 Prisma extension + AsyncLocalStorage 격리 인프라
> - PR4 visitor 자동 진입 (cloneSeedToSession + bootstrap + layout gate + 1h TTL)
> - PR5 Storage 격리 + cleanup cron + Reset API + DemoBanner UI
> - PR6 Snapshot Export/Import 코어 + Walker + CLI (`pnpm demo:export` / `demo:import`)
> - PR7 Admin UI (`/settings/demo-snapshot` — 미리보기 통계 + 다운로드 + 즉시 적용)

---

## 0. 사전 준비물

- Vercel 계정 (Hobby plan으로 충분 — cron 일 1회만 사용)
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
1. 좌측 사이드바 **Database** → **Extensions**
2. 검색창에 `pgroonga`
3. 토글 활성화 (자동으로 `CREATE EXTENSION pgroonga` 실행됨)

### 1-3. Storage bucket 생성
1. 좌측 사이드바 **Storage** → **New bucket**
2. Name: `demo-uploads`
3. Public bucket: ☑ 체크 (시연 자료는 공개 URL로 서빙)
4. **Save**

### 1-4. 연결 정보 복사 (메모장에 임시 보관)
1. **Project Settings** → **Database** 탭
2. 다음 4개 값을 복사:

| 라벨 | Vercel 환경변수명 | 비고 |
|---|---|---|
| Connection string > **Transaction pooler** | `DATABASE_URL` | 끝에 `?pgbouncer=true` 추가 필수 |
| Connection string > **Direct connection** | `DIRECT_URL` | prisma migrate 전용 |
| **Project URL** (Settings > API) | `SUPABASE_URL` | `https://xxx.supabase.co` |
| **service_role key** (Settings > API > Project API keys) | `SUPABASE_SERVICE_ROLE_KEY` | 절대 클라이언트 노출 금지 |

> `DATABASE_URL`에 `?pgbouncer=true`가 빠지면 Prisma가 prepared statement 충돌로 간헐 실패함.

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

### 2-2. admin 배포 URL 확보
- 배포 성공 후 Production Domain 복사 (예: `https://simple-cms-admin-demo.vercel.app`)
- 이 URL을 다음 단계의 `NEXT_PUBLIC_ADMIN_REWRITE_URL`에 사용

### 2-3. web 프로젝트
1. **Add New** → **Project** (같은 GitHub 레포 다시 선택)
2. **Configure Project**:
   - **Project Name**: `simple-cms-web-demo` (자유)
   - **Root Directory**: `apps/web` ← **꼭 변경**
   - **Build Command**: `cd ../.. && pnpm --filter @simple-cms/web build`
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
   - **Node.js Version**: `22.x`
3. Environment Variables — 3장 마스터 리스트의 web 값들 등록 (`NEXT_PUBLIC_ADMIN_REWRITE_URL`은 2-2에서 받은 admin URL)
4. **Deploy**

### 2-4. 커스텀 도메인 (선택)
- web 프로젝트 Settings → Domains에 시연 도메인(예: `demo.example.com`) 연결
- DNS A 레코드 또는 CNAME을 Vercel이 안내하는 값으로 설정
- admin 프로젝트는 도메인 안 붙여도 됨 — web origin에서 `/_cms/admin/*` rewrite로 자동 프록시

---

## 3. 환경변수 마스터 리스트

각 변수의 **Environments**는 모두 **Production**만 체크 (Preview/Development는 해제 — 시연은 prod 단일 환경).

### admin 프로젝트 환경변수

| Key | Value 예시 | 출처 |
|---|---|---|
| `DEMO_MODE` | `true` | 고정 |
| `DATABASE_URL` | `postgresql://postgres.xxx:PASS@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true` | 1-4의 Transaction pooler |
| `DIRECT_URL` | `postgresql://postgres.xxx:PASS@db.xxx.supabase.co:5432/postgres` | 1-4의 Direct connection |
| `STORAGE_PROVIDER` | `supabase` | 고정 |
| `SUPABASE_URL` | `https://xxx.supabase.co` | 1-4 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | 1-4 (서버 전용, 절대 NEXT_PUBLIC_ 접두 금지) |
| `SUPABASE_STORAGE_BUCKET` | `demo-uploads` | 1-3에서 만든 이름 |
| `CRON_SECRET` | `openssl rand -hex 32`로 생성한 64자 hex | 신규 생성 (PR5에서 추가됨) |
| `WEB_BASE_URL` | `/` | 시연은 단일 origin이라 상대 경로 |
| `NEXT_PUBLIC_SITE_URL` | `https://demo.example.com` (커스텀 도메인) 또는 web 프로젝트의 vercel.app URL | 시연 메인 URL |
| `INITIAL_ADMIN_USERNAME` | `admin` (자유) | seed.ts용. 시연에선 demo-seed가 별도 demo_admin 생성하므로 영향 적지만 운영 seed 호환 위해 등록 |
| `INITIAL_ADMIN_PASSWORD` | 강한 임시 비밀번호 | 운영 seed 호환용 |

### web 프로젝트 환경변수

| Key | Value 예시 | 출처 |
|---|---|---|
| `DEMO_MODE` | `true` | 고정 |
| `DATABASE_URL` | admin과 동일 값 | 1-4 |
| `NEXT_PUBLIC_ADMIN_REWRITE_URL` | `https://simple-cms-admin-demo.vercel.app` | 2-2의 admin Production URL |
| `NEXT_PUBLIC_SITE_URL` | `https://demo.example.com` | admin과 동일 |
| `FEEDBACK_IP_SALT` | `openssl rand -hex 16`로 생성 | Stage 10 — 익명 피드백 IP 해싱 |

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
echo "DATABASE_URL=postgresql://...?pgbouncer=true" >> .env
echo "DIRECT_URL=postgresql://..." >> .env

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

| 방법 | 가능 시점 | 콘텐츠 풍부도 | 운영자 도구 | 추천 시점 |
|---|---|---|---|---|
| A. `pnpm db:demo-seed` | PR4+ | 최소 22 row 빈 골격 | CLI | 첫 배포 검증 / PR6 미완료 |
| B. `pnpm demo:export → demo:import` | PR6+ | 풍부 (운영 dev 콘텐츠) | CLI 양쪽 | 첫 배포 후 본격 시드 / 자동화 |
| C. Admin UI `/settings/demo-snapshot` | PR7+ | 풍부 | 브라우저 | 운영자 친화적 / 정기 갱신 |

### 방법 A — `pnpm db:demo-seed` (PR4 완료 시점부터 가능, 최소 22 row)
```bash
# 시연 Supabase URL이 .env에 적재된 상태에서
pnpm --filter @simple-cms/db db:demo-seed
```

생성되는 시드 (sessionId='__SEED__'):
- Role 2개 (총괄/일반 관리자)
- User 1개 (`demo_admin` / `demo_password`, ACTIVE 총괄)
- SiteSettings 6개 (CONCURRENT_LOGIN, SITE_NAME='시연 CMS', SITE_DESCRIPTION, UPLOAD_*)
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

> Vercel Hobby plan은 cron 슬롯 2개 한도 / daily만 허용. PR6 이후 healthcheck ping을 추가하면 슬롯 1개 더 사용.

---

## 7. 일시정지 회피 (Supabase Free plan)

Supabase Free plan은 **7일 미사용 시 DB 자동 일시정지**된다. 시연 트래픽이 일주일 끊기면 다음 방문자 첫 접속 시 splash 무한 로딩.

### 회피책 — GitHub Actions keepalive (권장)
`.github/workflows/demo-keepalive.yml` (PR6+에서 추가 예정. 미리 추가해도 무방):

```yaml
name: Demo Keepalive
on:
  schedule:
    - cron: '0 0 * * 1'  # 매주 월요일 00:00 UTC
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
- [ ] `/media`에서 시드 이미지(__SEED__/...) [삭제] 시도 → DB Media row만 사라지고 Supabase 파일은 보존되는지 (가장 중요한 가드)
- [ ] DemoBanner [새 세션 시작] 클릭 → AlertDialog 확인 → splash → 새 sessionId로 재진입
- [ ] cron 수동 트리거 (6장) → 200 응답
- [ ] 1시간 후 자동 redirect 또는 Supabase SQL로 강제 만료 후 cron 트리거 → 만료 sessionId 데이터 삭제 + Storage 파일 삭제 + `__SEED__/`/`__PROD__/` 보존 확인
- [ ] (PR7) 시연 admin → 사이드바 → **사이트 설정** → **시연 스냅샷** 탭 표시 확인 + 운영자 통계 정상 회수 (운영 sentinel `__PROD__` row count + Media 합계 사이즈)
- [ ] (PR7) 시연 admin에서 **[스냅샷 내보내기]** 버튼 클릭 → JSON 다운로드 + toast 결과 표시
- [ ] (PR7) 일반 관리자로 시연 admin 진입 → **시연 스냅샷** 탭이 SettingsNav에서 안 보이는지 (운영자 전용 권한 게이팅 검증)
- [ ] (PR7) 운영 admin(`DEMO_MODE` 미설정)에서 시연 스냅샷 탭 진입 → **[Supabase에 즉시 적용]** 버튼이 비활성화 + 안내 표시 (운영 환경 import 차단)

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

## 부록 A — `.env.demo` 템플릿 (로컬 작업용)

DB 초기화/시드 적재 시 시연 환경변수를 임시로 격리하려면 `.env.demo`를 만들고 `dotenv-cli`로 사용:

```dotenv
# apps/.env.demo (gitignore에 포함 권장)
DEMO_MODE=true
DATABASE_URL=postgresql://postgres.xxx:PASS@aws-0-...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:PASS@db.xxx.supabase.co:5432/postgres
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
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

| 증상 | 원인 추정 | 조치 |
|---|---|---|
| splash 무한 로딩 | bootstrap API 503(SeedNotFoundError) | Supabase에 `__SEED__` row 없음. 5장 시드 적재 재실행 |
| splash → 500 | cloneSeedToSession 트랜잭션 실패 | Supabase 로그 확인. 자주 발생 시 `DATABASE_URL`에 `?pgbouncer=true` 누락 의심 |
| banner의 [새 세션 시작] 클릭 → 401 | admin Vercel 프로젝트의 reset endpoint 미인식 | admin 재배포. basePath 설정(`apps/admin/next.config.ts`) 확인 |
| cron 미실행 | `apps/admin/vercel.json` 미인식 | admin 프로젝트 root directory 설정이 `apps/admin`인지 확인. Settings → Crons에 항목 표시되는지 |
| 시드 이미지 [삭제]했는데 다른 visitor의 시드 이미지가 사라짐 | adapter `__SEED__` 가드 미작동 (회귀) | `apps/admin/src/shared/lib/storage/supabaseAdapter.ts`의 `delete()` 분기 검증. PR5 회귀 |
| visitor 격리 안 됨 (다른 창에서 같은 콘텐츠 보임) | `DEMO_MODE` 환경변수 미적용 또는 extension 미작용 | admin/web 양쪽에 `DEMO_MODE=true` 등록 확인. 빌드 캐시 초기화(`vercel deploy --prod --force`) |
| Supabase Free 5분 connection limit 초과 | pgbouncer 설정 누락 | `DATABASE_URL` 끝에 `?pgbouncer=true` 추가. `DIRECT_URL`은 그대로 (마이그레이션 전용) |
| 1시간 지나도 만료 안 됨 | `SESSION_MAX_AGE` 분기 누락 | `apps/admin/src/shared/lib/cookies.ts` + `packages/db/src/sessionHelper.ts` 양쪽 분기 확인 (PR4) |
| `pnpm demo:export` 실행 시 "DATABASE_URL environment variable is not set" | ESM import hoisting로 `dotenv.config()`가 client.ts 평가 후 실행 | `packages/db/package.json`의 demo-export script가 `tsx --env-file=../../.env`로 시작하는지 확인 (PR6 처리됨) |
| `pnpm demo:import` 실행 시 "DEMO_MODE !== true" 에러 | 운영 DB 보호 가드 작동 — .env에 시연 환경변수 미적재 | `.env.demo`로 격리 실행 (`dotenv -e .env.demo -- pnpm demo:import ...`) 또는 임시로 `.env`에 `DEMO_MODE=true` + 시연 URL 적재 |
| Admin UI [Supabase 즉시 적용] 503 응답 | 운영 환경에서 호출 (`DEMO_MODE !== 'true'`) 또는 `STORAGE_PROVIDER !== 'supabase'` | 시연 admin URL(`https://demo.example.com/_cms/admin/settings/demo-snapshot`)에서 호출. 운영 환경에서는 [내보내기]만 가능 |
| Admin UI 시드 적용 후 일부 image broken | walker mediaId 위치 누락 (회귀) | `snapshotWalker.ts` 분기 + 단위 테스트 14건 검증. SubpageVersion.snapshot 같은 깊은 경로 confirm |
| Admin UI에서 일반 관리자에게 시연 스냅샷 탭이 보임 | demo-snapshot 권한 잘못 부여 | `packages/db/prisma/seed.ts`의 `DEFAULT_PERMISSIONS`에 demo-snapshot이 빠져있는지 확인. `pnpm db:seed` 재실행 후 일반 관리자 역할 권한 매트릭스 검토 |
| Admin UI import 후 통계가 갱신 안 됨 | `router.refresh()` 호출 누락 또는 캐시 문제 | 페이지 hard reload (Ctrl+Shift+R). DemoSnapshotForm의 import 성공 흐름에 `router.refresh()` 호출 확인 |

---

## 참고

- 시연 모드 정책 단일 출처: 루트 `CLAUDE.md` "시연 모드 격리 인프라" 섹션
- 상세 명세: `C:\Users\ddock\.claude\plans\cms-purrfect-lerdorf.md` (v3 — Supabase 단일 PostgreSQL 스택)
- PR별 진행 상황: 루트 `CLAUDE.md`의 "진행 단계 (시연 모드 구현 로드맵)" 표
