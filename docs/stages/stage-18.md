# Stage 18 — 시연/운영 성능 최적화 (Vercel·Supabase region 정렬 + Server Component 병렬화 + cache dedup)

> **요약**: 시연 모드(Vercel + Supabase) 배포에서 페이지 전환·필터 응답이 1~2초 걸리는 문제를 해소. 근본 원인은 Vercel(us-east) ↔ Supabase(Seoul) 사이 태평양 횡단 RTT 200ms+가 페이지당 5~7개 DB 쿼리에 누적되어 latency 1~1.5초를 만든 것. Supabase를 us-east로 이전하여 Vercel과 같은 region에 두고, 부가적으로 Server Component fetch 병렬화·`React.cache` dedup·운영 모드 정적화·관측 인프라(Speed Insights) 도입.

## Context

- 시연 배포 환경: Vercel Hobby (iad1, us-east) + Supabase Free
- 진단 결과:
  - 한국 사용자 ↔ Vercel: 180ms (불가피, Hobby plan은 region 변경 안 됨)
  - Vercel ↔ Supabase(Seoul): **200ms × 5~7 쿼리 = 1.0~1.4초** ← 단일 결정타
  - force-dynamic, fetch 순차, 이미지 미최적화 등은 모두 위에 얹힌 부차적 비용
- Vercel Hobby plan은 `vercel.json`의 `regions` 명시가 무시되므로 region 정렬은 **Supabase 쪽 이전**으로 해소

## 적용된 변경

### Tier 1 — 단일 결정타 (region 정렬 + 병렬화)

| 변경 | 파일 | 효과 |
|---|---|---|
| **Supabase region us-east 이전** | (사용자 수동 작업, Vercel 환경변수 업데이트) | Vercel↔DB RTT 200ms → **5~10ms** (페이지당 5쿼리 기준 ~1초 절감) |
| **DATABASE_URL pgbouncer 파라미터** | (사용자가 Vercel 환경변수에 `?pgbouncer=true&connection_limit=1&pool_timeout=10` 추가 필요) | serverless instance당 풀 협상 비용 + prepared statement 충돌 회피 |
| **HomePage Promise.all 병렬화** | `apps/web/src/pages/home/ui/HomePage.tsx` | `popups` + `sections` 순차 await → 병렬. `<HomeSections sections={...}>` props 수신 시그니처 추가 |

### Tier 2 — 요청당 중복 쿼리 제거

| 변경 | 파일 | 효과 |
|---|---|---|
| **cachedSession 신설** | `apps/admin/src/shared/lib/cachedSession.ts` (신규) | React `cache()`로 같은 요청 내 `Session.findUnique` dedup. 명시적 `Prisma.SessionGetPayload<{...}>` 반환 타입으로 portable |
| **getCurrentUser + ensureDemoSession 통합** | `apps/admin/src/entities/auth/lib/getCurrentUser.ts`, `apps/admin/src/shared/lib/ensureDemoSession.ts` | admin layout이 매 페이지 진입 시 **2 DB 쿼리 → 1 쿼리**. 둘 다 `getCachedSession()` 호출 |
| **getMenusBySlots 통합 쿼리** | `apps/web/src/entities/navigation/api/getNavigation.ts` | web layout이 HEADER/FOOTER/SIDEBAR 슬롯 메뉴를 `hasSome` 단일 쿼리로 조회. **DB round-trip 3 → 1**. `ResolvedMenu` / `MenusBySlotsResult` 명시적 타입 export |

### Tier 3 — 운영 모드 전용 정적화

| 변경 | 파일 | 효과 |
|---|---|---|
| **layout DEMO_MODE 가드** | `apps/web/app/layout.tsx` | 운영 모드에서 `ensureDemoSession` + `getCurrentPathname`(headers() 호출) **skip** → dynamic API 미호출로 정적화 |
| **메인 페이지 force-dynamic 제거** | `apps/web/app/page.tsx` | 자동 판정 위임. 시연: layout cookies()로 자동 dynamic. 운영: 정적 prerender. **build 검증 — `/` → `○ Static`** ✅ |
| **sitemap.xml 5분 ISR** | `apps/web/app/sitemap.ts` | `revalidate=300` 명시. 검색엔진 호출 비용 절감. visitor 무관한 공개 콘텐츠 URL이라 시연/운영 모두 안전 |
| **next/image remotePatterns** | `apps/web/next.config.ts`, `apps/admin/next.config.ts` | Supabase Storage 도메인(`**.supabase.co/storage/v1/object/public/**`) 허용. 향후 `<img>` → `<Image>` 점진 마이그레이션 준비 |

> ⚠️ **Next.js route segment config 제약**: `export const dynamic = process.env.X === 'true' ? 'force-dynamic' : 'auto';` 같은 **ternary는 build 실패**. Next.js 정적 분석은 literal string만 허용. 환경별 분기는 dynamic 명시를 **제거**하고 자동 판정에 위임하거나, build profile을 통째로 분기해야 한다.

### Tier 4 — 측정·검증 인프라

| 변경 | 파일 | 효과 |
|---|---|---|
| **Vercel Speed Insights** | `apps/admin/app/layout.tsx`, `apps/web/app/layout.tsx` (+ package.json 양쪽 `@vercel/speed-insights ^1.2.0` 추가) | p75 FCP/LCP/INP/CLS 자동 수집. 작업 전후 데이터 비교 가능 |

## Critical Files

### 신규
- `apps/admin/src/shared/lib/cachedSession.ts` — React `cache()` 래퍼 + `Prisma.SessionGetPayload` 명시적 타입

### 수정 (시연/운영 양쪽 동작 영향)
- `apps/web/app/layout.tsx` — `isDemoMode` 가드 + `getMenusBySlots(['HEADER', 'FOOTER', 'SIDEBAR'])`로 메뉴 통합 + SpeedInsights 마운트
- `apps/web/app/page.tsx` — `force-dynamic` 제거 (자동 판정)
- `apps/web/app/sitemap.ts` — `force-dynamic` 제거 + `revalidate=300`
- `apps/web/src/pages/home/ui/HomePage.tsx` — `Promise.all([popups, sections])`
- `apps/web/src/widgets/home-sections/ui/HomeSections.tsx` — `sections?: ResolvedSection[]` props 시그니처
- `apps/web/src/entities/navigation/api/getNavigation.ts` — `getMenusBySlots` 통합 헬퍼
- `apps/admin/src/shared/lib/ensureDemoSession.ts` — `getCachedSession` 사용 (자체 `prisma.session.findUnique` 제거)
- `apps/admin/src/entities/auth/lib/getCurrentUser.ts` — `getCachedSession` 사용

### 수정 (인프라 설정)
- `apps/web/next.config.ts`, `apps/admin/next.config.ts` — `images.remotePatterns` Supabase Storage 추가
- `apps/admin/app/layout.tsx` — SpeedInsights 마운트
- `apps/admin/package.json`, `apps/web/package.json` — `@vercel/speed-insights ^1.2.0`

### 제거/되돌림
- `apps/admin/vercel.json`, `apps/web/vercel.json` — 초기 시도한 `regions: ["icn1"]`은 Vercel Hobby plan 미지원이라 제거. region 정렬은 Supabase 이전으로 해결

## Verification

### build 검증 (필수 — typecheck/test로는 발견 불가)

```bash
# 운영 build — 메인 페이지가 Static prerender 되는지 확인
DEMO_MODE= pnpm --filter @simple-cms/web build
# 출력: ┌ ○ /                              ← Static ✅
#       └ ○ /sitemap.xml      5m  1y     ← 5분 ISR ✅

# 시연 build — 모든 페이지 dynamic 유지 확인
DEMO_MODE=true pnpm --filter @simple-cms/web build
# 출력: ┌ ƒ /                              ← Dynamic ✅
```

### typecheck / lint / test

- typecheck: 5 packages 통과 (Prisma generated 타입 portability를 위해 `Prisma.SessionGetPayload`, `ResolvedMenu`/`MenusBySlotsResult` 명시적 type annotation 필요)
- lint: error 0건 (기존 React Compiler 호환성 warning만)
- admin test: 308/308 통과 (storybook addon-vitest dep cache 이슈 시 `rm -rf apps/admin/node_modules/.cache/storybook node_modules/.vite` 후 재실행)
- web test: 126/127 + 1 expected fail

### 배포 후 체크

- Vercel Speed Insights 대시보드에서 p75 LCP/FCP/INP 작업 전/후 비교
- 시연 메인 페이지 TTFB **< 400ms** (이전 ~1.2s)
- admin 대시보드 TTFB **< 500ms**
- admin `/subpages` 필터 변경 응답 **< 300ms**
- Vercel 함수 로그에 `prepared statement "s0" already exists` 같은 pgbouncer 경고 0건
- admin 시연 origin(`/_cms/admin/...`)에서 `/_vercel/insights/script.js`가 200 응답 (basePath 하 정상 로드)

## 알려진 한계 / 후속 과제

- **`/p/[slug]`, `/board/*` 페이지는 여전히 dynamic** — preview 쿠키 체크가 자동 dynamic을 유발. 운영 ISR이 필요하면 preview 분기를 search params 기반으로 옮기는 별도 PR 필요
- **`<img>` → `<Image>` 점진 마이그레이션** — remotePatterns 인프라만 준비, 실제 치환은 별도 작업 (LCP 30~50% 추가 개선 기대)
- **SubpageFeedback `[sessionId, createdAt]` 인덱스** — 현재 데이터 규모(수십~수백 건)에서 영향 미미. 수만 건 이상 누적 시 도입 검토
- **admin DEMO 모드 SpeedInsights basePath** — `/_cms/admin/_vercel/insights/script.js` 경로가 정상 로드되는지 첫 배포에서 확인. 안 되면 `<SpeedInsights route="/_cms/admin">` 같은 prop 필요할 수 있음

## 트레이드오프 / 학습

- **Vercel Hobby plan + Supabase 이전 vs Pro plan + region 변경**: 같은 region 정렬 효과를 둘 다 달성. 데이터 마이그레이션 비용(1회) < Pro 구독 비용(매월) 시점에서 Hobby 유지가 유리
- **Next.js route config는 정적 분석만**: 환경변수 ternary는 build 실패. dynamic 명시를 제거하고 자동 판정에 의존하는 게 안전한 환경 분기 패턴
- **React `cache()` portability**: Prisma generated 타입을 transitive하게 노출하면 TS2742 (inferred type not portable) 발생. `Prisma.SessionGetPayload<{...}>` 또는 명시적 interface로 캡슐화하면 해결
- **layout dynamic 전염**: layout이 cookies()/headers() 호출하면 모든 하위 페이지가 강제 dynamic. 환경 분기로 호출 자체를 가드하지 않으면 페이지 레벨 `force-dynamic` 제거가 무의미
