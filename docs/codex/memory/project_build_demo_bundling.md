<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: build:demo Storybook bundling
description: 시연 web 빌드 산출물에 admin/web Storybook을 정적 동봉해 단일 Vercel 프로젝트로 4가지(admin 시연 + web 시연 + Storybook admin/web)를 한 origin에서 서빙. Windows 환경 함정(self-nesting / EPERM / long-path) 회피 인사이트 포함.
type: project
originSessionId: 54257096-ac0e-466b-972d-27ae4f6f6558
---
**결정 (2026-05-20)**: 시연 Storybook 카탈로그는 별도 Vercel 프로젝트로 분리하지 않고 **시연 web 프로젝트의 빌드 산출물(`apps/web/public/_cms/storybook/{admin,web}/`)에 정적 동봉**한다. 결과적으로 시연 환경 전체가 **2개 Vercel 프로젝트(admin + web)** 만으로 구성된다.

**Why:** 사용자가 "하나의 Vercel 프로젝트에서 관리자/공개/Storybook 2개 모두 확인"을 요구. 별도 Vercel 프로젝트 4개로 운영하면 검색엔진 차단 / cron noise / 도메인 관리가 흩어지고, 단일 도메인 통합(rewrites)은 4개 프로젝트 유지 비용을 그대로 둠. 동봉 패턴은 web 빌드 시간이 3~6분 늘지만 운영 단순성·도메인 관리·환경변수 통합이 모두 깔끔.

**How to apply (master 브랜치 기본값):**

1. **Vercel web Build Command는 `build:demo`** (`build`가 아님): `cd ../.. && pnpm --filter @simple-cms/web build:demo`. 운영 self-host는 `build` 그대로 — Storybook 동봉 없음
2. **새 admin/web 컴포넌트의 stories는 별도 작업 없이 자동 시연에 노출됨**: `*.stories.tsx`가 admin/web 어느 쪽에 있어도 다음 시연 배포에서 자동 동봉. fixture 데이터에 `[Demo]` 같은 표기 권장 (운영 데이터 오인 방지)
3. **`apps/web/scripts/bundle-storybooks.mjs`를 만지면 다음 함정 3개를 반드시 보존**할 것:
   - **temp dir 패턴**: `apps/web/.tmp-storybook/{admin,web}/`(public 바깥)에 먼저 빌드 후 rename으로 이동. public 안에 직접 빌드하면 web Storybook이 admin 산출물을 자기 staticDirs로 흡수해 무한 중첩(`/web/_cms/storybook/web/_cms/storybook/...`) 발생
   - **`finalParent`까지 cleanup** (`public/_cms` 전체, `storybook`만이 아님): 빈 `_cms/` 디렉토리도 web Storybook이 staticDirs로 흡수해 `web/_cms` 빈 디렉토리가 산출물에 들어감
   - **rename target 부모 mkdir** (`mkdir(finalBase, { recursive: true })`, **`path.dirname(finalBase)`로 하면 ENOENT**): `public/_cms`만 만들고 `storybook` 디렉토리 안 만들면 rename `to`의 부모 미존재
   - **`moveWithRetry` 유지**: Windows에서 fs.rename은 Defender 스캔/잔여 file handle로 일시 EPERM/EBUSY 발생. 300ms × N backoff 5회 retry로 해소. cross-platform이라 Linux/macOS에는 영향 0
4. **검색엔진 차단**: `apps/web/vercel.json`의 `X-Robots-Tag: noindex, nofollow, noarchive` 헤더가 web origin 전체(Storybook 경로 포함)에 자동 적용. `apps/web/app/robots.ts`의 `DEMO_MODE === 'true'` 분기는 robots.txt도 `Disallow: /` 출력. defense in depth

**Self-nesting 사고 발생 시 cleanup**:
- Windows long-path 한도(260자)를 즉시 초과해 일반 `rm`/`Remove-Item`/`robocopy`로 처리 불가
- 시스템 재부팅으로 stale Node 핸들 해소 → WSL `rm -rf` 또는 Windows 우클릭 삭제
- `apps/web/public/_cms/storybook/`은 `.gitignore`에 있어 commit/배포 영향 0

**관련 파일:**
- `apps/web/scripts/bundle-storybooks.mjs` — 동봉 스크립트 (temp dir + moveWithRetry + finalParent cleanup)
- `apps/web/package.json` — `build:demo` / `bundle-storybooks` scripts
- `apps/web/vercel.json` — X-Robots-Tag headers (신규)
- `apps/admin/vercel.json` — X-Robots-Tag headers + crons (기존 crons에 headers 추가)
- `apps/web/app/robots.ts` — DEMO_MODE 분기 추가
- `.gitignore` — `apps/web/public/_cms/storybook/`
- `docs/react-cms-시연모드-배포-가이드.md` 10장(동봉 절차) + 11장(검색엔진 차단)
- 루트 `AGENTS.md` "시연 모드 (DEMO_MODE) 격리 인프라" 섹션 (단일 출처)
- `apps/{admin,web}/AGENTS.md` Storybook 섹션의 `build:demo` 한 줄

**Supabase 2026 변경사항** (가이드 1-4절 / 부록 B 단일 출처, 메모리 중복 안 함):
- Project Settings → Database 탭이 사라지고 대시보드 상단 **[Connect] 버튼**으로 이동
- `service_role` → `sb_secret_*` (legacy 2026년 말 만료)
- Prisma `DIRECT_URL`은 **Session pooler**(`pooler.supabase.com:5432`) 권장 (구 Direct connection은 IPv4 add-on 필요)
- Vercel Hobby cron 한도 100개 / daily / hourly 정밀도 (2024 변경 — 이전 "슬롯 2개" 자료는 stale)
