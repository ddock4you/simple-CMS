import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, HomeSectionListItem } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import {
  defaultConfigByType,
  type BriefIntroConfigData,
  type FrequentMenuConfigData,
  type GalleryCollectionConfigData,
  type HeroConfigData,
  type LatestPostsConfigData,
  type NoticeConfigData,
  type RecommendedConfigData,
  type ShortcutConfigData,
  type SubCarouselConfigData,
  type CtaConfigData,
} from '@/features/home-management/model/homeSchemas';
import {
  SECTION_TYPE_LABELS,
  SECTION_TYPE_ORDER,
} from '@/features/home-management/model/sectionLabels';

type FixedHomeSectionType = (typeof SECTION_TYPE_ORDER)[number];
type DefaultHomeSectionConfig =
  | HeroConfigData
  | BriefIntroConfigData
  | RecommendedConfigData
  | SubCarouselConfigData
  | FrequentMenuConfigData
  | ShortcutConfigData
  | LatestPostsConfigData
  | GalleryCollectionConfigData
  | CtaConfigData
  | NoticeConfigData;

export async function GET(_request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('home', 'read');
  if (error) return error;

  try {
    await ensureFixedHomeSections();

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

    return NextResponse.json({ success: true, data } satisfies ApiResponse<
      HomeSectionListItem[]
    >);
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

async function ensureFixedHomeSections(): Promise<void> {
  const existingSections = await prisma.homeSection.findMany({
    select: { sectionType: true, displayOrder: true },
  });
  const existingTypes = new Set(
    existingSections.map((section) => section.sectionType),
  );
  const missingTypes = SECTION_TYPE_ORDER.filter(
    (type) => !existingTypes.has(type),
  );

  if (missingTypes.length === 0) return;

  const maxDisplayOrder = existingSections.reduce(
    (max, section) => Math.max(max, section.displayOrder),
    -1,
  );

  await prisma.homeSection.createMany({
    data: missingTypes.map((sectionType, index) => ({
      sectionType,
      title: SECTION_TYPE_LABELS[sectionType],
      isVisible: true,
      displayOrder: maxDisplayOrder + index + 1,
      configJson: cloneDefaultConfig(sectionType),
    })),
    skipDuplicates: true,
  });
}

function cloneDefaultConfig(
  sectionType: FixedHomeSectionType,
): DefaultHomeSectionConfig {
  return JSON.parse(
    JSON.stringify(defaultConfigByType[sectionType]),
  ) as DefaultHomeSectionConfig;
}
