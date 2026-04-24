import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedBoard } from '@/entities/board/api/getBoard';
import {
  getPublishedPost,
  getPostForPreview,
} from '@/entities/post/api/getPost';
import { PreviewBanner } from '@/features/preview/ui/PreviewBanner';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { renderTiptapContent } from '@/shared/lib/renderContent';
import { getPreviewSession } from '@/shared/lib/previewSession';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/shared/lib/structuredData';
import { PostPage } from '@/pages/post/ui/PostPage';

interface PageProps {
  params: Promise<{ boardSlug: string; postSlug: string }>;
}

function summarizeContent(raw: string | null, max = 160): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  return normalized.length <= max ? normalized : `${normalized.slice(0, max)}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { boardSlug, postSlug } = await params;
  const board = await getPublishedBoard(boardSlug);
  if (!board) return { title: '게시글을 찾을 수 없습니다' };

  const post = await getPublishedPost(board.id, postSlug);
  if (!post) return { title: '게시글을 찾을 수 없습니다' };

  const title = post.seoTitle?.trim() || post.title;
  const description =
    post.seoDescription?.trim() || summarizeContent(post.content);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { boardSlug, postSlug } = await params;
  const session = await getPreviewSession();

  if (session?.entityType === 'POST') {
    const previewPost = await getPostForPreview(boardSlug, postSlug);
    if (previewPost && session.entityId === previewPost.id) {
      const contentHtml = renderTiptapContent(previewPost.contentJson);
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
          />
        </>
      );
    }
  }

  const board = await getPublishedBoard(boardSlug);
  if (!board) notFound();

  const post = await getPublishedPost(board.id, postSlug);
  if (!post) notFound();

  const contentHtml = renderTiptapContent(post.contentJson);

  const [branding, baseUrl] = await Promise.all([
    getCachedBranding(),
    getSiteUrl(),
  ]);
  const postUrl = `${baseUrl}/board/${boardSlug}/${postSlug}`;
  const articleJsonLd = buildArticleJsonLd({
    url: postUrl,
    headline: post.seoTitle?.trim() || post.title,
    description:
      post.seoDescription?.trim() || summarizeContent(post.content),
    publishedAt: post.publishedAt,
    modifiedAt: post.updatedAt,
    authorName: post.author?.name ?? null,
    siteName: branding.siteName,
    baseUrl,
    logoUrl: branding.logoUrl,
    imageUrl: branding.ogImageUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: branding.siteName, url: baseUrl },
    { name: board.name, url: `${baseUrl}/board/${boardSlug}` },
    { name: post.title, url: postUrl },
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
      <PostPage
        post={{
          title: post.title,
          contentHtml,
          publishedAt: post.publishedAt,
          author: post.author,
          board: post.board,
        }}
      />
    </>
  );
}
