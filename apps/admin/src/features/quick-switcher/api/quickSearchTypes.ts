export type QuickSearchType = 'subpage' | 'post' | 'board' | 'menu';

export interface QuickSearchResult {
  type: QuickSearchType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}
