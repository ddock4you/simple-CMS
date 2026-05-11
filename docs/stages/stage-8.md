# Stage 8 — Docker + CI/CD + 운영 문서화

운영 self-host 트랙을 동급으로 끌어올리는 단계. 시연 모드(Vercel + Supabase) 인프라는 그대로 두고, Docker compose 기반 self-host + GitHub Actions matrix CI + Playwright nightly E2E + 운영 self-host 가이드를 추가. 시연·운영 양 트랙의 인프라 비대칭 해소.

- **8a — Docker compose 통합 + Dockerfile + Storage 추상화 보강**
  - `apps/admin/Dockerfile` + `apps/web/Dockerfile` 신설 (multi-stage `base → deps → builder → runner`, base `node:22-bookworm-slim`)
    - admin: 426MB disk / 100MB content. `public/` 디렉토리 없음 → standalone + static만 COPY
    - web: 430MB disk / 101MB content. `.next/standalone` + `.next/static` + `public/` 3개 COPY 필수 (standalone은 public/static 자동 복사 안 함)
  - `apps/{admin,web}/next.config.ts`: `output: 'standalone'` + `outputFileTracingRoot: path.resolve(__dirname, '../../')` — **monorepo에서 빠뜨리면 build 성공/runtime fail** (workspace deps `@simple-cms/*` 누락)
  - `docker/docker-compose.yml` 확장: 기존 db(PGroonga 17 alpine-slim) + healthcheck 위에 admin/web 서비스 + `pgdata`/`uploads_data` named volume. admin은 read-write, web은 `:ro` 마운트 — admin이 업로드한 파일을 web이 즉시 정적 서빙
  - `.dockerignore` 신설: **`**/node_modules` 재귀 패턴 필수** — `node_modules`만 적으면 monorepo nested deps 7개가 컨텍스트에 포함되어 6GB+ 폭주(이전 세션에서 40GB 사고). 진단 결과 패턴 변경으로 33.81MB로 축소
  - Storage 어댑터(`apps/admin/src/shared/lib/storage/index.ts`)는 이미 `LOCAL_STORAGE_PUBLIC_DIR` env 폴백 지원 — plan의 "UPLOAD_DIR 도입" task는 불필요로 판정. compose에서 `/app/apps/web/public` 명시 주입 (advisor option b — WORKDIR 변경 회귀 방어)
  - `prisma.config.ts`도 이미 `directUrl` 지원 (`process.env.DIRECT_URL ?? DATABASE_URL`) — plan의 "schema.prisma directUrl 추가" 불필요로 판정
  - `pgroonga-setup.sql` 자동 마운트 시도 → **포기**: initdb.d는 `"Subpage"` 테이블 부재 시점에 실행되어 fail + volume 보존 시 재실행 안 됨. 운영 가이드에서 `pnpm db:push && pnpm db:pgroonga` 절차로 명시화
  - 검증: db up → schema/pgroonga/seed → admin/web up → admin /login 200 / web / 200 / web /search 200 (PGroonga 동작 확인)

- **8b — GitHub Actions CI matrix 보강 + packages typecheck 활성화**
  - `.github/workflows/ci.yml`의 `test` matrix에 `build` task 추가 → admin/web × {lint, typecheck, test, **build**} = 8 jobs. `check-fsd` + `packages-typecheck` + 8 jobs = **PR당 10 jobs 병렬**
  - 조건부 step 도입 (matrix 동일 정의에서 task별 분기):
    - `if: matrix.task == 'test'` — Playwright Chromium 설치 + Storybook addon-vitest cold start 캐시 (`node_modules/.cache/storybook` + `.vite`)
    - `if: matrix.task == 'build'` — `.next/cache` (key + restore-keys partial hit 패턴) + `pnpm db:generate` + `DATABASE_URL` placeholder 주입
  - 신규 `packages-typecheck` job — admin/web typecheck는 packages를 transitively 검증하나 turbo cache로 skip될 수 있어 직접 job 분리
  - **packages typecheck 활성화의 부수효과 — latent 타입 버그 6건 노출**:
    1. `@simple-cms/config/tsconfig/base` not found — packages/{db,editor,types} 모두 `@simple-cms/config` workspace dep 누락 → tsconfig extends 깨짐 → TS default options(target ES3) fallback → `Map`/`Set`/`includes` 줄줄이 fail
    2. `URL`/`FileList`/`console` 미정의 — `@types/node` (types/editor 추가) + DOM lib (editor tsconfig `"lib": ["ES2022", "DOM"]`)
    3. `snapshotWalker.test.ts` 7곳 `title: null` — Zod schema가 `z.string()` non-null로 강화됐는데 테스트가 안 따라옴 (한 번도 typecheck 안 돌아 cascade 잠재)
  - 수정 후 `pnpm --filter "./packages/*" typecheck` 통과 → CI에 정착
  - **왜 packages typecheck 분리인가**: packages만 변경하는 PR에서 admin/web typecheck가 turbo cache로 skip → packages 회귀가 PR을 통과할 위험. 작은 job 추가로 큰 가드

- **8c — Playwright E2E nightly cron + demo keepalive + 패스워드 fixture 정합화**
  - `.github/workflows/e2e.yml` 신설 — 트리거 3종: `schedule '0 17 * * *'`(UTC = KST 02:00) + `workflow_dispatch` + `push: branches [main]`. service container PG + db setup + admin/web build + background spawn + wait-on + `pnpm e2e` + report/server-logs artifact 업로드. `concurrency: cancel-in-progress: false` (mid-test cancel 시 server hang 위험)
  - `.github/workflows/demo-keepalive.yml` 신설 — `schedule '0 */6 * * *'` (6시간마다) + manual. `vars.DEMO_URL` 검증 → curl `--max-time 60` → HTTP 200-399 통과. 실패 시 `actions/github-script@v7`로 issue 자동 생성 + 같은 제목 open issue가 있으면 comment로 누적 (스팸 방지). **`if: failure() && github.event_name == 'schedule'`** — manual dispatch 실패는 운영자가 직접 보고 있으므로 issue 미생성
  - `ci.yml`에서 기존 gated e2e job 제거 → e2e.yml로 lifecycle 분리 (PR-level CI vs nightly E2E의 `cancel-in-progress` 정책 다름)
  - `e2e/admin/auth.spec.ts` 패스워드 fallback `'tmdgus123!'` → `'changeme123'` (seed.ts 기본값과 일치). 폴백 체인 `E2E_ADMIN_PASSWORD ?? INITIAL_ADMIN_PASSWORD ?? 'changeme123'` 유지. fixtures.ts는 이미 같은 패턴이라 변경 없음
  - `playwright.config.ts`의 CI retries `1 → 2` (flakiness buffer)
  - **워크플로우 분리 결정**: e2e는 평균 15-20분 + Playwright + server spawn이라 `cancel-in-progress: false` 필요. ci.yml의 PR-level fast feedback과 lifecycle 정책이 달라 분리. demo-keepalive도 짧고 자주 도는 ping이라 별도

- **8d — 운영 self-host 배포 가이드 + README + CLAUDE.md Docker 섹션**
  - `docs/react-cms-운영-배포-가이드.md` 신설 (10장 + 3 부록, 시연 가이드 형식 차용)
    - 0 사전 준비물 → 1 Quick start 5분 → 2 환경변수 마스터 → 3 초기 배포 상세 → 4 Storage 모드 선택(local volume vs Supabase) → 5 PGroonga 검증/재구축 → 6 `db:push → migrate deploy` 전환(baseline) → 7 백업/복원 → 8 모니터링 → 9 업데이트 → 10 문제 해결 9건
    - 부록: A 호스트별 명령(Win/Linux/macOS), B 보안 체크리스트 9개, C 관련 문서
  - `README.md` (루트 신설) — two-track quick start (운영 docker compose / 시연 Vercel) + 개발 명령어 + 기술 스택 + 프로젝트 구조
  - `apps/admin/CLAUDE.md` + `apps/web/CLAUDE.md` "Docker 배포 (Stage 8a)" 섹션 추가 — Dockerfile 구조 + next.config standalone 핵심 옵션 + storage 어댑터 Docker 환경 분기 (admin) / `public/` COPY 필수 + `/uploads/*` 정적 서빙 + DB 접근 독립성 유지 (web)
  - **자동화 < 명시 절차의 사례 기록**: pgroonga-setup의 initdb.d 자동화 포기 → 가이드 3장 절차 명시 + 10장 문제 해결로 등록. "자동화 안 함"도 설계 결정

## 핵심 함정 메모

| 함정 | 진단 | 해결 |
|---|---|---|
| `.dockerignore` `node_modules` (top-level만 매칭) | 6GB+ 빌드 컨텍스트 폭주 + 도커 디스크 40GB 폭증 | `**/node_modules` 재귀 패턴. 진단용 `Dockerfile.probe`(FROM scratch + COPY) 5분 측정으로 33.81MB 확정 후 production Dockerfile 작성 |
| Next.js standalone monorepo workspace deps 누락 | build 성공 / runtime `Cannot find module '@simple-cms/db'` | `outputFileTracingRoot: path.resolve(__dirname, '../../')` 명시. advisor가 stage 시작 시 #1 risk로 지목 |
| `pgroonga-setup.sql` initdb.d 자동 마운트 시도 | `"Subpage"` 테이블 부재 시점에 실행 + volume 보존 시 재실행 안 됨 | 자동화 포기. 운영 가이드에 절차 명시 + 문제 해결 등록 |
| admin Dockerfile `COPY public` 실패 | admin은 public/ 디렉토리 없음 | admin Dockerfile에서 COPY public 라인 제거. web Dockerfile은 유지 (앱별 분리의 의미) |
| packages typecheck 활성화 직후 6건 cascade fail | extends 깨짐 → TS default options → Map/Set/FileList/URL 줄줄이 + schema 강화 안 따라온 테스트 | (1) `@simple-cms/config` workspace dep 추가 (2) `@types/node` + DOM lib 추가 (3) `title: null` → `'test-section'` 일괄 |
| fixtures.ts vs auth.spec.ts 패스워드 mismatch | 작성자 local INITIAL_ADMIN_PASSWORD 값(`tmdgus123!`)이 그대로 fallback으로 박힘 | seed.ts 기본값 `'changeme123'`으로 통일 |

## 진행 순서 + 의존성

| Sub | 의존 | 산출물 |
|---|---|---|
| 8a | — | Dockerfile 2개 + .dockerignore + docker-compose 확장 + next.config standalone + .env.example 보강 |
| 8b | 무관 (병행 가능) | ci.yml build matrix + packages-typecheck job + cache step + packages tsconfig/package.json + snapshotWalker.test 수정 |
| 8c | 8a 의존 (e2e가 db/admin/web 환경 활용) | e2e.yml + demo-keepalive.yml + ci.yml e2e 제거 + auth.spec.ts + playwright.config |
| 8d | 8a~c (검증된 인프라 기반) | 운영 가이드 + README + admin/web CLAUDE.md Docker 섹션 |

실제 진행은 8a → 8b → 8c → 8d 순차. 8a 검증으로 docker compose 3-컨테이너 동작 확인 후 나머지 진행. 8b는 8a와 병행 가능하나 분리 commit 단위로 명확화.

## 평가

- 시연(Vercel) ↔ 운영(self-host) 인프라 비대칭 해소: Dockerfile 0건 → admin/web image 100MB content + compose 3-컨테이너 + 운영 가이드 10장
- CI 회귀 차단 확대: admin/web × 4 task + packages typecheck = PR당 10 jobs. build 회귀 PR 차단 + packages만 변경 PR 회귀 차단
- E2E 정착: Stage 11e + 12j 결과물(`e2e/` 6개 spec) 위에 nightly cron 워크플로우. 머지 후 회귀 검출 가능
- 시연 dormant 회피: GitHub Actions cron이라 Vercel slot 무영향. ping 실패 → issue 자동 생성으로 운영자 통보
- 운영 진입 장벽: `git clone → docker compose up → seed → 첫 화면` 5분 안에 가능. 운영 가이드대로 따르면 막힘 0

## Stage 9~ 이연 사항

- 무중단 업데이트 (compose 단순 재기동은 다운타임 발생) — reverse proxy + 2-slot 운영 / K8s / Nomad 후보. Stage 9+에서 결정
- `pnpm db:push` → `prisma migrate deploy` 전환 — 운영 가이드 6장에서 baseline 절차 문서화만. 실제 코드화는 Stage 9+
- coverage threshold 도입 — Stage 12j에서 베이스라인 측정 결과 보고 결정 예정. 현재는 측정만, 임계값 강제는 별도 PR
- Sentry / Datadog 같은 외부 모니터링 통합 — `logWebError` + admin `/error-logs`와 독립적 통합 가능. Stage 9+ 검토
- Storybook addon-vitest cold start 캐시의 실제 효과 — measure-first로 ci.yml에 등록만. CI 실행 후 keep/revert 결정
