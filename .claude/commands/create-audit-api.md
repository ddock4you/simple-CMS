현재 대화 컨텍스트를 분석하여 **감사 로그 조회 API 또는 내보내기 API Route**를 생성해줘.

## 동작 순서

1. **요청 파악**: 조회 API(목록 쿼리)인지, 내보내기 API Route(파일 다운로드)인지 판별. 불분명하면 질문.
2. **프로젝트 컨벤션 참조**: Root CLAUDE.md의 감사 로그 섹션, admin CLAUDE.md의 감사 로그 스펙, `apps/admin/app/api/subpage-feedback/export/route.ts`(production-검증 export 패턴) 참조
3. **코드 생성**: 아래 패턴에 맞춰 생성 (FSD 컨벤션: Zod 스키마는 `model/`, fetcher/queryOptions는 `api/`, UI는 `ui/`)
4. **관련 타입 안내**: packages/types에 DTO 추가가 필요하면 안내

## 조회 API Route

감사 로그 목록은 API Route 핸들러로 조회한다.

### API Route 파일 위치

```
app/api/audit-logs/route.ts
```

### API Route 핸들러 패턴

```ts
import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { auditLogFilterSchema } from '@/features/audit-log/model/auditLogSchemas';

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('auditLogs', 'read');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const parsed = auditLogFilterSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    action: searchParams.get('action') ?? undefined,
    entityType: searchParams.get('entityType') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { page, pageSize, from, to, action, entityType, userId } = parsed.data;

  // 한국 운영자가 입력한 날짜 = KST 자정 경계로 해석. UTC 사용은 9시간 어긋남(잠재 버그).
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000+09:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999+09:00`) } : {}),
    };
  }
  if (action && action !== 'ALL') where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;

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
    console.error('[AuditLogs GET] Unexpected error:', error);
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
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.action) params.set('action', query.action);
  if (query.entityType) params.set('entityType', query.entityType);
  if (query.userId) params.set('userId', query.userId);

  return fetchClient(`/api/audit-logs?${params.toString()}`);
}
```

## 내보내기 API Route (Excel)

감사 로그 / 사용자 피드백 / 그 외 도메인의 데이터 export는 모두 동일 패턴으로 구현한다. 1차 검증된 reference: `apps/admin/app/api/subpage-feedback/export/route.ts`.

### 핵심 결정 사항

| 항목 | 결정 |
| ---- | ---- |
| Zod 위치 | `features/{domain}/model/{domain}ExportSchema.ts` (FSD 컨벤션 — `api/` 아님) |
| from/to | optional. 둘 다 없으면 서버에서 KST 기준 최근 30일 자동 적용. 응답 파일명도 resolved 값 사용 |
| 시간대 | **KST 자정 경계** (`T00:00:00+09:00` ~ `T23:59:59.999+09:00`). UTC 사용 금지 |
| 화면 필터 | export 컴포넌트는 별도 DatePicker 미보유 — 페이지의 from/to/rating/q 등을 props로 받아 그대로 query string에 합성 |
| 권한 | API에서 `requirePermission(resource, 'read')` + UI에서 `usePermission(resource, 'read')`로 버튼 게이팅 (CLAUDE.md "API + UI 양쪽" 패턴) |
| 0건 UX | 응답 헤더 `X-Row-Count`로 행 수 노출. 클라이언트가 0이면 info 토스트, 그 외는 success 토스트(`N건`) |
| 스타일 | 헤더 굵게 + freeze pane(`ySplit: 1`) + AutoFilter (분석 친화) |
| 정렬 | `createdAt DESC` (화면 표와 일치) |
| 빈 셀 | nullable 필드는 빈 문자열 (`?? ''`) |
| 파일명 | `{domain}-{from}-{to}.xlsx` (ASCII) |
| 감사 로그 | PII(IP 해시 / UA 등)가 외부로 반출되는 export는 **자기 자신을 audit log에 기록**. `AuditAction` enum에 READ가 없어 `action: 'CREATE'` + entityTitle "(...) 내보내기"로 표현. `changes: { after: { exportRange, filters, totalRows } }` |

### Zod 스키마

```ts
// src/features/{domain}/model/{domain}ExportSchema.ts
import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.');

export const {domain}ExportQuerySchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    // ...도메인 필터 (rating, subpageId, q 등)
  })
  .refine((data) => !(data.from && data.to) || data.from <= data.to, {
    message: '시작일은 종료일보다 이전이어야 합니다.',
    path: ['to'],
  });
```

### API Route

```ts
// app/api/{domain}/export/route.ts
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import { logAuditEvent, prisma } from '@simple-cms/db';
import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { {domain}ExportQuerySchema } from '@/features/{domain}/model/{domain}ExportSchema';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 30;

function kstStartOfDay(s: string): Date {
  return new Date(`${s}T00:00:00.000+09:00`);
}
function kstEndOfDay(s: string): Date {
  return new Date(`${s}T23:59:59.999+09:00`);
}
function toKstDateKey(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
function formatKstDateTime(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
}

export async function GET(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('{resource}', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = {domain}ExportQuerySchema.safeParse({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      // ...도메인 필터
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    // 미입력 시 KST 기준 최근 30일 (응답 파일명/감사 로그도 resolved 값 사용)
    const todayKstKey = toKstDateKey(new Date());
    const fallbackFromKey = toKstDateKey(
      new Date(
        kstStartOfDay(todayKstKey).getTime() -
          (DEFAULT_PERIOD_DAYS - 1) * DAY_MS,
      ),
    );
    const fromKey = parsed.data.from ?? fallbackFromKey;
    const toKey = parsed.data.to ?? todayKstKey;

    const where: Record<string, unknown> = {
      createdAt: { gte: kstStartOfDay(fromKey), lte: kstEndOfDay(toKey) },
    };
    // ...도메인 필터 합성

    const items = await prisma.{model}.findMany({
      where,
      select: { /* ... */ },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('{시트명}');
    sheet.columns = [/* {header, key, width} 배열 */];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    for (const item of items) {
      sheet.addRow({
        // ...; 일시는 formatKstDateTime(item.createdAt), nullable은 ?? ''
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    // PII 외부 반출 추적 — AuditAction에 READ 없어 'CREATE' (산출물 생성 의미)
    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: '{ENTITY_TYPE}',
      entityTitle: '{도메인 한글명} 내보내기',
      changes: {
        after: {
          exportRange: { from: fromKey, to: toKey },
          filters: { /* ... */ },
          totalRows: items.length,
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="{domain}-${fromKey}-${toKey}.xlsx"`,
        'X-Row-Count': String(items.length),
      },
    });
  } catch (err) {
    console.error('[{Domain} Export] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '{도메인} 내보내기에 실패했습니다.' },
      { status: 500 },
    );
  }
}
```

### Export UI 컴포넌트 (FeedbackExport 패턴)

```tsx
// src/features/{domain}/ui/{Domain}Export.tsx
'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { Button } from '@/shared/ui/shadcn/button';

interface Props {
  from?: string | null;
  to?: string | null;
  // ...도메인 필터를 페이지에서 props로 전달
}

export function {Domain}Export({ from, to, /* ... */ }: Props) {
  const canExport = usePermission('{resource}', 'read');
  const [isExporting, setIsExporting] = useState(false);
  if (!canExport) return null; // 자체 DatePicker 없음 — 페이지 필터 그대로 사용

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      // ...도메인 필터

      const qs = params.toString();
      const response = await fetch(
        qs ? `/api/{domain}/export?${qs}` : '/api/{domain}/export',
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '내보내기에 실패했습니다.');
      }

      const filename = parseFilenameFromHeader(
        response.headers.get('Content-Disposition'),
      );
      const rowCount = Number(response.headers.get('X-Row-Count') ?? '0');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? '{domain}.xlsx';
      a.click();
      URL.revokeObjectURL(url);

      if (rowCount === 0) {
        toast.info('선택한 기간에 데이터가 없습니다. 빈 파일이 다운로드되었습니다.');
      } else {
        toast.success(`{도메인 한글명} ${rowCount}건이 다운로드되었습니다.`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '내보내기에 실패했습니다.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
      <Download className="size-4" />
      {isExporting ? '내보내기 중...' : 'Excel 다운로드'}
    </Button>
  );
}

function parseFilenameFromHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
}
```

### 페이지 통합

```tsx
// pages/{domain}/ui/{Domain}Page.tsx (Server Component)
<div className="flex flex-wrap items-start justify-between gap-3">
  <div>{/* 제목/설명 */}</div>
  <{Domain}Export
    from={filters.from ?? null}
    to={filters.to ?? null}
    /* ...도메인 필터 */
  />
</div>
```

### 흔한 함정

- **DatePicker 출력은 `toISOString().slice(0,10)` 금지** — KST에서 9시간 어긋남(자정에 picked 날짜의 UTC 변환이 전날). `getFullYear/getMonth/getDate`로 로컬 컴포넌트 사용
- **period 계산에 `+1` 금지** — `T23:59:59.999` 종료라 `Math.round((until - since) / DAY_MS)`만으로 정확한 inclusive day count. `+1` 추가 시 빈 막대/잘못된 avgPerDay 발생
- **Excel export의 자체 DatePicker 추가 금지** — 화면 필터와 우선순위 충돌. 페이지의 from/to를 props로 받아 그대로 사용
- **CSV 형식**은 1차 우선순위 아님 — Excel 형식만 구현하고, 분석가는 Excel을 CSV로 export 가능

## 필터 zod 스키마

```
src/features/audit-log/model/auditLogSchemas.ts
```

- 날짜 범위(from/to optional, KST), 액션 타입, 엔티티 타입, 사용자 ID, 페이지네이션 파라미터 정의
- 내보내기 zod는 별도 파일 (`{domain}ExportSchema.ts`) — 페이지네이션 없고 export 전용 필드 구성

## 참고

- 조회 전용 모델: AuditLog에 대한 create/update/delete API Route는 생성하지 않음
- 내보내기 API Route에는 반드시 `requirePermission()` + `usePermission()` 양쪽 적용
- feature 슬라이스가 없으면 먼저 `/create-feature` 사용
- 관련 DTO는 `packages/types`의 네이밍 규칙 준수 (`{Domain}ListQuery`, `{Domain}ListResponse`, `{Domain}ExportQuery`)
- production-검증 reference 파일:
  - API Route: `apps/admin/app/api/subpage-feedback/export/route.ts`
  - UI: `apps/admin/src/features/subpage-feedback/ui/FeedbackExport.tsx`
  - Zod: `apps/admin/src/features/subpage-feedback/model/feedbackExportSchema.ts`
