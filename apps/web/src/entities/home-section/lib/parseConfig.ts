import { z } from 'zod';

import type {
  HeroConfig,
  RecommendedConfig,
  ShortcutConfig,
  LatestPostsConfig,
  CtaConfig,
  NoticeConfig,
  SubCarouselConfig,
  FrequentMenuConfig,
} from '@simple-cms/types';

/**
 * configJson 타입 가드 (Zod safeParse). 손상된 데이터에 안전.
 * admin의 homeSchemas와 독립적으로 정의 (앱 간 격리 원칙).
 */

const slideOptionsSchema = z.object({
  showPrevNext: z.boolean(),
  showPlayPause: z.boolean(),
  showDots: z.boolean(),
  autoPlay: z.boolean(),
  autoPlayInterval: z.number().int().min(1000).max(30000),
});

const heroSchema = z.object({
  slides: z.array(
    z.object({
      imageUrl: z.string(),
      imageAlt: z.string(),
      title: z.string(),
      description: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      // admin 전용 메타데이터 — web 렌더링에서는 사용하지 않으나 저장값 보존
      imageOriginalName: z.string().nullable().optional(),
      // Media 라이브러리 참조 — Stage 5a-2 (web 렌더링에는 사용 안 함, 저장값 보존)
      mediaId: z.string().nullable().optional(),
    }),
  ),
  slideOptions: slideOptionsSchema,
});

const recommendedSchema = z.object({
  heading: z.string(),
  description: z.string().nullable().optional(),
  items: z.array(
    z.object({
      imageUrl: z.string(),
      imageAlt: z.string(),
      title: z.string(),
      description: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      imageOriginalName: z.string().nullable().optional(),
      mediaId: z.string().nullable().optional(),
    }),
  ),
  slideOptions: slideOptionsSchema,
});

const shortcutSchema = z.object({
  heading: z.string(),
  description: z.string().nullable().optional(),
  items: z.array(
    z.object({
      label: z.string(),
      description: z.string().nullable().optional(),
      url: z.string(),
    }),
  ),
});

const frequentMenuSchema = z.object({
  heading: z.string(),
  items: z.array(
    z.object({
      title: z.string(),
      itemType: z.enum(['SUBPAGE', 'BOARD', 'EXTERNAL', 'CUSTOM']),
      subpageId: z.string().nullable().optional(),
      boardId: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      isVisible: z.boolean(),
      openInNewTab: z.boolean(),
      iconUrl: z.string(),
      iconAlt: z.string(),
      iconMediaId: z.string().nullable().optional(),
      iconOriginalName: z.string().nullable().optional(),
    }),
  ),
});

const latestPostsSchema = z.object({
  heading: z.string(),
  description: z.string().nullable().optional(),
  boardId: z.string().nullable(),
  limit: z.number().int().min(1).max(20),
});

const ctaSchema = z.object({
  heading: z.string(),
  description: z.string().nullable().optional(),
  buttonLabel: z.string(),
  buttonUrl: z.string(),
});

const noticeSchema = z.object({
  heading: z.string(),
  description: z.string().nullable().optional(),
  boardId: z.string().nullable(),
  limit: z.number().int().min(1).max(10),
});

const legacyNoticeSchema = z.object({
  heading: z.string(),
  description: z.string().nullable().optional(),
  items: z.array(
    z.object({
      label: z.string(),
      url: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
    }),
  ),
});

export function parseHeroConfig(raw: unknown): HeroConfig | null {
  const result = heroSchema.safeParse(raw);
  return result.success ? (result.data as HeroConfig) : null;
}

export function parseRecommendedConfig(raw: unknown): RecommendedConfig | null {
  const result = recommendedSchema.safeParse(raw);
  return result.success ? (result.data as RecommendedConfig) : null;
}

export function parseShortcutConfig(raw: unknown): ShortcutConfig | null {
  const result = shortcutSchema.safeParse(raw);
  return result.success ? (result.data as ShortcutConfig) : null;
}

export function parseFrequentMenuConfig(
  raw: unknown,
): FrequentMenuConfig | null {
  const result = frequentMenuSchema.safeParse(raw);
  return result.success ? (result.data as FrequentMenuConfig) : null;
}

export function parseLatestPostsConfig(raw: unknown): LatestPostsConfig | null {
  const result = latestPostsSchema.safeParse(raw);
  return result.success ? (result.data as LatestPostsConfig) : null;
}

export function parseCtaConfig(raw: unknown): CtaConfig | null {
  const result = ctaSchema.safeParse(raw);
  return result.success ? (result.data as CtaConfig) : null;
}

export function parseNoticeConfig(raw: unknown): NoticeConfig | null {
  const result = noticeSchema.safeParse(raw);
  if (result.success) {
    return result.data as NoticeConfig;
  }

  const legacyResult = legacyNoticeSchema.safeParse(raw);
  if (!legacyResult.success) {
    return null;
  }

  return {
    heading: legacyResult.data.heading,
    description: legacyResult.data.description,
    boardId: null,
    limit: Math.max(1, Math.min(legacyResult.data.items.length, 10)),
    items: legacyResult.data.items,
  } satisfies NoticeConfig;
}

const subCarouselSchema = z.object({
  tagline: z.string().nullable(),
  mainHeading: z.string(),
  subHeading: z.string().nullable(),
  description: z.string().nullable().optional(),
  items: z.array(
    z.object({
      imageUrl: z.string(),
      imageAlt: z.string(),
      title: z.string(),
      subtitle: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      imageOriginalName: z.string().nullable().optional(),
      mediaId: z.string().nullable().optional(),
    }),
  ),
  slideOptions: slideOptionsSchema,
});

export function parseSubCarouselConfig(raw: unknown): SubCarouselConfig | null {
  const result = subCarouselSchema.safeParse(raw);
  return result.success ? (result.data as SubCarouselConfig) : null;
}
