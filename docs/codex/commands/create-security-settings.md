<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **보안 설정 기능 (동시 로그인 정책)**을 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - 커스텀 인증 설정 존재 여부 → `apps/admin/src/entities/auth/lib/getCurrentUser.ts`
   - DB Session 모델 존재 여부 → `packages/db/prisma/schema.prisma`
   - SiteSettings 모델 존재 여부 → `packages/db/prisma/schema.prisma`
   - 세션 헬퍼 존재 여부 → `packages/db/src/sessionHelper.ts`
   - 보안 설정 UI 존재 여부 → `apps/admin/src/features/site-settings/ui/SecuritySettingsForm.tsx`
   - 보안 설정 라우트 존재 여부 → `apps/admin/app/settings/security/page.tsx`
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙을 확인한다.

## 전제 조건

- 커스텀 세션 인증이 구현되어 있어야 한다 (로그인 API + 세션 헬퍼 + 미들웨어)
- SiteSettings 모델이 이미 존재해야 한다
- 전제 조건이 충족되지 않으면 먼저 구현해야 할 항목을 안내한다

## Phase별 생성 대상

### Phase A: 세션 헬퍼 + 로그인 API 연동 (단계 2 시점, 인증 구현과 함께)

| 대상       | 파일                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| 세션 헬퍼  | `packages/db/src/sessionHelper.ts`                                                     |
| 로그인 API | `apps/admin/app/api/auth/login/route.ts` (로그인 핸들러에 동시 로그인 정책 반영)       |
| 타입       | `packages/types/src/domain/siteSettings.types.ts` (`CONCURRENT_LOGIN_ENABLED` 키 추가) |

로그인 API 흐름:

1. `getSiteSetting('CONCURRENT_LOGIN_ENABLED')` 조회
2. 값이 `"false"`이면 → `deleteUserSessions(user.id)` 호출
3. `createSession(user.id)` + `setSessionCookie(sessionToken)`
4. 감사 로그: LOGIN 이벤트 기록

### Phase B: Admin 보안 설정 UI (단계 3 시점)

| 대상             | 파일                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod 스키마       | `apps/admin/src/features/site-settings/model/security.schema.ts`                                                                             |
| API Route        | `apps/admin/app/api/settings/security/route.ts`                                                                                              |
| Fetcher/Mutation | `apps/admin/src/features/site-settings/api/siteSettingsFetchers.ts`, `apps/admin/src/features/site-settings/api/useSiteSettingsMutations.ts` |
| UI               | `apps/admin/src/features/site-settings/ui/SecuritySettingsForm.tsx`                                                                          |
| 페이지           | `apps/admin/src/pages/settings/SecuritySettingsPage.tsx`                                                                                     |
| 라우트           | `apps/admin/app/settings/security/page.tsx`                                                                                                  |
| 설정 네비게이션  | `apps/admin/src/features/site-settings/ui/SettingsNav.tsx` (domain/security 탭 전환)                                                         |

감사 로그: `SITE_SETTINGS` entityType으로 `logAuditEvent()` 호출 필수.

## 핵심 패턴 참조

### API Route 핸들러 템플릿

`/create-api` 스킬의 API Route 생성 패턴과 동일:

- `NextRequest`/`NextResponse` 기반 Route Handler
- 인증 확인 → Zod 검증 → DB 처리 → 감사 로그
- 결과: `NextResponse.json({ success: true, data })` | `NextResponse.json({ success: false, error }, { status })`

### 세션 헬퍼 패턴

```ts
// packages/db/src/sessionHelper.ts
import { prisma } from './client';

export async function deleteUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { userId },
  });
  return result.count;
}

export async function countUserSessions(userId: string): Promise<number> {
  return prisma.session.count({
    where: { userId, expires: { gt: new Date() } },
  });
}
```

### 로그인 API 동시 로그인 제어 패턴

```ts
// apps/admin/app/api/auth/login/route.ts 내부
const concurrent = await getSiteSetting('CONCURRENT_LOGIN_ENABLED');
if (concurrent === 'false') {
  await deleteUserSessions(user.id);
}
const session = await createSession(user.id);
setSessionCookie(session.sessionToken);
```

### SecuritySettingsForm UI 패턴

- shadcn/ui Switch 컴포넌트 사용 (토글)
- 비활성화 전환 시 확인 다이얼로그 (shadcn/ui AlertDialog)
- 현재 설정값을 Server Component에서 조회하여 props 전달
- 변경은 Client Component에서 useMutation → API Route 호출

## 참고

- `/create-domain-settings` — 같은 SiteSettings 도메인의 도메인 설정 구현 스킬
- `/create-api` — API Route 생성 패턴
- `/create-feature` — FSD feature 슬라이스 스캐폴딩
- `/check-fsd` — FSD 아키텍처 규칙 검증
- `/review-code` — 코드 품질 체크리스트 (감사 로그 포함 여부 확인)
