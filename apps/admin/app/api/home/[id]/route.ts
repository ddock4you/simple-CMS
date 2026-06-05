import { NextResponse } from 'next/server';

import type { Prisma } from '@simple-cms/db';
import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, HomeSectionDetail } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import {
  configSchemaByType,
  updateHomeSectionSchema,
} from '@/features/home-management/model/homeSchemas';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('home', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const { id } = await params;
    const section = await prisma.homeSection.findUnique({ where: { id } });
    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: '섹션을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const data: HomeSectionDetail = {
      id: section.id,
      sectionType: section.sectionType,
      title: section.title,
      isVisible: section.isVisible,
      displayOrder: section.displayOrder,
      configJson: section.configJson,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<HomeSectionDetail>,
    );
    } catch (err) {
    console.error('[Home GET detail] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '섹션 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('home', 'update');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
  try {
    const { id } = await params;
    const section = await prisma.homeSection.findUnique({ where: { id } });
    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: '섹션을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateHomeSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { title, isVisible, configJson } = parsed.data;

    // configJson이 제공되면 DB의 sectionType에 따라 해당 스키마로 재검증
    let validatedConfig: unknown = undefined;
    if (configJson !== undefined) {
      const configSchema = configSchemaByType[section.sectionType];
      const configParsed = configSchema.safeParse(configJson);
      if (!configParsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: configParsed.error.issues[0].message,
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }
      validatedConfig = configParsed.data;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (validatedConfig !== undefined) updateData.configJson = validatedConfig;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updated = await prisma.homeSection.update({
      where: { id },
      data: updateData,
    });

    // Diff 계산 후 감사 로그
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (title !== undefined && title !== section.title) {
      before.title = section.title;
      after.title = title;
    }
    if (isVisible !== undefined && isVisible !== section.isVisible) {
      before.isVisible = section.isVisible;
      after.isVisible = isVisible;
    }
    if (validatedConfig !== undefined) {
      const beforeConfig = JSON.stringify(section.configJson);
      const afterConfig = JSON.stringify(validatedConfig);
      if (beforeConfig !== afterConfig) {
        before.configJson = section.configJson;
        after.configJson = validatedConfig;
      }
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'HOME_SECTION',
        entityId: id,
        entityTitle: updated.title,
        changes: { before, after } as Prisma.InputJsonValue,
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Home PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '섹션 수정에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
  });
}
