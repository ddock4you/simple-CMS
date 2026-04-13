import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedBoard } from '@/entities/board/api/getBoard';
import { getPublishedPost } from '@/entities/post/api/getPost';
import { renderTiptapContent } from '@/shared/lib/renderContent';
import { PostPage } from '@/pages/post/ui/PostPage';

interface PageProps {
  params: Promise<{ boardSlug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { boardSlug, postSlug } = await params;
  const board = await getPublishedBoard(boardSlug);
  if (!board) return { title: '게시글을 찾을 수 없습니다' };

  const post = await getPublishedPost(board.id, postSlug);
  if (!post) return { title: '게시글을 찾을 수 없습니다' };

  return {
    title: post.title,
    openGraph: {
      title: post.title,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { boardSlug, postSlug } = await params;

  const board = await getPublishedBoard(boardSlug);
  if (!board) notFound();

  const post = await getPublishedPost(board.id, postSlug);
  if (!post) notFound();

  const contentHtml = renderTiptapContent(post.contentJson);

  return (
    <PostPage
      post={{
        title: post.title,
        contentHtml,
        publishedAt: post.publishedAt,
        author: post.author,
        board: post.board,
      }}
    />
  );
}
