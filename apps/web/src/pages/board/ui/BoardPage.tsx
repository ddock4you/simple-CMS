import Link from 'next/link';

import type { BoardSkinType } from '@simple-cms/db';

import { Breadcrumb } from '@/shared/ui/KrdsBreadcrumb';
import { KrdsTable } from '@/shared/ui/KrdsTable';
import { PaginationNav } from '@/shared/ui/PaginationNav';
import { getPostListNumber } from '../lib/getPostListNumber';
import { BoardEmptyState } from './BoardEmptyState';
import { BoardSearchForm } from './BoardSearchForm';

interface PostItem {
  id: string;
  title: string;
  slug: string;
  isImportant: boolean;
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
    regularTotal: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
  query?: string;
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
  total,
  regularTotal,
}: {
  posts: PostItem[];
  boardSlug: string;
  page: number;
  pageSize: number;
  total: number;
  regularTotal: number;
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
        {posts.map((post, index) => {
          const number = getPostListNumber({
            itemIndex: index,
            page,
            pageSize,
            total,
            regularTotal,
          });

          return (
            <KrdsTable.Tr key={post.id}>
              <KrdsTable.Td style={{ textAlign: 'center' }}>
                {post.isImportant ? (
                  <span className="post-important-label">중요</span>
                ) : (
                  number
                )}
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
          );
        })}
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

function BoardListToolbar({
  total,
  query,
  boardSlug,
}: {
  total: number;
  query: string;
  boardSlug: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
      <p className="m-0 text-[19px] font-bold leading-[1.8] text-[#1E2124]">
        {query ? '검색 결과 ' : '총 '}
        <strong className="text-[#1E694E]">
          {total.toLocaleString('ko-KR')}
        </strong>
        건
      </p>

      <BoardSearchForm boardSlug={boardSlug} query={query} />
    </div>
  );
}

export function BoardPage({ board, posts, query = '' }: BoardPageProps) {
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

      <BoardListToolbar
        total={posts.total}
        query={query}
        boardSlug={board.slug}
      />

      {posts.items.length > 0 ? (
        <>
          {board.skinType === 'LIST' ? (
            <PostListTable
              posts={posts.items}
              boardSlug={board.slug}
              page={posts.page}
              pageSize={posts.pageSize}
              total={posts.total}
              regularTotal={posts.regularTotal}
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
        <BoardEmptyState boardName={board.name} />
      )}
    </div>
  );
}
