/**
 * admin에서 web 절대 URL을 조립할 때 사용.
 *
 * 우선순위: DEMO_MODE 시 '' (상대 경로) > WEB_BASE_URL > NEXT_PUBLIC_SITE_URL > http://localhost:3000
 *
 * 시연 모드(DEMO_MODE=true)는 admin과 web이 단일 apex 도메인을 공유하므로
 * (web의 rewrites가 /_cms/admin/*를 admin으로 프록시) 빈 문자열을 반환해
 * 상대 경로(/p/slug, /board/slug)로 동작하게 한다.
 * 운영 환경에서는 WEB_BASE_URL을 정확히 설정하는 것을 전제로 한다.
 */
export function getWebBaseUrl(): string {
  if (process.env.DEMO_MODE === 'true') {
    return '';
  }
  return (
    process.env.WEB_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  );
}

export function getSubpagePublicUrl(slug: string): string {
  return `${getWebBaseUrl()}/p/${slug}`;
}

export function getPostPublicUrl(boardSlug: string, postSlug: string): string {
  return `${getWebBaseUrl()}/board/${boardSlug}/${postSlug}`;
}

export function getBoardPublicUrl(boardSlug: string): string {
  return `${getWebBaseUrl()}/board/${boardSlug}`;
}
