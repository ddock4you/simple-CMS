import { describe, expect, it } from 'vitest';

import type { Branding } from '@/shared/lib/brandingCache';
import { serializeJsonLd } from '@/shared/lib/structuredData';

import {
  buildBoardJsonLd,
  buildGlobalJsonLd,
  buildPostJsonLd,
  buildSubpageJsonLd,
} from './jsonLd';

const branding: Branding = {
  siteName: 'Simple CMS',
  siteDescription: '공개 웹 설명',
  logoUrl: 'https://example.com/logo.png',
  logoAlt: 'Simple CMS',
  faviconUrl: null,
  faviconMediaId: null,
  ogImageUrl: 'https://example.com/og.png',
};

describe('seo JSON-LD builders', () => {
  it('builds global organization and website JSON-LD', () => {
    const items = buildGlobalJsonLd({
      branding,
      baseUrl: 'https://example.com',
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      '@type': 'Organization',
      name: 'Simple CMS',
      url: 'https://example.com',
    });
    expect(items[1]).toMatchObject({
      '@type': 'WebSite',
      name: 'Simple CMS',
      url: 'https://example.com',
    });
  });

  it('builds subpage article and breadcrumb JSON-LD', () => {
    const items = buildSubpageJsonLd({
      branding,
      baseUrl: 'https://example.com',
      subpage: {
        title: '소개',
        slug: 'about',
        seoTitle: null,
        seoDescription: '소개 설명',
        publishedAt: null,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      '@type': 'Article',
      headline: '소개',
      mainEntityOfPage: {
        '@id': 'https://example.com/p/about',
      },
    });
    expect(items[1]).toMatchObject({
      '@type': 'BreadcrumbList',
    });
  });

  it('builds board breadcrumb JSON-LD', () => {
    const items = buildBoardJsonLd({
      branding,
      baseUrl: 'https://example.com',
      board: { name: '공지사항', slug: 'notice' },
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      '@type': 'BreadcrumbList',
    });
  });

  it('builds post article and breadcrumb JSON-LD', () => {
    const items = buildPostJsonLd({
      branding,
      baseUrl: 'https://example.com',
      post: {
        title: '게시글',
        slug: 'post-1',
        seoTitle: null,
        seoDescription: null,
        content: '게시글 본문',
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        author: { name: '작성자' },
        board: { name: '공지사항', slug: 'notice' },
      },
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      '@type': 'Article',
      headline: '게시글',
      description: '게시글 본문',
      mainEntityOfPage: {
        '@id': 'https://example.com/board/notice/post-1',
      },
    });
  });

  it('escapes JSON-LD script-closing content', () => {
    expect(
      serializeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Thing',
        name: '</script><script>alert(1)</script>',
      }),
    ).toContain('\\u003c/script>');
  });
});
