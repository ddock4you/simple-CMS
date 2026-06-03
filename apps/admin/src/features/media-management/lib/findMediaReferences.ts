import { prisma, demo } from '@simple-cms/db';
import { SITE_SETTING_KEYS, type MediaReference } from '@simple-cms/types';

import {
  MEDIA_BEARING_SETTING_KEYS,
  MEDIA_BEARING_SETTING_LABELS,
  type MediaBearingSettingKey,
} from './mediaBearingSettings';

/** Tiptap JSON 노드 트리에 특정 mediaId를 가진 image 노드가 있는지 재귀 탐색한다. */
export function containsMediaReference(
  node: unknown,
  mediaId: string,
): boolean {
  if (!node || typeof node !== 'object') return false;
  const n = node as {
    type?: string;
    attrs?: { mediaId?: unknown };
    content?: unknown;
  };
  if (n.type === 'image' && n.attrs?.mediaId === mediaId) return true;
  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      if (containsMediaReference(child, mediaId)) return true;
    }
  }
  return false;
}

/**
 * 한 Media가 어디에서 사용 중인지 추적한다.
 *
 * 스캔 대상:
 * 1. Subpage.featuredImageId (FK)
 * 2. Post.featuredImageId (FK)
 * 3. HomeSection.configJson (JSONB: HERO slides[i].mediaId, BRIEF_INTRO mediaId, RECOMMENDED items[i].mediaId)
 * 4. Post.contentJson (Tiptap JSON: image 노드의 attrs.mediaId)
 * 5. HomePopup.imageMediaId (FK, Stage 5b)
 * 6. PageBlock IMAGE 블록 configJson.imageMediaId (JSONB containment, Stage 6)
 * 7. PageBlock RICH_TEXT 블록 configJson.contentJson (Tiptap JSON 재귀, Stage 6 — 통합 블록 모델)
 * 8. SiteSettings via MEDIA_BEARING_SETTING_KEYS 화이트리스트 (Stage 7l — LOGO/FAVICON/OG_IMAGE)
 * 9. SITE_FOOTER_CONFIG.footerLogoMediaId (Stage 20 follow-up — 푸터 로고)
 *
 * 서브페이지 본문은 RICH_TEXT 블록으로 흡수되어 Subpage.contentJson 경로는 더 이상 존재하지 않는다.
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
  // HERO: configJson.slides[i].mediaId, BRIEF_INTRO: configJson.mediaId, RECOMMENDED/SUB_CAROUSEL: configJson.items[i].mediaId,
  // FREQUENT_MENU: configJson.items[i].iconMediaId
  // PostgreSQL의 jsonb @> 연산자는 배열 안 객체 부분 매칭을 지원한다.
  type HomeSectionRaw = {
    id: string;
    sectionType: string;
    title: string;
  };
  // 시연 모드 격리: $queryRaw는 extension query hook을 우회하므로 sessionId 필터를 명시.
  const sessionId = demo.getCurrentSessionId();
  const homeSectionMatches = await prisma.$queryRaw<HomeSectionRaw[]>`
    SELECT id, "sectionType", title
    FROM "HomeSection"
    WHERE "sessionId" = ${sessionId}
      AND (("configJson" -> 'slides') @> ${JSON.stringify([{ mediaId }])}::jsonb
        OR "configJson" @> ${JSON.stringify({ mediaId })}::jsonb
        OR ("configJson" -> 'items') @> ${JSON.stringify([{ mediaId }])}::jsonb
        OR ("configJson" -> 'items') @> ${JSON.stringify([{ iconMediaId: mediaId }])}::jsonb)
  `;
  for (const sec of homeSectionMatches) {
    references.push({
      type: 'HOME_SECTION',
      entityId: sec.id,
      label: sec.title,
      context: `메인 섹션 — ${sec.sectionType}`,
    });
  }

  // ─── 4. Post.contentJson (Tiptap JSON 재귀 탐색) ─────────────
  // 현재 규모(수백 건) 기준으로 인메모리 탐색이 충분.
  // 향후 성능 이슈 시 JSONB GIN 인덱스 + jsonb_path_query 최적화 가능.
  const postsWithContent = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      contentJson: true,
      board: { select: { name: true } },
    },
  });
  for (const post of postsWithContent) {
    if (containsMediaReference(post.contentJson, mediaId)) {
      references.push({
        type: 'POST_CONTENT',
        entityId: post.id,
        label: post.title,
        context: `게시글 본문 — ${post.board.name}`,
      });
    }
  }

  // ─── 5. HomePopup.imageMediaId (Stage 5b) ────────────────────
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

  // ─── 6. PageBlock IMAGE 블록 configJson.imageMediaId / items[].imageMediaId ──
  // JSONB containment 연산자로 legacy 단일 이미지와 다중 이미지 items를 함께 스캔.
  // Subpage를 JOIN하여 사용자에게 "어떤 서브페이지의 블록인지" 표시.
  type PageBlockRaw = {
    id: string;
    subpageTitle: string;
  };
  // 시연 모드 격리: PageBlock + Subpage JOIN 양쪽 모두 sessionId 일치 검증
  const blockMatches = await prisma.$queryRaw<PageBlockRaw[]>`
    SELECT pb.id, sp.title AS "subpageTitle"
    FROM "PageBlock" pb
    JOIN "Subpage" sp ON sp.id = pb."subpageId" AND sp."sessionId" = ${sessionId}
    WHERE pb."sessionId" = ${sessionId}
      AND pb."blockType" = 'IMAGE'
      AND (
        pb."configJson" @> ${JSON.stringify({ imageMediaId: mediaId })}::jsonb
        OR pb."configJson" @> ${JSON.stringify({ items: [{ imageMediaId: mediaId }] })}::jsonb
      )
  `;
  for (const b of blockMatches) {
    references.push({
      type: 'PAGE_BLOCK_IMAGE',
      entityId: b.id,
      label: b.subpageTitle,
      context: '서브페이지 블록 이미지',
    });
  }

  // ─── 7. PageBlock RICH_TEXT 블록 configJson.contentJson Tiptap 재귀 (Stage 6 — 통합 블록 모델) ──
  // 기존 Subpage.contentJson 재귀 경로를 대체. contentJson은 RICH_TEXT 블록 안에 있음.
  const richTextBlocks = await prisma.pageBlock.findMany({
    where: { blockType: 'RICH_TEXT' },
    select: {
      id: true,
      configJson: true,
      subpage: { select: { title: true } },
    },
  });
  for (const b of richTextBlocks) {
    const cfg = b.configJson as { contentJson?: unknown } | null;
    if (cfg?.contentJson && containsMediaReference(cfg.contentJson, mediaId)) {
      references.push({
        type: 'PAGE_BLOCK_IMAGE',
        entityId: b.id,
        label: b.subpage.title,
        context: '서브페이지 본문 블록 (이미지 포함)',
      });
    }
  }

  // ─── 8. SiteSettings 화이트리스트 (Stage 7l — LOGO/FAVICON/OG_IMAGE) ──
  // value === mediaId인 키만 직접 매칭. 키는 화이트리스트로 한정하여 비-미디어 키 풀스캔 회피.
  const settingMatches = await prisma.siteSettings.findMany({
    where: {
      key: { in: [...MEDIA_BEARING_SETTING_KEYS] },
      value: mediaId,
    },
    select: { key: true },
  });
  for (const s of settingMatches) {
    const meta = MEDIA_BEARING_SETTING_LABELS[s.key as MediaBearingSettingKey];
    if (meta) {
      references.push({
        type: 'SITE_SETTINGS',
        entityId: 'SITE_BRANDING',
        label: meta.label,
        context: meta.context,
      });
    }
  }

  // ─── 9. SiteSettings SITE_FOOTER_CONFIG.footerLogoMediaId ────────────────
  const footerConfigSetting = await prisma.siteSettings.findFirst({
    where: { key: SITE_SETTING_KEYS.SITE_FOOTER_CONFIG },
    select: { value: true },
  });
  if (footerConfigSetting?.value) {
    try {
      const parsed = JSON.parse(footerConfigSetting.value) as {
        footerLogoMediaId?: unknown;
      };
      if (parsed.footerLogoMediaId === mediaId) {
        references.push({
          type: 'SITE_SETTINGS',
          entityId: SITE_SETTING_KEYS.SITE_FOOTER_CONFIG,
          label: '푸터 설정 — 로고',
          context: '사이트 설정',
        });
      }
    } catch {
      // 설정 JSON 손상은 미디어 삭제 판단을 차단하지 않는다.
    }
  }

  return references;
}
