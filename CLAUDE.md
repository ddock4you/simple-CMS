# Simple CMS

Next.js 기반의 관리자 CMS(admin)와 공개 웹(web)을 모노레포로 분리 운영하는 실무형 CMS 프로젝트.
Prisma + PostgreSQL, PGroonga 한글 검색, KRDS 기반 공개 웹 UI, 제한형 블록 구조, Docker/CI까지 포함.

## 기술 스택

| 영역          | 도구                                     | 비고                                                                       |
| ------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| 앱 프레임워크 | Next.js 16 + React 19.2 + TypeScript     | admin, web 모두                                                            |
| 모노레포      | pnpm workspace + Turborepo               | pnpm@10.33.0, Node 22                                                      |
| 데이터        | PostgreSQL + Prisma ORM                  | 개발: Docker `groonga/pgroonga` 이미지, 프로덕션: Supabase PostgreSQL 가능 |
| 검색          | PGroonga                                 | PostgreSQL 확장, 한글 검색 필수, 로컬/Supabase 모두 지원                   |
| 공개 웹 UI    | KRDS + Storybook                         | web 앱 전용                                                                |
| 관리자 UI     | 디자이너 Figma 시안 기반                 | admin 앱 전용, KRDS 미사용                                                 |
| 콘텐츠        | Tiptap WYSIWYG (JSON 저장)               | 문서형 콘텐츠 + 제한된 블록, 검색용 plain text 동시 저장                   |
| 배포          | Docker + Docker Compose + GitHub Actions | 앱별 별도 이미지                                                           |

## 모노레포 구조

```
workspace/
├── apps/
│   ├── admin/
│   │   ├── app/        # Next.js App Router (루트에 배치)
│   │   ├── pages/      # Pages Router placeholder (README.md만)
│   │   └── src/        # FSD 레이어 (pages, features, entities, shared)
│   └── web/
│       ├── app/        # Next.js App Router (루트에 배치)
│       ├── pages/      # Pages Router placeholder (README.md만)
│       └── src/        # FSD 레이어 (pages, widgets, features, entities, shared)
├── packages/
│   ├── db/             # Prisma schema, client, query helper
│   ├── editor/         # Tiptap 공유 확장 정의, 콘텐츠 CSS
│   ├── types/          # 공용 DTO, 도메인 인터페이스
│   └── config/         # tsconfig, eslint 공유 설정
├── docker/             # Docker Compose (PGroonga PostgreSQL, 로컬 개발)
└── docs/               # 설계 문서 (8개)
```

### 구조 원칙

- UI 컴포넌트는 공용 패키지로 분리하지 않음 (각 앱 내부에서 관리)
- 공용 패키지는 DB, 타입, 설정처럼 실제로 공유하는 책임만 담당
- 앱 내부는 FSD(Feature-Sliced Design) 기반

## FSD 적용 전략

### web (정석 FSD)

레이어: app → pages → widgets → features → entities → shared

- 루트 `app/`은 Next.js App Router 라우팅 전용
- 실제 FSD 레이어는 `src/` 아래 구성
- `src/pages`는 FSD pages 레이어

### admin (경량 FSD)

레이어: app → pages → features → entities → shared

- `widgets`는 필요 시에만 도입
- 내부 운영도구 특성상 과도한 계층화 피함

### Next.js Pages Router 충돌 방지

Next.js는 `src/pages/`를 Pages Router로 자동 인식하여 FSD pages 레이어와 충돌한다.
이를 해결하기 위해 각 앱에서 다음 구조를 사용한다:

```
apps/{앱}/
├── app/              # Next.js App Router (src/app/ → 루트로 이동)
├── pages/            # Pages Router placeholder (README.md만)
│   └── README.md
├── src/
│   ├── pages/        # FSD pages 레이어 (원래 이름 유지)
│   └── ...
```

- `app/`과 `pages/`를 모두 앱 루트에 배치하여 "same folder" 제약 충족
- Next.js가 루트 `pages/`를 Pages Router로 인식 → `src/pages/`는 일반 디렉토리
- 참고: https://feature-sliced.design/kr/docs/guides/tech/with-nextjs

## 도메인 모델

| 모델                   | 설명                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **User**               | 관리자 계정, username/password 인증, 가입 승인제(PENDING→ACTIVE), Role FK 기반 권한                                     |
| **Role**               | 역할(등급) 정의, name·permissions(Json)·isSystem·isDefault, 메뉴별 CRUD 권한 매트릭스                                   |
| **Subpage**            | 서브페이지, 콘텐츠는 PageBlock 목록으로 관리 (RICH_TEXT/HTML/IMAGE/IFRAME 자유 순서), 검색용 plain text(`content`) 유지 |
| **Board**              | 게시판 설정, 스킨(list/gallery), slug, 공개 여부                                                                        |
| **Post**               | 게시판 소속 게시글, 목록/상세 렌더링 대상                                                                               |
| **HomeSection**        | 메인 페이지 전용 섹션 설정                                                                                              |
| **HomePopup**          | 메인 페이지 전용 팝업 (콘텐츠형/이미지형)                                                                               |
| **PageBlock**          | 서브페이지 콘텐츠 블록 (blockType: RICH_TEXT/HTML/IMAGE/IFRAME + configJson, displayOrder 기반 자유 순서)               |
| **Media**              | 이미지/파일 메타데이터, 1차는 대표 이미지 중심                                                                          |
| **NavigationMenu**     | 메뉴 묶음, slots 배열(HEADER/FOOTER/SIDEBAR)로 공개 웹 배치 위치 지정, 복수 슬롯 가능                                   |
| **NavigationMenuItem** | 메뉴 항목 (SUBPAGE/BOARD/EXTERNAL/CUSTOM 연결)                                                                          |
| **AuditLog**           | 관리자 활동 이력, append-only, 데이터 변경 + 인증 이벤트 기록                                                           |
| **SiteSettings**       | 사이트 전역 설정 (도메인, 사이트명 등), 키-값 구조                                                                      |
| **ErrorLog**           | 공개 웹 런타임 에러 로그, 서버/클라이언트 에러 기록, fingerprint 기반 그룹핑                                            |
| **Session**            | 커스텀 DB 세션, crypto.randomUUID 기반 토큰, httpOnly 쿠키, 동시 로그인 제어 대상                                       |
| **PreviewToken**       | draft 미리보기 토큰 (Stage 7a), TTL 10분, admin→web 교환 후 web 도메인 쿠키로 치환                                      |
| **SubpageFeedback**    | 공개 웹 익명 만족도 조사 (Stage 10), 네/아니오 + 긍정 이유 + 자유 텍스트, IP 해싱, 24h rate limit                        |

## 운영 정책

### 콘텐츠 상태

- 1차: `draft` / `published` (2차: `archived` 확장 가능)
- 공개 웹 노출, 검색, 메뉴 연결 대상은 `published`만 허용
- `published` 전환 시 `publishedAt` 기록
- `draft`는 관리자 내부 + 미리보기(Stage 7a)에서만 확인
  - admin이 발급한 `PreviewToken`을 교환해 web 도메인에 `preview_session` httpOnly 쿠키(TTL 10분) 세팅 → web Server Component가 draft/숨김 블록 포함 렌더링
  - admin(3001)과 web(3000)의 크로스 오리진 세션 쿠키 공유 문제를 토큰 교환으로 해결

### 삭제 정책

- 1차에서 hard delete 허용
- 다른 엔티티가 참조 중이면 삭제 전 경고/차단
- 서브 페이지 삭제 시 → 메뉴, 메인 섹션, 블록 연결 검증
- 게시판 삭제 시 → 소속 게시글 존재 여부 확인
- 삭제 후 같은 그룹 내 `displayOrder` 서버 재정렬

### slug 정책

- Subpage, Board, Post 각 도메인별 slug 관리
- 같은 공개 경로 체계 내 slug 중복 불가
- 제목 기반 자동 생성 + 수동 수정 가능
- `published` 상태에서 slug 변경 시 경고
- Post slug는 게시판 단위 unique (`boardSlug + postSlug`)

### 정렬 규칙

- 정렬 필드: `displayOrder`
- 순서 변경은 서버에서 최종 재정렬
- 비노출 항목도 순서 값 유지
- 삭제/이동 후 서버에서 순서 정규화

### 사이트 설정 정책

- `SiteSettings` 테이블: 키-값 구조로 사이트 전역 설정 관리
- 커스텀 도메인: admin에서 공개 웹 도메인을 설정하면 재배포 없이 반영
- 도메인 설정 시 DNS 검증 기능 제공 (정보성, 차단 아님)
- 도메인 미설정 시 `NEXT_PUBLIC_SITE_URL` 환경변수로 폴백
- 상세 명세: `docs/react-cms-커스텀-도메인-명세서.md`

### 동시 로그인 정책

- `SiteSettings` 키: `CONCURRENT_LOGIN_ENABLED` (`"true"` / `"false"`, 기본값: `"true"`)
- `"true"`: 같은 관리자 계정으로 여러 기기/브라우저에서 동시 로그인 허용
- `"false"`: 새 로그인 시 기존 세션을 모두 무효화 (단일 세션 강제)
- 설정 변경 시 기존 활성 세션은 즉시 무효화하지 않음 — 다음 로그인 시점부터 적용
- 감사 로그: 설정 변경 시 `SITE_SETTINGS` entityType으로 기록

### 업로드 제한 정책

- `SiteSettings` 키 3개로 파일 업로드 제한 관리
  - `UPLOAD_ALLOWED_EXTENSIONS`: 허용 확장자 JSON 배열 (예: `'[".jpg",".png",".pdf"]'`)
  - `UPLOAD_ALLOWED_MIME_TYPES`: 허용 MIME 타입 JSON 배열 (예: `'["image/jpeg","application/pdf"]'`)
  - `UPLOAD_MAX_FILE_SIZE_MB`: 최대 파일 크기 MB 단위 숫자 문자열 (기본값: `"10"`)
- 확장자 + MIME 타입 이중 검증 (defense in depth)
- 미설정 시 기본값 폴백 (이미지 + 주요 문서 확장자)
- 업로드 엔드포인트에서 설정값을 조회하여 서버 사이드 검증 수행
- 감사 로그: 설정 변경 시 `SITE_SETTINGS` entityType으로 기록

### 파일 업로드 스토리지 정책

- **스토리지 어댑터 추상화**: `apps/admin/src/shared/lib/storage/` — 환경변수로 provider 선택
  - `STORAGE_PROVIDER=local` (기본): 로컬 파일시스템, `apps/web/public/uploads/{category}/` 에 저장 → web이 `/uploads/...` URL로 자동 서빙
  - `STORAGE_PROVIDER=supabase`: Supabase Storage API, `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_STORAGE_BUCKET` 필요
  - 어댑터 인터페이스: `upload(input)`, `delete(storageKey)`, `urlToStorageKey(url)` — 라이브러리 삭제 시 URL → storageKey 역변환
- 업로드 엔드포인트: `POST /api/media/upload` (multipart/form-data, 필드 `file` + `category`)
- 업로드 시 `Media` 테이블 레코드 생성 — 파일명, 원본 파일명, MIME, 크기, 공개 URL, **contentHash(SHA-256)**, **uploadedById** 저장
- 감사 로그: 업로드 시 `MEDIA` entityType, `CREATE` action (재사용 시 skip)
- 파일명 생성: `{timestamp}-{uuid}{ext}` 형식 — 충돌 방지 + 경로 traversal 방어
- 이미지 업로드 엔드포인트는 이미지 MIME 타입만 허용 (jpeg/png/gif/webp/svg+xml)
- Docker 배포 시 `apps/web/public/uploads/`에 볼륨 마운트 필요 (local provider)

### 사이트 브랜딩 + SEO 메타데이터 정책 (Stage 7l)

- **6개 SiteSettings 키 통합 관리** (`/settings/branding`):

  | 키                       | 값            | 설명                                          |
  | ------------------------ | ------------- | --------------------------------------------- |
  | `SITE_NAME`              | string        | 헤더 폴백 텍스트, metadata title, 푸터 copyright |
  | `SITE_DESCRIPTION`       | string        | metadata description (SEO)                    |
  | `SITE_LOGO_MEDIA_ID`     | Media.id 문자열 | 헤더 로고                                      |
  | `SITE_LOGO_ALT`          | string        | 로고 sr-only 텍스트 (비우면 SITE_NAME 폴백)     |
  | `SITE_FAVICON_MEDIA_ID`  | Media.id 문자열 | 브라우저 탭 favicon                            |
  | `SITE_OG_IMAGE_MEDIA_ID` | Media.id 문자열 | OG 카드 미리보기 (1200x630 권장)               |

- **mediaId만 저장 + Media join**: URL은 별도 키로 저장하지 않고 GET/캐시에서 `Media.url` join. 단일 출처 + Media 삭제 시 자동 일관성. **외부 URL 직접 입력 차단** — 보안(SVG MIME 검증 불가) + SVG 차단 정책 일관성. 운영자는 업로드 또는 라이브러리에서만 선택
- **SVG 차단 (모든 키 공통)**: `/api/media/branding-upload`에서 `image/svg+xml` 거부. 새 탭에서 SVG가 `<script>` 실행 가능한 XSS 위험 회피. 기존 `/api/media/upload`는 정책 변경 없음
- **MediaPicker 우회 차단 (defense-in-depth)**:
  - 서버 게이트: PATCH 시 logoMediaId/faviconMediaId/ogImageMediaId의 Media.mimeType을 키별 화이트리스트로 검증 (로고/OG: PNG/JPG/WEBP, favicon: PNG/WEBP/ICO 4종)
  - UX 게이트: MediaPicker `acceptMimeTypes` prop으로 비매칭 카드 disabled + Tooltip 표시 (hide 아님 — "어제 올린 SVG가 왜 안 보이지?" 혼란 회피)
- **참조 추적 화이트리스트**: `apps/admin/src/features/media-management/lib/mediaBearingSettings.ts`의 `MEDIA_BEARING_SETTING_KEYS`가 단일 출처. `findMediaReferences()`의 8번째 경로에서 부분 스캔. 향후 미디어 키 추가(예: 다중 favicon, 폴백 OG) 시 한 곳만 수정
- **공개 웹 캐시**: `apps/web/src/shared/lib/brandingCache.ts`가 `domainCache.ts` 동일 패턴(인메모리 60s prod / 5s dev TTL). admin → web 별 인스턴스라 즉시 invalidate 불가 → "최대 1분 후 반영" UI 명시. brandingCache fetch 실패 시 폴백 객체 반환 (페이지 렌더 차단 안 함)
- **favicon cache busting**: `<link rel="icon" href="${url}?v=${mediaId}">` — 동일 바이너리 재업로드는 같은 mediaId라 무효화 발생 안 함 (의도적). 다른 favicon 업로드 시 mediaId 변경 → 브라우저가 새 favicon fetch
- **헤더 로고 마크업**: KRDS `Header.Branding`은 `children`을 `.logo` `<h2>` **밖**에 렌더하므로 로고 이미지를 클릭 가능 영역 안에 두려면 그대로 사용 불가. **Stage 7d `RightSidebar`/`SubpageSideNavigation` 동일 패턴**으로 KRDS DOM 클래스(`.header-branding > h2.logo > a`) 차용한 커스텀 JSX(`apps/web/src/widgets/layout/ui/HeaderBranding.tsx`)로 대체. KRDS 메이저 업데이트 시 이 컴포넌트 + 7d 2개를 함께 점검
- **generateMetadata 동적화**: `apps/web/app/layout.tsx`가 `export const metadata` → `export async function generateMetadata()` 변환. SITE_NAME으로 `title.default` + `template`, SITE_DESCRIPTION으로 `description`, faviconUrl로 `icons.icon`, ogImageUrl로 `openGraph.images` 자동 채움. try/catch + 폴백으로 brandingCache 실패 시에도 페이지 렌더 차단 안 함
- **app 디렉토리 file convention 충돌 주의**: `apps/web/app/favicon.ico` / `app/icon.*` / `app/apple-icon.*` / `app/opengraph-image.*` 파일은 Next.js가 자동 picking하여 `generateMetadata().icons` / `openGraph`를 override함. Stage 7l 진입 시 0건 확인 완료 — **누군가 이 파일들을 추가하면 동적 favicon/OG가 무시됨**. 추가 금지

### 미디어 라이브러리 정책 (Stage 5a-2)

- **중복 방지**: 업로드 시 SHA-256 해시로 동일 바이너리 검출 → 기존 Media 레코드 재사용 (응답 `reused: true`, 파일 저장 + 새 레코드 생성 모두 skip)
- **참조 추적**: `findMediaReferences(mediaId)`가 다음 위치를 스캔 — Subpage/Post.featuredImageId, HomeSection.configJson(JSONB), Subpage/Post.contentJson(Tiptap 재귀)
- **삭제 차단**: 참조가 1건이라도 있으면 409 + 사용처 목록 반환 → 강제 삭제 불허, UI에서 사용처 표시
- **권한**: 새 `media` 리소스 (`create/read/update/delete`). 일반 관리자 기본은 `read + create`
- **라이브러리 UI**: `/media` 페이지 — 그리드 + 필터(q, mimeType) + 페이지네이션 + 상세 Dialog (alt 편집 + 사용처 표시 + 삭제) + 체크박스 일괄 선택/삭제
- **MediaPicker**: 동일 컴포넌트가 `/media`, HERO/RECOMMENDED 편집의 ImageUrlInput, Tiptap 본문 툴바 3곳에서 재사용
- **Tiptap 통합**: paste/drop 자동 업로드, 툴바 [업로드/라이브러리/URL] 드롭다운, image 노드 `attrs.mediaId` + HTML `data-media-id` 보존
- **일괄 삭제**: `POST /api/media/bulk-delete` — 트랜잭션 없이 건별로 참조 확인 후 삭제/차단 분리. 응답 `{ deleted, blocked }`로 부분 성공 표현
- **URL 경계 정규화**: DB에는 상대 경로(`/uploads/...`) 저장, admin 표시 시점에만 `resolveMediaPreviewUrl`로 절대 URL 변환. Tiptap은 JSON 단계 preprocess/postprocess로 initial 404 잔상 방지. provider(local/Supabase/S3) 전환 시 해당 렌더링 코드 수정 불필요
- **Media 레코드**는 공용 리소스 — Stage 5b 팝업, 향후 게시글 본문 등에서도 동일 패턴으로 재사용

### 사용자 피드백 정책 (Stage 10)

- **수집 모델**: `SubpageFeedback` (subpageId, rating POSITIVE/NEGATIVE, positiveReasons String[], comment, ipAddressHash, userAgent). KRDS 가이드(https://www.krds.go.kr/html/site/global/global_05.html) + Figma 시안(`r1dfm2jnjfajM4bL0CpNGu` node `50:3508`) 준수
- **opt-in 토글**: `Subpage.feedbackEnabled Boolean @default(false)` — 운영자가 페이지별 명시적으로 켜야 공개 웹에 위젯 노출. SubpageForm "공개 옵션" 섹션의 체크박스로 관리
- **노출 조건**: `feedbackEnabled === true && status === 'PUBLISHED'`. preview 세션은 위젯 자체는 렌더하되 평가완료 버튼 disabled (운영자 미리보기에서 통계 오염 방지)
- **익명 수집 — IP 해싱**: `apps/web/app/api/feedback/route.ts`가 `sha256(ip + FEEDBACK_IP_SALT)`로 해시만 저장, raw IP 저장 금지. `.env`의 `FEEDBACK_IP_SALT` 운영 배포 전 강한 랜덤 값으로 교체 필수
- **Rate limit**: `(ipAddressHash, subpageId, createdAt >= now - 24h)` 조합 1건이라도 있으면 429. DB 쿼리 기반(in-memory 카운터 아님). IP 해싱 실패 시 rate limit 미적용
- **클라이언트 재제출 차단**: `feedback_submitted_{subpageId}` localStorage 키, 24h TTL. 서버 차단(429)이 진실의 원천이고 클라이언트는 UX 친화적 표시 (감사 메시지 즉시 노출)
- **감사 로그 정책**: 제출(POST)은 익명 입수 트래픽이라 감사 로그 **생략** (route handler에 사유 주석 명시). DELETE만 `entityType: 'SUBPAGE_FEEDBACK'`로 기록 (운영자 액션이므로)
- **권한 리소스**: `subpage-feedback` (`read`, `delete`). create/update는 의미 없음 (익명 수집 + 운영자 편집 미도입). DEFAULT_PERMISSIONS는 `read`만 부여
- **seed 동작 분기**: 운영 중 DB에 새 리소스 추가 시 `pnpm seed`는 총괄 관리자(`isSystem`) `permissions`만 자동 동기화. 일반 관리자는 `update: {}`라 보존 → admin `/settings/roles`에서 수동 활성화 필요
- **SubpageVersion 스냅샷 포함**: `feedbackEnabled`도 메타에 포함 → 롤백 시 함께 복원 (Stage 7m과 일관)
- **삭제 정책**: `Subpage @relation(onDelete: Cascade)` — Subpage 삭제 시 모든 피드백도 자동 삭제. `findMediaReferences()` 확장 불필요 (Media FK 없음)
- **통계**: admin `/subpage-feedback` 페이지에서 recharts 기반 차트 (일별 BarChart + 긍정 이유 BarChart) + 서브페이지별 표 + 목록. 시작/끝 DatePicker가 단일 출처(period select 미사용 — 우선순위 모호 회피). Prisma `findMany` + JS 집계 (수만 건 처리 가능). 통계/목록/내보내기 세 경로 모두 KST 자정 경계(`T00:00:00+09:00` ~ `T23:59:59.999+09:00`)로 정렬되어 한국 운영자가 입력한 날짜와 정확히 일치
- **Excel 내보내기**: admin `/subpage-feedback` 헤더 우측 [Excel 다운로드] 버튼 — 화면에 적용된 from/to/rating/subpageId/q 필터를 그대로 반영해 raw 데이터 워크북 생성. 컬럼 8개(제출일시 KST · 서브페이지 제목 · 슬러그 · 평가 · 긍정 이유 · 자유 의견 · IP 해시 · User Agent), 헤더 굵게 + freeze pane + AutoFilter. 0건일 때 응답 `X-Row-Count: 0` 헤더로 클라이언트가 info 토스트 안내. 내보내기 자체를 감사 로그에 기록(`entityType: SUBPAGE_FEEDBACK`, `action: CREATE`, entityTitle "사용자 피드백 내보내기" — IP 해시 + UA 외부 반출 추적)
- **MVP 범위 외**: isResolved 토글 / 카테고리·태그 / 대시보드 위젯 / 알림. Stage 11+ 확장 후보

### 역할/권한 관리 정책

- `Role` 테이블: 역할(등급) 정의, `permissions` JSON으로 메뉴별 CRUD 권한 저장
- 총괄 관리자: `isSystem: true`, 모든 권한 보유, 삭제/권한 수정 불가
  - UI에서 다른 사용자에게 배정 가능 (총괄 관리자만 가능)
  - 마지막 총괄 관리자의 역할 변경 불가
- 기본 역할: `isDefault: true`, 가입 승인 시 자동 부여 (하나만 가능)
  - 기본 역할은 다른 역할을 기본으로 설정한 후에만 삭제 가능
- PENDING 유저: `roleId` null → 승인 시 기본 역할 배정
- 역할 삭제: 배정된 사용자가 있으면 경고 + 확인 후 삭제 (`onDelete: SetNull`)
  - 삭제 후 해당 사용자는 roleId null → 권한 없음 상태 (대시보드/프로필만 접근)
- 권한 변경: 다음 요청부터 즉시 반영 (DB 세션 eager-load 방식)
- 리소스 레지스트리: `packages/types`의 `RESOURCE_ACTIONS` 상수가 단일 진실의 원천
  - UI(권한 매트릭스), 사이드바 필터링, Seed 스크립트 모두 이 상수에서 파생
- 감사 로그: 역할 생성/수정/삭제, 권한 변경, 사용자 역할 배정 모두 기록 (`ROLE` entityType)

### 권한 체크 패턴 (필수 준수)

**admin에 새 기능 추가 시 권한 체크는 API + UI 양쪽 모두 적용이 기본값**이다.

**서버 (API Route)**:

- 모든 데이터 변경/조회 API Route에서 `requirePermission(resource, action)` 호출
- 미인증 → 401, 권한 없음 → 403

**클라이언트 (UI)**:

- `(authenticated)/layout.tsx`에서 `<PermissionProvider>`로 모든 인증 페이지를 감쌈
- Client Component에서 `usePermission(resource, action): boolean` 훅으로 권한 체크
- Server Component에서는 `hasPermission(user, resource, action)` 직접 호출
- 권한 없는 사용자에게는 해당 버튼/링크를 숨김 (생성/편집/삭제 버튼 등)
- 사이드바: `getVisibleMenuItems()`로 read 권한 없는 메뉴 숨김

**뷰/편집 분리 패턴**:

- 상세 페이지는 읽기 전용 뷰(`/[id]`)가 기본, 편집(`/[id]/edit`)은 별도 라우트
- 뷰 페이지에서 update 권한이 있을 때만 "편집" 버튼 표시
- 목록에서도 read(보기)와 update(편집) 버튼을 권한별로 분리

**체크리스트** (새 기능 개발 시):

1. API Route: `requirePermission()` 호출 추가
2. 목록 UI: 생성 버튼에 `create` 권한 체크
3. 테이블: 편집 버튼에 `update` 권한 체크
4. 상세 뷰: 편집/삭제 버튼에 `update`/`delete` 권한 체크
5. 사이드바: navigation.ts에 `resource` 필드 추가

### 가입 승인 정책

- 회원가입 시 `PENDING` 상태로 생성, 기존 ACTIVE 관리자가 승인해야 `ACTIVE`로 전환
- `ACTIVE` 상태만 로그인 가능
- `PENDING` 상태에서 로그인 시도 시 "승인 대기 중" 메시지 표시
- `SUSPENDED` 상태: 관리자가 비활성화, 해당 사용자의 모든 세션 즉시 삭제
- 자기 자신은 정지 불가, 마지막 ACTIVE 관리자는 정지 불가
- 최초 관리자: `prisma/seed.ts`로 `.env`의 초기 계정을 ACTIVE 상태로 생성
- 가입 거절 시 PENDING 유저 레코드 hard delete (1차 삭제 정책과 동일)

## 시연 모드 (DEMO_MODE) 격리 인프라

`DEMO_MODE=true` 환경에서 같은 DB·코드 베이스로 여러 방문자에게 격리된 시연 세션을 제공한다. 운영(`DEMO_MODE` 미설정)과 시연이 **단일 스택을 공유**하며, master 브랜치 한 곳에서 양쪽이 모두 동작하도록 설계한다.

### 핵심 원리

- **17개 모델에 `sessionId String @default("__PROD__")` sentinel 컬럼**: 운영은 모두 `'__PROD__'`, 시연 세션은 각 visitor의 cuid 값
- **8개 모델 composite unique**: 같은 slug/key/name이 세션마다 1건씩 가능
  - SiteSettings(`[sessionId, key]`), Role(`[sessionId, name]`), NavigationMenu(`[sessionId, name]`), Media(`[sessionId, contentHash]`)
  - Subpage(`[sessionId, slug]`), Board(`[sessionId, slug]`), Post(`[sessionId, boardId, slug]`), User(`[sessionId, username]` + `[sessionId, email]`)
  - Session.sessionToken / PreviewToken.token은 글로벌 `@unique` 유지 (인증 인프라)
- **Prisma extension**: `packages/db/src/demo/clientExtension.ts`가 `DEMO_MODE=true`일 때 자동 sessionId 주입 + cross-tenant 차단. 운영에서는 `$extends` 미적용, 0 cost
- **AsyncLocalStorage**: `packages/db/src/demo/sessionContext.ts`가 한 요청에 sessionId를 묶어 모든 await 체인에 전파
- **운영 영향 0**: 모든 운영 데이터는 sessionId='__PROD__'라 composite unique가 글로벌 unique와 동일하게 동작. extension 미적용 환경에서는 sentinel만 schema default로 채워짐

### 새 코드 작성 시 따라야 할 관습 (master 브랜치 기본값)

| 패턴 | Before (격리 도입 전) | After (현재) |
|---|---|---|
| 단일 필드 unique lookup | `prisma.x.findUnique({ where: { slug } })` | `prisma.x.findFirst({ where: { slug } })` — extension이 sessionId 자동 주입 |
| upsert | `prisma.x.upsert({ where: { key }, ... })` | `findFirst → update | create` 명시 분기 (extension은 upsert에서 cross-tenant 안전 처리 어려움 → 경고 출력) |
| Raw SQL | `WHERE status = 'PUBLISHED'` | `WHERE status = 'PUBLISHED' AND "sessionId" = ${getCurrentSessionId()}` (`$queryRaw`는 extension hook 우회) |
| 인증 부트스트랩 | `getSessionUser(token)` | `demo.runWithBypass(() => getSessionUser(token))` — Session+User+Role include 체인 안전망 |
| Seed / 일회성 스크립트 | 일반 PrismaClient 사용 | composite where 명시 (`where: { sessionId_key: { sessionId: '__PROD__', key } }`) — seed는 운영 시드라 sentinel 직접 사용 |
| `id` 기반 lookup | `findUnique({ where: { id } })` | 그대로 — extension이 result hook에서 sessionId 검증 (`select` 빠뜨려도 자동 주입 후 응답에서 strip) |

### Critical files

**격리 인프라 (PR3)**
- `packages/db/prisma/schema.prisma` — 17 모델 sentinel + 8 composite unique
- `packages/db/src/demo/sessionContext.ts` — AsyncLocalStorage + `enterWith` / `runWith` / `runWithBypass` / `getCurrentSessionId` / `isBypassed`
- `packages/db/src/demo/clientExtension.ts` — `Prisma.defineExtension` + `processOperation` (테스트 가능 named export)
- `packages/db/src/demo/index.ts` — `import { demo } from '@simple-cms/db'` 진입점
- `packages/db/src/client.ts` — `DEMO_MODE === 'true'`일 때만 `$extends` 적용
- `packages/db/prisma/backfill-session-id.ts` — NULL → '__PROD__' 멱등 백필 (PR3 schema 적용 시 1회 실행)

**자동 진입 흐름 (PR4)**
- `packages/db/prisma/demo-seed.ts` — `__SEED__` row prefill (Role x2 / User `demo_admin` / SiteSettings x6 / NavigationMenu x2 / Board / Subpage `about` PUBLISHED / PageBlock RICH_TEXT / HomeSection x6 / NavigationMenuItem x2 = 22 row 멱등). `pnpm db:demo-seed`
- `packages/db/src/demo/cloneSeedToSession.ts` — 14모델 in-memory remap 클론 (cuid2 사전 생성 + `createMany` bulk insert + NavigationMenuItem `parentId` 2-pass + 30s transaction). 호출자는 `demo.runWithBypass`로 감쌈
- `packages/db/src/demo/SeedNotFoundError.ts` — `code: 'SEED_NOT_FOUND'` 에러 (bootstrap API 503 분기)
- `apps/admin/app/api/demo/bootstrap/route.ts` — POST `/_cms/admin/api/demo/bootstrap`. 새 sessionId 발급 → 클론 → demo admin User로 Session 생성 → Set-Cookie. 503/500 분기
- `apps/{admin,web}/app/demo-bootstrap/{page,DemoBootstrapClient}.tsx` — splash UI 양쪽 동일 (admin basePath 자동 prepend로 admin layout redirect는 admin origin splash로 향함)
- `apps/{admin,web}/src/shared/lib/ensureDemoSession.ts` — layout gate. cookie 검증 → `enterWith({sessionId})` 부착 또는 splash redirect. self-loop 회피 (`/demo-bootstrap` prefix skip)
- `apps/{admin,web}/src/shared/lib/getCurrentPathname.ts` — `headers().get('x-pathname')` (proxy.ts 주입)
- `apps/{admin,web}/proxy.ts` — `x-pathname` 헤더 주입 (admin 신규, web 기존 도메인 redirect 위에 추가)
- `apps/admin/app/(authenticated)/layout.tsx` + `apps/web/app/layout.tsx` — `requireAuth()` / 데이터 fetch 직전에 `ensureDemoSession(currentPath)` 호출
- `apps/admin/app/(auth)/{login,register}/page.tsx` — DEMO_MODE 시 즉시 `/dashboard` redirect (자동 진입과 일관성)
- `apps/admin/src/shared/lib/cookies.ts` + `packages/db/src/sessionHelper.ts` — `SESSION_MAX_AGE` / `SESSION_MAX_AGE_MS`를 DEMO_MODE에서 1시간으로 단축 (양쪽 동시 분기)

**Storage 격리 + 자동 정리 + Banner UX (PR5)**
- `apps/admin/src/shared/lib/storage/supabaseAdapter.ts` — `upload()`에 `getCurrentSessionId()` 기반 prefix(`<sessionId>/<category>/<filename>`, `__PROD__`/비DEMO는 prefix 없이 기존 동작) + `delete()`에 `__SEED__/` 가드 (visitor가 라이브러리에서 시드 이미지 [삭제] 시도해도 DB row만 삭제되고 Supabase 파일은 보존 — 모든 visitor 시드 공유 보호) + `cleanupSessionFolder(sessionId)` 메소드 (cron이 사용하는 2-pass list/remove)
- `packages/db/src/demo/sessionContext.ts` — `RESERVED_SESSION_IDS` Set export (PROD_SENTINEL + SEED_SENTINEL 단일 출처)
- `packages/db/src/demo/cleanupSessions.ts` — `cleanupExpiredSessions({ now?, cleanupStorage?, forceSessionIds? })`. `runWithBypass` 자동 wrap, 17 모델 deleteMany 자식→부모 순서, Storage cleanup callback 패턴(packages/db는 supabase 의존성 없음), 단계별 try/catch로 부분 실패 허용
- `apps/admin/app/api/demo/cleanup/route.ts` — GET/POST. `Authorization: Bearer ${CRON_SECRET}` timing-safe 검증, DEMO_MODE 미활성화 503, Supabase 어댑터 cleanup 콜백 주입
- `apps/admin/app/api/demo/reset/route.ts` — POST. visitor 즉시 초기화. `forceSessionIds: [user.sessionId]`로 cleanup + clearSessionCookie + `redirectTo: '/demo-bootstrap'` 응답
- `apps/admin/vercel.json` — `crons: [{ path: '/api/demo/cleanup', schedule: '0 3 * * *' }]` (Vercel Hobby plan, daily, KST 12:00)
- `apps/{admin,web}/src/shared/lib/ensureDemoSession.ts` — 반환 type `Promise<{sessionId, expiresAt} | null>`. 5% 확률로 `after()` 후크에서 `cleanupExpiredSessions()` lazy 트리거 (응답 송신 후 실행 → visitor latency 0, Storage는 cron이 처리 — lazy는 DB만)
- `apps/admin/src/shared/ui/DemoBanner.tsx` — Client. `sticky top-0 z-50 h-9`. Badge(warning) + 카운트다운(setInterval 1s) + AlertDialog confirm → POST `/_cms/admin/api/demo/reset` → `router.replace`. fetch endpoint 명시 prefix(`/_cms/admin/...`) — Next.js fetch는 basePath 자동 prepend 안 함
- `apps/web/src/shared/ui/DemoBanner.tsx` — admin과 동일 동작, native `window.confirm` 사용(KRDS shadcn 미사용 일관성), inline style(KRDS Tailwind utility 외 hex 직접 색)
- `apps/admin/app/(authenticated)/layout.tsx` + `apps/web/app/layout.tsx` — `ensureDemoSession` 결과를 prop으로 받아 DemoBanner 마운트. admin은 `<SidebarProvider style={{'--demo-banner-h': '2.25rem'}}>` 으로 CSS 변수 주입
- `apps/admin/app/globals.css` — `:root`에 `--demo-banner-h: 0px` 기본값 추가
- `apps/admin/src/widgets/admin-header/ui/AdminHeader.tsx` — `top-0` → `top-[var(--demo-banner-h,0px)]` (banner 마운트 시 자동 36px 보정)
- `apps/admin/src/shared/ui/PageToolbar.tsx` — `top-14` → `top-[calc(3.5rem+var(--demo-banner-h,0px))]` (sticky chain 자동 보정, 비DEMO 영향 0)

**Snapshot Export/Import + CLI (PR6)**
- `packages/db/src/demo/snapshot.types.ts` — Zod `snapshotPayloadSchema` v1 + 14모델 row 타입(SnapshotRoleRow, SnapshotMediaRow, ...). User.password 의도적 제외, Media.uploadedById null로 anonymize, Media에 `base64Data` 첨부
- `packages/db/src/demo/snapshotWalker.ts` — `walkSnapshotForRemap(payload, idMap, kind)` in-place mediaId/boardId 재매핑. 위치별 field name 분기(HERO/RECOMMENDED `slides[].mediaId` / IMAGE `imageMediaId` / RICH_TEXT Tiptap recursion / SubpageVersion.snapshot meta+blocks / HomePopup CONTENT). Tiptap image 노드 `attrs.mediaId` 재귀
- `packages/db/src/demo/exportMedia.ts` — sharp 1600px 리사이즈(`withoutEnlargement`) + JPEG quality 80 (image/jpeg|png|webp만 — SVG/GIF/PDF 원본 유지) + provider별 downloader factory(`createLocalMediaDownloader` / `createSupabaseMediaDownloader`) + `extractStorageKeyFromUrl`
- `packages/db/src/demo/exportSnapshot.ts` — `exportSnapshot({sourceSessionId, downloadMedia, urlToStorageKey, concurrency=4})`. 14모델 findMany + Media binary 처리 (`p-limit`-style worker pool) + `runWithBypass` 자동 wrap
- `packages/db/src/demo/resetSeedData.ts` — `cleanupExpiredSessions`와 분리된 별도 헬퍼. `__SEED__` row 14모델 deleteMany 자식→부모 순 + cleanupStorage 콜백 위임. RESERVED 가드 우회를 명시적 진입점으로 격리
- `packages/db/src/demo/importSnapshot.ts` — `importSnapshotToSeed(rawPayload, {uploadMedia, cleanupStorage})`. Phase 0(Zod) → Phase 1(트랜잭션 밖: resetSeedData + Media upload + URL/idMap 빌드 + walker remap) → Phase 2(`prisma.$transaction(60s)`: 14모델 createMany + NavigationMenuItem 2-pass parentId + uploadedById 일괄 null + User.password placeholder hash). cuid 사전 생성 — source DB id 보존 X (디버깅 깨끗한 provenance)
- `apps/admin/src/shared/lib/storage/supabaseAdapter.ts` — PR5 가드 우회 진입점 2개 신규: `cleanupSeedFolder()` (2-pass list/remove `__SEED__/`만), `uploadToSeed(key, buffer, mime)` (`__SEED__/` 경로만 허용 + 안전장치). 기존 `delete()`의 silent 가드와 분리 — visitor 액션 경로는 import 금지
- `apps/admin/app/api/demo/snapshot/export/route.ts` — GET. `requirePermission('demo-snapshot', 'create')`. provider별 downloader 콜백 구성 + `Content-Disposition: attachment; filename=demo-snapshot-{ISO}.json`. 감사 로그 `entityType: 'SITE_SETTINGS'` 재사용 + `entityId: 'DEMO_SNAPSHOT_EXPORT'`(schema migration 회피)
- `apps/admin/app/api/demo/snapshot/import/route.ts` — POST. `DEMO_MODE !== 'true'` → 503 강제 (운영 import 차단), `requirePermission('demo-snapshot', 'update')`, 50MB 한도, Supabase 어댑터 검증. 감사 로그 `entityId: 'DEMO_SNAPSHOT_IMPORT'`
- `packages/db/scripts/demo-export.ts` + `demo-import.ts` — CLI. demo-import는 `DEMO_MODE === 'true'` + `STORAGE_PROVIDER=supabase` 강제 가드 (운영 DB 사고 차단). dotenv 로드 + 자체 PrismaClient + Supabase 클라이언트 inline upload/cleanup 콜백
- `packages/db/package.json` + 루트 `package.json` — `pnpm demo:export <out>` / `pnpm demo:import <in>` 스크립트 등록
- `packages/types/src/domain/permission.types.ts` — `'demo-snapshot'` ResourceKey + RESOURCE_ACTIONS({read, create, update}). 일반 관리자 DEFAULT_PERMISSIONS 미추가 — 운영자 전용 (총괄 관리자만 자동 부여)
- `packages/db/prisma/seed.ts` + `demo-seed.ts` — FULL_PERMISSIONS에 `demo-snapshot` 추가
- `packages/db/src/demo/snapshotWalker.test.ts` — 14건 단위 테스트 (HERO/RECOMMENDED/LATEST_POSTS/IMAGE/RICH_TEXT/HomePopup/SubpageVersion/Post/edge case)

**의존성 추가**: `packages/db`에 `sharp ^0.34.5` + `zod ^3.25.76`

### master 브랜치 단일 스택 운영

- master 한 곳에 운영·시연 코드가 공존 — `DEMO_MODE` 환경변수로 분기
- 운영 Vercel 프로젝트: `DEMO_MODE` 미설정 → extension 미적용, sentinel만 schema default로 채워짐
- 시연 Vercel 프로젝트: `DEMO_MODE=true` + 별도 Supabase DB → seed clone + 격리 활성화
- 새 기능 개발 시 위 "관습" 표를 따르면 양쪽 자동 호환

### 진행 단계 (시연 모드 구현 로드맵)

| PR | 단계 | 내용 | 상태 |
|---|---|---|---|
| 1 | Step 1 | 단일 도메인 rewrites + admin basePath | **완료** (ede5365) |
| 2 | Step 2 | 17개 모델 sessionId 컬럼 + Prisma directUrl | **완료** (1c9eab7) |
| 3 | Step 3 | Prisma extension + AsyncLocalStorage + composite unique 전환 + raw SQL 격리 | **완료** (59c1adc) |
| 4 | Step 4 + 5 + 7(부분) | demo-seed.ts + cloneSeedToSession + bootstrap API + admin/web layout gate + login/register 우회 + cookie/Session 1h TTL | **완료** (b7afa51 / b56cc0a / 30901d6) |
| 5 | Step 6 + 7(cleanup) + 8 | supabaseAdapter sessionId prefix + `__SEED__` delete 가드 + `cleanupExpiredSessions` 헬퍼 + `/api/demo/cleanup`(Vercel Hobby cron `0 3 * * *`) + `/api/demo/reset` + lazy cleanup 5%(`after()`) + DemoBanner(admin AlertDialog / web native confirm) + sticky chain(`--demo-banner-h` CSS 변수) | **완료** |
| 6 | Step 9 + 11 + CLI | snapshot export/import 코어 + walker(mediaId/boardId 위치별 분기 — HERO/RECOMMENDED `slides[].mediaId` / IMAGE `imageMediaId` / RICH_TEXT Tiptap recursion / SubpageVersion.snapshot) + sharp 1600px 리사이즈 + `__SEED__` 단일 출처 무결성(`cleanupSeedFolder()` + `resetSeedData()`) + cuid 재생성 + `uploadedById = null` anonymization + Phase 1(트랜잭션 밖 upload)/Phase 2($transaction) 분리 + `/api/demo/snapshot/{export,import}` + CLI `pnpm demo:export` / `pnpm demo:import` + `demo-snapshot` 권한 리소스 신규 | **완료** |
| 7 | Step 10 | snapshot Admin UI (`/settings/demo-snapshot` 패널 + SettingsNav 7번째 탭 + 미리보기 통계 + 다운로드 버튼 + 즉시 적용 AlertDialog) | 대기 |

**PR4 visitor 진입 흐름** (시크릿 창 첫 방문):
1. `http://demo.example.com/` 또는 `/_cms/admin/dashboard` 접근 → cookie `session-token` 없음
2. layout gate(ensureDemoSession)가 `/demo-bootstrap?next=...`로 redirect — admin basePath 자동 prepend 때문에 admin/web 양쪽에 동일 splash 라우트 존재
3. splash가 `POST /_cms/admin/api/demo/bootstrap` 호출 → 새 cuid sessionId 발급 → `cloneSeedToSession`으로 14모델 row를 `__SEED__`에서 visitor sessionId로 클론 → demo_admin User로 Session 생성 → `Set-Cookie: session-token=...; HttpOnly; Max-Age=3600`
4. splash가 `next` 경로로 router.replace → 이번엔 cookie 통과 → layout이 `enterWith({sessionId})` 부착 → 모든 후속 쿼리 격리

**`__SEED__` 미존재 시**: cloneSeedToSession이 `SeedNotFoundError` throw → bootstrap API 503 + `{code:'SEED_NOT_FOUND'}` → splash가 운영자 안내 + [다시 시도] 표시. 운영자가 `pnpm db:demo-seed` 실행 후 재시도.

상세 명세: `C:\Users\ddock\.claude\plans\cms-purrfect-lerdorf.md`

## 라우팅

### admin

`/login`, `/register`, `/dashboard`,
`/subpages`, `/subpages/new`, `/subpages/[id]`, `/subpages/[id]/edit`,
`/boards`, `/boards/new`, `/boards/[id]`, `/boards/[id]/edit`,
`/posts`, `/posts/new`, `/posts/[id]`, `/posts/[id]/edit`,
`/navigation`, `/navigation/[menuId]`,
`/home`, `/popups`, `/popups/new`, `/popups/[id]`, `/popups/[id]/edit`,
`/media`, `/users`, `/profile`,
`/subpage-feedback`,
`/audit-logs`, `/error-logs`,
`/settings`, `/settings/domain`, `/settings/security`, `/settings/upload`, `/settings/roles`

(에러 로그 상세는 별도 라우트 없이 목록 내 Dialog로 표시)

### web

`/` (메인), `/p/[slug]` (서브페이지), `/board/[boardSlug]` (게시판),
`/board/[boardSlug]/[postSlug]` (게시글), `/search?q=...` (검색)

## 트레이드오프

| 결정                           | 이유                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin도 Next.js                | API/BFF 역할 담당 → 서버 기능 필요                                                                                                                              |
| Tiptap JSON 저장 + 제한된 블록 | 콘텐츠 표현 충실도 우선 — admin에서 작성한 리치 포맷(색상, 정렬, 하이라이트 등)을 web에서 동일하게 표현. 검색용 plain text는 JSON에서 추출하여 별도 필드에 저장 |
| PGroonga (외부 검색엔진 X)     | 한글 필수이나 아키텍처 과도 확장 방지                                                                                                                           |
| 메인 ≠ 일반 서브 페이지        | 랜딩 성격 → 섹션 기반 운영이 적합                                                                                                                               |

## 구현 로드맵

매 단계마다 해당 기능의 UI까지 함께 개발하여 직접 확인 가능한 상태를 목표로 한다 (수직 슬라이싱).

> **로드맵 변경 정책**: 개발 중 기능 보강, 신규 추가, 삭제가 언제든 발생할 수 있다.
> 단계 번호는 고정 순서가 아닌 논리적 그룹이며, 우선순위와 범위는 필요에 따라 조정한다.
> 변경 시 이 로드맵과 관련 CLAUDE.md를 함께 업데이트한다.
>
> **Stage 완료 시 문서 정합성 확인**: 각 Stage 커밋 전에 루트 CLAUDE.md, apps/\*/CLAUDE.md, packages/\*/CLAUDE.md에서
> 해당 Stage에서 변경된 패턴·파일 경로·아키텍처가 정확히 반영되었는지 확인한다.
> middleware→layout 전환 같은 구조 변경이 있었다면 기존 문서의 참조도 함께 수정한다.
>
> **Stage 결과 요약 작성 위치 (Stage 7c 이후)**: 각 Stage의 상세 결과 요약은 루트 CLAUDE.md 본문에 작성하지 않고 `docs/stages/stage-{id}.md` 파일로 작성한다. 루트 CLAUDE.md의 로드맵 표에는 1~2문장 요약 + `[[상세]](docs/stages/stage-{id}.md)` 링크만 유지한다. 과거 Stage 7c~7m의 상세 요약은 `docs/stages/` 이하에 이미 분리되어 있다.

### Stage 1 — 기초 환경

| 단계 | 내용                           | 확인 가능한 것                    | 상태     |
| ---- | ------------------------------ | --------------------------------- | -------- |
| 1    | 모노레포, 앱 초기화, 공유 설정 | `pnpm dev`로 양쪽 앱 빈 화면 실행 | **완료** |

### Stage 2 — DB / 인증 / 사용자

| 단계 | 내용                                                         | 확인 가능한 것                                    | 상태     |
| ---- | ------------------------------------------------------------ | ------------------------------------------------- | -------- |
| 2a   | Prisma 스키마 전체 + 커스텀 세션 인증 + Seed + **로그인 UI** | 브라우저에서 로그인/로그아웃                      | **완료** |
| 2b   | 회원가입 API + **회원가입 UI**                               | 가입 → PENDING → "승인 대기" 메시지 확인          | **완료** |
| 2c   | Admin 레이아웃 (사이드바/헤더) + **대시보드 껍데기**         | 로그인 후 사이드바 있는 관리 화면                 | **완료** |
| 2d   | 사용자 관리 API + **목록/승인/거절/정지 UI**                 | PENDING 유저 승인 → ACTIVE 전환                   | **완료** |
| 2e   | 프로필 API + **프로필/비밀번호 변경 UI**                     | 이름·이메일·비밀번호 변경 직접 테스트             | **완료** |
| 2f   | 역할/권한 관리 API + **권한 매트릭스 UI** + 사이드바 필터링  | 역할 생성 → 권한 설정 → 사이드바 메뉴 필터링 확인 | **완료** |

### Stage 3 — Admin CMS 기능

| 단계 | 내용                                                            | 확인 가능한 것                                                   | 상태     |
| ---- | --------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| 3a   | 서브 페이지 CRUD API + **목록/뷰/편집 UI** (Tiptap) + 권한 체크 | 서브 페이지 CRUD + 뷰/편집 분리 + 클라이언트 권한 체크 패턴 도입 | **완료** |
| 3b   | 게시판 CRUD API + **게시판 관리 UI**                            | 게시판 생성 → 스킨 설정 → 목록 확인                              | **완료** |
| 3c   | 게시글 CRUD API + **목록/편집 UI**                              | 게시글 작성 → 발행 → 목록 확인                                   | **완료** |
| 3d   | 메뉴 관리 API + **메뉴 편집 UI** (dnd-kit)                      | 메뉴 항목 추가 → 드래그 순서 변경                                | **완료** |
| 3e   | 감사 로그 API + **감사 로그 UI** + 내보내기                     | 활동 이력 조회 → Excel 다운로드                                  | **완료** |
| 3f   | 사이트 설정 API + **도메인/보안/업로드 설정 UI**                | 설정 변경 → 저장 → 반영 확인                                     | **완료** |

### Stage 3d-2 — 메뉴 슬롯 배정 + 3depth 확장

| 단계 | 내용                                                           | 확인 가능한 것                                        | 상태     |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| 3d-2 | 메뉴 슬롯(HEADER/FOOTER/SIDEBAR) 배정 + 3depth 메뉴 + 사이드바 | admin에서 슬롯 배정 → 공개 웹 헤더/푸터/사이드바 반영 | **완료** |

### Stage 4 — 공개 웹

| 단계 | 내용                                       | 확인 가능한 것                              | 상태     |
| ---- | ------------------------------------------ | ------------------------------------------- | -------- |
| 4a   | Web 메인+서브페이지 렌더링 + KRDS 레이아웃 | admin에서 만든 서브 페이지가 공개 웹에 표시 | **완료** |
| 4b   | Web 게시판/게시글 렌더링                   | 발행한 게시글이 공개 웹에 노출              | **완료** |
| 4c   | Web 메뉴 렌더링 + 도메인 프록시            | 헤더/푸터 메뉴, 커스텀 도메인 리다이렉트    | **완료** |
| 4d   | Web 통합검색 (PGroonga)                    | `/search?q=검색어`로 검색 결과 확인         | **완료** |
| 4e   | Web 에러 캡처 + **Admin 에러 로그 UI**     | web 에러 → admin에서 조회/해결              | **완료** |

### Stage 5 — 메인 페이지 전용

| 단계 | 내용                                       | 확인 가능한 것                     | 상태     |
| ---- | ------------------------------------------ | ---------------------------------- | -------- |
| 5a   | 메인 섹션 관리 + **Admin UI + Web 렌더링** | 섹션 데이터 편집 → 메인에 반영     | **완료** |
| 5b   | 메인 팝업 관리 + **Admin UI + Web 모달**   | 팝업 등록 → 메인 방문 시 모달 표시 | **완료** |

### Stage 6+ — 확장 / 인프라 / SEO

| 단계 | 내용                                                                | 확인 가능한 것                                                                              | 상태     |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- |
| 6    | 서브페이지 블록 + **Admin UI + Web 렌더링**                         | 블록 추가/순서 변경 → 공개 웹 확인                                                          | **완료** |
| 7a   | Draft 미리보기 (preview 토큰 + web 쿠키)                            | admin → web preview URL 새 창 렌더                                                          | **완료** |
| 7b   | HTML 블록 = HTML + 페이지 스코프 CSS (Monaco Tabs)                  | 한 블록에서 HTML+CSS, 페이지 스코프 적용                                                    | **완료** |
| 7c   | 운영 UX (Dirty 가드, 사이트 보기, 빠른 상태 토글, 벌크, cmd+k) [[상세]](docs/stages/stage-7c.md) | 이탈 경고 + 상태 토글 + 일괄 작업 + 빠른 전환 | **완료** |
| 7d   | 공개 웹 좌·우 사이드바 + 공공누리 마크 + 입력 Dialog 외부 클릭 차단 [[상세]](docs/stages/stage-7d.md) | HEADER 기반 좌측 트리 + SIDEBAR 슬롯 우측 InPageNavigation + KOGL 마크 + Dialog 오클릭 방지 | **완료** |
| 7e   | 공개 웹 KRDS Tailwind 도입 + Hero utility 마이그레이션 + 캐러셀 width 회귀 방어 [[상세]](docs/stages/stage-7e.md) | KRDS utility class(`bg-primary-50`/`text-display-s`/`tablet:`/`desktop:`) 사용 + Hero/Recommended 모든 viewport 정상 | **완료** |
| 7f   | Storybook + Vitest 2-track 테스트 인프라 shell (admin/web 동시) [[상세]](docs/stages/stage-7f.md) | 샘플 story 3개(Button/LoginForm/Carousel) smoke, 2-track Vitest(unit + storybook) 기반, Provider 2계층 decorator | **완료** |
| 7g   | Storybook story 확장 (admin + web + KRDS showcase 19개 smoke) [[상세]](docs/stages/stage-7g.md) | admin 8개(CreateRoleDialog/SubpageForm/PostForm/BlockEditDialog×4/ConfirmLeaveDialog/BulkActionBar/ImageUrlInput/AdminHeader) + web 4개(SubpageBlockRenderer/HomePopupModal/RightSidebar/KoglFooter) + KRDS showcase 7개. CreateRoleDialog로 authenticated decorator 실행 검증 | **완료** |
| 7h   | play function 5건 (MSW 무의존 범위) + hook 검증 probe 패턴 정립 [[상세]](docs/stages/stage-7h.md) | LoginForm validation / PermissionProvider 권한 토글 / DirtyGuardProbe / SubpageForm CCL+AI / BlockEditDialog IFRAME rejection. MSW 통합은 msw-storybook-addon + addon-vitest browser mode 호환성 이슈로 이관 | **완료** |
| 7i   | Swiper 22M 회귀 자동 감지 + LinkTargetInput 승격·적용 + 커스텀 래퍼 showcase 5개 [[상세]](docs/stages/stage-7i.md) | Carousel container resize play로 ResizeObserver 경로 강제 트리거 + slide width assert / LinkTargetInput을 entities/link-target로 승격하여 home-management 5개 fields(Cta+Hero+Recommended+Shortcut+Notice) 적용 / Admin/Shared 4개 + Admin/Entities/LinkTarget 1개 showcase | **완료** |
| 7j   | CI matrix + turbo `test.dependsOn` 정리 + MSW 대신 fetch stub decorator + play function 2건 + addon-vitest 30초 timeout 탐사 [[상세]](docs/stages/stage-7j.md) | GitHub Actions admin/web × {lint, typecheck, test} 6 job 병렬 / `test.dependsOn: ['^build']` 제거 / `msw-storybook-addon` v2.1 부재 primary source 확인 후 `window.fetch` stub decorator 채택 / CreateRoleDialog Submit Success·Conflict + SectionReorderProbe Reorder500 / `optimizeDeps.include` 시도→효과 없어 revert + findings 기록 | **완료** |
| 7k-1 | 청소 — LinkTarget API 경로 rename + `IFRAME_ALLOWED_HOSTS` 공유 모듈 추출 [[상세]](docs/stages/stage-7k-1.md) | `/api/home-popups/references` → `/api/link-target/references` (7i 이연 처리) / `@simple-cms/types`의 `block.types.ts`에 `IFRAME_ALLOWED_HOSTS` + `isIframeHostAllowed` 단일 출처 통합 (admin/web 3곳 복제 해소, Stage 7b부터 이연) / `normalizeIframeEmbedUrl`은 admin 전용 유지 | **완료** |
| 7k-3 | addon-vitest 30s cold start 탐사 (measure-first) [[상세]](docs/stages/stage-7k-3.md) | primary source 확인(`storybookScript`는 watch 전용, `disableAddonDocs` 기본 true) + `browser.isolate: false` 시도 결과 10초 기준 미달로 revert. Stage 8+ 이연 | **완료 (findings only)** |
| 7l   | 사이트 브랜딩 + SEO 메타데이터 (로고/favicon/OG/사이트명·설명) [[상세]](docs/stages/stage-7l.md) | admin `/settings/branding` 5번째 탭에서 6키 통합 관리 + web 헤더 동적 로고 + `generateMetadata`로 title/description/icons/openGraph 자동 반영 | **완료** |
| 7m   | 서브페이지 버전 관리 (이력 / 롤백 / 작성자 필터 · admin 미리보기) [[상세]](docs/stages/stage-7m.md) | `SubpageVersion` 단일 JSON 스냅샷 + 명시적 [버전 저장] + DRAFT→PUBLISHED AUTO_PUBLISH + 소프트 롤백 (PRE_ROLLBACK 자동 백업) + 깃 스타일 메모 + 낙관 동시성(`Subpage.revision`) + 보존 30개 lazy cleanup | **완료** |
| 8    | Docker + CI/CD + 문서화                                             | `docker compose up`으로 전체 실행                                                           | 대기     |
| 9    | SEO 기반 구축 (sitemap + robots + 페이지별 SEO + Schema.org JSON-LD) [[상세]](docs/stages/stage-9.md) | `/sitemap.xml`·`/robots.txt` 자동 생성 + Post에 seoTitle/seoDescription + Article/BreadcrumbList/Organization/WebSite JSON-LD + admin `/settings/seo` 탭에서 robots 추가 Disallow 관리 | **완료** |
| 10   | 사용자 피드백 (서브페이지 만족도 조사 + admin 통계/차트) [[상세]](docs/stages/stage-10.md) | KRDS 가이드 + Figma 시안 기반 네/아니오 + 긍정 이유 3개 + 자유 텍스트 / SubpageForm `feedbackEnabled` 토글(opt-in) / `/api/feedback` 익명 수집(IP 해싱 + 24h rate limit + preview 차단) / admin `/subpage-feedback`에서 recharts 통계 + 목록 + 삭제 / SubpageVersion 스냅샷에 `feedbackEnabled` 포함 | **완료** |

### Stage 11 — 코드 품질 · 관측성 강화

| 단계 | 내용 | 확인 가능한 것 | 상태 |
| ---- | ---- | -------------- | ---- |
| 11a | 타입 안전성 강화 [[상세]](docs/stages/stage-11a.md) | 핵심 파일 as 단언 전수 점검 — 모두 안전한 경계 단언 확인. `preprocessTiptapForAdmin` 반환 타입 구체화로 호출부 cast 2건 제거 | **완료** |
| 11b | N+1 쿼리 점검 [[상세]](docs/stages/stage-11b.md) | 정적 분석 결과 루프 내 개별 쿼리 0건. Promise.all + $transaction 패턴 정착. bulk-delete만 의도적 per-item (zod max(200)) | **완료** |
| 11c | 에러 바운더리 커버리지 보강 (admin `error.tsx`/`global-error.tsx` 신규 + admin ErrorBoundary 클래스 + web ErrorBoundary 래핑) [[상세]](docs/stages/stage-11c.md) | admin 에러 페이지 + BlockEditDialog/HomeSections/HomePopupModal/SubpageFeedback fallback 격리 | **완료** |
| 11d | web 접근성 정밀 점검 (HeaderBranding aria-label + SVG aria-hidden + axe-core WCAG AA E2E) [[상세]](docs/stages/stage-11d.md) | 로고 Link aria-label 명시 + 검색 SVG aria-hidden + `@axe-core/playwright` E2E 자동 검사 2건 추가 | **완료** |
| 11e | E2E 테스트 (Playwright) [[상세]](docs/stages/stage-11e.md) | playwright.config.ts + e2e/ 골든 플로우 5단계 + admin 인증 3건 + web 탐색 3건. CI 통합은 Stage 8(Docker) 이후 | **완료** |
| 11f | `/check-fsd` 스킬 CI 통합 [[상세]](docs/stages/stage-11f.md) | PR마다 FSD 의존성 위반 자동 감지 + 차단. `@fsd-allow` 블록 주석으로 기존 기술 부채 문서화 | **완료** |

### Stage 12 — 테스트 커버리지 보강 (12a~12j)

| 단계 | 내용 | 확인 가능한 것 | 상태 |
| ---- | ---- | -------------- | ---- |
| 12a | 보안 순수 로직 unit (sanitizeCustomHtml, hashIp/extractIp, isIframeHostAllowed, normalizeIframeEmbedUrl, scopeCustomCss, validateFileUpload) [[상세]](docs/stages/stage-12.md) | 6 파일 ~40 it, XSS·PII·iframe·업로드 우회 회귀 방어 | **완료** |
| 12b | RBAC + 인증 분기 unit + E2E (hasPermission, requirePermission, getVisibleMenuItems / auth 4분기) [[상세]](docs/stages/stage-12.md) | unit 3 파일 + e2e auth.spec 보강 | **완료** |
| 12c | 데이터 무결성 + kstDate UTC 절단 버그 fix (findMediaReferences, errorLog fingerprint, kstDate) [[상세]](docs/stages/stage-12.md) | unit 3 파일 + fix(kstDate): `Intl.DateTimeFormat` 교체 | **완료** |
| 12d | 콘텐츠 무결성 unit (recalculateSubpageContent, subpageVersion diff·dangling·retention) [[상세]](docs/stages/stage-12.md) | unit 3~5 파일 | **완료** |
| 12e | Block UI play (BlockEditDialog 4분기 + dnd 키보드 a11y) [[상세]](docs/stages/stage-12.md) | play 8~10건 | **완료** |
| 12f | 메인+네비+일괄작업 play (SectionEditDialog 5분기, BulkDialog, MenuItemTree dnd-kit) [[상세]](docs/stages/stage-12.md) | play 12~15건 | **완료** |
| 12g | RBAC UI play (UserActionButtons, PermissionMatrix, AppSidebar 권한 토글) [[상세]](docs/stages/stage-12.md) | play 8~10건 | **완료** |
| 12h | 미디어+브랜딩+Settings play + branding MIME E2E (SVG 차단·PNG 허용) [[상세]](docs/stages/stage-12.md) | play 10~14건 + e2e 2건 | **완료** |
| 12i | P1 일괄 unit+play (extractTextFromTiptap, generateSlug, searchContent, getAuditContext / admin·web 다수 stories) [[상세]](docs/stages/stage-12.md) | unit 4 파일 + play 8~12건 | **완료** |
| 12j | CI E2E job + RBAC 매트릭스 E2E (Owner/Editor/Viewer × 사이드바·API 403) [[상세]](docs/stages/stage-12.md) | workflow_dispatch E2E job / rbac-matrix.spec 5케이스 / coverage threshold 베이스라인 측정 후 결정 | **완료** |

### Stage 13 — DnD Staged Save (드롭 즉시 저장 → 명시적 [순서 저장] 버튼으로 전환)

| 단계 | 내용 | 확인 가능한 것 | 상태 |
| ---- | ---- | -------------- | ---- |
| 13a | 공통 인프라: `useStagedOrder` 훅 + `OrderActionButtons` UI + unit/Storybook 테스트 | 훅 unit 132/132 통과, Storybook play 6건 | **완료** |
| 13b | HomeSection 적용 (SectionList + useHomeMutations onMutate 제거 + 페이지 가드) | 섹션 DnD 후 [순서 저장] 클릭 시에만 서버 반영 | **완료** |
| 13c | HomePopup 적용 (PopupList + usePopupMutations onMutate 제거) | 팝업 DnD staged 흐름 + visibility 토글 staged 공존 | **완료** |
| 13d | PageBlock 적용 (BlockManager + SubpageForm 복합 dirty 가드 공존) | 블록 순서 저장 + "블록 추가·편집·삭제는 즉시 저장됩니다" 안내 교체 | **완료** |
| 13e | NavigationMenuItem 적용 (tree 모드) + reorder API 트랜잭션 fix [[상세]](docs/stages/stage-13.md) | 메뉴 DnD staged + prisma.$transaction 원자적 reorder | **완료** |

### Stage 14 — admin app UX/DX 공통화 리팩터링 (PageHeader + PageToolbar 도입)

| 단계 | 내용 | 확인 가능한 것 | 상태 |
| ---- | ---- | -------------- | ---- |
| 14a | PageHeader 신설 + AdminHeader sticky + nested main 정리 | PageHeader 컴포넌트 + 카나리 3개 적용 | **완료** |
| 14a-2 | PageToolbar 신설 + sticky 이전 + PageHeader sticky default false 정정 | SubpagesListPage/SubpageForm/DashboardPage 카나리 적용 + 모바일 Sheet collapse | **완료** |
| 14a-3 | PageToolbar 시각 polish (border-b 제거, sticky bg breakout, button size 통일, Top Sheet) | 스크롤 시 toolbar bg 전체 폭 확장 + drop shadow + 모바일 상단 Sheet | **완료** |
| 14b | list 10개 + view 4개 PageHeader/PageToolbar 마이그레이션 + e2e selector 안정화 | 전체 목록·상세 페이지 통일된 헤더/툴바 패턴 | **완료** |
| 14c | Settings 6탭 PageHeader sticky 통합 | 설정 탭 PageHeader.tabs sticky 동작 | **완료** |
| 14d | 편집 폼 [저장]/[삭제] PageToolbar 이전 (FormSaveBar 폐기) | PostForm/BoardForm/PopupForm 저장 버튼 toolbar 통합 | **완료** |
| 14e-1~3 | Dialog size 토큰 + bodyOnlyScroll + 일괄 치환 | Dialog 폭 일관성 + body-only scroll | **완료** |
| 14f | 리스트 인라인 status 토글 시각 통일 (InlineStatusSwitchToggle) [[상세]](docs/stages/stage-14.md) | SubpageTable/PostTable Switch + 라벨 교체, Boolean Switch 5곳 이연 | **완료** |

### Stage 15 — admin 디자인 시스템 도입

| 단계 | 내용 | 확인 가능한 것 | 상태 |
| ---- | ---- | -------------- | ---- |
| 15a | `apps/admin/design.md` 전면 재작성 (Stitch DESIGN.md 사양, 한글 8섹션) + 루트 CLAUDE.md Stage 15 추가 + admin CLAUDE.md UI 전략 갱신. 코드 변경 0건 | `npx @google/design.md lint` broken-ref 0건 확인 | **완료** |
| 15b | `globals.css`에 shadow 토큰 3개 추가 (`--shadow-card/toolbar/popover`, light/dark 페어). `@theme inline` + `:root` + `.dark`. 기존 shadcn 토큰 무변경 | Storybook smoke 56 tests 회귀 0건 확인 | **완료** |
| 15c-1 | shadow 토큰 실 컴포넌트 적용 3파일 5건: PageToolbar `shadow-toolbar`, BlockContentView `shadow-card`, TiptapEditor 팝업 3곳 `shadow-popover`. design.md toolbar 설명 정정 [[상세]](docs/stages/stage-15c.md) | `pnpm --filter @simple-cms/admin build` 통과 | **완료** |
| 15c-2 | shadow wrapper 4개(Popover/Select/DropdownMenu/Sheet) + 27파일 swap + BooleanSwitchField + 5폼 통일 + spacing/scale 토큰 + PageHeader typography fix + ESLint 가드 [[상세]](docs/stages/stage-15c-2.md) | typecheck·lint·build 통과 | **완료** |
| 15c-3a | verify-design-tokens.mjs(ΔE2000 22토큰 검증) + success/warning 토큰 신설 + design.md YAML 22토큰 보정 + 부록B + CLAUDE.md 갱신 [[상세]](docs/stages/stage-15c-3a.md) | `pnpm design:verify` 22 tokens pass (max ΔE 1.29) + typecheck·lint·build 통과 | **완료** |
| 15c-3b | Badge wrapper(success/warning variant) + 14곳 raw green/amber/emerald → 토큰 swap + chartColors helper + 2개 차트 적용 [[상세]](docs/stages/stage-15c-3b.md) | typecheck·lint·build 통과 | **완료** |
| 15c-3c | AlertDialog wrapper(단순 re-export, size 미도입) + ESLint 가드 + 24 호출처 import 경로 swap + PageHeader 2곳 정정(ProfilePage·NavigationEditClient) [[상세]](docs/stages/stage-15c-3c.md) | typecheck·lint·build 통과 | **완료** |
| 15c-3d | Card baseline 보정 (rounded-xl→lg, py-4→py-6, px-4→px-6, CardTitle text-base→text-lg semibold, CardDescription text-sm→text-xs) + StatCard/Auth 예외 유지 + text-base override 4곳 제거 [[상세]](docs/stages/stage-15c-3d.md) | typecheck·lint·build 통과 | **완료** |
| 15c-3e | AlertDialog size 토큰 3-tier (confirm/default/wide) + shadcn type 확장 + AlertDialog.tsx wrapper 함수화 + 10 호출처 size prop 마이그레이션 (8 BulkXxx→wide, DeleteMedia→default, RestoreVersion className 제거) [[상세]](docs/stages/stage-15c-3e.md) | typecheck·lint·build 통과 | **완료** |
| 15c-3f | 폼 컨트롤 height 통일 (32px baseline) — Button wrapper 신설 + sm h-8 override + ESLint 가드 + 92 imports 마이그레이션 (shadcn/button.tsx 무수정) + audit-logs Excel 패턴 정렬 (화면 필터 그대로 사용) + design.md height 토큰 신설 + AUDIT_LOG enum [[상세]](docs/stages/stage-15c-3f.md) | typecheck·lint·build 통과 + audit-logs Excel이 화면 필터 반영 | **완료** |

## 명령어

```bash
pnpm dev              # 전체 앱 개발 서버
pnpm build            # 전체 빌드
pnpm lint             # 전체 린트
pnpm typecheck        # 전체 타입 체크
pnpm test             # 전체 테스트 (Vitest)
pnpm clean            # 빌드 캐시 정리
pnpm format           # Prettier 포맷팅
pnpm db:generate      # Prisma client 생성
pnpm db:push          # DB 스키마 push
pnpm db:migrate       # DB 마이그레이션
pnpm db:studio        # Prisma Studio
pnpm db:pgroonga      # PGroonga 확장 + 검색 인덱스 설정
```

## 개발 원칙

1. **운영 기준 + 책임 분리 우선**: 코드 경계를 명확히 나누고, 장애 추적·모니터링이 용이한 구조를 선택한다
2. **코드 재사용성 + 단일 소스 원칙**: 동일 로직의 중복을 피하고, 하나의 정의가 하나의 진실을 담당한다
3. **외부 라이브러리 문서 우선 조회**: 라이브러리/API 문서, 설정, 코드 생성이 필요할 때는 Context7 MCP를 먼저 사용한다

## 코딩 컨벤션

- TypeScript strict 모드
- `consistent-type-imports` (type-only import 사용)
- 경로 별칭: `@/*` → `./src/*`
- ESLint 9 flat config (packages/config에서 공유)
- Prettier: single quote, trailing comma, LF
- 앱별 포트: admin=3001, web=3000

## Server / Client Component 가이드

- 기본값은 Server Component (Next.js App Router 기본)
- `'use client'` 선언 기준: 이벤트 핸들러, useState/useEffect, 브라우저 API 사용 시
- 데이터 fetching은 Server Component에서 수행
- Client Component는 가능한 한 leaf 레벨로 내려서 범위 최소화
- admin: features 레이어의 폼 컴포넌트가 Client Component, pages 레이어는 Server Component 유지
- web: 대부분 Server Component (SSR/SEO 우선), 검색/팝업 모달/모바일 메뉴만 Client Component

## 에러 처리 패턴

- API Route 응답: HTTP 상태 코드 + `{ success: boolean; data?: T; error?: string }`
- 예상 가능한 에러(validation) → 400 + 에러 메시지
- 인증/권한 에러 → 401/403
- 예상 못한 에러(서버 장애) → 500
- Next.js `error.tsx` 바운더리 활용
- 클라이언트: try-catch + 사용자 친화적 메시지

## 데이터 페칭 패턴

### 앱별 데이터 접근 패턴

| 앱        | 데이터 변경                              | 인터랙티브 조회                       | 정적 표시                                  |
| --------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------ |
| **admin** | API Route + TanStack Query `useMutation` | API Route + TanStack Query `useQuery` | Server Component + Prisma                  |
| **web**   | 해당 없음 (읽기 전용)                    | URL params + Server Component         | Server Component + `@simple-cms/db` Prisma |

- admin: 데이터 변경(CRUD)은 **API Route**(Route Handler)로 구현, TanStack Query로 클라이언트 상태 관리
- web: `@simple-cms/db`로 DB에 직접 접근 (admin API를 호출하지 않음, 장애 격리)
- web에서 TanStack Query는 사용하지 않음 (검색 포함 전체 SSR)

### admin API Route 방식

- `app/api/` 디렉토리에 RESTful 엔드포인트 정의
- 경계 구분이 명확하여 장애 추적, 모니터링, 독립 테스트에 유리
- 인증 검사는 각 핸들러에서 수행

### Server Component vs TanStack Query 판단 기준

| 화면 특성                                   | 데이터 fetch     | 렌더링           | TanStack Query |
| ------------------------------------------- | ---------------- | ---------------- | -------------- |
| 정적 표시 (상세 페이지, 콘텐츠 렌더링)      | Server Component | Server Component | 불필요         |
| 인터랙티브 (필터, 정렬, 페이지네이션, 폴링) | Server prefetch  | Client Component | 사용           |

### TanStack Query 패턴 (Key Factory + queryOptions)

- **Query Key Factory**: 도메인별 계층적 key 관리 (`subpageKeys.all`, `.lists()`, `.list(filters)`, `.detail(id)`)
- **queryOptions Factory**: Server prefetch와 Client useQuery에서 동일한 옵션 객체 공유
- **HydrationBoundary**: Server Component에서 prefetch → dehydrate → Client에서 hydrate
- **useMutation**: API Route 호출 래핑, 성공 시 `invalidateQueries`로 캐시 무효화

### TanStack Query vs Zustand 역할 분담

- **TanStack Query**: 서버 상태 (DB/API에서 온 데이터). 서버가 진실의 원천
- **Zustand**: 클라이언트 UI 상태 (사이드바, 모달, 에디터 상태). 브라우저가 진실의 원천
- 서버 데이터를 Zustand에 복사하지 않음 (이중 관리 금지)

### FSD 파일 배치

```
shared/api/
├── fetchClient.ts              # 공통 fetch 래퍼 (에러 처리, 서버/클라이언트 base URL 분기)
├── queryClient.ts              # getQueryClient() — 서버 prefetch용 싱글턴 (React cache)
└── QueryProvider.tsx            # QueryClientProvider + ReactQueryDevtools 래퍼 ('use client')

shared/model/
└── uiStore.ts                  # 전역 UI 상태 (Zustand, 사이드바 등)

features/{domain}/api/
├── {domain}Fetchers.ts         # fetch 함수 (Server/Client 공용)
├── {domain}Queries.ts          # Key Factory + queryOptions
└── use{Domain}Mutations.ts     # useMutation 훅 ('use client')

features/{domain}/model/
└── {domain}Store.ts            # 도메인 한정 UI 상태 (Zustand, 필요 시)

entities/auth/
├── lib/getCurrentUser.ts       # 쿠키 → 세션 검증 → User + Role 반환 (서버 전용)
├── lib/checkPermission.ts      # hasPermission(user, resource, action) 권한 체크 (Server/Client 공용)
├── lib/requirePermission.ts    # API Route용 인증+인가 래퍼 (401/403 반환)
├── ui/PermissionProvider.tsx   # 클라이언트 권한 Context + usePermission() 훅
└── model/auth.types.ts         # SessionUser 타입 (role + permissions 포함)

shared/lib/
└── sidebarPermissions.ts       # getVisibleMenuItems() 사이드바 권한 필터링
```

## 감사 로그 (Audit Log)

- 모든 데이터 변경 API Route 핸들러 + 인증 이벤트(LOGIN/LOGOUT)에서 `logAuditEvent()` 호출
- append-only 모델 (AuditLog 자체의 UPDATE/DELETE 없음)
- 기록 항목: action, entityType(?), entityId(?), entityTitle(스냅샷), changes(JSON), userId, IP, User Agent
- entityType 종류: `SUBPAGE`, `BOARD`, `POST`, `NAVIGATION_MENU`, `NAVIGATION_MENU_ITEM`, `HOME_SECTION`, `HOME_POPUP`, `PAGE_BLOCK`, `USER`, `ROLE`, `SITE_SETTINGS`, `ERROR_LOG`, `MEDIA`
- LOGIN/LOGOUT: entityType, entityId는 null (대상 엔티티 없음)
- 로깅 실패가 주 액션을 차단하지 않음 (fire-and-forget)
- changes JSON 구조: CREATE → `{ after }`, UPDATE → `{ before, after }` (메타데이터 필드만, 본문 제외), DELETE → `{ before }`, LOGIN/LOGOUT → null
- 헬퍼 함수 위치: `packages/db/src/auditLog.ts`
- 컨텍스트 추출 헬퍼: `apps/admin/src/shared/lib/auditHelpers.ts`

### 기본 로깅 원칙

- **admin에 새 기능 추가 시 감사 로그 연동은 기본값**이다 (opt-out 방식)
- 새 데이터 변경 API Route 핸들러 작성 시 `logAuditEvent()` 호출을 포함하는 것이 기본
- 로깅이 불필요한 예외적 경우에만 의도적으로 생략하고, 생략 사유를 주석으로 명시
- 코드 리뷰 시 데이터 변경 API Route에 감사 로그 호출 누락 여부를 반드시 확인

## 도구 / 라이브러리 결정

| 영역                     | 도구                                               | 적용 범위           | 비고                                                                                                              |
| ------------------------ | -------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 테스트 (단위)            | Vitest                                             | 전체                | 테스트 파일은 대상 코드와 같은 위치                                                                               |
| 테스트 (E2E)             | Playwright                                         | 전체                | 8단계 이후 도입                                                                                                   |
| 인증                     | 커스텀 세션 인증 (외부 인증 라이브러리 미사용)     | admin               | bcryptjs 비밀번호 해싱, crypto.randomUUID 세션 토큰                                                               |
| 세션 전략                | 커스텀 DB 세션 (crypto.randomUUID + httpOnly 쿠키) | admin               | JWT 대신 DB 세션 — 동시 로그인 제어, 서버 사이드 세션 무효화 필요                                                 |
| UI 프레임워크 (admin)    | shadcn/ui                                          | admin               | Figma 시안 전까지 임시 UI, Tailwind + Radix 기반                                                                  |
| 폼 관리                  | react-hook-form + zod                              | admin               | shadcn/ui Form 패턴 활용                                                                                          |
| 테이블                   | TanStack Table                                     | admin               | shadcn/ui Data Table 패턴 활용                                                                                    |
| 토스트/알림              | sonner                                             | admin               | shadcn/ui Toast 패턴 활용                                                                                         |
| 드래그&드롭              | dnd-kit                                            | admin               | displayOrder 관리용. drop 즉시 저장이 아닌 staged commit 패턴 (`useStagedOrder` + `[순서 저장]` 버튼으로 명시적 commit) |
| 콘텐츠 에디터            | Tiptap                                             | admin               | WYSIWYG 편집, Tiptap JSON으로 저장                                                                                |
| 콘텐츠 렌더러            | @tiptap/html (generateHTML)                        | web                 | Server-side HTML 생성, DOMPurify 새니타이징                                                                       |
| 공유 에디터 설정         | @simple-cms/editor                                 | 전체                | Tiptap 확장 정의, 콘텐츠 CSS, 텍스트 추출 유틸                                                                    |
| 코드 에디터              | Monaco Editor                                      | admin               | 커스텀 HTML/CSS 편집용 (@monaco-editor/react)                                                                     |
| CSS (admin)              | Tailwind CSS                                       | admin               | shadcn/ui 기반                                                                                                    |
| UI 프레임워크 (web)      | krds-react + krds-uiux                             | web                 | krds-react: React 컴포넌트 + CSS 토큰. krds-uiux: HTML 컴포넌트 소스 참조용 (Table 등 미export 컴포넌트 구현 시)  |
| HTML 새니타이징          | isomorphic-dompurify                               | web                 | SSR 호환 DOMPurify, Tiptap HTML 새니타이징                                                                        |
| CSS (web)                | KRDS 기반 (krds-react/dist/index.css)              | web                 | krds-react CSS 토큰 + 커스텀 CSS (Tiptap 콘텐츠 등)                                                               |
| 날짜 처리                | date-fns                                           | 전체                | tree-shaking 친화적 (함수 단위 import)                                                                            |
| 아이콘                   | lucide-react                                       | 전체                | shadcn/ui 기본 아이콘, 개별 import 최적화                                                                         |
| 데이터 페칭 (클라이언트) | TanStack Query                                     | admin               | Key Factory + queryOptions 패턴, @tanstack/eslint-plugin-query 활용                                               |
| 상태 관리 (클라이언트)   | Zustand                                            | admin, web          | UI 상태 전용. 서버 데이터는 TanStack Query가 담당                                                                 |
| 슬라이드/캐러셀          | Swiper 12                                          | web                 | 메인 히어로 + 추천 콘텐츠 슬라이드, A11y/Keyboard/Autoplay 모듈, 커스텀 prev/next/play/pause 버튼 지원            |
| CSV 내보내기             | 네이티브 구현                                      | admin               | 외부 라이브러리 없이 문자열 기반 CSV 생성                                                                         |
| Excel 내보내기           | exceljs                                            | admin               | XLSX 바이너리 형식 생성, 감사 로그 다운로드용                                                                     |
| 비밀번호 해싱            | bcryptjs                                           | admin (packages/db) | 순수 JS, 네이티브 빌드 불필요. SHA256은 범용 해시라 비밀번호에 부적합 — bcrypt는 의도적으로 느린 해싱 + 내장 salt |

모든 라이브러리는 최신 버전을 설치하는 것을 기본 원칙으로 한다.

### 콘텐츠 편집 방향

- **Subpage 본문 (Stage 6 — 통합 블록 모델)**: 서브페이지의 모든 콘텐츠는 `PageBlock` 목록으로 표현
  - `Subpage.contentJson` 필드는 **없음** — RICH_TEXT 블록으로 흡수됨
  - 한 서브페이지에 RICH_TEXT/HTML/IMAGE/IFRAME 블록을 자유 순서로 배치 (displayOrder)
  - `Subpage.content`(검색용 plain text)는 유지 — 블록 CUD 시 `recalculateSubpageContent`가 모든 RICH_TEXT 블록의 contentJson을 순서대로 모아 재집계
- **RICH_TEXT 블록**: Tiptap JSON(`configJson.contentJson`)으로 저장, 기존 본문 편집 역할을 이어받음
  - 텍스트 추출: `packages/editor`의 `extractTextFromTiptap()` 유틸리티 (검색 인덱싱용)
- **Post / HomePopup(콘텐츠형)**: 여전히 `contentJson` + `content` 단일 본문 구조 (블록화 대상 아님)
- **본문 이미지**: Tiptap의 image 노드에 `mediaId` attr 추가 — Media 라이브러리 참조 추적
  - `packages/editor`의 `ImageWithMediaId`가 기본 Image 확장을 교체
  - paste/drop 시 `ImageUploadExtension`이 자동 업로드 + image 노드 삽입 (mediaId 포함)
  - 외부 URL 직접 입력은 mediaId null (Media 무관, 의도적)
  - HTML 직렬화: `<img data-media-id="...">` — DOMPurify ALLOWED_ATTR 통과
- **web 렌더링**: `@tiptap/html`의 `generateHTML()` — 서버 사이드 전용, 클라이언트 JS 0
  - `packages/editor`의 공유 확장으로 admin과 동일한 렌더링 보장
  - DOMPurify 새니타이징 (defense-in-depth)
  - 서브페이지는 `SubpageBlockRenderer`가 블록 타입별로 분기 렌더
- **HTML 블록 (Stage 7b — HTML + CSS 코드 블록)**: HTML 블록의 `configJson`이 `{ html, css? }` 구조 — 한 블록에서 자유 HTML과 페이지 스코프 CSS를 함께 관리
  - 페이지 단위 `Subpage.customHtml`/`customCss` 필드는 폐기됨(2025-04-16 Option B 결정 — 데이터 폐기 + db drop)
  - 블록의 `displayOrder`로 본문 사이 자유 위치 + 페이지 단위 CSS 스코프 모두 충족
  - 같은 페이지에 여러 HTML 블록이 있어도 모두 같은 `#subpage-{id}` prefix를 공유 → 한 블록의 CSS가 페이지 전체(다른 블록 포함)에 영향
  - admin: `HtmlBlockFields.tsx`가 shadcn Tabs(HTML/CSS) + Monaco Editor 2개 (각 max 100,000자, 길이 카운터). `BlockContentView`도 Tabs로 readOnly 표시
  - web `SubpageBlockRenderer`의 `HtmlBlock`이 `sanitizeCustomHtml`(확장 DOMPurify — section/article/iframe 등 의미론 태그 허용 + iframe src `IFRAME_ALLOWED_HOSTS` 서버 재검증) + `scopeCustomCss(css, subpageId)`(`#subpage-{id}` prefix, `html`/`body`/`:root` 치환, `@keyframes`/`@font-face` 등 보존) 호출
  - 페이지 컴포넌트는 `<article id={`subpage-${subpage.id}`}>` 루트 + `<SubpageBlockRenderer subpageId={subpage.id} ... />`
  - 알려진 한계: `scopeCustomCss`는 `:is()` / `:where()` / `:has()` / `@container` / CSS nesting 완전 지원 불가 — 필요 시 Stage 8+에서 `postcss-prefix-selector` 도입
  - JS는 비허용 (`<script>`, on-prefixed 이벤트 핸들러, `javascript:` URL 모두 DOMPurify가 제거)

## 테스트 전략

### 2-track Vitest (Stage 7f 도입)

| 트랙 | 환경 | 대상 | 파일명 |
| ---- | ---- | ---- | ---- |
| **unit** | jsdom | 순수 함수, Zod schema, Prisma builder, 훅 pure logic, 서버 유틸 | `{파일명}.test.{ts,tsx}` |
| **storybook** | Playwright Chromium (real browser) | React 컴포넌트 렌더, 폼 validation, hover/focus, scroll, ResizeObserver, swiper, 권한별 UI | `{컴포넌트}.stories.tsx`의 play function |

- **한 컴포넌트에 `*.stories.tsx`와 `*.test.tsx`를 동시에 두지 않음** (겹치는 테스트 회피). 무거운 props combination 테스트는 unit으로 빼되 DOM 검증 없이 pure render만
- 공유 설정: `packages/config/vitest/{base,browser}.js` — `unitProjectDefaults`, `browserDefaults`, `coverageDefaults`

### 판단 기준 (단위 vs 컴포넌트)

- **unit (jsdom)**: DOM 불필요한 pure logic, 훅의 상태 계산만 (`renderHook`), 빠른 반복
- **storybook (browser)**: 훅의 DOM 부착 동작(`beforeunload` 등록), 폼 validation → error 표시, hover/focus/scroll, 권한별 UI(`usePermission` → 버튼 토글), Swiper/ResizeObserver/IntersectionObserver — jsdom 재현 불가

### 테스트 파일 위치 / 실행

- 테스트 대상 코드와 같은 디렉토리
- 각 앱: `pnpm --filter @simple-cms/admin test` / `pnpm --filter @simple-cms/web test` — unit/storybook project 자동 병행 실행
- Turborepo: `pnpm test` — 양쪽 앱 병렬
- Storybook dev: `pnpm --filter @simple-cms/admin storybook` (port 6006) / `pnpm --filter @simple-cms/web storybook` (port 6007)
- E2E: Playwright (2차 범위, Stage 8 이후)

## 파일 네이밍 컨벤션

- 컴포넌트: `PascalCase.tsx` (예: `PageEditor.tsx`)
- 유틸/헬퍼: `camelCase.ts` (예: `formatDate.ts`)
- 테스트: `{원본파일명}.test.ts` / `{원본파일명}.test.tsx`
- 타입 전용: `{도메인}.types.ts`
- 상수: 파일은 `camelCase.ts`, 변수명은 `UPPER_SNAKE_CASE`
- FSD 슬라이스: barrel export(`index.ts`) 사용하지 않음 — 외부에서 슬라이스 내부 파일을 직접 import
  - 예: `import { SubpageForm } from '@/features/subpage/ui/SubpageForm'`
  - 이유: Next.js App Router에서 Server/Client 경계 명확화, tree-shaking 보장
  - `packages/`의 `index.ts`는 패키지 진입점이므로 유지 (FSD barrel과 다름)

## import 순서

```
1. React / Next.js 내장 모듈
2. 외부 라이브러리 (react-hook-form, zod 등)
3. 공용 패키지 (@simple-cms/db, @simple-cms/types)
4. FSD 상위 레이어 (features → entities → shared 순)
5. 같은 슬라이스 내부 파일
```

- 타입 import은 `import type` 사용 (`consistent-type-imports`)
- 그룹 간 빈 줄로 구분

## 참고 문서

설계 상세는 `docs/` 디렉토리 참조:

- `react-cms-개발-설계서.md` — 전체 기술 설계서 (기준 문서)
- `react-cms-구현-로드맵.md` — 21단계 세분화 구현 순서 (수직 슬라이싱)
- `react-cms-개발-설계-해설서.md` — 설계 판단의 "왜"
- `react-cms-README-요약본.md` — 프로젝트 요약
- `react-cms-커스텀-도메인-명세서.md` — 커스텀 도메인 설정 기능 명세
- `react-cms-시연모드-배포-가이드.md` — 시연 모드 Vercel + Supabase 일괄 배포 절차 (환경변수 마스터 리스트, DB 초기화, 시드 적재, cron 검증, 문제 해결)
