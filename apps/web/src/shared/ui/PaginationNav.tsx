'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Pagination } from 'krds-react';

interface PaginationNavProps {
  totalPages: number;
  currentPage: number;
}

export function PaginationNav({ totalPages, currentPage }: PaginationNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // if (totalPages <= 1) return null;

  const handleChange = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const query = params.toString();
    router.push(query ? `?${query}` : '?');
  };

  return (
    <nav className="flex justify-center py-[40px]" aria-label="페이지 탐색">
      <Pagination
        totalPages={totalPages}
        currentPage={currentPage}
        onChange={handleChange}
        boundaryCount={1}
        siblingCount={1}
      />
    </nav>
  );
}
