<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **역할/권한 관리 기능 (Role CRUD + 권한 매트릭스 + 사이드바 필터링)**을 명세서 기반으로 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - Role 모델 존재 여부 → `packages/db/prisma/schema.prisma`
   - User 모델에 `roleId` FK 존재 여부 → `packages/db/prisma/schema.prisma`
   - `RESOURCE_ACTIONS` 상수 존재 여부 → `packages/types/src/domain/permission.types.ts`
   - Seed 스크립트에 Role 생성 로직 존재 여부 → `packages/db/prisma/seed.ts`
   - `hasPermission()` 헬퍼 존재 여부 → `apps/admin/src/entities/auth/lib/checkPermission.ts`
   - `requirePermission()` 헬퍼 존재 여부 → `apps/admin/src/shared/lib/requirePermission.ts`
   - 역할 관리 UI 존재 여부 → `apps/admin/src/features/role-management/ui/RoleList.tsx`
   - 역할 관리 라우트 존재 여부 → `apps/admin/app/settings/roles/page.tsx`
   - 사이드바 권한 필터링 존재 여부 → `apps/admin/src/shared/lib/sidebarPermissions.ts`
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙을 확인한다.

## 전제 조건

- PostgreSQL이 실행 중이고 `DATABASE_URL`이 설정되어 있어야 한다
- Session 모델이 스키마에 존재해야 한다
- 커스텀 세션 인증이 구현되어 있어야 한다 (로그인 API + 세션 헬퍼 + 미들웨어)
- 전제 조건이 충족되지 않으면 먼저 구현해야 할 항목을 안내한다

## Phase별 생성 대상

### Phase A: Role 모델 + Prisma 스키마 + Seed 확장

| 대상                        | 파일                                            |
| --------------------------- | ----------------------------------------------- |
| Role 모델 + User.roleId FK  | `packages/db/prisma/schema.prisma`              |
| AuditEntityType에 ROLE 추가 | `packages/db/prisma/schema.prisma`              |
| RESOURCE_ACTIONS 상수       | `packages/types/src/domain/permission.types.ts` |
| Role 도메인 타입            | `packages/types/src/domain/role.types.ts`       |
| Role DTO                    | `packages/types/src/dto/role.dto.ts`            |
| Seed 스크립트 확장          | `packages/db/prisma/seed.ts`                    |

Role 모델:

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  permissions Json     @default("{}")
  isSystem    Boolean  @default(false)
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]

  @@index([isDefault])
}
```

User 모델 변경:

```prisma
// 기존 role String @default("ADMIN") 제거
// 추가:
roleId    String?
role      Role?    @relation(fields: [roleId], references: [id], onDelete: SetNull)
@@index([roleId])
```

RESOURCE_ACTIONS 상수:

```ts
export const RESOURCE_ACTIONS = {
  dashboard: ['read'] as const,
  pages: ['create', 'read', 'update', 'delete'] as const,
  boards: ['create', 'read', 'update', 'delete'] as const,
  posts: ['create', 'read', 'update', 'delete'] as const,
  navigation: ['create', 'read', 'update', 'delete'] as const,
  home: ['create', 'read', 'update', 'delete'] as const,
  users: ['create', 'read', 'update', 'delete'] as const,
  roles: ['create', 'read', 'update', 'delete'] as const,
  auditLogs: ['read'] as const,
  errorLogs: ['read', 'update'] as const,
  settings: ['read', 'update'] as const,
} as const;
```

Seed 스크립트 확장:

1. 총괄 관리자 Role 생성: `isSystem: true`, `RESOURCE_ACTIONS` 기반 전체 권한
2. 기본 역할(일반 관리자) Role 생성: `isDefault: true`, 기본 권한 세트
3. 최초 관리자 User에 `roleId: 총괄관리자.id` 연결
4. 멱등성: 이미 존재하면 skip

### Phase B: 권한 체크 헬퍼

| 대상                  | 파일                                                         |
| --------------------- | ------------------------------------------------------------ |
| hasPermission         | `apps/admin/src/entities/auth/lib/checkPermission.ts`        |
| requirePermission     | `apps/admin/src/shared/lib/requirePermission.ts`             |
| SessionUser 타입 확장 | `apps/admin/src/entities/auth/model/auth.types.ts`           |
| getSessionUser 수정   | `packages/db/src/sessionHelper.ts` (include: { role: true }) |

hasPermission 핵심 로직:

```ts
export function hasPermission(
  user: SessionUser,
  resource: Resource,
  action: Action,
): boolean {
  if (user.role?.isSystem) return true; // 총괄 관리자 바이패스
  if (!user.role) return false; // 역할 미배정
  return user.role.permissions[resource]?.[action] === true;
}
```

requirePermission 패턴:

```ts
export async function requirePermission(resource: Resource, action: Action) {
  const user = await getCurrentUser();
  if (!user)
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 },
      ),
    };
  if (!hasPermission(user, resource, action))
    return {
      user,
      error: NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 },
      ),
    };
  return { user, error: null };
}
```

### Phase C: 역할 CRUD API Routes

| 대상                | 파일                                                              |
| ------------------- | ----------------------------------------------------------------- |
| 역할 목록/생성      | `apps/admin/app/api/roles/route.ts`                               |
| 역할 상세/수정/삭제 | `apps/admin/app/api/roles/[id]/route.ts`                          |
| 권한 매트릭스 변경  | `apps/admin/app/api/roles/[id]/permissions/route.ts`              |
| 기본 역할 설정      | `apps/admin/app/api/roles/[id]/set-default/route.ts`              |
| 사용자 역할 배정    | `apps/admin/app/api/users/[id]/role/route.ts`                     |
| Zod 스키마          | `apps/admin/src/features/role-management/model/role.schema.ts`    |
| Fetcher             | `apps/admin/src/features/role-management/api/roleFetchers.ts`     |
| Query Keys          | `apps/admin/src/features/role-management/api/roleQueries.ts`      |
| Mutations           | `apps/admin/src/features/role-management/api/useRoleMutations.ts` |

모든 API Route는 `requirePermission('roles', action)` 사용.
모든 데이터 변경에 `logAuditEvent()` 호출 (`entityType: 'ROLE'`).

삭제 핸들러 안전 장치:

1. `isSystem: true` → 400 "시스템 역할은 삭제할 수 없습니다."
2. `isDefault: true` → 400 "기본 역할은 다른 역할을 기본으로 설정한 후 삭제해주세요."
3. 배정 사용자 존재 → 경고 포함 응답 (클라이언트에서 확인 후 재요청)

### Phase D: 권한 매트릭스 UI (마스터-디테일)

| 대상                   | 파일                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| 역할 목록              | `apps/admin/src/features/role-management/ui/RoleList.tsx`             |
| 권한 매트릭스          | `apps/admin/src/features/role-management/ui/PermissionMatrix.tsx`     |
| 역할 폼 다이얼로그     | `apps/admin/src/features/role-management/ui/RoleFormDialog.tsx`       |
| 기본 역할 뱃지         | `apps/admin/src/features/role-management/ui/DefaultRoleBadge.tsx`     |
| 리소스 라벨 레지스트리 | `apps/admin/src/features/role-management/model/permissionRegistry.ts` |
| 페이지                 | `apps/admin/src/pages/settings/RoleManagementPage.tsx`                |
| 라우트                 | `apps/admin/app/settings/roles/page.tsx`                              |

PermissionMatrix:

- `RESOURCE_ACTIONS`에서 리소스/액션 목록 파생
- 각 리소스의 한글 라벨: `permissionRegistry.ts`에서 관리
- 지원하지 않는 액션 셀은 disabled 체크박스
- 총괄 관리자(isSystem): 전체 체크 + disabled

### Phase E: 사이드바 권한 필터링

| 대상                   | 파일                                              |
| ---------------------- | ------------------------------------------------- |
| 메뉴 필터링 유틸       | `apps/admin/src/shared/lib/sidebarPermissions.ts` |
| 사이드바 컴포넌트 수정 | (기존 사이드바 컴포넌트 위치에 따라)              |

`getVisibleMenuItems(user)`:

- 각 메뉴 아이템에 대응하는 리소스 키 매핑
- `hasPermission(user, resource, 'read')`로 필터링
- 대시보드, 프로필은 항상 표시

### Phase F: SettingsNav에 roles 탭 추가

- 기존 SettingsNav에 4번째 탭 "권한 관리" 추가
- `/settings/roles` 링크

## 핵심 패턴 참조

### API Route 핸들러 템플릿

`/create-api` 스킬의 API Route 생성 패턴과 동일:

- `NextRequest`/`NextResponse` 기반 Route Handler
- `requirePermission()` → Zod 검증 → DB 처리 → 감사 로그
- 결과: `NextResponse.json({ success: true, data })` | `NextResponse.json({ success: false, error }, { status })`

### 감사 로그 패턴

```ts
await logAuditEvent({
  action: 'CREATE',
  entityType: 'ROLE',
  entityId: role.id,
  entityTitle: role.name,
  changes: { after: { name, description, permissions } },
  ...auditContext,
});
```

## 참고

- `/create-api` — API Route 생성 패턴
- `/create-feature` — FSD feature 슬라이스 스캐폴딩
- `/create-user-management` — 사용자 관리 (역할 배정 연동)
- `/check-permissions` — 권한 정합성 검증
- `/check-fsd` — FSD 아키텍처 규칙 검증
- `/review-code` — 코드 품질 체크리스트 (권한 체크 포함 여부 확인)
