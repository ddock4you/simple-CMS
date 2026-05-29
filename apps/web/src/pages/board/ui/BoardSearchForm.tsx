'use client';

import { TextInput } from 'krds-react';
import { Search } from 'lucide-react';

interface BoardSearchFormProps {
  boardSlug: string;
  query: string;
}

export function BoardSearchForm({ boardSlug, query }: BoardSearchFormProps) {
  return (
    <form
      role="search"
      action={`/board/${boardSlug}`}
      method="get"
      className="w-full large:max-w-[588px]"
    >
      <div className="relative w-full [&_.form-conts]:relative [&_.form-tit]:sr-only [&_input]:h-[56px] [&_input]:w-full [&_input]:rounded-[8px] [&_input]:border-[#58616a] [&_input]:bg-white [&_input]:px-[16px] [&_input]:pr-[48px] [&_input]:text-[19px] [&_input]:leading-[1.5] [&_input]:text-[#1e2124] [&_input::placeholder]:text-[#8a949e]">
        <TextInput
          id="board-search-input"
          name="q"
          type="text"
          label="게시글 검색"
          placeholder="검색어를 입력해주세요."
          defaultValue={query}
          size="large"
        />
        <button
          type="submit"
          className="absolute top-1/2 right-[16px] inline-flex size-[24px] -translate-y-1/2 items-center justify-center text-[#1e2124] hover:text-[#1e694e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#256ef4]"
          aria-label="검색"
        >
          <Search className="size-[20px]" aria-hidden="true" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
