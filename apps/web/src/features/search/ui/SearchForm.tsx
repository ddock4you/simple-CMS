'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

interface SearchFormProps {
  defaultValue?: string;
}

export function SearchForm({ defaultValue = '' }: SearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form role="search" onSubmit={handleSubmit} className="flex max-w-[600px] flex-col gap-[16px] medium:flex-row">
      <label htmlFor="search-input" className="sr-only">
        검색
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어를 입력하세요"
        className="min-h-[48px] flex-1 rounded-[4px] border border-[#cdd1d5] px-[16px] py-[12px] text-[16px] leading-[1.5] text-[#1e2124] outline-none transition-colors duration-150 focus:border-[#256ef4] focus:shadow-[0_0_0_2px_rgba(37,110,244,0.15)]"
        autoComplete="off"
      />
      <button type="submit" className="whitespace-nowrap rounded-[4px] bg-[#256ef4] px-[24px] py-[12px] text-[16px] leading-[1.5] font-medium text-white transition-opacity duration-150 hover:opacity-90" aria-label="검색">
        검색
      </button>
    </form>
  );
}
