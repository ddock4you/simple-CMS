<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Demo Mode Modularization Execution Plan
description: 2026-06-11 시연 모드 정리·모듈화 실제 작업 순서, 위험도, 검증 명령 인계 메모
type: project
originSessionId: 2026-06-11-demo-mode-modularization-execution-plan
---

# Demo Mode Modularization Execution Plan

이 문서는 다음 컨텍스트에서 시연 모드 정리·모듈화 작업을 바로 시작하기 위한 실행 계획이다. 기존 분석 메모(`project_demo_mode_modularization_plan.md`)를 실제 PR 단위 작업 순서로 구체화했다.

## 다음 컨텍스트에서 먼저 읽을 문서

- `docs/codex/memory/project_demo_mode_modularization_plan.md`
- `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md`
- 루트 `AGENTS.md`의 “시연 모드(DEMO_MODE) 격리 인프라”
- `packages/db/AGENTS.md`의 demo session / Prisma extension 규칙
- admin UI 파일 수정 시 `apps/admin/design.md`

## 작업 전 주의

- `git status --short`를 먼저 확인한다.
- untracked snapshot JSON은 커밋 대상이 아니다. 예: `demo-snapshot-*.json`
- 기존 사용자가 만든 변경을 되돌리거나 덮어쓰지 않는다.
- 시연 모드의 핵심 API는 유지한다.
- `demo.runWith`, `demo.enterWith`, `demo.runWithBypass`는 유지한다.
- `packages/db/src/demo/clientExtension.ts`의 update/delete `where: { ...where, sessionId }` 병합 방식은 유지한다. 과거 preflight 방식이 Vercel bundle 환경에서 불안정했다.
- `apps/web/app/layout.tsx`의 `if (process.env.DEMO_MODE === 'true')` guard는 운영 정적화를 위해 유지한다.
- `apps/web/src/shared/lib/createSettingsCache.ts`의 sessionId별 cache key는 유지한다.
- raw SQL은 계속 `demo.getCurrentSessionId()`를 명시해야 한다.
- 수동 route 이전 전에는 `requirePermission()` / `requireAnyPermission()`의 `demo.enterWith()` side effect를 제거하지 않는다.

## PR0: 버그성 저위험 수정

목표: 구조 리팩터링 전에 실제 버그와 UI 계약 불일치를 먼저 막는다.

수정 대상:

- `apps/admin/proxy.ts`
- `x-search`를 `request.nextUrl.search`로 주입한다.
- `apps/admin/src/shared/lib/getCurrentPathname.ts`
- web과 동일하게 `x-pathname + x-search`를 반환한다.
- `apps/admin/src/pages/site-settings/ui/DemoSnapshotPage.tsx`
- “16모델”, “AuditLog/ErrorLog 포함” 설명을 제거한다.
- snapshot은 실제 14모델임을 명시한다.
- `apps/admin/src/features/site-settings/ui/DemoSnapshotForm.tsx`
- “16모델 합계” 문구를 “14모델 합계”로 수정한다.
- AuditLog/ErrorLog count를 snapshot 통계에서 제외하거나 “snapshot 제외 참고값”으로 분리한다.
- `packages/db/src/demo/snapshotWalker.ts`
- HERO slide의 `url`은 링크 필드이므로 media URL로 덮지 않는다.
- `imageUrl`만 media URL로 재작성한다.
- `packages/db/src/demo/snapshotWalker.test.ts`
- HERO slide `{ mediaId, imageUrl, url }`에서 `imageUrl`은 변경되고 `url`은 보존되는 회귀 테스트를 추가한다.
- `apps/admin/app/api/auth/login/route.ts`
- `apps/admin/app/api/auth/register/route.ts`
- DEMO_MODE에서 직접 API 호출 시 404 또는 403으로 차단한다. 페이지는 이미 redirect하지만 API 직접 호출 방어가 필요하다.

검증:

```bash
pnpm --filter @simple-cms/admin typecheck
pnpm --filter @simple-cms/db test -- src/demo/snapshotWalker.test.ts
```

권장 추가 테스트:

- admin `getCurrentPathname()` 단위 테스트: `x-pathname=/posts`, `x-search=?page=2`일 때 `/posts?page=2` 반환
- 수동 확인: 쿠키 없는 상태에서 `/_cms/admin/posts?page=2` 진입 후 bootstrap 완료 시 query 유지

## PR1: demo constants / path helper 단일화

목표: basePath, bootstrap path, session cookie name, demo API endpoint 중복을 줄인다.

권장 위치:

- client-safe 문자열 상수: `packages/types/src/domain/demo.types.ts` 또는 `packages/types/src/demo.constants.ts`
- Next.js 환경 의존 helper: admin/web 앱 내부 `shared/lib/demoRoutes.ts`

포함 후보:

- `DEMO_ADMIN_BASE_PATH = '/_cms/admin'`
- `DEMO_BOOTSTRAP_PATH = '/demo-bootstrap'`
- `DEMO_SESSION_COOKIE_NAME = 'session-token'`
- `demoAdminApiPath('/api/demo/reset')`
- `demoBootstrapPath(next)`
- `stripDemoAdminBasePath(path)`

교체 대상:

- `apps/admin/src/shared/api/fetchClient.ts`
- `apps/admin/src/shared/lib/useDirtyGuard.ts`
- `apps/admin/src/shared/lib/ensureDemoSession.ts`
- `apps/web/src/shared/lib/ensureDemoSession.ts`
- `apps/web/src/shared/lib/requestDemoSession.ts`
- `apps/admin/app/demo-bootstrap/DemoBootstrapClient.tsx`
- `apps/web/app/demo-bootstrap/DemoBootstrapClient.tsx`
- `apps/admin/src/shared/ui/DemoBanner.tsx`
- `apps/web/src/shared/ui/DemoBanner.tsx`
- admin/web cookies helper

주의:

- admin/web UI 컴포넌트 자체는 공유하지 않는다.
- 공용화는 문자열 상수와 renderless hook 수준까지만 검토한다.
- Bootstrap API의 `redirectTo`는 현재 client가 무시한다. API contract에서 제거하거나 client가 명시적으로 사용하도록 정리한다.

검증:

```bash
pnpm --filter @simple-cms/types typecheck
pnpm --filter @simple-cms/admin typecheck
pnpm --filter @simple-cms/web typecheck
```

권장 helper 테스트:

- `demoAdminApiPath('/api/demo/reset')`
- `stripDemoAdminBasePath('/_cms/admin/posts?page=2')`
- `demoBootstrapPath('/posts?page=2')`

## PR2: admin route scope wrapper 정리

목표: `requirePermission()` side effect 의존을 줄이고, 인증/권한/session scope/audit context를 route 진입점에서 일관 처리한다.

현 상태:

- `requirePermission()`와 `requireAnyPermission()`이 성공 후 `demo.enterWith()`를 호출한다.
- `defineRoute()`와 `defineBulkOperation()`은 `runWithUserDemoSession()`으로 handler 전체를 감싼다.
- 수동 route는 아직 side effect에 의존하는 경우가 많다.

권장 wrapper:

- `withAdminRouteScope()` - auth-only route용
- `withPermissionRoute(resource, action, handler)` - static permission용
- `withAnyPermissionRoute(checks, handler)` - OR permission용
- dynamic permission route는 별도 escape hatch 유지. 예: `apps/admin/app/api/preview/token/route.ts`

우선 이전 대상:

- `apps/admin/app/api/users/bulk-approve/route.ts`
- `apps/admin/app/api/users/bulk-reject/route.ts`
- `apps/admin/app/api/users/bulk-suspend/route.ts`
- `apps/admin/app/api/users/bulk-reactivate/route.ts`
- `apps/admin/app/api/users/bulk-role/route.ts`
- `apps/admin/app/api/subpage-feedback/export/route.ts`
- `apps/admin/app/api/home-popups/reorder/route.ts`
- `apps/admin/app/api/settings/domain/check-dns/route.ts`
- `apps/admin/app/api/profile/route.ts`
- `apps/admin/app/api/profile/change-password/route.ts`
- `apps/admin/app/api/preview/token/route.ts`

주의:

- `$transaction([...])`에 넘기는 PrismaPromise도 scope 안에서 생성되어야 한다.
- storage upload는 context가 있어야 sessionId prefix가 붙는다.
- `PreviewToken`은 demo extension 제외 모델이므로 `sessionId`를 직접 넣는 현재 정책 유지.
- snapshot export/import 계열은 `runWithBypass()` 기반이므로 일반 user session scope로 과하게 감싸지 않는다.

검증:

```bash
pnpm --filter @simple-cms/admin test -- src/shared/api/runWithUserDemoSession.test.ts
pnpm --filter @simple-cms/admin test -- src/entities/auth/lib/requirePermission.test.ts
pnpm --filter @simple-cms/admin test -- src/entities/auth/lib/requireAnyPermission.test.ts
pnpm --filter @simple-cms/admin typecheck
```

새 wrapper 단위 테스트 권장:

- DEMO_MODE=true에서 `demo.runWith({ sessionId })` 호출 확인
- permission 401/403 확인
- `requireAnyPermission` 경로 확인

## PR3: model registry와 snapshot UI 정합성

목표: snapshot/clone/cleanup/reset/UI 모델 목록 분산을 줄인다.

신규 파일 후보:

- `packages/db/src/demo/modelRegistry.ts`

포함 후보:

- `SNAPSHOT_MODEL_NAMES`
- `CLONE_MODEL_NAMES`
- `DEMO_ISOLATED_MODEL_NAMES`
- `CLEANUP_DELETE_ORDER`
- `SEED_RESET_DELETE_ORDER`
- `SNAPSHOT_EXCLUDED_MODEL_NAMES`

반영 대상:

- `packages/db/src/demo/snapshot.types.ts`
- `packages/db/src/demo/exportSnapshot.ts`
- `packages/db/src/demo/importSnapshot.ts`
- `packages/db/src/demo/cloneSeedToSession.ts`
- `packages/db/src/demo/cleanupSessions.ts`
- `packages/db/src/demo/resetSeedData.ts`
- `apps/admin/src/pages/site-settings/ui/DemoSnapshotPage.tsx`
- `apps/admin/src/features/site-settings/ui/DemoSnapshotForm.tsx`

최소 테스트:

- `Object.keys(snapshotModelsSchema.shape)`와 `SNAPSHOT_MODEL_NAMES` 일치
- 필요하면 `snapshotModelsSchema`를 테스트 전용 export 또는 helper로 노출
- cleanup delete order가 isolated model을 누락하지 않는지 확인
- seed reset delete order가 snapshot/clone 대상 자식→부모 순서를 지키는지 확인

검증:

```bash
pnpm --filter @simple-cms/db test
pnpm --filter @simple-cms/admin typecheck
```

## PR4: snapshot / clone / storage / CLI 모듈화

목표: 대형 파일을 책임 단위로 쪼개고, storage와 CLI ownership을 명확히 한다.

### PR4 시작 전 보완 완료 메모 (2026-06-12)

PR0~PR3 검토 후 PR4 진입 전에 아래 보완을 먼저 수행했다.

- `withAdminRouteScope` 계열 wrapper를 `apps/admin/src/shared/api/withAdminRouteScope.ts`에서 `apps/admin/src/entities/auth/lib/withAdminRouteScope.ts`로 이동했다.
  - 이유: shared → entities import 신규 FSD 위반 제거. 기존 `defineRoute`/`defineBulkOperation`/`runWithUserDemoSession`의 shared→entities 위반은 별도 레거시로 남아 있음.
  - PR4 이후 route wrapper를 추가/수정할 때는 새 위치(`entities/auth/lib/withAdminRouteScope`)를 사용한다.
- `POST /api/demo/bootstrap` 응답 contract에서 사용되지 않던 `redirectTo`를 제거했다. BootstrapClient는 기존처럼 URL의 `next` 파라미터에서 받은 `nextPath`로 이동한다.
- PR0 권장 회귀 테스트를 추가했다.
  - `apps/admin/src/shared/lib/getCurrentPathname.test.ts`: `x-pathname + x-search` 조합 확인
  - `apps/admin/app/api/auth/login/route.test.ts`: DEMO_MODE direct login API 403 확인
  - `apps/admin/app/api/auth/register/route.test.ts`: DEMO_MODE direct register API 403 확인

PR4 시작 시 주의할 남은 리스크:

- `node scripts/check-fsd.mjs`는 여전히 기존 위반으로 실패한다. 이번 보완으로 `withAdminRouteScope` 신규 위반은 제거됐지만, `defineRoute.ts`/`defineBulkOperation.ts`/`runWithUserDemoSession.ts`와 `site-layout` 관련 기존 위반은 남아 있다. PR4 범위에서 건드리지 않는다면 새 위반을 추가하지 않는지만 확인한다.
- `modelRegistry.ts`는 schema/UI/cleanup/reset 정합성을 개선했지만, `exportSnapshot.ts`, `importSnapshot.ts`, `cloneSeedToSession.ts`는 여전히 모델별 Prisma 작업을 하드코딩한다.
  - 특히 `exportSnapshot.ts`는 최종 payload에 `as SnapshotPayload`를 사용하므로 신규 snapshot 모델 누락을 타입이 막지 못한다.
  - PR4에서 `snapshot/idMaps.ts`, `snapshot/mediaUpload.ts`, `seedClone/idMaps.ts`, `seedClone/cloneSteps.ts`를 분리할 때 `SNAPSHOT_MODEL_NAMES`/`CLONE_MODEL_NAMES` coverage 테스트를 추가한다.
- `apps/admin/next.config.ts`와 `apps/web/next.config.ts`에는 `/_cms/admin` literal이 남아 있다. Next config에서 workspace package import 안정성을 판단한 뒤 PR4 또는 별도 cleanup에서 상수화한다. 지금은 runtime path helper drift가 더 중요한 문제였고, 런타임 호출부는 대부분 교체 완료됐다.
- `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md`에는 과거 16모델 snapshot 메모가 남아 있다. 현재 실행 계획과 코드 기준은 14모델 snapshot + AuditLog/ErrorLog 제외다. 문서 정합화는 PR4 후 결과에 맞춰 별도 정리한다.

PR4 진입 전 재검증 권장:

```bash
pnpm --filter @simple-cms/admin test -- src/entities/auth/lib/withAdminRouteScope.test.ts src/shared/lib/getCurrentPathname.test.ts app/api/auth/login/route.test.ts app/api/auth/register/route.test.ts
pnpm --filter @simple-cms/db test -- src/demo/modelRegistry.test.ts src/demo/snapshotWalker.test.ts
pnpm --filter @simple-cms/admin typecheck
```

우선순위 높은 분리:

- `packages/db/src/demo/snapshot/ensureDemoAdminSeed.ts`
- `importSnapshot.ts`의 `ensureDemoAdminSeed()` 분리
- `packages/db/src/demo/snapshot/idMaps.ts`
- snapshot import idMap 생성 분리
- `packages/db/src/demo/snapshot/mediaUpload.ts`
- Phase 1 media upload + URL map 분리
- `packages/db/src/demo/seedClone/idMaps.ts`
- clone idMap 생성 분리
- `packages/db/src/demo/seedClone/cloneSteps.ts`
- clone createMany 단계 분리

권한 상수 정리:

- `FULL_PERMISSIONS` / `DEMO_ADMIN_PERMISSIONS` 중복 제거 검토
- `packages/db`는 현재 `@simple-cms/types` 의존성이 없다.
- 선택지 1: `packages/db/package.json`에 `@simple-cms/types` workspace dependency 추가 후 `RESOURCE_ACTIONS` 기반 helper 사용
- 선택지 2: db 내부 helper를 만들고 `RESOURCE_ACTIONS`와 동기화 테스트 추가
- 더 명확한 선택은 `@simple-cms/types` dependency 추가 후 helper 단일화다.

Storage 정리:

- `apps/admin/src/shared/lib/storage/supabaseAdapter.ts`
- `resolveDemoStoragePrefix()` 또는 `getStorageIsolationPrefix()` 분리
- DEMO_MODE에서 authenticated upload인데 context가 `__PROD__`면 warning 또는 throw 검토
- `cleanupSessionFolder()` / `cleanupSeedFolder()` 중복을 내부 `cleanupFolder(prefix, options)`로 통합
- `packages/db/scripts/demo-import.ts`
- Supabase upload/cleanup inline 구현 제거
- adapter callback factory 또는 공용 storage helper 사용

CLI PrismaClient ownership:

- 현재 CLI는 자체 `PrismaClient`를 만들지만 core는 singleton `prisma`를 사용한다.
- 권장: core 함수에 optional client 주입.
- `exportSnapshot({ client, ... })`
- `importSnapshotToSeed(raw, { client, ... })`
- 단기 대안: CLI 자체 client 생성 제거, singleton만 사용하고 disconnect 정책 명시

검증:

```bash
pnpm --filter @simple-cms/db typecheck
pnpm --filter @simple-cms/db test -- src/demo
```

가능하면 `DEMO_TEST_DB_URL` 기반 integration smoke 추가:

- 최소 `__SEED__` row 삽입
- `cloneSeedToSession(visitorId)` 실행
- 14모델 count/FK remap 확인
- `demo.runWith({ sessionId: visitorId })`에서 visitor row만 보이는지 확인

## PR5: diagnostics 보호와 demo smoke E2E

목표: 진단 endpoint를 운영성 기능과 분리하고, 실제 배포 장애 유형을 E2E로 잡는다.

수정 대상:

- `apps/web/app/api/demo/session-diagnostics/route.ts`
- `apps/web/src/shared/lib/demoSessionDiagnostics.ts`
- `apps/web/src/shared/lib/demoSessionDiagnostics.test.ts`

정책:

- 유지한다면 다음 중 하나를 요구한다.
- `DEMO_SESSION_DEBUG=true`
- `Authorization: Bearer ${CRON_SECRET}`
- 위치도 가능하면 `shared/lib`보다 `shared/demo/diagnostics.ts` 같은 시연 전용 위치가 낫다.

Playwright demo smoke:

- 처음엔 CI 필수 job이 아니라 optional 또는 `workflow_dispatch`로 시작한다.
- 새 browser context로 `/` 접속
- `/demo-bootstrap` 경유 및 `session-token` cookie 생성 확인
- 메인 페이지가 visitor clone 데이터로 렌더되는지 확인
- `/_cms/admin/dashboard` 접속
- DemoBanner 노출 확인
- admin CRUD 하나 수행
- web 반영 확인
- reset 버튼으로 새 세션 시작 확인

검증:

```bash
pnpm e2e -- --project=web
pnpm e2e -- --project=admin
```

demo smoke는 별도 project 또는 grep tag로 opt-in 실행한다.

## 검증 명령 모음

기본:

```bash
pnpm --filter @simple-cms/types typecheck
pnpm --filter @simple-cms/db typecheck
pnpm --filter @simple-cms/admin typecheck
pnpm --filter @simple-cms/web typecheck
```

demo 핵심 테스트:

```bash
pnpm --filter @simple-cms/db test -- src/demo/clientExtension.test.ts
pnpm --filter @simple-cms/db test -- src/demo/sessionContext.test.ts
pnpm --filter @simple-cms/db test -- src/demo/snapshotWalker.test.ts
pnpm --filter @simple-cms/db test -- src/demo/snapshot.types.test.ts
pnpm --filter @simple-cms/db test -- src/demo/cleanupSessions.test.ts
```

admin route scope 테스트:

```bash
pnpm --filter @simple-cms/admin test -- src/shared/api/runWithUserDemoSession.test.ts
pnpm --filter @simple-cms/admin test -- src/entities/auth/lib/requirePermission.test.ts
pnpm --filter @simple-cms/admin test -- src/entities/auth/lib/requireAnyPermission.test.ts
```

빌드 검증:

```bash
pnpm --filter @simple-cms/admin lint
pnpm --filter @simple-cms/web lint
pnpm --filter @simple-cms/admin build
pnpm --filter @simple-cms/web build
```

주의:

- 과거 로컬에서 pnpm이 `[ERROR] unable to open database file`로 실패한 기록이 있다.
- 그 경우 각 package 디렉토리에서 직접 바이너리 실행으로 fallback 가능하다.

예시:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/next build
../../node_modules/.bin/vitest run src/demo/snapshotWalker.test.ts
```

## 다음 컨텍스트 요청 문구

다음 컨텍스트에서는 아래처럼 요청하면 된다.

```text
docs/codex/memory/project_demo_mode_modularization_execution_plan.md 메모리를 읽고 시연 모드 정리 작업을 PR0부터 진행해줘. 먼저 git status를 확인하고, 관련 현재 코드가 메모와 달라진 부분이 없는지 빠르게 재확인한 뒤 구현해줘.
```

더 짧게 요청하려면 아래 문구도 가능하다.

```text
시연 모드 모듈화 실행 계획 메모리(project_demo_mode_modularization_execution_plan.md)를 기준으로 PR0부터 진행해줘.
```

## 다음 컨텍스트 시작 순서

1. `git status --short`
2. `docs/codex/memory/project_demo_mode_modularization_execution_plan.md` 읽기
3. `docs/codex/memory/project_demo_mode_modularization_plan.md` 읽기
4. `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md` 읽기
5. PR0 범위만 먼저 구현
6. PR0 검증 후 PR1로 이동
7. 각 PR은 작게 커밋 가능한 단위로 유지
