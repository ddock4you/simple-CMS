import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedBoard } from '@/entities/board/api/getBoard';
import { resolveContentNavigation } from '@/entities/navigation/lib/resolveContentNavigation';
import { getPublishedPosts } from '@/entities/post/api/getPostList';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { runWithDemoSessionFromCookies } from '@/shared/lib/requestDemoSession';
import { buildBoardJsonLd } from '@/shared/lib/seo/jsonLd';
import {
  buildBoardMetadata,
  buildDemoPendingTitleMetadata,
  buildMissingMetadata,
} from '@/shared/lib/seo/metadata';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import { JsonLdScripts } from '@/shared/ui/JsonLdScripts';
import { BoardPage } from '@/pages/board/ui/BoardPage';

interface PageProps {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { boardSlug } = await params;
  return runWithDemoSessionFromCookies(
    `/board/${boardSlug}`,
    async (demoSession) => {
      if (process.env.DEMO_MODE === 'true' && !demoSession) {
        return buildDemoPendingTitleMetadata();
      }

      const board = await getPublishedBoard(boardSlug);

      if (!board) {
        return buildMissingMetadata('게시판을 찾을 수 없습니다');
      }

      return buildBoardMetadata(board);
    },
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const { boardSlug } = await params;
  const { page: pageParam, q: queryParam } = await searchParams;
  const currentPath = buildBoardPath(boardSlug, pageParam, queryParam);

  return runWithDemoSessionFromCookies(
    currentPath,
    async () => renderBoardRoute(boardSlug, pageParam, queryParam),
    { required: true },
  );
}

function buildBoardPath(
  boardSlug: string,
  pageParam: string | undefined,
  queryParam: string | undefined,
): string {
  const params = new URLSearchParams();
  if (pageParam) params.set('page', pageParam);
  if (queryParam) params.set('q', queryParam);
  const queryString = params.toString();
  return queryString
    ? `/board/${boardSlug}?${queryString}`
    : `/board/${boardSlug}`;
}

async function renderBoardRoute(
  boardSlug: string,
  pageParam: string | undefined,
  queryParam: string | undefined,
) {
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
  const jsonLdItems = buildBoardJsonLd({ board, branding, baseUrl });

  return (
    <>
      <JsonLdScripts items={jsonLdItems} />
      <BoardPage
        board={board}
        posts={posts}
        query={query ?? ''}
        navigationBranch={navigationBranch}
      />
    </>
  );
}
