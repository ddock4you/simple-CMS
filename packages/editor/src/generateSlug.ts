export function generateSlug(title: string): string {
  return title
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/[^\x20-\x7E-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
