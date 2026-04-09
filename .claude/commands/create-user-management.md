현재 대화 컨텍스트를 분석하여 **사용자 관리 기능 (회원가입, 유저 관리, 프로필 변경)**을 명세서 기반으로 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - User 모델에 `username`, `password`, `status` 필드 존재 여부 → `packages/db/prisma/schema.prisma`
   - `UserStatus` enum 존재 여부 → `packages/db/prisma/schema.prisma`
   - bcryptjs 의존성 존재 여부 → `packages/db/package.json`
   - Seed 스크립트 존재 여부 → `packages/db/prisma/seed.ts`
   - 커스텀 인증 설정 존재 여부 → `apps/admin/src/entities/auth/lib/getCurrentUser.ts`
   - 회원가입 UI 존재 여부 → `apps/admin/src/features/auth/ui/RegisterForm.tsx`
   - 회원가입 라우트 존재 여부 → `apps/admin/app/register/page.tsx`
   - 사용자 관리 UI 존재 여부 → `apps/admin/src/features/user-management/ui/UserListTable.tsx`
   - 사용자 관리 라우트 존재 여부 → `apps/admin/app/users/page.tsx`
   - 프로필 UI 존재 여부 → `apps/admin/src/features/auth/ui/ProfileForm.tsx`
   - 프로필 라우트 존재 여부 → `apps/admin/app/profile/page.tsx`
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙을 확인한다.

## 전제 조건

- PostgreSQL이 실행 중이고 `DATABASE_URL`이 설정되어 있어야 한다
- Session 모델이 스키마에 존재해야 한다
- 전제 조건이 충족되지 않으면 먼저 구현해야 할 항목을 안내한다

## Phase별 생성 대상

### Phase A: User 모델 확장 + 비밀번호 해싱 (단계 2 시점, DB 스키마와 함께)

| 대상                             | 파일                                      |
| -------------------------------- | ----------------------------------------- |
| UserStatus enum + User 모델 확장 | `packages/db/prisma/schema.prisma`        |
| bcryptjs 의존성                  | `packages/db/package.json`                |
| Seed 스크립트                    | `packages/db/prisma/seed.ts`              |
| User 도메인 타입                 | `packages/types/src/domain/user.types.ts` |
| User DTO                         | `packages/types/src/dto/user.dto.ts`      |

User 모델 추가 필드:

```prisma
enum UserStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

// User 모델에 추가할 필드:
// username    String     @unique
// password    String
// status      UserStatus @default(PENDING)
// roleId      String?
// role        Role?      @relation(fields: [roleId], references: [id], onDelete: SetNull)
// email       String?    @unique  // 회원가입 시 수집
// @@index([status])
// @@index([username])
// @@index([roleId])
```

Seed 스크립트 핵심 로직:

1. `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_PASSWORD` 환경변수 읽기
2. bcryptjs로 비밀번호 해싱 (cost factor 10)
3. `status: ACTIVE`��� User 생성
4. 이미 존재���면 skip (멱등성)

### Phase B: 커스텀 세션 인증 + 인증 유틸 (단계 2 시점, 인증 구현과 함께)

| 대상         | 파일                                                 |
| ------------ | ---------------------------------------------------- |
| 세션 헬퍼    | `packages/db/src/sessionHelper.ts`                   |
| 인증 유틸    | `apps/admin/src/entities/auth/lib/getCurrentUser.ts` |
| 인증 타입    | `apps/admin/src/entities/auth/model/auth.types.ts`   |
| 쿠키 유틸    | `apps/admin/src/shared/lib/cookies.ts`               |
| 로그인 API   | `apps/admin/app/api/auth/login/route.ts`             |
| 로그아웃 API | `apps/admin/app/api/auth/logout/route.ts`            |
| Middleware   | `apps/admin/src/middleware.ts`                       |

로그인 API 핸들러 흐름 (POST /api/auth/login):

1. username, password Zod 검증
2. `prisma.user.findUnique({ where: { username } })`
3. `status === 'PENDING'` → `{ success: false, error: 'PENDING_APPROVAL' }`
4. `status === 'SUSPENDED'` → `{ success: false, error: 'ACCOUNT_SUSPENDED' }`
5. `bcryptjs.compare(password, user.password)` → 실패 시 에러
6. `CONCURRENT_LOGIN_ENABLED === "false"` → `deleteUserSessions(user.id)`
7. `createSession(user.id)` → `setSessionCookie(sessionToken)`
8. `logAuditEvent({ action: 'LOGIN', userId: user.id })`
9. 반환: `{ success: true, data: { id, username, name, role } }`

Middleware: `/login`, `/register`, `/api/auth/login`, `/api/auth/register`를 public 경로로 설정

### Phase C: 회원가입 (단계 2~3 시점)

| 대상             | 파일                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Zod 스키마       | `apps/admin/src/features/auth/model/register.schema.ts`                                                    |
| API Route        | `apps/admin/app/api/auth/register/route.ts`                                                                |
| Fetcher/Mutation | `apps/admin/src/features/auth/api/authFetchers.ts`, `apps/admin/src/features/auth/api/useAuthMutations.ts` |
| UI               | `apps/admin/src/features/auth/ui/RegisterForm.tsx`                                                         |
| 페이지           | `apps/admin/src/pages/auth/RegisterPage.tsx`                                                               |
| 라우트           | `apps/admin/app/register/page.tsx`                                                                         |

Zod 스키마:

- `username`: 4~20자, `/^[a-zA-Z0-9_]+$/`, 중복 체크
- `email`: 유효한 이메일 형식, optional
- `password`: 8자 이상
- `passwordConfirm`: password와 일치 (`.refine()`)
- `name`: 2~50자

Register API Route 핸들러 (POST /api/auth/register):

1. Zod 검증
2. username 중복 체크
3. `bcryptjs.hash(password, 10)`
4. `prisma.user.create({ data: { username, password: hashedPassword, name, status: 'PENDING' } })`
5. 감사 로그: `{ action: 'CREATE', entityType: 'USER', entityId: user.id, entityTitle: username, changes: { after: { username, name, status: 'PENDING' } }, userId: null }`
6. 비밀번호 해시는 changes에 절대 포함하지 않음
7. 반환: `NextResponse.json({ success: true })`

로그인 페이지: "회원가입" 링크/버튼 추가 → `/register`로 이동
PENDING 상태 로그인 시: 로그인 API가 `{ error: "PENDING_APPROVAL" }` 반환 → 클라이언트에서 "승인 대기 중" 메시지 표시

### Phase D: 사용자 관리 (단계 3 시점)

| 대상             | 파일                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Zod 스키마       | `apps/admin/src/features/user-management/model/userManagement.schema.ts`                                                         |
| API Routes       | `apps/admin/app/api/users/[id]/approve/route.ts`                                                                                 |
|                  | `apps/admin/app/api/users/[id]/reject/route.ts`                                                                                  |
|                  | `apps/admin/app/api/users/[id]/suspend/route.ts`                                                                                 |
|                  | `apps/admin/app/api/users/[id]/reactivate/route.ts`                                                                              |
| Fetcher/Mutation | `apps/admin/src/features/user-management/api/userFetchers.ts`, `apps/admin/src/features/user-management/api/useUserMutations.ts` |
| UI               | `apps/admin/src/features/user-management/ui/UserListTable.tsx`                                                                   |
|                  | `apps/admin/src/features/user-management/ui/UserStatusBadge.tsx`                                                                 |
|                  | `apps/admin/src/features/user-management/ui/ApproveUserDialog.tsx`                                                               |
|                  | `apps/admin/src/features/user-management/ui/RejectUserDialog.tsx`                                                                |
|                  | `apps/admin/src/features/user-management/ui/SuspendUserDialog.tsx`                                                               |
| 페이지           | `apps/admin/src/pages/users/UserListPage.tsx`                                                                                    |
| 라우트           | `apps/admin/app/users/page.tsx`                                                                                                  |

목록: TanStack Table, 서버 사이드 페이지네이션 (기본 20건)
컬럼: 아이디, 이름, 역할(뱃지, PENDING은 "미배정"), 상태(뱃지), 가입일, 액션
필터: ��태별 (전체/대기/활성/정지)

API Route 핸들러 공통 패턴:

1. `requirePermission('users', action)` — 인증 + 인가 확인
2. 대상 사용자 조회 + 상태 검증
3. 안전 장치 체크 (자기 자신 정지 불가, 마지막 ACTIVE 관리자 정지 불가, 마지막 총괄 관리자 역할 변경 불가)
4. 상태 변경
5. 감사 로그: `{ action, entityType: 'USER', entityId, entityTitle: username, changes: { before: { status: '...' }, after: { status: '...' } } }`

approveUser 추가 동작: 기본 역할(`isDefault: true`) 자동 배정 → `roleId` 설정
suspendUser 추가 동작: `deleteUserSessions(userId)` 호출로 즉시 세션 삭제
rejectUser: PENDING 유저 hard delete + 감사 로그 (action: 'DELETE')

역할 변경 API Route (`PATCH /api/users/[id]/role`):

1. `requirePermission('users', 'update')`
2. 대상 사용자 조회
3. 총괄 관리자 역할 배정은 요청자가 총괄 관리자인지 확인
4. 마지막 총괄 관리자의 역할 변경 시 거부
5. `prisma.user.update({ where: { id }, data: { roleId } })`
6. 감사 로그: `{ action: 'UPDATE', entityType: 'USER', changes: { before: { role: oldRole }, after: { role: newRole } } }`

### Phase E: 프로필 변경 (단계 3 시점)

| 대상             | 파일                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Zod 스키마       | `apps/admin/src/features/auth/model/profile.schema.ts`                                                     |
| API Routes       | `apps/admin/app/api/profile/route.ts`                                                                      |
|                  | `apps/admin/app/api/profile/change-password/route.ts`                                                      |
| Fetcher/Mutation | `apps/admin/src/features/auth/api/authFetchers.ts`, `apps/admin/src/features/auth/api/useAuthMutations.ts` |
| UI               | `apps/admin/src/features/auth/ui/ProfileForm.tsx`                                                          |
| 페이지           | `apps/admin/src/pages/profile/ProfilePage.tsx`                                                             |
| 라우트           | `apps/admin/app/profile/page.tsx`                                                                          |

ProfileForm: 이름 수정 (아이디는 읽기 전용 표시)
ChangePassword: 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인

changePassword API Route 핸들러 (PUT /api/profile/change-password):

1. 인증 확인 + 세션에서 현재 사용자 ID 가져오기
2. `prisma.user.findUnique({ where: { id }, select: { password: true } })`
3. `bcryptjs.compare(currentPassword, user.password)` → 실패 시 에러
4. `bcryptjs.hash(newPassword, 10)`
5. `prisma.user.update({ where: { id }, data: { password: hashedPassword } })`
6. 감사 로그: `{ action: 'UPDATE', entityType: 'USER', entityId: id, entityTitle: username, changes: { after: { passwordChanged: true } } }`
7. 비밀번호 해시값은 changes에 절대 포함하지 않음

### Phase F: 사이드바 메뉴 + 헤더 프로필 링크 추가

- 사이드���에 "사용자 관리" (`/users`) 메뉴 아이템 추가
- 헤더 사용자 메뉴 또는 사이드바 하단에 프로필 링크 (`/profile`) 추가

## 핵심 패턴 참조

### API Route 핸들러 템플릿

`/create-api` 스킬의 API Route 생성 패턴과 동일:

- `NextRequest`/`NextResponse` 기반 Route Handler
- 인증 확인 → Zod 검증 → DB 처리 → 감사 로그
- 결과: `NextResponse.json({ success: true, data })` | `NextResponse.json({ success: false, error }, { status })`

### 비밀번호 해싱 패턴

```ts
import { hash, compare } from 'bcryptjs';

// 해싱 (가입, 비밀번호 변경)
const hashedPassword = await hash(plainPassword, 10);

// 검증 (로그인, 비밀번호 변경 시 현재 비밀번호 확인)
const isValid = await compare(plainPassword, hashedPassword);
```

### UserStatusBadge 패턴

```tsx
const statusConfig = {
  PENDING: { label: '대기', variant: 'warning' },
  ACTIVE: { label: '활성', variant: 'success' },
  SUSPENDED: { label: '정지', variant: 'destructive' },
} as const;
```

## 감사 로그 이벤트 목록

| 이벤트        | action   | entityType | userId          |
| ------------- | -------- | ---------- | --------------- |
| 회��가입      | `CREATE` | `USER`     | `null` (비인증) |
| 가입 승인     | `UPDATE` | `USER`     | 승인자 ID       |
| 가입 거절     | `DELETE` | `USER`     | 거절자 ID       |
| 사용자 정지   | `UPDATE` | `USER`     | 관리자 ID       |
| 사용자 해제   | `UPDATE` | `USER`     | 관리자 ID       |
| 이름 변경     | `UPDATE` | `USER`     | 본인 ID         |
| 비밀번호 변경 | `UPDATE` | `USER`     | 본인 ID         |
| 역할 변경     | `UPDATE` | `USER`     | 관리자 ID       |

## 참고

- `/create-security-settings` — 동일 SiteSettings 도메인의 보안 설정 구현 스킬
- `/create-api` — API Route 생성 패턴
- `/create-feature` — FSD feature 슬라이스 스캐폴딩
- `/check-fsd` — FSD 아키텍처 규칙 검증
- `/review-code` — 코드 품질 체크리스트 (감사 로그 포함 여부 확인)
