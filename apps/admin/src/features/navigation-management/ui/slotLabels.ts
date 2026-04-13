export const SLOT_OPTIONS = [
  { value: 'HEADER', label: '헤더' },
  { value: 'FOOTER', label: '푸터' },
  { value: 'SIDEBAR', label: '사이드바' },
] as const;

export const SLOT_LABELS: Record<string, string> = {
  HEADER: '헤더',
  FOOTER: '푸터',
  SIDEBAR: '사이드바',
};
