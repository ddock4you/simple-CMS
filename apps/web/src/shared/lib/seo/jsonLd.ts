import type {
  BreadcrumbItem,
  JsonLdObject,
} from '@/shared/lib/structuredData';
import type { Branding } from '@/shared/lib/brandingCache';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from '@/shared/lib/structuredData';

import { summarizeContent } from './text';
import { getBoardUrl, getHomeUrl, getPostUrl, getSubpageUrl } from './urls';

function compactJsonLd(
  items: Array<JsonLdObject | null | undefined>,
): JsonLdObject[] {
  return items.filter((item): item is JsonLdObject => Boolean(item));
}

function buildBreadcrumb(items: BreadcrumbItem[]): JsonLdObject | null {
  return buildBreadcrumbJsonLd(items);
}

export function buildGlobalJsonLd(input: {
  branding: Branding;
  baseUrl: string;
}): JsonLdObject[] {
  const { branding, baseUrl } = input;

  return [
    buildOrganizationJsonLd({
      siteName: branding.siteName,
      baseUrl,
      logoUrl: branding.logoUrl,
    }),
    buildWebSiteJsonLd({
      siteName: branding.siteName,
      siteDescription: branding.siteDescription,
      baseUrl,
    }),
  ];
}

export function buildSubpageJsonLd(input: {
  subpage: {
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
  };
  branding: Branding;
  baseUrl: string;
}): JsonLdObject[] {
  const { subpage, branding, baseUrl } = input;
  const subpageUrl = getSubpageUrl(baseUrl, subpage.slug);

  return compactJsonLd([
    buildArticleJsonLd({
      url: subpageUrl,
      headline: subpage.seoTitle?.trim() || subpage.title,
      description: subpage.seoDescription?.trim() ?? null,
      publishedAt: subpage.publishedAt,
      modifiedAt: subpage.updatedAt,
      siteName: branding.siteName,
      baseUrl,
      logoUrl: branding.logoUrl,
      imageUrl: branding.ogImageUrl,
    }),
    buildBreadcrumb([
      { name: branding.siteName, url: getHomeUrl(baseUrl) },
      { name: subpage.title, url: subpageUrl },
    ]),
  ]);
}

export function buildBoardJsonLd(input: {
  board: { name: string; slug: string };
  branding: Branding;
  baseUrl: string;
}): JsonLdObject[] {
  const { board, branding, baseUrl } = input;
  const boardUrl = getBoardUrl(baseUrl, board.slug);

  return compactJsonLd([
    buildBreadcrumb([
      { name: branding.siteName, url: getHomeUrl(baseUrl) },
      { name: board.name, url: boardUrl },
    ]),
  ]);
}

export function buildPostJsonLd(input: {
  post: {
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    content: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    author: { name: string | null } | null;
    board: { name: string; slug: string };
  };
  branding: Branding;
  baseUrl: string;
}): JsonLdObject[] {
  const { post, branding, baseUrl } = input;
  const boardUrl = getBoardUrl(baseUrl, post.board.slug);
  const postUrl = getPostUrl(baseUrl, post.board.slug, post.slug);

  return compactJsonLd([
    buildArticleJsonLd({
      url: postUrl,
      headline: post.seoTitle?.trim() || post.title,
      description:
        post.seoDescription?.trim() || summarizeContent(post.content),
      publishedAt: post.publishedAt,
      modifiedAt: post.updatedAt,
      authorName: post.author?.name ?? null,
      siteName: branding.siteName,
      baseUrl,
      logoUrl: branding.logoUrl,
      imageUrl: branding.ogImageUrl,
    }),
    buildBreadcrumb([
      { name: branding.siteName, url: getHomeUrl(baseUrl) },
      { name: post.board.name, url: boardUrl },
      { name: post.title, url: postUrl },
    ]),
  ]);
}
