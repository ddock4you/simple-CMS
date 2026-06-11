import type { Metadata } from 'next';

import type { Branding } from '@/shared/lib/brandingCache';

import { summarizeContent } from './text';

export function buildDemoPendingMetadata(): Metadata {
  return {
    title: '시연 모드',
    description: '시연 세션을 준비하고 있습니다.',
  };
}

export function buildDemoPendingTitleMetadata(): Metadata {
  return { title: '시연 모드' };
}

export function buildMissingMetadata(title: string): Metadata {
  return { title };
}

export function buildRootMetadata(branding: Branding): Metadata {
  const metadata: Metadata = {
    title: {
      default: branding.siteName,
      template: `%s | ${branding.siteName}`,
    },
    description: branding.siteDescription,
  };

  if (branding.faviconUrl) {
    metadata.icons = {
      icon: `${branding.faviconUrl}?v=${branding.faviconMediaId ?? ''}`,
    };
  }

  if (branding.ogImageUrl) {
    metadata.openGraph = {
      images: [
        {
          url: branding.ogImageUrl,
          width: 1200,
          height: 630,
          alt: branding.siteName,
        },
      ],
    };
  }

  return metadata;
}

export function buildSubpageMetadata(subpage: {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}): Metadata {
  const title = subpage.seoTitle || subpage.title;
  const description = subpage.seoDescription || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: subpage.publishedAt?.toISOString(),
      modifiedTime: subpage.updatedAt.toISOString(),
    },
  };
}

export function buildBoardMetadata(board: {
  name: string;
  description: string | null;
}): Metadata {
  return {
    title: board.name,
    description: board.description || `${board.name} 게시판`,
  };
}

export function buildPostMetadata(post: {
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  content: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}): Metadata {
  const title = post.seoTitle?.trim() || post.title;
  const description =
    post.seoDescription?.trim() || summarizeContent(post.content);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}

export function buildSearchMetadata(query: string | undefined): Metadata {
  return {
    title: query ? `"${query}" 검색 결과` : '검색',
  };
}
