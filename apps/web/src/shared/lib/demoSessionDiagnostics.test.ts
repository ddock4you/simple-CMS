import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentSessionId: 'visitor-a',
  counts: {
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
}));

vi.mock('@simple-cms/db', () => ({
  demo: {
    getCurrentSessionId: () => mocks.currentSessionId,
  },
  prisma: {
    user: { count: mocks.counts.user },
    role: { count: mocks.counts.role },
    siteSettings: { count: mocks.counts.siteSettings },
    navigationMenu: { count: mocks.counts.navigationMenu },
    homeSection: { count: mocks.counts.homeSection },
    subpage: { count: mocks.counts.subpage },
    board: { count: mocks.counts.board },
    post: { count: mocks.counts.post },
    media: { count: mocks.counts.media },
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
  });

  it('returns inactive diagnostics without querying content tables', async () => {
    await expect(buildDemoSessionDiagnostics(null)).resolves.toEqual({
      active: false,
      sessionId: null,
      currentSessionId: 'visitor-a',
      expiresAt: null,
      counts: null,
    });

    for (const count of Object.values(mocks.counts)) {
      expect(count).not.toHaveBeenCalled();
    }
  });

  it('returns table counts for the active demo session scope', async () => {
    const expiresAt = new Date('2026-06-04T01:00:00.000Z');

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
    });

    for (const count of Object.values(mocks.counts)) {
      expect(count).toHaveBeenCalledTimes(1);
      expect(count).toHaveBeenCalledWith();
    }
  });
});
