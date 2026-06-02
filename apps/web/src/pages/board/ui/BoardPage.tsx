import Link from 'next/link';

import type { BoardSkinType } from '@simple-cms/db';

import { KrdsTable } from '@/shared/ui/KrdsTable';
import { PaginationNav } from '@/shared/ui/PaginationNav';
import {
  buildContentBreadcrumbItems,
  type ContentNavigationBranch,
  PublicContentLayout,
} from '@/widgets/content-layout/ui/PublicContentLayout';
import { getPostListNumber } from '../lib/getPostListNumber';
import { BoardEmptyState } from './BoardEmptyState';
import { BoardSearchForm } from './BoardSearchForm';

interface PostItem {
  id: string;
  title: string;
  slug: string;
  isImportant: boolean;
  publishedAt: Date | null;
  thumbnailUrl: string | null;
  thumbnailAlt: string | null;
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
  navigationBranch: ContentNavigationBranch;
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
                  <span className="inline-block rounded-[4px] bg-[#fff8e9] px-[8px] py-[2px] text-[12px] leading-[1.5] font-bold text-[#98690a]">
                    중요
                  </span>
                ) : (
                  number
                )}
              </KrdsTable.Td>
              <KrdsTable.Td>
                <Link
                  href={`/board/${boardSlug}/${post.slug}`}
                  className="font-medium text-[#33363d] no-underline hover:text-[#256ef4] hover:underline"
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
    <div className="grid grid-cols-2 gap-[16px] medium:grid-cols-3 large:gap-[24px]">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/board/${boardSlug}/${post.slug}`}
          className="group flex flex-col overflow-hidden rounded-[8px] border border-[#e4e4e4] text-inherit no-underline transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
        >
          <div className="aspect-video overflow-hidden bg-[#f4f5f6]">
            {post.thumbnailUrl ? (
              // 외부 URL도 가능하므로 next/image 대신 일반 img
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.thumbnailUrl}
                alt={post.thumbnailAlt ?? `${post.title} 썸네일`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] leading-[1.5] text-[#8a949e]">
                이미지 없음
              </div>
            )}
          </div>
          <div className="p-[16px] large:p-[24px]">
            <h3 className="line-clamp-2 overflow-hidden text-[16px] leading-[1.4] font-semibold text-[#1e2124]">
              {post.title}
            </h3>
            <span className="mt-[8px] block text-[13px] leading-[1.5] text-[#8a949e]">
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
    <div className="mb-[24px] flex flex-col gap-[16px] large:flex-row large:items-center large:justify-between">
      <p className="m-0 text-[19px] leading-[1.8] font-bold text-[#1e2124]">
        {query ? '검색 결과 ' : '총 '}
        <strong className="text-[#1e694e]">
          {total.toLocaleString('ko-KR')}
        </strong>
        건
      </p>

      <BoardSearchForm boardSlug={boardSlug} query={query} />
    </div>
  );
}

export function BoardPage({
  board,
  posts,
  query = '',
  navigationBranch,
}: BoardPageProps) {
  return (
    <PublicContentLayout
      breadcrumbItems={buildContentBreadcrumbItems(navigationBranch, {
        text: board.name,
        href: `/board/${board.slug}`,
      })}
      navigationBranch={navigationBranch}
    >
      <header className="pb-[24px]">
        <h1 className="text-[32px] leading-[1.3] font-bold text-[#1e2124]">
          {board.name}
        </h1>
        {board.description && (
          <p className="mt-[8px] text-[16px] leading-[1.6] text-[#555555]">
            {board.description}
          </p>
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
    </PublicContentLayout>
  );
}
