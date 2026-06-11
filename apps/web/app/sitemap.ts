import type { MetadataRoute } from 'next';

import { prisma } from '@simple-cms/db';

import {
  buildDemoSitemap,
  buildPublicSitemap,
} from '@/shared/lib/seo/sitemap';
import { getSiteUrl } from '@/shared/lib/siteUrl';

// sitemap.xml은 visitor와 무관한 공개 콘텐츠 URL 목록이라 시연/운영 모두 5분 ISR로 통일.
// 시연 모드는 X-Robots-Tag로 검색엔진 차단되어 실 트래픽 거의 없음(영향 미미).
// 콘텐츠 추가/발행 시 admin이 revalidatePath('/sitemap.xml') 호출하면 즉시 무효화 가능.
// Next.js route config는 literal만 허용 → ternary 사용 불가, 단일 값 명시.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  if (process.env.DEMO_MODE === 'true') {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return buildDemoSitemap({ baseUrl, now });
  }

  const baseUrl = await getSiteUrl();

  const [subpages, boards, posts] = await Promise.all([
    prisma.subpage.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.board.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        board: { isPublic: true },
      },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        board: { select: { slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return buildPublicSitemap({ baseUrl, now, subpages, boards, posts });
}
