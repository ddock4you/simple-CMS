/**
 * 메인 팝업 "오늘 하루 보지 않기" 쿠키 헬퍼.
 *
 * - 쿠키 키: `hide_popup_{popupId}`
 * - 만료: 로컬 자정 (SameSite=Lax, path=/)
 * - SSR에서도 import 가능 — 내부에서 `typeof document` 가드
 */
const COOKIE_PREFIX = 'hide_popup_';

export function setPopupHidden(popupId: string): void {
  if (typeof document === 'undefined') return;
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  document.cookie = `${COOKIE_PREFIX}${popupId}=1; expires=${midnight.toUTCString()}; path=/; SameSite=Lax`;
}

export function isPopupHidden(popupId: string): boolean {
  if (typeof document === 'undefined') return false;
  const key = `${COOKIE_PREFIX}${popupId}=`;
  return document.cookie
    .split(';')
    .some((entry) => entry.trim().startsWith(key));
}
