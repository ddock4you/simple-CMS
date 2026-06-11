import type { Metadata } from 'next';

import { getPublishedSubpage } from '@/entities/subpage/api/getSubpage';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { runWithDemoSessionFromCookies } from '@/shared/lib/requestDemoSession';
import { buildSubpageJsonLd } from '@/shared/lib/seo/jsonLd';
import {
  buildDemoPendingTitleMetadata,
  buildMissingMetadata,
  buildSubpageMetadata,
} from '@/shared/lib/seo/metadata';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import { JsonLdScripts } from '@/shared/ui/JsonLdScripts';
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
      return buildDemoPendingTitleMetadata();
    }

    const subpage = await getPublishedSubpage(slug);

    if (!subpage) {
      return buildMissingMetadata('페이지를 찾을 수 없습니다');
    }

    return buildSubpageMetadata(subpage);
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
  const jsonLdItems = buildSubpageJsonLd({ subpage, branding, baseUrl });

  return (
    <>
      <JsonLdScripts items={jsonLdItems} />
      <SubpagePage slug={slug} />
    </>
  );
}
