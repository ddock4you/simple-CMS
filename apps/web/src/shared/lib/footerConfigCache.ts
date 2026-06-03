import { getSiteSetting, prisma } from '@simple-cms/db';
import {
  DEFAULT_SITE_FOOTER_CONFIG,
  SITE_SETTING_KEYS,
  type SiteFooterConfig,
} from '@simple-cms/types';
import { z } from 'zod';

import { createSettingsCache } from './createSettingsCache';

const footerUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .regex(/^(\/|https:\/\/)/);

const footerConfigSchema = z.object({
  footerLogoMediaId: z.string().nullable().default(null),
  footerLogoAlt: z.string().trim().max(120).nullable().default(null),
  address: z.string().trim().max(200).nullable().default(null),
  contacts: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().min(1).max(120),
      }),
    )
    .max(4)
    .default([]),
  quickLinks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(60),
        url: footerUrlSchema,
        openInNewTab: z.boolean().optional(),
      }),
    )
    .max(4)
    .default([]),
  socialLinks: z
    .array(
      z.object({
        platform: z.enum(['instagram', 'youtube', 'x', 'facebook', 'blog']),
        href: footerUrlSchema,
        openInNewTab: z.boolean().optional(),
      }),
    )
    .max(5)
    .default([]),
  bottomLinks: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(60),
        href: footerUrlSchema,
        openInNewTab: z.boolean().optional(),
        isHighlighted: z.boolean().optional(),
      }),
    )
    .max(6)
    .default(DEFAULT_SITE_FOOTER_CONFIG.bottomLinks),
  identifierText: z.string().trim().max(120).nullable().default(null),
  copyright: z.string().trim().max(120).nullable().default(null),
  hideQuickLinks: z.boolean().default(false),
  hideIdentifier: z.boolean().default(false),
});

export interface ResolvedSiteFooterConfig extends SiteFooterConfig {
  footerLogoUrl: string | null;
}

function parseFooterConfig(raw: string | null): SiteFooterConfig {
  if (!raw) return DEFAULT_SITE_FOOTER_CONFIG;

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = footerConfigSchema.safeParse(parsed);
    return result.success ? result.data : DEFAULT_SITE_FOOTER_CONFIG;
  } catch {
    return DEFAULT_SITE_FOOTER_CONFIG;
  }
}

const footerConfigCache = createSettingsCache({
  fetcher: async (): Promise<ResolvedSiteFooterConfig> => {
    const raw = await getSiteSetting(SITE_SETTING_KEYS.SITE_FOOTER_CONFIG);
    const config = parseFooterConfig(raw);
    const footerLogo = config.footerLogoMediaId
      ? await prisma.media.findUnique({
          where: { id: config.footerLogoMediaId },
          select: { url: true },
        })
      : null;

    return {
      ...config,
      footerLogoUrl: footerLogo?.url ?? null,
    };
  },
  onError: (err) => {
    console.error('[footerConfigCache] fetch failed, returning fallback:', err);
    return { ...DEFAULT_SITE_FOOTER_CONFIG, footerLogoUrl: null };
  },
});

export const getCachedFooterConfig = () => footerConfigCache.get();

export const invalidateFooterConfigCache = () => footerConfigCache.invalidate();
