<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **에러 로그 조회 API, 해결 처리 API, 또는 웹 에러 리포트 API Route**를 생성해줘.

## 동작 순서

1. **요청 파악**: 조회 API(목록/상세), 해결 처리 API, 통계 API, 웹 에러 리포트 API Route 중 어떤 것인지 판별. 불분명하면 질문.
2. **프로젝트 컨벤션 참조**: Root AGENTS.md의 ErrorLog 도메인, admin AGENTS.md의 웹 에러 로그 스펙, db AGENTS.md의 에러 로그 모델 컨벤션 참조
3. **코드 생성**: 아래 패턴에 맞춰 생성
4. **관련 타입 안내**: packages/types에 DTO 추가가 필요하면 안내

## 에러 로그 목록 조회 (API Route)

### 파일 위치

```
app/api/error-logs/route.ts
```

### 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { errorLogFilterSchema } from '@/features/error-log/model/errorLog.schema';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  const { searchParams } = request.nextUrl;
  const query = {
    page: searchParams.get('page')
      ? Number(searchParams.get('page'))
      : undefined,
    pageSize: searchParams.get('pageSize')
      ? Number(searchParams.get('pageSize'))
      : undefined,
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
    level: searchParams.get('level') ?? undefined,
    source: searchParams.get('source')?.split(',') ?? undefined,
    url: searchParams.get('url') ?? undefined,
    isResolved: searchParams.get('isResolved')
      ? searchParams.get('isResolved') === 'true'
      : undefined,
  };

  const parsed = errorLogFilterSchema.safeParse(query);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const {
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
    level,
    source,
    url,
    isResolved,
  } = parsed.data;

  const where = {
    ...(startDate &&
      endDate && {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
    ...(level && { level }),
    ...(source && { source: { in: source } }),
    ...(url && { url: { contains: url } }),
    ...(isResolved !== undefined && { isResolved }),
  };

  try {
    const [items, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.errorLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '에러 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

## 에러 로그 그룹 조회 (API Route) (fingerprint 집계)

### 파일 위치

```
app/api/error-logs/groups/route.ts
```

### 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  try {
    // fingerprint 기준 집계
    const groups = await prisma.errorLog.groupBy({
      by: ['fingerprint', 'message', 'source', 'level', 'url'],
      where: {
        /* 필터 조건 */
      },
      _count: { id: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
    });

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '에러 로그 그룹 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

## 에러 로그 상세 조회 (API Route)

### 파일 위치

```
app/api/error-logs/[id]/route.ts
```

### 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const errorLog = await prisma.errorLog.findUnique({ where: { id } });

    if (!errorLog) {
      return NextResponse.json(
        { success: false, error: '에러 로그를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: errorLog });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '에러 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

## 에러 해결 처리 (API Route)

에러 해결은 관리자 데이터 변경이므로 감사 로그를 포함한다.

### 파일 위치

```
app/api/error-logs/[id]/resolve/route.ts
```

### 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const errorLog = await prisma.errorLog.findUnique({ where: { id } });
    if (!errorLog) {
      return NextResponse.json(
        { success: false, error: '에러 로그를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    if (errorLog.isResolved) {
      return NextResponse.json(
        { success: false, error: '이미 해결된 에러입니다.' },
        { status: 400 },
      );
    }

    const auditContext = await getAuditContext(request, user);

    const updated = await prisma.errorLog.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: auditContext.userId,
      },
    });

    // 감사 로그 기록 (에러 해결은 관리자 액션)
    await logAuditEvent({
      action: 'UPDATE',
      entityType: 'ERROR_LOG',
      entityId: id,
      entityTitle: errorLog.message.substring(0, 100),
      changes: {
        before: { isResolved: false },
        after: { isResolved: true },
      },
      ...auditContext,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '에러 해결 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

## 일괄 해결 처리 (API Route)

### 파일 위치

```
app/api/error-logs/bulk-resolve/route.ts
```

### 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids 배열은 필수입니다.' },
        { status: 400 },
      );
    }

    const auditContext = await getAuditContext(request, user);

    const result = await prisma.errorLog.updateMany({
      where: { id: { in: ids }, isResolved: false },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: auditContext.userId,
      },
    });

    // 일괄 해결 감사 로그
    await logAuditEvent({
      action: 'UPDATE',
      entityType: 'ERROR_LOG',
      entityTitle: `에러 로그 ${result.count}건 일괄 해결`,
      changes: { after: { isResolved: true, count: result.count } },
      ...auditContext,
    });

    return NextResponse.json({ success: true, data: { count: result.count } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '일괄 해결 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

## 오래된 에러 로그 삭제 (API Route)

### 파일 위치

```
app/api/error-logs/cleanup/route.ts
```

### 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 },
    );
  }

  try {
    const { beforeDate } = await request.json();

    if (!beforeDate) {
      return NextResponse.json(
        { success: false, error: 'beforeDate는 필수입니다.' },
        { status: 400 },
      );
    }

    const cutoff = new Date(beforeDate);

    const result = await prisma.errorLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    const auditContext = await getAuditContext(request, user);
    await logAuditEvent({
      action: 'DELETE',
      entityType: 'ERROR_LOG',
      entityTitle: `${cutoff.toISOString().split('T')[0]} 이전 에러 로그 ${result.count}건 삭제`,
      changes: { before: { count: result.count, beforeDate } },
      ...auditContext,
    });

    return NextResponse.json({ success: true, data: { count: result.count } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '에러 로그 삭제 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

## 웹 에러 리포트 API Route (apps/web용)

클라이언트 사이드 에러를 수신하는 엔드포인트. **이 파일은 apps/web에 위치한다** (admin이 아님).

### 파일 위치

```
apps/web/app/api/error-report/route.ts
```

### 패턴

```ts
import { type NextRequest, NextResponse } from 'next/server';

import { logWebError } from '@simple-cms/db';

// 간단한 in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // IP당 분당 최대 요청 수
const RATE_WINDOW = 60_000; // 1분

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const body = await request.json();

    // 최소 필수 필드 검증
    if (!body.message || !body.source || !body.url) {
      return NextResponse.json(
        { error: 'message, source, url은 필수입니다.' },
        { status: 400 },
      );
    }

    // 허용된 source 값만 수용
    const allowedSources = ['CLIENT_REACT', 'CLIENT_JS'];
    if (!allowedSources.includes(body.source)) {
      return NextResponse.json(
        { error: '유효하지 않은 source입니다.' },
        { status: 400 },
      );
    }

    await logWebError({
      level: 'ERROR',
      source: body.source,
      message: body.message,
      stack: body.stack,
      url: body.url,
      userAgent: request.headers.get('user-agent') ?? undefined,
      ipAddress: ip,
      referer: request.headers.get('referer') ?? undefined,
      metadata: body.metadata,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
```

## zod 필터 스키마

### 파일 위치

```
src/features/error-log/model/errorLog.schema.ts
```

- 날짜 범위, 레벨(`ERROR`/`WARN`), 소스 배열, URL 패턴, 해결 상태(boolean), 페이지네이션 파라미터 정의
- 삭제 시 날짜 범위 필수 (`.refine()`으로 검증)

## FSD 슬라이스 구조

```
features/error-log/
├── api/
│   ├── errorLogFetchers.ts          # fetch 함수 (Server/Client 공용)
│   ├── errorLogQueries.ts           # Key Factory + queryOptions
│   └── useErrorLogMutations.ts      # useMutation 훅 ('use client')
├── model/
│   ├── errorLog.schema.ts
│   └── errorLog.constants.ts     # 레벨/소스별 표시 라벨, 색상 매핑
└── ui/
    ├── ErrorLogTable.tsx          # Client Component: 데이터 테이블
    ├── ErrorLogFilters.tsx        # Client Component: 필터 컨트롤
    ├── ErrorLogDetail.tsx         # Client Component: 상세 표시
    ├── ErrorLogActions.tsx        # Client Component: 해결/삭제 액션
    └── ErrorLogDashboardWidget.tsx # 대시보드 요약 위젯

entities/error-log/
├── model/
│   └── errorLog.types.ts         # @simple-cms/types re-export
└── ui/
    ├── ErrorLevelBadge.tsx        # 레벨별 색상 뱃지
    └── ErrorSourceBadge.tsx       # 소스별 뱃지
```

## 참고

- 에러 로그 해결/삭제는 관리자 데이터 변경이므로 감사 로그 포함 (기본 원칙)
- 조회 전용 API Route(목록/상세/통계)에는 감사 로그 불필요
- feature 슬라이스가 없으면 먼저 `/create-feature` 사용
- 관련 DTO는 `packages/types`의 네이밍 규칙 준수 (`ErrorLogListQuery`, `ErrorLogListResponse`, `ErrorLogDetail`, `ResolveErrorLogDto`)
- 웹 에러 리포트 API Route는 apps/web에 위치 (admin이 아님에 주의)
