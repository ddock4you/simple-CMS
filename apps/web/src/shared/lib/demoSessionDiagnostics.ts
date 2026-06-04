import { demo, prisma, searchContent } from '@simple-cms/db';
import { SITE_SETTING_KEYS } from '@simple-cms/types';

import type { RequestDemoSession } from './requestDemoSession';

export interface DemoSessionDiagnostics {
  active: boolean;
  sessionId: string | null;
  currentSessionId: string;
  expiresAt: string | null;
  counts: {
    users: number;
    roles: number;
    siteSettings: number;
    navigationMenus: number;
    homeSections: number;
    subpages: number;
    boards: number;
    posts: number;
    media: number;
  } | null;
  settings: {
    brandingMediaIds: {
      logo: string | null;
      favicon: string | null;
      ogImage: string | null;
      footerLogo: string | null;
    };
    resolvedMedia: {
      logo: boolean;
      favicon: boolean;
      ogImage: boolean;
      footerLogo: boolean;
    };
  } | null;
  search: {
    query: string;
    total: number;
    counts: { all: number; subpage: number; post: number };
  } | null;
}

function parseFooterLogoMediaId(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const value = (parsed as { footerLogoMediaId?: unknown }).footerLogoMediaId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function buildDemoSessionDiagnostics(
  session: RequestDemoSession | null,
  searchQuery?: string | null,
): Promise<DemoSessionDiagnostics> {
  const currentSessionId = demo.getCurrentSessionId();

  if (!session) {
    return {
      active: false,
      sessionId: null,
      currentSessionId,
      expiresAt: null,
      counts: null,
      settings: null,
      search: null,
    };
  }

  const settings = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: [
          SITE_SETTING_KEYS.SITE_LOGO_MEDIA_ID,
          SITE_SETTING_KEYS.SITE_FAVICON_MEDIA_ID,
          SITE_SETTING_KEYS.SITE_OG_IMAGE_MEDIA_ID,
          SITE_SETTING_KEYS.SITE_FOOTER_CONFIG,
        ],
      },
    },
    select: { key: true, value: true },
  });
  const valueByKey = new Map(
    settings.map((setting) => [setting.key, setting.value]),
  );
  const logoMediaId =
    valueByKey.get(SITE_SETTING_KEYS.SITE_LOGO_MEDIA_ID) ?? null;
  const faviconMediaId =
    valueByKey.get(SITE_SETTING_KEYS.SITE_FAVICON_MEDIA_ID) ?? null;
  const ogImageMediaId =
    valueByKey.get(SITE_SETTING_KEYS.SITE_OG_IMAGE_MEDIA_ID) ?? null;
  const footerLogoMediaId = parseFooterLogoMediaId(
    valueByKey.get(SITE_SETTING_KEYS.SITE_FOOTER_CONFIG) ?? null,
  );
  const mediaIds = [
    logoMediaId,
    faviconMediaId,
    ogImageMediaId,
    footerLogoMediaId,
  ].filter((id): id is string => Boolean(id));
  const mediaRows =
    mediaIds.length > 0
      ? await prisma.media.findMany({
          where: { id: { in: mediaIds } },
          select: { id: true },
        })
      : [];
  const resolvedMediaIds = new Set(mediaRows.map((media) => media.id));

  const [
    users,
    roles,
    siteSettings,
    navigationMenus,
    homeSections,
    subpages,
    boards,
    posts,
    media,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.siteSettings.count(),
    prisma.navigationMenu.count(),
    prisma.homeSection.count(),
    prisma.subpage.count(),
    prisma.board.count(),
    prisma.post.count(),
    prisma.media.count(),
  ]);
  const normalizedSearchQuery = searchQuery?.trim() ?? '';
  const search =
    normalizedSearchQuery.length > 0
      ? await searchContent(normalizedSearchQuery)
      : null;

  return {
    active: true,
    sessionId: session.sessionId,
    currentSessionId,
    expiresAt: session.expiresAt.toISOString(),
    counts: {
      users,
      roles,
      siteSettings,
      navigationMenus,
      homeSections,
      subpages,
      boards,
      posts,
      media,
    },
    settings: {
      brandingMediaIds: {
        logo: logoMediaId,
        favicon: faviconMediaId,
        ogImage: ogImageMediaId,
        footerLogo: footerLogoMediaId,
      },
      resolvedMedia: {
        logo: logoMediaId ? resolvedMediaIds.has(logoMediaId) : true,
        favicon: faviconMediaId ? resolvedMediaIds.has(faviconMediaId) : true,
        ogImage: ogImageMediaId ? resolvedMediaIds.has(ogImageMediaId) : true,
        footerLogo: footerLogoMediaId
          ? resolvedMediaIds.has(footerLogoMediaId)
          : true,
      },
    },
    search: search
      ? {
          query: normalizedSearchQuery,
          total: search.total,
          counts: search.counts,
        }
      : null,
  };
}
