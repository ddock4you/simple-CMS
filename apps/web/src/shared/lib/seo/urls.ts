export function getHomeUrl(baseUrl: string): string {
  return baseUrl;
}

export function getSubpageUrl(baseUrl: string, slug: string): string {
  return `${baseUrl}/p/${slug}`;
}

export function getBoardUrl(baseUrl: string, boardSlug: string): string {
  return `${baseUrl}/board/${boardSlug}`;
}

export function getPostUrl(
  baseUrl: string,
  boardSlug: string,
  postSlug: string,
): string {
  return `${getBoardUrl(baseUrl, boardSlug)}/${postSlug}`;
}
