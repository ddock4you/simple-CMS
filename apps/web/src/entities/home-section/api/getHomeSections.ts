import { cache } from 'react';

import { prisma } from '@simple-cms/db';
import type {
  HomeSectionType,
  HeroConfig,
  RecommendedConfig,
  SubCarouselConfig,
  FrequentMenuConfig,
  ShortcutConfig,
  LatestPostsConfig,
  CtaConfig,
  NoticeConfig,
} from '@simple-cms/types';

import {
  parseCtaConfig,
  parseFrequentMenuConfig,
  parseHeroConfig,
  parseLatestPostsConfig,
  parseNoticeConfig,
  parseRecommendedConfig,
  parseShortcutConfig,
  parseSubCarouselConfig,
} from '../lib/parseConfig';

/**
 * 공개 웹 메인 페이지에 렌더링할 섹션 데이터.
 * - 섹션 본문은 configJson 타입별 파싱 후 태그된 유니온으로 반환
 * - LATEST_POSTS의 참조(board + post)는 해결된 상태로 props에 포함
 * - RECOMMENDED는 자유 갤러리 (수동 입력) — 외부 참조 없음
 * - 파싱 실패 섹션은 skip (에러 없이)
 */

export interface ResolvedHeroSection {
  id: string;
  sectionType: 'HERO';
  config: HeroConfig;
}

export interface ResolvedRecommendedSection {
  id: string;
  sectionType: 'RECOMMENDED';
  config: RecommendedConfig;
}

export interface ResolvedShortcutSection {
  id: string;
  sectionType: 'SHORTCUT';
  config: ShortcutConfig;
}

export interface ResolvedFrequentMenuItem {
  title: string;
  href: string;
  openInNewTab: boolean;
  iconUrl: string;
  iconAlt: string;
}

export interface ResolvedFrequentMenuSection {
  id: string;
  sectionType: 'FREQUENT_MENU';
  config: FrequentMenuConfig;
  items: ResolvedFrequentMenuItem[];
}

export interface ResolvedLatestPostsItem {
  id: string;
  title: string;
  href: string;
  publishedAt: Date | null;
}

export interface ResolvedLatestPostsSection {
  id: string;
  sectionType: 'LATEST_POSTS';
  config: LatestPostsConfig;
  boardName: string | null;
  boardSlug: string | null;
  items: ResolvedLatestPostsItem[];
}

export interface ResolvedNoticePostItem {
  id: string;
  title: string;
  href: string;
  publishedAt: Date | null;
  description: string | null;
}

export interface ResolvedCtaSection {
  id: string;
  sectionType: 'CTA';
  config: CtaConfig;
}

export interface ResolvedNoticeSection {
  id: string;
  sectionType: 'NOTICE';
  config: NoticeConfig;
  boardName: string | null;
  boardSlug: string | null;
  featuredItem: ResolvedNoticePostItem | null;
  items: ResolvedNoticePostItem[];
}

export interface ResolvedSubCarouselSection {
  id: string;
  sectionType: 'SUB_CAROUSEL';
  config: SubCarouselConfig;
}

export type ResolvedSection =
  | ResolvedHeroSection
  | ResolvedRecommendedSection
  | ResolvedSubCarouselSection
  | ResolvedFrequentMenuSection
  | ResolvedShortcutSection
  | ResolvedLatestPostsSection
  | ResolvedCtaSection
  | ResolvedNoticeSection;

interface NoticePostRecord {
  id: string;
  title: string;
  slug: string;
  seoDescription: string | null;
  content: string | null;
  publishedAt: Date | null;
  boardId: string;
  board: { slug: string; name: string };
}

export const getHomeSections = cache(async (): Promise<ResolvedSection[]> => {
  // 1. 섹션 목록 조회
  const rawSections = await prisma.homeSection.findMany({
    where: { isVisible: true },
    orderBy: { displayOrder: 'asc' },
    select: {
      id: true,
      sectionType: true,
      configJson: true,
    },
  });

  // 2. 참조 엔티티 ID 수집 (LATEST_POSTS만 해당)
  const latestPostsBoardIds = new Set<string>();
  const latestPostsLimitByBoard = new Map<string, number>();
  const noticeBoardIds = new Set<string>();
  const noticeLimitByBoard = new Map<string, number>();
  const frequentMenuSubpageIds = new Set<string>();
  const frequentMenuBoardIds = new Set<string>();

  const parsedSections: Array<{
    id: string;
    sectionType: HomeSectionType;
    config:
      | HeroConfig
      | RecommendedConfig
      | SubCarouselConfig
      | FrequentMenuConfig
      | ShortcutConfig
      | LatestPostsConfig
      | CtaConfig
      | NoticeConfig;
  }> = [];

  for (const section of rawSections) {
    switch (section.sectionType) {
      case 'HERO': {
        const config = parseHeroConfig(section.configJson);
        if (!config) continue;
        parsedSections.push({ ...section, config });
        break;
      }
      case 'RECOMMENDED': {
        const config = parseRecommendedConfig(section.configJson);
        if (!config) continue;
        parsedSections.push({ ...section, config });
        break;
      }
      case 'SHORTCUT': {
        const config = parseShortcutConfig(section.configJson);
        if (!config) continue;
        parsedSections.push({ ...section, config });
        break;
      }
      case 'FREQUENT_MENU': {
        const config = parseFrequentMenuConfig(section.configJson);
        if (!config) continue;
        for (const item of config.items) {
          if (!item.isVisible) continue;
          if (item.itemType === 'SUBPAGE' && item.subpageId) {
            frequentMenuSubpageIds.add(item.subpageId);
          }
          if (item.itemType === 'BOARD' && item.boardId) {
            frequentMenuBoardIds.add(item.boardId);
          }
        }
        parsedSections.push({ ...section, config });
        break;
      }
      case 'LATEST_POSTS': {
        const config = parseLatestPostsConfig(section.configJson);
        if (!config) continue;
        if (config.boardId) {
          latestPostsBoardIds.add(config.boardId);
          latestPostsLimitByBoard.set(
            config.boardId,
            Math.max(
              latestPostsLimitByBoard.get(config.boardId) ?? 0,
              config.limit,
            ),
          );
        }
        parsedSections.push({ ...section, config });
        break;
      }
      case 'CTA': {
        const config = parseCtaConfig(section.configJson);
        if (!config) continue;
        parsedSections.push({ ...section, config });
        break;
      }
      case 'NOTICE': {
        const config = parseNoticeConfig(section.configJson);
        if (!config) continue;
        if (config.boardId) {
          noticeBoardIds.add(config.boardId);
          noticeLimitByBoard.set(
            config.boardId,
            Math.max(noticeLimitByBoard.get(config.boardId) ?? 0, config.limit),
          );
        }
        parsedSections.push({ ...section, config });
        break;
      }
      case 'SUB_CAROUSEL': {
        const config = parseSubCarouselConfig(section.configJson);
        if (!config) continue;
        parsedSections.push({ ...section, config });
        break;
      }
    }
  }

  // 3. 게시판 참조 배치 조회 (LATEST_POSTS + NOTICE, N+1 방지)
  const [
    boards,
    latestPostGroups,
    noticeBoards,
    noticeImportantGroups,
    noticeRegularGroups,
    frequentMenuSubpages,
    frequentMenuBoards,
  ] = await Promise.all([
    latestPostsBoardIds.size > 0
      ? prisma.board.findMany({
          where: {
            id: { in: Array.from(latestPostsBoardIds) },
            isPublic: true,
          },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    latestPostsBoardIds.size > 0
      ? Promise.all(
          Array.from(latestPostsBoardIds).map((boardId) =>
            prisma.post.findMany({
              where: {
                boardId,
                status: 'PUBLISHED',
                board: { isPublic: true },
              },
              select: {
                id: true,
                title: true,
                slug: true,
                publishedAt: true,
                boardId: true,
                board: { select: { slug: true, name: true } },
              },
              orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
              take: latestPostsLimitByBoard.get(boardId) ?? 0,
            }),
          ),
        )
      : Promise.resolve([]),
    noticeBoardIds.size > 0
      ? prisma.board.findMany({
          where: {
            id: { in: Array.from(noticeBoardIds) },
            isPublic: true,
          },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    noticeBoardIds.size > 0
      ? Promise.all(
          Array.from(noticeBoardIds).map((boardId) =>
            prisma.post.findMany({
              where: {
                boardId,
                status: 'PUBLISHED',
                isImportant: true,
                board: { isPublic: true },
              },
              select: {
                id: true,
                title: true,
                slug: true,
                seoDescription: true,
                content: true,
                publishedAt: true,
                boardId: true,
                board: { select: { slug: true, name: true } },
              },
              orderBy: { publishedAt: 'desc' },
              take: 1,
            }),
          ),
        )
      : Promise.resolve([]),
    noticeBoardIds.size > 0
      ? Promise.all(
          Array.from(noticeBoardIds).map((boardId) =>
            prisma.post.findMany({
              where: {
                boardId,
                status: 'PUBLISHED',
                isImportant: false,
                board: { isPublic: true },
              },
              select: {
                id: true,
                title: true,
                slug: true,
                seoDescription: true,
                content: true,
                publishedAt: true,
                boardId: true,
                board: { select: { slug: true, name: true } },
              },
              orderBy: { publishedAt: 'desc' },
              take: noticeLimitByBoard.get(boardId) ?? 0,
            }),
          ),
        )
      : Promise.resolve([]),
    frequentMenuSubpageIds.size > 0
      ? prisma.subpage.findMany({
          where: {
            id: { in: Array.from(frequentMenuSubpageIds) },
            status: 'PUBLISHED',
          },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
    frequentMenuBoardIds.size > 0
      ? prisma.board.findMany({
          where: {
            id: { in: Array.from(frequentMenuBoardIds) },
            isPublic: true,
          },
          select: { id: true, slug: true },
        })
      : Promise.resolve([]),
  ]);

  const boardMap = new Map(boards.map((b) => [b.id, b]));
  const latestPostsByBoard = latestPostGroups.flat();
  const postsByBoard = new Map<string, typeof latestPostsByBoard>();
  for (const post of latestPostsByBoard) {
    const existing = postsByBoard.get(post.boardId) ?? [];
    existing.push(post);
    postsByBoard.set(post.boardId, existing);
  }

  const noticeBoardMap = new Map(noticeBoards.map((b) => [b.id, b]));
  const importantNoticePostsByBoard = groupPostsByBoard(
    noticeImportantGroups.flat(),
  );
  const regularNoticePostsByBoard = groupPostsByBoard(
    noticeRegularGroups.flat(),
  );
  const frequentMenuSubpageSlugMap = new Map(
    frequentMenuSubpages.map((item) => [item.id, item.slug]),
  );
  const frequentMenuBoardSlugMap = new Map(
    frequentMenuBoards.map((item) => [item.id, item.slug]),
  );

  // 4. 섹션별 최종 결과 조립
  const resolved: ResolvedSection[] = [];
  for (const section of parsedSections) {
    switch (section.sectionType) {
      case 'HERO':
        resolved.push({
          id: section.id,
          sectionType: 'HERO',
          config: section.config as HeroConfig,
        });
        break;
      case 'RECOMMENDED':
        resolved.push({
          id: section.id,
          sectionType: 'RECOMMENDED',
          config: section.config as RecommendedConfig,
        });
        break;
      case 'SHORTCUT':
        resolved.push({
          id: section.id,
          sectionType: 'SHORTCUT',
          config: section.config as ShortcutConfig,
        });
        break;
      case 'FREQUENT_MENU': {
        const config = section.config as FrequentMenuConfig;
        resolved.push({
          id: section.id,
          sectionType: 'FREQUENT_MENU',
          config,
          items: resolveFrequentMenuItems(
            config,
            frequentMenuSubpageSlugMap,
            frequentMenuBoardSlugMap,
          ),
        });
        break;
      }
      case 'LATEST_POSTS': {
        const config = section.config as LatestPostsConfig;
        const board = config.boardId ? boardMap.get(config.boardId) : null;
        const posts = config.boardId
          ? (postsByBoard.get(config.boardId) ?? []).slice(0, config.limit)
          : [];
        const items: ResolvedLatestPostsItem[] = posts.map((p) => ({
          id: p.id,
          title: p.title,
          href: `/board/${p.board.slug}/${p.slug}`,
          publishedAt: p.publishedAt,
        }));
        resolved.push({
          id: section.id,
          sectionType: 'LATEST_POSTS',
          config,
          boardName: board?.name ?? null,
          boardSlug: board?.slug ?? null,
          items,
        });
        break;
      }
      case 'CTA':
        resolved.push({
          id: section.id,
          sectionType: 'CTA',
          config: section.config as CtaConfig,
        });
        break;
      case 'NOTICE': {
        const config = section.config as NoticeConfig;
        const board = config.boardId
          ? noticeBoardMap.get(config.boardId)
          : null;
        const importantPost = config.boardId
          ? (importantNoticePostsByBoard.get(config.boardId)?.[0] ?? null)
          : null;
        const regularPosts = config.boardId
          ? (regularNoticePostsByBoard.get(config.boardId) ?? []).slice(
              0,
              config.limit,
            )
          : [];

        resolved.push({
          id: section.id,
          sectionType: 'NOTICE',
          config,
          boardName: board?.name ?? null,
          boardSlug: board?.slug ?? null,
          featuredItem: importantPost ? toNoticePostItem(importantPost) : null,
          items: regularPosts.map(toNoticePostItem),
        });
        break;
      }
      case 'SUB_CAROUSEL':
        resolved.push({
          id: section.id,
          sectionType: 'SUB_CAROUSEL',
          config: section.config as SubCarouselConfig,
        });
        break;
    }
  }

  return resolved;
});

function groupPostsByBoard<T extends { boardId: string }>(
  posts: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const post of posts) {
    const existing = grouped.get(post.boardId) ?? [];
    existing.push(post);
    grouped.set(post.boardId, existing);
  }
  return grouped;
}

function toNoticePostItem(post: NoticePostRecord): ResolvedNoticePostItem {
  return {
    id: post.id,
    title: post.title,
    href: `/board/${post.board.slug}/${post.slug}`,
    publishedAt: post.publishedAt,
    description: normalizeSummary(post.seoDescription ?? post.content),
  };
}

function resolveFrequentMenuItems(
  config: FrequentMenuConfig,
  subpageSlugMap: Map<string, string>,
  boardSlugMap: Map<string, string>,
): ResolvedFrequentMenuItem[] {
  return config.items
    .slice(0, 6)
    .flatMap((item): ResolvedFrequentMenuItem[] => {
      if (!item.isVisible || !item.iconUrl || !item.title) return [];

      const href = resolveFrequentMenuHref(item, subpageSlugMap, boardSlugMap);
      if (!href) return [];

      return [
        {
          title: item.title,
          href,
          openInNewTab: item.openInNewTab,
          iconUrl: item.iconUrl,
          iconAlt: item.iconAlt || `${item.title} 아이콘`,
        },
      ];
    });
}

function resolveFrequentMenuHref(
  item: FrequentMenuConfig['items'][number],
  subpageSlugMap: Map<string, string>,
  boardSlugMap: Map<string, string>,
): string | null {
  switch (item.itemType) {
    case 'SUBPAGE': {
      const slug = item.subpageId ? subpageSlugMap.get(item.subpageId) : null;
      return slug ? `/p/${slug}` : null;
    }
    case 'BOARD': {
      const slug = item.boardId ? boardSlugMap.get(item.boardId) : null;
      return slug ? `/board/${slug}` : null;
    }
    case 'EXTERNAL':
    case 'CUSTOM':
      return item.url?.trim() || null;
  }
}

function normalizeSummary(value: string | null | undefined): string | null {
  const summary = value?.replace(/\s+/g, ' ').trim();
  if (!summary) return null;
  return summary.length > 120 ? `${summary.slice(0, 120)}...` : summary;
}
