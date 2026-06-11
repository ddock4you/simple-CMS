import type { Metadata } from 'next';

import type { SearchContentType } from '@simple-cms/db';

import { getSearchResults } from '@/entities/search/api/getSearchResults';
import { SearchPage } from '@/pages/search/ui/SearchPage';
import { runWithDemoSessionFromCookies } from '@/shared/lib/requestDemoSession';
import {
  buildDemoPendingTitleMetadata,
  buildSearchMetadata,
} from '@/shared/lib/seo/metadata';

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
  return runWithDemoSessionFromCookies(
    buildSearchPath(q, undefined, undefined),
    async (demoSession) => {
      if (process.env.DEMO_MODE === 'true' && !demoSession) {
        return buildDemoPendingTitleMetadata();
      }

      return buildSearchMetadata(q);
    },
  );
}

export default async function Page({ searchParams }: PageProps) {
  const { q, page: pageParam, type: typeParam } = await searchParams;
  return runWithDemoSessionFromCookies(
    buildSearchPath(q, pageParam, typeParam),
    async () => renderSearchRoute(q, pageParam, typeParam),
    { required: true },
  );
}

function buildSearchPath(
  q: string | undefined,
  pageParam: string | undefined,
  typeParam: string | undefined,
): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (pageParam) params.set('page', pageParam);
  if (typeParam) params.set('type', typeParam);
  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : '/search';
}

async function renderSearchRoute(
  q: string | undefined,
  pageParam: string | undefined,
  typeParam: string | undefined,
) {
  const query = q?.trim() ?? '';
  const page = Math.max(1, Number(pageParam) || 1);
  const type = parseSearchType(typeParam);
  const results = query ? await getSearchResults(query, page, type) : null;

  return <SearchPage query={query} results={results} type={type} />;
}
