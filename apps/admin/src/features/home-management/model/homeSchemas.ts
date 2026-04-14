import { z } from 'zod';

/**
 * HomeSection Zod 스키마
 *
 * - URL: z.string().url() 대신 min(1).max(2000) — 내부 경로(/about) + 외부 URL 모두 허용
 * - configJson은 섹션 타입별 discriminated union으로 관리
 * - API 핸들러는 body의 sectionType이 아닌 DB의 sectionType을 기준으로 재검증
 */

const urlString = z
  .string()
  .min(1, 'URL을 입력해주세요.')
  .max(2000, 'URL은 2000자 이하여야 합니다.');

const optionalUrlString = z
  .string()
  .max(2000, 'URL은 2000자 이하여야 합니다.')
  .nullable()
  .optional();

/**
 * 공통 슬라이드 옵션 스키마 (HERO, RECOMMENDED).
 * autoPlay/autoPlayInterval은 showPlayPause=false여도 값은 저장되나 무시됨.
 */
export const slideOptionsSchema = z.object({
  showPrevNext: z.boolean(),
  showPlayPause: z.boolean(),
  showDots: z.boolean(),
  autoPlay: z.boolean(),
  autoPlayInterval: z
    .number()
    .int()
    .min(1000, '최소 1000ms 이상이어야 합니다.')
    .max(30000, '최대 30000ms 이하여야 합니다.'),
});
export type SlideOptionsData = z.infer<typeof slideOptionsSchema>;

export const DEFAULT_SLIDE_OPTIONS: SlideOptionsData = {
  showPrevNext: true,
  showPlayPause: false,
  showDots: true,
  autoPlay: false,
  autoPlayInterval: 5000,
};

const heroSlideSchema = z.object({
  imageUrl: z
    .string()
    .min(1, '이미지 URL을 입력해주세요.')
    .max(2000, 'URL은 2000자 이하여야 합니다.'),
  imageAlt: z
    .string()
    .min(1, '이미지 대체 텍스트를 입력해주세요.')
    .max(200, '대체 텍스트는 200자 이하여야 합니다.'),
  title: z
    .string()
    .min(1, '제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.'),
  description: z.string().max(500).nullable().optional(),
  url: optionalUrlString,
  imageOriginalName: z.string().max(255).nullable().optional(),
  mediaId: z.string().max(64).nullable().optional(),
});

export const heroConfigSchema = z.object({
  slides: z
    .array(heroSlideSchema)
    .max(10, '최대 10개까지 등록할 수 있습니다.'),
  slideOptions: slideOptionsSchema,
});
export type HeroConfigData = z.infer<typeof heroConfigSchema>;

const recommendedItemSchema = z.object({
  imageUrl: z
    .string()
    .min(1, '이미지 URL을 입력해주세요.')
    .max(2000),
  imageAlt: z
    .string()
    .min(1, '이미지 대체 텍스트를 입력해주세요.')
    .max(200),
  title: z.string().min(1, '제목을 입력해주세요.').max(200),
  description: z.string().max(500).nullable().optional(),
  url: optionalUrlString,
  imageOriginalName: z.string().max(255).nullable().optional(),
  mediaId: z.string().max(64).nullable().optional(),
});

export const recommendedConfigSchema = z.object({
  heading: z
    .string()
    .min(1, '섹션 제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.'),
  description: z.string().max(500).nullable().optional(),
  items: z
    .array(recommendedItemSchema)
    .max(12, '최대 12개까지 등록할 수 있습니다.'),
  slideOptions: slideOptionsSchema,
});
export type RecommendedConfigData = z.infer<typeof recommendedConfigSchema>;

export const shortcutConfigSchema = z.object({
  heading: z.string().min(1, '섹션 제목을 입력해주세요.').max(200),
  description: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1, '라벨을 입력해주세요.').max(100),
        description: z.string().max(200).nullable().optional(),
        url: urlString,
      }),
    )
    .max(8, '최대 8개까지 등록할 수 있습니다.'),
});
export type ShortcutConfigData = z.infer<typeof shortcutConfigSchema>;

export const latestPostsConfigSchema = z.object({
  heading: z.string().min(1, '섹션 제목을 입력해주세요.').max(200),
  description: z.string().max(500).nullable().optional(),
  boardId: z.string().nullable(),
  limit: z.number().int().min(1).max(10),
});
export type LatestPostsConfigData = z.infer<typeof latestPostsConfigSchema>;

export const ctaConfigSchema = z.object({
  heading: z.string().min(1, '섹션 제목을 입력해주세요.').max(200),
  description: z.string().max(1000).nullable().optional(),
  buttonLabel: z.string().min(1, '버튼 라벨을 입력해주세요.').max(50),
  buttonUrl: urlString,
});
export type CtaConfigData = z.infer<typeof ctaConfigSchema>;

export const noticeConfigSchema = z.object({
  heading: z.string().min(1, '섹션 제목을 입력해주세요.').max(200),
  description: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1, '제목을 입력해주세요.').max(200),
        url: z.string().max(2000).nullable().optional(),
        date: z.string().max(25).nullable().optional(),
      }),
    )
    .max(5, '최대 5개까지 등록할 수 있습니다.'),
});
export type NoticeConfigData = z.infer<typeof noticeConfigSchema>;

/**
 * 섹션 타입 → Zod 스키마 매핑 (API 핸들러에서 재검증용)
 */
export const configSchemaByType = {
  HERO: heroConfigSchema,
  RECOMMENDED: recommendedConfigSchema,
  SHORTCUT: shortcutConfigSchema,
  LATEST_POSTS: latestPostsConfigSchema,
  CTA: ctaConfigSchema,
  NOTICE: noticeConfigSchema,
} as const;

/**
 * 섹션 타입별 빈 기본값 (폼 reset 시 사용)
 */
export const defaultConfigByType = {
  HERO: {
    slides: [],
    slideOptions: DEFAULT_SLIDE_OPTIONS,
  } satisfies HeroConfigData,
  RECOMMENDED: {
    heading: '',
    description: null,
    items: [],
    slideOptions: DEFAULT_SLIDE_OPTIONS,
  } satisfies RecommendedConfigData,
  SHORTCUT: {
    heading: '',
    description: null,
    items: [],
  } satisfies ShortcutConfigData,
  LATEST_POSTS: {
    heading: '',
    description: null,
    boardId: null,
    limit: 5,
  } satisfies LatestPostsConfigData,
  CTA: {
    heading: '',
    description: null,
    buttonLabel: '',
    buttonUrl: '',
  } satisfies CtaConfigData,
  NOTICE: {
    heading: '',
    description: null,
    items: [],
  } satisfies NoticeConfigData,
} as const;

/**
 * API 레벨 update 스키마 (부분 업데이트)
 * configJson은 unknown — 핸들러에서 DB의 sectionType을 조회 후 configSchemaByType으로 재검증
 */
export const updateHomeSectionSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').max(200).optional(),
  isVisible: z.boolean().optional(),
  configJson: z.unknown().optional(),
});
export type UpdateHomeSectionData = z.infer<typeof updateHomeSectionSchema>;

/**
 * 섹션 순서 변경 스키마 — 항상 전체 6개 섹션의 id+displayOrder를 포함해야 함
 */
export const reorderHomeSectionsSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        displayOrder: z.number().int().min(0).max(5),
      }),
    )
    .length(6, '전체 섹션(6개)을 포함해야 합니다.'),
});
export type ReorderHomeSectionsData = z.infer<typeof reorderHomeSectionsSchema>;
