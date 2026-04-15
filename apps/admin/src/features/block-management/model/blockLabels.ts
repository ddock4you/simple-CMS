import type { PageBlockType } from '@simple-cms/types';

export const BLOCK_TYPE_LABELS: Record<PageBlockType, string> = {
  RICH_TEXT: '본문',
  HTML: 'HTML',
  IMAGE: '이미지',
  IFRAME: 'iframe',
};

export const BLOCK_TYPE_DESCRIPTIONS: Record<PageBlockType, string> = {
  RICH_TEXT: 'Tiptap WYSIWYG 본문 — 여러 개 배치 가능',
  HTML: '자유 HTML 조각 — 서버에서 sanitize 후 렌더',
  IMAGE: '이미지 + alt + 선택적 캡션/링크',
  IFRAME: '허용된 외부 임베드 (YouTube, Vimeo)',
};

/**
 * IFRAME 블록 src 허용 호스트 (서버 + 클라이언트 양쪽 검증 재사용).
 *
 * 하드코딩 운영 — SiteSettings 기반 관리형 전환은 2차 과제.
 * 하위 도메인은 `endsWith('.youtube.com')` 같은 판정 대신 정확 일치 사용.
 */
export const IFRAME_ALLOWED_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
] as const;

/**
 * iframe src 호스트가 허용 목록에 있는지 검사한다.
 * URL 파싱 실패 시 false 반환.
 */
export function isIframeHostAllowed(src: string): boolean {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return (IFRAME_ALLOWED_HOSTS as readonly string[]).includes(host);
  } catch {
    return false;
  }
}

/**
 * iframe src를 **임베드 가능한 URL**로 정규화한다.
 *
 * 배경: YouTube의 일반 시청 URL(`youtube.com/watch?v=...`)은 `X-Frame-Options: sameorigin`
 *       헤더 때문에 외부 사이트에서 iframe 로드가 차단된다. embed 경로(`/embed/ID`)만 가능.
 *       Vimeo도 동일 — `vimeo.com/ID`는 불가, `player.vimeo.com/video/ID`만 가능.
 *
 * 변환 규칙:
 *   - 이미 embed 형식이면 그대로 통과
 *   - `youtube.com/watch?v=ID` (+ `t=`, `start=` 유지) → `www.youtube.com/embed/ID?start=...`
 *   - `youtu.be/ID` → `www.youtube.com/embed/ID`
 *   - `youtube.com/shorts/ID` → `www.youtube.com/embed/ID`
 *   - `vimeo.com/ID` (숫자) → `player.vimeo.com/video/ID`
 *   - 그 외(playlist, channel, 임의 경로) → null
 *
 * admin 저장 시점과 API Route 양쪽에서 호출(방어 다층).
 */
export function normalizeIframeEmbedUrl(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  // 이미 embed 형식인 경우 그대로 통과
  if (
    ((host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'www.youtube-nocookie.com') &&
      path.startsWith('/embed/')) ||
    (host === 'player.vimeo.com' && path.startsWith('/video/'))
  ) {
    return url.toString();
  }

  // YouTube watch URL — v 파라미터에서 ID 추출, 시작 시간(t/start) 유지
  if (
    (host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com') &&
    path === '/watch'
  ) {
    const videoId = url.searchParams.get('v');
    if (videoId) {
      const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
      const t = url.searchParams.get('t') ?? url.searchParams.get('start');
      if (t) {
        const seconds = t.replace(/\D/g, '');
        if (seconds) embed.searchParams.set('start', seconds);
      }
      return embed.toString();
    }
  }

  // YouTube short URL (youtu.be/ID)
  if (host === 'youtu.be') {
    const videoId = path.slice(1).split('/')[0];
    if (videoId) {
      const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
      const t = url.searchParams.get('t') ?? url.searchParams.get('start');
      if (t) {
        const seconds = t.replace(/\D/g, '');
        if (seconds) embed.searchParams.set('start', seconds);
      }
      return embed.toString();
    }
  }

  // YouTube shorts (/shorts/ID)
  if (
    (host === 'www.youtube.com' || host === 'youtube.com') &&
    path.startsWith('/shorts/')
  ) {
    const videoId = path.split('/')[2];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  // Vimeo — 숫자 ID만 허용 (채널명 등은 제외)
  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    const videoId = path.slice(1).split('/')[0];
    if (videoId && /^\d+$/.test(videoId)) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  }

  return null;
}
