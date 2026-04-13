'use client';

import { Breadcrumb } from 'krds-react';

import { TiptapContent } from '@/shared/ui/TiptapContent';

interface PostPageProps {
  post: {
    title: string;
    contentHtml: string | null;
    publishedAt: Date | null;
    author: { name: string } | null;
    board: { name: string; slug: string };
  };
}

export function PostPage({ post }: PostPageProps) {
  const breadcrumbItems = [
    { text: '홈', href: '/' },
    { text: post.board.name, href: `/board/${post.board.slug}` },
    { text: post.title, href: '#' },
  ];

  return (
    <div className="page-container">
      <Breadcrumb items={breadcrumbItems} ariaLabel="현재 위치" />

      <article className="post-article">
        <header className="post-header">
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            {post.author && (
              <span className="post-author">{post.author.name}</span>
            )}
            {post.publishedAt && (
              <time
                className="post-date"
                dateTime={post.publishedAt.toISOString()}
              >
                {post.publishedAt.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>
        </header>
        {post.contentHtml ? (
          <TiptapContent html={post.contentHtml} />
        ) : (
          <p className="empty-content">콘텐츠가 준비 중입니다.</p>
        )}
      </article>
    </div>
  );
}
