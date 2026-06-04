# Demo Mode Supabase Snapshot Debug Notes - 2026-06-04

이 문서는 시연 모드 Supabase snapshot/import 문제를 다음 컨텍스트에서 이어가기 위한 작업 기록이다.

## 현재 상태

- 시연 관리자 자동 로그인은 정상화됨.
- `demo:import` 후 Supabase DB/Storage에 `__SEED__` 데이터가 들어감.
- 최신 수정 후 `__SEED__`에 `demo_admin` 사용자가 자동 보장되도록 변경됨.
- 새 시크릿창 접속 시 bootstrap이 `__SEED__`를 visitor sessionId로 복제해야 한다.
- 사용자가 마지막으로 확인한 상태:
  - 시연용 관리자로 로그인 성공.
  - dirty guard 모달의 [나가기] 클릭 시 `/_cms/admin/_cms/admin/...`로 이동하던 문제는 수정됨.
  - 게시글/게시판/서브페이지 수정·삭제는 `5df5bc6` 배포 후 사용자가 정상 동작을 확인함.
  - 게시글/게시판/서브페이지 콘텐츠 이미지 문제는 `96b86f8`의 URL remap/clone-time 보정 이후 새 시연 세션에서 재확인 필요.
  - Dashboard, Subpage, Post, Media 일부를 제외한 여러 admin 페이지가 DB 데이터를 못 불러오거나 0건/빈 화면처럼 보이는 증상은 React Query 상태 UI 보강으로 진단 가능해짐.
  - React 콘솔에 minified React error `#418`이 보고됨. 1순위 후보였던 admin/web `DemoBanner` 첫 렌더 `Date.now()` countdown text hydration mismatch는 수정됨.
  - DEMO_MODE에서는 admin Server Component prefetch가 의도적으로 no-op이다. client `useQuery()` 화면은 이제 loading/error/empty를 구분해 렌더한다.

## 주요 원인

1. Vercel body limit
   - 관리자 UI에서 8MB 이상 snapshot JSON을 `/api/demo/snapshot/import`로 올리면 Vercel `FUNCTION_PAYLOAD_TOO_LARGE` 413 발생.
   - 해결 방향: UI import 대신 CLI `pnpm demo:import <snapshot.json>` 사용.

2. 잘못된 import 대상 DB
   - `pnpm demo:import ...`는 기본적으로 루트 `.env`를 읽는다.
   - `.env`가 시연 Supabase가 아니면 다른 DB에 `__SEED__`가 import됨.
   - 해결 방향: `.env.demo`를 만들고 `set -a; source .env.demo; set +a` 후 실행.

3. `demo:import` 후 `demo_admin` 미보장
   - snapshot import는 snapshot 안의 User만 `__SEED__`에 적재했다.
   - 로컬 snapshot에 `demo_admin`이 없으면 bootstrap이 `SeedNotFoundError`를 내고 visitor session 복제를 못 했다.
   - 증상: Supabase에는 `sessionId='__SEED__'` row만 있고 UUID visitor sessionId row가 없음.
   - 수정: `packages/db/src/demo/importSnapshot.ts`에서 import 완료 후 `__SEED__`의 `demo_admin`과 system role을 자동 생성/복구.
   - 커밋: `8927114 Ensure demo admin after snapshot import`

4. Admin API basePath 누락
   - 시연 admin은 `/_cms/admin` 아래에서 열리지만 클라이언트 API 요청이 `/api/...`로 나가 web 앱에 맞고 404 발생.
   - 수정: `fetchClient`와 직접 `fetch` 호출들이 시연 admin 경로에서 `/_cms/admin/api/...`를 사용하도록 보정.
   - 커밋: `2002941 Fix demo admin API base path`

5. Admin RSC prefetch 404
   - 보호된 admin 링크들이 자동 RSC prefetch를 날리면서 `/_cms/admin/...?_rsc=...` 404가 대량 발생.
   - 수정: admin 내부 링크를 `AdminLink`로 교체하고 기본 `prefetch={false}` 적용.
   - 커밋: `a281dd0 Disable admin link prefetch`

6. Admin API demo session scope 누락
   - API route에서 로그인 사용자는 확인했지만 Prisma demo context가 handler 전체에 명시적으로 적용되지 않았다.
   - 생성/조회/수정/삭제가 `__PROD__` 또는 잘못된 세션을 보거나, session-isolated write 검증에서 500 발생.
   - 수정: `defineRoute` / `defineBulkOperation`이 `runWithUserDemoSession(user, ...)`로 handler 전체를 감쌈.
   - 커밋: `f648954 Run admin routes in demo session scope`

7. Dashboard 직접 Prisma 호출
   - 대시보드는 API route를 거치지 않고 Server Component에서 직접 `prisma.count()`를 호출했다.
   - RSC 렌더에서 session scope가 빗나가 이전 시연 데이터 카운트를 보여줄 수 있었다.
   - 수정: Dashboard와 ErrorLogDashboardWidget count를 `runWithUserDemoSession`으로 감쌈.
   - 커밋: `4b296c3 Fix demo snapshot media urls and dashboard scope`

8. Snapshot import 이미지 URL 미재작성
   - Media row URL은 Supabase Storage URL로 바뀌었지만, Post/PageBlock/HomeSection/HomePopup/SubpageVersion JSON 내부의 `/uploads/...` 문자열은 그대로 남았다.
   - 증상: 리스트/상세 데이터는 보이지만 본문 이미지가 404.
   - 수정: snapshot import walker가 mediaId뿐 아니라 JSON 내부 image URL도 새 Supabase URL로 재작성.
   - 커밋: `4b296c3 Fix demo snapshot media urls and dashboard scope`

9. Session cache key 누락 가능성
   - `getCachedSession()`이 React `cache()`에 인자 없이 묶여 있어 API Route/RSC 경계에서 request/session token 단위 캐시가 명확하지 않았다.
   - 수정: cookie에서 읽은 `session-token`을 cache key로 넘기는 `getCachedSessionByToken(token)` 구조로 변경.
   - 커밋: `96b86f8 Fix demo admin session and media handling`

10. 수동 admin API route의 demo session context 보강

- `defineRoute`를 타는 API는 handler 전체가 `runWithUserDemoSession`으로 감싸졌지만, 수동 route들은 `requirePermission()` 이후 AsyncLocalStorage 전파에 의존했다.
- 수정: `requirePermission()` 성공 직후 `demo.enterWith({ sessionId: user.sessionId })`를 한 번 더 호출하도록 보강.
- 커밋: `96b86f8 Fix demo admin session and media handling`

11. SubpageFeedback Server Component 직접 Prisma 호출

- `/subpage-feedback` 페이지가 필터용 `subpageOptions`를 Server Component에서 직접 `prisma.subpage.findMany()`로 조회했다.
- 수정: 해당 조회를 `runWithUserDemoSession(user, ...)`으로 감쌈.
- 커밋: `96b86f8 Fix demo admin session and media handling`

12. Snapshot import URL remap 순서 오류

- `importSnapshotToSeed()`가 `walkSnapshotForRemap(payload, mediaIdMap, 'mediaId')`를 먼저 실행해 JSON 내부 `mediaId`를 새 id로 바꾼 뒤, `walkSnapshotForMediaUrlRemap()`가 old id 기준 `mediaUrlMap`을 찾으면서 URL 재작성이 누락될 수 있었다.
- 수정: URL remap pass를 먼저 실행하고, 이 pass가 mediaId remap도 함께 처리하게 순서 정리.
- 테스트: `snapshotWalker.test.ts`에 URL remap 이후 일반 mediaId remap이 한 번 더 실행되어도 URL이 유지되는 케이스 추가.
- 커밋: `96b86f8 Fix demo admin session and media handling`

13. Clone 시 seed local media URL 보정

- 이전 import로 `__SEED__` Media.url이 `/uploads/...` 형태로 남아 있으면, visitor clone도 broken local URL을 그대로 받는다.
- 수정: `cloneSeedToSession()`에서 `DEMO_MODE=true`, `STORAGE_PROVIDER=supabase`, URL이 상대 `/uploads/<category>/<file>`인 경우 `${SUPABASE_URL}/storage/v1/object/public/${bucket}/__SEED__/<category>/<filename>`로 보정.
- 커밋: `96b86f8 Fix demo admin session and media handling`

14. 게시판 PATCH 500 완화

- 게시판 수정에서 빈 slug/공백 slug가 들어오면 DB unique/constraint 예외가 500으로 보일 수 있었다.
- 수정: PATCH에서도 생성과 동일하게 `parsed.slug.trim() || generateSlug(name ?? board.name)`로 정규화하고, 빈 slug는 400으로 반환. Prisma `P2002` unique constraint는 공통 `defineRoute`에서 409로 반환.
- 커밋: `96b86f8 Fix demo admin session and media handling`

15. Dirty guard basePath 중복 이동

- unsaved-change 모달에서 [나가기] 클릭 시 anchor href가 이미 `/_cms/admin/...`로 해석된 상태에서 Next router가 basePath를 다시 붙여 `/_cms/admin/_cms/admin/...`로 이동했다.
- 수정: `useDirtyGuard()`가 router.push 전에 `/_cms/admin` prefix를 제거.
- 사용자가 배포 후 정상화 확인.
- 커밋: `96b86f8 Fix demo admin session and media handling`

16. Prisma demo extension `update/delete` session guard 500

- 게시글/게시판/서브페이지 수정·삭제 API가 500을 반환했다.
- 직접 원인은 seed/import mismatch가 아니라 `packages/db/src/demo/clientExtension.ts`의 `update/delete` preflight 구현이었다.
- 기존 구현은 `Prisma.getExtensionContext(this)` 기반 사전 조회 후 원래 query를 실행했는데, extension query hook 내부에서 이 방식이 안정적으로 현재 모델 delegate를 얻지 못하거나 session guard를 일관되게 적용하지 못했다.
- 수정: `update/delete`에서 사전 `findFirst`를 제거하고, 실제 Prisma query의 `where`에 `{ sessionId }`를 직접 병합해 단일 query로 cross-tenant write guard를 적용했다.
- 테스트: `packages/db/src/demo/clientExtension.test.ts`에 update/delete where unique 조건에 sessionId가 직접 추가되는 회귀 테스트 추가.
- 커밋: `5df5bc6 Fix demo update delete isolation`

17. `requireAnyPermission()` DEMO_MODE session context 누락

- `requirePermission()`은 DEMO_MODE에서 `demo.enterWith({ sessionId: user.sessionId })`를 호출했지만, OR 권한 체크용 `requireAnyPermission()`은 같은 보강이 빠져 있었다.
- quick-search처럼 `requireAnyPermission()`을 쓰는 수동 API가 현재 visitor sessionId가 아니라 `__PROD__` fallback을 볼 수 있는 위험이 있었다.
- 수정: `apps/admin/src/entities/auth/lib/requireAnyPermission.ts`도 성공한 인증 사용자 기준으로 `demo.enterWith({ sessionId: user.sessionId })`를 호출하도록 변경.
- 테스트: `requireAnyPermission.test.ts`에 401/403/OR 권한/DEMO_MODE context 테스트 추가.
- 커밋: `5df5bc6 Fix demo update delete isolation`

18. React #418 hydration mismatch 후보

- 사용자 콘솔에 `Uncaught Error: Minified React error #418`이 보고됨.
- React 19 hydration mismatch는 server HTML과 client 첫 렌더 tree가 다를 때 발생한다. 공식 문서도 `Date.now()`/`Math.random()`처럼 매 렌더 값이 바뀌는 입력을 원인으로 명시한다.
- 현재 코드에서 가장 유력한 후보는 `apps/admin/src/shared/ui/DemoBanner.tsx`와 `apps/web/src/shared/ui/DemoBanner.tsx`다.
- 두 컴포넌트 모두 `useState(() => Math.max(0, expiresMs.current - Date.now()))`로 첫 렌더의 text를 계산한다.
- 서버가 만든 HTML의 "남은 시간 59분 58초"와 브라우저 hydration 시점의 "남은 시간 59분 56초"가 달라질 수 있다.
- 수정: 첫 렌더는 `남은 시간 계산 중` deterministic placeholder를 출력하고, `useEffect` 이후에만 `Date.now()` 기반 countdown을 계산한다.
- `suppressHydrationWarning`은 사용하지 않았다.
- 수정 파일: `apps/admin/src/shared/ui/DemoBanner.tsx`, `apps/web/src/shared/ui/DemoBanner.tsx`.

19. DEMO_MODE server prefetch no-op + client query 상태 UI 누락

- `apps/admin/src/shared/api/queryClient.ts`는 DEMO_MODE에서 `queryClient.prefetchQuery = (() => Promise.resolve())`로 덮어쓴다.
- 이유는 Server Component prefetch가 browser session cookie 없이 admin API를 호출해 깨지는 것을 피하기 위해서다.
- 따라서 demo admin의 React Query 데이터는 처음부터 hydrated cache에 있는 것이 아니라, 브라우저에서 client `useQuery()`가 쿠키를 붙여 다시 가져와야 한다.
- 여러 컴포넌트가 `const { data } = useQuery(...)` 후 `if (!data) return null` 또는 `!data ? "없습니다" : ...` 패턴을 사용한다.
- 이 패턴은 demo 환경에서 "아직 로딩 중", "API 실패", "정말 0건"을 구분하지 못한다.
- 확인된 대표 파일:
  - `apps/admin/src/pages/navigation-management/ui/NavigationListClient.tsx`: `!menus || menus.length === 0`이면 "메뉴가 없습니다" 표시.
  - `apps/admin/src/pages/home-management/ui/HomePageClient.tsx`: loading은 있으나 error 분기 없음.
  - `apps/admin/src/features/user-management/ui/UserTable.tsx`: `if (!data) return null`.
  - `apps/admin/src/features/subpage-feedback/ui/FeedbackStatsSection.tsx`: `if (!data) return null`.
  - `apps/admin/src/features/subpage-feedback/ui/FeedbackListTable.tsx`: `if (!data) return null`.
  - `apps/admin/src/features/audit-log/ui/AuditLogTable.tsx`: `if (!data) return null`.
  - `apps/admin/src/features/error-log/ui/ErrorLogTable.tsx`: `if (!data) return null`.
  - `apps/admin/src/features/site-settings/ui/*SettingsForm.tsx`: settings query의 loading/error가 거의 표시되지 않고 기본값 또는 빈 입력처럼 보일 수 있음.
- 수정: 공통 상태 패널 `apps/admin/src/shared/ui/QueryStateMessage.tsx`를 추가하고, 영향 컴포넌트에서 `isPending`, `isError`, `error`를 분기했다.
- 빈 데이터 메시지는 query 성공 이후에만 렌더되도록 변경했다.
- settings form은 query pending/error 중 기본값 기반 form을 렌더하지 않고 상태 패널을 먼저 표시한다.
- 추가 보강: `BoardTable`, `PostTable`, `SubpageTable`, board/post/subpage/popup/navigation 상세·편집 client의 `if (!data) return null` 패턴도 상태 패널로 교체했다.
- `SubpageView`의 blocks query도 별도 loading/error를 표시한다.

## 적용된 주요 커밋

- `e2326e9 Fix demo session snapshot reference remap`
- `65d646d Complete demo home section reference remap`
- `2002941 Fix demo admin API base path`
- `d7e8d8f Disable demo admin server prefetch`
- `a281dd0 Disable admin link prefetch`
- `10b55d4 Attach demo session context after auth`
- `f648954 Run admin routes in demo session scope`
- `4b296c3 Fix demo snapshot media urls and dashboard scope`
- `8927114 Ensure demo admin after snapshot import`
- `96b86f8 Fix demo admin session and media handling`
- `5df5bc6 Fix demo update delete isolation`
- 이번 작업: DemoBanner hydration mismatch 수정 + admin React Query loading/error UI 보강 (커밋 예정)

## 검증된 명령

pnpm 자체가 로컬에서 `[ERROR] unable to open database file`를 낸 적이 있어, 일부 검증은 직접 바이너리로 수행했다.

```bash
# admin typecheck
cd /home/ddock4you/project/simple-CMS/apps/admin
./node_modules/.bin/tsc --noEmit

# db typecheck
cd /home/ddock4you/project/simple-CMS/packages/db
./node_modules/.bin/tsc --noEmit

# db snapshot/clone tests
cd /home/ddock4you/project/simple-CMS/packages/db
../../node_modules/.bin/vitest run src/demo/snapshotWalker.test.ts src/demo/cloneSeedToSession.test.ts

# admin auth/session tests
cd /home/ddock4you/project/simple-CMS/apps/admin
../../node_modules/.bin/vitest run src/shared/api/runWithUserDemoSession.test.ts src/entities/auth/lib/getCurrentUser.test.ts src/entities/auth/lib/requirePermission.test.ts
```

최근 `96b86f8` 작업에서 추가 검증:

```bash
# admin typecheck
cd /home/ddock4you/project/simple-CMS/apps/admin
./node_modules/.bin/tsc --noEmit

# db typecheck
cd /home/ddock4you/project/simple-CMS/packages/db
./node_modules/.bin/tsc --noEmit

# db snapshot/clone tests
cd /home/ddock4you/project/simple-CMS/packages/db
../../node_modules/.bin/vitest run src/demo/snapshotWalker.test.ts src/demo/cloneSeedToSession.test.ts
```

최근 `5df5bc6` 작업에서 추가 검증:

```bash
# db demo extension tests
cd /home/ddock4you/project/simple-CMS/packages/db
../../node_modules/.bin/vitest run src/demo/clientExtension.test.ts

# admin auth permission tests
cd /home/ddock4you/project/simple-CMS/apps/admin
../../node_modules/.bin/vitest run src/entities/auth/lib/requirePermission.test.ts src/entities/auth/lib/requireAnyPermission.test.ts

# db typecheck
cd /home/ddock4you/project/simple-CMS/packages/db
./node_modules/.bin/tsc --noEmit

# admin typecheck
cd /home/ddock4you/project/simple-CMS/apps/admin
./node_modules/.bin/tsc --noEmit

# admin lint/build
pnpm --filter @simple-cms/admin lint
pnpm --filter @simple-cms/admin build
```

이번 DemoBanner/React Query UI 보강 작업에서 추가 검증:

```bash
# pnpm은 로컬에서 [ERROR] unable to open database file로 실행 전 실패
pnpm --filter @simple-cms/admin typecheck
pnpm --filter @simple-cms/web typecheck
pnpm --filter @simple-cms/admin lint
pnpm --filter @simple-cms/web lint
pnpm --filter @simple-cms/admin build
pnpm --filter @simple-cms/web build

# fallback direct binaries
cd /home/ddock4you/project/simple-CMS/apps/admin
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/next build

cd /home/ddock4you/project/simple-CMS/apps/web
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/next build
```

결과:

- admin/web `tsc --noEmit` 통과.
- admin/web ESLint 통과. 기존 warning만 남음.
- admin/web `next build` 통과.
- sandbox 내부 direct build는 admin Google Fonts fetch 차단, web Turbopack port bind 제한으로 실패했으나, 승인 후 동일 명령을 sandbox 밖에서 실행해 통과.

주의:

- `next build`가 `apps/admin/next-env.d.ts`를 `.next/types/routes.d.ts`로 바꿨지만, 최종적으로 `.next/dev/types/routes.d.ts` import로 원복했다.
- untracked `.env.demo`, `demo-snapshot-2026-06-04T01-09-30-773Z.json`, 이 debug 문서는 이전까지 커밋 제외 대상이었다. 사용자가 이번에 debug 문서 업데이트를 명시 요청했으므로 이 문서만 의도된 변경으로 취급 가능하다. `.env.demo`와 snapshot JSON은 계속 커밋 금지.

## 올바른 재import 절차

최신 코드가 반영된 뒤 실행해야 한다. 특히 `8927114` 이전 코드로 import하면 `demo_admin`이 보장되지 않는다.

```bash
cd /home/ddock4you/project/simple-CMS
git pull

set -a
source .env.demo
set +a

pnpm demo:import /home/ddock4you/project/simple-CMS/demo-snapshot-실제파일명.json
```

`.env.demo` 필수 값:

```env
DEMO_MODE=true
STORAGE_PROVIDER=supabase
DATABASE_URL=시연 Supabase DB URL
SUPABASE_URL=시연 Supabase URL
SUPABASE_SERVICE_ROLE_KEY=시연 service_role key
SUPABASE_STORAGE_BUCKET=uploads
```

import 후 Supabase에서 확인할 것:

- `User`에 `sessionId='__SEED__'`, `username='demo_admin'`, `status='ACTIVE'` row 존재.
- 새 시크릿창 접속 직후 `__SEED__` 외 UUID 형태 visitor `sessionId` row들이 생성됨.
- Storage에 `__SEED__/...` 파일들이 존재.

## 아직 확인/수정해야 할 가능성이 있는 것

1. 실제 배포 DB의 visitor session clone 확인
   - Supabase 주요 테이블에 `__SEED__` 외 UUID sessionId row가 생기는지 확인.
   - 생기지 않으면 `/api/demo/bootstrap` 서버 로그에서 `SeedNotFoundError` 또는 clone 실패 로그 확인.
   - 로컬 `.env.demo`로 확인했을 때는 `User sessions []`가 나왔음. 즉 현재 로컬 `.env.demo`가 사용자가 보고 있는 배포 DB와 다르거나, import가 안 된 DB를 가리키고 있을 가능성이 있다. 이 상태에서는 로컬에서 실제 배포 증상을 재현 검증할 수 없음.

2. 이미지 재작성 확인
   - `96b86f8`에서 import 순서 오류와 clone-time local URL 보정을 추가했다.
   - 배포 후 새 시연 세션을 시작해야 clone-time 보정이 적용된다.
   - 그래도 깨지면 실제 DB에서 `Media.url`, `Post.contentJson`, `PageBlock.configJson`이 어떤 URL을 들고 있는지 확인해야 한다.
   - 확인 대상: `Post.contentJson`, `PageBlock.configJson`, `HomeSection.configJson`, `HomePopup.contentJson`, `SubpageVersion.snapshot`.

3. 게시글/게시판/서브페이지 편집 및 삭제 재확인
   - 해결됨. 사용자가 `5df5bc6` 배포 후 게시글/게시판/서브페이지 수정·삭제 정상 동작을 확인했다.
   - 같은 증상이 재발하면 `packages/db/src/demo/clientExtension.ts`의 `update/delete` where 병합 테스트부터 확인한다.

4. API route wrapper를 타지 않는 직접 Prisma 호출 점검
   - Dashboard는 수정됨.
   - `/subpage-feedback`의 `subpageOptions`는 `96b86f8`에서 수정됨.
   - 다른 Server Component 또는 수동 API route가 직접 `prisma.*`를 호출하면 `runWithUserDemoSession` 또는 route-level wrapper로 감싸야 한다.
   - 검색 예:

```bash
rg -n "prisma\\." apps/admin/src apps/admin/app
```

5. 대부분의 admin 페이지가 0건 또는 빈 화면처럼 보이는 문제
   - 현재 정적 분석 결과로는 read sessionId 누락보다 React Query 상태 UI 누락 가능성이 더 커졌다.
   - DEMO_MODE에서 Server Component prefetch가 no-op이므로 초기 client render 시 `data === undefined`가 정상이다.
   - 그런데 여러 client component가 `data === undefined`를 loading이 아니라 null/empty로 처리한다.
   - 실제 API가 200인지 401/403/500인지는 브라우저 Network 탭으로 확인해야 한다.
   - DB visitor clone 누락 가능성을 완전히 배제하려면 특정 visitor sessionId별 count도 계속 확인한다:

```sql
SELECT "sessionId", count(*) FROM "User" GROUP BY "sessionId" ORDER BY count(*) DESC;
SELECT count(*) FROM "NavigationMenu" WHERE "sessionId" = '<visitor-session-id>';
SELECT count(*) FROM "HomeSection" WHERE "sessionId" = '<visitor-session-id>';
SELECT count(*) FROM "Board" WHERE "sessionId" = '<visitor-session-id>';
SELECT count(*) FROM "SiteSettings" WHERE "sessionId" = '<visitor-session-id>';
```

6. public web 쪽 demo session 확인
   - admin이 정상화된 뒤 공개 web도 같은 visitor session 데이터를 보는지 확인 필요.
   - 공개 web에서 DB 데이터가 누락되면 web의 `ensureDemoSession` / raw SQL sessionId 조건 / `findUnique` 사용을 점검.

7. 잘못 생성된 과거 데이터 정리
   - 이전 버그 상태에서 `__PROD__` 또는 오래된 visitor session에 생성된 데이터가 남아 있을 수 있다.
   - cleanup 또는 전체 demo seed reset/import로 정리 권장.

8. React #418 hydration mismatch 수정
   - 완료됨. admin/web `DemoBanner` 첫 렌더는 deterministic placeholder를 렌더하고, countdown은 `useEffect` 이후 계산한다.
   - React 공식 문서 기준 `suppressHydrationWarning`은 escape hatch이며 mismatched text를 patch하지 않는다. 이번 케이스는 placeholder + `useEffect` two-pass render로 해결했다.

9. React Query loading/error UI 보강
   - 완료됨. 대표 admin query 화면에서 `isPending`, `isError`, `error`를 분기한다.
   - 빈 데이터 메시지는 query 성공 이후에만 표시한다.
   - 실제 API 오류를 화면에 드러내기 위한 진단성 개선이 적용됐다.

## 구현 완료 기록

아래 구현 지시서는 이번 작업에서 반영 완료됐다. 시연 서버 배포 후에는 새 시크릿창 또는 [새 세션 시작]으로 세션을 새로 만들고 브라우저에서 실제 증상을 확인한다.

### 1. 사전 확인

- admin UI 파일을 수정하기 전 `apps/admin/design.md`를 읽는다.
- git status에서 `.env.demo`와 snapshot JSON은 절대 건드리지 않는다.
- `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md`는 사용자가 업데이트를 명시 요청했으므로 의도된 변경 파일이다.

### 2. `DemoBanner` hydration mismatch 수정

수정 파일:

- `apps/admin/src/shared/ui/DemoBanner.tsx`
- `apps/web/src/shared/ui/DemoBanner.tsx`

현재 문제 코드:

```tsx
const [remaining, setRemaining] = useState<number>(() =>
  Math.max(0, expiresMs.current - Date.now()),
);
```

수정 원칙:

- 첫 렌더에서 `Date.now()`를 호출하지 않는다.
- 첫 렌더 text는 server/client 모두 동일해야 한다.
- `useEffect`에서만 `Date.now()`로 남은 시간을 계산한다.
- `suppressHydrationWarning`은 쓰지 않는다.

권장 구현 형태:

```tsx
const [remaining, setRemaining] = useState<number | null>(null);

useEffect(() => {
  expiresMs.current = new Date(expiresAt).getTime();
  setRemaining(Math.max(0, expiresMs.current - Date.now()));
}, [expiresAt]);

useEffect(() => {
  const updateRemaining = () => {
    setRemaining(Math.max(0, expiresMs.current - Date.now()));
  };
  updateRemaining();
  const id = setInterval(updateRemaining, 1000);
  return () => clearInterval(id);
}, []);
```

렌더링 예:

```tsx
<span className="font-medium tabular-nums">
  남은 시간 {remaining === null ? '계산 중' : formatRemaining(remaining)}
</span>
```

주의:

- web 쪽은 inline style이므로 className 예시는 admin에만 그대로 적용한다.
- `expiresAt` 변경 시 첫 effect가 ref를 갱신하므로 interval callback이 최신 ref를 사용한다.
- `formatRemaining()`은 그대로 재사용해도 된다.

### 3. React Query loading/error UI 보강

공통 UI 원칙:

```tsx
const { data, isPending, isError, error } = useQuery(options);

if (isPending) {
  return <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">불러오는 중...</div>;
}

if (isError) {
  return <div className="rounded-md border border-dashed p-8 text-center text-destructive">데이터를 불러오지 못했습니다. {error.message}</div>;
}

// 이 지점부터 data는 성공 결과로 취급한다.
```

대상 파일별 처리:

- `apps/admin/src/pages/navigation-management/ui/NavigationListClient.tsx`
  - `const { data: menus, isPending, isError, error } = useQuery(menuSetListOptions())`로 변경.
  - pending이면 "메뉴를 불러오는 중...".
  - error이면 "메뉴 목록을 불러오지 못했습니다."와 `error.message` 표시.
  - `menus.length === 0`은 성공 이후에만 "메뉴가 없습니다." 표시.
- `apps/admin/src/pages/home-management/ui/HomePageClient.tsx`
  - 기존 `isLoading` 대신 `isPending`, `isError`, `error`를 사용.
  - pending/error 이후에만 `sections.length === 0` seed 안내 표시.
- `apps/admin/src/features/user-management/ui/UserTable.tsx`
  - `if (!data) return null` 제거.
  - pending/error fallback을 표시.
  - 성공 이후 기존 table 렌더 유지.
- `apps/admin/src/features/subpage-feedback/ui/FeedbackStatsSection.tsx`
  - `if (!data) return null` 제거.
  - pending/error fallback을 표시.
- `apps/admin/src/features/subpage-feedback/ui/FeedbackListTable.tsx`
  - `if (!data) return null` 제거.
  - pending/error fallback을 표시.
- `apps/admin/src/features/audit-log/ui/AuditLogTable.tsx`
  - `if (!data) return null` 제거.
  - pending/error fallback을 표시.
- `apps/admin/src/features/error-log/ui/ErrorLogTable.tsx`
  - `if (!data) return null` 제거.
  - pending/error fallback을 표시.

settings form 대상:

- `apps/admin/src/features/site-settings/ui/DomainSettingsForm.tsx`
- `apps/admin/src/features/site-settings/ui/SecuritySettingsForm.tsx`
- `apps/admin/src/features/site-settings/ui/UploadSettingsForm.tsx`
- `apps/admin/src/features/site-settings/ui/BrandingSettingsForm.tsx`
- `apps/admin/src/features/site-settings/ui/FooterSettingsForm.tsx`
- `apps/admin/src/features/site-settings/ui/SeoSettingsForm.tsx`

settings form 처리 원칙:

- query pending 중이면 form 자체를 기본값으로 보여주지 말고 "설정을 불러오는 중..." 카드를 표시한다.
- query error면 "설정을 불러오지 못했습니다."와 `error.message`를 표시한다.
- 성공 이후에만 react-hook-form `values`/`reset` 기반 form을 표시한다.
- `SecuritySettingsForm`의 `currentValue = data?.concurrentLoginEnabled ?? true`는 pending 중 실제 DB 값처럼 보일 수 있으므로 pending/error 분기 뒤에 계산한다.
- `SeoSettingsForm`의 `baseUrl = data?.baseUrl ?? ''`도 pending 중 "미설정"처럼 보이지 않게 pending/error 뒤에 렌더한다.

### 4. 검증

수정 후 실행 완료:

```bash
pnpm --filter @simple-cms/admin typecheck
pnpm --filter @simple-cms/admin lint
pnpm --filter @simple-cms/admin build
pnpm --filter @simple-cms/web typecheck
pnpm --filter @simple-cms/web lint
pnpm --filter @simple-cms/web build
```

pnpm이 `[ERROR] unable to open database file`를 내면 fallback:

```bash
cd /home/ddock4you/project/simple-CMS/apps/admin
./node_modules/.bin/tsc --noEmit

cd /home/ddock4you/project/simple-CMS/apps/web
./node_modules/.bin/tsc --noEmit
```

### 5. 브라우저 확인

- 시연 admin에 새 시크릿창 또는 [새 세션 시작]으로 접속한다.
- 콘솔에서 React #418이 사라졌는지 확인한다.
- Network 탭에서 `/_cms/admin/api/navigation`, `/api/home`, `/api/users`, `/api/settings/*` 요청이 200인지 확인한다.
- 화면에서 pending/error/empty가 구분되는지 확인한다.
- API가 500이면 UI가 error message를 표시해야 하며, 그때는 Vercel server log 기준으로 별도 수정한다.

## 배포 후 추천 확인 순서

1. 새 시크릿창 또는 [새 세션 시작]으로 admin 접속.
2. 콘솔 React #418 유무 확인.
3. Network 탭에서 `/_cms/admin/api/...` 요청 status/body 확인.
4. 화면에서 loading/error/empty가 구분되는지 확인.
5. API가 200인데 화면이 비면 남은 UI 상태 분기 누락을 찾는다.
6. API가 401/403이면 permission/session cookie 경로를 확인한다.
7. API가 500이면 Vercel server log의 `console.error` 기준으로 route 내부 오류를 확인한다.
8. visitor session row count 자체가 누락되어 있으면 clone/import 쪽으로 되돌아가 확인한다.
