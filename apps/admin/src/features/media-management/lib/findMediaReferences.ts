import { prisma } from '@simple-cms/db';
import type { MediaReference } from '@simple-cms/types';

/**
 * 한 Media가 어디에서 사용 중인지 추적한다.
 *
 * 스캔 대상:
 * 1. Subpage.featuredImageId (FK)
 * 2. Post.featuredImageId (FK)
 * 3. HomeSection.configJson (JSONB: HERO slides[i].mediaId, RECOMMENDED items[i].mediaId)
 * 4. Subpage.contentJson (Tiptap JSON: image 노드의 attrs.mediaId)
 * 5. Post.contentJson (동일)
 * 6. HomePopup.imageMediaId (FK, Stage 5b)
 *
 * Media 삭제 전 차단 판정 + 사용처 안내에 사용한다.
 */
export async function findMediaReferences(
  mediaId: string,
): Promise<MediaReference[]> {
  const references: MediaReference[] = [];

  // ─── 1. Subpage.featuredImageId ──────────────────────────────
  const subpagesByFeatured = await prisma.subpage.findMany({
    where: { featuredImageId: mediaId },
    select: { id: true, title: true },
  });
  for (const sp of subpagesByFeatured) {
    references.push({
      type: 'SUBPAGE_FEATURED',
      entityId: sp.id,
      label: sp.title,
      context: '서브 페이지 대표 이미지',
    });
  }

  // ─── 2. Post.featuredImageId ─────────────────────────────────
  const postsByFeatured = await prisma.post.findMany({
    where: { featuredImageId: mediaId },
    select: {
      id: true,
      title: true,
      board: { select: { name: true } },
    },
  });
  for (const post of postsByFeatured) {
    references.push({
      type: 'POST_FEATURED',
      entityId: post.id,
      label: post.title,
      context: `게시글 대표 이미지 — ${post.board.name}`,
    });
  }

  // ─── 3. HomeSection.configJson (JSONB containment) ───────────
  // HERO: configJson.slides[i].mediaId, RECOMMENDED: configJson.items[i].mediaId
  // PostgreSQL의 jsonb @> 연산자는 배열 안 객체 부분 매칭을 지원한다.
  type HomeSectionRaw = {
    id: string;
    sectionType: string;
    title: string;
  };
  const homeSectionMatches = await prisma.$queryRaw<HomeSectionRaw[]>`
    SELECT id, "sectionType", title
    FROM "HomeSection"
    WHERE ("configJson" -> 'slides') @> ${JSON.stringify([{ mediaId }])}::jsonb
       OR ("configJson" -> 'items') @> ${JSON.stringify([{ mediaId }])}::jsonb
  `;
  for (const sec of homeSectionMatches) {
    references.push({
      type: 'HOME_SECTION',
      entityId: sec.id,
      label: sec.title,
      context: `메인 섹션 — ${sec.sectionType}`,
    });
  }

  // ─── 4-5. Subpage/Post contentJson (Tiptap JSON 재귀 탐색) ──
  // 현재 규모(수백 건) 기준으로 인메모리 탐색이 충분.
  // 향후 성능 이슈 시 JSONB GIN 인덱스 + jsonb_path_query 최적화 가능.
  const usedMediaIds = (json: unknown): boolean => {
    if (!json || typeof json !== 'object') return false;
    const node = json as { type?: string; attrs?: { mediaId?: unknown }; content?: unknown };
    if (node.type === 'image' && node.attrs?.mediaId === mediaId) {
      return true;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (usedMediaIds(child)) return true;
      }
    }
    return false;
  };

  const subpagesWithContent = await prisma.subpage.findMany({
    select: { id: true, title: true, contentJson: true },
  });
  for (const sp of subpagesWithContent) {
    if (usedMediaIds(sp.contentJson)) {
      references.push({
        type: 'SUBPAGE_CONTENT',
        entityId: sp.id,
        label: sp.title,
        context: '서브 페이지 본문',
      });
    }
  }

  const postsWithContent = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      contentJson: true,
      board: { select: { name: true } },
    },
  });
  for (const post of postsWithContent) {
    if (usedMediaIds(post.contentJson)) {
      references.push({
        type: 'POST_CONTENT',
        entityId: post.id,
        label: post.title,
        context: `게시글 본문 — ${post.board.name}`,
      });
    }
  }

  // ─── 6. HomePopup.imageMediaId (Stage 5b) ────────────────────
  const popupsByMedia = await prisma.homePopup.findMany({
    where: { imageMediaId: mediaId },
    select: { id: true, title: true },
  });
  for (const popup of popupsByMedia) {
    references.push({
      type: 'HOME_POPUP',
      entityId: popup.id,
      label: popup.title,
      context: '메인 팝업 이미지',
    });
  }

  return references;
}
