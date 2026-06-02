'use client';

import { SearchInputForm } from '@/features/search/ui/SearchInputForm';

interface BoardSearchFormProps {
  boardSlug: string;
  query: string;
}

export function BoardSearchForm({ boardSlug, query }: BoardSearchFormProps) {
  return (
    <SearchInputForm
      action={`/board/${boardSlug}`}
      className="w-full large:max-w-[588px]"
      defaultValue={query}
      inputId="board-search-input"
      label="게시글 검색"
      placeholder="검색어를 입력해주세요."
    />
  );
}
