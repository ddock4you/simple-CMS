# Stage 10 — 사용자 피드백 (서브페이지 만족도 조사 + admin 통계/차트)

공개 웹 서브페이지에 KRDS 가이드 + Figma 시안 기반 익명 만족도 조사를 추가하고, admin에서 통계·차트·삭제 처리가 가능한 운영 도구를 제공. KRDS 공공 서비스 컨벤션(`https://www.krds.go.kr/html/site/global/global_05.html`)과 Figma `r1dfm2jnjfajM4bL0CpNGu` node `50:3508`을 준수.

- **Phase 1 — 데이터 모델 + 권한 + 단일 출처 상수**
  - `Subpage.feedbackEnabled Boolean @default(false)` (opt-in 기본값) + 신규 `SubpageFeedback` 모델 (subpageId/rating/positiveReasons[]/comment/ipAddressHash/userAgent/createdAt). 인덱스 4개 — `[subpageId, createdAt]`, `[subpageId, rating]`, `[ipAddressHash, subpageId, createdAt]` (rate limit 쿼리), `[createdAt]` (전역 통계). `Subpage @relation(onDelete: Cascade)`로 페이지 삭제 시 자동 정리
  - `enum FeedbackRating { POSITIVE, NEGATIVE }` + `enum AuditEntityType.SUBPAGE_FEEDBACK` 추가
  - `packages/types/src/domain/feedback.types.ts` 신규: `FEEDBACK_POSITIVE_REASONS`(FOUND_INFO/LIKED_CONTENT/EASY_TO_UNDERSTAND), `FEEDBACK_RATING_LABELS`, `FEEDBACK_COMMENT_MAX_LENGTH`(1000), `FEEDBACK_RATE_LIMIT_HOURS`(24), `FEEDBACK_RETENTION_DAYS`(365)
  - `packages/types/src/dto/feedback.dto.ts` 신규: `CreateFeedbackDto`/`FeedbackListItem`/`FeedbackListResponse`/`FeedbackStatsResponse` (overall + daily + bySubpage + topPositiveReasons)
  - 권한 리소스 `subpage-feedback` (`read`, `delete` — create/update 미정의: 익명 수신 + 운영자 편집 미도입). seed `FULL_PERMISSIONS`에 `read+delete`, `DEFAULT_PERMISSIONS`에 `read`만 추가
  - **seed 동작 분기 — 운영자 런북 한 줄**: 총괄 관리자 Role은 `upsert.update.permissions: FULL_PERMISSIONS`로 자동 동기화. 일반 관리자 Role은 `update: {}`라 보존됨 → 운영 중 DB에서 `subpage-feedback:read` 부여하려면 admin `/settings/roles`에서 수동 활성화 필요

- **Phase 2 — Web 익명 수집 API + 보안 게이트**
  - `apps/web/app/api/feedback/route.ts` 신규 `POST` 엔드포인트, runtime nodejs (createHash 사용)
  - 검증 순서: (1) Zod body 파싱 → (2) preview 쿠키 헤더 차단 (운영자 미리보기에서 통계 오염 방지) → (3) `subpage.status === 'PUBLISHED' && feedbackEnabled === true` 게이트 → (4) `(ipAddressHash, subpageId, createdAt >= now-24h)` rate limit (DB 쿼리, 429) → (5) `positiveReasons` 화이트리스트 subset 검증 → (6) `sha256(ip + FEEDBACK_IP_SALT)` 해시화 → (7) `prisma.subpageFeedback.create`
  - **IP raw 저장 금지** — 한국 공공 사이트 컴플라이언스. `.env.example`에 `FEEDBACK_IP_SALT=replace-me-with-strong-random-hex` 추가, 운영 배포 전 강한 랜덤 값으로 교체. salt rotation 시 기존 24h rate limit 윈도우는 초기화됨 (의도적 — rotation은 운영 사고 대응이라 rate limit이 다소 느슨해져도 보안 우선)
  - **감사 로그 생략**: 익명 사용자의 입수 이벤트는 관리 액션이 아니므로 route handler 상단에 `// 감사 로그 생략: 익명 사용자의 피드백 입수 이벤트` 주석 명시 (CLAUDE.md "기본 로깅 원칙"의 예외 사례)
  - **rate limit 미적용 케이스**: IP 추출 실패 시 ipAddressHash=null로 저장하되 rate limit 쿼리는 skip. 보안 민감 시점에는 IP 누락 자체를 403 거부할 수도 있으나 현재는 관대 쪽

- **Phase 3 — Web 위젯 (KRDS 스타일)**
  - `apps/web/src/widgets/feedback/ui/SubpageFeedback.tsx` (Server Component) — `feedbackEnabled === true`일 때만 Client Form 렌더, 아니면 null
  - `apps/web/src/widgets/feedback/ui/SubpageFeedbackForm.tsx` (Client Component) — Figma 시안 그대로 구현:
    - 초기: 제목 "이 페이지에 만족하시나요?" + 네/아니오 chip 2개 (selected 상태에 `border-primary-50 bg-primary-5`)
    - 네 선택 → Q1 체크박스 3개 + Q2 자유 텍스트(100자→1000자, 카운터) 노출. 아니오 선택 → Q1 미노출 + Q2만 (Figma는 긍정 분기만 정의)
    - 취소(reset) / 평가완료(submit) 버튼
    - 제출 후 감사 메시지 ("의견을 남겨주셔서 감사합니다. 보내주신 소중한 의견은 페이지 개선에 도움이 됩니다.") + `aria-live="polite"` + 24h localStorage 차단 (`feedback_submitted_{subpageId}`)
    - **previewMode prop**: UI는 노출하되 평가완료 disabled + 안내 텍스트 "미리보기 모드에서는 피드백을 제출할 수 없습니다."
  - `apps/web/src/widgets/feedback/lib/feedbackStorage.ts` — localStorage 24h TTL wrapper (`hasSubmitted`/`markSubmitted`)
  - **KRDS Tailwind utility 활용**: `bg-gray-5` / `rounded-5` / `p-7` / `text-title-s` / `text-body-m` / `bg-primary-50` / `text-point-50` 등 Stage 7e 도입 토큰 사용. native HTML form (KRDS는 Header/Footer 등 레이아웃만 사용 중)
  - SubpagePage `<KoglFooter>` 다음에 `<SubpageFeedback>` 추가. preview 분기/정식 렌더 양쪽 모두 적용 (preview는 `previewMode={true}`)
  - `getPublishedSubpage`/`getSubpageForPreview` select에 `feedbackEnabled` 추가 + `RenderSubpageInput` 인터페이스 확장

- **Phase 4 — Admin 통계 페이지 + recharts 도입**
  - `apps/admin/package.json`에 `recharts` v3.3.0 추가 (Context7로 React 19 호환 1회 확인)
  - `apps/admin/app/api/subpage-feedback/{,stats/,[id]/}route.ts` 3개 신규 — 모두 `requirePermission('subpage-feedback', ...)`. 통계는 Prisma `findMany` + JS 집계 (period 7/30/90/365일, 365일 = 최대 수만 건 처리 충분). 빈 날짜도 0으로 채워 차트 매끄럽게
  - DELETE 시 `logAuditEvent({ entityType: 'SUBPAGE_FEEDBACK', action: 'DELETE', entityTitle: '${서브페이지 제목} 피드백', changes.before: { subpageId, rating, positiveReasons, commentPreview(200자), createdAt } })`
  - `features/subpage-feedback/` 슬라이스 신규 (api/model/ui):
    - `feedbackFetchers.ts`/`feedbackQueries.ts`/`useFeedbackMutations.ts` (TanStack Query Key Factory + queryOptions + useDeleteFeedback)
    - `FeedbackStatsCards`(4개 StatCard — 총수/긍정/부정/긍정율%) / `FeedbackTimelineChart`(recharts BarChart stacked 일별) / `FeedbackPositiveReasonsChart`(recharts horizontal BarChart) / `FeedbackBySubpageTable`(긍정율 progress bar + 서브페이지 클릭으로 필터 토글) / `FeedbackListTable`(시간/서브페이지/평가/이유/코멘트/상세) / `FeedbackDetailDialog`(상세 + 권한 체크 후 삭제 버튼) / `FeedbackFilters`(period/날짜범위/rating/서브페이지/검색)
  - `pages/subpage-feedback/ui/SubpageFeedbackPage.tsx` (Server) — params parsing + queryClient.prefetchQuery 2개 (list + stats) + `prisma.subpage.findMany`로 필터 dropdown 옵션 + HydrationBoundary로 통계 섹션·필터·목록 조립
  - `(authenticated)/subpage-feedback/page.tsx` pass-through. `navigation.ts`의 "시스템" 그룹에 MessageSquare 아이콘 + `subpage-feedback` 리소스 메뉴 추가 (감사 로그 위)

- **Phase 5 — SubpageForm 토글 + Subpage API + SubpageVersion 스냅샷 통합**
  - `SubpageForm.tsx` "공개 옵션" 섹션 신규 (라이선스 섹션 다음) — `Controller` + `Checkbox` + 안내 텍스트 ("비공개(초안)인 페이지에는 표시되지 않습니다."). `cclAi` 패턴 그대로 복제
  - `subpageSchemas.ts` create/update 양쪽에 `feedbackEnabled: z.boolean().optional().default(false)` 추가
  - `/api/subpages` POST/PATCH 핸들러: body 파싱 + Prisma create/update + 감사 로그 diff에 `feedbackEnabled` 포함. `SubpageDetail` DTO + GET select에도 추가
  - `SubpageView.tsx` 메타 카드에 "사용자 피드백: 활성/비활성" 행 추가
  - **SubpageVersion 스냅샷 일관성 (Stage 7m 호환)**: `packages/db/src/subpageVersion.ts`의 `SnapshotMeta` 인터페이스 + `buildSnapshotPayload` + `restoreSubpageFromVersion`의 update 데이터 모두에 `feedbackEnabled` 추가. `SubpageVersionSnapshotMeta` DTO도 동기화. 롤백 시 `feedbackEnabled` 함께 복원되어 "버전 롤백 후 피드백이 갑자기 안 모이거나 갑자기 모이는" 미스매치 회피

- **Phase 6 — 테스트**
  - `feedbackStorage.test.ts` (jsdom) — 24h TTL 만료/key isolation/malformed JSON 5케이스
  - `SubpageFeedbackForm.stories.tsx` (Storybook play function 5건) — Default(초기 상태) / PositiveQuestionsVisible(네→Q1+Q2 노출) / NegativeNoPositiveReasons(아니오→Q2만) / PreviewSubmitDisabled(previewMode → 평가완료 disabled + 안내) / SubmittedThankYou(localStorage 사전 set + 처음부터 감사 메시지)
  - `FeedbackStatsCards.stories.tsx` — NormalDistribution / Empty 2 variants smoke
  - 누적: web 14 files / 43 tests (기존 33 + 10 신규 — feedbackStorage 5 + SubpageFeedbackForm 5). admin 26 files / 92 tests (기존 90 + 2 신규)
  - **Out of scope — `apps/web/app/api/feedback/route.test.ts`**: route handler 분기(rate limit DB 쿼리 / preview 쿠키 / status·feedbackEnabled 게이트 / whitelist subset)는 Prisma mock 부담이 커 unit으로 커버 안 함. 본 레포에 이런 패턴의 선례가 없고(기존 API Route는 모두 integration 흐름으로만 검증), 핵심 비즈니스 로직(`extractIp`/`hashIp`/positive reason 화이트리스트)은 inline pure logic이라 routing handler 자체 격리 테스트 가치가 낮음. 후속 stage에서 route handler 통합 테스트 인프라 도입 시 일괄 추가 (예: msw + supertest 또는 dev server e2e)

- **Stage 10에서 하지 않은 것 (Out of Scope → 후속 Stage)**
  - **isResolved 토글**: 운영자가 피드백을 "검토 완료"로 표시. ErrorLog 패턴 재사용 가능하나 사용자 결정으로 MVP 제외 (스팸 삭제만 가능)
  - **카테고리/태그**: 피드백을 주제별로 분류. 자유 텍스트 분석 후 운영 성숙도 올라오면 추가
  - **CSV/Excel 내보내기**: 감사 로그 내보내기 패턴 재사용 가능. 데이터 양이 많아지면 추가
  - **대시보드 위젯**: ErrorLogDashboardWidget 패턴으로 최근 24h/7일 피드백 + 긍정율 표시. Stage 11+ 확장 후보
  - **운영자 알림 (슬랙/이메일)**: 부정 피드백 임계 초과 시 알림. 외부 통합 필요해 Stage 11+ 확장
  - **피드백 질문 커스터마이징 UI**: 현재 긍정 이유 3개 고정. SiteSettings JSON으로 운영자가 편집 가능하게 확장하면 다국어/캠페인별 질문 가능
  - **부정 이유 분기 (Q1)**: 사용자 결정으로 Figma 그대로 (긍정만 분기). 부정 이유 수집이 필요해지면 `negativeReasons String[]` 컬럼 + 상수 확장으로 비파괴 추가 가능
  - **별점 1~5**: 사용자 결정으로 네/아니오만 (KRDS 가이드도 폐쇄형 권장). 향후 `Subpage.feedbackMode` 컬럼으로 페이지별 분기 가능
  - **cron 자동 정리**: `cleanupOldFeedback(retentionDays=365)` 헬퍼만 작성. cron 등록은 Stage 8 (Docker + CI/CD) 범위

- **검증** (2026-04-26 확인 완료)
  - `pnpm typecheck` 녹색 (admin + web)
  - `pnpm lint` 녹색 (admin 0 errors / 8 pre-existing warnings, web 0 errors / 2 pre-existing warnings on `KoglFooter.tsx`). Stage 10 신규 파일에서 발생한 1 error(`SubpageFeedbackForm.tsx`의 `react-hooks/set-state-in-effect`)는 SSR hydration mismatch 회피를 위한 의도적 1회 cascading set이라 사유 주석 + `eslint-disable`로 처리
  - `pnpm test` 녹색 — admin 26 files/92 tests, web 14 files/43 tests
  - `pnpm db:push` + `pnpm seed` 정상 실행 (총괄 관리자 자동 동기화)
  - admin `/subpages/{id}/edit` "사용자 피드백 UI 표시" Checkbox 노출 + 저장 후 반영 — **수동 dev 서버 검증은 사용자 환경에서 수행 예정**
  - admin `/subpage-feedback` 사이드바 "시스템" 그룹에 노출 + 빈 상태 표시 — 수동 검증 항목
  - 공개 웹 `/p/{slug}` `feedbackEnabled=true && status=PUBLISHED` 조건에서만 위젯 노출 — 수동 검증 항목
  - `POST /api/feedback`: 정상 제출 / preview 쿠키 차단 / 24h rate limit / `feedbackEnabled=false` 차단 / `status=DRAFT` 차단 — DB 쿼리 분기는 정적 검증 후 dev 서버에서 수동 검증 (route.test.ts 부재 사유는 위 Phase 6 참조)
  - admin에서 피드백 DELETE → audit log `SUBPAGE_FEEDBACK DELETE` 이벤트 + before 스냅샷 표시 — 수동 검증 항목
  - **recharts ResponsiveContainer**: Next.js 16 + React 19.2 + Turbopack 환경에서 hydration warning 또는 client-only 마운트 race 가능성 → 첫 dev 서버 기동 시 console 확인 권장

- 상세 계획 문서: [`C:/Users/ddock/.claude/plans/snuggly-wobbling-whisper.md`](../../../Users/ddock/.claude/plans/snuggly-wobbling-whisper.md)
