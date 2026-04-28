# Stage 12 — 테스트 커버리지 보강 (12a~12j)

Stage 11까지 구축된 테스트 인프라(2-track Vitest + Storybook play + Playwright E2E) 위에 실제 테스트 자산을 확보해 회귀 방지력을 갖추는 단계.

---

## 12a — 보안 순수 로직 unit

**대상**: `sanitizeCustomHtml`, `hashIp`/`extractIp`, `isIframeHostAllowed`, `normalizeIframeEmbedUrl`, `scopeCustomCss`, `validateFileUpload`

**산출물**:
- `apps/web/src/shared/lib/renderContent.test.ts` — DOMPurify `<script>` / `on*` / `javascript:` 제거, 비허용 iframe 호스트 차단
- `apps/web/src/shared/lib/feedbackIp.ts` + `.test.ts` — `hashIp`/`extractIp` 추출 후 unit (IPv4/IPv6/x-forwarded-for 체인)
- `packages/types/src/block.types.test.ts` — `isIframeHostAllowed` 화이트리스트 매칭 + 서브도메인
- `apps/admin/src/features/block-management/lib/normalizeIframeEmbedUrl.test.ts` — YouTube watch→embed, Vimeo, Naver TV 변환 + 비허용 거부
- `apps/web/src/shared/lib/scopeCustomCss.test.ts` — `#subpage-{id}` prefix, html/body/:root 치환, @keyframes/@font-face 보존. 알려진 한계(`:is()`/`:has()`/nesting)는 `describe('known limitations')` 명시
- `packages/db/src/uploadRestriction.test.ts` — 확장자+MIME 이중 검증, 경로 traversal, 0byte/max size 경계

---

## 12b — RBAC + 인증 분기

**대상**: `hasPermission`, `requirePermission`, `getVisibleMenuItems`, `e2e/admin/auth.spec.ts`

**산출물**:
- `apps/admin/src/entities/auth/lib/checkPermission.test.ts` — `isSystem` 바이패스, 빈 permissions, resource 미정의
- `apps/admin/src/entities/auth/lib/requirePermission.test.ts` — 미인증 401, 비인가 403, 통과
- `apps/admin/src/shared/lib/sidebarPermissions.test.ts` — read 권한 없는 메뉴 숨김, isSystem 전체 표시
- `e2e/admin/auth.spec.ts` 보강 — PENDING 로그인 차단, SUSPENDED 세션 무효화, 동시 로그인 정책 2분기

---

## 12c — 데이터 무결성 + kstDate 버그 fix

**대상**: `findMediaReferences`, `errorLog.ts`, `kstDate.ts`

**산출물**:
- `apps/admin/src/features/media-management/lib/findMediaReferences.test.ts` — 8개 참조 경로 pure 부분 unit
- `packages/db/src/errorLog.test.ts` — `computeErrorFingerprint`/`normalizeMessage`/`normalizeUrl` UUID·숫자 정규화
- `fix(kstDate):` commit — `toISOString().slice(0,10)` (UTC 절단) → `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date)` 교체. 영향 범위: audit-logs export, subpage-feedback 통계
- `apps/admin/src/shared/lib/kstDate.test.ts` — KST 자정 경계, UTC→KST 일자 매핑

---

## 12d — 콘텐츠 무결성

**대상**: `recalculateSubpageContent`, `subpageVersion.ts` (pure 부분)

**산출물**:
- `apps/admin/src/shared/lib/blockContentRecalculation.test.ts` — RICH_TEXT 블록 displayOrder 정렬, 빈 블록, 다른 블록 타입 skip
- `packages/db/src/subpageVersion.test.ts` — `findDanglingMediaIds`, `enforceRetention` 30개 보존 정책 pure 부분
- `apps/admin/src/features/subpage-management/lib/subpageVersionHelpers.test.ts` — `summarizeBlockDiff`, `parseVersionLabel`

---

## 12e — Block UI 회귀 (Storybook play)

**대상**: `BlockEditDialog.tsx`, `BlockManager.tsx`, `SortableBlockCard.tsx`

**산출물**:
- `BlockEditDialog.stories.tsx` play 보강 — HTML(Tabs+Monaco), IMAGE(3분기), IFRAME(호스트 거부 토스트, normalizeEmbedUrl 변환)
- `BlockManager.stories.tsx` play — dnd-kit 키보드 재정렬(Tab/Space/Arrow), axe 위반 0

---

## 12f — 메인 + 네비 + 일괄작업 (Storybook play)

**대상**: `SectionEditDialog.tsx`, `BulkDelete/Status/MoveDialog`, `MenuItemTree.tsx`

**산출물**:
- `SectionEditDialog.stories.tsx` — HERO/RECOMMENDED/CTA/SHORTCUT/NOTICE 5종 분기 케이스
- `BulkPostDialog.stories.tsx`, `BulkSubpageDialog.stories.tsx` — 0/1/N 선택, 200건 상한 가드
- `MenuItemTree.stories.tsx` — dnd-kit 3depth 제약, slot(HEADER/FOOTER/SIDEBAR) 배정

---

## 12g — RBAC UI (Storybook play)

**대상**: `UserActionButtons`, `PermissionMatrix`, `AppSidebar`/`SidebarNavContent`

**산출물**:
- `UserActionButtons.stories.tsx` — PENDING 승인/거절, ACTIVE 정지, 자기 자신 차단, 마지막 관리자 가드
- `PermissionMatrix.stories.tsx` — 시스템 역할 수정 불가, 매트릭스 토글, 기본 역할 단일 강제
- `AppSidebar.stories.tsx` — Owner/Editor/Viewer 3 케이스 메뉴 노출 매트릭스

---

## 12h — 미디어 + 브랜딩 + Settings (play + E2E)

**대상**: `MediaPicker`, `MediaGrid`, 사이트 설정 폼 4종, branding MIME 화이트리스트

**산출물**:
- `MediaPicker.stories.tsx` play — 필터, 페이지네이션, 선택, 업로드, 상세, 일괄 삭제. `acceptMimeTypes` disabled+Tooltip
- Settings 폼 play — `DomainSettingsForm`, `SecuritySettingsForm`, `UploadSettingsForm`, `SeoSettingsForm` validation + DirtyGuard
- `e2e/admin/branding.spec.ts` — favicon에 SVG 업로드 → 400 차단 / PNG → 201 허용 (cleanup 포함)

---

## 12i — P1 일괄 (unit + play)

**대상**: `extractTextFromTiptap`, `generateSlug`, `searchContent`, `getAuditContext` / admin·web 다수 stories

**산출물**:
- `packages/editor/src/extractText.test.ts` — 텍스트 노드, 중첩, 빈 doc, 다양한 노드 타입
- `packages/editor/src/generateSlug.test.ts` — 한글, 영문, 특수문자, 빈 문자열 케이스
- `packages/db/src/search.test.ts` — 200자 trim, 페이지 계산 pure 부분
- `apps/admin/src/shared/lib/auditHelpers.test.ts` — `getAuditContext` x-forwarded-for 첫 IP 추출
- admin play: `BoardForm`, `PopupForm`, `AuditLogFilters`/`Table`/`DetailDialog`, error-log, `FeedbackTimelineChart`/`FeedbackPositiveReasonsChart`/`FeedbackBySubpageTable`/`FeedbackFilters`/`FeedbackExport`
- web play: `HeaderBranding` (WithLogo/WithText/WithBoth), `Hero`~`LatestPosts` 섹션 6종 + `HomeSections`, `SearchPage`+`SearchForm`, `ErrorBoundary`, `PreviewBanner`

**HeaderBranding 특이사항**: `alt=""` 이미지는 ARIA `role="presentation"` → `getByRole('img')` 대신 `querySelector('img')` 사용.

---

## 12j — CI E2E job + RBAC 매트릭스 E2E

**대상**: `.github/workflows/ci.yml`, `e2e/admin/rbac-matrix.spec.ts`, `tsconfig.json`

**산출물**:
- `.github/workflows/ci.yml` — `workflow_dispatch(run_e2e: boolean)` 트리거 + E2E job (postgres `groonga/pgroonga` service, `pnpm db:generate+push+pgroonga+seed`, admin+web 빌드/기동, `wait-on`, `pnpm e2e`, artifact upload). E2E는 수동 또는 `CI_E2E=true` 변수일 때만 실행.
- `e2e/admin/rbac-matrix.spec.ts` — Owner(isSystem)/Editor(default)/Viewer(custom 읽기 전용) × 대표 5개 리소스(subpages/posts/media/users/settings):
  - 사이드바 메뉴 노출 여부 3케이스
  - API 접근 허가(200) · 차단(403) 2케이스
  - `beforeAll`: admin login → viewer role 생성 → test user 2명 등록/승인/역할 배정 → BrowserContext 3개 생성 + 각 로그인
  - `afterAll`: viewer user 기본 역할 복원 → viewer role 삭제 (try-catch, 비차단)
- `tsconfig.json` (루트) — Playwright E2E TypeScript 컴파일 설정 (`playwright.config.ts` + `e2e/**/*.ts`)

**Coverage threshold**: `@vitest/coverage-v8` 이미 설치됨. 임계값은 베이스라인 측정 후 결정 (측정 전 박지 않음). 측정 명령: `pnpm --filter @simple-cms/admin test -- --coverage`.

---

## 결과 요약

| 트랙 | 추가된 테스트 수 (근사) |
| ---- | ---- |
| Vitest unit | ~50+ it (12a~12d·12i) |
| Storybook play | ~50+케이스 (12e~12i) |
| Playwright E2E | +8~10 시나리오 (12b·12h·12j) |

Stage 12 완료 시점에서 76개 API Route 핸들러 분기는 여전히 E2E 전담이지만, 보안/RBAC/데이터 무결성 핵심 pure 함수와 핵심 UI 컴포넌트 모두 회귀 방어망 확보됨.
