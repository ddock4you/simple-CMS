# Stage 7i — Swiper 22M 회귀 자동 감지 + LinkTargetInput 승격·적용 + 커스텀 래퍼 showcase 5개

Stage 7h에서 이관된 "Swiper 22M 회귀 자동 감지"와 "커스텀 래퍼 showcase"를 처리하고, 사용자 결정에 따라 범위를 **LinkTargetInput의 popup→entities 승격 + home-management 5개 fields 실제 적용**까지 확장. advisor의 "container resize 방식" 제안을 수용해 22M 회귀 감지기의 실효성을 확보.

- **Swiper 22M 회귀 자동 감지 — container resize 방식**: `Web/Shared/Carousel > Regression22M` play function이 `canvasElement.querySelector('.krds-carousel')`의 `style.width`를 400px→800px로 두 번 변경해 **`ResizeObserver` 경로를 강제 트리거**한 뒤 `.swiper-slide`의 `style.width`가 `> 0 && < 2000`인지 assert. `window.resizeTo`는 Playwright Chromium headless에서 동작하지 않으므로 채택 안 함. **진짜 회귀 감지**: Stage 7e 버그는 Pretendard CDN + KRDS Header async layout shift race condition에 의존했는데 Storybook 환경에선 timing이 안정적이라 단순 mount만으론 재현 불가 — container resize로 3층 defensive triggers 중 최소 하나(ResizeObserver.observe)를 실제로 밟아야 회귀 감지기 역할 충족 (advisor 피드백). Carousel.tsx 컴포넌트는 변경 없음, 기존 `containerRef`/`swiperRef`는 internal 유지
- **LinkTargetInput 승격 (popup-management → entities/link-target)**: CLAUDE.md Stage 5b가 "popup/section 양쪽 재사용"을 의도했으나 section은 raw `<Input register('items.X.url')>` 자유 입력만 쓰던 상태였음. Stage 7i에서 실제로 양쪽 재사용 구조 완성:
  - 컴포넌트: `apps/admin/src/features/popup-management/ui/LinkTargetInput.tsx` → `apps/admin/src/entities/link-target/ui/LinkTargetInput.tsx` (FSD 규칙: features 간 import 금지 → entities가 정답)
  - 쿼리: `homePopupReferencesOptions` → `linkTargetReferencesOptions` (이름 변경 + `apps/admin/src/entities/link-target/api/linkTargetReferencesQueries.ts`로 이동)
  - API endpoint `/api/home-popups/references`는 **그대로 유지** (경로 rename은 별도 작업 — entities가 fetch URL string에 의존하는 건 FSD 위반 아님)
  - `shared/api/queryKeys.ts`: `popupKeys.references()` 제거 + `linkTargetKeys = { all: ['link-target'], references: () => ... }` 신규
  - popup-management 호출자 4곳 import 경로 수정: PopupContentFields, PopupImageFields, PopupEditPage.prefetch, popupQueries/popupFetchers 정리
- **home-management 5개 fields 적용**: 모두 react-hook-form `Controller` pattern:
  - **CtaFields.tsx**: 단일 `buttonUrl` (Zod `urlString` min(1) 필수) → `allowNone={false}`. 호출자 `CtaSectionForm.tsx`에 `control={form.control}` prop 추가
  - **HeroFields.tsx**: `slides[].url` (optionalUrlString, nullable) → default `allowNone=true`. slide 카드 높이 약 80~120px 증가 × 최대 10개 (운영자 수용)
  - **RecommendedFields.tsx**: `items[].url` 동일 패턴. 최대 12개
  - **ShortcutFields.tsx**: `items[].url` (Zod `urlString` min(1) 필수) → `allowNone={false}`. 최대 8개
  - **NoticeFields.tsx**: `items[].url` (nullable optional) → default allowNone=true, `field.value ?? ''` 정규화. 최대 5개
- **`allowNone?: boolean` prop 추가** (LinkTargetInput): url이 필수인 호출자가 NONE 옵션을 select에서 hide하기 위한 신규 prop. default true. false일 때 빈 value 진입 시 EXTERNAL 모드가 default 활성, NONE 옵션은 kindOptions 배열에서 제외
- **기존 저장된 URL과의 호환성**: LinkTargetInput의 초기값 파싱 `useEffect`가 `/p/{slug}`, `/board/{slug}` 정규식만 매칭하고 나머지는 **자동 EXTERNAL 탭 폴백** + 원본 url 보존. DB 마이그레이션 0. 운영 안내: **기존 직접 입력 URL은 EXTERNAL 탭으로 자동 분류되며, 내부 페이지 참조로 전환하려면 SUBPAGE/BOARD 탭에서 재선택**하면 됨. refs에 없는 slug는 EXTERNAL로 폴백되지만 저장된 URL은 그대로라 깨지지 않음
- **Admin 커스텀 래퍼 showcase 5개 (pure UI, MSW 무의존)**:
  - `Admin/Shared/Dialog`: Basic / DisablePointerDismissal / NestedDialog(+ play) / WithForm. NestedDialog play는 자식 Dialog를 부모 `<Dialog>` children으로 렌더(Base-UI context가 nested 관계 인식)하고 `document.querySelector('[data-slot="dialog-content"][data-nested-dialog-open]')` not.toBeNull assert. Tailwind 클래스 매핑 자체 회귀는 별도 visual regression 도구 필요 (7i 범위 외 노트)
  - `Admin/Shared/AlertDialog`: ConfirmDelete / WithMedia. v1.3.0 자동 pointer dismissal 차단 특성 문서화
  - `Admin/Shared/InlineStatusToggle`: Default / Pending / Disabled (권한 없음 fallback 상황 시연)
  - `Admin/Shared/InlineBooleanToggle`: Default / Pending / CustomLabels (labelOn="노출"/labelOff="숨김")
  - `Admin/Entities/LinkTarget/LinkTargetInput`: None / SubpageLinked(+ play) / BoardLinked / ExternalUrl / RequiredUrl. `withMockRefs` decorator가 story 파일 내 inline 정의되어 Root decorator의 QueryClient를 별도 `QueryClientProvider`로 덮어쓰고 `setQueryData(linkTargetReferencesOptions().queryKey, MOCK_REFS)` 호출. SubpageLinked play는 `/p/about` 값으로 렌더 후 SUBPAGE 두 번째 Select에 `'About'` 텍스트가 보이는지 `findByText` assert (refs 로드 + 초기값 파싱 useEffect 회귀 방어)
- **구현 중 발견 — Dialog NestedDialog play function 재현 조건**: 자식 Dialog를 부모 Dialog와 **DOM 상 병렬**(sibling)로 렌더하면 Base-UI가 nested 관계를 인식하지 못해 `data-nested-dialog-open` 속성이 부착되지 않음. 자식 Dialog를 부모 `<Dialog>` 컴포넌트의 **children으로** 배치해야 함. 실사용 예: `MenuItemDialog.tsx`가 `<Dialog><DialogContent>...</DialogContent><ConfirmLeaveDialog /></Dialog>` 구조로 자식 Dialog를 Dialog 컴포넌트 내부에 sibling으로 두어 context 공유
- **검증**: admin 17 files / **52 tests passed** (35 → +17), web 12 files / **33 tests passed** (32 → +1 = Regression22M). `pnpm test` 루트 **총 85 tests 통과**. `build-storybook` 생략(기본 story 로드가 test에서 검증됨)
- **이관된 Stage 7h 작업 처리 완료**: Swiper 22M 회귀 자동 감지 ✅, 커스텀 래퍼 showcase 4개 ✅ (+ LinkTargetInput 1개로 5개). 남은 7j 작업: MSW 재조사 + CreateRoleDialog submit / reorder rollback + GitHub Actions CI matrix + `test.dependsOn` 정리 + addon-vitest 30초 timeout 해소
- **후속 정리 노트**: API endpoint `/api/home-popups/references`는 의미상 LinkTargetInput 공용 엔드포인트가 되었지만 경로 rename은 별도 작업으로 이연 → **Stage 7k-1에서 `/api/link-target/references`로 rename 완료**
