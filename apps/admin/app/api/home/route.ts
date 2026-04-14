import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, HomeSectionListItem } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';

export async function GET(_request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('home', 'read');
  if (error) return error;

  try {
    const sections = await prisma.homeSection.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        sectionType: true,
        title: true,
        isVisible: true,
        displayOrder: true,
        configJson: true,
        updatedAt: true,
      },
    });

    const data: HomeSectionListItem[] = sections.map((section) => ({
      id: section.id,
      sectionType: section.sectionType,
      title: section.title,
      isVisible: section.isVisible,
      displayOrder: section.displayOrder,
      configJson: section.configJson,
      updatedAt: section.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<HomeSectionListItem[]>,
    );
  } catch (err) {
    console.error('[Home GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '메인 섹션 목록 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
