/**
 * 시연 모드 PR6: snapshot export 엔드포인트.
 *
 * GET /_cms/admin/api/demo/snapshot/export
 *   - requirePermission('demo-snapshot', 'create')
 *   - 운영 (__PROD__) 또는 dev 환경에서 호출 — sourceSessionId는 PROD_SENTINEL fallback
 *   - JSON download (Content-Disposition: attachment)
 *   - sharp 1600px 리사이즈 + base64 + walker
 *
 * 감사 로그: entityType=SITE_SETTINGS (enum 재사용), entityId=DEMO_SNAPSHOT_EXPORT,
 *   action=CREATE, entityTitle="시연 스냅샷 내보내기 (N row, M MB)".
 */
import { NextResponse } from 'next/server';

import {
  exportSnapshot,
  logAuditEvent,
  createSupabaseMediaDownloader,
  createLocalMediaDownloader,
  extractStorageKeyFromUrl,
} from '@simple-cms/db';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { user, error } = await requirePermission('demo-snapshot', 'create');
  if (error) return error;

  const provider = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();
  const sourceSessionId =
    new URL(request.url).searchParams.get('sessionId') ?? '__PROD__';

  // provider별 downloader + urlToStorageKey 콜백 구성
  let downloadMedia: (key: string) => Promise<Buffer>;
  let urlToKey: (url: string) => string | null;

  if (provider === 'supabase') {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads';
    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase 환경변수 미설정',
        },
        { status: 500 },
      );
    }
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    downloadMedia = createSupabaseMediaDownloader(client.storage.from(bucket));
    urlToKey = (u) => extractStorageKeyFromUrl(u, 'supabase', bucket);
  } else {
    const publicDir =
      process.env.LOCAL_STORAGE_PUBLIC_DIR ??
      path.resolve(process.cwd(), '..', 'web', 'public');
    downloadMedia = createLocalMediaDownloader(publicDir);
    urlToKey = (u) => extractStorageKeyFromUrl(u, 'local');
  }

  try {
    const payload = await exportSnapshot({
      sourceSessionId,
      downloadMedia,
      urlToStorageKey: urlToKey,
    });

    const json = JSON.stringify(payload);
    const sizeMb = (json.length / 1024 / 1024).toFixed(2);
    const totalRows = Object.values(payload.models).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );

    // 감사 로그 (READ를 CREATE로 재해석 — PII가 외부로 나가는 export는 추적 가치 높음)
    const auditContext = getAuditContext(request);
    void logAuditEvent({
      action: 'CREATE',
      entityType: 'SITE_SETTINGS', // enum 재사용 (schema 변경 회피)
      entityId: 'DEMO_SNAPSHOT_EXPORT',
      entityTitle: `시연 스냅샷 내보내기 (${totalRows} row, ${sizeMb} MB)`,
      userId: user.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      changes: {
        after: {
          schemaVersion: payload.schemaVersion,
          totalRows,
          sizeBytes: json.length,
          sourceSessionId,
        },
      },
    }).catch((err) =>
      console.error('[demo-snapshot/export] audit log failed', err),
    );

    const filename = `demo-snapshot-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.json`;

    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Snapshot-Total-Rows': String(totalRows),
        'X-Snapshot-Size-Bytes': String(json.length),
      },
    });
  } catch (err) {
    console.error('[demo-snapshot/export] error', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : '스냅샷 내보내기 중 오류가 발생했습니다.',
      },
      { status: 500 },
    );
  }
}
