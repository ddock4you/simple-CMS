'use client';

import Link from 'next/link';

import { Breadcrumb } from 'krds-react';

import type { BoardSkinType } from '@simple-cms/db';

import { KrdsTable } from '@/shared/ui/KrdsTable';
import { PaginationNav } from '@/shared/ui/PaginationNav';

interface PostItem {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  author: { name: string } | null;
}

interface BoardPageProps {
  board: {
    name: string;
    slug: string;
    description: string | null;
    skinType: BoardSkinType;
  };
  posts: {
    items: PostItem[];
    total: number;
    totalPages: number;
    page: number;
  };
}

function formatDate(date: Date | null) {
  if (!date) return '-';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function PostListTable({
  posts,
  boardSlug,
  page,
  pageSize,
}: {
  posts: PostItem[];
  boardSlug: string;
  page: number;
  pageSize: number;
}) {
  return (
    <KrdsTable mobScroll caption={`게시글 목록 — 번호, 제목, 작성자, 날짜`}>
      <KrdsTable.Thead>
        <KrdsTable.Tr>
          <KrdsTable.Th style={{ width: '60px', textAlign: 'center' }}>
            번호
          </KrdsTable.Th>
          <KrdsTable.Th>제목</KrdsTable.Th>
          <KrdsTable.Th style={{ width: '120px' }}>작성자</KrdsTable.Th>
          <KrdsTable.Th style={{ width: '120px' }}>날짜</KrdsTable.Th>
        </KrdsTable.Tr>
      </KrdsTable.Thead>
      <KrdsTable.Tbody>
        {posts.map((post, index) => (
          <KrdsTable.Tr key={post.id}>
            <KrdsTable.Td style={{ textAlign: 'center' }}>
              {(page - 1) * pageSize + index + 1}
            </KrdsTable.Td>
            <KrdsTable.Td>
              <Link
                href={`/board/${boardSlug}/${post.slug}`}
                className="post-title-link"
              >
                {post.title}
              </Link>
            </KrdsTable.Td>
            <KrdsTable.Td>{post.author?.name ?? '-'}</KrdsTable.Td>
            <KrdsTable.Td>{formatDate(post.publishedAt)}</KrdsTable.Td>
          </KrdsTable.Tr>
        ))}
      </KrdsTable.Tbody>
    </KrdsTable>
  );
}

function PostGalleryGrid({
  posts,
  boardSlug,
}: {
  posts: PostItem[];
  boardSlug: string;
}) {
  return (
    <div className="gallery-grid">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/board/${boardSlug}/${post.slug}`}
          className="gallery-card"
        >
          <div className="gallery-card-thumb" />
          <div className="gallery-card-body">
            <h3 className="gallery-card-title">{post.title}</h3>
            <span className="gallery-card-date">
              {formatDate(post.publishedAt)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function BoardPage({ board, posts }: BoardPageProps) {
  return (
    <div className="page-container">
      <Breadcrumb
        items={[
          { text: '홈', href: '/' },
          { text: board.name, href: '#' },
        ]}
        ariaLabel="현재 위치"
      />
      <header className="board-header">
        <h1 className="board-title">{board.name}</h1>
        {board.description && (
          <p className="board-description">{board.description}</p>
        )}
      </header>

      {posts.items.length > 0 ? (
        <>
          {board.skinType === 'LIST' ? (
            <PostListTable
              posts={posts.items}
              boardSlug={board.slug}
              page={posts.page}
              pageSize={20}
            />
          ) : (
            <PostGalleryGrid posts={posts.items} boardSlug={board.slug} />
          )}
          <PaginationNav
            totalPages={posts.totalPages}
            currentPage={posts.page}
          />
        </>
      ) : (
        <p className="empty-message">아직 게시된 글이 없습니다.</p>
      )}
    </div>
  );
}
