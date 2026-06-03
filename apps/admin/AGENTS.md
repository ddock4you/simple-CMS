<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->

> Codex: also read `apps/admin/design.md` for the admin design system before changing admin UI.

# apps/admin — 관리자 CMS

내부 운영자용 CMS 애플리케이션. 모든 콘텐츠의 생성/수정/삭제를 담당하며, API/BFF 역할도 수행한다.
디자이너 Figma 시안 기반 전용 UI를 사용하며, KRDS는 사용하지 않는다.

## 앱 성격

- 내부 운영 도구 (인증된 관리자만 접근)
- 서버 처리 중심 (BFF + Prisma DB 접근)
- 데이터 변경의 중심점
- 포트: **3001**

## BFF 역할

admin의 서버 로직이 BFF를 담당한다 (**admin 자체 UI 전용**, web은 admin API를 호출하지 않음):

- 관리자 화면에 맞는 데이터 가공
- Prisma 기반 DB 접근
- 인증/권한 검사
- 생성/수정/삭제 액션 처리
- 관리용 응답 형태 제공

예: 게시글 목록에서 게시판명+상태+작성자+수정일을 한 번에 내려주는 응답

> web 앱은 `@simple-cms/db`로 DB에 직접 접근한다. admin BFF에 의존하지 않으므로 admin 장애 시에도 web은 독립적으로 동작한다.

## FSD 구조 (경량)

```
app/              # Next.js App Router (루트에 배치)
pages/            # Pages Router placeholder (README.md만)
src/
├── pages/        # FSD pages 레이어
├── features/     # 기능 단위 폼/액션
├── entities/     # 도메인 엔티티 관련 로직
└── shared/       # 공용 유틸, UI 기본 컴포넌트
```

- `widgets`는 필요 시에만 도입
- 페이지 단위 운영 화면 + 기능 단위 폼/액션 중심

> **Next.js Pages Router 충돌 방지**:
> `app/`과 `pages/`를 앱 루트에 배치하여 "same folder" 제약을 충족하고,
> `src/pages/`를 FSD pages 레이어로 안전하게 사용한다.
> 참고: https://feature-sliced.design/kr/docs/guides/tech/with-nextjs

## 인증 / 권한

### 인증 (Authentication)

- `/admin` 접근은 인증된 관리자만 허용
- 로그인 식별자: `username` (아이디), 이메일이 아닌 사용자명 기반 인증
- 비밀번호: bcryptjs 해싱 (cost factor 10), 평문 저장 절대 금지
- 가입 승인제: 회원가입 → PENDING → ACTIVE 관리자가 승인 → ACTIVE (로그인 가능)
- UserStatus: `PENDING`(대기) / `ACTIVE`(활성) / `SUSPENDED`(정지)
- 최초 관리자: prisma/seed.ts seed 스크립트로 생성 (.env에서 초기 계정 정보 읽기)
- PENDING 상태 로그인 시도: 로그인 API에서 `{ success: false, error: "PENDING_APPROVAL" }` 직접 반환
- SUSPENDED 사용자: 로그인 API에서 `{ success: false, error: "ACCOUNT_SUSPENDED" }` 반환 + 기존 세션 즉시 삭제
- 세션 전략: **커스텀 DB 세션** (crypto.randomUUID + httpOnly 쿠키)
  - JWT 대신 DB 세션 사용 — 동시 로그인 제어, 서버 사이드 세션 무효화 필요
  - Session 모델만 사용 (Account, VerificationToken 불필요)
  - 인증 유틸: `getCurrentUser()` — `entities/auth/lib/getCurrentUser.ts`
  - 쿠키 유틸: `setSessionCookie()`, `clearSessionCookie()` — `shared/lib/cookies.ts`
  - 세션 유효성: `(authenticated)` route group layout에서 `requireAuth()` 호출로 인증 처리
  - 동시 로그인 정책: `SiteSettings.CONCURRENT_LOGIN_ENABLED`로 제어
  - **세션 dedup (Stage 18)**: `shared/lib/cachedSession.ts`의 `getCachedSession()`이 React `cache()`로 같은 요청 내 `Session.findUnique` 호출을 1회로 dedup. `getCurrentUser` + `ensureDemoSession`이 같은 cache 인스턴스를 공유 → admin layout 진입 시 매번 2번 발생하던 DB 쿼리가 1번으로 통합. 새 인증 헬퍼 추가 시 `prisma.session.findUnique` 직접 호출 대신 `getCachedSession()` 경유 권장. Prisma generated 타입 portability 위해 반환 타입은 `Prisma.SessionGetPayload<{ include: { user: { include: { role: true } } } }>` 명시

### 인가 (Authorization) — 역할 기반 권한 관리

- Role 모델 기반 동적 RBAC
- 총괄 관리자(`isSystem: true`): 모든 권한 보유, 권한 체크 바이패스
- 기본 역할(`isDefault: true`): 가입 승인 시 자동 부여
- 권한 체크 패턴 (**API + UI 양쪽 필수**):
  - API Route (단일 리소스): `requirePermission(resource, action)` — 401(미인증) 또는 403(권한 없음) 반환
  - API Route (멀티 리소스 OR): `requireAnyPermission([{ resource, action }, ...])` — 인증 필수 + 주어진 권한 중 하나 이상 보유해야 통과. quick-search처럼 여러 도메인 중 하나라도 조회 권한이 있으면 의미있는 결과를 줄 수 있는 API에서만 사용. 위치: `entities/auth/lib/requireAnyPermission.ts`
  - Client Component: `usePermission(resource, action)` 훅 — `PermissionProvider` Context 사용
  - Server Component: `hasPermission(user, resource, action)` 직접 호출
  - 사이드바: `getVisibleMenuItems(user)` — read 권한 없는 메뉴 숨김
  - 프로필(`/profile`): 권한 체크 없이 모든 인증 사용자 접근 가능
  - 대시보드(`/dashboard`): 모든 역할에 기본 포함 (비토글)
- `(authenticated)/layout.tsx`에서 `<PermissionProvider>`로 모든 인증 페이지를 감쌈
- SessionUser에 role 정보 포함 (eager-load via `getSessionUser` include: { role: true })
- **새 기능 추가 시 UI 권한 체크 필수**: 생성/편집/삭제 버튼을 `usePermission` 또는 `hasPermission`으로 조건부 렌더링
- UI 차단 + 서버 검증 함께 적용 (UI는 UX용, 서버가 최종 권한)

- 인증 API Routes:
  - `POST /api/auth/login` — 자격 검증, 상태 확인, 동시 로그인 처리, 세션 생성, 쿠키 설정
  - `POST /api/auth/logout` — 세션 삭제, 쿠키 제거
  - `POST /api/auth/register` — 회원가입 (PENDING 상태로 생성)
- 사용자 관리 API Routes:
  - `GET /api/users` — 목록 (상태 필터 + 서버 사이드 페이지네이션 + q 검색)
  - `POST /api/users/[id]/approve` — 승인 (PENDING→ACTIVE, 기본 역할 배정)
  - `DELETE /api/users/[id]` — 거절 (PENDING 유저 hard delete)
  - `POST /api/users/[id]/suspend` — 정지 (ACTIVE→SUSPENDED, 세션 즉시 삭제) ← D9 가드: 마지막 총괄 관리자만 차단
  - `POST /api/users/[id]/reactivate` — 해제 (SUSPENDED→ACTIVE)
  - `PATCH /api/users/[id]/role` — 역할 변경
  - `POST /api/users/bulk-approve` — 일괄 승인 (users:update, 기본 역할 자동 배정)
  - `POST /api/users/bulk-reject` — 일괄 거절 (users:delete, PENDING만 처리)
  - `POST /api/users/bulk-suspend` — 일괄 정지 (users:update, assertNotLastSystemAdmin mid-loop)
  - `POST /api/users/bulk-reactivate` — 일괄 활성화 (users:update, SUSPENDED만 처리)
  - `POST /api/users/bulk-role` — 일괄 역할 변경 (users:update, isSystem 역할 배정은 403 전체 차단)
  - `GET /api/roles` — 역할 목록 (드롭다운용 + 권한 관리)
- 역할/권한 관리 API Routes:
  - `GET /api/roles` — 목록 (userCount 포함)
  - `POST /api/roles` — 역할 생성
  - `GET /api/roles/[id]` — 역할 상세 (permissions 포함)
  - `PATCH /api/roles/[id]` — 이름/설명 수정
  - `DELETE /api/roles/[id]` — 삭제 (isSystem/isDefault 차단)
  - `PATCH /api/roles/[id]/permissions` — 권한 매트릭스 변경 (isSystem 차단)
  - `POST /api/roles/[id]/set-default` — 기본 역할 설정 (트랜잭션)

## 라우팅

```
/login                  # 로그인
/register               # 회원가입 (비인증, 로그인 페이지에서 이동)
/dashboard              # 대시보드
/subpages               # 서브 페이지 목록
/subpages/[id]          # 서브 페이지 상세 (읽기 전용 뷰)
/subpages/[id]/edit     # 서브 페이지 편집
/subpages/new           # 서브 페이지 생성
/boards                 # 게시판 목록
/boards/[id]            # 게시판 상세 (읽기 전용 뷰)
/boards/[id]/edit       # 게시판 편집
/boards/new             # 게시판 생성
/posts                  # 게시글 목록
/posts/[id]             # 게시글 상세 (읽기 전용 뷰)
/posts/[id]/edit        # 게시글 편집
/posts/new              # 게시글 생성
/navigation             # 메뉴 관리
/navigation/[menuId]    # 메뉴 세트 편집
/home                   # 메인 페이지 관리
/popups                 # 메인 팝업 관리 (목록) — /home/popups/* 는 308 redirect
/popups/new             # 메인 팝업 생성
/popups/[id]            # 메인 팝업 상세 (읽기 전용 뷰)
/popups/[id]/edit       # 메인 팝업 편집
/media                  # 미디어 라이브러리 (그리드 + 검색 + 상세 Dialog)
/users                  # 사용자 관리 (목록, 승인/거절, 정지/해제)
/profile                # 내 정보 변경 (이름, 비밀번호)
/subpage-feedback       # 사용자 피드백 (Stage 10 — 서브페이지 만족도 조사 통계/목록/삭제)
/audit-logs             # 활동 이력 (감사 로그)
/error-logs             # 웹 에러 로그 (공개 웹 런타임 에러 조회, 상세는 Dialog)
/settings               # 사이트 설정 (첫 번째 하위 설정으로 리다이렉트)
/settings/domain        # 도메인 설정
/settings/security      # 보안 설정 (동시 로그인 정책)
/settings/upload        # 업로드 제한 설정 (허용 확장자, MIME 타입, 최대 파일 크기)
/settings/roles         # 권한 관리 (역할 목록 + 메뉴별 CRUD 매트릭스)
/settings/branding      # 사이트 브랜딩 + SEO 메타데이터 (Stage 7l — 로고/favicon/OG/사이트명·설명)
/settings/seo           # SEO 설정 (Stage 9 — sitemap URL 안내 + robots.txt 추가 Disallow)
/settings/demo-snapshot # 시연 스냅샷 (시연 PR7 — export/import 미리보기 통계 + 다운로드 + 즉시 적용)
```

## 기능별 상세 스펙

### 서브 페이지 CRUD

- 제목, SEO title/description, Tiptap 본문
- draft / published 상태 관리
- slug: 생성 시 서버가 opaque random slug를 자동 발급. 작성/편집 폼에서 직접 입력하지 않으며 편집 저장 시 기존 slug 유지
- 대표 이미지 필드
- 미리보기 제공
- 본문 편집: **통합 블록 모델** (Stage 6) — 제목·SEO·상태만 SubpageForm에서 관리하고, 본문과 부가 요소는 모두 PageBlock으로 편집. SubpageForm 내 Tiptap 에디터는 제거됨
- 편집 화면 구성: SubpageForm(상단) + BlockManager(하단) 세로 배치. 생성 모드(/subpages/new)는 SubpageForm만 노출, 저장 후 상세에서 블록 추가
- **뷰/편집 분리**: `/subpages/[id]` = 메타데이터 + 블록 구성 목록 + **콘텐츠 카드**(각 블록 입력값 표시), `/subpages/[id]/edit` = 폼 + BlockManager
- **뷰 페이지 콘텐츠 카드** (`features/block-management/ui/BlockContentView.tsx`): 블록 순서대로 각 블록의 입력값을 표시 — 공개 웹과 동일한 실물 렌더는 상단 [미리보기] 버튼이 담당
  - RICH_TEXT: `renderTiptapContentForAdmin` → `<div className="prose prose-sm">` 렌더 (게시글 뷰 패턴 동일)
  - HTML: Monaco Editor `readOnly: true` + `domReadOnly: true` (편집 페이지의 HtmlBlockFields 패턴 재사용, height 220px)
  - IMAGE: 작은 썸네일(`resolveMediaPreviewUrl`) + 필드 목록(URL, Alt, 캡션, 링크). 다중 이미지 config(`items[]`)면 이미지별 카드로 표시
  - IFRAME: 필드 목록(URL, 제목, 비율, 전체화면 허용 여부) — 실제 iframe 임베드 없음 (관리자 검증만 목적)
  - 블록 컨테이너: `rounded-lg border bg-card shadow-sm` + 헤더(`border-b bg-muted/40`) + 번호 배지(primary 원형) + 블록 타입 Badge(shadcn, 아이콘 포함) + 숨김 Badge(outline)
  - 숨김 블록: 컨테이너에 `opacity-60` + 헤더 숨김 Badge 이중 표시
  - 빈 내용: `(비어있음)` 힌트
  - lucide-react 아이콘: RICH_TEXT→Type, HTML→Code2, IMAGE→ImageIcon, IFRAME→MonitorPlay
- **뷰 페이지 카드 배치 순서**: 좌측 col-span-2에 [블록 구성] → [콘텐츠](BlockContentView) 세로 배치 — 페이지 단위 커스텀 코드 카드는 폐기됨(Stage 7b-Option B)
- **권한 기반 UI**: 생성(`subpages:create`), 편집(`subpages:update`), 삭제(`subpages:delete`) 버튼을 권한별 표시/숨김
- API Routes: `GET/POST /api/subpages`, `GET/PATCH/DELETE /api/subpages/[id]` — 모든 핸들러에 `requirePermission()` 적용. Subpage 본문 필드(`contentJson`)는 DTO에서도 제거
- FSD: `features/subpage-management/`, `pages/subpage-management/`

### HTML 블록 — HTML + 페이지 스코프 CSS 편집 (Stage 7b — Option B)

**페이지 단위 `Subpage.customHtml` / `customCss` 필드는 폐기되었음** (2025-04-16, 데이터 폐기 + db drop). HTML 블록이 두 역할을 흡수.

- HTML 블록의 `configJson`이 `{ html: string, css?: string | null }` 구조로 확장 — `htmlBlockConfigSchema` (`features/block-management/model/blockSchemas.ts`), 각 max 100,000자
- 편집 (`features/block-management/ui/fields/HtmlBlockFields.tsx`): shadcn Tabs(HTML/CSS) + Monaco Editor 2개
  - `next/dynamic` + `ssr: false`, height 400px, wordWrap on, minimap off
  - 각 탭에 길이 카운터 + 안내 문구 (HTML은 sanitize/iframe 호스트 안내, CSS는 `#subpage-{id}` 페이지 스코프 안내)
  - CSS는 빈 문자열이면 `null`로 저장 (호출 측에서 `onChange` 처리)
- 뷰 (`features/block-management/ui/BlockContentView.tsx`의 `HtmlBlockContent`): 둘 다 있으면 Tabs(글자 수 Badge), 한쪽만 있으면 라벨 Badge + 단일 Monaco readOnly
- 같은 페이지의 여러 HTML 블록 css는 모두 같은 `#subpage-{id}` prefix를 공유 → 한 블록의 CSS가 페이지 전체에 영향 (페이지 스코프)
- 공개 웹 렌더는 `apps/web` 의 `SubpageBlockRenderer.HtmlBlock`이 `sanitizeCustomHtml` + `scopeCustomCss` 호출 (자세한 내용은 apps/web/AGENTS.md)
- 실물 렌더 확인은 [미리보기] 버튼(Stage 7a) 또는 발행 후 `/p/{slug}` 방문

### 서브페이지 블록 (Stage 6 — 통합 블록 모델)

- 서브페이지의 **모든 콘텐츠**는 PageBlock 목록으로 표현 (별도의 본문 필드 없음)
- 블록 구조: `blockType` + `displayOrder` + `isVisible` + `configJson`
- Admin UI 배치: 서브페이지 편집 페이지에 `SubpageForm` + `BlockManager`를 세로로 배치 (탭 없음). 위/아래 자유 배치로 본문·HTML·이미지·iframe·아코디언을 섞어 구성
- FSD: `features/block-management/` + API Route `app/api/subpages/[id]/blocks/`
- 권한 리소스: 별도 신설 없이 **`subpages:update`**로 블록 CUD 처리 (블록은 서브페이지 구성 요소)
- 감사 로그 entityType: `PAGE_BLOCK` (CREATE/UPDATE/DELETE + 순서 변경 요약 로그)
- 서브페이지당 블록 상한: **50개** (`PAGE_BLOCK_MAX_PER_SUBPAGE`, 서버 검증 + UI 차단)

#### 지원 블록 타입

| 블록 타입     | configJson 스키마                                                                                 | 편집기                                                                                                    | 렌더                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RICH_TEXT** | `{ contentJson: object }` Tiptap ProseMirror JSON                                                 | 기존 `TiptapEditor` 재사용 (검색용 plain text는 블록 CUD 시 `recalculateSubpageContent`가 재집계)         | `renderTiptapContent` + `TiptapContent` 공유 컴포넌트                                                                                                                   |
| **HTML**      | `{ html: string, css?: string \| null }` (각 max 100,000자) — Stage 7b-Option B에서 css 필드 추가 | `@monaco-editor/react` language=html/css (SSR 비호환 → `next/dynamic` with `ssr: false`), shadcn Tabs 2탭 | 서버 DOMPurify sanitize(`sanitizeCustomHtml`, iframe 등 의미론 태그 허용) + iframe src 호스트 재검증 + css는 `scopeCustomCss(css, subpageId)` → `<style>` 페이지 스코프 |
| **IMAGE**     | legacy `{ imageUrl, imageAlt(필수), imageMediaId?, caption?, linkUrl? }` + 신규 `{ items: ImageBlockItem[] }` (`max 12`) | `ImageUrlInput`(entities/media) + 이미지별 alt/캡션/링크 + 위/아래 순서 이동                              | 1장이면 `<figure><img alt><figcaption></figure>`, 2장 이상이면 공개 웹 Carousel                                                                                        |
| **IFRAME**    | `{ src, title(필수/접근성), aspectRatio: '16:9'\|'4:3'\|'1:1', allowFullscreen }`                 | URL + 제목 + 비율 + 전체 화면                                                                             | aspect-ratio wrapper + iframe, 허용 호스트 **서버+클라이언트 2중 검증**                                                                                                 |
| **ACCORDION** | `{ heading?, description?, enableSearch, searchPlaceholder?, defaultOpenFirst, items: { title, body }[] }` (`max 50`) | 제목/설명 + 검색 입력 사용 체크박스 + 항목별 제목/본문 + 위/아래 순서 이동                                | KRDS 기본 아코디언. `enableSearch=true`이면 블록 내부 검색 입력으로 일치 항목만 필터링                                                                                  |

#### 본문 → 블록 변환 (Stage 6 마이그레이션)

- 기존 `Subpage.contentJson` 필드는 제거되고 RICH_TEXT 블록 1개로 변환됨 (`packages/db/migrate-content-to-blocks.ts` 1회 스크립트, 현재 레포에서는 실행 후 삭제됨)
- 신규 서브페이지는 빈 상태로 시작 — 블록 드롭다운 맨 위의 **본문(RICH_TEXT)** 추가로 작성

#### IFRAME 허용 도메인 + URL 정규화

- 허용 호스트: `www.youtube.com`, `youtube.com`, `www.youtube-nocookie.com`, `player.vimeo.com`
- `features/block-management/model/blockLabels.ts`
  - `IFRAME_ALLOWED_HOSTS` 상수 + `isIframeHostAllowed` 헬퍼 (Stage 7k-1에 `@simple-cms/types`로 단일 출처 통합, `blockLabels.ts`는 re-export만 담당)
  - `isIframeHostAllowed(src)` — host만 검증
  - `normalizeIframeEmbedUrl(src)` — 일반 URL → embed URL 변환
- **정규화 규칙** (저장 시점에 자동 변환):
  - `youtube.com/watch?v=ID&t=30` → `www.youtube.com/embed/ID?start=30`
  - `youtu.be/ID` → `www.youtube.com/embed/ID`
  - `youtube.com/shorts/ID` → `www.youtube.com/embed/ID`
  - `vimeo.com/123456` (숫자 ID) → `player.vimeo.com/video/123456`
  - 이미 embed 형식 URL은 통과
  - playlist/channel 등 임베드 불가 경로는 null 반환 → 422
- **정규화 필요 이유**: YouTube 일반 시청 URL(`/watch?v=...`)은 `X-Frame-Options: sameorigin` 헤더로 외부 iframe 차단. embed 경로(`/embed/ID`)만 외부 임베드 허용
- **방어 다층**: `BlockEditDialog.handleSubmit`에서 클라이언트 선변환 + `app/api/subpages/[id]/blocks/` POST/PATCH에서 서버 재변환 → DB에는 embed URL만 저장
- 하드코딩 운영 — SiteSettings 기반 호스트 관리는 2차 과제

#### API Routes

| Method | Route                                 | 권한            | 용도                                                                                |
| ------ | ------------------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| GET    | `/api/subpages/[id]/blocks`           | subpages:read   | 목록                                                                                |
| POST   | `/api/subpages/[id]/blocks`           | subpages:update | 생성 (50개 상한 검사 + displayOrder 자동 + 검색 대상 블록 content 재집계)           |
| GET    | `/api/subpages/[id]/blocks/[blockId]` | subpages:read   | 단건                                                                                |
| PATCH  | `/api/subpages/[id]/blocks/[blockId]` | subpages:update | 수정 (blockType 불변 — safeParse drop, 검색 대상 블록 configJson 변경 시 content 재집계) |
| DELETE | `/api/subpages/[id]/blocks/[blockId]` | subpages:update | 삭제 + displayOrder 정규화 + 검색 대상 블록 content 재집계                          |
| PATCH  | `/api/subpages/[id]/blocks/reorder`   | subpages:update | 순서 일괄 변경 (트랜잭션) + content 재집계                                          |

`recalculateSubpageContent(subpageId)` 헬퍼: `apps/admin/src/shared/lib/blockContentRecalculation.ts` — RICH_TEXT 블록의 `configJson.contentJson`과 ACCORDION 블록의 heading/description/items[].title/body를 displayOrder 순으로 모아 `Subpage.content` 갱신. PGroonga 검색 인덱스 최신 상태 유지.

#### Media 참조 추적

- IMAGE 블록의 `imageMediaId` + `items[].imageMediaId`: `findMediaReferences()` 경로 6 (JSONB containment)
- RICH_TEXT 블록 `configJson.contentJson` 내 image 노드의 `mediaId`: 경로 7 (Tiptap 재귀)
- `MediaReferenceType`: `'PAGE_BLOCK_IMAGE'` (IMAGE/RICH_TEXT 공용)
- Media 삭제 시 해당 블록이 사용 중이면 409 차단, 사용처 목록에 서브페이지 제목 표시

#### 시안 대응 전략

- **데이터 구조(configJson) 동결** → 디자이너에게 필드 세트 공유하고 시안에서 맞춤
- **렌더러 교체 지점 1곳**: `apps/web/src/widgets/subpage-content/ui/SubpageBlockRenderer.tsx` 하나만 교체. admin CRUD와 DB는 무변경
- **새 블록 타입 추가 절차 4곳**: `PageBlockType` enum → `configSchemaByType` 맵 → `features/block-management/ui/fields/` 새 필드 컴포넌트 → `SubpageBlockRenderer` case

### 서브페이지 버전 관리 (Stage 7m)

서브페이지의 모든 메타 + PageBlock 배열을 스냅샷 JSON으로 저장해 이력 조회/롤백을 지원. 감사 로그와 독립된 "콘텐츠 스냅샷" 시스템.

#### 저장 트리거 (의미 있는 체크포인트만)

| 트리거                                    | sourceAction   | 생성 주체                                  |
| ----------------------------------------- | -------------- | ------------------------------------------ |
| 편집 페이지 [버전 저장] 버튼              | `MANUAL`       | 운영자 명시적                              |
| `Subpage` PATCH 중 DRAFT → PUBLISHED 전환 | `AUTO_PUBLISH` | 서버 자동 (try/catch, 주 액션 차단 안 함)  |
| `restoreSubpageFromVersion` 트랜잭션 내부 | `PRE_ROLLBACK` | 롤백 직전 현재 상태 자동 백업 (label=null) |

- **블록 reorder 및 블록 CUD는 개별 버전을 만들지 않음** — 노이즈 폭증 방지. 운영자가 의미 있는 지점에만 [버전 저장]을 명시적으로 누르는 흐름
- `/api/subpages/[id]/blocks/reorder`에 "버전 생성 안 함" 주석 명시

#### 메모 구조 (깃 커밋 스타일)

- `SubpageVersion.label String? @db.Text` 단일 필드 (최대 10,000자, 선택 입력)
- 첫 줄 = 요약(subject), 빈 줄 이후 = 본문(body). `parseVersionLabel(label)`이 `/^([\s\S]*?)\n[ \t]*\n([\s\S]*)$/` 정규식으로 분리
- 목록 표시: `subject` 72자까지 (`SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT`), 초과 시 `…` + hover tooltip에 원본. `formatVersionSubject` 헬퍼
- 상세 Dialog: 최상단 "메모" 섹션에 subject(`text-lg font-semibold`) + body(`<pre className="whitespace-pre-wrap font-sans">`)
- **빈 메모 허용**: `label=null` 저장 가능 → 목록에서 `sourceAction` 기반 fallback 텍스트 ("(메모 없음)" / "발행 전환 시 자동 저장" / "다른 버전으로 복원 직전 자동 저장") — 시스템 기본 문구를 DB에 저장하지 않고 UI에서만 파생

#### 낙관 동시성 (`Subpage.revision Int @default(0)`)

**rollback 엔드포인트(`/api/subpages/[id]/versions/[versionId]/rollback`)에서만** `expectedRevision` 수신 → 불일치 시 `409 { code: 'REVISION_MISMATCH' }`. 메타 PATCH와 블록 CUD/reorder는 revision guard 없음 + revision++ 없음

- 보호 범위: rollback은 본질적으로 파괴적(PRE_ROLLBACK 스냅샷 → 전체 meta/blocks overwrite)이라 "rollback 직전 stale 상태에 기반한 복원" 차단이 필요
- **메타 PATCH에서 guard 제거한 이유**: 실사용 검증 중 React Query `staleTime: 60s` + Server Component `prefetchQuery` + Next.js route cache가 상호작용해 SubpageEditClient의 `useQuery(subpageDetailOptions)` 데이터가 stale한 상태로 SubpageForm에 props 전달. 사용자가 혼자 디바이스에서 저장을 반복해도 `initialData.revision`이 서버 최신값보다 뒤처져 반복 409 발생. 사용자 UX 우선으로 guard 제거
- **블록 CUD/reorder에서 guard 제거한 이유**: 같은 편집 페이지에 SubpageForm + BlockManager 공존. 블록 CUD가 revision을 올리면 SubpageForm의 stale cache revision이 refetch 완료 전이라 연쇄 race. 블록은 자체 id 단위 보호로 충분
- `Subpage.revision` 컬럼은 유지 — `restoreSubpageFromVersion` 트랜잭션 안에서만 `increment: 1`. rollback 요청 시 클라이언트(SubpageView)가 `data.revision`(useQuery 최신)을 `RestoreVersionAlertDialog`의 `subpageRevision` prop으로 직접 전달
- `ApiResponse<T>`에 `code?: string` 옵션 추가 (backward compat)

#### 롤백 정책 (소프트 롤백)

`restoreSubpageFromVersion` 트랜잭션:

1. revision 낙관 락 검사 (불일치 시 `RevisionMismatchError` → 409)
2. 현재 상태를 `PRE_ROLLBACK` 버전으로 자동 백업
3. slug 충돌 검사 (다른 Subpage가 이미 차지 시 `SubpageVersionSlugConflictError` → 409 + `VERSION_SLUG_CONFLICT` code)
4. Subpage 메타 덮어쓰기 + `revision++`
5. `pageBlock.deleteMany` → 스냅샷 블록 `createMany` (id는 새 cuid로 재생성)

검색용 `Subpage.content`(PGroonga plain text)는 트랜잭션 후 route handler가 `recalculateSubpageContent` 별도 호출 (블록 CUD와 동일 2단계 패턴)

**상태 전략**: `KEEP_CURRENT` (기본) = 본문만 복원 + status 유지 / `APPLY_VERSION` = 버전의 status까지 적용 (PUBLISHED 전환 위험 → 기본 아님)

#### Media 참조 추적 (advisor option 2)

`findMediaReferences()` 확장 **안 함** — 확장 시 장기 운영 Subpage의 Media 삭제가 사실상 불가능해짐. 대신 `findDanglingMediaIds(snapshot)` 헬퍼로 롤백 시점에 누락된 Media ID 감지:

- IMAGE 블록의 `configJson.imageMediaId`
- RICH_TEXT 블록 Tiptap JSON 내 `image` 노드의 `attrs.mediaId` (재귀 수집)
- 차집합 = dangling → UI에 경고 + 체크박스 "누락된 이미지를 인지했습니다" ack 후 롤백 허용

#### 보존 정책

- `isPinned=false` 버전 Subpage당 **30개** 상한 (`SUBPAGE_VERSION_RETENTION_LIMIT`)
- `isPinned=true`는 상한에서 제외 — 운영자가 중요 버전 "고정"으로 영구 보존
- **lazy cleanup** in save handler: `createSubpageVersionSnapshot` 직후 `enforceRetention` 호출 → 오래된 non-pinned부터 삭제 (cron 없음)
- 시간 기반 보존(ErrorLog의 90일)보다 개수 상한이 운영자 직관에 맞음

#### API Routes (6개)

| Method | Route                                              | 권한            | 용도                                                                       |
| ------ | -------------------------------------------------- | --------------- | -------------------------------------------------------------------------- |
| GET    | `/api/subpages/[id]/versions`                      | subpages:read   | 목록 (filter: authorId, from, to, pinnedOnly, source) + 페이지네이션       |
| POST   | `/api/subpages/[id]/versions`                      | subpages:update | 수동 저장 (body: `{ label? }`, sourceAction=MANUAL)                        |
| GET    | `/api/subpages/[id]/versions/[versionId]`          | subpages:read   | 상세 (snapshot + danglingMediaIds)                                         |
| POST   | `/api/subpages/[id]/versions/[versionId]/rollback` | subpages:update | 복원 (body: `{ expectedRevision, statusStrategy?, acknowledgeDangling? }`) |
| PATCH  | `/api/subpages/[id]/versions/[versionId]`          | subpages:update | `isPinned` 토글                                                            |
| DELETE | `/api/subpages/[id]/versions/[versionId]`          | subpages:update | 삭제 (pinned는 400)                                                        |

**권한은 `subpages:update` 재사용** — 별도 리소스 신설 안 함 (seed/role migration 부담 회피)

#### UI 구성

- **SubpageView (`/subpages/[id]`) 툴바**: `[미리보기] [사이트 보기] [버전 저장] [삭제] [편집]` 순. `SaveVersionButton`은 **뷰 페이지**에 배치 — 이 버튼은 현재 DB 상태를 스냅샷하는 것이지 편집 중인 값을 저장+스냅샷하는 것이 아니므로 편집 페이지가 아닌 뷰 페이지가 맥락상 일치. 편집 페이지에 두었던 초기 구현은 "저장 전엔 버전 저장이 안 된다"는 운영자 혼란을 유발해 이관
- **SubpageView 우측 컬럼**: `RecentVersionsCard` (최근 5개 요약 + [전체 이력 보기])
- **VersionHistoryDialog**: 전체 이력 (작성자/날짜/소스/pinned 필터 + 페이지네이션 + 상세/복원/핀/삭제 액션)
- **VersionDetailDialog**: 최상단 메모 → 메타 diff 표 → `BlockDiffSummary` → `BlockContentView` 재사용 (스냅샷 블록을 `PageBlockListItem[]` shape로 매핑) → dangling media 경고
- **RestoreVersionAlertDialog**: 상태 전략 Select + dangling 체크박스 ack — 부모가 `<... key={rollbackVersionId}>`로 리마운트시켜 state 초기화 (React Compiler `useEffect` + `setState` cascading render 경고 회피)

##### UI 경험칙 — Dialog × Form 함정

- **Dialog form submit의 외부 form 버블링 방지**: `SaveVersionButton`처럼 내부에 `<form onSubmit>`을 가진 Dialog를 바깥 SubpageForm/페이지 레벨 `<form>` 안에 배치할 때, React 이벤트 버블링은 `createPortal`과 무관하게 virtual DOM 기준으로 동작하므로 Dialog 내 submit이 외부 form의 onSubmit까지 도달한다. 두 방어를 함께 적용:
  1. Dialog를 여는 trigger 버튼에 **`type="button"` 명시** (shadcn `Button` 기본 type="submit"이라 외부 form submit 트리거 발생)
  2. Dialog 내부 `<form>`의 submit 핸들러에서 `e.preventDefault()` + **`e.stopPropagation()`** 호출 후 `handleSubmit(...)(e)` 호출
  - 두 토스트(예: "버전이 저장되었습니다" + "기본 정보가 저장되었습니다")가 동시에 뜨는 증상으로 발견
- **Base-UI Select — `<SelectValue />` 대신 `<span>` 직접 렌더**: 트리거 내부에 `<span>{조건부 한글 라벨}</span>`로 현재 값의 표시 텍스트를 직접 제어. `<SelectValue />`가 value(예: `'KEEP_CURRENT'`) 그대로를 노출하는 케이스 회피. 기존 `SubpageForm`의 Select 패턴(`<SelectTrigger><span>{field.value === 'PUBLISHED' ? '발행' : '초안'}</span></SelectTrigger>`)과 일관
- **Dialog state 초기화는 `key`로 리마운트**: 열릴 때마다 state 초기화가 필요한 경우 `useEffect([open])` 내부 `setState`는 React Compiler ESLint `cascading renders` 경고 대상. 부모가 `<Dialog key={...}>`로 리마운트시켜 useState 기본값으로 자연 초기화하는 패턴 권장

#### 감사 로그

- `entityType: SUBPAGE_VERSION`:
  - 수동 저장: `CREATE`, `changes: { after: { versionId, label, sourceAction: 'MANUAL' } }`
  - Pin 토글: `UPDATE`, `changes: { before: { isPinned }, after: { isPinned } }`
  - 삭제: `DELETE`, `changes: { before: { versionId, sourceAction, label } }`
  - AUTO_PUBLISH/PRE_ROLLBACK은 AuditLog 기록 없음 (주 액션의 부수 효과 — 롤백 자체의 `SUBPAGE UPDATE` 로그에 `preRollbackVersionId` 포함)
- 롤백 자체: 기존 `entityType: SUBPAGE` + `action: UPDATE` + `entityTitle` "(롤백)" suffix + `changes.after = { rolledBackFromVersionId, preRollbackVersionId, statusStrategy, newRevision }`

#### drive-by 정리

- 기존 `/api/subpages/[id]` PATCH audit `changes`에 `seoTitle`/`seoDescription` 누락 gap 해소 — Stage 7m 같은 커밋에서 추가

### 게시판 CRUD

- 이름, slug, 설명, 스킨 타입(LIST/GALLERY), 공개 여부
- slug: 이름 기반 자동 생성 + 수동 수정, 중복 불가
- 공개 게시판 slug 변경 시 경고
- 삭제 시 소속 게시글 존재 여부 + 메뉴 참조 확인 → 있으면 차단 (앱 레벨 참조 무결성)
- 목록 필터: 공개 여부 (전체/공개/비공개)
- **뷰/편집 분리**: `/boards/[id]` = 읽기 전용 뷰, `/boards/[id]/edit` = 편집 폼
- **권한 기반 UI**: 생성(`boards:create`), 편집(`boards:update`), 삭제(`boards:delete`) 버튼을 권한별 표시/숨김
- API Routes: `GET/POST /api/boards`, `GET/PATCH/DELETE /api/boards/[id]` — 모든 핸들러에 `requirePermission()` 적용
- FSD: `features/board-management/`, `pages/board-management/`

### 게시글 CRUD

- 제목, 본문(Tiptap JSON), 게시판 소속, 작성자(자동 설정)
- **SEO (Stage 9)**: `seoTitle String?`(max 200) / `seoDescription String? @db.Text`(max 500) 필드. PostForm 좌측 콘텐츠 컬럼 하단 "SEO" Card + PostView 우측에서 둘 중 하나라도 있을 때 SEO Card 조건부 렌더. 빈 문자열은 `.trim() || null`로 DB에 null 저장. audit diff(CREATE/UPDATE) 포함. 공개 웹 `generateMetadata`가 `seoTitle ?? title`, `seoDescription ?? summarizeContent(content)` 3단 폴백
- draft / published 상태, 발행일 관리
- slug: 게시판 단위 unique (`@@unique([boardId, slug])`), 생성 시 서버가 opaque random slug를 자동 발급. 작성/편집 폼에서 직접 입력하지 않으며 편집 저장 시 기존 slug 유지
- 게시판 변경 허용 (편집 시 다른 게시판으로 이동 가능)
- 목록 필터: 상태(전체/초안/발행) + 게시판(Select 드롭다운)
- 대표 이미지: Media 관리 구현 후 연동 예정 (1차 생략)
- **뷰/편집 분리**: `/posts/[id]` = 읽기 전용 뷰, `/posts/[id]/edit` = 편집 폼
- **권한 기반 UI**: 생성(`posts:create`), 편집(`posts:update`), 삭제(`posts:delete`) 버튼을 권한별 표시/숨김
- API Routes: `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/[id]` — 모든 핸들러에 `requirePermission()` 적용
- FSD: `features/post-management/`, `pages/post-management/`
- TiptapEditor: `shared/ui/TiptapEditor.tsx` (subpage와 공유)

### 메뉴 관리

- NavigationMenu (메뉴 묶음): `slots` 배열로 공개 웹 배치 위치 지정 (HEADER/FOOTER/SIDEBAR)
  - 하나의 메뉴를 여러 슬롯에 동시 배치 가능 (예: 같은 메뉴를 헤더+푸터에 사용)
  - 각 슬롯에는 하나의 메뉴만 배정 가능 (앱 레벨 유일성, `slots: { has: slot }` 쿼리로 검증)
  - admin UI에서 체크박스 그룹으로 복수 선택
  - 메뉴 설정(이름/설명/슬롯) 수정: 메뉴 편집 페이지의 "메뉴 설정" Dialog
- NavigationMenuItem (메뉴 항목): label, itemType, 연결 대상, parentId, isVisible, displayOrder, openInNewTab, 노출 기간(startDate/endDate)
- **항목 타입**: GROUP(링크 없는 그룹/토글), SUBPAGE(subpageId), BOARD(boardId), EXTERNAL(url), CUSTOM(경로)
- HEADER 슬롯에서 하위 메뉴가 있는 1depth는 GROUP 사용을 기본값으로 한다. 공개 웹 KRDS PC GNB는 1depth 클릭을 하위 메뉴 토글로 사용하므로, 이동 링크는 2depth 이하에 둔다.
- 최대 3depth (parentId 자기참조, 3단계 이상 서버 차단)
- 연결은 엔티티 참조 방식 우선 (URL 직접 입력 아님), slug 변경 시 메뉴 안 깨짐
- 메뉴명: 엔티티 연결 시 label 자동 채움, 이후 수동 수정 가능
- dnd-kit으로 같은 부모 내 드래그&드롭 순서 변경
- UI: `/navigation` = 카드형 메뉴 세트 목록, `/navigation/[menuId]` = 트리 편집 + 항목 Dialog
- **권한 기반 UI**: 생성(`navigation:create`), 편집(`navigation:update`), 삭제(`navigation:delete`)
- API Routes: `GET/POST /api/navigation`, `GET/PATCH/DELETE /api/navigation/[menuId]`, `POST /api/navigation/[menuId]/items`, `PATCH/DELETE /api/navigation/[menuId]/items/[itemId]`, `PATCH /api/navigation/[menuId]/reorder`
- FSD: `features/navigation-management/`, `pages/navigation-management/`
- 미리보기: 2차 범위

### 메인 페이지 관리

- 일반 서브 페이지와 분리된 **섹션 기반 관리**
- 레이아웃은 코드에서 통제, 운영자는 섹션 데이터+순서 관리
- **고정 세트 모델** (Stage 5a): 10개 타입 각 1개씩 seed로 생성, 추가/삭제 UI 없음 — R/U만 지원
  - 타입: HERO, BRIEF_INTRO, SUB_CAROUSEL, FREQUENT_MENU, RECOMMENDED, SHORTCUT, LATEST_POSTS, GALLERY_COLLECTION, CTA, NOTICE
- 섹션별 `configJson` 스키마 (Zod, `features/home-management/model/homeSchemas.ts`):
  - **HERO**: slides[]: `{imageUrl, imageAlt, title, description?, url?}` (최대 10개, 1개=단일 배너, 2개 이상=슬라이드) + slideOptions
  - **BRIEF_INTRO**: heading, description?, imageUrl?, imageAlt?, linkLabel?, linkUrl?, mediaId? — 간략 소개 영역
  - **RECOMMENDED**: heading, description?, items[]: `{imageUrl, imageAlt, title, description?, url?}` (최대 12개, 자유 갤러리) + slideOptions
  - **SHORTCUT**: heading, description?, items[]: `{label, description?, url}` (최대 8개)
  - **LATEST_POSTS**: heading, description?, boardId(nullable), limit(1~10) — 지정 게시판 최신 N개 자동 표시
  - **GALLERY_COLLECTION (갤러리 모아보기)**: heading, description?, boardIds[](1~12), boardTabLabels?, limit(1~12) — 여러 공개 게시판의 최신 게시글을 KRDS Line 탭 + 갤러리 카드로 표시. 게시판별 공개 탭 이름은 수동 입력 가능하며 빈 값은 게시판명으로 폴백
  - **CTA**: heading, description?, buttonLabel, buttonUrl
  - **NOTICE (대표 게시판)**: heading, description?, boardId(nullable), limit(1~10) — 선택한 게시판의 중요 게시글 최신 1건 + 일반 최신글 N개 자동 표시
- **SlideOptions 공통 스키마** (HERO, RECOMMENDED):
  - `showPrevNext`, `showPlayPause`, `showDots`: boolean 토글
  - `autoPlay`, `autoPlayInterval`(ms, 1000~30000): `showPlayPause=true`일 때만 의미
  - `SlideOptionsPanel` 컴포넌트가 두 섹션 Fields에서 재사용됨
- 이미지는 **외부 URL 입력 + 파일 업로드** 모두 지원
  - `ImageUrlInput` 공통 컴포넌트: URL text input + [파일 선택] 버튼 + 미리보기 + 제거 버튼
  - 업로드 API: `POST /api/media/upload` (multipart/form-data, `file` + `category='home'`)
  - 스토리지: 루트 AGENTS.md "파일 업로드 스토리지 정책" 참조 (`STORAGE_PROVIDER=local|supabase`)
  - Media 테이블에 레코드 생성 + `MEDIA` 감사 로그 기록
- 링크 URL은 optional — 입력 시 해당 슬라이드/카드 전체가 `<Link>`로 감싸짐. **Stage 7i부터 모든 fields(CTA/Hero/Recommended/Shortcut/Notice)의 URL 입력이 `@/entities/link-target/ui/LinkTargetInput` 공용 컴포넌트로 통합** — NONE/SUBPAGE/BOARD/EXTERNAL 분기 입력으로 slug 변경에 안전. CtaFields + ShortcutFields는 url 필수라 `allowNone={false}` 전달
- URL은 내부 경로(`/about`)와 외부 URL(`https://...`) 모두 허용
- **Tiptap 미사용** — 모든 섹션을 단순 text 필드로 관리
- **UI**: `/home` 단일 페이지, 고정 섹션 카드 + dnd-kit 드래그 순서변경 + 노출토글 + 타입별 편집 Dialog
  - slides/items 순서 조정은 useFieldArray + 위/아래 화살표 버튼 (해당 폼 내부)
- **권한 기반 UI**: 편집/순서변경/노출토글 버튼을 `usePermission('home', 'update')`로 게이팅
- API Routes:
  - `GET /api/home` — 섹션 목록 (`home:read`)
  - `GET/PATCH /api/home/[id]` — 단건 상세/수정 (`home:read`/`home:update`)
  - `PATCH /api/home/reorder` — 순서 변경 + 트랜잭션 루프 (`home:update`)
  - `GET /api/home/references` — Edit Dialog 드롭다운용 `{subpages, boards, posts}` 묶음 (`home:read`)
- 감사 로그 entityType: `HOME_SECTION`, action `UPDATE`만 사용
  - 편집: `{ before, after }` diff 기록 (변경 필드만)
  - 순서변경: `{ after: { reorderedSections: '6건' } }`
- FSD: `features/home-management/`, `pages/home-management/`
- 참고: 시안 확정 후 web의 섹션 컴포넌트를 대체하는 흐름으로 설계됨 (admin UI는 안정)

### 메인 팝업 관리 (Stage 5b)

- 라우트: `/popups`, `/popups/new`, `/popups/[id]`, `/popups/[id]/edit` (구 `/home/popups/*` → 308 redirect)
- FSD: `features/popup-management/{api,model,ui}`, `pages/popup-management/ui`
- 권한 리소스: `home-popups` (create/read/update/delete) — 섹션 관리와 분리

#### 팝업 타입

- **콘텐츠형(CONTENT)**: 제목 + Tiptap JSON 본문 + 버튼 라벨/링크(optional)
  - Tiptap JSON 저장 + `content`(plain text) 동시 저장 — `extractTextFromTiptap()` 사용
- **이미지형(IMAGE)**: 이미지 + alt(필수) + 링크(optional)
  - `imageMediaId` FK로 Media 라이브러리 참조 추적 — `findMediaReferences()` 확장 대상
  - `ImageUrlInput` 재사용 (URL 직접 입력 + 업로드 + 라이브러리 선택)

#### 노출 정책

- `isVisible` 토글, `startDate`/`endDate` optional (둘 다 또는 어느 쪽만)
- `startDate ≤ endDate` 검증 (client + server)
- `displayOrder`는 생성 시 자동 배정 (max + 1), dnd-kit 드래그로 재정렬

#### 링크 입력 (LinkTargetInput)

- **위치**: `apps/admin/src/entities/link-target/ui/LinkTargetInput.tsx` (Stage 7i에서 `features/popup-management` → `entities/link-target` 승격 — admin 전반 URL 입력의 공용 컴포넌트). 쿼리는 `entities/link-target/api/linkTargetReferencesQueries.ts`의 `linkTargetReferencesOptions`
- 단일 `linkUrl` 필드로 저장하되 admin UI는 유형별 분기 Select + 입력:
  - **없음**: linkUrl = '' (`allowNone={false}`이면 옵션 hide)
  - **서브페이지**: 발행된 Subpage 드롭다운 → `/p/{slug}` 자동 생성
  - **게시판**: 공개 Board 드롭다운 → `/board/{slug}` 자동 생성
  - **외부 URL**: 자유 입력 (`https://...`)
- 편집 시 저장된 URL을 파싱해 어느 탭이 활성인지 자동 추론 (references 캐시 기반). 매칭 실패 시 EXTERNAL 폴백 + 원본 url 보존
- **`allowNone?: boolean` prop** (default true): url이 필수 필드인 호출자(CtaFields/ShortcutFields)는 `false` 전달
- **Stage 7i 사용처**: popup(content/image), home-management(CTA/Hero/Recommended/Shortcut/Notice). API endpoint는 Stage 7k-1에서 `/api/link-target/references`로 rename 완료 (의미 일관성 확보)

#### API Routes

| Method | Route                         | 필요 권한          | 용도                                                                         |
| ------ | ----------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| GET    | `/api/home-popups`            | home-popups:read   | 목록 (모든 상태 포함)                                                        |
| POST   | `/api/home-popups`            | home-popups:create | 생성 + displayOrder 자동 배정                                                |
| GET    | `/api/home-popups/[id]`       | home-popups:read   | 상세                                                                         |
| PATCH  | `/api/home-popups/[id]`       | home-popups:update | 수정 (타입 전환 시 반대 필드 초기화)                                         |
| DELETE | `/api/home-popups/[id]`       | home-popups:delete | 삭제 + displayOrder 정규화                                                   |
| PATCH  | `/api/home-popups/reorder`    | home-popups:update | 순서 일괄 변경                                                               |
| GET    | `/api/link-target/references` | home-popups:read   | LinkTargetInput 드롭다운용 (Stage 7k-1 rename, 권한은 home-popups:read 유지) |

#### 감사 로그

- entityType `HOME_POPUP`, CREATE/UPDATE/DELETE 모두 기록
- reorder는 요약 로그 (`entityTitle: '메인 팝업 순서 변경'`)

### 미디어 라이브러리 관리 (Stage 5a-2)

- 라우트: `/media`
- FSD: `features/media-management/`, `pages/media-management/`
- 권한 리소스: `media` (create/read/update/delete)

#### 라이브러리 UI (`/media`)

- 그리드 카드 (썸네일 + 원본 파일명 + 크기 + 업로더 + 등록일)
- 필터: 검색(파일명/alt) + MIME 타입 (image/jpeg/png/gif/webp/svg)
- 페이지네이션 (URL `page` 파라미터)
- 상세 Dialog: 미리보기 + 메타데이터 + alt 편집 + 사용처 표시 + 삭제 버튼
- 권한 게이팅: 업로드 버튼은 `media:create`, alt 편집은 `media:update`, 삭제는 `media:delete`

#### 중복 방지 + 참조 추적

- 업로드 시 SHA-256 해시 계산 → 동일 바이너리 발견 시 기존 Media 재사용 (`reused: true`)
- 삭제 전 `findMediaReferences()`로 사용처 스캔 (Subpage/Post FK + HomeSection JSONB + Tiptap contentJson 재귀)
- 사용 중이면 409 차단 + 사용처 목록 표시 → 강제 삭제 불허
- 헬퍼 위치: `features/media-management/lib/findMediaReferences.ts`

#### MediaPicker + ImageUrlInput 재사용

- 위치: `entities/media/ui/MediaPicker.tsx`, `entities/media/ui/ImageUrlInput.tsx` (Task 0에서 공용 UI를 entities로 하강)
- MediaPicker 구성: Dialog + Filters + Grid + Pagination + UploadButton
- 사용처:
  1. `/media` 페이지 메인 (페이지 prefetch + internal Dialog)
  2. `ImageUrlInput` 내부 자동 연동 (URL 입력 + 업로드 + 라이브러리 선택 3방식)
  3. `TiptapEditor` 본문 툴바 [이미지 → 라이브러리]
  4. Stage 6 이후 `ImageBlockFields` (서브페이지 이미지 블록 편집)
- 업로드 성공 시 자동 onSelect + Picker 닫힘 (UX 최적화)

##### ImageUrlInput 단일 onChange 패턴 (React 18 배칭 주의)

`ImageUrlInput`은 url/mediaId/originalName 3필드를 **하나의 `onChange`** 콜백으로 묶어 전달한다 (`onChange(next: ImageUrlInputValue)`). 각 필드별 개별 콜백(`onChange`, `onMediaIdChange`, `onOriginalNameChange`)을 순차 호출하던 초기 설계는 React 18+ 자동 배칭 환경에서 **closure value 덮어쓰기 버그**를 일으켰다 — 단일 useState 객체로 관리하는 호출 측에서 뒤의 setState가 앞의 setState를 덮어써 업로드 후 imageUrl이 빈값이 되는 증상. 지금은 단일 콜백으로 일괄 업데이트하여 해결.

- 호출 측이 **useState 객체**로 상태 관리(block-management): 한 번의 setter로 3필드를 함께 병합
  ```tsx
  <ImageUrlInput
    value={value.imageUrl}
    mediaId={value.imageMediaId ?? null}
    onChange={(next) =>
      onChange({ ...value, imageUrl: next.url, imageMediaId: next.mediaId })
    }
  />
  ```
- **react-hook-form**으로 필드별 관리(home-management, popup-management): setValue를 필드별로 호출 (RHF 내부 상태가 필드별 독립이라 순차 호출 안전)
  ```tsx
  onChange={(next) => {
    setValue('imageUrl', next.url, { shouldDirty: true });
    setValue('imageMediaId', next.mediaId, { shouldDirty: true });
    setValue('imageOriginalName', next.originalName, { shouldDirty: true });
  }}
  ```

일반 원칙: **연관된 여러 필드를 동시에 업데이트할 때는 하나의 setState payload로 처리**. 순차 direct-value setState는 React 18 배칭에서 덮어쓰기 버그 유발.

#### Tiptap 본문 이미지 통합

- `packages/editor`의 `ImageWithMediaId`가 기본 Image 확장을 교체 → `mediaId` attr 보존
- `ImageUploadExtension`이 paste/drop 이벤트 인터셉트 → `/api/media/upload` 호출 → 자동 노드 삽입
- 툴바 [이미지] 드롭다운: [파일 업로드] / [라이브러리] / [URL 입력] 3가지 진입점
- 외부 URL은 mediaId null (의도적 — Media 무관)

#### API Routes

| Method | Route                        | 권한             | 용도                                                                 |
| ------ | ---------------------------- | ---------------- | -------------------------------------------------------------------- |
| POST   | `/api/media/upload`          | 인증 (역할 불문) | 업로드 (SHA-256 중복 방지, `reused` 플래그)                          |
| GET    | `/api/media`                 | media:read       | 목록 + 필터 + 페이지네이션                                           |
| GET    | `/api/media/[id]`            | media:read       | 상세                                                                 |
| PATCH  | `/api/media/[id]`            | media:update     | alt 편집 (감사 로그 UPDATE)                                          |
| DELETE | `/api/media/[id]`            | media:delete     | 삭제 (참조 시 409, 물리 파일 + DB 삭제)                              |
| GET    | `/api/media/[id]/references` | media:read       | 사용처 목록                                                          |
| POST   | `/api/media/bulk-delete`     | media:delete     | 일괄 삭제 (참조 있는 건 skip, 응답에 `deleted[]` + `blocked[]` 분리) |

#### 일괄 삭제 정책

- 의도적으로 **트랜잭션 미적용** — 참조 있는 건만 제외하고 나머지는 진행 (부분 성공)
- 응답: `{ deleted: string[], blocked: Array<{ id, originalFilename, references }> }`
- UI: `BulkDeleteMediaDialog`가 2단계 플로우 (확인 → 결과) — blocked 있으면 사용처까지 표시
- zod `max(200)` 상한 — DOS 방어
- 감사 로그: 성공 삭제 각각에 `DELETE` 이벤트 (skip된 건은 로그 없음)

#### 이미지 URL 경계 정규화 (admin 3001 ↔ web 3000)

admin은 `/uploads/...` 상대 경로 이미지를 자신의 정적 파일로 해석해 404가 난다. DB에는 상대 경로를 유지하고, admin 표시 경계에서만 절대 URL로 변환한다.

- **썸네일/미리보기(MediaCard, MediaDetailDialog, ImageUrlInput)**: `shared/lib/mediaUrl.ts::resolveMediaPreviewUrl(url)` 호출 — 절대 URL(Supabase/S3)은 그대로 통과, `/uploads/...`만 web 절대 URL로 prefix
- **Tiptap 편집기(`TiptapEditor`)**: `useEditor({ content })`에 전달 전 `preprocessTiptapForAdmin(contentJson)`으로 `image.attrs.src`를 JSON 단계에서 walk 변환. `onUpdate`에서 `editor.getJSON()` 결과를 `postprocessTiptapForSave`로 역변환 후 `onChange` — DB 저장 포맷은 상대 경로 유지
- **Tiptap 뷰 렌더러(`shared/lib/renderContent.ts::renderTiptapContentForAdmin`)**: `preprocess → generateHTML` 파이프라인. HTML 문자열 regex 치환은 resize/래퍼 속성 누락 위험으로 **사용 금지**
- provider 중립: `resolveMediaPreviewUrl`이 절대 URL은 통과시키므로 Supabase Storage/S3 전환 시 해당 렌더링 코드를 고칠 필요 없음

### 회원가입

- 라우트: `/register` (비인증 접근 가능, `/login`과 동일 수준)
- 로그인 페이지에서 "회원가입" 버튼으로 이동
- FSD: `features/auth/` (기존 로그인 기능과 동일 슬라이스)
- 입력 폼: 아이디(username), 이메일(email), 비밀번호, 비밀번호 확인, 이름(name)
- Zod 검증:
  - 아이디: 4~20자, 영문+숫자+밑줄(\_)만 허용, 중복 불가
  - 이메일: 유효한 이메일 형식, optional
  - 비밀번호: 8자 이상
  - 비밀번호 확인: 비밀번호와 일치
  - 이름: 2~50자
- API Route: `POST /api/auth/register` — bcryptjs 해싱 후 PENDING 상태로 User 생성
- 가입 성공 후: "가입 신청이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다." 안내
- 감사 로그: `CREATE`, `USER`, userId는 null (비인증 액션), 비밀번호 해시는 절대 기록하지 않음
- 라우트 그룹: `/register`는 `(auth)` 그룹에 속하므로 별도 인증 설정 불필요

### 사용자 관리

- 라우트: `/users` (최상위 사이드바 메뉴)
- FSD: `features/user-management/`
- 목록 컬럼: 아이디, 이름, 역할(뱃지, PENDING은 "미배정"), 상태(뱃지), 가입일, 액션
- 필터: 상태별 (전체/대기/활성/정지) + q 검색 (username, name)
- 서버 사이드 페이지네이션 (기본 20건)
- 단건 액션:
  - PENDING → 승인(ACTIVE로 변경) / 거절(hard delete)
  - ACTIVE → 정지(SUSPENDED로 변경 + 세션 즉시 삭제)
  - SUSPENDED → 해제(ACTIVE로 변경)
- **정지 가드 (D9)**: `features/user-management/lib/userGuards.ts::assertNotLastSystemAdmin`
  - 이전: `count(status: 'ACTIVE') <= 1` — 마지막 활성 관리자 기준
  - **현재**: 대상 사용자가 총괄 관리자(`role.isSystem=true`)일 때만 검사 → `count(role: isSystem, status: ACTIVE) <= 1`이면 차단
  - 단건 suspend + bulk-suspend 모두 동일 헬퍼 재사용 (`LastSystemAdminError`)
- 자기 자신 정지 불가
- 승인 시 기본 역할(`isDefault: true`) 자동 배정
- 역할 변경: 사용자 목록에서 역할 드롭다운으로 변경 (users:update 권한 필요)
- 총괄 관리자 역할 배정은 총괄 관리자만 가능
- 마지막 총괄 관리자의 역할 변경 불가
- **벌크 액션** (체크박스 선택 + BulkActionBar):
  - 상태별 액션 노출: allPending → [일괄 승인]/[일괄 거절], allActive → [일괄 정지]/[일괄 역할 변경], allSuspended → [일괄 활성화], mixed → 모든 액션 노출
  - bulk API 응답 패턴: `{ updated/deleted: string[], blocked: [{id, username, reason}][] }` (부분 성공)
  - BulkChangeUserRoleDialog: Dialog + role Select (isSystem 역할은 총괄 관리자만 표시)
- 모든 상태 변경 및 역할 변경은 감사 로그 기록 (`entityType: USER`)
- 단건 API Routes: `POST /api/users/[id]/approve`, `DELETE /api/users/[id]`, `POST /api/users/[id]/suspend`, `POST /api/users/[id]/reactivate`, `PATCH /api/users/[id]/role`
- 벌크 API Routes: `POST /api/users/bulk-{approve,reject,suspend,reactivate,role}`

### 내 정보 변경 (프로필)

- 라우트: `/profile` (헤더 사용자 메뉴 또는 사이드바 하단에서 접근)
- FSD: `features/auth/` (회원가입과 동일 슬라이스)
- 기본 정보 변경: 이름 수정 (아이디는 읽기 전용 표시)
- 비밀번호 변경 (별도 섹션):
  - 입력: 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인
  - 현재 비밀번호 검증 필수 (bcryptjs compare)
  - 새 비밀번호: 8자 이상
- API Routes: `PATCH /api/profile` (이름+이메일 변경), `POST /api/profile/change-password`
- 감사 로그:
  - 이름 변경: `{ before: { name: "old" }, after: { name: "new" } }`
  - 비밀번호 변경: `{ after: { passwordChanged: true } }` (비밀번호 값은 절대 기록 금지)

### 감사 로그 (활동 이력)

- 관리자의 모든 데이터 변경 + 인증 이벤트(LOGIN/LOGOUT) 이력 조회
- 읽기 전용 화면 (AuditLog 자체의 생성/수정/삭제 UI 없음)
- 목록: 날짜, 사용자, 액션(뱃지), 엔티티 타입(뱃지)+제목, IP, 상세 버튼
- 필터: shadcn DatePicker(월/년 Select 포함) 날짜 범위 + 액션 타입 + 엔티티 타입 + 사용자 드롭다운
- 상세: Dialog에서 changes JSON의 before(빨간)/after(녹색) diff 표시
- 내보내기: Excel(exceljs) — 날짜 범위 필수, `GET /api/audit-logs/export`
- API Routes: `GET /api/audit-logs` (필터+페이지네이션), `GET /api/audit-logs/export` (Excel 다운로드)
- FSD: `features/audit-log/`, `pages/audit-logs/`

### 웹 에러 로그 (런타임 에러 조회)

- 공개 웹(apps/web)에서 발생한 서버/클라이언트 런타임 에러를 조회하는 운영 도구
- AuditLog(관리자 활동 이력)와 별도 — ErrorLog는 웹 사용자 경험 에러 추적용
- FSD 위치: `src/features/error-log/{api,model,ui}`, `src/pages/error-logs/ui/ErrorLogsPage.tsx`
- 권한 리소스: `errorLogs` (`['read', 'update']`)

#### 라우트

- `/error-logs` — 목록 (필터 + 그룹/개별 뷰 토글 + 페이지네이션)
- 상세는 별도 라우트 없이 목록 내 `ErrorLogDetailDialog`로 표시 (URL 공유 불필요, 감사 로그와 일관성)

#### API Routes

| Method | Route                          | 필요 권한        | 용도                  |
| ------ | ------------------------------ | ---------------- | --------------------- |
| GET    | `/api/error-logs`              | errorLogs:read   | 목록 (개별/그룹 뷰)   |
| GET    | `/api/error-logs/[id]`         | errorLogs:read   | 상세                  |
| PATCH  | `/api/error-logs/[id]`         | errorLogs:update | 개별 해결/미해결 토글 |
| POST   | `/api/error-logs/bulk-resolve` | errorLogs:update | fingerprint 일괄 처리 |

#### 목록 (`/error-logs`)

- 컬럼 (개별 뷰): 시간, 레벨 뱃지, 소스 뱃지, 메시지(첫 줄), URL, 해결 상태, 상세 버튼
- 컬럼 (그룹 뷰): 최근 발생 시각, 레벨, 소스, 메시지, URL, 발생 횟수, 일괄 해결, 대표 상세
- 필터: 레벨, 소스, 해결 상태, 날짜 범위, 메시지·URL 통합 검색(`urlPattern` — OR 조건으로 message + url 동시 검색), 그룹/개별 뷰 토글
- 기본 정렬: `createdAt DESC`, 기본 필터: `resolved=unresolved`, 날짜=최근 1개월
- 서버 사이드 페이지네이션 (기본 20건)
- 그룹 뷰는 Prisma `groupBy` + `_min.isResolved`로 미해결 존재 여부 판정

#### 상세 (Dialog)

- `ErrorLogDetailDialog`: `useQuery(errorLogDetailOptions(id))`로 조회
- 전체 메시지 + 스택 트레이스 (`<pre>`)
- 요청 컨텍스트 grid: URL, method, statusCode, userAgent, IP, referer
- 메타데이터 JSON 포맷팅
- Digest/Fingerprint 표시 — fingerprint 클릭 시 해당 검색 조건 + 그룹 뷰로 이동
- 해결 처리 버튼은 `usePermission('errorLogs', 'update')`로 게이팅

#### 해결 처리

- 개별 토글: `PATCH /api/error-logs/[id]` body `{ isResolved: boolean }`
- 일괄 처리: `POST /api/error-logs/bulk-resolve` body `{ fingerprint, isResolved }` — `prisma.errorLog.updateMany` 한 번에 갱신
- 양쪽 모두 `logAuditEvent()` 호출 (`entityType: 'ERROR_LOG'`, `action: 'UPDATE'`, fire-and-forget)
- 개별: `changes: { before: { isResolved }, after: { isResolved } }`, entityId = 에러 로그 ID
- 일괄: `changes: { after: { fingerprint, count, isResolved } }`, entityTitle = `fingerprint: <hash>`

#### 대시보드 위젯

- 파일: `src/features/error-log/ui/ErrorLogDashboardWidget.tsx` (Server Component)
- 3개 StatCard: 최근 24시간 / 최근 7일 / 미해결 건수
- `hasPermission(user, 'errorLogs', 'read')` 체크 → 권한 없으면 `null` 반환 (대시보드에서 아예 미노출)
- `src/pages/dashboard/ui/DashboardPage.tsx`에서 기본 StatCard 그리드 아래에 렌더링

### 사이트 설정 관리

- **SettingsNav 8탭**: 도메인 | 보안 | 업로드 | 권한 | 브랜딩 | 푸터 | SEO | 시연 스냅샷 (탭은 Stage 2f 이후 점진 확장됨)
- DB 헬퍼: `packages/db/src/siteSettings.ts` (getSiteSetting/setSiteSetting), `packages/db/src/uploadRestriction.ts` (getUploadRestrictions/validateFileUpload)
- 라우트: `/settings/domain`
- FSD: `features/site-settings/` (api, model, ui)
- API Routes: `GET/PATCH /api/settings/domain`, `POST /api/settings/domain/check-dns`, `DELETE /api/settings/domain`
- 도메인 입력 (베어 호스트네임, 프로토콜/경로/포트 불허)
- DNS 검증 상태 표시 + DNS 레코드 안내
- 감사 로그 entityType: `SITE_SETTINGS`
- 상세 명세: `docs/react-cms-커스텀-도메인-명세서.md`

### 보안 설정 관리

- 라우트: `/settings/security`
- FSD: `features/site-settings/` (도메인 설정과 동일 feature 슬라이스 — 같은 SiteSettings 도메인)
- 기능: 동시 로그인 허용/차단 토글

#### 동시 로그인 설정

- SiteSettings 키: `CONCURRENT_LOGIN_ENABLED` (기본값: `"true"`)
- UI: on/off 토글 스위치 + 설명 텍스트
- `"true"` → `"false"` 전환 시 확인 다이얼로그 (기존 세션 관련 안내)
- 설정 변경 시 기존 활성 세션은 즉시 무효화하지 않음 (다음 로그인부터 적용)
- API Route: `PATCH /api/settings/security` (기존 `setSiteSetting` 헬퍼 활용)
- 감사 로그: `SITE_SETTINGS` entityType, `UPDATE` action
  - changes: `{ before: { CONCURRENT_LOGIN_ENABLED: "true" }, after: { CONCURRENT_LOGIN_ENABLED: "false" } }`

#### 세션 강제 정책 (로그인 API)

- 로그인 API 핸들러에서 `CONCURRENT_LOGIN_ENABLED` 설정 조회
- `"false"`이면: `deleteUserSessions(userId)` 호출 후 `createSession(userId)`
- `"true"`이면: 기존 세션 유지, 새 세션 추가 생성
- `(authenticated)` layout에서 `requireAuth()` 호출로 세션 존재 여부 확인 (DB 세션이 없으면 `/login`으로 리다이렉트)

#### 2차 확장 후보

- 활성 세션 목록 표시 (사용자별, 기기/IP/마지막 접근 시각)
- 특정 세션 개별 강제 종료
- `MAX_CONCURRENT_SESSIONS` 키로 세분화 (N개 허용)
- Role별 동시 로그인 정책 분리 (RBAC 도입 후)

### 업로드 제한 설정 관리

- 라우트: `/settings/upload`
- FSD: `features/site-settings/` (도메인/보안 설정과 동일 feature 슬라이스)
- 기능: 파일 업로드 허용 확장자, MIME 타입, 최대 파일 크기 관리

#### SiteSettings 키

| 키                          | 값 형식          | 기본값                | 설명                  |
| --------------------------- | ---------------- | --------------------- | --------------------- |
| `UPLOAD_ALLOWED_EXTENSIONS` | JSON 배열 문자열 | 이미지+문서 확장자    | 허용 파일 확장자 목록 |
| `UPLOAD_ALLOWED_MIME_TYPES` | JSON 배열 문자열 | 이미지+문서 MIME 타입 | 허용 MIME 타입 목록   |
| `UPLOAD_MAX_FILE_SIZE_MB`   | 숫자 문자열      | `"10"`                | 최대 파일 크기 (MB)   |

#### 기본값 확장자/MIME 타입

- 이미지: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- 문서: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.hwp`, `.hwpx`, `.pptx`
- 아카이브: `.zip`

#### UI

- 태그(chip) 입력 방식으로 확장자/MIME 타입 추가/삭제
- 최대 파일 크기: 숫자 입력 (MB 단위)
- 현재 화이트리스트를 삭제 가능한 태그로 표시
- Server Component에서 현재 설정값 조회 → Client Component에 props 전달

#### API Route: `PATCH /api/settings/upload`

- 기존 `setSiteSetting` 헬퍼 활용
- 3개 키를 각각 upsert
- Zod 검증 후 DB 저장 → `revalidatePath('/settings/upload')`

#### Zod 검증

- 확장자: `.`으로 시작, 소문자 영숫자만, 최소 1개 필수
- MIME 타입: `type/subtype` 패턴, 최소 1개 필수
- 최대 파일 크기: 1~100 사이 양의 정수

#### 감사 로그

- `SITE_SETTINGS` entityType, `UPDATE` action
- changes: `{ before: { UPLOAD_ALLOWED_EXTENSIONS: "[...]" }, after: { UPLOAD_ALLOWED_EXTENSIONS: "[...]" } }`

#### SettingsNav 탭 추가

- 기존 domain/security에 upload 탭 추가 (4탭 구성: domain | security | upload | roles)

### 역할/권한 관리

- 라우트: `/settings/roles`
- FSD: `features/role-management/` (site-settings와 별도 슬라이스)
- SettingsNav 4번째 탭

#### UI: 마스터-디테일 레이아웃

- 좌측 패널 (Master): 역할 목록
  - 이름, 설명, 배정 사용자 수, 시스템/기본 뱃지
  - "새 역할 추가" 버튼
  - 기본 역할 설정 기능
- 우측 패널 (Detail): 선택된 역할의 권한 매트릭스
  - 행: 리소스 (한글 라벨, `RESOURCE_ACTIONS`에서 파생)
  - 열: 생성/조회/수정/삭제 체크박스
  - 리소스가 지원하지 않는 액션은 비활성화
  - 총괄 관리자: 모든 체크박스 체크 + 비활성화 (수정 불가)
  - "저장" 버튼으로 일괄 저장 (자동 저장 아님)

#### 역할 CRUD

- 생성: 이름(unique) + 설명(optional) + 권한 매트릭스
- 수정: 이름/설명 변경, 권한 매트릭스 변경 (별도 API)
- 삭제: 시스템 역할/기본 역할 삭제 불가, 배정 사용자 존재 시 경고+확인

#### 리소스 레지스트리 (RESOURCE_ACTIONS)

| 리소스 키     | 표시명            | 지원 액션                    |
| ------------- | ----------------- | ---------------------------- |
| `dashboard`   | 대시보드          | read                         |
| `subpages`    | 서브 페이지       | create, read, update, delete |
| `boards`      | 게시판            | create, read, update, delete |
| `posts`       | 게시글            | create, read, update, delete |
| `navigation`  | 메뉴 관리         | create, read, update, delete |
| `home`        | 메인 페이지       | create, read, update, delete |
| `home-popups` | 메인 팝업         | create, read, update, delete |
| `media`       | 미디어 라이브러리 | create, read, update, delete |
| `users`       | 사용자 관리       | create, read, update, delete |
| `roles`       | 권한 관리         | create, read, update, delete |
| `auditLogs`   | 감사 로그         | read                         |
| `errorLogs`   | 에러 로그         | read, update                 |
| `settings`    | 사이트 설정       | read, update                 |

#### API Routes

| Method | Route                         | 필요 권한    | 용도                  |
| ------ | ----------------------------- | ------------ | --------------------- |
| GET    | `/api/roles`                  | roles:read   | 역할 목록             |
| POST   | `/api/roles`                  | roles:create | 역할 생성             |
| GET    | `/api/roles/[id]`             | roles:read   | 역할 상세 (권한 포함) |
| PATCH  | `/api/roles/[id]`             | roles:update | 이름/설명 수정        |
| DELETE | `/api/roles/[id]`             | roles:delete | 역할 삭제             |
| PATCH  | `/api/roles/[id]/permissions` | roles:update | 권한 매트릭스 변경    |
| POST   | `/api/roles/[id]/set-default` | roles:update | 기본 역할 설정        |

#### 감사 로그 이벤트

| 이벤트              | action | entityType |
| ------------------- | ------ | ---------- |
| 역할 생성           | CREATE | ROLE       |
| 역할 이름/설명 변경 | UPDATE | ROLE       |
| 권한 매트릭스 변경  | UPDATE | ROLE       |
| 역할 삭제           | DELETE | ROLE       |
| 기본 역할 설정      | UPDATE | ROLE       |
| 사용자 역할 배정    | UPDATE | USER       |

### 사이트 브랜딩 + SEO 메타데이터 관리 (Stage 7l)

- 라우트: `/settings/branding` (SettingsNav 5번째 탭)
- FSD: `features/site-settings/` (도메인/보안/업로드 설정과 동일 슬라이스에 추가)
- 권한: 기존 `settings:read|update` 그대로 사용 (변경 없음)

#### SiteSettings 키 (6개)

| 키                       | 값            | 설명                                      |
| ------------------------ | ------------- | ----------------------------------------- |
| `SITE_NAME`              | string        | 헤더 폴백, metadata title, 푸터 copyright |
| `SITE_DESCRIPTION`       | string (≤200) | metadata description                      |
| `SITE_LOGO_MEDIA_ID`     | Media.id      | 헤더 로고                                 |
| `SITE_LOGO_ALT`          | string (≤120) | 로고 sr-only (비우면 SITE_NAME 폴백)      |
| `SITE_FAVICON_MEDIA_ID`  | Media.id      | 브라우저 탭 favicon                       |
| `SITE_OG_IMAGE_MEDIA_ID` | Media.id      | OG 카드 미리보기 (1200x630 권장)          |

- mediaId만 저장 + Media join. URL은 별도 키로 저장하지 않음 (단일 출처 + Media 삭제 시 자동 일관성)
- DB 마이그레이션 0 — SiteSettings 키-값 6개 추가만

#### API Routes

| Method | Route                          | 권한             | 용도                                                 |
| ------ | ------------------------------ | ---------------- | ---------------------------------------------------- |
| GET    | `/api/settings/branding`       | settings:read    | 6키 + 3 Media url join 응답                          |
| PATCH  | `/api/settings/branding`       | settings:update  | 6키 일괄 저장 + 키별 MIME 게이트 + 변경된 키만 audit |
| DELETE | `/api/settings/branding?kind=` | settings:update  | 단일 자산 제거 (`logo`/`favicon`/`og`)               |
| POST   | `/api/media/branding-upload`   | 인증 (역할 불문) | branding 전용 업로드 (SVG 차단, ICO 허용)            |

#### 키별 MIME 화이트리스트 (PATCH server gate)

| 필드             | 허용 MIME                                                     |
| ---------------- | ------------------------------------------------------------- |
| `logoMediaId`    | image/jpeg, image/png, image/webp                             |
| `faviconMediaId` | image/png, image/webp, image/x-icon, image/vnd.microsoft.icon |
| `ogImageMediaId` | image/jpeg, image/png, image/webp                             |

`application/octet-stream`은 의도적 제외 — 일부 브라우저가 valid ICO를 octet-stream으로 보고하지만 임의 바이너리도 같은 MIME이라 스푸핑 위험. 거부 시 PNG 변환 안내.

#### MediaPicker SVG 우회 차단 (defense-in-depth)

- **서버 게이트** (Step 4 PATCH): logoMediaId/faviconMediaId/ogImageMediaId의 Media.mimeType을 화이트리스트로 검증. 사용자가 강제로 PATCH 호출(curl 등) 시에도 최종 차단
- **UX 게이트** (MediaPicker `acceptMimeTypes` prop): 비매칭 카드 **disabled + Tooltip** (hide 아님 — "어제 올린 SVG가 왜 안 보이지?" 혼란 회피)

#### 외부 URL 차단 (Stage 7l 결정)

- `ImageUrlInput`의 `disableUrlInput=true` prop으로 Input readOnly + onChange 가드
- 사유: 외부 URL의 mimeType 검증 불가(HEAD 요청도 spoofing 가능) → SVG 차단 정책 충돌, SSRF 잠재 위험, 외부 도메인 다운/SSL/CORS 시 헤더 깨짐
- 운영자는 라이브러리/업로드만 사용 (toast.error로 안내)

#### 캐시 정책

- 공개 웹: `apps/web/src/shared/lib/brandingCache.ts` 인메모리 60s prod / 5s dev TTL
- admin → web 별 인스턴스라 즉시 invalidate 불가 → "**최대 1분 후 반영**" UI 안내
- favicon은 브라우저 캐시로 추가 수일 지연 가능 — `?v={mediaId}` cache busting

#### 감사 로그

- `entityType: SITE_SETTINGS`, `entityId: SITE_BRANDING` (DELETE는 `entityTitle`에 "(kind 제거)" suffix)
- 변경된 키만 `changes.before`/`changes.after`에 포함 (도메인 패턴 일관성)
- no-op short-circuit: 변경된 키 0개면 audit 기록 skip

#### 신규/확장 컴포넌트

- `BrandingSettingsForm.tsx` — 6필드 (siteName/siteDescription/logo+alt/favicon/og)
- `MediaUploadButton`/`useUploadMedia`/`uploadMedia` — `endpoint?` + `acceptMimeTypes?` prop 추가 (옵셔널 backward compat)
- `MediaCard`/`MediaGrid`/`MediaPicker` — `disabled`/`acceptMimeTypes`/`disabledReason` prop 추가
- `ImageUrlInput` — `endpoint`/`acceptMimeTypes`/`disableUrlInput`/`disabledReason` prop 추가

### SEO 설정 관리 (Stage 9)

- 라우트: `/settings/seo` (SettingsNav 6번째 탭)
- FSD: `features/site-settings/` (도메인/보안/업로드/브랜딩과 동일 슬라이스에 추가)
- 권한: 기존 `settings:read|update` 재사용

#### SiteSettings 키

| 키                           | 값 형식          | 기본값 | 설명                                           |
| ---------------------------- | ---------------- | ------ | ---------------------------------------------- |
| `ROBOTS_ADDITIONAL_DISALLOW` | JSON 배열 문자열 | `[]`   | robots.txt에 `/api/` 외로 추가할 Disallow 경로 |

- 공개 URL + sitemap URL 표시는 SiteSettings.SITE_DOMAIN에서 파생 (읽기 전용 안내)
- `/api/`는 robots.ts가 항상 기본 Disallow로 포함 → 관리자 입력에서 중복 시 서버에서 제거

#### API Routes

| Method | Route               | 권한            | 용도                                                                               |
| ------ | ------------------- | --------------- | ---------------------------------------------------------------------------------- |
| GET    | `/api/settings/seo` | settings:read   | `{ robotsAdditionalDisallow, baseUrl, sitemapUrl }` 응답 (baseUrl/sitemapUrl 파생) |
| PATCH  | `/api/settings/seo` | settings:update | `robotsAdditionalDisallow` 저장 + dedupe + 정렬 비교 no-op short-circuit + audit   |

#### Zod 검증 (`updateSeoSchema`)

- `robotsAdditionalDisallow: z.array(z.string().trim().min(1).max(200).regex(/^\//))` (경로 `/` 시작 강제)
- 배열 `max(50)` — 대량 등록 차단 + 운영 직관

#### UI (`SeoSettingsForm.tsx`)

- 2개 Card 구조
  - **sitemap.xml · robots.txt** Card: 공개 URL 표시 + sitemap URL 링크(새 탭) + "검색엔진 콘솔에 등록하세요" 안내
  - **robots.txt 추가 Disallow** Card: Textarea(한 줄 하나) + Controller로 `string[]` ↔ string 변환
- Textarea ↔ array 변환 헬퍼: `parseTextareaToPaths(text)`/`pathsToTextarea(paths)` (공백 trim + 빈 줄 제거)
- 공통 안내: "`/api/`는 기본 차단됨. 경로는 `/`로 시작, 최대 50개. 공개 웹 반영까지 최대 1분"

#### 감사 로그

- `entityType: SITE_SETTINGS`, `entityId: ROBOTS_ADDITIONAL_DISALLOW`, `entityTitle: 'SEO 설정 (robots.txt)'`
- 변경 전후 정렬 비교로 no-op 시 audit 기록 skip (브랜딩 패턴 일관성)

### 푸터 설정 관리

- 라우트: `/settings/footer` (SettingsNav 브랜딩 다음 탭)
- FSD: `features/site-settings/` (도메인/보안/업로드/브랜딩/SEO와 동일 SiteSettings 슬라이스)
- 권한: 기존 `settings:read|update` 재사용
- SiteSettings 키: `SITE_FOOTER_CONFIG` JSON 문자열
- 관리 필드: `address`, `contacts[]`, `quickLinks[]`, `socialLinks[]`, `bottomLinks[]`, `identifierText`, `copyright`, `hideQuickLinks`, `hideIdentifier`
- 일반 푸터 탐색 링크는 이 화면에서 관리하지 않고 메뉴 관리의 `FOOTER` 슬롯을 KRDS Footer `links`로 매핑한다. `bottomLinks`는 개인정보처리방침/저작권 정책 같은 법적·정책 링크 전용
- API Routes: `GET/PATCH /api/settings/footer` (`settings:read|update`), Zod 검증 후 `setSiteSetting`, 변경 시 `SITE_SETTINGS UPDATE` 감사 로그 기록
- 공개 웹 반영: `apps/web/src/shared/lib/footerConfigCache.ts` 인메모리 60s prod / 5s dev TTL. UI에는 "최대 1분 후 반영" 안내

### 사용자 피드백 관리 (Stage 10)

- 라우트: `/subpage-feedback` ("시스템" 그룹 사이드바)
- FSD: `features/subpage-feedback/{api,model,ui}`, `pages/subpage-feedback/ui/SubpageFeedbackPage.tsx`
- 권한 리소스: `subpage-feedback` (`read`, `delete`) — create/update 미정의 (익명 수신 + 운영자 편집 미도입)
- SubpageForm "공개 옵션" 섹션의 `feedbackEnabled` Checkbox로 페이지별 opt-in 관리. 기본값 false
- 통계 페이지 구성: FeedbackFilters(시작/끝 DatePicker + rating + 서브페이지 + 검색) → FeedbackStatsCards(4개 StatCard, 명시적 날짜 선택 시 "선택 기간 피드백 (N일)" / 미선택 시 "최근 30일 피드백" 라벨 자동 분기) → FeedbackTimelineChart(recharts BarChart 일별 stacked) + FeedbackPositiveReasonsChart(recharts horizontal BarChart) → FeedbackBySubpageTable(긍정율 progress bar, 행 클릭으로 필터 토글) → FeedbackListTable(시간/서브페이지/평가/이유/코멘트/상세)
- **DatePicker가 단일 날짜 출처**: 초기 구현의 "최근 N일" period 드롭다운은 제거됨 (DatePicker와의 우선순위 모호 회피). from/to 미설정 시 통계/내보내기 모두 KST 기준 최근 30일을 서버에서 자동 적용
- **KST 자정 경계 일관 적용**: list/stats/export 세 엔드포인트 모두 `T00:00:00+09:00` ~ `T23:59:59.999+09:00` 사용. DatePicker 출력도 KST 로컬 컴포넌트(`getFullYear/getMonth/getDate`) 기반 — 이전 `toISOString().slice(0,10)` 방식은 9시간 어긋남(잠재 버그)이라 교체. 같은 패턴이 `/audit-logs` export에도 있으므로 별도 추수 작업 후보
- 통계 집계: Prisma `findMany`(from/to 윈도우, KST 자정 경계) + JS 집계. 빈 날짜도 0으로 채워 차트 매끄럽게. period은 `Math.round((until - since) / DAY_MS)`로 계산 (T23:59:59.999 종료라 inclusive day count, `+1` 오프셋 금지 — 추가 시 빈 막대 1개 노이즈)
- recharts v3.3.0 신규 의존성 (admin only). Chart 컴포넌트는 `'use client'` + `ResponsiveContainer`
- 삭제: `FeedbackDetailDialog`에 `usePermission('subpage-feedback', 'delete')` 게이팅 + window.confirm + DELETE → audit log `SUBPAGE_FEEDBACK DELETE` 기록
- **Excel 내보내기**: 페이지 헤더 우측 `<FeedbackExport>` (시작/끝 DatePicker 별도 미보유 — 화면 필터 그대로 사용). 클라이언트는 응답의 `Content-Disposition` 파일명 + `X-Row-Count` 헤더를 읽어 0건은 info 토스트, 그 외는 success 토스트(N건 표시). 권한은 `usePermission('subpage-feedback', 'read')`로 버튼 자체 게이팅 + API에서 `requirePermission` 이중 차단
- API Routes:
  | Method | Route | 권한 | 용도 |
  | ------ | ----- | ---- | ---- |
  | GET | `/api/subpage-feedback` | subpage-feedback:read | 목록 (필터: subpageId/rating/from/to/q + 페이지네이션) |
  | GET | `/api/subpage-feedback/stats` | subpage-feedback:read | 집계 (필터: from/to optional, KST 미설정 시 최근 30일) |
  | GET | `/api/subpage-feedback/export` | subpage-feedback:read | Excel 다운로드 (필터: from/to/rating/subpageId/q optional) + `X-Row-Count` 응답 헤더 + audit log `CREATE` 기록 |
  | DELETE | `/api/subpage-feedback/[id]` | subpage-feedback:delete | 삭제 + 감사 로그 |
- SubpageVersion 스냅샷: `feedbackEnabled` 메타에 포함 → 롤백 시 함께 복원 (Stage 7m 일관)

### 미리보기 (Stage 7a)

- 대상: Subpage, Post (1차 범위). 메인 팝업/메뉴는 2차
- 공개 웹과 동일한 렌더러 사용 — 쿠키 교환으로 크로스 오리진 회피
- `draft` 상태와 `isVisible=false` 블록도 렌더
- 실제 발행과 분리된 읽기 전용 흐름 (감사 로그 기록 없음)

#### 흐름

1. SubpageView/PostView의 `<PreviewButton entityType entityId />` 클릭
2. `POST /api/preview/token` — 권한(`subpages:read`/`posts:read`) 확인 후 `PreviewToken` 레코드 생성(TTL 10분), `{ token, webPreviewUrl, expiresAt }` 반환
3. 클라이언트가 `window.open(webPreviewUrl, '_blank')` — web의 `/api/preview?token=...&type=subpage&id=...`로 이동
4. web이 토큰 DB 검증 후 `preview_session` 쿠키(httpOnly, SameSite=Lax, Max-Age 600) 세팅 + 대상 slug로 302
5. web Server Component가 쿠키를 `validatePreviewSession()`으로 재검증 → draft 포함 조회 + PreviewBanner 렌더

#### FSD 위치

- `entities/preview/{api/previewFetchers.ts, api/usePreviewMutations.ts, ui/PreviewButton.tsx}` — Subpage/Post 양쪽 features에서 공유
- API Route: `app/api/preview/token/route.ts`

#### 환경 변수

- `WEB_BASE_URL` (optional) — admin에서 web URL을 조합할 때 사용. 미설정 시 `NEXT_PUBLIC_SITE_URL` → `http://localhost:3000` 폴백

### 운영 UX (Stage 7c)

#### Dirty 가드 (이탈 경고)

- 페이지 폼: `useDirtyGuard(isDirty)` — Link 클릭 capture + `beforeunload` → `ConfirmLeaveDialog` 표시
- Dialog 폼: `useDialogDirtyGuard(isDirty, onOpenChange)` — ESC/배경클릭 시 isDirty 체크
- 적용: SubpageForm/PostForm/PopupForm/BoardForm + MenuItemDialog/MenuSetEditDialog/SectionEditDialog
- Section Dialog: 6개 타입별 Form이 `useSectionFormDirty` 훅으로 isDirty를 부모에 전파
- Subpage/Post: `isDirty && DRAFT→PUBLISHED` 변경 시 사전 안내 모달 (실수 발행 방지)
- 위치: `shared/lib/useDirtyGuard.ts`, `shared/lib/useDialogDirtyGuard.ts`, `shared/ui/ConfirmLeaveDialog.tsx`

#### 사이트 보기

- `<ViewLiveButton>` — published 콘텐츠를 공개 URL로 새 창에 여는 버튼
- SubpageView/PostView: `status === 'PUBLISHED'`일 때 노출. BoardView: `isPublic`일 때 노출
- AdminHeader: [사이트 메인] 글로벌 버튼
- URL 헬퍼: `shared/lib/siteUrl.ts` — `getWebBaseUrl`, `getSubpagePublicUrl`, `getPostPublicUrl`, `getBoardPublicUrl`

#### 빠른 상태 토글

- 목록에서 상세 진입 없이 status/visibility 인라인 변경
- 신규 API: `PATCH /api/subpages/[id]/status`, `/api/posts/[id]/status`, `/api/home-popups/[id]/visibility`, `/api/boards/[id]/visibility`
- 감사 로그: entityTitle에 "(상태 변경)" / "(공개 변경)" suffix로 메타 PATCH와 구분
- Mutation: optimistic update + onError rollback 패턴
- UI: `<InlineStatusSwitchToggle>` (Switch + 라벨, SubpageTable/PostTable — Stage 14f), `<InlineBooleanToggle>` (Switch + 라벨, BoardTable) 공용 컴포넌트. `<InlineStatusToggle>` (Select, legacy — 호출처 0건, multi-option enum용 보존)
- 권한 없으면 기존 Badge로 fallback

#### 벌크 작업 (Subpage + Post)

- 목록에서 체크박스 선택 → `<BulkActionBar>` 상단 bar로 일괄 삭제/상태변경/게시판이동
- 신규 API (5개): `POST /api/subpages/bulk-delete`, `bulk-status`, `POST /api/posts/bulk-delete`, `bulk-status`, `bulk-move`
- 응답 구조: `{ deleted, blocked }` / `{ updated, failed }` — 미디어 bulk-delete 패턴 그대로
- Zod max(200), 트랜잭션 미사용 (부분 성공 허용), 건별 감사 로그
- selectedIds: `Set<string>` useState, 페이지 간 유지, [전체 해제] 버튼

#### cmd+k 빠른 전환

- `Cmd+K`/`Ctrl+K` → Command Palette 모달 (shadcn `command` + `cmdk`)
- 통합 검색: `GET /api/quick-search?q=&types=subpage,post,board,menu` — 단순 `contains` 매칭, 도메인별 read 권한 필터
- FSD: `features/quick-switcher/` — `CommandPalette.tsx`, `CommandPaletteTrigger.tsx`, `quickSearchQueries.ts`
- 마운트: `(authenticated)/layout.tsx`에 항상 렌더. AdminHeader: [검색 ⌘K] 보조 버튼
- **검색 UX**: debounce 자동 fetch 아님 — Enter 또는 [검색] 버튼으로 명시적 submit. `submittedQuery` state 기반, 미제출 시 `useQuery` enabled=false. Dialog 닫힘/열림 시 query·submittedQuery 양쪽 reset. Enter 키 분기: 입력값 ≠ submittedQuery면 search 실행, 같으면 cmdk 항목 선택에 위임 (e.stopPropagation으로 cmdk 차단)

#### dnd-kit 낙관적 업데이트

- 드래그&드롭 순서 변경 4곳 모두 optimistic update 적용
- `useReorderHomePopups`, `useReorderHomeSections`, `useReorderBlocks`, `useReorderItems`
- onMutate: 캐시에서 displayOrder 즉시 갱신 → UI 즉시 반영 (깜빡임 제거)
- onError: 이전 데이터 롤백 + toast. onSettled: 서버 데이터 재동기화
- Navigation: 트리 구조 재귀 정렬 (`applyReorderToTree`)

### 운영 UX (Stage 7d)

#### 공공누리(KOGL) 라이선스

- `Subpage.cclType`(enum `TYPE_0`~`TYPE_4`, nullable) + `cclAi: Boolean`. null = "표시 없음"
- 라벨/에셋 경로 상수: `packages/types`의 `CCL_TYPE_LABELS`, `CCL_TYPE_ASSET`, `CCL_AI_ASSET` (admin/web 공용)
- SubpageForm 우측 "라이선스(공공누리)" 섹션: 6개 라디오(표시 없음 + 제0~4유형) + AI 체크박스. `cclType === null`이면 AI 체크박스 `disabled + checked=false` 강제. superRefine로 "cclType null + cclAi true" 조합 차단
- SubpageView 메타 카드에 "라이선스" 행 추가
- API `POST /api/subpages`, `PATCH /api/subpages/[id]`, `GET /api/subpages/[id]`가 cclType/cclAi 파싱·저장·반환, 감사 로그에 포함
- 공개 웹 렌더: web의 `widgets/subpage-content/ui/KoglFooter.tsx`가 `<article>` 하단 우측에 마크 이미지. preview용 `getSubpageForPreview` select에도 cclType/cclAi 포함 필수
- 에셋 파일: `apps/web/public/assets/kogl/kogl-type-0.png` ~ `kogl-type-4.png`, `kogl-ai.png` (운영이 공공누리 공식 사이트에서 다운로드 후 배치)

#### 입력 Dialog 표준 규약

새 입력 Dialog(폼/필드를 담은 shadcn Dialog)를 추가할 때 다음 세 규칙을 기본값으로 따른다.

1. **외부 클릭 닫기 차단**: 공용 `<Dialog>` 래퍼는 Base-UI `DialogRoot.Props`를 그대로 spread 전달하므로 호출자가 `<Dialog open onOpenChange disablePointerDismissal>`로 opt-in. 대상: MenuItemDialog, MenuSetEditDialog, BlockEditDialog, MediaDetailDialog, SectionEditDialog, CreateRoleDialog. **AlertDialog는 불필요** — Base-UI v1.3.0 `AlertDialogRoot`가 내부에서 `disablePointerDismissal: true` 강제 + 타입에서 prop Omit으로 이미 차단됨. ESC 닫기는 모든 Dialog에서 유지
2. **Dirty 가드**: react-hook-form `isDirty`를 `useDialogDirtyGuard(isDirty, onOpenChange)`에 넘겨 `safeOnOpenChange` + `confirmDialogProps` 획득 후 `<Dialog onOpenChange={safeOnOpenChange}>` + 하단에 `<ConfirmLeaveDialog {...confirmDialogProps} />`. 입력 중 ESC/취소 시 이탈 확인 모달 표시
3. **오픈 시 폼 초기화**: 성공 저장 후 닫힌 Dialog를 다시 열 때 이전 입력값이 남지 않도록 아래 중 하나를 반드시 적용.
   - (A) `useEffect(() => { if (!open) return; reset(initial); }, [open, editItem, /* 필요한 deps */, reset])` — Dialog가 `open=true`가 될 때마다 초기화. 같은 `editItem`/`parentId`로 연속 오픈해도 reset 재실행됨을 보장하려면 `open`이 의존성 배열에 **반드시 포함**되어야 함
   - (B) mutation `onSuccess` 내에서 `reset()` + `setOpen(false)` 순서로 호출 (예: CreateRoleDialog)
   - (C) 부모에서 `<Dialog key={...} />`로 매번 새 인스턴스 마운트 (예: BlockManager가 `BlockEditDialog`에 `key={editingBlock ? `edit-${id}` : `create-${type}`}` 부여)

#### 중첩 Dialog 시각 계층 (배경 흐림)

- 중첩 시 부모 Popup에 Base-UI가 자동 부착하는 `data-nested-dialog-open` 속성을 공용 `shared/ui/shadcn/dialog.tsx` + `alert-dialog.tsx`의 `Popup` className에서 활용
- 적용 클래스: `transition-[opacity,filter,transform] duration-200 data-[nested-dialog-open]:opacity-60 data-[nested-dialog-open]:blur-[1.5px] data-[nested-dialog-open]:scale-[0.98] data-[nested-dialog-open]:pointer-events-none`
- 효과: 예) MenuItemDialog 편집 중 이탈 경고 `ConfirmLeaveDialog`가 위에 열리면 뒤쪽 Dialog가 부드럽게 뒤로 물러나 보이고 포커스/클릭도 앞 Dialog로만. 개별 Dialog에 추가 설정 불필요

#### 네비게이션 슬롯 라벨

- `features/navigation-management/ui/slotLabels.ts`의 `SIDEBAR` 라벨은 "우측 사이드바". enum 값/DB 값 `SIDEBAR`는 유지 — 공개 웹에서 SIDEBAR 슬롯 메뉴는 우측 `InPageNavigation` 스타일로 렌더

## UI 전략

**문서 분담**: `@design.md`가 시각 결정의 진실원 (색·타이포·간격·primitives). AGENTS.md(이 파일)는 운영 정책·아키텍처 담당. `.storybook/`은 실물 컴포넌트 검증 담당.

- KRDS 미사용
- 디자이너 부재로 **`@design.md` 기반 자체 UI 개편** 방향으로 전환 (Stage 15a). 이전 계획(Figma 시안 확정 후 커스텀 UI 전환)에서 변경. shadcn/ui 계속 사용하되 design.md 토큰과 정합성 관리
- shadcn/ui는 Tailwind CSS + Radix UI 기반이므로 기존 스타일링과 충돌 없음
- shadcn/ui 내장 패턴 활용: Data Table (TanStack Table), Form (react-hook-form + zod), Toast (sonner), Dialog, etc.
- **shadcn/ui 컴포넌트는 `shared/ui/shadcn/`에서 별도 관리** — 직접 코드 수정 금지, design.md 기반 UI 개편과 분리
  - `components.json`의 `ui` alias가 `@/shared/ui/shadcn`을 가리킴 → `npx shadcn add` 시 자동으로 해당 폴더에 설치
  - 커스텀 공통 UI는 `shared/ui/` 루트 또는 `shared/ui/layout/` 등 별도 위치에 배치
- **shadow 토큰 wrapper 패턴 (Stage 15c-2)**: Popover/Select/DropdownMenu/Sheet는 shadcn 원본을 직접 import 금지, 반드시 wrapper를 경유
  - Wrapper 위치: `shared/ui/{Popover,Select,DropdownMenu,Sheet}.tsx` — `Content`류에 `cn('shadow-popover', className)` 1줄 주입
  - ESLint `no-restricted-imports`로 shadcn 원본 4개 직접 import 자동 차단 (wrapper 자신·shadcn 디렉토리 내부는 예외)
  - 신규 컴포넌트 추가 시 반드시 wrapper 경유
- **AlertDialog wrapper (Stage 15c-3c/3e)**: AlertDialog도 shadcn 원본(`shared/ui/shadcn/alert-dialog`) 직접 import 금지
  - Wrapper 위치: `shared/ui/AlertDialog.tsx` — `AlertDialogContent`만 실제 wrapper 함수(`size = 'confirm'` default). 나머지 11개는 단순 re-export
  - size 3-tier: `confirm` (max-w-xs sm:max-w-sm, 기본값) / `default` (max-w-md) / `wide` (max-w-xl). ad-hoc `max-w-*` className 직접 지정 금지
  - ESLint `no-restricted-imports`로 shadcn 원본 직접 import 차단 (wrapper 자신·shadcn 디렉토리 내부는 예외)
  - 이 wrapper는 `shadow-popover`를 **주입하지 않음** — AlertDialog는 `ring-1 ring-foreground/10` 사용 (design.md §5 표에 미포함)
- **ConfirmDeleteDialog (Stage 16d)**: 단일 엔티티 삭제 확인용 공용 컴포넌트 (`shared/ui/ConfirmDeleteDialog.tsx`)
  - 4개 도메인(Subpage/Board/Post/Popup) 삭제 다이얼로그의 공통 쉘. `DeleteXxxDialog`는 이 컴포넌트를 얇게 감싸는 도메인 wrapper
  - Props: `entityName` (따옴표 안에 표시), `dialogTitle`, `isPending`, `onConfirm`
  - 트리거 버튼: `variant="destructive" size="default"`. 이 모양이 아닌 경우(BlockDialog의 `size="sm"`, MenuSetDialog의 `variant="ghost"` 등)는 별도 dialog 유지
  - 기본 설명: `"{entityName}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
- **BulkDeleteDialog (Stage 16d)**: 일괄 삭제 2-phase 공용 컴포넌트 (`shared/ui/BulkDeleteDialog.tsx`)
  - 3개 도메인(Subpage/Post/Media) 일괄 삭제 다이얼로그의 공통 쉘. `BulkDeleteXxxDialog`는 도메인 wrapper
  - Phase machine(`confirm → result`)·`handleClose`·`handleOpenChange`·AlertDialog 쉘 공유, 텍스트와 blocked 항목 렌더링만 도메인별 커스텀
  - 핵심 prop: `useDeleteHook` (도메인 mutation 훅 팩토리), `renderBlockedItem` (blocked 항목 렌더 prop)
  - BulkStatus/BulkMove 같은 도메인 특이 액션은 이 컴포넌트 범위 밖 — 기존 inline Dialog 유지
- **UrlFilterTabs (Stage 16e)**: URL-driven 필터 탭 버튼 그룹 (`shared/ui/UrlFilterTabs.tsx`)
  - Subpage/Post/Board/User 목록의 상태·공개 여부 필터 탭 공통 쉘. 도메인 Filter 컴포넌트(`SubpageStatusFilter` 등)가 options + props만 지정해 얇게 감쌈
  - Props: `options` (값·라벨 배열), `currentValue`, `paramKey` (URL 파라미터 이름), `defaultValue` (ALL 등 초기값), `basePath` (목록 경로)
  - 새 목록 페이지에 필터 탭 추가 시 이 컴포넌트를 직접 또는 도메인 wrapper로 사용
- **Boolean Switch 폼 패턴 (Stage 15c-2)**: boolean 토글 필드는 `BooleanSwitchField` 사용 (`shared/ui/BooleanSwitchField.tsx`)
  - RHF `Controller + Switch + label/description/error` 통합 컴포넌트
  - 목록 인라인 토글은 기존 `InlineBooleanToggle` / `InlineStatusSwitchToggle` 유지 (책임 분리)
  - 적용 폼: SubpageForm(cclAi·feedbackEnabled), BoardForm(isPublic), MenuItemDialog(isVisible·openInNewTab), PopupForm(isVisible). SecuritySettingsForm은 RHF 미사용이라 직접 Switch + controlled AlertDialog 패턴
- **success/warning 시맨틱 토큰 (Stage 15c-3a/3b)**: destructive와 동일 위계의 시맨틱 피드백 색
  - `bg-success` / `text-success` / `bg-success/10` 등 Tailwind utility 사용. raw `green-*`/`amber-*`/`emerald-*` 직접 사용 금지
  - 사용처: 긍정 평가·DNS 정상·성공(success) / pin·DNS pending·slug 경고(warning)
- **Badge wrapper (Stage 15c-3b)**: `shared/ui/Badge.tsx` — success/warning variant 추가. `shared/ui/shadcn/badge` 직접 import 대신 wrapper 사용(신규 호출처에서 자연 채택; 기존은 점진 swap)
  - `<Badge variant="success">` / `<Badge variant="warning">` 사용
  - 기존 shadcn variant(default/secondary/destructive/outline 등)도 동일 인터페이스로 통과
- **chartColors helper (Stage 15c-3b)**: `shared/lib/chartColors.ts` — Recharts `fill`/`stroke`에 CSS 토큰 전달
  - `getChartColors()` — mount 시 `getComputedStyle(document.documentElement)`에서 `--success`/`--destructive`/`--warning`/`--muted-foreground`/`--border`/`--chart-{1-5}` 읽어 반환
  - Recharts는 CSS color 문자열(`oklch(...)`) 모두 허용하므로 변환 불필요
  - fallback: globals.css hex 근사값 (SSR/테스트 환경용)
- **design.md SSOT 검증 (Stage 15c-3a)**: globals.css oklch ↔ design.md YAML hex 간 ΔE 감지
  - `pnpm --filter @simple-cms/admin design:verify` 로 수동 실행 (ΔE > 1.5 시 exit 1)
  - globals.css가 runtime 권위 — ΔE 실패 시 design.md hex를 css→hex 값으로 보정
- **Button wrapper (Stage 15c-3f)**: `shared/ui/Button.tsx` — shadcn 원본(`shared/ui/shadcn/button`) 직접 import 금지, wrapper 경유 필수
  - sm size에 `cn('h-8', className)` override 주입 — 32px baseline 정렬 (shadcn sm 기본 h-7 → h-8)
  - `default`(h-8) / `lg`(h-9) / `xs`(h-6) / `icon` variant는 그대로 통과
  - `buttonVariants` re-export — `cn(buttonVariants({...}))` 패턴 호출처 호환 유지
  - ESLint `no-restricted-imports`로 shadcn 원본 직접 import 자동 차단 (wrapper · shadcn 디렉토리 내부는 예외)
- **폼 컨트롤 height 통일 (Stage 15c-3f)**: PageToolbar/Dialog 내부 모든 폼 컨트롤은 32px baseline (design.md §4.5 참조)
  - `default` / `sm` size 모두 h-8 (32px) — sm은 padding/font/rounded만 차별
  - 영구 예외: 테이블 행 인라인 토글(`InlineStatusSwitchToggle`/`InlineBooleanToggle`), Table thead h-10, Sidebar lg h-12, Input file:h-6
  - `h-{n}` className 직접 override 금지 (size variant로 표현)
- UI 컴포넌트/폼 패턴은 `apps/admin` 내부 레이어에서 관리
- 운영 효율 + 데이터 입력 흐름 우선
- 반복 패턴 충분히 생기면 내부 공용 컴포넌트 정리 → 이후에만 분리 검토

### 페이지 레이아웃 공통 컴포넌트 (Stage 14a/14a-2)

**PageHeader** (`shared/ui/PageHeader.tsx`): 페이지 제목 영역. **sticky 아님** (default `false`).

- 슬롯: `back`, `title`, `description`, `tabs`
- `actions` 슬롯은 **legacy — 신규 사용 금지** (PageToolbar.right로 대체)

**PageToolbar** (`shared/ui/PageToolbar.tsx`): 필터·CUD 액션 one-row toolbar. **`sticky top-14 z-20`** (AdminHeader 바로 아래 고정).

- 슬롯: `left` (Read — 필터/검색), `right` (CUD — 추가/편집/삭제/저장)
- 모바일(`<md`): 각 슬롯을 버튼으로 collapse → 클릭 시 Top Sheet 펼침
- 단일 자식 그룹은 `mobileCollapseLeft={false}` / `mobileCollapseRight={false}` opt-out
- **편집 폼의 [저장]/[삭제]는 반드시 `PageToolbar.right`에 배치** (CardFooter/FormSaveBar 사용 금지)
- 모달 내부 등 non-sticky 사용 시 `sticky={false}` 전달

**페이지 구조 패턴**

```tsx
// list 페이지
<PageHeader title="목록명" />
<PageToolbar left={<Filters />} right={canCreate && <NewButton />} />
<DataTable ... />

// view 페이지
<PageHeader back={<BackButton />} title={data.name} />
<PageToolbar right={<><DeleteDialog /><EditButton /></>} />
<DetailCards ... />

// edit 페이지 (form 안에 PageToolbar → type="submit" 자연 트리거)
<form onSubmit={...}>
  <PageHeader back={<BackButton />} title="편집" />
  <PageToolbar right={<><DeleteDialog /><Button type="submit">저장</Button></>} />
  <Card>...폼 필드...</Card>
</form>
```

**Dialog size 토큰 (Stage 14e)**: `<DialogContent size="sm|md|lg|xl">` — ad-hoc `max-w-*` className 직접 사용 금지.

| 토큰 | max-width |
| ---- | --------- |
| `sm` | max-w-md  |
| `md` | max-w-lg  |
| `lg` | max-w-3xl |
| `xl` | max-w-5xl |

- `bodyOnlyScroll`: 헤더·푸터 고정 + 본문만 스크롤. `<DialogBody>` slot 사용 의무 (`<DialogBody className="px-0">...</DialogBody>`)
- 새 Dialog 추가 시 `size` 토큰 + `bodyOnlyScroll` + `<DialogBody>` 세트 적용 기본값

**리스트 공통 컴포넌트 (PR2)**

- `ListSummary({ total, page, pageSize })` — `총 N건` (전체 건수) 표시. **PageToolbar 바로 아래, 테이블 바로 위**에 배치. `page`/`pageSize` props는 시그니처에 유지되나 현재 표시에는 미사용
- `ListPagination({ total, page, pageSize, basePath?, onPageChange? })` — shadcn pagination 래퍼. URL `page` query 갱신 또는 onPageChange 콜백
- `ListSearchInput({ placeholder, defaultValue })` — `<form key={defaultValue}>` + `<Input>` + `<Button type="submit">검색</Button>`. **Enter 또는 버튼 submit만** — debounce 자동 fetch 금지 (admin 검색 UX D8 정책). 빈 제출 시 `q` 파라미터 제거. `key={defaultValue}`로 URL 파라미터 변경 시 form remount → Base UI uncontrolled 경고 방지

리스트 페이지 구조 패턴:

```tsx
<PageToolbar left={<><DomainFilters /><ListSearchInput placeholder="제목으로 검색" defaultValue={filters.q ?? ''} /></>} right={...} />
<ListSummary total={data.total} page={data.page} pageSize={data.pageSize} />
<DataTable ... />
<ListPagination total={data.total} page={data.page} pageSize={data.pageSize} />
```

`entities/media/ui/MediaPagination.tsx`는 유지 — `MediaPicker` Dialog 내부 state 기반 페이지네이션(`onPageChange`)에 사용

**인라인 status 토글 (Stage 14f)**

- SubpageTable/PostTable: `<InlineStatusSwitchToggle value onState="PUBLISHED" offState="DRAFT" onChange isPending>` — Switch + "초안"/"발행" 라벨
- default `labelOn="발행"` / `labelOff="초안"` 보존 필수 (E2E `getByText('초안')` 의존)
- 권한 없을 때: `canUpdate ? <InlineStatusSwitchToggle> : <XxxStatusBadge>` 패턴 유지
- BoardTable: 기존 `<InlineBooleanToggle>` 유지 (boolean type)
- Boolean Switch 통일 (BoardForm.isPublic / MenuItemDialog.isVisible·openInNewTab / SecuritySettingsForm / PopupForm.isVisible / SubpageForm.feedbackEnabled·cclAi): 각 폼의 다른 변경과 함께 자연 시점에 처리 — Stage 14 범위 외

### Storybook + Vitest (Stage 7f shell → 7g story 확장)

admin도 web과 함께 Stage 7f에서 Storybook + Vitest 2-track 테스트 인프라를 shell로 도입하고, Stage 7g에서 story 볼륨을 대폭 확장. 상세 판단 기준/파일 위치는 루트 AGENTS.md "테스트 전략" 참조.

- **Framework**: `@storybook/nextjs-vite` (v10 stable). Vite 기반이라 Vitest addon과 호환. 프로덕션 빌드는 Turbopack 그대로
- **파일 구성**:
  - `.storybook/main.ts` — `framework: '@storybook/nextjs-vite'`, stories glob, `@storybook/addon-vitest`
  - `.storybook/preview.tsx` — Provider 2계층 decorator (아래 상세)
  - `.storybook/vitest.setup.ts` — `setProjectAnnotations` 기반 preview 연결
  - `vite.config.ts` — React plugin + `@/*` → `./src/*` alias
  - `vitest.config.ts` — `mergeConfig(viteConfig, ...)` + `projects: [unit(jsdom), storybook(Playwright Chromium)]`
- **Provider 2계층 decorator** (실제 layout 구조 재현):
  - **Root decorator (모든 story 기본 outermost)**: `ThemeProvider → QueryClient(스토리 스코프 · retry:false) → TooltipProvider + Toaster` — `app/layout.tsx` 재현
  - **Authenticated decorator (opt-in)**: `parameters.authenticated === true` 일 때만 `PermissionProvider + SidebarProvider(defaultOpen)` 래핑 — `app/(authenticated)/layout.tsx` 재현
  - `parameters.permissions`로 `PermissionMap` override, `parameters.isSystem`으로 총괄 관리자 모드 토글. 기본값은 `RESOURCE_ACTIONS` 순회 full-access
  - LoginForm/RegisterForm 같은 비인증 컴포넌트는 root-only, 운영 화면은 `parameters.authenticated: true` 선언
- **Sidebar 카테고리 (Stage 7h 완료 시점 12 story 파일 · 총 35 tests — 7g의 28 + 7h play function 7건 추가)**:
  - `Admin/Shadcn/Button` (5 variants — Stage 7f)
  - `Admin/Features/Auth/LoginForm` (Default + **ValidationEmpty** — 7h: 빈 submit → Zod 에러 메시지 assert)
  - `Admin/Features/Role/CreateRoleDialog` — **authenticated decorator 실행 검증 story** (7f 미완 leg 해소)
  - `Admin/Features/Subpage/SubpageForm` (Empty + WithCCLType1 — 7h: Empty에 play 추가, cclType=null → AI 체크박스 disabled → TYPE_1 선택 → enabled 전환 검증)
  - `Admin/Features/Post/PostForm` (Empty / Draft / Published)
  - `Admin/Features/Block/BlockEditDialog` (CreateRichText / CreateHtml / CreateImage / CreateIframe + **CreateIframeInvalidUrl** — 7h: 비허용 호스트 URL → "임베드 가능한 URL이 아닙니다" toast assert)
  - `Admin/Shared/ConfirmLeaveDialog` (Open / Closed / CustomLabels)
  - `Admin/Shared/BulkActionBar` (NoSelection / OneSelected / ManySelected / AllSelected)
  - `Admin/Shared/Layout/AdminHeader` (Default / WithoutRole)
  - `Admin/Shared/DirtyGuardProbe` (Clean / DirtyTriggersDialog — **7h 신규**: dirty 상태 + 내부 origin 링크 click → ConfirmLeaveDialog 렌더 assert)
  - `Admin/Entities/Auth/PermissionProvider` (FullAccess / ReadOnly / SystemAdmin — **7h 신규**: inline `PermissionProbe` + `data-testid`로 `usePermission` 훅의 ALLOWED/DENIED 매트릭스 검증. `isSystem: true` bypass 경로 포함)
  - `Admin/Entities/Media/ImageUrlInput` (UrlOnly / WithExternalUrl / WithLibraryMedia)
  - `Admin/Design System/Colors` (Surface / Action / Status / Border / Sidebar / Chart / All / WCAGContrast) — design.md 토큰 시각화 + WCAG 대비율 표
  - `Admin/Design System/Typography` (Scale / WeightLadder / FontFamily) — 용도별 Tailwind 클래스 + weight ladder
  - `Admin/Design System/Spacing & Radius` (Spacing / PaddingExample / Radius / RadiusCalcChain) — `--radius` 기준값 + calc() 파생 시각화
  - `Admin/Design System/Breakpoints` (Tokens / ModifierExample) — Tailwind 기본(sm/md/lg/xl) — admin은 표준 modifier 사용
  - `Admin/Design System/Foundations` (ThemeInline / LightDarkPair / FontLoading / VerifyDesignTokens / SsotPolicy) — `@theme inline` 패턴 · light/dark 페어 구조
  - `Admin/Design System/Admin Customs` (Shadow 토큰 / 페이지 레이아웃 표준 / z-index 계단 / 폼 컨트롤 height / shadcn wrapper 정책 / Dialog size 토큰) — Stage 14·15에서 정립된 admin 고유 정책
- **명령**: `pnpm --filter @simple-cms/admin storybook` (port 6006), `pnpm --filter @simple-cms/admin test` (unit + storybook project 자동 병행), `pnpm --filter @simple-cms/admin build-storybook`
- **시연 모드 동봉 진입점**: admin Storybook의 정적 산출물은 시연 web 프로젝트의 `build:demo` 단계(`apps/web/scripts/bundle-storybooks.mjs`)가 `pnpm --filter @simple-cms/admin exec storybook build --output-dir <apps/web/public/_cms/storybook/admin>`을 호출해 직접 출력. admin Vercel 시연 프로젝트는 자체 Storybook 빌드를 수행하지 않으며, 별도 Vercel 프로젝트도 만들지 않는다. 자세한 정책은 `docs/react-cms-시연모드-배포-가이드.md` 10장
- **Stage 7h에서 정립된 play function 패턴** (`storybook/test` v10 core):
  - `expect` / `userEvent` / `within` / `waitFor` / `fn`을 `storybook/test`에서 import (core 패키지, `@storybook/test` 별도 설치 금지)
  - Dialog/toast는 body portal 렌더 → `within(canvasElement)` 아닌 `within(document.body)` 범위에서 탐색
  - 비동기 state 변화에는 `findByText` / `findByRole` (내장 retry/wait) 사용. toast 후 Dialog 닫힘 순서처럼 타이밍이 이중으로 겹칠 땐 `waitFor(() => expect(...).not.toBeInTheDocument())` 필요
  - 훅 단독 검증이 필요할 때 **probe 컴포넌트 패턴** — 전용 `*Probe.stories.tsx` 파일에 inline probe 컴포넌트 + `data-testid`/Dialog로 훅 반환값 DOM 노출. `PermissionProbe`/`DirtyGuardProbe`/`SectionReorderProbe` 사례
  - Canvas iframe 환경 주의: `useDirtyGuard` 같은 same-path 필터가 있는 훅 probe는 `href="/dashboard"`처럼 iframe pathname과 다른 경로를 써야 가드가 트리거됨 (`href="#fragment"`는 same-path라 skip)
- **Stage 7j에서 정립된 fetch stub 패턴** (MSW 대체):
  - `apps/admin/.storybook/fetchStubDecorator.ts` — Story `parameters.fetchMock: { [path-substring]: { status, body } }` 맵으로 `window.fetch` 일시 override. `useRef` + `useEffect`로 re-render 안전하게 설치/복원. preview.tsx decorators 배열 맨 뒤(innermost)에 등록
  - Storybook decorator 배열은 `reduceRight`로 적용되어 **첫 번째가 outermost, 마지막이 innermost**. 알아두면 Provider 중첩 순서 설계에 유용 (예: 데이터 context는 outer, 권한 context는 inner)
  - 응답 body 포맷은 admin fetchClient 표준(`{ success, data?, error? }`)에 맞춤 — fetchClient의 `response.ok` 분기와 `body.error` throw 경로를 그대로 통과
  - 적용 예시: `CreateRoleDialog` Submit Success(`/api/roles` → 201) / SubmitConflict(409), `SectionReorderProbe` Reorder500(`/api/home/reorder` → 500 → `useReorderHomeSections` onError rollback 검증)
- **Stage 7j 결론 — MSW는 현 시점에 Storybook 통합 불가**: `npm view msw-storybook-addon versions --json`로 latest=2.0.7 (2026-04-08), v2.1 부재(canary/beta/next 모두 v2.0.x). 7h 실패 시점과 동일 버전이라 재시도 가치 없음. addon-vitest Playwright browser mode와의 호환성 수정은 MSW/Storybook 양쪽 upstream에 없음. **fetch stub decorator가 AGENTS.md 원래 의도("submit 분기 검증")를 infra delta 0에 가까이 달성**. 향후 `msw-storybook-addon` v2.1+ 또는 공식 dual `setupServer` 가이드가 나오면 재평가
- **Stage 7i 결과**: 커스텀 래퍼 showcase 5개 신규 추가 + LinkTargetInput을 `entities/link-target`으로 승격 + home-management 5개 fields 적용:
  - Sidebar 카테고리 5개 신규 (`Admin/Shared/Dialog`, `Admin/Shared/AlertDialog`, `Admin/Shared/InlineStatusToggle`, `Admin/Shared/InlineBooleanToggle`, **`Admin/Entities/LinkTarget/LinkTargetInput`**). 총 변동 — admin 17 files / **52 tests** (기존 35 → +17). Stage 14f에서 `Admin/Shared/InlineStatusSwitchToggle` (4 variants) 추가 → 현재 **56 tests**. Stage 17에서 `Admin/Design System/*` 6파일 28 stories 추가 → **84 tests**
  - **Dialog `NestedDialog` play 재현 조건**: 자식 Dialog를 부모 Dialog의 children으로 렌더해야 Base-UI가 nested 관계를 인식하고 `data-nested-dialog-open`을 부모 Popup에 부착. sibling으로 두면 미부착 (구현 중 발견). 실사용 예: `MenuItemDialog`가 `<Dialog>`의 children 영역에 `<ConfirmLeaveDialog>`를 sibling으로 렌더
  - **LinkTargetInput 승격 경로**: `features/popup-management/ui/LinkTargetInput.tsx` → `entities/link-target/ui/LinkTargetInput.tsx`. 쿼리도 `homePopupReferencesOptions` → `linkTargetReferencesOptions`로 rename하며 `entities/link-target/api/linkTargetReferencesQueries.ts`로 이동. API endpoint는 Stage 7k-1에서 `/api/link-target/references`로 rename 완료
  - **`allowNone?: boolean` prop 신규** (default true): url이 필수 필드인 CtaFields + ShortcutFields가 `allowNone={false}` 전달해 NONE 옵션 숨김. 빈 value 진입 시 EXTERNAL 모드 default 활성
  - **home-management 5개 fields 적용**: CtaFields(buttonUrl 필수 → allowNone=false) + HeroFields(slides[].url) + RecommendedFields(items[].url) + ShortcutFields(items[].url 필수 → allowNone=false) + NoticeFields(items[].url nullable, `?? ''` 정규화). CtaFields는 control prop 신규 추가 → CtaSectionForm에서 `form.control` 전달
  - **호환성**: 기존 저장된 URL은 자동 EXTERNAL 탭 폴백 + 원본 보존. DB 마이그레이션 0. 운영 시 내부 페이지 참조로 전환하려면 SUBPAGE/BOARD 탭에서 재선택
  - **MSW 무의존 패턴**: LinkTargetInput story는 `withMockRefs` decorator가 자체 `QueryClientProvider`를 래핑하여 `setQueryData(linkTargetReferencesOptions().queryKey, MOCK_REFS)` 주입. 7h probe 패턴과 일관
- **Stage 7g에서 만난 이슈 — Storybook addon-vitest dep cache**: story 대량 추가 후 첫 vitest run에서 `TypeError: Failed to fetch dynamically imported module: .../sb-vitest/deps/@storybook_react-dom-shim.js?v=...` 발생. 해결: `rm -rf node_modules/.cache/storybook node_modules/.vite` 후 재실행. 향후 의존성 업데이트나 story 대량 추가 시 cleanup 절차로 참고
- **Stage 7h에서 만난 이슈 — msw-storybook-addon + addon-vitest 호환성**: `initialize()` + `mswLoader` 전역 등록 시 `Test Files 0 passed (10)` 무한 대기 및 `Failed to connect to the browser session` 타임아웃 발생. `tags: ['!test']` story 제외나 `navigator.webdriver` 런타임 분기로도 해결 안 됨 — MSW 패키지 devDep 존재만으로도 addon-vitest backend가 block됨을 확인. 최종 조치: `git restore` + `rm -rf apps/admin/public apps/admin/node_modules/.cache/storybook apps/admin/node_modules/.vite` + `pnpm install`로 Stage 7g 커밋 상태 완전 복원 → 28 tests 정상 통과 확인. 재도입은 Stage 7j에서 `msw-storybook-addon` v2.1+/Node setupServer 이중 세팅 재조사 후

## 데이터 처리 패턴

### API Route + TanStack Query (Server Actions 미사용)

- 데이터 변경(CRUD): **API Route**(Route Handler) + TanStack Query `useMutation`
- 인터랙티브 조회(필터, 페이지네이션): API Route + TanStack Query `useQuery` (Server prefetch + HydrationBoundary)
- 정적 표시(상세 페이지, 대시보드 위젯): Server Component에서 직접 Prisma 쿼리
- **Server Actions는 사용하지 않음** — `revalidatePath`는 API Route 핸들러 내부에서 호출
- 변경 액션 응답: `{ success: boolean; data?: T; error?: string }`
- 폼 관리: react-hook-form + zod (클라이언트 validation + API Route 서버 validation)
- 인증 검사: 각 API Route 핸들러에서 세션 확인
- 감사 로그 기록: 데이터 변경 API Route 핸들러 + 로그인/로그아웃 API 핸들러에서 `logAuditEvent()` 호출
- 감사 로그 내보내기: API Route 사용 (파일 다운로드)
- 기본 로깅 원칙: 새 데이터 변경 API Route에는 기본적으로 감사 로그 포함 (예외 시 사유 주석 필수)
- TanStack Query 상세 패턴: Root AGENTS.md "데이터 페칭 패턴" 섹션 참조

### API Route 파일 배치

```
app/api/{domain}/route.ts              # 목록(GET), 생성(POST)
app/api/{domain}/[id]/route.ts         # 상세(GET), 수정(PATCH), 삭제(DELETE)
app/api/{domain}/[id]/{action}/route.ts # 특수 액션 (approve, suspend 등)
```

#### defineRoute 패턴

`shared/api/defineRoute.ts` 팩토리 (Stage 16b-1). `requirePermission` → Zod 파싱 → handler → `{ success: true, data }` 래핑 → 감사 로그를 공통 처리.

- **단일 라우트** (`PATCH /api/subpages/[id]/status`): `handler`가 TResult 반환 → `audit.build(result, ctx)`로 감사 로그 자동 기록
- **bulk 라우트** (`POST /api/subpages/bulk-delete`): `defineBulkOperation`이 id 배열 순회 → `{ deleted, blocked }` 응답 자동 조립
- **다중 audit** (`POST /api/subpages/[id]/versions/[versionId]/rollback`): `audit.build`에서 배열 반환 시 여러 entityType에 감사 이벤트 동시 기록 (SUBPAGE UPDATE + SUBPAGE_VERSION CREATE)
- **escape hatch**: handler가 `NextResponse`를 직접 반환하면 래핑·감사 로그 우회 (404·409·400 도메인 에러에 사용)
- **no-op 패턴**: handler가 `null`을 반환하면 `audit.build` 호출 skip (PATCH 무변경 경로 등)
- **인프라 위치**: `shared/api/{defineRoute,defineBulkOperation,renormalizeDisplayOrder}.ts`

**적용 범위**: subpages 도메인 11 라우트 완료. 나머지 도메인(posts/boards/navigation/home 등)은 16b-2~N에서 점진 확장.

### FSD features API 파일 배치

```
features/{domain}/api/
├── {domain}Fetchers.ts         # fetch 함수 (API Route 호출, Server/Client 공용)
├── {domain}Queries.ts          # Key Factory + queryOptions
└── use{Domain}Mutations.ts     # useMutation 훅 ('use client')
```

## 컴포넌트 구조 패턴

- **pages 레이어**: Server Component — 데이터 fetching + 레이아웃 조합
- **features 레이어**: Client Component 중심 — 폼, 인터랙션, API fetcher/mutation 정의
- **entities 레이어**: 도메인 관련 유틸, 타입 re-export, 표시 컴포넌트
- **shared 레이어**: UI 기본 컴포넌트 (shadcn/ui 래퍼), 공용 유틸

## FSD 레이어 의존성 규칙

```
pages → features, entities, shared  ✅
features → entities, shared         ✅
entities → shared                   ✅
```

금지:

- 역방향 import (예: shared → features) ❌
- 같은 레이어 내 슬라이스 간 직접 import (예: features/page → features/board) ❌
- 공유가 필요하면 entities 또는 shared 레이어로 내림
- `/check-fsd` 스킬로 검증 가능

### FSD 세그먼트 규칙

슬라이스 내부 디렉토리는 다음 5개만 사용한다:

| 세그먼트  | 역할                                     | 예시                                     |
| --------- | ---------------------------------------- | ---------------------------------------- |
| `ui/`     | React 컴포넌트 (Server/Client)           | `UserTable.tsx`, `ProfileForm.tsx`       |
| `api/`    | fetch 함수, queryOptions, useMutation 훅 | `userFetchers.ts`, `useUserMutations.ts` |
| `model/`  | 타입, Zod 스키마, 상수, 필터 정의        | `userFilters.ts`, `loginSchema.ts`       |
| `config/` | 설정 상수 (navigation 등)                | `navigation.ts`                          |
| `lib/`    | 유틸리티 함수, 헬퍼                      | `checkPermission.ts`, `cookies.ts`       |

금지: `schemas/`, `hooks/`, `types/`, `utils/` 등 비표준 세그먼트
예외: `shared/hooks/`는 shadcn/ui 생성 훅으로 허용

### entities 슬라이스 목록 (Stage 16e 기준)

| 슬라이스                   | 핵심 파일                                               | 역할                                                                                                                     |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `entities/auth/`           | `lib/`, `ui/PermissionProvider`                         | 인증·인가                                                                                                                |
| `entities/editor/`         | `ui/TiptapEditor`                                       | Tiptap 에디터 래퍼                                                                                                       |
| `entities/link-target/`    | `ui/LinkTargetInput`, `api/linkTargetReferencesQueries` | URL 분기 입력                                                                                                            |
| `entities/media/`          | `ui/MediaPicker`, `ui/ImageUrlInput`                    | 미디어 선택·업로드                                                                                                       |
| `entities/preview/`        | `ui/PreviewButton`, `api/usePreviewMutations`           | 미리보기 토큰                                                                                                            |
| `entities/form-fields/`    | `ui/SlugField`                                          | 공용 slug 입력 (자동 생성 + 변경 경고). 현재 BoardForm에서 사용하며 Subpage/Post는 서버 발급 opaque slug 정책으로 미사용 |
| `entities/content-status/` | `ui/StatusBadge`                                        | `ContentStatusBadge` — DRAFT/PUBLISHED 공용 Badge                                                                        |

## 유효성 검사 규칙

- 필수값 누락 시 저장 불가
- `published` 상태에서는 추가 검증 강화
- 연결형 데이터는 참조 무결성 확인
- 날짜 범위는 논리적으로 유효해야 함
- UI + 서버 양쪽에서 검증

### 대표 검증 항목

- 서브 페이지/게시글 제목 필수
- 서브 페이지/게시글 slug는 서버가 생성 시 자동 발급하며, 편집 저장 시 변경하지 않음
- 게시판 slug 중복 불가
- 이미지형 팝업 alt 필수
- 메뉴 SUBPAGE 타입 → subpageId 필수 / BOARD → boardId / EXTERNAL·CUSTOM → url/경로 필수
- 팝업 시작일 ≤ 종료일
- 메뉴 depth 최대 3단계
- 비공개/미발행 콘텐츠를 메뉴 연결 시 경고/차단
- 회원가입 아이디: 4~20자, 영문+숫자+밑줄만, 중복 불가
- 회원가입 이메일: 유효한 이메일 형식, optional
- 회원가입 비밀번호: 8자 이상, 비밀번호 확인 일치
- 회원가입 이름: 2~50자
- 비밀번호 변경 시 현재 비밀번호 검증 필수
- 업로드 허용 확장자 최소 1개 필수
- 업로드 허용 MIME 타입 최소 1개 필수
- 최대 파일 크기: 1~100MB 범위 양의 정수
- 확장자 형식: `.`으로 시작, 소문자 영숫자
- MIME 타입 형식: `type/subtype` 패턴
- 역할명: 1~50자, unique
- 기본 역할 삭제 불가 (다른 역할을 기본으로 설정 후 삭제)
- 시스템 역할(총괄 관리자) 삭제/권한 수정 불가
- 마지막 총괄 관리자의 역할 변경 불가
- 기본 역할 미설정 상태에서 가입 승인 불가

## Docker 배포 (Stage 8a)

운영 self-host 절차서: [`docs/react-cms-운영-배포-가이드.md`](../../docs/react-cms-운영-배포-가이드.md). 시연 모드(Vercel + Supabase)는 별도 트랙.

### `apps/admin/Dockerfile` 구조

Multi-stage build (4 stage): `base → deps → builder → runner`. 빌드 컨텍스트는 모노레포 root.

- **base**: `node:22-bookworm-slim` + `corepack enable` (pnpm 10.33.0 고정)
  - alpine 미선택 이유: Prisma binary(`debian-openssl-3.0.x`)와 `sharp` prebuilt 호환성 + 추가 binaryTarget 불필요
- **deps**: package.json 7개 + lockfile만 먼저 복사 → `pnpm install --frozen-lockfile`. lockfile 변경 없으면 이 layer 재사용
- **builder**: 소스 전체 + `pnpm db:generate` + `pnpm --filter @simple-cms/admin build`
  - 빌드 시 `DATABASE_URL` placeholder 주입 (schema parse만 필요, 실제 연결 X)
- **runner**: `.next/standalone` + `.next/static`만 복사 — admin은 `public/` 디렉토리 없음
- 최종 image: ~426MB disk / ~100MB content. EXPOSE 3001, non-root `nextjs:1001`

### `apps/admin/next.config.ts` Docker 핵심 옵션

- `output: 'standalone'` — Next.js가 `.next/standalone/`에 최소 실행 산출물 + 필요 node_modules 트리만 분리
- `outputFileTracingRoot: path.resolve(__dirname, '../../')` — **monorepo 필수**. 없으면 standalone tracer가 `@simple-cms/db|types|editor` 같은 workspace deps를 못 찾아 런타임 `Cannot find module` 발생
- demo basePath/redirects 등 기존 옵션은 무영향

### Storage 어댑터 — Docker 환경 분기

`apps/admin/src/shared/lib/storage/index.ts`는 `LOCAL_STORAGE_PUBLIC_DIR` env로 publicDir override를 지원. 미설정 시 `process.cwd() + '../web/public'` 폴백.

- **Docker compose 환경**: `LOCAL_STORAGE_PUBLIC_DIR=/app/apps/web/public` 명시 주입 — WORKDIR 변경 회귀 방어
- **named volume**: `uploads_data:/app/apps/web/public/uploads` — admin(read-write) + web(read-only) 양쪽 동일 경로 공유
- **Supabase 모드**: `STORAGE_PROVIDER=supabase`이면 volume mount는 마운트되지만 코드가 무시 (해롭지 않음)
