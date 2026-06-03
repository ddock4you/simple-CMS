/**
 * 서브페이지 블록 도메인 타입 (Stage 6 — 통합 블록 모델)
 *
 * 서브페이지의 모든 콘텐츠는 블록으로 표현된다. 별도의 본문(contentJson) 필드는 없다.
 * blockType별 configJson 구조가 다른 discriminated union 구조.
 * Zod 스키마 정의는 admin의 `features/block-management/model/blockSchemas.ts`에서 관리.
 */

export type PageBlockType = 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME';

/**
 * RICH_TEXT 블록 — Tiptap JSON 기반 리치 텍스트 본문.
 * 기존의 Subpage.contentJson을 블록 단위로 흡수한 타입. 여러 개 배치 가능.
 */
export interface RichTextBlockConfig {
  /** Tiptap ProseMirror JSON */
  contentJson: unknown;
}

/**
 * HTML 블록 — 자유 HTML (web 렌더 시 서버에서 DOMPurify sanitize).
 */
export interface HtmlBlockConfig {
  html: string;
}

/**
 * IMAGE 블록 — 이미지 + alt(필수) + 선택적 캡션/링크.
 * mediaId가 있으면 Media 라이브러리 참조(findMediaReferences 추적 대상).
 */
export interface ImageBlockConfig {
  imageUrl?: string;
  imageAlt?: string;
  imageMediaId?: string | null;
  caption?: string | null;
  linkUrl?: string | null;
  items?: ImageBlockItem[];
}

export interface ImageBlockItem {
  imageUrl: string;
  imageAlt: string;
  imageMediaId?: string | null;
  caption?: string | null;
  linkUrl?: string | null;
}

/**
 * IFRAME 블록 — 허용 도메인만 수용 (서버 검증).
 * title은 접근성(WCAG)을 위해 필수.
 */
export interface IframeBlockConfig {
  src: string;
  title: string;
  aspectRatio: '16:9' | '4:3' | '1:1';
  allowFullscreen: boolean;
  /** 지도처럼 비율보다 고정 높이가 적합한 임베드의 데스크탑 기준 높이(px). */
  heightPx?: number | null;
}

export type PageBlockConfig =
  | RichTextBlockConfig
  | HtmlBlockConfig
  | ImageBlockConfig
  | IframeBlockConfig;

/**
 * 서브페이지당 블록 최대 개수 (서버 상한).
 * UX/성능 관점에서 50개는 실사용 상한으로 충분.
 */
export const PAGE_BLOCK_MAX_PER_SUBPAGE = 50;

/** IMAGE 블록에 등록할 수 있는 이미지 최대 개수. */
export const IMAGE_BLOCK_MAX_ITEMS = 12;

/**
 * IFRAME 블록 / Subpage customHtml 양쪽의 iframe src 허용 호스트 (단일 출처).
 *
 * admin 저장 시점(IframeBlockFields, API Route handler)과 web 렌더 시점
 * (`SubpageBlockRenderer`, `renderContent.ts`)에서 공용으로 참조. Stage 7k-1에
 * admin/web 3곳 복제를 이 상수로 통합했다. 하드코딩 운영이며 SiteSettings 기반
 * 관리형 전환은 2차 과제.
 *
 * 하위 도메인은 `endsWith('.youtube.com')` 같은 판정 대신 정확 일치 사용.
 */
export const IFRAME_ALLOWED_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'www.google.com',
] as const;

/**
 * iframe src 호스트가 {@link IFRAME_ALLOWED_HOSTS}에 있는지 검사한다.
 * URL 파싱 실패 시 false 반환.
 *
 * 서버 재검증(API Route POST/PATCH), 공개 웹 렌더 재검증(admin 우회 입력 방어) 공용.
 * admin 저장 시점 YouTube/Vimeo 정규화(`normalizeIframeEmbedUrl`)는 admin 전용이라
 * 공유하지 않음 — web은 이미 정규화된 URL만 받으므로 host 재검증만 필요.
 */
export function isIframeHostAllowed(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    const host = url.hostname.toLowerCase();
    if (host === 'www.google.com') {
      return url.pathname === '/maps/embed';
    }

    return (IFRAME_ALLOWED_HOSTS as readonly string[]).includes(host);
  } catch {
    return false;
  }
}
