<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->

# packages/db — Prisma + PostgreSQL

Prisma schema 정의, Client 생성, query helper를 관리하는 공용 데이터베이스 패키지.
앱에서는 `@simple-cms/db`로 import하여 사용한다.

## 역할

- Prisma schema 정의 및 마이그레이션 관리
- PrismaClient 싱글턴 생성 및 export
- 도메인별 query helper (필요 시 repository 패턴)
- PGroonga 기반 검색 쿼리 관리

## 구조

```
packages/db/
├── prisma/
│   ├── schema.prisma         # 스키마 정의
│   ├── migrations/           # 마이그레이션 히스토리
│   ├── seed.ts               # 시드 데이터 (최초 관리자 계정 생성)
│   ├── pgroonga-setup.sql    # PGroonga 확장 + 검색 인덱스 SQL
│   └── pgroonga-setup.ts     # PGroonga 설정 실행 스크립트 (tsx)
├── src/
│   ├── index.ts              # 패키지 진입점 (앱에서 @simple-cms/db로 import)
│   ├── client.ts             # PrismaClient 싱글턴
│   ├── auditLog.ts           # 감사 로그 기록 헬퍼 (logAuditEvent)
│   ├── sessionHelper.ts      # 세션 CRUD 헬퍼 (createSession, validateSession 등)
│   ├── search.ts             # PGroonga 통합검색 헬퍼 (searchContent)
│   ├── errorLog.ts           # 웹 에러 로그 헬퍼 (logWebError, cleanupErrorLogs, computeErrorFingerprint)
│   └── repositories/         # 도메인별 query helper (필요 시)
└── package.json
```

## Prisma 컨벤션

- 모델명: `PascalCase` 단수형 (`User`, `Subpage`, `Board`, `Post`)
- 필드명: `camelCase` (`displayOrder`, `publishedAt`, `boardId`)
- 관계 필드: 참조 대상 모델명 소문자 (`author`, `board`, `subpage`)
- enum: `PascalCase` (`ContentStatus`, `BoardSkin`, `MenuItemType`)
- 인덱스: 자주 조회하는 필드에 `@@index` 명시
- 모든 모델에 `createdAt`, `updatedAt` 포함

## PrismaClient 싱글턴

개발 환경 hot reload 시 연결 누수 방지를 위해 `globalThis` 패턴 사용:

```ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

앱에서 접근: `import { prisma } from '@simple-cms/db'`

### Prisma query 로그

- 개발 모드 기본 로그는 `error`, `warn`만 출력한다.
- SQL query 로그가 필요할 때만 `PRISMA_QUERY_LOG=true pnpm dev`처럼 환경변수를 켠다.
- 운영 모드는 query 로그를 출력하지 않고 `error`만 출력한다.

## PGroonga 관련

- PGroonga raw query는 `src/search.ts`에 구현
- Prisma의 `$queryRaw` tagged template literal 사용 (SQL injection 방지)
- PGroonga 확장 + 인덱스 설정: `prisma/pgroonga-setup.sql` (멱등, 로컬/Supabase 공용)
- 로컬: `docker/docker-compose.yml`의 `groonga/pgroonga` 이미지에 PGroonga 포함
- Supabase: Dashboard > Database > Extensions > pgroonga 활성화 후 SQL 실행

### 검색 헬퍼 (`src/search.ts`)

| 함수                                     | 설명                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| `searchContent(query, page?, pageSize?, type?)` | Subpage + Post 통합 검색, PGroonga `&@~` 연산자, 관련도 정렬. `type`: `all`/`subpage`/`post` |

- 검색 대상: `PUBLISHED` 상태의 Subpage(title + content) + Post(title + content, 공개 게시판만)
- `UNION ALL`로 통합 쿼리, `pgroonga_score()` 관련도 + `publishedAt DESC` 보조 정렬
- 반환: `SearchResponse { items: SearchResult[], total, counts: { all, subpage, post }, totalPages, page, pageSize, type }`
- 빈 쿼리 → 빈 결과, 쿼리 최대 200자 제한
- 쿼리 실패 시 빈 결과 반환 (에러 로깅만, throw 안 함)

## 명령어

```bash
pnpm db:generate    # Prisma Client 생성 (pnpm install 시 postinstall로 자동 실행됨)
pnpm db:push        # 스키마를 DB에 직접 반영 (개발용)
pnpm db:migrate     # 마이그레이션 생성 및 적용
pnpm db:studio      # Prisma Studio 실행
pnpm db:pgroonga    # PGroonga 확장 + 검색 인덱스 설정
```

> **postinstall 동작**: `packages/db/package.json`의 `postinstall: prisma generate`가 `pnpm install` 직후 자동 실행되어 `src/generated/prisma/`를 만든다. Vercel Install Command(`pnpm install --frozen-lockfile`)만으로 Prisma client가 생성되므로 Build Command에 별도 `db:generate` 단계 불필요. Dockerfile은 명시적 `pnpm --filter @simple-cms/db generate` 단계를 유지하지만 멱등이라 무해.

## Role 모델 컨벤션

- `name`: 역할명, `@unique`, 1~50자
- `description`: 설명, optional
- `permissions`: `Json` 타입, 메뉴별 CRUD 권한 매트릭스
  - 구조: `{ [resource]: { [action]: boolean } }`
  - 예: `{ "subpages": { "create": true, "read": true, "update": true, "delete": false } }`
  - 미등록 리소스/액션 = 권한 없음
- `isSystem`: 총괄 관리자 표시 (`true`), 삭제/권한 수정 불가
- `isDefault`: 가입 승인 시 자동 부여 역할 (`true`), 하나만 가능 (앱 레벨 제약)
- 관계: `users User[]`
- 인덱스: `@@index([isDefault])`

## User 모델 컨벤션

- `username`: 로그인 식별자, `@unique`, 영문+숫자+밑줄 4~20자
- `password`: bcryptjs 해싱값 저장, 평문 저장 절대 금지
  - 해싱: `bcryptjs` 패키지, cost factor 10 (기본값)
  - Prisma select에서 password 제외가 기본 (로그인 API 핸들러에서만 조회)
  - 감사 로그에 비밀번호 해시값 절대 기록 금지
- `email`: 회원가입 시 수집, optional (`String? @unique`)
- `status`: `UserStatus` enum — `PENDING` / `ACTIVE` / `SUSPENDED`
  - 가입 시 기본값: `PENDING`
  - `ACTIVE`만 로그인 허용
  - `SUSPENDED` 전환 시 해당 사용자 세션 전부 삭제
- `roleId`: `Role` FK (nullable)
  - PENDING 유저: null (승인 시 기본 역할 배정)
  - `onDelete: SetNull` (역할 삭제 시 null로 변경)
  - roleId null인 ACTIVE 유저: 대시보드/프로필만 접근 가능
  - `@@index([roleId])`

### Seed 스크립트 (`prisma/seed.ts`)

- 총괄 관리자 Role 생성: `isSystem: true`, 전체 권한 (`RESOURCE_ACTIONS` 기반 자동 생성)
- 기본 역할(일반 관리자) Role 생성: `isDefault: true`, 기본 권한 세트
- `.env`의 `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_PASSWORD`로 최초 관리자 생성
- `status: ACTIVE`, `roleId: 총괄관리자.id`로 직접 생성 (승인 없이)
- 멱등성: 해당 username/role이 이미 존재하면 skip
- 개발/배포 초기 1회 실행 용도

## 감사 로그 모델 컨벤션

- AuditLog는 append-only: `create`와 `findMany`/`findFirst`만 사용
- `updatedAt` 필드 없음 (수정 불가 모델)
- `changes` 필드는 `Json?` 타입, 구조:
  - CREATE: `{ "after": { ... } }`
  - UPDATE: `{ "before": { ... }, "after": { ... } }` (메타데이터 필드만, 본문 제외)
  - DELETE: `{ "before": { ... } }`
  - LOGIN/LOGOUT: null
- `entityTitle`은 액션 시점의 스냅샷 (원본 변경/삭제 후에도 이력 유지)
- `entityType`, `entityId`는 nullable (LOGIN/LOGOUT에는 대상 엔티티 없음)
- `AuditEntityType` enum에 `ROLE` 포함 (역할 생성/수정/삭제/권한 변경 기록)
- `AuditEntityType` enum에 `PAGE_BLOCK` 포함 (서브페이지 블록 생성/수정/삭제/순서 변경, Stage 6)
- `PageBlockType` enum에 `RICH_TEXT` 포함 (Stage 6 통합 블록 모델 — `Subpage.contentJson` 필드는 제거되고 RICH_TEXT 블록으로 흡수됨). `Subpage.content`(검색용 plain text)는 유지
- `logAuditEvent()`는 fire-and-forget (실패 시 console.error, throw 하지 않음)
- 주 액션과 같은 트랜잭션에 포함하지 않음
- `userId`는 nullable: 비인증 액션(회원가입)에서는 null 허용
- 비밀번호 관련 변경은 `{ after: { passwordChanged: true } }`로만 기록 (해시값 포함 금지)

## 에러 로그 모델 컨벤션

- ErrorLog는 공개 웹(apps/web)에서 발생한 런타임 에러를 기록하는 모델
- append-only 기본이나, 해결 상태(`isResolved`, `resolvedAt`, `resolvedBy`) 업데이트만 허용
- `updatedAt` 필드 없음 (에러 데이터 자체는 수정 불가)
- `level` 필드: `ErrorLevel` enum (`ERROR`, `WARN`만 사용, INFO는 범위 외)
- `source` 필드: `ErrorSource` enum (`SERVER_SSR`, `SERVER_API`, `SERVER_MIDDLEWARE`, `CLIENT_REACT`, `CLIENT_JS`)
- `stack` 필드: `@db.Text` 타입 (스택 트레이스 전체 저장)
- `digest` 필드: Next.js 에러 digest (Server Component 에러 그룹핑용)
- `fingerprint` 필드: `hash(source + urlPattern + normalizedMessage)` — 유사 에러 그룹핑용 해시
  - URL에서 동적 세그먼트(UUID, 숫자 ID) 제거 후 패턴화
  - 메시지에서 동적 값(UUID, 타임스탬프) 제거 후 정규화
  - 쓰기 시점에 계산, 조회 시점에 `GROUP BY fingerprint`로 집계
- `metadata` 필드: `Json?` 타입, 자유 형식 (요청 헤더, 쿼리 파라미터, 컴포넌트명 등 추가 컨텍스트)
- `logWebError()` 헬퍼: `packages/db/src/errorLog.ts`
  - fire-and-forget (실패 시 `console.error`, throw 하지 않음)
  - 주 렌더링/응답과 같은 트랜잭션에 포함하지 않음
  - 사용자 응답을 차단하지 않음
- `cleanupErrorLogs()` 헬퍼: 보존 기간 초과 레코드 삭제 (기본 90일)
- 인덱스: `[createdAt]`, `[level]`, `[source]`, `[fingerprint]`, `[isResolved, createdAt]`, `[url]`

### 에러 로그 헬퍼 (`src/errorLog.ts`)

| 함수                                            | 설명                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `logWebError(input)`                            | 에러 기록 + fingerprint 자동 계산, fire-and-forget (내부 try-catch) |
| `cleanupErrorLogs(retentionDays?)`              | 보존 기간 초과 레코드 삭제 (기본 90일)                              |
| `computeErrorFingerprint(source, url, message)` | SHA-256 hex 앞 16자, 유닛 테스트/외부 재사용용                      |

- fingerprint 정규화: UUID → `{uuid}`, 숫자 → `{n}`, 문자열 리터럴 → `{str}`, 메시지 200자 제한
- URL 정규화: URL 파싱 후 pathname만 사용, UUID/숫자 세그먼트 치환
- 메시지 저장 최대 2000자 (방어적 절단)
- 해결 상태 업데이트는 app/api/error-logs/[id] PATCH에서 직접 처리 (헬퍼 경유하지 않음)

## SubpageFeedback 모델 컨벤션 (Stage 10)

- **익명 만족도 조사 모델**: `subpageId`, `rating FeedbackRating`(POSITIVE/NEGATIVE), `positiveReasons String[]`, `comment String? @db.Text`, `ipAddressHash String?`, `userAgent String? @db.Text`, `createdAt`
- **IP 해싱 필수**: raw IP 저장 금지. `apps/web/app/api/feedback/route.ts`가 `sha256(ip + FEEDBACK_IP_SALT)`로 해시화하여 저장
- **인덱스 4개**:
  - `[subpageId, createdAt]` — 페이지별 최신 조회
  - `[subpageId, rating]` — 페이지별 긍정/부정 집계
  - `[ipAddressHash, subpageId, createdAt]` — 24h rate limit 쿼리 (POST 핸들러)
  - `[createdAt]` — 전역 통계
- **삭제 정책**: `Subpage @relation(onDelete: Cascade)` — Subpage 삭제 시 모든 피드백 자동 정리. `findMediaReferences()` 확장 불필요 (Media FK 없음)
- **헬퍼**: `cleanupOldFeedback(retentionDays = 365)` — `packages/db/src/feedbackCleanup.ts`. cron 등록은 Stage 8 (Docker + CI/CD) 범위
- **운영 정책**: 365일 보존이 기본 — 개인정보 최소화. 운영 중 단축 시 `cleanupOldFeedback(180)` 호출

## 세션 모델

커스텀 세션 기반 인증에서 사용하는 모델:

| 모델      | 역할                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| `Session` | DB 세션 레코드 (`id`, `sessionToken` crypto.randomUUID @unique, `userId`, `expires`, `createdAt`) |

- Account 모델 없음 (OAuth 불필요)
- VerificationToken 모델 없음 (이메일 인증 불필요)
- 세션 레코드는 `packages/db/src/sessionHelper.ts`의 커스텀 코드가 관리
- 동시 로그인 제어를 위한 세션 삭제/생성/조회 헬퍼 제공

## PreviewToken 모델 컨벤션 (Stage 7a)

- **용도**: admin이 발급한 단기 토큰을 web이 교환하여 draft 콘텐츠 미리보기 세션을 수립
- **핵심 필드**:
  - `token String @unique` — `crypto.randomUUID()` 값
  - `entityType PreviewEntityType` — `SUBPAGE` | `POST` (enum)
  - `entityId String` — 대상 엔티티 id
  - `issuedById String` — 발급 관리자, `User` FK, `onDelete: Cascade`
  - `expires DateTime` — 기본 TTL 10분
- **인덱스**: `@@index([expires])` (만료 정리용), `@@index([issuedById])`
- **정리 정책**: lazy — 만료된 토큰은 다음 요청 시 검증 실패로 자연 배제. 별도 cron cleanup은 2차
- **재사용**: 교환 후 삭제하지 않음 — TTL 내 동일 URL 새 탭 재방문 허용. 쿠키(10분 TTL)가 실질적 게이트
- **감사 로그 없음**: 미리보기는 읽기 액션이므로 `AuditLog`에 기록하지 않음 (AGENTS.md "생략 사유 명시" 원칙에 따라 API Route 주석으로 표기)

### 세션 헬퍼

`packages/db/src/sessionHelper.ts`:

| 함수                            | 설명                                                   |
| ------------------------------- | ------------------------------------------------------ |
| `createSession(userId)`         | 세션 생성 (crypto.randomUUID 토큰, 만료 시간 설정)     |
| `validateSession(sessionToken)` | 토큰 존재 + 미만료 확인                                |
| `getSessionUser(sessionToken)`  | 세션 검증 + User 정보 반환 (`include: { role: true }`) |
| `deleteUserSessions(userId)`    | 특정 사용자의 모든 DB 세션 삭제                        |
| `countUserSessions(userId)`     | 특정 사용자의 활성 세션 수 조회                        |
| `deleteExpiredSessions()`       | 만료된 세션 정리 (배치/cron용)                         |

- `deleteUserSessions()`는 로그인 API 핸들러에서 동시 로그인 비허용 시 호출
- 만료 세션 정리는 별도 스케줄러 또는 로그인 시점 부수 처리

## Media 모델 컨벤션 (Stage 5a-2)

- **핵심 필드**: `id`, `filename`, `originalFilename`, `mimeType`, `size`, `url`, `alt`, `createdAt`
- **추가 필드 (Stage 5a-2)**:
  - `contentHash String? @unique` — SHA-256 hex. 업로드 시 바이너리에서 계산. 동일 바이너리 재업로드 시 기존 레코드 재사용
  - `uploadedById String?` — 업로더 User FK, `onDelete: SetNull` (사용자 삭제 시 "(삭제된 사용자)" 표시)
- **관계**:
  - `uploadedBy User? @relation("MediaUploader", ...)` (역관계: `User.uploadedMedia Media[]`)
  - `subpages Subpage[]`, `posts Post[]` (featuredImage 역관계)
  - `homePopupImages HomePopup[]` — Stage 5b, `HomePopup.imageMediaId`의 역관계
- **인덱스**: `@@index([uploadedById])` (필터링용). `contentHash`는 `@unique`가 자동으로 인덱스 생성
- **삭제 정책**: 참조 추적 후 사용 중이면 차단 — 강제 삭제 불허. 자세한 내용은 루트 AGENTS.md "미디어 라이브러리 정책" 참조

## HomePopup 모델 컨벤션 (Stage 5b)

- **타입**: `popupType` enum `HomePopupType` (`CONTENT` | `IMAGE`)
- **콘텐츠형 필드**: `contentJson Json?` (Tiptap ProseMirror JSON) + `content Text?` (PGroonga/요약용 plain text — `extractTextFromTiptap()`로 동시 저장)
- **이미지형 필드**: `imageUrl`, `imageAlt`, `imageMediaId String?` (Media FK, `onDelete: SetNull`)
  - `imageMedia Media? @relation("HomePopupImage", ...)` 관계
  - `@@index([imageMediaId])` 조회 최적화
- **링크 필드**: `linkUrl String?` — 내부 경로(`/p/...`, `/board/...`)와 외부 URL(`https://...`) 모두 수용. admin UI에서 유형별 탭으로 분기 입력하지만 DB에는 단일 문자열로 저장
- **표시 제어**: `isVisible`, `displayOrder`, `startDate?`, `endDate?`
- **감사 로그**: `AuditEntityType.HOME_POPUP` (enum 이미 등록됨), CREATE/UPDATE/DELETE 모두 기록
- **참조 추적**: `imageMediaId`는 admin의 `findMediaReferences()`가 스캔하여 Media 삭제 차단

## 동시 로그인 관련 SiteSettings 키

| 키                         | 기본값   | 설명                                         |
| -------------------------- | -------- | -------------------------------------------- |
| `CONCURRENT_LOGIN_ENABLED` | `"true"` | 동시 로그인 허용 여부 (`"true"` / `"false"`) |

- 기존 `getSiteSetting()` / `setSiteSetting()` 헬퍼로 조회/변경
- 로그인 API 핸들러에서 이 값을 조회하여 세션 정리 여부 결정
- DB 세션 전략이므로 세션 무효화가 즉시 반영됨 (JWT와 달리 별도 blocklist 불필요)

## 업로드 제한 관련 SiteSettings 키

| 키                          | 기본값                          | 설명                |
| --------------------------- | ------------------------------- | ------------------- |
| `UPLOAD_ALLOWED_EXTENSIONS` | 이미지+문서 확장자 JSON 배열    | 허용 파일 확장자    |
| `UPLOAD_ALLOWED_MIME_TYPES` | 이미지+문서 MIME 타입 JSON 배열 | 허용 MIME 타입      |
| `UPLOAD_MAX_FILE_SIZE_MB`   | `"10"`                          | 최대 파일 크기 (MB) |

- 값은 JSON 문자열로 저장, 조회 시 `JSON.parse()` + 기본값 폴백
- 기존 `getSiteSettings()` / `setSiteSetting()` 헬퍼로 조회/변경

### 업로드 검증 헬퍼

`packages/db/src/uploadRestriction.ts`:

| 함수                                                    | 설명                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `getUploadRestrictions()`                               | 3개 키 일괄 조회, JSON 파싱, 기본값 폴백 포함                    |
| `validateFileUpload(fileName, mimeType, fileSizeBytes)` | 확장자 + MIME 타입 + 파일 크기 검증, `{ allowed, reason? }` 반환 |

- 업로드 처리 Server Action에서 파일 저장 전 `validateFileUpload()` 호출
- 클라이언트에서는 Server Component가 `getUploadRestrictions()` 결과를 props로 전달하여 파일 선택 시 사전 필터링

## 시연 모드(DEMO_MODE) 격리 인프라

루트 AGENTS.md "시연 모드 격리 인프라" 섹션이 정책의 단일 출처. 본 섹션은 packages/db 내부 구현 세부.

### sessionId sentinel 패턴

- 17 모델에 `sessionId String @default("__PROD__")` — NOT NULL + sentinel
- 운영 환경(`DEMO_MODE` 미설정): 모든 row가 `'__PROD__'`. composite unique가 글로벌 unique와 동일 동작
- 시연 환경(`DEMO_MODE=true`): visitor cuid 또는 `'__SEED__'`(seed 원본)가 sessionId로 저장
- 호환 보호: 신규 기존 운영 DB는 `prisma/backfill-session-id.ts` 1회 실행으로 NULL → '**PROD**' 백필 (멱등)

### composite unique 8개 모델

- key-as-lookup: `SiteSettings([sessionId, key])`, `Role([sessionId, name])`, `NavigationMenu([sessionId, name])`, `Media([sessionId, contentHash])`
- slug-as-lookup: `Subpage([sessionId, slug])`, `Board([sessionId, slug])`, `Post([sessionId, boardId, slug])`, `User([sessionId, username])` + `User([sessionId, email])`
- 글로벌 @unique 유지: `Session.sessionToken`, `PreviewToken.token` (인증 인프라, 토큰 자체가 전역 식별자)

### `demo` namespace API

`import { demo } from '@simple-cms/db'`로 진입.

| 함수                                        | 시그니처                                                 | 용도                                                                             |
| ------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `demo.runWith(ctx, fn)`                     | `(ctx: DemoContext, fn: () => Promise<T>) => Promise<T>` | 콜백 스코프 안에서만 sessionId 활성화. cron / 스크립트 / 특수 경로용             |
| `demo.runWithBypass(fn)`                    | `(fn: () => Promise<T>) => Promise<T>`                   | extension의 sessionId 주입을 skip. 인증 부트스트랩 / seed / cron cleanup 용도    |
| `demo.enterWith(ctx)`                       | `(ctx: DemoContext) => void`                             | 현재 async 컨텍스트에 즉시 부착. layout 진입부에서만 사용 (이후 모든 await 적용) |
| `demo.getCurrentSessionId()`                | `() => string`                                           | 컨텍스트 미진입 시 `'__PROD__'` fallback. raw SQL WHERE 절에 사용                |
| `demo.isBypassed()`                         | `() => boolean`                                          | extension 자체 분기에 사용                                                       |
| `demo.PROD_SENTINEL` / `demo.SEED_SENTINEL` | `const string`                                           | `'__PROD__'` / `'__SEED__'` 문자열 상수                                          |

### Prisma extension 동작 (`DEMO_MODE=true`만)

`packages/db/src/demo/clientExtension.ts`의 `processOperation` named export로 구현. `Prisma.defineExtension({ query: { $allModels: { $allOperations } } })`이 모든 모델·작업을 가로챈다.

| Operation                                                                      | 동작                                                                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `findMany`/`findFirst`/`count`/`aggregate`/`groupBy`/`updateMany`/`deleteMany` | `args.where`에 `AND: [원래where, { sessionId }]` 추가                                                                                                                          |
| `create`                                                                       | `args.data`에 `sessionId` 자동 주입                                                                                                                                            |
| `createMany`/`createManyAndReturn`                                             | `args.data` 배열 각 element에 `sessionId` 주입                                                                                                                                 |
| `findUnique`/`findUniqueOrThrow`                                               | id 등 글로벌 unique 통과 → result hook에서 `result.sessionId` 검증. **`select`에서 sessionId 빠뜨려도 강제 추가 후 응답에서 strip** (cross-tenant 차단 + 호출자 contract 보존) |
| `update`/`delete`                                                              | 사전 `findFirst`로 sessionId 일치 검증 → 일치 시 원래 query 진행, 불일치 시 P2025 throw (cross-tenant write 차단)                                                              |
| `upsert`                                                                       | `console.warn` + 그대로 통과. helper에서 `findFirst → update                                                                                                                   | create`로 명시 분기하는 것이 표준 |
| **EXCLUDED_MODELS**: `Session` / `PreviewToken`                                | extension 격리 적용 안 됨 — 인증 인프라 (글로벌 token unique)                                                                                                                  |

### 호출 측 관습 (master 단일 스택)

| 패턴                    | 코드                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 단일 필드 unique lookup | `findFirst({ where: { slug } })` (extension이 sessionId 자동 추가)                                |
| `id` 기반 lookup        | `findUnique({ where: { id } })` 그대로 (extension result hook 검증)                               |
| upsert                  | helper에서 `findFirst → update                                                                    | create` 명시 분기 (`siteSettings.ts` 패턴 참조) |
| Raw SQL                 | `WHERE "sessionId" = ${demo.getCurrentSessionId()}` 명시 추가 (`$queryRaw`는 extension hook 우회) |
| 인증 부트스트랩         | `demo.runWithBypass(() => getSessionUser(token))`                                                 |
| Seed / 일회성 스크립트  | composite where 명시 (`{ sessionId_key: { sessionId: '__PROD__', key } }`)                        |

### 시연 자동 진입 — `__SEED__` prefill + clone (PR4)

PR4가 도입한 두 진입점. 세부 동작은 루트 AGENTS.md "PR4 visitor 진입 흐름" 참조.

| 함수                                 | 위치                                         | 역할                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloneSeedToSession(newSessionId)`   | `packages/db/src/demo/cloneSeedToSession.ts` | `__SEED__` row 14모델을 새 sessionId로 in-memory remap 클론. `prisma.$transaction(timeout 30s)` 안에서 `findMany → cuid2 사전 생성 → createMany` 순서. NavigationMenuItem.parentId는 2-pass(1차 null, 2차 update). 호출자는 반드시 `demo.runWithBypass(...)`로 감싸야 함. 반환: `{ stats, demoAdminId }` |
| `SeedNotFoundError`                  | `packages/db/src/demo/SeedNotFoundError.ts`  | `code: 'SEED_NOT_FOUND'`. `__SEED__` Role 0건 또는 `demo_admin` User 부재 시 throw. bootstrap API가 503으로 변환                                                                                                                                                                                         |
| `DEMO_ADMIN_USERNAME = 'demo_admin'` | 동일                                         | demo-seed.ts와 cloneSeedToSession이 공유하는 username 상수                                                                                                                                                                                                                                               |

**clone 대상 14모델 의존성 순서**: Role → User → Media → SiteSettings → NavigationMenu → Board → HomeSection → Subpage → Post → PageBlock → HomePopup → NavigationMenuItem → SubpageVersion → SubpageFeedback. `Session` / `PreviewToken`은 EXCLUDED. `AuditLog` / `ErrorLog`는 누적 로그라 클론 의미 왜곡으로 제외.

**알려진 한계**: SubpageVersion.snapshot Json 내부 mediaId/blockId, HomeSection.configJson 내부 boardId, RICH_TEXT 블록 Tiptap image 노드의 `attrs.mediaId`는 walker 미적용 → `__SEED__`-era id 잔존. PR9/11 snapshot export walker가 같은 데이터 구조 처리 시 일괄 도입.

### `__SEED__` prefill 스크립트 (`prisma/demo-seed.ts`)

`pnpm db:demo-seed` 실행 시 sessionId='**SEED**'로 22 row 멱등 생성:

- Role x2 (`총괄 관리자` / `일반 관리자`)
- User x1 (`demo_admin` / `demo_password` ACTIVE 총괄)
- SiteSettings x6 (CONCURRENT*LOGIN_ENABLED, SITE_NAME='시연 CMS', SITE_DESCRIPTION, UPLOAD*\*)
- NavigationMenu x2 (Header Main + Footer)
- Board x1 (`notice`)
- Subpage x1 (`about`, PUBLISHED)
- PageBlock x1 (about Subpage RICH_TEXT)
- HomeSection x9 (HERO/BRIEF_INTRO/SUB_CAROUSEL/FREQUENT_MENU/RECOMMENDED/SHORTCUT/LATEST_POSTS/CTA/NOTICE 대표 게시판)
- NavigationMenuItem x2 (about 링크 Header + Footer)

운영 seed.ts와 별개 — 자체 PrismaClient + PrismaPg 어댑터 사용 (extension 미적용). 모든 query에 `sessionId: SEED_SENTINEL` 명시 + `findFirst → update | create` (upsert 회피 룰 일관).

### 1시간 TTL 분기 (PR4)

- `packages/db/src/sessionHelper.ts::SESSION_MAX_AGE_MS` — `process.env.DEMO_MODE === 'true' ? 3600 * 1000 : 30 * 24 * 60 * 60 * 1000`
- `apps/admin/src/shared/lib/cookies.ts::SESSION_MAX_AGE` — 동일 분기 (초 단위)
- 한쪽만 변경하면 cookie ↔ DB 만료 불일치 (브라우저는 cookie 살아있는데 validateSession이 만료 처리). 후속 PR에서 단일 상수화 검토 가능

### 단위 테스트

- `packages/db/src/demo/sessionContext.test.ts` (11건): AsyncLocalStorage 동작 (runWith / runWithBypass / 중첩 / 비동기 chain)
- `packages/db/src/demo/clientExtension.test.ts` (17건): `processOperation` 직접 호출로 args 변환 검증 (DB 무관). `findMany`/`create`/`createMany`/`updateMany`/`findUnique` post-filter / select 빠짐 회귀 / EXCLUDED 모델 / upsert 경고
- `packages/db/src/demo/cloneSeedToSession.test.ts` (4건, PR4): `SeedNotFoundError` 시그니처 + `DEMO_ADMIN_USERNAME` 상수 + `cloneSeedToSession` async 시그니처
- 통합 smoke: `DEMO_TEST_DB_URL` 환경 변수 있을 때만 실행 (시나리오 미구현 — PR4 후속에서 추가)

## 주의사항

- `schema.prisma` 변경 후 반드시 `db:generate` 실행 (또는 `pnpm install` 재실행 — postinstall이 자동 호출)
- `generated/` 디렉토리는 `.gitignore` 포함 → Git에 없음. `postinstall: prisma generate`가 단일 출처
- 앱에서 Prisma를 직접 import하지 않고 반드시 이 패키지를 통해 접근
- 테스트: query helper는 Vitest + 테스트 DB로 검증, 테스트 파일은 대상 코드와 같은 위치
