import { describe, expect, it } from 'vitest';

import type { Branding } from '@/shared/lib/brandingCache';

import {
  buildBoardMetadata,
  buildPostMetadata,
  buildRootMetadata,
  buildSearchMetadata,
  buildSubpageMetadata,
} from './metadata';

const branding: Branding = {
  siteName: 'Simple CMS',
  siteDescription: '공개 웹 설명',
  logoUrl: '/uploads/logo.png',
  logoAlt: 'Simple CMS',
  faviconUrl: '/uploads/favicon.png',
  faviconMediaId: 'favicon-media',
  ogImageUrl: '/uploads/og.png',
};

describe('seo metadata builders', () => {
  it('builds root metadata from branding', () => {
    expect(buildRootMetadata(branding)).toEqual({
      title: {
        default: 'Simple CMS',
        template: '%s | Simple CMS',
      },
      description: '공개 웹 설명',
      icons: {
        icon: '/uploads/favicon.png?v=favicon-media',
      },
      openGraph: {
        images: [
          {
            url: '/uploads/og.png',
            width: 1200,
            height: 630,
            alt: 'Simple CMS',
          },
        ],
      },
    });
  });

  it('preserves subpage metadata fallback rules', () => {
    const metadata = buildSubpageMetadata({
      title: '페이지 제목',
      seoTitle: '',
      seoDescription: null,
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(metadata).toMatchObject({
      title: '페이지 제목',
      description: undefined,
      openGraph: {
        title: '페이지 제목',
        description: undefined,
        type: 'article',
        publishedTime: '2026-01-01T00:00:00.000Z',
        modifiedTime: '2026-01-02T00:00:00.000Z',
      },
    });
  });

  it('builds board metadata from board description', () => {
    expect(
      buildBoardMetadata({ name: '공지사항', description: null }),
    ).toEqual({
      title: '공지사항',
      description: '공지사항 게시판',
    });
  });

  it('preserves post metadata fallback rules', () => {
    const metadata = buildPostMetadata({
      title: '게시글 제목',
      seoTitle: '  SEO 제목  ',
      seoDescription: '',
      content: '본문\n내용',
      publishedAt: null,
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(metadata).toMatchObject({
      title: 'SEO 제목',
      description: '본문 내용',
      openGraph: {
        title: 'SEO 제목',
        description: '본문 내용',
        type: 'article',
        publishedTime: undefined,
        modifiedTime: '2026-01-02T00:00:00.000Z',
      },
    });
  });

  it('builds search metadata from query', () => {
    expect(buildSearchMetadata('민원')).toEqual({
      title: '"민원" 검색 결과',
    });
    expect(buildSearchMetadata(undefined)).toEqual({ title: '검색' });
  });
});
