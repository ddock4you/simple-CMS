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
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { getStorageAdapter } from '@/shared/lib/storage';

/**
 * POST /api/media/branding-upload (Stage 7l)
 *
 * 사이트 브랜딩(로고 / 파비콘 / OG 이미지) 전용 업로드 엔드포인트.
 * 기존 /api/media/upload와 분리한 이유:
 * - SVG 명시 차단 (XSS 방어 — 새 탭 열람 시 <script> 실행 가능)
 * - favicon용 ICO 추가 허용 (PNG/JPG/WEBP/ICO만)
 * - category 'branding' 강제 — 운영자가 다른 카테고리로 업로드해 분류가 흐려지는 것 방지
 *
 * MIME 화이트리스트:
 * - image/jpeg, image/png, image/webp (로고/OG 공통)
 * - image/x-icon, image/vnd.microsoft.icon (favicon용 ICO — 브라우저별 다른 MIME 보고)
 *
 * application/octet-stream은 의도적 제외 — 일부 브라우저가 valid ICO를 octet-stream으로 보고하지만
 * 임의 바이너리도 같은 MIME이라 화이트리스트 들이면 스푸핑 위험. 거부 시 PNG 변환 안내.
 *
 * 권한: 인증된 관리자 (역할 불문). 기존 /api/media/upload와 동일.
 * 키별 추가 MIME 게이트(로고/OG는 ICO 거부)는 PATCH /api/settings/branding이 담당.
 */

const ALLOWED_BRANDING_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const FIXED_CATEGORY = 'branding';

export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireAuth();

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: '파일이 필요합니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const fileSize = file.size;
    const fileName = file.name;
    const mimeType = file.type || 'application/octet-stream';

    if (!ALLOWED_BRANDING_MIME.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            '브랜딩 이미지는 PNG, JPG, WEBP, ICO만 업로드할 수 있습니다. (ICO 인식 실패 시 PNG로 변환해주세요.)',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // 사이즈/확장자 검증은 SiteSettings 정책 그대로 적용
    const restrictions = await getUploadRestrictions();
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
    const existing = await prisma.media.findUnique({
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

    const adapter = getStorageAdapter();
    const result = await adapter.upload({
      buffer,
      originalFilename: fileName,
      mimeType,
      category: FIXED_CATEGORY,
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
          category: FIXED_CATEGORY,
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
    console.error('[Branding Upload] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '업로드에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
