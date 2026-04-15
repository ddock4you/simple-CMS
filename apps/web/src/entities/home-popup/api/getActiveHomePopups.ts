import { cache } from 'react';

import { prisma } from '@simple-cms/db';
import type { HomePopupType } from '@simple-cms/types';

import { renderTiptapContent } from '@/shared/lib/renderContent';

export interface ActiveHomePopup {
  id: string;
  popupType: HomePopupType;
  title: string;
  contentHtml: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  linkUrl: string | null;
  buttonLabel: string | null;
}

/**
 * 메인 페이지에 노출할 활성 팝업 목록.
 * - isVisible = true
 * - 현재 시각 기준 startDate/endDate 범위 내
 * - displayOrder asc 정렬
 * - CONTENT 타입은 서버에서 Tiptap JSON → HTML + DOMPurify
 */
export const getActiveHomePopups = cache(
  async (): Promise<ActiveHomePopup[]> => {
    const now = new Date();
    const popups = await prisma.homePopup.findMany({
      where: {
        isVisible: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        popupType: true,
        title: true,
        contentJson: true,
        imageUrl: true,
        imageAlt: true,
        linkUrl: true,
        buttonLabel: true,
      },
    });

    return popups.map((p) => ({
      id: p.id,
      popupType: p.popupType,
      title: p.title,
      contentHtml:
        p.popupType === 'CONTENT' ? renderTiptapContent(p.contentJson) : null,
      imageUrl: p.imageUrl,
      imageAlt: p.imageAlt,
      linkUrl: p.linkUrl,
      buttonLabel: p.buttonLabel,
    }));
  },
);
