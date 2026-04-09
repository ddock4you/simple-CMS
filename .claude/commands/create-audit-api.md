현재 대화 컨텍스트를 분석하여 **감사 로그 조회 API 또는 내보내기 API Route**를 생성해줘.

## 동작 순서

1. **요청 파악**: 조회 API(목록 쿼리)인지, 내보내기 API Route(파일 다운로드)인지 판별. 불분명하면 질문.
2. **프로젝트 컨벤션 참조**: Root CLAUDE.md의 감사 로그 섹션, admin CLAUDE.md의 감사 로그 스펙 참조
3. **코드 생성**: 아래 패턴에 맞춰 생성
4. **관련 타입 안내**: packages/types에 DTO 추가가 필요하면 안내

## 조회 API Route

감사 로그 목록은 API Route 핸들러로 조회한다.

### API Route 파일 위치

```
app/api/audit-logs/route.ts
```

### API Route 핸들러 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { auditLogFilterSchema } from '@/features/audit-log/model/auditLog.schema';

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
    action: searchParams.get('action')?.split(',') ?? undefined,
    entityType: searchParams.get('entityType')?.split(',') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
  };

  const parsed = auditLogFilterSchema.safeParse(query);
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
    action,
    entityType,
    userId,
  } = parsed.data;

  const where = {
    ...(startDate &&
      endDate && {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
    ...(action && { action: { in: action } }),
    ...(entityType && { entityType: { in: entityType } }),
    ...(userId && { userId }),
  };

  try {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
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
      { success: false, error: '감사 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

### Fetcher 파일 위치

```
src/features/audit-log/api/auditLogFetchers.ts
```

### Fetcher 패턴

```ts
import type {
  AuditLogListQuery,
  AuditLogListResponse,
} from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';

export async function getAuditLogList(
  query: AuditLogListQuery,
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.action) params.set('action', query.action.join(','));
  if (query.entityType) params.set('entityType', query.entityType.join(','));
  if (query.userId) params.set('userId', query.userId);

  return fetchClient(`/api/audit-logs?${params.toString()}`);
}
```

## 내보내기 API Route

감사 로그 내보내기는 API Route로 구현한다 (파일 다운로드가 필요하므로).

### 파일 위치

```
app/api/audit-logs/export/route.ts
```

### 패턴

```ts
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';

export async function GET(request: NextRequest) {
  // 1. 인증 확인
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 2. 쿼리 파라미터 파싱
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format'); // 'csv' | 'xlsx'
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!format || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'format, startDate, endDate는 필수입니다.' },
      { status: 400 },
    );
  }

  // 3. 선택 필터
  const action = searchParams.get('action')?.split(',') || undefined;
  const entityType = searchParams.get('entityType')?.split(',') || undefined;
  const userId = searchParams.get('userId') || undefined;

  // 4. DB 조회
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      ...(action && { action: { in: action } }),
      ...(entityType && { entityType: { in: entityType } }),
      ...(userId && { userId }),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // 5. 형식별 응답 생성
  if (format === 'csv') {
    const csv = generateCsv(logs); // 네이티브 구현
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${startDate}-${endDate}.csv"`,
      },
    });
  }

  if (format === 'xlsx') {
    const buffer = await generateXlsx(logs); // exceljs 사용
    return new Response(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="audit-logs-${startDate}-${endDate}.xlsx"`,
      },
    });
  }

  return NextResponse.json(
    { error: '지원하지 않는 형식입니다.' },
    { status: 400 },
  );
}
```

### CSV 생성 패턴 (네이티브)

```ts
function generateCsv(logs: AuditLogWithUser[]): string {
  const headers = [
    '날짜',
    '사용자',
    '액션',
    '엔티티 타입',
    '엔티티 제목',
    'IP',
  ];
  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.user.name ?? log.user.email,
    log.action,
    log.entityType ?? '-',
    log.entityTitle ?? '-',
    log.ipAddress ?? '-',
  ]);

  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}
```

### Excel 생성 패턴 (exceljs)

```ts
import ExcelJS from 'exceljs';

async function generateXlsx(logs: AuditLogWithUser[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('감사 로그');

  sheet.columns = [
    { header: '날짜', key: 'date', width: 22 },
    { header: '사용자', key: 'user', width: 20 },
    { header: '액션', key: 'action', width: 12 },
    { header: '엔티티 타입', key: 'entityType', width: 18 },
    { header: '엔티티 제목', key: 'entityTitle', width: 30 },
    { header: 'IP', key: 'ip', width: 16 },
  ];

  logs.forEach((log) => {
    sheet.addRow({
      date: log.createdAt.toISOString(),
      user: log.user.name ?? log.user.email,
      action: log.action,
      entityType: log.entityType ?? '-',
      entityTitle: log.entityTitle ?? '-',
      ip: log.ipAddress ?? '-',
    });
  });

  return (await workbook.xlsx.writeBuffer()) as Buffer;
}
```

## 필터 zod 스키마

```
src/features/audit-log/model/auditLog.schema.ts
```

- 날짜 범위, 액션 타입 배열, 엔티티 타입 배열, 사용자 ID, 페이지네이션 파라미터 정의
- 내보내기 시 날짜 범위는 필수 (`.refine()`으로 startDate ≤ endDate 검증)

## 참고

- 조회 전용 모델: AuditLog에 대한 create/update/delete API Route는 생성하지 않음
- 내보내기 API Route에는 반드시 인증 확인 포함
- feature 슬라이스가 없으면 먼저 `/create-feature` 사용
- 관련 DTO는 `packages/types`의 네이밍 규칙 준수 (`AuditLogListQuery`, `AuditLogListResponse`, `AuditLogExportQuery`)
