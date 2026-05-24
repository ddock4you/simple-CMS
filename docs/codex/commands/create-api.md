<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **API Route (Route Handler)**를 일관된 패턴으로 생성해줘.

## 동작 순서

1. **도메인 + 액션 감지**: 대화 컨텍스트에서 도메인명과 CRUD 액션 파악 (예: "페이지 생성 API" → page, create). 불분명하면 질문.
2. **앱 확인**: 기본적으로 admin 앱. web은 `@simple-cms/db` 직접 접근이므로 API Route 불필요 (에러 리포트 등 예외 시만 web에 API Route 생성).
3. **프로젝트 컨벤션 참조**: Root AGENTS.md의 데이터 페칭 패턴, admin AGENTS.md의 데이터 처리 패턴 참조
4. **코드 생성**: 아래 패턴에 맞춰 API Route + FSD fetcher/mutation 생성
5. **관련 타입 안내**: packages/types에 DTO 추가가 필요하면 안내

## API Route 패턴 (기본)

admin의 데이터 변경은 **API Route(Route Handler)**를 기본으로 사용한다. Server Actions는 사용하지 않는다.

### API Route 파일 위치

```
app/api/{domain}/route.ts              # 목록(GET), 생성(POST)
app/api/{domain}/[id]/route.ts         # 상세(GET), 수정(PATCH), 삭제(DELETE)
app/api/{domain}/[id]/{action}/route.ts # 특수 액션 (approve, suspend 등)
```

### FSD features 파일 위치

```
src/features/{domain}/api/{domain}Fetchers.ts       # fetch 함수 (API Route 호출)
src/features/{domain}/api/{domain}Queries.ts         # Key Factory + queryOptions
src/features/{domain}/api/use{Domain}Mutations.ts    # useMutation 훅 ('use client')
```

### API Route 템플릿 (생성 예시)

```ts
// app/api/{domain}/route.ts
import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { Create{Domain}Dto } from '@simple-cms/types';

import { getAuditContext } from '@/shared/lib/auditHelpers';
import { requirePermission } from '@/entities/auth/lib/requirePermission';

import { {domain}Schema } from '@/features/{domain}/model/{domain}.schema';

export async function POST(request: Request) {
  // 1. 인증 + 인가 확인
  const { user, error } = await requirePermission('{resource}', 'create');
  if (error) return error;

  // 2. 입력 검증
  const body = await request.json();
  const parsed = {domain}Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    // 3. DB 처리
    const result = await prisma.{domain}.create({
      data: parsed.data,
    });

    // 4. 캐시 무효화
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/{domains}');

    // 5. 감사 로그 기록
    const auditContext = await getAuditContext(request);
    await logAuditEvent({
      action: 'CREATE',
      entityType: '{ENTITY_TYPE}',
      entityId: result.id,
      entityTitle: result.title ?? result.name ?? undefined,
      changes: { after: parsed.data },
      ...auditContext,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

### FSD Fetcher 템플릿

```ts
// src/features/{domain}/api/{domain}Fetchers.ts
import type { Create{Domain}Dto, {Domain}ListResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';

export async function create{Domain}(data: Create{Domain}Dto) {
  return fetchClient<{ success: true; data: {Domain} }>('/api/{domain}', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function get{Domain}List(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchClient<{Domain}ListResponse>(`/api/{domain}${query}`);
}
```

### FSD Mutation Hook 템플릿

```ts
// src/features/{domain}/api/use{Domain}Mutations.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { create{Domain} } from './{domain}Fetchers';
import { {domain}Keys } from './{domain}Queries';

export function useCreate{Domain}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: create{Domain},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {domain}Keys.lists() });
    },
  });
}
```

### FSD Query Key Factory 템플릿

```ts
// src/features/{domain}/api/{domain}Queries.ts
import { queryOptions } from '@tanstack/react-query';

import { get{Domain}List, get{Domain} } from './{domain}Fetchers';

export const {domain}Keys = {
  all: ['{domain}'] as const,
  lists: () => [...{domain}Keys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...{domain}Keys.lists(), filters] as const,
  details: () => [...{domain}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{domain}Keys.details(), id] as const,
};

export function {domain}ListOptions(filters: Record<string, string>) {
  return queryOptions({
    queryKey: {domain}Keys.list(filters),
    queryFn: () => get{Domain}List(filters),
  });
}
```

### 응답 형태

모든 API Route는 일관된 응답 형태를 반환:

```ts
// 성공
NextResponse.json({ success: true, data: result }, { status: 200 });

// 에러
NextResponse.json({ success: false, error: '메시지' }, { status: 400 });
```

## CRUD별 네이밍

| 액션        | HTTP Method | Route                   | Fetcher 함수명    |
| ----------- | ----------- | ----------------------- | ----------------- |
| 생성        | POST        | `/api/{domain}`         | `create{Domain}`  |
| 조회 (목록) | GET         | `/api/{domain}`         | `get{Domain}List` |
| 조회 (단일) | GET         | `/api/{domain}/[id]`    | `get{Domain}`     |
| 수정        | PATCH       | `/api/{domain}/[id]`    | `update{Domain}`  |
| 삭제        | DELETE      | `/api/{domain}/[id]`    | `delete{Domain}`  |
| 순서 변경   | PATCH       | `/api/{domain}/reorder` | `reorder{Domain}` |

## zod 스키마 위치

```
src/features/{domain}/model/{domain}.schema.ts
```

- 생성/수정 각각의 스키마 정의
- 클라이언트(폼 validation)와 서버(API Route) 양쪽에서 재사용

## 감사 로그 연동

- **기본 원칙**: 모든 데이터 변경 API Route 핸들러에는 감사 로그를 포함한다 (opt-out 방식)
- CREATE: 생성 성공 후 `action: 'CREATE'`, `changes: { after: parsed.data }`
- UPDATE: 기존 엔티티를 먼저 조회 → 수정 후 `action: 'UPDATE'`, `changes: { before: { 변경필드 }, after: { 변경필드 } }` (메타데이터만, 본문 제외)
- DELETE: 삭제 전 엔티티 조회 → 삭제 후 `action: 'DELETE'`, `changes: { before: { title, slug, status } }`
- PUBLISH/UNPUBLISH: `action: 'PUBLISH'` 또는 `'UNPUBLISH'`, `changes: { before: { status }, after: { status } }`
- REORDER: `action: 'REORDER'`, 변경된 순서 정보
- `entityType`은 Prisma enum `AuditEntityType` 값 사용 (예: `'PAGE'`, `'BOARD'`, `'POST'`)
- `entityTitle`은 대상의 title 또는 name 필드 스냅샷
- 감사 로그 호출은 `try` 블록 내 DB 처리 성공 후에 위치하며, 헬퍼 내부에서 자체 에러 처리
- 로깅이 불필요한 경우 의도적으로 생략하고 `// 감사 로그 생략: {사유}` 주석 명시
- **읽기 전용 / 토큰 발급 API 예시** — preview 토큰 발급(`POST /api/preview/token`)처럼 데이터 변경이 없거나 단기 일회성 토큰만 생성하는 API는 감사 로그를 생략하고 `// 감사 로그 생략 — read-only preview token issuance` 주석 명시

## UI 권한 체크 연동 (필수)

API Route 생성 후 반드시 UI 측 권한 체크도 함께 적용:
- **Client Component**: `usePermission(resource, action)` 훅으로 생성/편집/삭제 버튼 조건부 렌더링
- **Server Component**: `hasPermission(user, resource, action)`으로 버튼 조건부 렌더링
- **상세 페이지**: 뷰(`/[id]`)와 편집(`/[id]/edit`) 분리 — update 권한 시에만 편집 버튼 표시
- **목록 페이지**: create 권한 없으면 "새로 만들기" 버튼 숨김

## 참고

- feature 슬라이스가 없으면 먼저 `/create-feature` 사용
- 생성 후 `/check-fsd`로 아키텍처 규칙 검증 가능
- 생성 후 `/check-permissions`로 권한 정합성 검증 가능
- 관련 DTO는 `packages/types`의 네이밍 규칙(Create{Domain}Dto, Update{Domain}Dto) 준수
- 새 도메인 추가 시 `packages/types`의 `RESOURCE_ACTIONS`에 리소스 등록 필요
