import DOMPurify from 'isomorphic-dompurify';

import { generateHTML, getSharedExtensions } from '@simple-cms/editor';

const purifyConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'p', 'br', 'hr',
    'strong', 'em', 'u', 's', 'sub', 'sup', 'mark',
    'a', 'img',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
    'span', 'div',
    'input', // task list checkbox
    'label',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title',
    'src', 'alt', 'width', 'height',
    'style', 'class',
    'data-type', 'data-checked',
    'data-media-id', // Stage 5a-2: Tiptap 이미지의 Media 라이브러리 참조 (cuid)
    'type', 'checked', 'disabled', // task list checkbox
    'colspan', 'rowspan', 'colwidth',
  ],
};

const extensions = getSharedExtensions();

export function renderTiptapContent(json: unknown): string | null {
  if (!json || typeof json !== 'object') {
    return null;
  }

  try {
    const html = generateHTML(json as Record<string, unknown>, extensions);
    return DOMPurify.sanitize(html, purifyConfig);
  } catch {
    console.error('[renderTiptapContent] Failed to generate HTML from Tiptap JSON');
    return null;
  }
}

/**
 * Subpage.customHtml 전용 허용 호스트 — iframe src 재검증용.
 * admin `features/block-management/model/blockLabels.ts`의 IFRAME_ALLOWED_HOSTS와 동기화 유지.
 * (공유 모듈 추출은 Stage 8+ 과제)
 */
const IFRAME_ALLOWED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]);

function isAllowedIframeSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    const host = new URL(src).hostname.toLowerCase();
    return IFRAME_ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * Subpage.customHtml 전용 sanitize — 블록 HTML보다 넓은 허용 범위.
 *
 * 관리자 입력이므로 section/article/iframe 등 의미론적/임베드 태그를 허용하되,
 * script 태그, on-prefixed 이벤트 핸들러, javascript: URL은 DOMPurify 기본 차단 정책을 그대로 유지.
 * iframe의 src는 서버에서 허용 호스트 재검증 (admin 우회 입력 방어).
 */
const customHtmlPurifyConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'u', 's', 'sub', 'sup', 'mark',
    'a', 'img',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
    'span', 'div',
    // 의미론적 섹셔닝
    'section', 'article', 'aside',
    'nav', 'header', 'footer', 'main',
    // 미디어 임베드
    'iframe',
    // 상호작용 (JS 없이)
    'details', 'summary',
    'figure', 'figcaption',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title',
    'src', 'alt', 'width', 'height',
    'style', 'class', 'id',
    'colspan', 'rowspan',
    // iframe 안전 속성
    'allow', 'allowfullscreen', 'referrerpolicy', 'loading', 'sandbox',
    // details
    'open',
  ],
};

export function sanitizeCustomHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  let sanitized = DOMPurify.sanitize(raw, customHtmlPurifyConfig);

  // iframe host 재검증: DOMPurify는 src 호스트를 필터링하지 않으므로 후처리
  // src가 있는 iframe: 허용 호스트 아니면 제거
  sanitized = sanitized.replace(
    /<iframe\b([^>]*)\bsrc=(['"])([^'"]*)\2([^>]*)>([\s\S]*?)<\/iframe>/gi,
    (match, _attrsBefore, _quote, src) => (isAllowedIframeSrc(src) ? match : ''),
  );
  // src 속성이 아예 없는 iframe은 의미 없음 → 제거
  sanitized = sanitized.replace(
    /<iframe\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/iframe>/gi,
    '',
  );

  return sanitized;
}
