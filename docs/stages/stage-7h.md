# Stage 7h — play function 5건 (MSW 무의존 범위) + hook 검증 probe 패턴 정립

Stage 7g smoke 표면 위에 **상호작용(play function) 검증 레이어**를 얹는 단계. 원 계획(play function 6건 + MSW 3 handler + swiper 22M 회귀 + admin 커스텀 래퍼 showcase 4개)은 MSW 호환성 실패로 **5건 play function + hook 검증 probe 패턴**으로 축소.

- **MSW 통합 실패 → Stage 후보 이관**: 3번 시도 모두 실패.
  - (1) 전역 `initialize()` + `mswLoader` + per-story handlers → `Test Files 0 passed` 169초+ stuck
  - (2) MSW story에 `tags: ['!test']` 추가 → 여전히 stuck (preview.tsx `initialize()`가 모든 story 로드에 영향)
  - (3) `navigator.webdriver === true` 런타임 분기로 `initialize()` skip → `Failed to connect to the browser session` 131초 + 실패 (module transform에서 `msw-storybook-addon` import 자체가 Playwright Chromium 세션 확립 block)
  - 결론: `msw-storybook-addon` v2.0.7 + `@storybook/addon-vitest` v10 browser mode(Playwright) 조합 자체가 현재 호환 불가. 단순 devDep 존재만으로도 addon-vitest backend가 block되는 것까지 확인. msw+msw-storybook-addon devDep, `public/mockServiceWorker.js`, `apps/admin/src/mocks/handlers.ts` 모두 **완전 제거** 후 Stage 7g 상태로 복원. Stage 7j에서 msw-storybook-addon v2.1+/Node용 setupServer 이중 세팅 방식 재조사 후 재도입 계획
- **play function 5건 (위험도 순 · advisor 권고 반영)** — `storybook/test` v10 core의 `expect`/`userEvent`/`within`/`fn` 활용:
  1. **LoginForm `ValidationEmpty`**: 빈 submit → `'아이디를 입력해주세요.'` / `'비밀번호를 입력해주세요.'` 두 Zod 에러 메시지 `findByText` assert
  2. **PermissionProvider `FullAccess` / `ReadOnly` / `SystemAdmin`**: 신규 `PermissionProvider.stories.tsx` + inline `PermissionProbe` 컴포넌트 — `usePermission('subpages', 'read|delete')` + `usePermission('roles', 'create')` 3 probe를 `data-testid` 노출 → `parameters.permissions` override + `parameters.isSystem` 조합에 따른 ALLOWED/DENIED 매트릭스 검증. `isSystem: true`가 permissions 비어있어도 모두 true 반환하는 bypass 회귀 방어
  3. **DirtyGuardProbe `DirtyTriggersDialog`**: 신규 `apps/admin/src/shared/lib/DirtyGuardProbe.stories.tsx` + 전용 probe (form field + `<a href="/dashboard">` 내부 origin 링크) — `isDirty=true` 상태에서 링크 click → ConfirmLeaveDialog의 `'저장하지 않은 변경사항이 있습니다'` 타이틀 + `'머무르기'` / `'나가기'` 버튼이 body portal에 렌더되는지 `findByText` + `findByRole` assert
  4. **SubpageForm `Empty` play 추가**: cclType=null → AI 체크박스 `toBeDisabled()` → `'제1유형'` 라디오 click → `not.toBeDisabled()` 전환 검증. Zod `superRefine`의 "null + true 조합 차단" 전제가 UI에서 먼저 강제되는지 회귀 방어
  5. **BlockEditDialog `CreateIframeInvalidUrl`**: 신규 variant + play — 비허용 호스트(`https://example.com/video/xyz`) 입력 → 저장 → `normalizeIframeEmbedUrl` null 반환 → `'임베드 가능한 URL이 아닙니다'` sonner toast assert. mutation은 early return으로 호출되지 않아 `useCreateBlock`의 fetch 경로와 무관하게 안전
- **Hook 검증 probe 컴포넌트 패턴 정립**: `PermissionProbe` / `DirtyGuardProbe` 두 케이스로 규약 확정 — 훅이 단독으로 검증 대상일 때 전용 probe 컴포넌트를 story 파일 내부(또는 동일 디렉토리 `*Probe.stories.tsx`)에 inline 정의해 hook 반환값을 `data-testid` 또는 Dialog 등으로 DOM 노출. Meta의 `component`는 probe로 설정하되 title은 원본 훅/Provider의 위치(`Admin/Entities/Auth/PermissionProvider`, `Admin/Shared/DirtyGuardProbe`)로 두어 sidebar 탐색 용이
- **Canvas iframe 환경 주의점 정착**: Dialog/toast는 body portal에 렌더되므로 `within(canvasElement)` 범위로는 탐색 불가 → `within(document.body)` 사용 관례. 또한 `useDirtyGuard`의 same-path 필터 조건(`url.pathname === window.location.pathname` early return) 때문에 probe 링크는 **실제 다른 pathname**(`/dashboard`)을 써야 가드 트리거 가능 — `href="#target"` fragment-only는 같은 pathname이라 skip됨을 구현 중 발견. 추후 유사 probe 작성 시 참고
- **검증**: admin 12 files / **35 tests passed** (28 → +7). 신규 story 파일 2개(PermissionProvider.stories.tsx / DirtyGuardProbe.stories.tsx) + 기존 3개 story 수정(LoginForm/SubpageForm/BlockEditDialog)
- **Stage 7h에서 이관된 것**:
  - Swiper 22M 회귀 자동 감지(Carousel 테스트 프로브 + viewport resize) → 7i
  - 프로젝트 커스텀 래퍼 showcase 4개(Dialog/AlertDialog/InlineStatusToggle/InlineBooleanToggle/LinkTargetInput) → 7i
  - CreateRoleDialog submit 성공/실패 분기 + reorder rollback(MSW 필수) → 7j의 MSW 재조사 후 추가
  - GitHub Actions CI matrix / turbo `test.dependsOn: ['^build']` 제거 / addon-vitest 30초 timeout 해소 → 7j
