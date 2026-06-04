import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentSessionId: 'visitor-a',
  counts: {
    siteSettingsFindMany: vi.fn(),
    mediaFindMany: vi.fn(),
    user: vi.fn(),
    role: vi.fn(),
    siteSettings: vi.fn(),
    navigationMenu: vi.fn(),
    homeSection: vi.fn(),
    subpage: vi.fn(),
    board: vi.fn(),
    post: vi.fn(),
    media: vi.fn(),
  },
  searchContent: vi.fn(),
}));

vi.mock('@simple-cms/db', () => ({
  demo: {
    getCurrentSessionId: () => mocks.currentSessionId,
  },
  searchContent: mocks.searchContent,
  prisma: {
      siteSettings: {
        count: mocks.counts.siteSettings,
        findMany: mocks.counts.siteSettingsFindMany,
      },
      media: {
        count: mocks.counts.media,
        findMany: mocks.counts.mediaFindMany,
      },
      user: { count: mocks.counts.user },
      role: { count: mocks.counts.role },
      navigationMenu: { count: mocks.counts.navigationMenu },
      homeSection: { count: mocks.counts.homeSection },
      subpage: { count: mocks.counts.subpage },
      board: { count: mocks.counts.board },
      post: { count: mocks.counts.post },
    },
  }));

import { buildDemoSessionDiagnostics } from './demoSessionDiagnostics';

describe('buildDemoSessionDiagnostics', () => {
  beforeEach(() => {
    mocks.currentSessionId = 'visitor-a';
    Object.values(mocks.counts).forEach((count, index) => {
      count.mockReset();
      count.mockResolvedValue(index + 1);
    });
    mocks.counts.siteSettingsFindMany.mockResolvedValue([]);
    mocks.counts.mediaFindMany.mockResolvedValue([]);
    mocks.searchContent.mockReset();
    mocks.searchContent.mockResolvedValue({
      total: 2,
      counts: { all: 2, subpage: 1, post: 1 },
    });
  });

  it('returns inactive diagnostics without querying content tables', async () => {
    await expect(buildDemoSessionDiagnostics(null)).resolves.toEqual({
      active: false,
      sessionId: null,
      currentSessionId: 'visitor-a',
      expiresAt: null,
      counts: null,
      settings: null,
      search: null,
    });

    for (const count of Object.values(mocks.counts)) {
      expect(count).not.toHaveBeenCalled();
    }
    expect(mocks.searchContent).not.toHaveBeenCalled();
  });

  it('returns table counts for the active demo session scope', async () => {
    const expiresAt = new Date('2026-06-04T01:00:00.000Z');
    mocks.counts.user.mockResolvedValue(1);
    mocks.counts.role.mockResolvedValue(2);
    mocks.counts.siteSettings.mockResolvedValue(3);
    mocks.counts.navigationMenu.mockResolvedValue(4);
    mocks.counts.homeSection.mockResolvedValue(5);
    mocks.counts.subpage.mockResolvedValue(6);
    mocks.counts.board.mockResolvedValue(7);
    mocks.counts.post.mockResolvedValue(8);
    mocks.counts.media.mockResolvedValue(9);
    mocks.counts.siteSettingsFindMany.mockResolvedValue([
      { key: 'SITE_LOGO_MEDIA_ID', value: 'logo-media' },
      { key: 'SITE_FAVICON_MEDIA_ID', value: 'favicon-media' },
      { key: 'SITE_OG_IMAGE_MEDIA_ID', value: 'og-media' },
      {
        key: 'SITE_FOOTER_CONFIG',
        value: JSON.stringify({ footerLogoMediaId: 'footer-media' }),
      },
    ]);
    mocks.counts.mediaFindMany.mockResolvedValue([
      { id: 'logo-media' },
      { id: 'favicon-media' },
      { id: 'og-media' },
    ]);

    await expect(
      buildDemoSessionDiagnostics({
        sessionId: 'visitor-a',
        expiresAt,
      }),
    ).resolves.toEqual({
      active: true,
      sessionId: 'visitor-a',
      currentSessionId: 'visitor-a',
      expiresAt: '2026-06-04T01:00:00.000Z',
      counts: {
        users: 1,
        roles: 2,
        siteSettings: 3,
        navigationMenus: 4,
        homeSections: 5,
        subpages: 6,
        boards: 7,
        posts: 8,
        media: 9,
      },
      settings: {
        brandingMediaIds: {
          logo: 'logo-media',
          favicon: 'favicon-media',
          ogImage: 'og-media',
          footerLogo: 'footer-media',
        },
        resolvedMedia: {
          logo: true,
          favicon: true,
          ogImage: true,
          footerLogo: false,
        },
      },
      search: null,
    });

    for (const count of [
      mocks.counts.user,
      mocks.counts.role,
      mocks.counts.siteSettings,
      mocks.counts.navigationMenu,
      mocks.counts.homeSection,
      mocks.counts.subpage,
      mocks.counts.board,
      mocks.counts.post,
      mocks.counts.media,
    ]) {
      expect(count).toHaveBeenCalledTimes(1);
      expect(count).toHaveBeenCalledWith();
    }
    expect(mocks.counts.siteSettingsFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.counts.mediaFindMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['logo-media', 'favicon-media', 'og-media', 'footer-media'],
        },
      },
      select: { id: true },
    });
    expect(mocks.searchContent).not.toHaveBeenCalled();
  });

  it('includes an optional search smoke result', async () => {
    const expiresAt = new Date('2026-06-04T01:00:00.000Z');

    await expect(
      buildDemoSessionDiagnostics(
        {
          sessionId: 'visitor-a',
          expiresAt,
        },
        ' 공지 ',
      ),
    ).resolves.toMatchObject({
      search: {
        query: '공지',
        total: 2,
        counts: { all: 2, subpage: 1, post: 1 },
      },
    });

    expect(mocks.searchContent).toHaveBeenCalledWith('공지');
  });
});
