import type { MediaListFilters } from '@simple-cms/types';

/**
 * URL searchParams ↔ MediaListFilters 변환 헬퍼.
 * Server Component prefetch와 Client Component useQuery에서 동일한 필터 객체를 사용한다.
 */
export const DEFAULT_MEDIA_PAGE_SIZE = 24;

export function parseMediaFilters(
  searchParams: Record<string, string | string[] | undefined>,
): Required<Pick<MediaListFilters, 'page' | 'pageSize'>> & MediaListFilters {
  const get = (key: string): string | undefined => {
    const v = searchParams[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const pageRaw = Number(get('page') ?? '1');
  const pageSizeRaw = Number(get('pageSize') ?? String(DEFAULT_MEDIA_PAGE_SIZE));

  return {
    q: get('q')?.trim() || undefined,
    mimeType: get('mimeType')?.trim() || undefined,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    pageSize:
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
        ? Math.min(pageSizeRaw, 100)
        : DEFAULT_MEDIA_PAGE_SIZE,
  };
}

export function buildMediaSearchParams(filters: MediaListFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.mimeType) params.set('mimeType', filters.mimeType);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  return params.toString();
}
