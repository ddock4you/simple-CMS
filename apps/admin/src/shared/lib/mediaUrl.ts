/**
 * 미디어 URL 정규화 — admin(3001)에서 web(3000)이 서빙하는 정적 파일을 미리보기.
 *
 * Local 스토리지 어댑터는 `/uploads/{category}/{filename}` 상대 경로로 저장하지만,
 * 실제 파일은 `apps/web/public/uploads/`에서 web 앱이 서빙한다. admin에서 그대로
 * 접근하면 404가 나므로 미리보기에서는 web의 절대 URL을 prefix한다.
 *
 * - 절대 URL(http/https/data) → 그대로
 * - `/`로 시작하는 상대 경로 → `${WEB_BASE_URL}${url}`
 * - 그 외 → 그대로 (admin 자신의 정적 파일 등)
 *
 * DB에 저장되는 URL은 상대 경로 그대로 유지 — web 렌더링은 변경 없음.
 */
export const WEB_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function resolveMediaPreviewUrl(url: string): string {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${WEB_BASE_URL}${url}`;
  return url;
}

/**
 * `resolveMediaPreviewUrl`의 역방향 — admin이 절대 URL로 만든 값을 DB 저장용
 * 상대 경로로 되돌린다. Tiptap editor가 내부적으로 절대 URL을 갖더라도 저장 직전에
 * `WEB_BASE_URL` prefix를 떼어 원래 `/uploads/...` 형태로 복원.
 *
 * - `${WEB_BASE_URL}/uploads/...`로 시작 → prefix 제거
 * - 다른 절대 URL (Supabase/S3/외부 이미지 등) → 그대로 (관리 대상 아님)
 */
export function toRelativeMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith(WEB_BASE_URL)) return url.slice(WEB_BASE_URL.length);
  return url;
}
