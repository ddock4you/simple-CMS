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
src/
├── app/          # Next.js App Router 라우팅
├── pages/        # FSD pages 레이어 (화면 단위 운영 UI)
├── features/     # 기능 단위 폼/액션
├── entities/     # 도메인 엔티티 관련 로직
└── shared/       # 공용 유틸, UI 기본 컴포넌트
```

- `widgets`는 필요 시에만 도입
- 페이지 단위 운영 화면 + 기능 단위 폼/액션 중심

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
- 권한 체크 패턴:
  - API Route: `requirePermission(resource, action)` — 401(미인증) 또는 403(권한 없음) 반환
  - 사이드바: `getVisibleMenuItems(user)` — read 권한 없는 메뉴 숨김
  - 프로필(`/profile`): 권한 체크 없이 모든 인증 사용자 접근 가능
  - 대시보드(`/dashboard`): 모든 역할에 기본 포함 (비토글)
- SessionUser에 role 정보 포함 (eager-load via `getSessionUser` include: { role: true })
- UI 차단 + 서버 검증 함께 적용

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
/pages                  # 페이지 목록
/pages/[id]             # 페이지 편집
/boards                 # 게시판 목록
/posts                  # 게시글 목록
/navigation             # 메뉴 관리
/navigation/[menuId]    # 메뉴 세트 편집
/home                   # 메인 페이지 관리
/home/popups            # 메인 팝업 관리
/users                  # 사용자 관리 (목록, 승인/거절, 정지/해제)
/profile                # 내 정보 변경 (이름, 비밀번호)
/audit-logs             # 활동 이력 (감사 로그)
/error-logs             # 웹 에러 로그 (공개 웹 런타임 에러 조회)
/error-logs/[id]        # 에러 상세 (스택 트레이스, 요청 컨텍스트)
/settings               # 사이트 설정 (첫 번째 하위 설정으로 리다이렉트)
/settings/domain        # 도메인 설정
/settings/security      # 보안 설정 (동시 로그인 정책)
/settings/upload        # 업로드 제한 설정 (허용 확장자, MIME 타입, 최대 파일 크기)
/settings/roles         # 권한 관리 (역할 목록 + 메뉴별 CRUD 매트릭스)
```

## 기능별 상세 스펙

### 페이지 CRUD

- 제목, slug, SEO title/description, Markdown 본문
- draft / published 상태 관리
- slug: 제목 기반 자동 생성 + 수동 수정
- `published` 상태 slug 변경 시 경고
- 대표 이미지 필드
- 미리보기 제공
- 본문 편집: Tiptap WYSIWYG 에디터 (Tiptap JSON 저장, 검색용 plain text 동시 저장 — `@simple-cms/editor` 공유 확장 사용)

### 커스텀 코드 편집

- Markdown 본문, 블록과 별도로 페이지별 커스텀 HTML/CSS 편집 기능
- Monaco Editor로 편집, 별도 탭 UI
- `customHtml`: 페이지 내 지정 위치에 HTML 삽입 (nullable)
- `customCss`: 페이지 스코프 스타일 적용 (nullable)
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

- 이름, slug, 설명, 스킨 타입(list/gallery), 공개 여부
- slug 중복 불가
- 삭제 시 소속 게시글 존재 여부 확인 → 있으면 차단/선행 정리

### 게시글 CRUD

- 제목, 본문(Tiptap JSON), 대표 이미지, 게시판 소속
- draft / published 상태
- 발행일 관리
- slug: 게시판 단위 unique (`boardSlug + postSlug`)

### 메뉴 관리

- NavigationMenu (메뉴 묶음): Header Main, Footer, Quick Links
- NavigationMenuItem (메뉴 항목): label, itemType, 연결 대상, parentId, isVisible, displayOrder, openInNewTab, 노출 기간
- **항목 타입**: PAGE(pageId), BOARD(boardId), EXTERNAL(url), CUSTOM(경로)
- 최대 2depth
- 연결은 엔티티 참조 방식 우선 (URL 직접 입력 아님)
- slug 변경 시 메뉴가 깨지지 않는 구조
- 메뉴명: 연결 시 자동 입력, 이후 수동 수정 가능
- 미리보기 제공

### 메인 페이지 관리

- 일반 서브페이지와 분리된 **섹션 기반 관리**
- 레이아웃은 코드에서 통제, 운영자는 섹션 데이터+순서 관리
- 섹션 목록/노출 여부/순서 조정/데이터 편집
- 상세 섹션 종류는 디자이너 시안 확정 후 구체화
- 예: Hero, 추천 콘텐츠, 바로가기, 최신 게시글, CTA, 공지 영역
- 미리보기 제공

### 메인 팝업 관리

- **콘텐츠형**: 제목 + Tiptap JSON 본문 + 버튼 라벨/링크(optional)
- **이미지형**: 이미지 + alt 텍스트(필수) + 링크(optional)
- 노출 여부, 순서 조정, 시작일/종료일(optional)
- 미리보기 제공

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
- 목록: 날짜, 사용자, 액션, 엔티티 타입, 엔티티 제목, IP
- 필터: 날짜 범위, 액션 타입, 엔티티 타입, 사용자
- 상세: changes JSON의 before/after diff 표시
- 내보내기: CSV(네이티브) / Excel(exceljs), 날짜 범위 필수
- 내보내기 엔드포인트: API Route (`/api/audit-logs/export`)
- FSD 위치: `features/audit-log`
- 읽기 전용 화면 (AuditLog 자체의 생성/수정/삭제 UI 없음)

### 웹 에러 로그 (런타임 에러 조회)

- 공개 웹(apps/web)에서 발생한 서버/클라이언트 런타임 에러를 조회하는 운영 도구
- AuditLog(관리자 활동 이력)와 별도 — ErrorLog는 웹 사용자 경험 에러 추적용
- FSD 위치: `features/error-log`, `entities/error-log`

#### 목록 (`/error-logs`)

- 컬럼: 시간, 레벨(ERROR/WARN 뱃지), 소스(SSR/API/CLIENT 등 뱃지), 메시지(첫 줄), URL, 해결 상태
- 필터: 레벨, 소스, 날짜 범위, URL 패턴(부분 일치), 해결 상태(전체/미해결/해결)
- 기본 정렬: `createdAt DESC`, 기본 필터: 미해결 우선
- 서버 사이드 페이지네이션 (기본 20건)
- 그룹 뷰: `fingerprint` 기준 집계 (같은 에러 N회 발생 표시)
- 액션: 해결 처리, 일괄 해결, 오래된 로그 삭제(날짜 기준 + 확인 다이얼로그)

#### 상세 (`/error-logs/[id]`)

- 전체 에러 메시지 + 스택 트레이스 (`<pre>` 블록)
- 요청 컨텍스트: URL, method, statusCode, userAgent, IP, referer
- 메타데이터 JSON (포맷팅 표시)
- 에러 소스/레벨
- Fingerprint: 같은 fingerprint의 다른 에러 링크
- 해결 상태 + 해결자 정보

#### 해결 처리

- 해결 처리는 관리자 데이터 변경이므로 `logAuditEvent()` 호출 (`entityType: 'ERROR_LOG'`, `action: 'UPDATE'`)
- `isResolved = true`, `resolvedAt = now()`, `resolvedBy = currentUser.id`

#### 대시보드 위젯

- `/dashboard`에 에러 요약 위젯: 최근 24시간/7일 에러 수, 미해결 에러 수, 추이 표시
- FSD 위치: `features/error-log/ui/ErrorLogDashboardWidget.tsx`

### 사이트 설정 관리

- 라우트: `/settings/domain`
- FSD: `features/site-settings/` (api, model, ui)
- API Routes: `PATCH /api/settings/domain`, `POST /api/settings/domain/check-dns`, `DELETE /api/settings/domain`
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
| `dashboard`  | 대시보드    | read                         |
| `pages`      | 페이지      | create, read, update, delete |
| `boards`     | 게시판      | create, read, update, delete |
| `posts`      | 게시글      | create, read, update, delete |
| `navigation` | 메뉴 관리   | create, read, update, delete |
| `home`       | 메인 페이지 | create, read, update, delete |
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

## 유효성 검사 규칙

- 필수값 누락 시 저장 불가
- `published` 상태에서는 추가 검증 강화
- 연결형 데이터는 참조 무결성 확인
- 날짜 범위는 논리적으로 유효해야 함
- UI + 서버 양쪽에서 검증

### 대표 검증 항목

- 페이지/게시글 제목 필수
- `published` 페이지/게시글은 slug 필수
- 게시판 slug 중복 불가
- 이미지형 팝업 alt 필수
- 메뉴 PAGE 타입 → pageId 필수 / BOARD → boardId / EXTERNAL·CUSTOM → url/경로 필수
- 팝업 시작일 ≤ 종료일
- 메뉴 depth 최대 2단계
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
