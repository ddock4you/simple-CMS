import { demo, prisma } from '@simple-cms/db';

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
}

export async function buildDemoSessionDiagnostics(
  session: RequestDemoSession | null,
): Promise<DemoSessionDiagnostics> {
  const currentSessionId = demo.getCurrentSessionId();

  if (!session) {
    return {
      active: false,
      sessionId: null,
      currentSessionId,
      expiresAt: null,
      counts: null,
    };
  }

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
  };
}
