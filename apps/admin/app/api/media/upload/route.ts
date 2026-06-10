import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  getUploadRestrictions,
  logAuditEvent,
  prisma,
  validateFileUpload,
} from '@simple-cms/db';
import type { ApiResponse, UploadMediaResponse } from '@simple-cms/types';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { getStorageAdapter } from '@/shared/lib/storage';

/**
 * POST /api/media/upload
 *
 * multipart/form-data로 이미지 파일 업로드.
 * - 필드: `file` (File), `category` (string, 기본 'home')
 * - 검증: SiteSettings의 허용 확장자/MIME/크기
 * - 중복 방지: SHA-256 contentHash 기준. 동일 바이너리는 기존 Media 재사용 (reused: true)
 * - 저장: STORAGE_PROVIDER 환경변수에 따라 local 또는 Supabase
 * - DB: Media 레코드 생성 + 감사 로그 (재사용 시 두 작업 모두 skip)
 *
 * 권한: 인증된 관리자 (역할 불문). 라이브러리 화면(/media)은 별도 `media:read` 권한으로 제어.
 */

const MAX_CATEGORY_LEN = 32;
const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireAuth();

  return runWithUserDemoSession(user, async () => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const rawCategory = formData.get('category');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: '파일이 필요합니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const category =
      typeof rawCategory === 'string' && rawCategory.length > 0
        ? rawCategory.slice(0, MAX_CATEGORY_LEN)
        : 'home';

    // SiteSettings 기반 업로드 제한 + 이미지 타입만 허용
    const restrictions = await getUploadRestrictions();
    const fileSize = file.size;
    const fileName = file.name;
    const mimeType = file.type || 'application/octet-stream';

    // 이 엔드포인트는 이미지 전용 (홈 섹션/Tiptap 본문 대상)
    if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: '이미지 파일만 업로드할 수 있습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const validation = validateFileUpload(
      fileName,
      mimeType,
      fileSize,
      restrictions,
    );
    if (!validation.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: validation.reason ?? '업로드 제한에 맞지 않습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = createHash('sha256').update(buffer).digest('hex');

    // 중복 방지: 같은 contentHash가 있으면 기존 Media 재사용 (파일 저장 + 레코드 생성 skip)
    const existing = await prisma.media.findFirst({
      where: { contentHash },
      include: {
        uploadedBy: { select: { id: true, name: true, username: true } },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          data: {
            id: existing.id,
            filename: existing.filename,
            originalFilename: existing.originalFilename,
            mimeType: existing.mimeType,
            size: existing.size,
            url: existing.url,
            alt: existing.alt,
            contentHash: existing.contentHash,
            uploadedById: existing.uploadedById,
            uploadedBy: existing.uploadedBy,
            createdAt: existing.createdAt.toISOString(),
            reused: true,
          },
        } satisfies ApiResponse<UploadMediaResponse>,
        { status: 200 },
      );
    }

    // 신규 업로드
    const adapter = getStorageAdapter();
    const result = await adapter.upload({
      buffer,
      originalFilename: fileName,
      mimeType,
      category,
    });

    const media = await prisma.media.create({
      data: {
        filename: result.filename,
        originalFilename: fileName,
        mimeType,
        size: fileSize,
        url: result.url,
        contentHash,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, username: true } },
      },
    });

    // 감사 로그 (신규만 — 재사용은 새 액션이 아니므로 skip)
    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'MEDIA',
      entityId: media.id,
      entityTitle: fileName,
      changes: {
        after: {
          filename: result.filename,
          originalFilename: fileName,
          mimeType,
          size: fileSize,
          url: result.url,
          category,
        },
      },
      userId: user.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: media.id,
          filename: media.filename,
          originalFilename: media.originalFilename,
          mimeType: media.mimeType,
          size: media.size,
          url: media.url,
          alt: media.alt,
          contentHash: media.contentHash,
          uploadedById: media.uploadedById,
          uploadedBy: media.uploadedBy,
          createdAt: media.createdAt.toISOString(),
          reused: false,
        },
      } satisfies ApiResponse<UploadMediaResponse>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[Media Upload] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '업로드에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
  });
}
