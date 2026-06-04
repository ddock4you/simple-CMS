import type { Metadata } from 'next';

import { getPublishedSubpage } from '@/entities/subpage/api/getSubpage';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { runWithDemoSessionFromCookies } from '@/shared/lib/requestDemoSession';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/shared/lib/structuredData';
import { SubpagePage } from '@/pages/subpage/ui/SubpagePage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return runWithDemoSessionFromCookies(`/p/${slug}`, async (demoSession) => {
    if (process.env.DEMO_MODE === 'true' && !demoSession) {
      return { title: '시연 모드' };
    }

    const subpage = await getPublishedSubpage(slug);

    if (!subpage) {
      return { title: '페이지를 찾을 수 없습니다' };
    }

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
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return runWithDemoSessionFromCookies(
    `/p/${slug}`,
    async () => renderSubpageRoute(slug),
    { required: true },
  );
}

async function renderSubpageRoute(slug: string) {
  const subpage = await getPublishedSubpage(slug);

  if (!subpage) {
    return <SubpagePage slug={slug} />;
  }

  const [branding, baseUrl] = await Promise.all([
    getCachedBranding(),
    getSiteUrl(),
  ]);
  const subpageUrl = `${baseUrl}/p/${slug}`;
  const articleJsonLd = buildArticleJsonLd({
    url: subpageUrl,
    headline: subpage.seoTitle?.trim() || subpage.title,
    description: subpage.seoDescription?.trim() ?? null,
    publishedAt: subpage.publishedAt,
    modifiedAt: subpage.updatedAt,
    siteName: branding.siteName,
    baseUrl,
    logoUrl: branding.logoUrl,
    imageUrl: branding.ogImageUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: branding.siteName, url: baseUrl },
    { name: subpage.title, url: subpageUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        />
      )}
      <SubpagePage slug={slug} />
    </>
  );
}
