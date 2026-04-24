import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedBoard } from '@/entities/board/api/getBoard';
import { getPublishedPosts } from '@/entities/post/api/getPostList';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import {
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/shared/lib/structuredData';
import { BoardPage } from '@/pages/board/ui/BoardPage';

interface PageProps {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { boardSlug } = await params;
  const board = await getPublishedBoard(boardSlug);

  if (!board) {
    return { title: '게시판을 찾을 수 없습니다' };
  }

  return {
    title: board.name,
    description: board.description || `${board.name} 게시판`,
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { boardSlug } = await params;
  const { page: pageParam } = await searchParams;

  const board = await getPublishedBoard(boardSlug);
  if (!board) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const posts = await getPublishedPosts(board.id, page);

  const [branding, baseUrl] = await Promise.all([
    getCachedBranding(),
    getSiteUrl(),
  ]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: branding.siteName, url: baseUrl },
    { name: board.name, url: `${baseUrl}/board/${boardSlug}` },
  ]);

  return (
    <>
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        />
      )}
      <BoardPage board={board} posts={posts} />
    </>
  );
}
