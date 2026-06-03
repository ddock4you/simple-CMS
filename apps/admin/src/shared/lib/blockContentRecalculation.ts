import { prisma } from '@simple-cms/db';
import { extractTextFromTiptap } from '@simple-cms/editor';

type SearchableBlock = {
  blockType: string;
  configJson: unknown;
};

function extractAccordionText(configJson: unknown): string | null {
  const cfg = configJson as {
    heading?: unknown;
    description?: unknown;
    items?: unknown;
  } | null;
  const parts: string[] = [];

  if (typeof cfg?.heading === 'string' && cfg.heading.trim()) {
    parts.push(cfg.heading.trim());
  }
  if (typeof cfg?.description === 'string' && cfg.description.trim()) {
    parts.push(cfg.description.trim());
  }
  if (Array.isArray(cfg?.items)) {
    for (const item of cfg.items) {
      if (!item || typeof item !== 'object') continue;
      const accordionItem = item as { title?: unknown; body?: unknown };
      if (typeof accordionItem.title === 'string' && accordionItem.title.trim()) {
        parts.push(accordionItem.title.trim());
      }
      if (typeof accordionItem.body === 'string' && accordionItem.body.trim()) {
        parts.push(accordionItem.body.trim());
      }
    }
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * RICH_TEXT 블록 배열(이미 RICH_TEXT 필터 + displayOrder 정렬된 상태)에서
 * Subpage.content로 저장할 plain text를 생성한다.
 *
 * 각 블록의 contentJson을 plain text로 변환하고 '\n\n'으로 이어붙인다.
 * 유효 텍스트가 없으면 null을 반환한다.
 */
export function computeBlocksContent(
  blocks: SearchableBlock[],
): string | null {
  const parts: string[] = [];
  for (const b of blocks) {
    const text =
      b.blockType === 'RICH_TEXT'
        ? (() => {
            const cfg = b.configJson as { contentJson?: unknown } | null;
            if (!cfg?.contentJson) return null;
            return extractTextFromTiptap(
              cfg.contentJson as Record<string, unknown>,
            );
          })()
        : b.blockType === 'ACCORDION'
          ? extractAccordionText(b.configJson)
          : null;
    if (text && text.trim()) parts.push(text);
  }
  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
  * 서브페이지의 검색용 plain text(`Subpage.content`)를 검색 대상 블록 기반으로 재집계한다.
 *
 * 호출 시점: 블록 CUD(POST/PATCH/DELETE/reorder) 직후.
  * - displayOrder 순으로 RICH_TEXT/ACCORDION 블록의 plain text를 추출
 * - 각 블록의 plain text를 개행 2개로 이어붙여 최종 content 생성
 * - RICH_TEXT 블록이 없으면 content는 null
 *
 * PGroonga 검색 인덱스는 Subpage.content를 사용하므로 이 재집계로 검색 결과가 최신 상태로 유지된다.
 * 실패 시 블록 변경 트랜잭션을 롤백하지 않는다 — 검색 인덱스는 다음 변경 시 복구되므로 fire-and-forget 방식.
 */
export async function recalculateSubpageContent(
  subpageId: string,
): Promise<void> {
  try {
    const blocks = await prisma.pageBlock.findMany({
      where: { subpageId, blockType: { in: ['RICH_TEXT', 'ACCORDION'] } },
      orderBy: { displayOrder: 'asc' },
      select: { blockType: true, configJson: true },
    });

    const content = computeBlocksContent(blocks);
    await prisma.subpage.update({
      where: { id: subpageId },
      data: { content },
    });
  } catch (err) {
    console.error('[recalculateSubpageContent] Failed:', err);
  }
}
