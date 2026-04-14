import type { Metadata } from 'next';

import { getPublishedSubpage } from '@/entities/subpage/api/getSubpage';
import { SubpagePage } from '@/pages/subpage/ui/SubpagePage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
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
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <SubpagePage slug={slug} />;
}
