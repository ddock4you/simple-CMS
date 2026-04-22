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

## 라우팅

### admin

`/login`, `/register`, `/dashboard`,
`/subpages`, `/subpages/new`, `/subpages/[id]`, `/subpages/[id]/edit`,
`/boards`, `/boards/new`, `/boards/[id]`, `/boards/[id]/edit`,
`/posts`, `/posts/new`, `/posts/[id]`, `/posts/[id]/edit`,
`/navigation`, `/navigation/[menuId]`,
`/home`, `/home/popups`, `/home/popups/new`, `/home/popups/[id]`, `/home/popups/[id]/edit`,
`/media`, `/users`, `/profile`,
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

### Stage 6–8 — 확장 / 인프라

| 단계 | 내용                                                                | 확인 가능한 것                                                                              | 상태     |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- |
| 6    | 서브페이지 블록 + **Admin UI + Web 렌더링**                         | 블록 추가/순서 변경 → 공개 웹 확인                                                          | **완료** |
| 7a   | Draft 미리보기 (preview 토큰 + web 쿠키)                            | admin → web preview URL 새 창 렌더                                                          | **완료** |
| 7b   | HTML 블록 = HTML + 페이지 스코프 CSS (Monaco Tabs)                  | 한 블록에서 HTML+CSS, 페이지 스코프 적용                                                    | **완료** |
| 7c   | 운영 UX (Dirty 가드, 사이트 보기, 빠른 상태 토글, 벌크, cmd+k)      | 이탈 경고 + 상태 토글 + 일괄 작업 + 빠른 전환                                               | **완료** |
| 7d   | 공개 웹 좌·우 사이드바 + 공공누리 마크 + 입력 Dialog 외부 클릭 차단 | HEADER 기반 좌측 트리 + SIDEBAR 슬롯 우측 InPageNavigation + KOGL 마크 + Dialog 오클릭 방지 | **완료** |
| 7e   | 공개 웹 KRDS Tailwind 도입 + Hero utility 마이그레이션 + 캐러셀 width 회귀 방어 | KRDS utility class(`bg-primary-50`/`text-display-s`/`tablet:`/`desktop:`) 사용 + Hero/Recommended 모든 viewport 정상 | **완료** |
| 7f   | Storybook + Vitest 2-track 테스트 인프라 shell (admin/web 동시)      | 샘플 story 3개(Button/LoginForm/Carousel) smoke, 2-track Vitest(unit + storybook) 기반, Provider 2계층 decorator | **완료** |
| 7g   | Storybook story 확장 (admin + web + KRDS showcase 19개 smoke)       | admin 8개(CreateRoleDialog/SubpageForm/PostForm/BlockEditDialog×4/ConfirmLeaveDialog/BulkActionBar/ImageUrlInput/AdminHeader) + web 4개(SubpageBlockRenderer/HomePopupModal/RightSidebar/KoglFooter) + KRDS showcase 7개. CreateRoleDialog로 authenticated decorator 실행 검증 | **완료** |
| 7h   | play function 5건 (MSW 무의존 범위) + hook 검증 probe 패턴 정립 | LoginForm validation / PermissionProvider 권한 토글 / DirtyGuardProbe / SubpageForm CCL+AI / BlockEditDialog IFRAME rejection. MSW 통합은 msw-storybook-addon + addon-vitest browser mode 호환성 이슈로 이관 | **완료** |
| 7i   | Swiper 22M 회귀 자동 감지 + 프로젝트 커스텀 래퍼 showcase 4개 | Carousel 테스트 프로브 + viewport resize + `slide.style.width` assert (쉬운 버전만) + `Admin/Shared/{Dialog, AlertDialog, InlineStatusToggle, InlineBooleanToggle, LinkTargetInput}` 규약 시연 | 대기     |
| 7j   | CI matrix + turbo `dependsOn` 정리 + Storybook UI 30초 timeout 해소 + MSW 재도입 재조사 | GitHub Actions admin/web 병렬, `test.dependsOn: ['^build']` 제거 (test outputs는 7g 후속에서 `test:coverage` 분리로 먼저 처리됨), `optimizeDeps.include` pre-warm + `storybookScript` 명시, msw-storybook-addon v2.1+/dual setupServer 방식 재조사 후 MSW 기반 play function(CreateRoleDialog submit, reorder rollback) 추가 | 대기     |
| 8    | Docker + CI/CD + 문서화                                             | `docker compose up`으로 전체 실행                                                           | 대기     |

#### Stage 7c 결과 요약

- **Dirty 가드**: `useDirtyGuard`(페이지 폼) + `useDialogDirtyGuard`(Dialog 폼) + `ConfirmLeaveDialog` — `<a href>` 클릭 capture + `beforeunload` 가로채기. 적용: SubpageForm/PostForm/PopupForm/BoardForm + MenuItemDialog/MenuSetEditDialog/SectionEditDialog (총 7개)
- **메타+status 충돌 경고**: SubpageForm/PostForm에서 `isDirty && DRAFT→PUBLISHED` 시 사전 안내 모달
- **사이트 보기**: `getWebBaseUrl/getSubpagePublicUrl/getPostPublicUrl/getBoardPublicUrl` 헬퍼 + `<ViewLiveButton>` — Subpage/Post/Board View(published만), AdminHeader([사이트 메인])에 노출. preview/token 라우트는 inline 헬퍼 → `siteUrl.ts` import로 정리
- **빠른 상태 토글**: 4개 신규 엔드포인트 (`/subpages/[id]/status`, `/posts/[id]/status`, `/home-popups/[id]/visibility`, `/boards/[id]/visibility`) + 4개 mutation 훅(optimistic + rollback) + `<InlineStatusToggle>` `<InlineBooleanToggle>` 공용. 감사 로그 entityTitle에 "(상태 변경)" / "(공개 변경)" suffix
- **벌크 작업 (Subpage + Post)**: 5개 신규 엔드포인트 (subpages/posts × bulk-delete/bulk-status + posts/bulk-move). 응답 구조 `{ deleted, blocked }` / `{ updated, failed }` — 미디어 패턴 그대로. `<BulkActionBar>` 공용 + 5개 Dialog. selectedIds는 `Set<string>`로 페이지 간 유지
- **cmd+k 빠른 전환**: shadcn `command` 설치 + `useKeyboardShortcut` 훅 + 통합 `/api/quick-search` 엔드포인트 (단순 `contains` + 도메인별 read 권한 필터) + `features/quick-switcher/` 슬라이스 (`CommandPalette`, `CommandPaletteTrigger`). `(authenticated)/layout.tsx` 항상 마운트 + AdminHeader에 [검색 ⌘K] 보조 버튼

#### Stage 7d 결과 요약

- **우측 사이드바 (SIDEBAR 슬롯 의미 재해석)**: 기존 좌측에 렌더되던 `SIDEBAR` 슬롯 메뉴를 **모든 페이지 우측**의 KRDS `InPageNavigation` **스타일**로 전환. KRDS 원본 컴포넌트는 items의 href를 `document.querySelector`로 소비하는 페이지 내 앵커 전용이라 일반 페이지 링크에 사용 불가 → `widgets/layout/ui/RightSidebar.tsx`가 동일 DOM 구조(`.krds-in-page-navigation-type`/`-area`/`.in-page-navigation-header`/`.in-page-navigation-list`)와 CSS 클래스를 차용한 커스텀 JSX로 렌더, `<Link>`/`<a>`로 실제 라우팅. leaf-only DFS 평탄화, `active`는 `pathname` 매칭. `title = menu.name`, `caption = `${name} 네비게이션``. `PageLayout`의 `rightSidebar: { name, items } | null` prop이 없으면 렌더되지 않음
- **좌측 서브페이지 사이드바 (HEADER 메뉴 자동 파생)**: `/p/[slug]`에서만 자동 렌더. `entities/navigation/lib/findHeaderBranchForPath`가 HEADER 메뉴에서 현재 경로의 루트를 DFS 탐색 → 매칭되면 그 루트의 2/3뎁스 트리를 `widgets/subpage-sidebar/ui/SubpageSideNavigation.tsx`(KRDS `SideNavigation`)로 렌더, 미매칭 시 서브페이지 제목만 `Title`로 표시. 기존 `widgets/layout/ui/Sidebar.tsx`는 폐기
- **슬롯 라벨 변경**: admin `features/navigation-management/ui/slotLabels.ts`의 `SIDEBAR` 표시 라벨만 "사이드바" → "우측 사이드바"로 교체. enum 값/DB 값은 무변경(마이그레이션 0)
- **공공누리 마크**: `Subpage` 모델에 `CclType?`(enum `TYPE_0`~`TYPE_4`) + `cclAi: Boolean` 두 필드 추가. `packages/types/domain/subpage.types.ts`에 `CclType` union + `CCL_TYPE_LABELS`/`CCL_TYPE_ASSET`/`CCL_AI_ASSET` 상수 공용화. admin `SubpageForm` 우측 "라이선스" 섹션에 6개 라디오(`표시 없음` + 제0~4유형) + AI 체크박스(cclType null이면 disabled + superRefine 강제). web `widgets/subpage-content/ui/KoglFooter.tsx`가 `<article>` 내부 하단 우측에 마크 이미지 렌더(published + preview 경로 모두). 에셋은 `apps/web/public/assets/kogl/kogl-type-0.png` ~ `kogl-type-4.png`, `kogl-ai.png` — 실제 이미지 파일은 공공누리 공식 사이트에서 운영이 내려받아 배치
- **입력 Dialog 외부 클릭 차단**: shadcn 공용 `Dialog` 래퍼는 이미 Base-UI `DialogRoot.Props`를 spread 전달하므로 별도 prop 신설 없이 호출자가 `<Dialog disablePointerDismissal>` opt-in. 대상 Dialog(MenuItem/MenuSetEdit/BlockEdit/MediaDetail/SectionEdit/CreateRole) 6곳에 적용. AlertDialog는 Base-UI v1.3.0 `AlertDialogRoot`가 내부에서 `disablePointerDismissal: true` 강제 + 타입에서 prop Omit → 코드 변경 없이 이미 배경 클릭 닫기 차단됨 (`node_modules/@base-ui/react/alert-dialog/root/AlertDialogRoot.js` line 42). ESC 닫기는 모든 Dialog에서 유지
- **중첩 Dialog 흐림 처리**: 첫 번째 Dialog 위에 두 번째 Dialog(예: 편집 중 이탈 경고 `ConfirmLeaveDialog`)가 열릴 때 뒤쪽 Popup을 "배경처럼" 물러나 보이게 처리. Base-UI가 부모 `Popup`에 자동 부착하는 `data-nested-dialog-open` 속성을 Tailwind 선택자로 활용: `data-[nested-dialog-open]:opacity-60 blur-[1.5px] scale-[0.98] pointer-events-none` + `transition-[opacity,filter,transform] duration-200`. `shared/ui/shadcn/{dialog,alert-dialog}.tsx`의 `Popup` 공용 className에 추가 — 모든 중첩 Dialog/AlertDialog가 자동 적용
- **입력 Dialog 성공 후 값 초기화 패턴 정비**: 재사용 표준 — 다음 중 하나를 반드시 적용해야 다음 오픈 시 빈 상태로 시작. (A) `useEffect(() => { if (!open) return; reset(defaults); }, [open, ...deps, reset])`(예: MenuItemDialog, MenuSetEditDialog), (B) mutation `onSuccess`에서 `reset()`(예: CreateRoleDialog), (C) 부모에서 `<Dialog key=.../>`로 매번 새 인스턴스 마운트(예: BlockEditDialog는 `BlockManager`가 `key={editingBlock ? `edit-${id}` : `create-${type}`}` 부여). **MenuItemDialog 회귀 수정**: 기존 useEffect 의존성이 `[editItem, parentId, reset]`만이라 같은 parentId로 새 항목을 연속 추가할 때 이전 값이 남던 버그 → `open`을 의존성에 포함하고 early return으로 정정

#### Stage 7e 결과 요약

- **공개 웹 Tailwind v4 도입 (preflight 제외 모드)**: `apps/web`에 `tailwindcss@^4`/`@tailwindcss/postcss@^4`/`postcss@^8.5` + `@krds-ui/tailwindcss-plugin@^0.6` 신규 설치. 기존 KRDS CSS + `globals.css` 1670줄과 공존하기 위해 preflight를 제외한 Tailwind 로드 방식 사용:
  - `apps/web/postcss.config.mjs` 신규 (`@tailwindcss/postcss`만 등록)
  - `apps/web/app/globals.css` 최상단: `@layer theme, krds-base, components, utilities;` + `@import 'tailwindcss/theme.css' layer(theme);` + `@import 'tailwindcss/utilities.css' layer(utilities);` + `@theme { --breakpoint-mobile: 360px; --breakpoint-tablet: 601px; --breakpoint-desktop: 1025px; }` + `@plugin "@krds-ui/tailwindcss-plugin";`
  - layout.tsx의 import 순서: `krds-react/dist/index.css` → `globals.css` 유지 (utility가 KRDS 스타일 위에 올라가도록)
  - admin은 변경 없음 — 이전부터 Tailwind v4 + shadcn/ui 사용 중
- **KRDS Tailwind plugin 성격**: plugin 함수 본문은 빈 함수이고 두 번째 인자의 `theme.screens` + `theme.extend.{colors,fontSize,fontWeight,spacing,borderRadius}` 토큰만 등록. v4 `@plugin` 호환 디렉티브로 `bg-primary-50`/`text-display-s`/`rounded-5`/`p-7`/`mobile:`/`tablet:`/`desktop:` utility가 자동 생성
- **Hero 섹션 utility 마이그레이션**: `apps/web/src/features/home-section/ui/HeroSection.tsx`를 KRDS Tailwind utility로 변환하며 globals.css의 `.home-hero*` 블록 91줄 삭제. 색상은 plugin 토큰(`bg-primary-50`/`text-gray-90` 등), spacing/radius는 KRDS scale(`p-8`=32px, `rounded-5`=12px), 브레이크포인트는 KRDS(`tablet:601px`/`desktop:1025px`), fontSize는 디자인 강조 사이즈는 arbitrary(`text-[28px]` 등) + 정확 매핑은 토큰. `.home-hero-link:hover .home-hero-title` → `group` + `group-hover:underline`
- **Swiper 캐러셀 width 회귀 방어 (Carousel.tsx 공용)**: 첫 방문 시 Pretendard CDN 폰트/KRDS Header mount 등 async layout shift로 swiper의 부모 width 측정이 실패하여 `slide.style.width`가 비정상 큰 값(예: 22369600px)으로 박히는 회귀 발생. `apps/web/src/shared/ui/Carousel.tsx`의 `useEffect`에 다층 트리거로 `swiper.update()` 호출:
  - (1) `requestAnimationFrame` 2회 — 첫 paint 직후 안정화된 layout 측정
  - (2) `window 'load'` 이벤트 — 모든 리소스(폰트/이미지) 로드 완료 시점
  - (3) `ResizeObserver` — 부모 element width 변화마다 재측정
  - swiper의 `observer`/`observeParents` 옵션은 사용 안 함 (내부 observer + update가 race 시 22M로 갱신되는 케이스 회피). `watchOverflow`만 유지
- **Hero 전용 CSS width guard**: Hero는 `slidesPerView=1` 고정이므로 `<section data-hero-carousel>` + globals.css의 `[data-hero-carousel] .swiper-slide { width: 100% !important; flex-shrink: 0; }` 이중 안전망
- **Recommended 섹션 breakpoint별 width guard**: `slidesPerView` 가변(mobile 1 / tablet 2 / desktop 3)이라 `.home-recommended .swiper-slide`에 viewport별 `calc()` width 강제 (`768px+: calc((100% - 16px) / 2)`, `1024px+: calc((100% - 40px) / 3)`). RecommendedSection.tsx의 `breakpoints` prop + `spaceBetween`과 1:1 동기화 필요 — 변경 시 globals.css도 함께 수정
- **진단 경험**: 변환 전엔 정상이었던 이유가 legacy CSS가 있어서가 아니라 swiper의 mount 측정이 우연히 안정된 layout에 걸렸던 것. 재방문(client-side nav) 시에는 layout이 이미 안정화돼 있어 mount 측정이 항상 성공 — 이 패턴이 "첫 방문 vs 재방문" 증상 차이의 원인 ([계획 문서](../../../Users/ddock/.claude/plans/krds-encapsulated-wind.md) 참조)

#### Stage 7f 결과 요약

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
- 상세 계획: [`C:/Users/ddock/.claude/plans/stage-7f-peppy-garden.md`](../../../Users/ddock/.claude/plans/stage-7f-peppy-garden.md)

#### Stage 7g 결과 요약

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

##### Stage 7g 후속 마이너 수정 (커밋 전 반영)

7g 본 범위 외에 Storybook 확인 과정에서 발견된 3건을 같은 커밋에 묶어 정리:

- **`turbo test` outputs 경고 해소**: `pnpm test` 실행 시 `WARNING no output files found for task @simple-cms/{admin,web}#test. Please check your outputs key in turbo.json` 반복 출력. 원인은 `turbo.json`의 `test.outputs: ["coverage/**"]`인데 현재 `pnpm test`는 `--coverage` 없이 실행되어 coverage 폴더 자체가 생성되지 않기 때문. **해결**: `test`에서 `outputs` 제거, `test:coverage` 별도 태스크로 분리해 outputs 선언 이관. Stage 7i에서 처리 예정이던 항목의 절반을 선반영한 셈
- **SubpageBlockRenderer story의 RichTextOnly/HtmlOnly 시각 확인 개선**: Mixed variant는 IMAGE/IFRAME이 크게 렌더되어 눈에 띄지만, 단독 RICH_TEXT/HTML 블록은 텍스트 몇 줄이 Canvas 좌상단에 작게 붙어 "렌더 실패로 오인"되는 증상. `layout: 'padded'`만으론 실사용처(`<article id="subpage-{id}"> + .subpage-blocks`) 맥락이 재현되지 않음이 원인. **해결**: `meta.decorators`에 dashed border + max-width 820px + min-height 160px wrapper 추가해 실사용처 맥락을 story 레벨에서 재현. 렌더 결과가 비면 wrapper만 보이므로 "정말 비어있는지" vs "묻혀 있는지" 구분 쉬움
- **KoglFooter Type2/Type3 누락 보완**: `CclType`은 `TYPE_0 ~ TYPE_4` 5단계인데 기존 story는 Type0/1/4 + WithAI/Hidden 5개로 Type2/Type3이 빠짐. 에셋(`apps/web/public/assets/kogl/kogl-type-2.png`/`-3.png`)은 이미 7d에서 배치돼 있어 variant 2개 추가만으로 해결. 결과: web 12 files / **32 tests**(기존 30 → +2)

이 수정으로 `pnpm test` 루트 **총 60 tests 통과**(admin 28 + web 32), turbo 경고 메시지 0건.

##### Stage 7h에 추가된 범위 (2026-04-22 결정)

기존 7h 계획(play function + MSW + swiper 회귀)에 **프로젝트 커스텀 래퍼 showcase**를 더함:

- **대상 후보**:
  - `Admin/Shared/Dialog` + `Admin/Shared/AlertDialog` — shadcn 공용 래퍼의 Stage 7d 규약 시연 (`disablePointerDismissal`, 중첩 Dialog `data-nested-dialog-open` 블러 효과, AlertDialog v1.3.0 자동 차단)
  - `Admin/Shared/InlineStatusToggle` / `InlineBooleanToggle` — Stage 7c 공용 인라인 토글 (권한 없을 때 Badge fallback 시연)
  - `Admin/Shared/LinkTargetInput` — Stage 5b 공용 (subpage/board/external URL 분기 입력, popup/section 양쪽 재사용)
- **왜 full shadcn showcase가 아닌 커스텀 래퍼만인가**: shadcn은 `shared/ui/shadcn/`에 **복사된 프로젝트 코드**라 외부 라이브러리가 아님. ui.shadcn.com 공식 docs가 모든 variant의 예제를 매우 상세히 제공 → 전체 포팅은 정보 중복 + 관리 부담. 반면 프로젝트 고유 커스텀(중첩 Dialog 블러, inline 권한 fallback 등)은 외부 문서에 없는 자체 규약이라 showcase 가치 명확
- **KRDS showcase(web)와 성격 차이**: KRDS는 "외부 라이브러리 variant를 프로젝트가 쓰는 조합만으로 재구성" ↔ admin 커스텀 래퍼는 "프로젝트 자체 UX 규약 문서화". 용도 분리되어 sidebar 카테고리 `Admin/Shared/*`로 자연 배치

(위 커스텀 래퍼 showcase는 Stage 7h 작업 중 7i로 재이관 — 아래 "Stage 7h 결과 요약" 참조)

#### Stage 7h 결과 요약

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
| 드래그&드롭              | dnd-kit                                            | admin               | displayOrder 관리용                                                                                               |
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
