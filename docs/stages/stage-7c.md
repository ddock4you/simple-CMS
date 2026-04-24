# Stage 7c — 운영 UX (Dirty 가드, 사이트 보기, 빠른 상태 토글, 벌크, cmd+k)

- **Dirty 가드**: `useDirtyGuard`(페이지 폼) + `useDialogDirtyGuard`(Dialog 폼) + `ConfirmLeaveDialog` — `<a href>` 클릭 capture + `beforeunload` 가로채기. 적용: SubpageForm/PostForm/PopupForm/BoardForm + MenuItemDialog/MenuSetEditDialog/SectionEditDialog (총 7개)
- **메타+status 충돌 경고**: SubpageForm/PostForm에서 `isDirty && DRAFT→PUBLISHED` 시 사전 안내 모달
- **사이트 보기**: `getWebBaseUrl/getSubpagePublicUrl/getPostPublicUrl/getBoardPublicUrl` 헬퍼 + `<ViewLiveButton>` — Subpage/Post/Board View(published만), AdminHeader([사이트 메인])에 노출. preview/token 라우트는 inline 헬퍼 → `siteUrl.ts` import로 정리
- **빠른 상태 토글**: 4개 신규 엔드포인트 (`/subpages/[id]/status`, `/posts/[id]/status`, `/home-popups/[id]/visibility`, `/boards/[id]/visibility`) + 4개 mutation 훅(optimistic + rollback) + `<InlineStatusToggle>` `<InlineBooleanToggle>` 공용. 감사 로그 entityTitle에 "(상태 변경)" / "(공개 변경)" suffix
- **벌크 작업 (Subpage + Post)**: 5개 신규 엔드포인트 (subpages/posts × bulk-delete/bulk-status + posts/bulk-move). 응답 구조 `{ deleted, blocked }` / `{ updated, failed }` — 미디어 패턴 그대로. `<BulkActionBar>` 공용 + 5개 Dialog. selectedIds는 `Set<string>`로 페이지 간 유지
- **cmd+k 빠른 전환**: shadcn `command` 설치 + `useKeyboardShortcut` 훅 + 통합 `/api/quick-search` 엔드포인트 (단순 `contains` + 도메인별 read 권한 필터) + `features/quick-switcher/` 슬라이스 (`CommandPalette`, `CommandPaletteTrigger`). `(authenticated)/layout.tsx` 항상 마운트 + AdminHeader에 [검색 ⌘K] 보조 버튼
