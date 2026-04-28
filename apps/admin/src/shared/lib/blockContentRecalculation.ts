import { prisma } from '@simple-cms/db';
import { extractTextFromTiptap } from '@simple-cms/editor';

/**
 * RICH_TEXT 블록 배열(이미 RICH_TEXT 필터 + displayOrder 정렬된 상태)에서
 * Subpage.content로 저장할 plain text를 생성한다.
 *
 * 각 블록의 contentJson을 plain text로 변환하고 '\n\n'으로 이어붙인다.
 * 유효 텍스트가 없으면 null을 반환한다.
 */
export function computeBlocksContent(
  blocks: Array<{ configJson: unknown }>,
): string | null {
  const parts: string[] = [];
  for (const b of blocks) {
    const cfg = b.configJson as { contentJson?: unknown } | null;
    if (!cfg?.contentJson) continue;
    const text = extractTextFromTiptap(
      cfg.contentJson as Record<string, unknown>,
    );
    if (text && text.trim()) parts.push(text);
  }
  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * 서브페이지의 검색용 plain text(`Subpage.content`)를 RICH_TEXT 블록 기반으로 재집계한다.
 *
 * 호출 시점: 블록 CUD(POST/PATCH/DELETE/reorder) 직후.
 * - displayOrder 순으로 모든 RICH_TEXT 블록의 contentJson을 추출
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
      where: { subpageId, blockType: 'RICH_TEXT' },
      orderBy: { displayOrder: 'asc' },
      select: { configJson: true },
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
