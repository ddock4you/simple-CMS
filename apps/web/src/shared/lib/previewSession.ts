import { cache } from 'react';
import { cookies } from 'next/headers';

import { demo, prisma } from '@simple-cms/db';
import type { PreviewEntityType } from '@simple-cms/types';

import { PREVIEW_COOKIE_NAME } from './previewCookies';

export interface PreviewSession {
  entityType: PreviewEntityType;
  entityId: string;
}

/**
 * 현재 요청의 preview 쿠키를 읽고 DB에서 토큰 유효성(만료)을 재검증한다.
 * React.cache로 1요청 1쿼리 보장.
 */
export const getPreviewSession = cache(
  async (): Promise<PreviewSession | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(PREVIEW_COOKIE_NAME)?.value;
    if (!token) return null;

    const record = await prisma.previewToken.findUnique({
      where: { token },
      select: { entityType: true, entityId: true, expires: true, sessionId: true },
    });

    if (!record) return null;
    if (record.expires < new Date()) return null;
    if (
      process.env.DEMO_MODE === 'true' &&
      record.sessionId !== demo.getCurrentSessionId()
    ) {
      return null;
    }

    return {
      entityType: record.entityType,
      entityId: record.entityId,
    };
  },
);

/**
 * 특정 엔티티에 대한 preview 모드인지 판정.
 */
export function isPreviewingEntity(
  session: PreviewSession | null,
  entityType: PreviewEntityType,
  entityId: string,
): boolean {
  return (
    session !== null &&
    session.entityType === entityType &&
    session.entityId === entityId
  );
}
