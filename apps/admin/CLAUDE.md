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

### 인가 (Authorization) — 역할 기반 권한 관리

- Role 모델 기반 동적 RBAC
- 총괄 관리자(`isSystem: true`): 모든 권한 보유, 권한 체크 바이패스
- 기본 역할(`isDefault: true`): 가입 승인 시 자동 부여
- 권한 체크 패턴 (**API + UI 양쪽 필수**):
  - API Route: `requirePermission(resource, action)` — 401(미인증) 또는 403(권한 없음) 반환
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
  - `GET /api/users` — 목록 (상태 필터 + 서버 사이드 페이지네이션)
  - `POST /api/users/[id]/approve` — 승인 (PENDING→ACTIVE, 기본 역할 배정)
  - `DELETE /api/users/[id]` — 거절 (PENDING 유저 hard delete)
  - `POST /api/users/[id]/suspend` — 정지 (ACTIVE→SUSPENDED, 세션 즉시 삭제)
  - `POST /api/users/[id]/reactivate` — 해제 (SUSPENDED→ACTIVE)
  - `PATCH /api/users/[id]/role` — 역할 변경
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
/home/popups            # 메인 팝업 관리
/media                  # 미디어 라이브러리 (그리드 + 검색 + 상세 Dialog)
/users                  # 사용자 관리 (목록, 승인/거절, 정지/해제)
/profile                # 내 정보 변경 (이름, 비밀번호)
/audit-logs             # 활동 이력 (감사 로그)
/error-logs             # 웹 에러 로그 (공개 웹 런타임 에러 조회, 상세는 Dialog)
/settings               # 사이트 설정 (첫 번째 하위 설정으로 리다이렉트)
/settings/domain        # 도메인 설정
/settings/security      # 보안 설정 (동시 로그인 정책)
/settings/upload        # 업로드 제한 설정 (허용 확장자, MIME 타입, 최대 파일 크기)
/settings/roles         # 권한 관리 (역할 목록 + 메뉴별 CRUD 매트릭스)
```

## 기능별 상세 스펙

### 서브 페이지 CRUD

- 제목, slug, SEO title/description, Tiptap 본문
- draft / published 상태 관리
- slug: 제목 기반 자동 생성 + 수동 수정
- `published` 상태 slug 변경 시 경고
- 대표 이미지 필드
- 미리보기 제공
- 본문 편집: Tiptap WYSIWYG 에디터 (Tiptap JSON 저장, 검색용 plain text 동시 저장 — `@simple-cms/editor` 공유 확장 사용)
- Tiptap 확장: StarterKit, Underline, TextStyle, Color, TextAlign, Highlight, Link, Image(리사이즈 지원), Table, Subscript, Superscript, TaskList
- **뷰/편집 분리**: `/subpages/[id]` = 읽기 전용 뷰, `/subpages/[id]/edit` = 편집 폼
- **권한 기반 UI**: 생성(`subpages:create`), 편집(`subpages:update`), 삭제(`subpages:delete`) 버튼을 권한별 표시/숨김
- API Routes: `GET/POST /api/subpages`, `GET/PATCH/DELETE /api/subpages/[id]` — 모든 핸들러에 `requirePermission()` 적용
- FSD: `features/subpage-management/`, `pages/subpage-management/`

### 커스텀 코드 편집

- Markdown 본문, 블록과 별도로 서브 페이지별 커스텀 HTML/CSS 편집 기능
- Monaco Editor로 편집, 별도 탭 UI
- `customHtml`: 서브 페이지 내 지정 위치에 HTML 삽입 (nullable)
- `customCss`: 서브 페이지 스코프 스타일 적용 (nullable)
- JS는 1차 비허용
- 빈 값이면 무시 (기존 Markdown + 블록만 렌더링)
- 미리보기에서 커스텀 코드 적용 결과 확인 가능

### 서브페이지 블록

- Markdown 본문과 별도로 제한된 블록 추가
- 블록 구조: `blockType` + `displayOrder` + `isVisible` + `configJson`
- 블록 추가/삭제/순서 조정/타입 선택
- 사용 가능 타입은 개발자가 미리 제공한 것만 허용
- 자유형 페이지 빌더가 아님
- 블록 종류는 디자이너 협의 후 확정

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
- draft / published 상태, 발행일 관리
- slug: 게시판 단위 unique (`@@unique([boardId, slug])`)
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
- **항목 타입**: SUBPAGE(subpageId), BOARD(boardId), EXTERNAL(url), CUSTOM(경로)
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
- **고정 세트 모델** (Stage 5a): 6개 타입 각 1개씩 seed로 생성, 추가/삭제 UI 없음 — R/U만 지원
  - 타입: HERO, RECOMMENDED, SHORTCUT, LATEST_POSTS, CTA, NOTICE
- 섹션별 `configJson` 스키마 (Zod, `features/home-management/model/homeSchemas.ts`):
  - **HERO**: slides[]: `{imageUrl, imageAlt, title, description?, url?}` (최대 10개, 1개=단일 배너, 2개 이상=슬라이드) + slideOptions
  - **RECOMMENDED**: heading, description?, items[]: `{imageUrl, imageAlt, title, description?, url?}` (최대 12개, 자유 갤러리) + slideOptions
  - **SHORTCUT**: heading, description?, items[]: `{label, description?, url}` (최대 8개)
  - **LATEST_POSTS**: heading, description?, boardId(nullable), limit(1~10) — 지정 게시판 최신 N개 자동 표시
  - **CTA**: heading, description?, buttonLabel, buttonUrl
  - **NOTICE**: heading, description?, items[]: `{label, url?, date?}` (최대 5개)
- **SlideOptions 공통 스키마** (HERO, RECOMMENDED):
  - `showPrevNext`, `showPlayPause`, `showDots`: boolean 토글
  - `autoPlay`, `autoPlayInterval`(ms, 1000~30000): `showPlayPause=true`일 때만 의미
  - `SlideOptionsPanel` 컴포넌트가 두 섹션 Fields에서 재사용됨
- 이미지는 **외부 URL 입력 + 파일 업로드** 모두 지원
  - `ImageUrlInput` 공통 컴포넌트: URL text input + [파일 선택] 버튼 + 미리보기 + 제거 버튼
  - 업로드 API: `POST /api/media/upload` (multipart/form-data, `file` + `category='home'`)
  - 스토리지: 루트 CLAUDE.md "파일 업로드 스토리지 정책" 참조 (`STORAGE_PROVIDER=local|supabase`)
  - Media 테이블에 레코드 생성 + `MEDIA` 감사 로그 기록
- 링크 URL은 optional — 입력 시 해당 슬라이드/카드 전체가 `<Link>`로 감싸짐
- URL은 내부 경로(`/about`)와 외부 URL(`https://...`) 모두 허용
- **Tiptap 미사용** — 모든 섹션을 단순 text 필드로 관리
- **UI**: `/home` 단일 페이지, 6개 섹션 카드 + dnd-kit 드래그 순서변경 + 노출토글 + 타입별 편집 Dialog
  - slides/items 순서 조정은 useFieldArray + 위/아래 화살표 버튼 (해당 폼 내부)
- **권한 기반 UI**: 편집/순서변경/노출토글 버튼을 `usePermission('home', 'update')`로 게이팅
- API Routes:
  - `GET /api/home` — 섹션 목록 (`home:read`)
  - `GET/PATCH /api/home/[id]` — 단건 상세/수정 (`home:read`/`home:update`)
  - `PATCH /api/home/reorder` — 순서 변경, `length(6)` 검증 + 트랜잭션 루프 (`home:update`)
  - `GET /api/home/references` — Edit Dialog 드롭다운용 `{subpages, boards, posts}` 묶음 (`home:read`)
- 감사 로그 entityType: `HOME_SECTION`, action `UPDATE`만 사용
  - 편집: `{ before, after }` diff 기록 (변경 필드만)
  - 순서변경: `{ after: { reorderedSections: '6건' } }`
- FSD: `features/home-management/`, `pages/home-management/`
- 참고: 시안 확정 후 web의 섹션 컴포넌트를 대체하는 흐름으로 설계됨 (admin UI는 안정)

### 메인 팝업 관리 (Stage 5b)

- 라우트: `/home/popups`, `/home/popups/new`, `/home/popups/[id]`, `/home/popups/[id]/edit`
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

- 단일 `linkUrl` 필드로 저장하되 admin UI는 유형별 분기 Select + 입력:
  - **없음**: linkUrl = ''
  - **서브페이지**: 발행된 Subpage 드롭다운 → `/p/{slug}` 자동 생성
  - **게시판**: 공개 Board 드롭다운 → `/board/{slug}` 자동 생성
  - **외부 URL**: 자유 입력 (`https://...`)
- 편집 시 저장된 URL을 파싱해 어느 탭이 활성인지 자동 추론 (references 캐시 기반)

#### API Routes

| Method | Route | 필요 권한 | 용도 |
| ------ | ----- | --------- | ---- |
| GET    | `/api/home-popups`            | home-popups:read   | 목록 (모든 상태 포함)         |
| POST   | `/api/home-popups`            | home-popups:create | 생성 + displayOrder 자동 배정 |
| GET    | `/api/home-popups/[id]`       | home-popups:read   | 상세                          |
| PATCH  | `/api/home-popups/[id]`       | home-popups:update | 수정 (타입 전환 시 반대 필드 초기화) |
| DELETE | `/api/home-popups/[id]`       | home-popups:delete | 삭제 + displayOrder 정규화    |
| PATCH  | `/api/home-popups/reorder`    | home-popups:update | 순서 일괄 변경                |
| GET    | `/api/home-popups/references` | home-popups:read   | LinkTargetInput 드롭다운용    |

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

#### MediaPicker 재사용

- 컴포넌트: `features/media-management/ui/MediaPicker.tsx` (Dialog + Filters + Grid + Pagination + UploadButton)
- 사용처:
  1. `/media` 페이지 메인
  2. `ImageUrlInput` (HERO/RECOMMENDED 슬라이드 편집)
  3. `TiptapEditor` 본문 툴바 [이미지 → 라이브러리]
- 업로드 성공 시 자동 onSelect + Picker 닫힘 (UX 최적화)

#### Tiptap 본문 이미지 통합

- `packages/editor`의 `ImageWithMediaId`가 기본 Image 확장을 교체 → `mediaId` attr 보존
- `ImageUploadExtension`이 paste/drop 이벤트 인터셉트 → `/api/media/upload` 호출 → 자동 노드 삽입
- 툴바 [이미지] 드롭다운: [파일 업로드] / [라이브러리] / [URL 입력] 3가지 진입점
- 외부 URL은 mediaId null (의도적 — Media 무관)

#### API Routes

| Method | Route | 권한 | 용도 |
| ------ | ----- | ---- | ---- |
| POST | `/api/media/upload` | 인증 (역할 불문) | 업로드 (SHA-256 중복 방지, `reused` 플래그) |
| GET | `/api/media` | media:read | 목록 + 필터 + 페이지네이션 |
| GET | `/api/media/[id]` | media:read | 상세 |
| PATCH | `/api/media/[id]` | media:update | alt 편집 (감사 로그 UPDATE) |
| DELETE | `/api/media/[id]` | media:delete | 삭제 (참조 시 409, 물리 파일 + DB 삭제) |
| GET | `/api/media/[id]/references` | media:read | 사용처 목록 |
| POST | `/api/media/bulk-delete` | media:delete | 일괄 삭제 (참조 있는 건 skip, 응답에 `deleted[]` + `blocked[]` 분리) |

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
- 필터: 상태별 (전체/대기/활성/정지)
- 서버 사이드 페이지네이션 (기본 20건)
- 액션:
  - PENDING → 승인(ACTIVE로 변경) / 거절(hard delete)
  - ACTIVE → 정지(SUSPENDED로 변경 + 세션 즉시 삭제)
  - SUSPENDED → 해제(ACTIVE로 변경)
- 자기 자신 정지 불가
- 마지막 ACTIVE 관리자 정지 불가 (ACTIVE 사용자 수 체크)
- 승인 시 기본 역할(`isDefault: true`) 자동 배정
- 역할 변경: 사용자 목록에서 역할 드롭다운으로 변경 (users:update 권한 필요)
- 총괄 관리자 역할 배정은 총괄 관리자만 가능
- 마지막 총괄 관리자의 역할 변경 불가
- 모든 상태 변경 및 역할 변경은 감사 로그 기록 (`entityType: USER`)
- API Routes: `POST /api/users/[id]/approve`, `DELETE /api/users/[id]`, `POST /api/users/[id]/suspend`, `POST /api/users/[id]/reactivate`, `PATCH /api/users/[id]/role`

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

| Method | Route                              | 필요 권한           | 용도                    |
| ------ | ---------------------------------- | ------------------- | ----------------------- |
| GET    | `/api/error-logs`                  | errorLogs:read      | 목록 (개별/그룹 뷰)     |
| GET    | `/api/error-logs/[id]`             | errorLogs:read      | 상세                    |
| PATCH  | `/api/error-logs/[id]`             | errorLogs:update    | 개별 해결/미해결 토글   |
| POST   | `/api/error-logs/bulk-resolve`     | errorLogs:update    | fingerprint 일괄 처리   |

#### 목록 (`/error-logs`)

- 컬럼 (개별 뷰): 시간, 레벨 뱃지, 소스 뱃지, 메시지(첫 줄), URL, 해결 상태, 상세 버튼
- 컬럼 (그룹 뷰): 최근 발생 시각, 레벨, 소스, 메시지, URL, 발생 횟수, 일괄 해결, 대표 상세
- 필터: 레벨, 소스, 해결 상태, 날짜 범위, URL 부분 일치, 메시지 검색, 그룹/개별 뷰 토글
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

- **SettingsNav 4탭**: 도메인 | 보안 | 업로드 | 권한 (권한은 Stage 2f에서 구현)
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

| 리소스 키    | 표시명      | 지원 액션                    |
| ------------ | ----------- | ---------------------------- |
| `dashboard`    | 대시보드    | read                         |
| `subpages`     | 서브 페이지 | create, read, update, delete |
| `boards`       | 게시판      | create, read, update, delete |
| `posts`        | 게시글      | create, read, update, delete |
| `navigation`   | 메뉴 관리   | create, read, update, delete |
| `home`         | 메인 페이지 | create, read, update, delete |
| `home-popups`  | 메인 팝업   | create, read, update, delete |
| `media`        | 미디어 라이브러리 | create, read, update, delete |
| `users`      | 사용자 관리 | create, read, update, delete |
| `roles`      | 권한 관리   | create, read, update, delete |
| `auditLogs`  | 감사 로그   | read                         |
| `errorLogs`  | 에러 로그   | read, update                 |
| `settings`   | 사이트 설정 | read, update                 |

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

### 미리보기

- 대상: 서브페이지, 메인 페이지, 메인 팝업, 메뉴
- 공개 웹과 유사한 렌더링 결과 확인 용도
- `draft` 상태도 preview token으로 확인 가능
- 실제 발행과 분리된 읽기 전용 흐름

## UI 전략

- KRDS 미사용
- 디자이너 Figma 시안 기준으로 관리자 전용 UI 구현
- **1차: shadcn/ui로 임시 구현** → Figma 시안 확정 후 커스텀 UI로 전환
- shadcn/ui는 Tailwind CSS + Radix UI 기반이므로 기존 스타일링과 충돌 없음
- shadcn/ui 내장 패턴 활용: Data Table (TanStack Table), Form (react-hook-form + zod), Toast (sonner), Dialog, etc.
- **shadcn/ui 컴포넌트는 `shared/ui/shadcn/`에서 별도 관리** — 직접 코드 수정 금지, 향후 커스텀 UI와 분리
  - `components.json`의 `ui` alias가 `@/shared/ui/shadcn`을 가리킴 → `npx shadcn add` 시 자동으로 해당 폴더에 설치
  - 커스텀 공통 UI는 `shared/ui/` 루트 또는 `shared/ui/layout/` 등 별도 위치에 배치
- UI 컴포넌트/폼 패턴은 `apps/admin` 내부 레이어에서 관리
- 운영 효율 + 데이터 입력 흐름 우선
- 반복 패턴 충분히 생기면 내부 공용 컴포넌트 정리 → 이후에만 분리 검토

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
- TanStack Query 상세 패턴: Root CLAUDE.md "데이터 페칭 패턴" 섹션 참조

### API Route 파일 배치

```
app/api/{domain}/route.ts              # 목록(GET), 생성(POST)
app/api/{domain}/[id]/route.ts         # 상세(GET), 수정(PATCH), 삭제(DELETE)
app/api/{domain}/[id]/{action}/route.ts # 특수 액션 (approve, suspend 등)
```

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

| 세그먼트 | 역할 | 예시 |
|----------|------|------|
| `ui/` | React 컴포넌트 (Server/Client) | `UserTable.tsx`, `ProfileForm.tsx` |
| `api/` | fetch 함수, queryOptions, useMutation 훅 | `userFetchers.ts`, `useUserMutations.ts` |
| `model/` | 타입, Zod 스키마, 상수, 필터 정의 | `userFilters.ts`, `loginSchema.ts` |
| `config/` | 설정 상수 (navigation 등) | `navigation.ts` |
| `lib/` | 유틸리티 함수, 헬퍼 | `checkPermission.ts`, `cookies.ts` |

금지: `schemas/`, `hooks/`, `types/`, `utils/` 등 비표준 세그먼트
예외: `shared/hooks/`는 shadcn/ui 생성 훅으로 허용

## 유효성 검사 규칙

- 필수값 누락 시 저장 불가
- `published` 상태에서는 추가 검증 강화
- 연결형 데이터는 참조 무결성 확인
- 날짜 범위는 논리적으로 유효해야 함
- UI + 서버 양쪽에서 검증

### 대표 검증 항목

- 서브 페이지/게시글 제목 필수
- `published` 서브 페이지/게시글은 slug 필수
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
