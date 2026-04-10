# Simple CMS

Next.js 기반의 관리자 CMS(admin)와 공개 웹(web)을 모노레포로 분리 운영하는 실무형 CMS 프로젝트.
Prisma + PostgreSQL, PGroonga 한글 검색, KRDS 기반 공개 웹 UI, 제한형 블록 구조, Docker/CI까지 포함.

## 기술 스택

| 영역          | 도구                                     | 비고                                                               |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| 앱 프레임워크 | Next.js 16 + React 19.2 + TypeScript     | admin, web 모두                                                    |
| 모노레포      | pnpm workspace + Turborepo               | pnpm@10.33.0, Node 22                                              |
| 데이터        | PostgreSQL + Prisma ORM                  | 개발: 로컬 PostgreSQL (Docker), 프로덕션: Supabase PostgreSQL 가능 |
| 검색          | PGroonga                                 | PostgreSQL 확장, 한글 검색 필수, Supabase에서도 지원               |
| 공개 웹 UI    | KRDS + Storybook                         | web 앱 전용                                                        |
| 관리자 UI     | 디자이너 Figma 시안 기반                 | admin 앱 전용, KRDS 미사용                                         |
| 콘텐츠        | Tiptap WYSIWYG (JSON 저장)               | 문서형 콘텐츠 + 제한된 블록, 검색용 plain text 동시 저장           |
| 배포          | Docker + Docker Compose + GitHub Actions | 앱별 별도 이미지                                                   |

## 모노레포 구조

```
workspace/
├── apps/
│   ├── admin/          # 관리자 CMS (BFF + CRUD + 인증)
│   └── web/            # 공개 웹 (SSR + SEO + 검색)
├── packages/
│   ├── db/             # Prisma schema, client, query helper
│   ├── editor/         # Tiptap 공유 확장 정의, 콘텐츠 CSS
│   ├── types/          # 공용 DTO, 도메인 인터페이스
│   └── config/         # tsconfig, eslint 공유 설정
├── docker/             # Docker Compose 설정
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

## 도메인 모델

| 모델                   | 설명                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **User**               | 관리자 계정, username/password 인증, 가입 승인제(PENDING→ACTIVE), Role FK 기반 권한   |
| **Role**               | 역할(등급) 정의, name·permissions(Json)·isSystem·isDefault, 메뉴별 CRUD 권한 매트릭스 |
| **Subpage**            | 서브페이지, Markdown 문서형, 블록 + 커스텀 HTML/CSS 지원                              |
| **Board**              | 게시판 설정, 스킨(list/gallery), slug, 공개 여부                                      |
| **Post**               | 게시판 소속 게시글, 목록/상세 렌더링 대상                                             |
| **HomeSection**        | 메인 페이지 전용 섹션 설정                                                            |
| **HomePopup**          | 메인 페이지 전용 팝업 (콘텐츠형/이미지형)                                             |
| **PageBlock**          | 서브페이지 제한형 블록 (blockType + configJson)                                       |
| **Media**              | 이미지/파일 메타데이터, 1차는 대표 이미지 중심                                        |
| **NavigationMenu**     | 메뉴 묶음 (Header Main, Footer, Quick Links)                                          |
| **NavigationMenuItem** | 메뉴 항목 (SUBPAGE/BOARD/EXTERNAL/CUSTOM 연결)                                        |
| **AuditLog**           | 관리자 활동 이력, append-only, 데이터 변경 + 인증 이벤트 기록                         |
| **SiteSettings**       | 사이트 전역 설정 (도메인, 사이트명 등), 키-값 구조                                    |
| **ErrorLog**           | 공개 웹 런타임 에러 로그, 서버/클라이언트 에러 기록, fingerprint 기반 그룹핑          |
| **Session**            | 커스텀 DB 세션, crypto.randomUUID 기반 토큰, httpOnly 쿠키, 동시 로그인 제어 대상     |

## 운영 정책

### 콘텐츠 상태

- 1차: `draft` / `published` (2차: `archived` 확장 가능)
- 공개 웹 노출, 검색, 메뉴 연결 대상은 `published`만 허용
- `published` 전환 시 `publishedAt` 기록
- `draft`는 관리자 내부 + 미리보기에서만 확인

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

`/login`, `/register`, `/dashboard`, `/subpages`, `/subpages/[id]`, `/boards`, `/boards/[id]`, `/posts`,
`/navigation`, `/navigation/[menuId]`, `/home`, `/home/popups`,
`/users`, `/profile`,
`/error-logs`, `/error-logs/[id]`,
`/settings`, `/settings/domain`, `/settings/security`, `/settings/upload`, `/settings/roles`

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

| 단계 | 내용                           | 확인 가능한 것                    | 상태        |
| ---- | ------------------------------ | --------------------------------- | ----------- |
| 1    | 모노레포, 앱 초기화, 공유 설정 | `pnpm dev`로 양쪽 앱 빈 화면 실행 | **완료** |

### Stage 2 — DB / 인증 / 사용자

| 단계 | 내용                                                         | 확인 가능한 것                                    | 상태 |
| ---- | ------------------------------------------------------------ | ------------------------------------------------- | ---- |
| 2a   | Prisma 스키마 전체 + 커스텀 세션 인증 + Seed + **로그인 UI** | 브라우저에서 로그인/로그아웃                      | **완료** |
| 2b   | 회원가입 API + **회원가입 UI**                               | 가입 → PENDING → "승인 대기" 메시지 확인          | **완료** |
| 2c   | Admin 레이아웃 (사이드바/헤더) + **대시보드 껍데기**         | 로그인 후 사이드바 있는 관리 화면                 | **완료** |
| 2d   | 사용자 관리 API + **목록/승인/거절/정지 UI**                 | PENDING 유저 승인 → ACTIVE 전환                   | **완료** |
| 2e   | 프로필 API + **프로필/비밀번호 변경 UI**                     | 이름·이메일·비밀번호 변경 직접 테스트             | **완료** |
| 2f   | 역할/권한 관리 API + **권한 매트릭스 UI** + 사이드바 필터링  | 역할 생성 → 권한 설정 → 사이드바 메뉴 필터링 확인 | **완료** |

### Stage 3 — Admin CMS 기능

| 단계 | 내용                                             | 확인 가능한 것                      | 상태 |
| ---- | ------------------------------------------------ | ----------------------------------- | ---- |
| 3a   | 서브 페이지 CRUD API + **목록/뷰/편집 UI** (Tiptap) + 권한 체크 | 서브 페이지 CRUD + 뷰/편집 분리 + 클라이언트 권한 체크 패턴 도입 | **완료** |
| 3b   | 게시판 CRUD API + **게시판 관리 UI**             | 게시판 생성 → 스킨 설정 → 목록 확인 | **완료** |
| 3c   | 게시글 CRUD API + **목록/편집 UI**               | 게시글 작성 → 발행 → 목록 확인      | 대기 |
| 3d   | 메뉴 관리 API + **메뉴 편집 UI** (dnd-kit)       | 메뉴 항목 추가 → 드래그 순서 변경   | 대기 |
| 3e   | 감사 로그 API + **감사 로그 UI** + 내보내기      | 활동 이력 조회 → CSV/Excel 다운로드 | 대기 |
| 3f   | 사이트 설정 API + **도메인/보안/업로드 설정 UI** | 설정 변경 → 저장 → 반영 확인        | 대기 |

### Stage 4 — 공개 웹

| 단계 | 내용                                       | 확인 가능한 것                           | 상태 |
| ---- | ------------------------------------------ | ---------------------------------------- | ---- |
| 4a   | Web 메인+서브페이지 렌더링 + KRDS 레이아웃 | admin에서 만든 서브 페이지가 공개 웹에 표시 | 대기 |
| 4b   | Web 게시판/게시글 렌더링                   | 발행한 게시글이 공개 웹에 노출           | 대기 |
| 4c   | Web 메뉴 렌더링 + 도메인 미들웨어          | 헤더/푸터 메뉴, 커스텀 도메인 리다이렉트 | 대기 |
| 4d   | Web 통합검색 (PGroonga)                    | `/search?q=검색어`로 검색 결과 확인      | 대기 |
| 4e   | Web 에러 캡처 + **Admin 에러 로그 UI**     | web 에러 → admin에서 조회/해결           | 대기 |

### Stage 5 — 메인 페이지 전용

| 단계 | 내용                                       | 확인 가능한 것                     | 상태 |
| ---- | ------------------------------------------ | ---------------------------------- | ---- |
| 5a   | 메인 섹션 관리 + **Admin UI + Web 렌더링** | 섹션 데이터 편집 → 메인에 반영     | 대기 |
| 5b   | 메인 팝업 관리 + **Admin UI + Web 모달**   | 팝업 등록 → 메인 방문 시 모달 표시 | 대기 |

### Stage 6–8 — 확장 / 인프라

| 단계 | 내용                                        | 확인 가능한 것                     | 상태 |
| ---- | ------------------------------------------- | ---------------------------------- | ---- |
| 6    | 서브페이지 블록 + **Admin UI + Web 렌더링** | 블록 추가/순서 변경 → 공개 웹 확인 | 대기 |
| 7    | 미리보기 + 커스텀 HTML/CSS + 운영 UX        | draft 미리보기, Monaco 편집        | 대기 |
| 8    | Docker + CI/CD + 문서화                     | `docker compose up`으로 전체 실행  | 대기 |

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
```

## 개발 원칙

1. **운영 기준 + 책임 분리 우선**: 코드 경계를 명확히 나누고, 장애 추적·모니터링이 용이한 구조를 선택한다
2. **코드 재사용성 + 단일 소스 원칙**: 동일 로직의 중복을 피하고, 하나의 정의가 하나의 진실을 담당한다

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
- entityType 종류: `SUBPAGE`, `BOARD`, `POST`, `NAVIGATION_MENU`, `NAVIGATION_MENU_ITEM`, `HOME_SECTION`, `HOME_POPUP`, `USER`, `ROLE`, `SITE_SETTINGS`, `ERROR_LOG`, `MEDIA`
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
| CSS (web)                | KRDS 기반                                          | web                 | 확정                                                                                                              |
| 날짜 처리                | date-fns                                           | 전체                | tree-shaking 친화적 (함수 단위 import)                                                                            |
| 아이콘                   | lucide-react                                       | 전체                | shadcn/ui 기본 아이콘, 개별 import 최적화                                                                         |
| 데이터 페칭 (클라이언트) | TanStack Query                                     | admin               | Key Factory + queryOptions 패턴, @tanstack/eslint-plugin-query 활용                                               |
| 상태 관리 (클라이언트)   | Zustand                                            | admin, web          | UI 상태 전용. 서버 데이터는 TanStack Query가 담당                                                                 |
| CSV 내보내기             | 네이티브 구현                                      | admin               | 외부 라이브러리 없이 문자열 기반 CSV 생성                                                                         |
| Excel 내보내기           | exceljs                                            | admin               | XLSX 바이너리 형식 생성, 감사 로그 다운로드용                                                                     |
| 비밀번호 해싱            | bcryptjs                                           | admin (packages/db) | 순수 JS, 네이티브 빌드 불필요. SHA256은 범용 해시라 비밀번호에 부적합 — bcrypt는 의도적으로 느린 해싱 + 내장 salt |

모든 라이브러리는 최신 버전을 설치하는 것을 기본 원칙으로 한다.

### 콘텐츠 편집 방향

- **본문**: Tiptap WYSIWYG 에디터 → Tiptap JSON(`contentJson`)으로 저장 + 검색용 plain text(`content`) 동시 저장
  - `contentJson`: 렌더링의 진실의 원천 (Tiptap ProseMirror JSON)
  - `content`: Tiptap JSON에서 추출한 순수 텍스트 (PGroonga 검색 인덱싱용)
  - 텍스트 추출: `packages/editor`의 `extractTextFromTiptap()` 유틸리티
  - 적용 모델: Subpage, Post, HomePopup(콘텐츠형) 전체 통일
- **web 렌더링**: `@tiptap/html`의 `generateHTML()` — 서버 사이드 전용, 클라이언트 JS 0
  - `packages/editor`의 공유 확장으로 admin과 동일한 렌더링 보장
  - DOMPurify 새니타이징 (defense-in-depth)
- **커스텀 코드**: Subpage 모델에 `customHtml`, `customCss` 필드 추가 (nullable)
  - 본문 + 블록과 독립적으로 관리
  - admin에서 Monaco Editor로 별도 탭 제공
  - web에서 DOMPurify 새니타이징 후 렌더링
  - CSS는 페이지 스코프로 격리
  - JS는 1차 비허용 (2차에서 제한적 허용 검토)
- **블록**: 기존 PageBlock 시스템 유지 (blockType + configJson)

## 테스트 전략

- 단위/모듈 테스트: Vitest
- 테스트 파일 위치: 테스트 대상 코드와 같은 디렉토리 (`*.test.ts` / `*.test.tsx`)
- 네이밍: `{파일명}.test.ts`
- Turborepo `test` 태스크로 통합 실행 (`pnpm test`)
- E2E: Playwright (2차 범위, 8단계 이후)

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
