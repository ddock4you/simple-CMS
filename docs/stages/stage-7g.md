# Stage 7g — Storybook story 확장 (admin + web + KRDS showcase 19개 smoke)

Stage 7f shell(샘플 story 3개)을 19개 추가한 **볼륨 확장 단계**. 원안의 "story + play function + MSW + CI" 묶음은 너무 커서 사용자 "점진적 접근" 메모리에 맞춰 3분할 — 7g는 smoke만, play function/MSW/swiper 회귀는 7h, CI는 7i로 분리.

- **admin 추가 8개**: `Admin/Features/{Role/CreateRoleDialog, Subpage/SubpageForm, Post/PostForm, Block/BlockEditDialog}` + `Admin/Shared/{ConfirmLeaveDialog, BulkActionBar, Layout/AdminHeader}` + `Admin/Entities/Media/ImageUrlInput`
- **web 추가 4개**: `Web/Widgets/{SubpageBlockRenderer, HomePopupModal, RightSidebar, KoglFooter}`
- **KRDS showcase 7개** (advisor 지적으로 SkipLink 추가 · RightSidebar는 커스텀 JSX이므로 Widgets로 분류): `apps/web/src/shared/ui/krds-showcase/{Header, Footer, SideNavigation, Pagination, Breadcrumb, Masthead, SkipLink}.stories.tsx` — 런타임 import 없는 story 전용 디렉토리
- **BlockEditDialog는 type별 4 variants**: `CreateRichText / CreateHtml / CreateImage / CreateIframe` — 부모가 `key` prop으로 리마운트시키는 패턴이라 한 story에서 타입 전환 불가 (advisor 지적 반영)
- **`storybook/test` import 경로 관례 정립**: Storybook v10 core 패키지에 `expect/fn/userEvent/within`이 포함되어 `@storybook/test` 별도 devDep 불필요. 이번 Stage는 smoke만이지만 `fn` 샘플 import로 Stage 7h 참고점 마련(ConfirmLeaveDialog/BlockEditDialog/ImageUrlInput 등)
- **authenticated decorator 실행 검증**: CreateRoleDialog.stories에 `parameters.authenticated: true` 부여해 `PermissionProvider + SidebarProvider` 래핑 경로가 처음으로 실제 실행됨 (7f 미완 leg 해소)
- **web preview에 `nextjs.appDirectory: true` 전역 parameter 추가**: RightSidebar가 `usePathname()` 사용하는 Client Component라 `@storybook/nextjs-vite`의 App Router mock이 필요. admin preview와 동일한 설정으로 정렬
- **Storybook addon-vitest dep cache 이슈 경험**: story 대량 추가 직후 첫 실행에서 `TypeError: Failed to fetch dynamically imported module: .../sb-vitest/deps/@storybook_react-dom-shim.js?v=...` 발생. **해결**: `rm -rf node_modules/.cache/storybook node_modules/.vite` 후 재실행으로 정상. Stage 7h 의존성 추가 시 참고할 cleanup 절차
- **검증**: admin 10 files / 28 tests passed (43.53s), web 12 files / 30 tests passed (24.91s). `pnpm test` 루트 기준 **총 58 tests 통과**. `build-storybook` 양쪽 성공 (admin iframe 번들 1.38MB / gzip 394KB, web 유사)
- **Stage 7g에서 하지 않은 것** (7h/7i로 이연): play function 상호작용 테스트 6건, MSW 도입, Swiper 22M 회귀 테스트, GitHub Actions CI matrix, `turbo test` dependsOn/outputs 정리, Storybook UI "Run tests" 30초 timeout 해소
- **MSW 도입 타당성 분석** (7h 참고): `useReorderBlocks`/`useReorderHomeSections`의 rollback 경로 + CreateRoleDialog submit 성공/실패 분기 + 에러 응답 기반 UI 전환은 MSW 필수. 폼 validation/useDirtyGuard/권한 토글/slug 자동생성/BlockEditDialog 타입 쉘은 MSW 없이도 `fn()` spy로 가능. 방식 권장: `msw-storybook-addon` + handler 3~4개 축소 도입

## Stage 7g 후속 마이너 수정 (커밋 전 반영)

7g 본 범위 외에 Storybook 확인 과정에서 발견된 3건을 같은 커밋에 묶어 정리:

- **`turbo test` outputs 경고 해소**: `pnpm test` 실행 시 `WARNING no output files found for task @simple-cms/{admin,web}#test. Please check your outputs key in turbo.json` 반복 출력. 원인은 `turbo.json`의 `test.outputs: ["coverage/**"]`인데 현재 `pnpm test`는 `--coverage` 없이 실행되어 coverage 폴더 자체가 생성되지 않기 때문. **해결**: `test`에서 `outputs` 제거, `test:coverage` 별도 태스크로 분리해 outputs 선언 이관. Stage 7i에서 처리 예정이던 항목의 절반을 선반영한 셈
- **SubpageBlockRenderer story의 RichTextOnly/HtmlOnly 시각 확인 개선**: Mixed variant는 IMAGE/IFRAME이 크게 렌더되어 눈에 띄지만, 단독 RICH_TEXT/HTML 블록은 텍스트 몇 줄이 Canvas 좌상단에 작게 붙어 "렌더 실패로 오인"되는 증상. `layout: 'padded'`만으론 실사용처(`<article id="subpage-{id}"> + .subpage-blocks`) 맥락이 재현되지 않음이 원인. **해결**: `meta.decorators`에 dashed border + max-width 820px + min-height 160px wrapper 추가해 실사용처 맥락을 story 레벨에서 재현. 렌더 결과가 비면 wrapper만 보이므로 "정말 비어있는지" vs "묻혀 있는지" 구분 쉬움
- **KoglFooter Type2/Type3 누락 보완**: `CclType`은 `TYPE_0 ~ TYPE_4` 5단계인데 기존 story는 Type0/1/4 + WithAI/Hidden 5개로 Type2/Type3이 빠짐. 에셋(`apps/web/public/assets/kogl/kogl-type-2.png`/`-3.png`)은 이미 7d에서 배치돼 있어 variant 2개 추가만으로 해결. 결과: web 12 files / **32 tests**(기존 30 → +2)

이 수정으로 `pnpm test` 루트 **총 60 tests 통과**(admin 28 + web 32), turbo 경고 메시지 0건.

## Stage 7h에 추가된 범위 (2026-04-22 결정)

기존 7h 계획(play function + MSW + swiper 회귀)에 **프로젝트 커스텀 래퍼 showcase**를 더함:

- **대상 후보**:
  - `Admin/Shared/Dialog` + `Admin/Shared/AlertDialog` — shadcn 공용 래퍼의 Stage 7d 규약 시연 (`disablePointerDismissal`, 중첩 Dialog `data-nested-dialog-open` 블러 효과, AlertDialog v1.3.0 자동 차단)
  - `Admin/Shared/InlineStatusToggle` / `InlineBooleanToggle` — Stage 7c 공용 인라인 토글 (권한 없을 때 Badge fallback 시연)
  - `Admin/Shared/LinkTargetInput` — Stage 5b 도입 (당시엔 popup-management 전용이었고 section 쪽은 raw URL Input 사용). Stage 7i에서 `entities/link-target`로 승격하면서 home-management 5개 fields(Cta/Hero/Recommended/Shortcut/Notice)에도 적용 → 실제 양쪽 재사용 완성. showcase title은 `Admin/Entities/LinkTarget/LinkTargetInput`
- **왜 full shadcn showcase가 아닌 커스텀 래퍼만인가**: shadcn은 `shared/ui/shadcn/`에 **복사된 프로젝트 코드**라 외부 라이브러리가 아님. ui.shadcn.com 공식 docs가 모든 variant의 예제를 매우 상세히 제공 → 전체 포팅은 정보 중복 + 관리 부담. 반면 프로젝트 고유 커스텀(중첩 Dialog 블러, inline 권한 fallback 등)은 외부 문서에 없는 자체 규약이라 showcase 가치 명확
- **KRDS showcase(web)와 성격 차이**: KRDS는 "외부 라이브러리 variant를 프로젝트가 쓰는 조합만으로 재구성" ↔ admin 커스텀 래퍼는 "프로젝트 자체 UX 규약 문서화". 용도 분리되어 sidebar 카테고리 `Admin/Shared/*`로 자연 배치

(위 커스텀 래퍼 showcase는 Stage 7h 작업 중 7i로 재이관 — 아래 "Stage 7h 결과 요약" 참조)
