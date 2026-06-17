<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Demo Mode Modularization Plan
description: 2026-06-11 시연 모드 배포 장애 후 코드 정리·모듈화 검토 결과와 다음 개발 컨텍스트 인계 메모
type: project
originSessionId: 2026-06-11-demo-mode-review
---

# Demo Mode Modularization Plan

2026-06-11에 시연 모드 관련 코드를 읽기 전용으로 전수 검토한 결과다. 다음 컨텍스트는 이 문서를 먼저 읽고, 실제 개발 전 한 번 더 빠르게 확인한 뒤 작업을 시작하면 된다.

## 배경

최근 실제 배포에서 시연 모드가 대부분 정상 동작하지 않아 급하게 여러 핫픽스가 들어갔다. 주요 문제는 `sessionId` 컬럼 기반 격리 컨텍스트가 붙지 않아 visitor 데이터 대신 `__PROD__` 운영 데이터를 보거나, admin/web 단일 도메인 배포에서 basePath·rewrite·쿠키 흐름이 어긋나는 유형이었다.

핵심 설계 자체는 유지할 가치가 있다.

- `packages/db/src/demo/sessionContext.ts`: AsyncLocalStorage 기반 `sessionId` 컨텍스트
- `packages/db/src/demo/clientExtension.ts`: DEMO_MODE에서 Prisma query hook으로 sessionId 자동 주입
- `packages/db/src/demo/cloneSeedToSession.ts`: `__SEED__` row를 visitor sessionId로 복제
- `apps/{admin,web}/src/shared/lib/ensureDemoSession.ts`: layout gate에서 시연 세션 검증과 컨텍스트 부착
- `apps/web/src/shared/lib/createSettingsCache.ts`: settings cache를 sessionId별 Map으로 분리

다만 핫픽스가 여러 레이어에 분산되어 다음 신규 기능에서 같은 누락이 재발하기 쉬운 상태다.

## 현재 주요 흐름

### DB 격리

- `packages/db/src/client.ts`가 `process.env.DEMO_MODE === 'true'`일 때만 `demoExtension`을 적용한다.
- `clientExtension.ts`는 `findMany`/`findFirst`/`count` 등에 `AND: [{...}, { sessionId }]`를 추가한다.
- `create`/`createMany`에는 현재 컨텍스트의 sessionId를 주입한다.
- `findUnique`는 결과의 `sessionId`를 검증하고, `select`에 sessionId가 없으면 강제로 추가한 뒤 응답에서 제거한다.
- `update`/`delete`는 `where`에 `{ sessionId }`를 직접 병합한다.
- `Session`과 `PreviewToken`은 extension 제외 모델이다.

### admin 요청 스코프

- `apps/admin/src/shared/lib/ensureDemoSession.ts`가 authenticated layout에서 cookie를 확인하고 `demo.enterWith({ sessionId })`를 호출한다.
- `apps/admin/src/entities/auth/lib/getCurrentUser.ts`도 DEMO_MODE에서 인증 사용자 기준으로 `demo.enterWith()`를 다시 호출한다.
- `requirePermission.ts`와 `requireAnyPermission.ts`도 성공 후 `demo.enterWith()`를 호출한다.
- `apps/admin/src/shared/api/runWithUserDemoSession.ts`가 `demo.runWith({ sessionId: user.sessionId }, fn)`을 제공한다.
- `defineRoute.ts`와 `defineBulkOperation.ts`는 handler 전체를 `runWithUserDemoSession()`으로 감싼다.

### web 요청 스코프

- `apps/web/app/layout.tsx`는 DEMO_MODE일 때만 `ensureDemoSession(await getCurrentPathname())`를 호출한다.
- layout 안에서 `demo.runWith({ sessionId }, renderLayout)`로 메뉴/브랜딩/푸터 조회를 감싼다.
- Route Handler는 layout을 통과하지 않으므로 `apps/web/src/shared/lib/requestDemoSession.ts`의 `runWithRequestDemoSession()`으로 별도 처리한다.
- 현재 `feedback`, `preview`, `error-report`, `session-diagnostics`는 이 패턴을 사용한다.

## 확인된 정리 포인트

### 1. session scope 부착이 여러 파일에 분산됨

관련 파일:

- `apps/admin/src/shared/lib/ensureDemoSession.ts`
- `apps/admin/src/entities/auth/lib/getCurrentUser.ts`
- `apps/admin/src/entities/auth/lib/requirePermission.ts`
- `apps/admin/src/entities/auth/lib/requireAnyPermission.ts`
- `apps/admin/src/shared/api/runWithUserDemoSession.ts`
- `apps/admin/src/shared/api/defineRoute.ts`
- `apps/admin/src/shared/api/defineBulkOperation.ts`

문제:

- 수동 API route는 `requirePermission()`의 side effect(`demo.enterWith`)에 기대는 경우가 있다.
- `defineRoute`를 타는 route는 안전하지만, 수동 route마다 `runWithUserDemoSession()` 적용 여부가 제각각이다.
- 과거 장애 메모에도 `requireAnyPermission()` 누락, dashboard 직접 Prisma 호출 누락, 수동 route 누락이 반복 원인으로 기록되어 있다.

제안:

- admin에 `withAdminRouteScope()` 또는 `withPermissionRoute()` 계열 wrapper를 만들고 인증, 권한, session scope, audit context를 한 진입점에서 처리한다.
- 장기적으로 `requirePermission()`은 권한 검증만 담당하고, session scope 부착은 wrapper가 담당하게 한다.
- 수동 route를 점진적으로 `defineRoute` 또는 새 wrapper로 이전한다.

우선 적용 후보:

- `apps/admin/app/api/users/bulk-approve/route.ts`
- `apps/admin/app/api/users/bulk-reject/route.ts`
- `apps/admin/app/api/users/bulk-suspend/route.ts`
- `apps/admin/app/api/users/bulk-reactivate/route.ts`
- `apps/admin/app/api/users/bulk-role/route.ts`
- `apps/admin/app/api/subpage-feedback/export/route.ts`
- `apps/admin/app/api/home-popups/reorder/route.ts`
- `apps/admin/app/api/settings/domain/check-dns/route.ts`
- `apps/admin/app/api/preview/token/route.ts`

### 2. demo route/path/cookie 상수가 중복됨

중복 예시:

- `/_cms/admin`: `fetchClient.ts`, `useDirtyGuard.ts`, Demo UI code
- `/demo-bootstrap`: admin/web `ensureDemoSession.ts`, `requestDemoSession.ts`, reset response
- `/ _cms/admin/api/demo/bootstrap`와 `/ _cms/admin/api/demo/reset`: admin/web BootstrapClient, DemoBanner
- `session-token`: admin/web cookies helper, `requestDemoSession.ts`

제안:

- 앱 공통 또는 `packages/types`에 client-safe demo constants를 추가한다.
- 후보 파일: `packages/types/src/domain/demo.types.ts` 또는 `packages/types/src/demo.constants.ts`
- 포함 대상:
  - `DEMO_ADMIN_BASE_PATH = '/_cms/admin'`
  - `DEMO_BOOTSTRAP_PATH = '/demo-bootstrap'`
  - `DEMO_SESSION_COOKIE_NAME = 'session-token'`
  - `demoAdminApiPath('/api/demo/reset')`
  - `demoBootstrapPath(next)`
  - `stripDemoAdminBasePath(path)`

주의:

- admin package에서 `@simple-cms/types` import는 가능하다.
- 앱별 Next.js 환경에 의존하는 함수는 앱 내부 `shared/lib/demoRoutes.ts`로 두고, 문자열 상수만 packages로 올려도 된다.

### 3. admin proxy가 query string을 보존하지 않음

관련 파일:

- `apps/admin/proxy.ts`
- `apps/admin/src/shared/lib/getCurrentPathname.ts`
- `apps/web/proxy.ts`
- `apps/web/src/shared/lib/getCurrentPathname.ts`

현재 web은 `x-pathname`과 `x-search`를 모두 주입한다. admin은 `x-pathname`만 주입한다.

영향:

- 시연 첫 진입이 `/_cms/admin/posts?page=2` 같은 URL이면 bootstrap 후 `/posts`로 돌아가 query가 사라질 수 있다.

제안:

- admin proxy에도 `x-search`를 주입한다.
- admin `getCurrentPathname()`도 web과 동일하게 `pathname + search`를 반환하게 맞춘다.

### 4. DemoBootstrapClient와 DemoBanner 중복

중복 파일:

- `apps/admin/app/demo-bootstrap/DemoBootstrapClient.tsx`
- `apps/web/app/demo-bootstrap/DemoBootstrapClient.tsx`
- `apps/admin/src/shared/ui/DemoBanner.tsx`
- `apps/web/src/shared/ui/DemoBanner.tsx`

현재 BootstrapClient는 거의 동일하고, Banner도 countdown/reset fetch 로직이 중복이다. UI 차이는 admin은 AlertDialog/toast, web은 native confirm/alert라는 점뿐이다.

제안:

- UI를 완전히 공유하지 않아도 renderless hook을 공유한다.
- 후보:
  - `useDemoCountdown(expiresAt)`
  - `useDemoReset({ endpoint, onError, onSuccess })`
  - `useDemoBootstrap({ endpoint, nextPath })`
- 앱 간 UI 시스템 분리 원칙이 있으므로 presentational component 공유는 신중하게 판단한다.

추가 정리:

- Bootstrap API 응답의 `redirectTo`는 현재 클라이언트가 무시한다. API contract에서 제거하거나 클라이언트가 사용하도록 맞춘다.

### 5. snapshot/clone/cleanup 모델 목록이 분산됨

관련 파일:

- `packages/db/src/demo/snapshot.types.ts`
- `packages/db/src/demo/exportSnapshot.ts`
- `packages/db/src/demo/importSnapshot.ts`
- `packages/db/src/demo/cloneSeedToSession.ts`
- `packages/db/src/demo/cleanupSessions.ts`
- `packages/db/src/demo/resetSeedData.ts`
- `apps/admin/src/pages/site-settings/ui/DemoSnapshotPage.tsx`
- `apps/admin/src/features/site-settings/ui/DemoSnapshotForm.tsx`

문제:

- snapshot은 실제로 14모델 기준이다.
- cleanup은 AuditLog/ErrorLog/PreviewToken까지 포함해 17모델에 가깝다.
- `DemoSnapshotPage.tsx`와 `DemoSnapshotForm.tsx`는 16모델, AuditLog/ErrorLog 포함처럼 설명한다.
- 신규 모델 추가 시 export/import/clone/cleanup/UI count 중 하나가 빠질 가능성이 높다.

제안:

- `packages/db/src/demo/modelRegistry.ts`를 추가한다.
- 포함 후보:
  - `SNAPSHOT_MODEL_NAMES`
  - `CLONE_MODEL_NAMES`
  - `CLEANUP_DELETE_ORDER`
  - `SEED_RESET_DELETE_ORDER`
  - `DEMO_ISOLATED_MODEL_NAMES`
- UI row count와 설명은 registry를 참조한다.
- `snapshot.types.ts`의 schema와 registry를 완전히 자동 동기화하기 어렵다면, 최소한 테스트로 `Object.keys(snapshotModelsSchema.shape)`와 registry가 일치하는지 확인한다.

즉시 수정 후보:

- `DemoSnapshotPage.tsx`의 설명에서 AuditLog/ErrorLog 포함 문구 제거
- `DemoSnapshotForm.tsx`의 “16모델 합계”, 로그 count description 제거 또는 “snapshot 제외 로그”로 명확화

### 6. snapshot/clone/import 대형 파일 분리

관련 파일:

- `packages/db/src/demo/cloneSeedToSession.ts` 약 590줄
- `packages/db/src/demo/importSnapshot.ts` 약 638줄
- `packages/db/src/demo/snapshotWalker.ts` 약 500줄

문제:

- idMap 생성, 관계 remap, createMany 순서, demo admin 보장 로직이 파일 내부에 길게 섞여 있다.
- `DEMO_ADMIN_PERMISSIONS`가 `demo-seed.ts`와 `importSnapshot.ts`에 중복된다.

제안 구조:

- `packages/db/src/demo/seedClone/idMaps.ts`
- `packages/db/src/demo/seedClone/cloneSteps.ts`
- `packages/db/src/demo/snapshot/exportSteps.ts`
- `packages/db/src/demo/snapshot/importSteps.ts`
- `packages/db/src/demo/snapshot/ensureDemoAdminSeed.ts`
- `packages/db/src/demo/snapshot/modelRegistry.ts` 또는 공용 `demo/modelRegistry.ts`

권한 상수 정리:

- `DEMO_ADMIN_PERMISSIONS`는 `packages/types`의 `RESOURCE_ACTIONS`에서 full permission을 생성하는 helper로 통합한다.
- 운영 seed, demo-seed, snapshot import가 같은 helper를 사용하도록 만든다.

### 7. storage 격리 로직이 adapter 안에 직접 들어 있음

관련 파일:

- `apps/admin/src/shared/lib/storage/supabaseAdapter.ts`
- `apps/admin/src/shared/lib/storage/index.ts`

현재 `SupabaseStorageAdapter.upload()`가 `demo.getCurrentSessionId()`를 직접 읽고 `DEMO_MODE && sessionId !== __PROD__`이면 `<sessionId>/<category>/<filename>` prefix를 붙인다.

위험:

- DEMO_MODE인데 session context가 누락되면 `demo.getCurrentSessionId()`가 `__PROD__` fallback을 반환하고, prefix 없는 운영형 경로로 업로드될 수 있다.
- 지금은 admin API들이 대부분 보강되었지만, 신규 upload route나 CLI성 코드에서 재발 가능하다.

제안:

- `resolveDemoStoragePrefix()` 또는 `getStorageIsolationPrefix()`를 별도 helper로 뺀다.
- DEMO_MODE에서 upload route가 authenticated visitor 작업인데 `__PROD__` context면 경고 또는 에러를 내는 guard를 검토한다.
- `cleanupSessionFolder()`와 `cleanupSeedFolder()`는 내부 `cleanupFolder(prefix, options)`로 중복을 줄인다.
- `packages/db/scripts/demo-import.ts`의 Supabase upload/cleanup inline 구현을 adapter callback factory로 대체한다.

### 8. CLI의 PrismaClient ownership이 모호함

관련 파일:

- `packages/db/scripts/demo-export.ts`
- `packages/db/scripts/demo-import.ts`

문제:

- CLI 파일에서 자체 `new PrismaClient({ adapter })`를 만들지만, 실제 `exportSnapshot()`과 `importSnapshotToSeed()`는 `packages/db/src/client.ts`의 singleton `prisma`를 사용한다.
- 마지막에 자체 client만 disconnect한다. 실제 singleton client는 별도다.
- 동작상 큰 장애는 아니어도 “어느 DB client가 실제 쿼리하는지”가 불명확하다.

제안:

- 코어 함수에 optional `client`를 주입할 수 있게 하거나, CLI에서 자체 PrismaClient 생성을 제거하고 패키지 singleton만 사용한다.
- 후자를 선택하면 disconnect 정책도 패키지 차원에서 명확히 해야 한다.

### 9. diagnostics는 운영 기능과 분리 필요

관련 파일:

- `apps/web/app/api/demo/session-diagnostics/route.ts`
- `apps/web/src/shared/lib/demoSessionDiagnostics.ts`
- `apps/web/src/shared/lib/demoSessionDiagnostics.test.ts`

현재 DEMO_MODE에서 시연 세션이 있으면 counts, branding media id, footer logo media id, search smoke 결과를 반환한다.

제안:

- 안정화 후 제거하거나, `DEMO_SESSION_DEBUG=true` 또는 `Authorization: Bearer ${CRON_SECRET}`가 있을 때만 활성화한다.
- 유지한다면 `shared/lib`가 아니라 `shared/demo/diagnostics.ts`처럼 시연 전용 위치로 옮긴다.

## 유지할 것

- `packages/db/src/demo/sessionContext.ts`의 `runWith`, `enterWith`, `runWithBypass` API는 유지한다.
- `packages/db/src/demo/clientExtension.ts`의 update/delete `where: { ...where, sessionId }` 방식은 유지한다. 과거 preflight 방식이 Vercel bundle 환경에서 불안정했다.
- `apps/web/src/shared/lib/createSettingsCache.ts`의 sessionId별 cache key는 유지한다.
- raw SQL은 계속 `demo.getCurrentSessionId()`를 명시해야 한다. 현재 확인된 raw SQL은 `packages/db/src/search.ts`와 `apps/admin/src/features/media-management/lib/findMediaReferences.ts`이며 sessionId 필터가 들어가 있다.
- `web app/layout.tsx`의 `if (process.env.DEMO_MODE === 'true')` guard는 운영 정적화를 위해 유지한다.

## 테스트 보강 제안

현재 단위 테스트는 `clientExtension`과 `snapshotWalker` 중심이다. 실제 배포 장애 유형은 통합/E2E가 없어서 놓쳤다.

추가 권장:

1. `DEMO_TEST_DB_URL` 기반 DB 통합 테스트
   - `__SEED__` 최소 row 삽입
   - `cloneSeedToSession(visitorId)` 실행
   - 14모델 카운트와 FK remap 검증
   - `demo.runWith({ sessionId: visitorId })` 안에서 visitor row만 보이는지 검증
   - raw SQL 검색 `searchContent()`가 visitor row만 보는지 검증

2. admin route scope 테스트
   - 수동 route 하나를 wrapper로 마이그레이션한 뒤, handler 안 Prisma count가 user.sessionId를 보는지 mock 또는 integration으로 검증
   - `requireAnyPermission()` 경로도 포함

3. Playwright demo smoke
   - 시크릿 context로 `/` 접속
   - `/demo-bootstrap` 거쳐 cookie 생성 확인
   - 메인 페이지가 `__SEED__` 클론 데이터로 렌더되는지 확인
   - `/_cms/admin/dashboard` 접속 후 DemoBanner와 관리 데이터 확인
   - admin CRUD 하나, web 반영 하나, reset 버튼 하나 검증

4. cache isolation 테스트
   - `createSettingsCache`에 sessionId A/B 컨텍스트를 번갈아 넣고 서로 다른 값이 캐시되는지 검증

5. snapshot UI contract 테스트
   - `SNAPSHOT_MODEL_NAMES`와 admin 스냅샷 통계 모델 목록이 일치하는지 검증

## 권장 작업 순서

### PR 1: low-risk constants와 query 보존

- demo constants/path helper 추가
- admin `proxy.ts`에 `x-search` 추가
- admin `getCurrentPathname()`이 query를 보존하도록 수정
- BootstrapClient/DemoBanner의 hardcoded endpoint를 helper로 교체
- `useDirtyGuard.ts`와 `fetchClient.ts`의 basePath helper 중복 제거

검증:

- admin/web typecheck
- `/_cms/admin/posts?page=2` 같은 URL에서 bootstrap 후 query 보존 수동 확인 또는 단위 테스트

### PR 2: admin route scope wrapper 정리

- `withPermissionRoute` 또는 `withAdminRouteScope` 추가
- 수동 route 중 위험도가 높은 bulk/export/reorder부터 이전
- `requirePermission()` side effect에 대한 의존을 줄이는 방향으로 리팩터링

검증:

- 관련 route 단위 테스트
- admin typecheck
- DEMO_MODE mock에서 `demo.runWith` 호출 검증

### PR 3: model registry와 snapshot UI 정합성

- `packages/db/src/demo/modelRegistry.ts` 추가
- snapshot export/import/clone/cleanup/resetSeedData에서 registry 사용 범위 확대
- admin `DemoSnapshotPage`/`DemoSnapshotForm` 문구와 row count를 실제 14모델 snapshot 기준으로 수정

검증:

- db unit tests
- snapshotWalker tests
- admin typecheck

### PR 4: snapshot/clone/storage 파일 분리

- `cloneSeedToSession.ts`와 `importSnapshot.ts`를 단계별 파일로 분리
- `ensureDemoAdminSeed` 분리
- storage cleanup/upload helper 중복 제거
- CLI PrismaClient ownership 정리

검증:

- db typecheck
- snapshot/clone tests
- 가능하면 `DEMO_TEST_DB_URL` integration smoke

### PR 5: diagnostics와 E2E

- `session-diagnostics` 보호 또는 제거
- Playwright demo smoke 추가
- CI에서는 optional 또는 workflow_dispatch로 먼저 도입

## 다음 컨텍스트 시작 체크리스트

1. 이 문서와 `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md`를 먼저 읽는다.
2. `git status --short`로 작업트리 상태를 확인한다.
3. `apps/admin/proxy.ts`, `apps/admin/src/shared/lib/getCurrentPathname.ts`, `apps/web/proxy.ts`, `apps/web/src/shared/lib/getCurrentPathname.ts`를 재확인한다.
4. `apps/admin/src/shared/api/runWithUserDemoSession.ts`, `defineRoute.ts`, `defineBulkOperation.ts`를 기준으로 route scope 설계를 먼저 확정한다.
5. 실제 개발은 PR 1부터 작게 시작한다.
