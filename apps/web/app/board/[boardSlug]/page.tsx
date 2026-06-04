import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedBoard } from '@/entities/board/api/getBoard';
import { resolveContentNavigation } from '@/entities/navigation/lib/resolveContentNavigation';
import { getPublishedPosts } from '@/entities/post/api/getPostList';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { enterDemoSessionFromCookies } from '@/shared/lib/requestDemoSession';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import {
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/shared/lib/structuredData';
import { BoardPage } from '@/pages/board/ui/BoardPage';

interface PageProps {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const demoSession = await enterDemoSessionFromCookies();
  if (process.env.DEMO_MODE === 'true' && !demoSession) {
    return { title: '시연 모드' };
  }

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
  const { page: pageParam, q: queryParam } = await searchParams;

  const board = await getPublishedBoard(boardSlug);
  if (!board) notFound();

  const query = queryParam?.trim() || undefined;
  const page = Math.max(1, Number(pageParam) || 1);
  const [posts, navigationBranch] = await Promise.all([
    getPublishedPosts(board.id, page, undefined, query),
    resolveContentNavigation(`/board/${boardSlug}`, board.name),
  ]);

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
      <BoardPage
        board={board}
        posts={posts}
        query={query ?? ''}
        navigationBranch={navigationBranch}
      />
    </>
  );
}
