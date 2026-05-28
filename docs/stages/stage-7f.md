# Stage 7f — Storybook + Vitest 2-track 테스트 인프라 shell (admin/web 동시)

Stage 8(Docker/CI) 선행 기반으로 Storybook + Vitest 2-track 테스트 인프라 도입. 이번 Stage는 **shell 단계**만 담당 — 초기 story 확장·play function·CI matrix·KRDS showcase·MSW는 Stage 7g로 분리 (이전 Stage(7a~7e) 평균 규모 유지 + 점진적 접근).

- **버전 선택**: Storybook v10 + Vitest v4. `@storybook/nextjs-vite`가 v9부터 stable 승격(이전 `@storybook/experimental-nextjs-vite` 폐기). Vitest v4는 `playwright()` factory function API (문자열 `'playwright'` deprecated)
- **루트 의존성 정합성 복구**: `vitest@^3.2.4` → `^4`로 승격 (기존 `@vitest/coverage-v8@^4.1.4`와 메이저 정렬). `@vitest/browser-playwright`, `playwright@^1.50` 신규. 기존 테스트 파일 0개라 마이그레이션 리스크 없음
- **공유 config**: `packages/config/vitest/{base.js,browser.js}` — `unitProjectDefaults`(jsdom/globals/include/exclude), `browserDefaults`(chromium/headless/instances), `coverageDefaults`(v8/include/exclude). 각 앱의 `vitest.config.ts`에서 spread로 사용. **왜 `.js`?** 최초 `.ts`로 작성했으나 vitest config loader가 workspace 경로의 `.ts` 파일을 ESM transform 없이 로드 시도하여 `SyntaxError: Unexpected identifier 'as'`로 실패. 순수 값 export만이라 `.js`로 전환해도 타입 손실 미미
- **각 앱 독립 `.storybook/`**: admin(shadcn) vs web(KRDS) UI 시스템이 달라 `.storybook/`를 공유하지 않음. `@storybook/nextjs-vite` framework로 Vite 기반 빌드 (프로덕션은 Turbopack 그대로)
- **admin Provider 2계층 decorator** (`apps/admin/.storybook/preview.tsx`): 실제 layout 구조 재현
  - **Root decorator (모든 story 기본)**: `ThemeProvider → QueryClient(스토리 스코프 · retry:false) → TooltipProvider + Toaster` — `app/layout.tsx` 재현
  - **Authenticated decorator (opt-in)**: `parameters.authenticated === true` 일 때만 `PermissionProvider + SidebarProvider(defaultOpen)` 래핑. `parameters.permissions`(PermissionMap override), `parameters.isSystem`(총괄 관리자 모드) 지원. 기본값은 `RESOURCE_ACTIONS` 기반 full-access permissions 자동 생성
  - LoginForm/RegisterForm 같은 비인증 컴포넌트는 root-only, 운영 화면은 `parameters.authenticated: true` 선언
- **web preview (`apps/web/.storybook/preview.tsx`)**: 전역 Provider 없음(Server Component 중심). CSS import 순서 엄수 — `krds-react/dist/index.css` → `../app/globals.css` (layout.tsx 재현, `@layer krds-base` override 순서 유지)
- **Pretendard CDN**: web의 `.storybook/preview-head.html`에 `<link rel="stylesheet">` 삽입 (layout.tsx 동일 포맷). 다음 Stage의 swiper 22M 회귀 테스트가 "Pretendard async load race" 조건을 재현해야 하므로 필수
- **Vitest 2-track projects**: `unit`(jsdom, `src/**/*.test.{ts,tsx}`) + `storybook`(Playwright Chromium browser mode, `*.stories.tsx`의 play function). `mergeConfig(viteConfig, ...)` 패턴으로 `vite.config.ts`의 alias/plugin 재사용. `storybookTest({ configDir })` plugin으로 Storybook 연결
- **샘플 story 3개 smoke**: `Admin/Shadcn/Button`(5 variants) + `Admin/Features/Auth/LoginForm`(smoke) + `Web/Shared/Carousel`(3 slides, dots + prev/next + autoplay 변형). play function 없음 — Stage 7g에서 validation/interaction/회귀 테스트 추가
- **turbo.json**: `storybook`(persistent/cache false) + `build-storybook`(outputs `storybook-static/**`) 태스크 신규. `test` 태스크의 `dependsOn: ["^build"]`는 이번 Stage 그대로 유지 — Stage 7g CI 도입 시 정리
- **Stage 7g 범위**: 초기 story 21개 확장(admin shadcn 외 + LoginForm/SubpageForm/CreateRoleDialog/BlockEditDialog/ConfirmLeaveDialog/BulkActionBar/PostForm/ImageUrlInput/AdminHeader + web SubpageBlockRenderer/HomePopupModal/RightSidebar/KoglFooter + KRDS 7개 — Header/Footer/SideNavigation/Pagination/Breadcrumb/Masthead/SkipLink), play function 6건(폼 validation, dirty guard, 권한별 UI 토글, BlockEditDialog 타입 전환), MSW mutation 시나리오, swiper 22M 회귀 테스트(readyState='loading' 시뮬레이션 + Carousel 테스트 프로브), GitHub Actions matrix(admin/web 병렬), `turbo test` dependsOn 재정리
- **Authenticated decorator 검증 미완**: 이번 Stage의 샘플 story 2개(Button/LoginForm)는 모두 root-only라 `parameters.authenticated=true` 경로는 컴파일만 됐을 뿐 실제 실행은 안 됨. Stage 7g의 첫 작업은 CreateRoleDialog 같은 authenticated story를 작성하여 `PermissionProvider + SidebarProvider` 래핑 실동작 검증
- 상세 계획: [`C:/Users/ddock/local plan files/stage-7f-peppy-garden.md`](../../../Users/ddock/local plan files/stage-7f-peppy-garden.md)
