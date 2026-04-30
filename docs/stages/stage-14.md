# Stage 14 — admin app UX/DX 공통화 리팩터링

admin 앱 전반에 누적된 UI 불일치(헤더 인라인 패턴, Dialog 폭 불통일, 저장 버튼 위치 폼별 상이)를 공통 컴포넌트로 통합한 리팩터링. PageHeader + PageToolbar 신설, Dialog size 토큰 도입, 인라인 status 토글 시각 통일까지 8개 sub-stage.

## 변경 동기

Stage 13까지 완료 후 admin 앱의 UX 불일치 현황:
- 헤더 영역: 21개 페이지가 각자 다른 `<div className="flex items-center justify-between">` 인라인 패턴
- Dialog: 33개 Dialog의 폭과 스크롤 동작이 제각각 (`max-w-md`, `max-w-lg`, `sm:max-w-4xl` 혼재)
- 저장 버튼: SubpageForm은 CardFooter, PostForm은 헤더 인라인, BoardForm도 각기 다름
- 인라인 status 토글: SubpageTable/PostTable은 110px Select, BoardTable은 Switch+라벨

## 핵심 아키텍처 결정

- **PageHeader**: sticky 아님(default `false`). 슬롯: `back`, `title`, `description`, `tabs`. `actions` 슬롯은 legacy.
- **PageToolbar**: sticky `top-14 z-20` (AdminHeader 바로 아래). 좌: Read(필터/검색), 우: CUD(추가/편집/삭제/저장). 모바일은 Top Sheet collapse.
- **편집 폼 [저장]/[삭제]**: 반드시 `PageToolbar.right`. CardFooter/FormSaveBar 폐기.
- **Dialog size 토큰**: `sm(md)→md(lg)→lg(3xl)→xl(5xl)`. `bodyOnlyScroll` + `<DialogBody>` 슬롯으로 헤더·푸터 고정 + 본문만 스크롤.
- **인라인 status 토글**: 2-option enum용 `InlineStatusSwitchToggle` 신설 (Switch + 라벨). Boolean용 `InlineBooleanToggle` 패턴과 시각 통일.

## 단계별 변경 내역

### Stage 14a — PageHeader 신설 + AdminHeader sticky + nested main 정리

**신설/수정 파일:**
- `apps/admin/src/shared/ui/PageHeader.tsx` — 슬롯: `back`, `title`, `description`, `tabs`, `actions`(legacy). `sticky?: boolean` (default `true` → 14a-2에서 `false`로 정정)
- `apps/admin/src/shared/ui/PageHeader.stories.tsx` — 8 variants
- `apps/admin/src/widgets/admin-header/ui/AdminHeader.tsx` — `sticky top-0 z-30 bg-background`
- `apps/admin/app/(authenticated)/layout.tsx` — 이중 `<main>` 해소
- 카나리 3개 적용: DashboardPage / SubpagesListPage / SubpageForm
- DeleteSubpageDialog 트리거에 `type="button"` 추가 (폼 내부 우발적 submit 방지)
- AlertDialogOverlay `duration-100` → `duration-200` (백드롭 깜빡임 수정)

### Stage 14a-2 — PageToolbar 신설 + sticky 이전 + PageHeader sticky default false 정정

**신설/수정 파일:**
- `apps/admin/src/shared/ui/PageToolbar.tsx` — 슬롯: `left`, `right`. `sticky?: boolean` (default `true`). 모바일 Top Sheet collapse (Sheet `side="top"`, shadcn sheet.tsx 기존 자산)
- `apps/admin/src/shared/ui/PageToolbar.stories.tsx` — 8 variants
- `apps/admin/src/shared/ui/PageHeader.tsx` — `sticky` default `true` → `false`
- 카나리 3개 정리: SubpagesListPage/SubpageForm PageHeader.actions → PageToolbar.right 이전, DashboardPage sticky 옵션 제거

**모바일 collapse 결정 로직:**
- `mobileCollapseLeft`/`mobileCollapseRight` 미지정 시 자동 = slot 존재 여부
- 단일 자식 호출자는 명시적 `false` 전달해 inline 유지 (`PopupListPage` 대표 케이스)

### Stage 14a-3 — PageToolbar 시각 polish

**PageToolbar.tsx 4가지 변경:**
1. `border-b` 제거 (밑줄 답답함 → `shadow-sm` 대체)
2. 버튼 `size="sm"` → default size 통일
3. sticky 활성 시 `-mx-6 px-6`으로 부모 `p-6` 패딩 돌파 → bg가 viewport 전체 폭 확장
4. Sheet `side="bottom"` → `side="top"` (Top Sheet 애니메이션)

**최종 className:**
```tsx
className={cn(
  'flex items-center justify-between gap-2 bg-background py-2',
  sticky && 'sticky top-14 z-20 -mx-6 px-6 shadow-sm',
)}
```

### Stage 14b — list/view 14개 페이지 PageHeader/PageToolbar 마이그레이션

**list 10개 (PageHeader + PageToolbar):**

| 페이지 | PageToolbar.left | PageToolbar.right |
| ------ | ---------------- | ----------------- |
| BoardsListPage | VisibilityFilter | canCreate && NewButton |
| PostsListPage | StatusFilter + BoardFilter | canCreate && NewButton |
| UsersPage | UserStatusFilter | — |
| NavigationListPage | — | canCreate && NewMenuButton |
| AuditLogsPage | AuditLogFilters | AuditLogExport |
| ErrorLogsPage | ErrorLogFilters | — |
| MediaPage | MediaFilters | canCreate && UploadButton |
| PopupListPage | — | canCreate && NewButton (`mobileCollapseRight={false}`) |
| SubpageFeedbackPage | FeedbackFilters | FeedbackExport |
| HomePage | — | — (PageToolbar 미사용) |

**view 4개 (PageHeader.back + PageToolbar.right):**

| 페이지 | PageToolbar.right |
| ------ | ----------------- |
| SubpageView | PreviewButton + ViewLiveButton + SaveVersionButton + DeleteDialog + EditButton |
| BoardView | ViewLiveButton + DeleteDialog + EditButton |
| PostView | PreviewButton + ViewLiveButton + DeleteDialog + EditButton |
| PopupView | DeleteDialog + EditButton |

**E2E selector 안정화:** `golden-flow.spec.ts`의 버튼 selector를 `getByRole('button', { name: '...' })` 기반으로 정비.

### Stage 14c — Settings 6탭 PageHeader sticky 통합

**대상 6개:**
- DomainSettingsPage / SecuritySettingsPage / UploadSettingsPage / RolesPage / BrandingSettingsPage / SeoSettingsPage
- 각 페이지: `<PageHeader title="사이트 설정" tabs={<SettingsNav />} />`
- 페이지 내 중복 `<h1>사이트 설정</h1>` 제거

### Stage 14d — 편집 폼 [저장]/[삭제] PageToolbar 이전

**대상 3개 폼 (SubpageForm은 14a-2 카나리에서 이미 처리):**

| 폼 | 변경 전 | 변경 후 |
| -- | ------- | ------- |
| PostForm | 헤더 인라인 [Delete][저장] | `<PageToolbar right={<><DeletePostDialog /><Button type="submit">저장</Button></>} />` |
| BoardForm | 헤더 인라인 [Delete][저장] | 동일 패턴 |
| PopupForm | 헤더 인라인 [Delete][저장] | 동일 패턴 |

**Submit 패턴:** 폼 내부에 PageToolbar 배치 → Button `type="submit"` 자연 트리거. 폼 외부 배치 시 onClick으로 `form.handleSubmit()` 명시 호출.

### Stage 14e-1~3 — Dialog size 토큰 + bodyOnlyScroll

**14e-1 — 인프라 (dialog.tsx):**
- `DialogContent`에 `size?: 'sm' | 'md' | 'lg' | 'xl'` prop 추가 → `max-w-md|lg|3xl|5xl` 매핑
- `DialogContent`에 `bodyOnlyScroll?: boolean` prop 추가 (default `false`)
- `DialogBody` slot 신설 — `overflow-y-auto px-1 py-2`
- `disablePointerDismissal` prop: 외부 클릭 닫기 차단 (입력 Dialog 표준 규약)
- AlertDialog에 `size` 토큰 동일 패턴 이식

**14e-2 — 호출처 size 토큰 치환:**
- `max-w-md` → `size="sm"`, `max-w-lg` → `size="md"`, `max-w-3xl` → `size="lg"`, `max-w-5xl` → `size="xl"`
- 33개 Dialog 호출처 일괄 치환

**14e-3 — bodyOnlyScroll 마이그레이션:**
- 복잡 Dialog (VersionHistoryDialog, VersionDetailDialog, BlockEditDialog, MediaDetailDialog 등) `bodyOnlyScroll={true}` + `<DialogBody>` 적용
- 기존 `max-h-[90vh] overflow-y-auto` ad-hoc 패턴 제거

### Stage 14f — 리스트 인라인 status 토글 시각 통일

**단일 책임:** SubpageTable/PostTable의 `<InlineStatusToggle>` (110px Select) → `<InlineStatusSwitchToggle>` (Switch + 라벨)로 교체.

**신설 파일:**
- `apps/admin/src/shared/ui/InlineStatusSwitchToggle.tsx` — generic `<T extends string>`. props: `value`, `onState`, `offState`, `onChange`, `disabled?`, `isPending?`, `labelOn?='발행'`, `labelOff?='초안'`
- `apps/admin/src/shared/ui/InlineStatusSwitchToggle.stories.tsx` — 4 variants (Default play / Pending / Disabled / CustomLabels)

**수정 파일:**
- `SubpageTable.tsx` — `InlineStatusToggle` → `InlineStatusSwitchToggle`, `STATUS_OPTIONS` 상수 제거
- `PostTable.tsx` — 동일 교체

**주요 보존 사항:**
- default `labelOn="발행"` / `labelOff="초안"` — E2E `getByText('초안')` 매칭 안전
- `canUpdate ? <InlineStatusSwitchToggle> : <XxxStatusBadge>` 권한 fallback 패턴 그대로
- 인라인 토글에 publish-confirm 인터셉트 없음 (즉시 mutate) — 인터셉트는 SubpageForm/PostForm 폼 단에만 존재, 변경 없음
- `InlineStatusToggle` 컴포넌트는 유지 (호출처 0건, 미래 multi-option enum 후보)
- Boolean Switch 통일 (5개 폼 필드) — 각 폼의 다른 변경과 자연 시점에 묶어 처리 (14f 범위 외 이연)

**E2E 영향:** `golden-flow.spec.ts`는 status 변경을 직접 API PATCH로 수행 + 라벨 `getByText('초안').first()` 매칭 → Toggle UI 자체는 e2e 경로 외. 라벨 보존으로 안전.

## 검증 결과

- `pnpm --filter @simple-cms/admin lint && typecheck` — 0 errors
- `pnpm --filter @simple-cms/admin test` — 62 files, 280 tests 통과 (14f 완료 기준)
- Storybook: `Admin/Shared/InlineStatusSwitchToggle` 4 variants (Default play 포함) 정상 실행
- `golden-flow.spec.ts` — 기존 E2E 무영향

## 브라우저 시각 검증 포인트 (14f)

- `/subpages` 목록: 상태 컬럼이 110px Select → Switch + "초안"/"발행" 라벨로 교체
- `/posts` 목록: 동일
- 권한 없는 사용자: Badge fallback 그대로
- Switch 토글 → 즉시 mutation → toast + 라벨 변경
