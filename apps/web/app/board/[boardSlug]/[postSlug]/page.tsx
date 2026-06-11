import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedBoard } from '@/entities/board/api/getBoard';
import { resolveContentNavigation } from '@/entities/navigation/lib/resolveContentNavigation';
import {
  getPublishedPost,
  getPostForPreview,
} from '@/entities/post/api/getPost';
import { PreviewBanner } from '@/features/preview/ui/PreviewBanner';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { runWithDemoSessionFromCookies } from '@/shared/lib/requestDemoSession';
import { renderTiptapContent } from '@/shared/lib/renderContent';
import { getPreviewSession } from '@/shared/lib/previewSession';
import { buildPostJsonLd } from '@/shared/lib/seo/jsonLd';
import {
  buildDemoPendingTitleMetadata,
  buildMissingMetadata,
  buildPostMetadata,
} from '@/shared/lib/seo/metadata';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import { JsonLdScripts } from '@/shared/ui/JsonLdScripts';
import { PostPage } from '@/pages/post/ui/PostPage';

interface PageProps {
  params: Promise<{ boardSlug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { boardSlug, postSlug } = await params;
  return runWithDemoSessionFromCookies(
    `/board/${boardSlug}/${postSlug}`,
    async (demoSession) => {
      if (process.env.DEMO_MODE === 'true' && !demoSession) {
        return buildDemoPendingTitleMetadata();
      }

      const board = await getPublishedBoard(boardSlug);
      if (!board) return buildMissingMetadata('게시글을 찾을 수 없습니다');

      const post = await getPublishedPost(board.id, postSlug);
      if (!post) return buildMissingMetadata('게시글을 찾을 수 없습니다');

      return buildPostMetadata(post);
    },
  );
}

export default async function Page({ params }: PageProps) {
  const { boardSlug, postSlug } = await params;
  return runWithDemoSessionFromCookies(
    `/board/${boardSlug}/${postSlug}`,
    async () => renderPostRoute(boardSlug, postSlug),
    { required: true },
  );
}

async function renderPostRoute(boardSlug: string, postSlug: string) {
  const session = await getPreviewSession();

  if (session?.entityType === 'POST') {
    const previewPost = await getPostForPreview(boardSlug, postSlug);
    if (previewPost && session.entityId === previewPost.id) {
      const contentHtml = renderTiptapContent(previewPost.contentJson);
      const navigationBranch = await resolveContentNavigation(
        `/board/${boardSlug}/${postSlug}`,
        previewPost.board.name,
      );
      return (
        <>
          <PreviewBanner label="게시글 미리보기" />
          <PostPage
            post={{
              title: previewPost.title,
              contentHtml,
              publishedAt: previewPost.publishedAt,
              author: previewPost.author,
              board: previewPost.board,
            }}
            navigationBranch={navigationBranch}
          />
        </>
      );
    }
  }

  const board = await getPublishedBoard(boardSlug);
  if (!board) notFound();

  const post = await getPublishedPost(board.id, postSlug);
  if (!post) notFound();

  const [contentHtml, navigationBranch] = await Promise.all([
    Promise.resolve(renderTiptapContent(post.contentJson)),
    resolveContentNavigation(`/board/${boardSlug}/${postSlug}`, board.name),
  ]);

  const [branding, baseUrl] = await Promise.all([
    getCachedBranding(),
    getSiteUrl(),
  ]);
  const jsonLdItems = buildPostJsonLd({ post, branding, baseUrl });

  return (
    <>
      <JsonLdScripts items={jsonLdItems} />
      <PostPage
        post={{
          title: post.title,
          contentHtml,
          publishedAt: post.publishedAt,
          author: post.author,
          board: post.board,
        }}
        navigationBranch={navigationBranch}
      />
    </>
  );
}
