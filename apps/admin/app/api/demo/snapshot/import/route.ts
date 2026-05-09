/**
 * 시연 모드 PR6: snapshot import 엔드포인트.
 *
 * POST /_cms/admin/api/demo/snapshot/import
 *   - DEMO_MODE !== 'true' → 503 (운영 환경에서 import 차단)
 *   - requirePermission('demo-snapshot', 'update')
 *   - body: SnapshotPayload JSON
 *   - 50MB 한도
 *
 * 동작:
 *   - resetSeedData (기존 __SEED__ row + Storage 파일 정리)
 *   - Phase 1: Media base64 → Storage upload
 *   - Phase 2: $transaction으로 14모델 createMany + walker remap
 *
 * 감사 로그: entityType=SITE_SETTINGS, entityId=DEMO_SNAPSHOT_IMPORT, action=UPDATE.
 */
import { NextResponse } from 'next/server';

import { importSnapshotToSeed, logAuditEvent } from '@simple-cms/db';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { getStorageAdapter } from '@/shared/lib/storage';
import { SupabaseStorageAdapter } from '@/shared/lib/storage/supabaseAdapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      {
        success: false,
        error: '시연 모드가 활성화되지 않았습니다.',
      },
      { status: 503 },
    );
  }

  const { user, error } = await requirePermission('demo-snapshot', 'update');
  if (error) return error;

  // body 크기 체크 (Content-Length는 클라이언트가 거짓말할 수 있으나 1차 방어)
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: `파일 크기가 ${MAX_BODY_BYTES / 1024 / 1024}MB를 초과합니다.`,
      },
      { status: 413 },
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON 파싱 실패' },
      { status: 400 },
    );
  }

  const adapter = getStorageAdapter();
  if (!(adapter instanceof SupabaseStorageAdapter)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'STORAGE_PROVIDER=supabase가 아닙니다. import는 Supabase 환경에서만 동작합니다.',
      },
      { status: 503 },
    );
  }

  try {
    const stats = await importSnapshotToSeed(rawPayload, {
      uploadMedia: (key, buffer, mimeType) =>
        adapter.uploadToSeed(key, buffer, mimeType),
      cleanupStorage: () => adapter.cleanupSeedFolder(),
    });

    const totalRows = Object.values(stats.rowsCreatedByModel).reduce(
      (sum, n) => sum + n,
      0,
    );

    // 감사 로그
    const auditContext = getAuditContext(request);
    void logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: 'DEMO_SNAPSHOT_IMPORT',
      entityTitle: `시연 시드 갱신 (${totalRows} row, ${stats.mediaFilesUploaded} files)`,
      userId: user.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      changes: {
        after: {
          rowsCreatedByModel: stats.rowsCreatedByModel,
          rowsDeletedByModel: stats.rowsDeletedByModel,
          mediaFilesUploaded: stats.mediaFilesUploaded,
          storageFilesDeleted: stats.storageFilesDeleted,
          errorsCount: stats.errors.length,
        },
      },
    }).catch((err) =>
      console.error('[demo-snapshot/import] audit log failed', err),
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          stats,
          redirectTo: '/settings/demo-snapshot',
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[demo-snapshot/import] error', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : '스냅샷 import 중 오류가 발생했습니다.',
      },
      { status: 500 },
    );
  }
}
