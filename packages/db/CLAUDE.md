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
│   ├── schema.prisma       # 스키마 정의
│   ├── migrations/         # 마이그레이션 히스토리
│   └── seed.ts             # 시드 데이터 (최초 관리자 계정 생성)
├── src/
│   ├── index.ts            # 패키지 진입점 (앱에서 @simple-cms/db로 import)
│   ├── client.ts           # PrismaClient 싱글턴
│   ├── auditLog.ts         # 감사 로그 기록 헬퍼 (logAuditEvent)
│   ├── sessionHelper.ts    # 세션 CRUD 헬퍼 (createSession, validateSession 등)
│   └── repositories/       # 도메인별 query helper (필요 시)
└── package.json
```

## Prisma 컨벤션

- 모델명: `PascalCase` 단수형 (`User`, `Page`, `Board`, `Post`)
- 필드명: `camelCase` (`displayOrder`, `publishedAt`, `boardId`)
- 관계 필드: 참조 대상 모델명 소문자 (`author`, `board`, `page`)
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

## PGroonga 관련

- PGroonga raw query는 `src/` 내 별도 파일로 분리
- Prisma의 `$queryRaw` / `$executeRaw` 사용
- 검색 인덱싱 관련 마이그레이션은 Prisma migration 외 SQL 파일로 관리 가능

## 명령어

```bash
pnpm db:generate    # Prisma Client 생성
pnpm db:push        # 스키마를 DB에 직접 반영 (개발용)
pnpm db:migrate     # 마이그레이션 생성 및 적용
pnpm db:studio      # Prisma Studio 실행
```

## Role 모델 컨벤션

- `name`: 역할명, `@unique`, 1~50자
- `description`: 설명, optional
- `permissions`: `Json` 타입, 메뉴별 CRUD 권한 매트릭스
  - 구조: `{ [resource]: { [action]: boolean } }`
  - 예: `{ "pages": { "create": true, "read": true, "update": true, "delete": false } }`
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

## 세션 모델

커스텀 세션 기반 인증에서 사용하는 모델:

| 모델      | 역할                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| `Session` | DB 세션 레코드 (`id`, `sessionToken` crypto.randomUUID @unique, `userId`, `expires`, `createdAt`) |

- Account 모델 없음 (OAuth 불필요)
- VerificationToken 모델 없음 (이메일 인증 불필요)
- 세션 레코드는 `packages/db/src/sessionHelper.ts`의 커스텀 코드가 관리
- 동시 로그인 제어를 위한 세션 삭제/생성/조회 헬퍼 제공

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

## 주의사항

- `schema.prisma` 변경 후 반드시 `db:generate` 실행
- `generated/` 디렉토리는 `.gitignore` 포함
- 앱에서 Prisma를 직접 import하지 않고 반드시 이 패키지를 통해 접근
- 테스트: query helper는 Vitest + 테스트 DB로 검증, 테스트 파일은 대상 코드와 같은 위치
