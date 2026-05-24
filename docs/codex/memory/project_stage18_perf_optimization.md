<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Stage 18 — 시연/운영 성능 최적화 결정 사항
description: Vercel(Hobby/iad1) ↔ Supabase region 정렬 + Server Component 병렬화 + cache dedup + 운영 정적화. 향후 layout/page 작성 시 따라야 할 패턴
type: project
originSessionId: e93a22c9-12d9-49c2-aaed-4da83d8dd759
---
## 인프라 결정 (회귀 금지)

**Vercel Hobby plan 유지 (Pro 결제 의사 없음)** — `vercel.json`의 `regions` 명시는 무시되므로 region 정렬은 **Supabase 쪽**으로 처리.

- Vercel: iad1 (us-east, default, 변경 불가)
- Supabase: **us-east로 이전 완료** (2026-05-21). Vercel↔DB RTT 5~10ms 달성
- 한국 사용자 ↔ Vercel: 180ms는 불가피 (Hobby 한계)

→ `apps/{admin,web}/vercel.json`에 `regions` 다시 추가하지 말 것. Hobby에서 무시 + 잘못된 신호.

## 새 패턴 (admin)

`apps/admin/src/shared/lib/cachedSession.ts` — React `cache()`로 같은 요청 내 `Session.findUnique` dedup.

**Why**: admin layout이 매 페이지 진입 시 `ensureDemoSession`(시연용 1쿼리) + `requireAuth`(getCurrentUser 1쿼리) = 2 DB 쿼리를 같은 token으로 실행하던 문제. 통합으로 1쿼리.

**How to apply**: 새 인증 헬퍼 추가 시 `prisma.session.findUnique` 직접 호출 금지. `getCachedSession()` 경유. Prisma 타입 portability는 `Prisma.SessionGetPayload<{ include: { user: { include: { role: true } } } }>` 명시.

## 새 패턴 (web)

### Server Component fetch 통합

`apps/web/src/entities/navigation/api/getNavigation.ts::getMenusBySlots(slots)` — `hasSome`으로 N슬롯을 1쿼리에 통합.

**Why**: layout이 HEADER/FOOTER/SIDEBAR를 각각 `getMenuBySlot` 호출하여 DB round-trip 3회. us-east-Seoul 시절 600ms 누적이 결정타.

**How to apply**: 같은 모델을 다른 WHERE로 N회 조회하는 패턴 발견 시 `IN`/`hasSome`/`OR` 1쿼리 + 메모리 그룹핑 + 명시적 `interface ResolvedX` / `type XResult` 타입 export (TS2742 회피).

### HomePage Promise.all 패턴

`apps/web/src/pages/home/ui/HomePage.tsx`가 `Promise.all([popups, sections])` 후 `<HomeSections sections={...}>`로 props 전달.

**Why**: 자식 Server Component가 자체 await하면 부모 await 완료 후에야 시작 → 사실상 sequential. React.cache로 dedup되지만 props 전달이 더 명시적.

**How to apply**: 부모 Server Component가 자식이 사용할 데이터를 미리 모아서 props로 내려보내기. 자식의 자체 fetch는 fallback용으로만.

## force-dynamic 회피 (운영 ISR 보호)

**Why**: layout이 `cookies()`/`headers()` 호출하면 모든 하위 페이지가 강제 dynamic. 운영 모드 ISR/static 차단.

**How to apply**:
- 시연 전용 API(`ensureDemoSession`/`getCurrentPathname`)는 `if (process.env.DEMO_MODE === 'true')` 가드로 운영 모드에서 skip
- 새 page에 `export const dynamic = 'force-dynamic'` 명시 자제 — 자동 판정 위임
- **ternary 불가**: `dynamic = X === 'true' ? 'force-dynamic' : 'auto'`는 Next.js 정적 분석 거부, build 실패. dynamic 명시 제거가 정답
- **build로 검증 필수**: `DEMO_MODE= pnpm --filter @simple-cms/web build` 출력 Route 테이블에서 `/`가 `○ (Static)` → OK, `ƒ (Dynamic)`이면 어디서 dynamic API 호출 추적. typecheck/test로는 발견 불가

## 측정 인프라

`@vercel/speed-insights ^1.2.0` admin/web 양쪽 layout에 마운트. 작업 전/후 p75 FCP/LCP/INP 비교 가능.

**Admin DEMO 모드 주의**: `/_cms/admin` basePath 하에서 `/_vercel/insights/script.js`가 정상 로드되는지 첫 배포 시 확인. 안 되면 `<SpeedInsights route="/_cms/admin">` 같은 prop 필요할 수 있음.

## 관련 문서

- 상세: `docs/stages/stage-18.md`
- review-code skill에 "성능 회귀 방지" 체크리스트 추가됨 (Stage 18 섹션)
