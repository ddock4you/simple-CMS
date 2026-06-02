import type { Metadata } from 'next';

import type { SearchContentType } from '@simple-cms/db';

import { getSearchResults } from '@/entities/search/api/getSearchResults';
import { SearchPage } from '@/pages/search/ui/SearchPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string; type?: string }>;
}

function parseSearchType(type?: string): SearchContentType {
  return type === 'subpage' || type === 'post' ? type : 'all';
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" 검색 결과` : '검색',
  };
}

export default async function Page({ searchParams }: PageProps) {
  const { q, page: pageParam, type: typeParam } = await searchParams;
  const query = q?.trim() ?? '';
  const page = Math.max(1, Number(pageParam) || 1);
  const type = parseSearchType(typeParam);
  const results = query ? await getSearchResults(query, page, type) : null;

  return <SearchPage query={query} results={results} type={type} />;
}
