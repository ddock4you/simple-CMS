/**
 * admin에서 web 절대 URL을 조립할 때 사용.
 *
 * 우선순위: WEB_BASE_URL > NEXT_PUBLIC_SITE_URL > http://localhost:3000
 *
 * 커스텀 도메인 우선처리는 web 측 책임 (admin은 환경변수만).
 * — admin이 SiteSettings DB를 매 클릭마다 조회하면 비용이 큼.
 *   운영 환경에서는 WEB_BASE_URL을 정확히 설정하는 것을 전제로 한다.
 */
export function getWebBaseUrl(): string {
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
