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
    <form role="search" onSubmit={handleSubmit} className="search-form">
      <label htmlFor="search-input" className="sr-only">
        검색
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어를 입력하세요"
        className="search-input"
        autoComplete="off"
      />
      <button type="submit" className="search-submit" aria-label="검색">
        검색
      </button>
    </form>
  );
}
