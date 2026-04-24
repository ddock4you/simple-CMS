/**
 * Schema.org JSON-LD 빌더 (Stage 9 Phase 4).
 *
 * 공개 웹 페이지가 검색엔진 Rich Result에 노출되도록 구조화 데이터 생성.
 * 호출 측에서 반환 객체를 `<script type="application/ld+json">`에 삽입.
 *
 * 검증: Google Rich Results Test (https://search.google.com/test/rich-results)
 */

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];

interface JsonLdObject {
  '@context'?: string;
  '@type': string | string[];
  [key: string]: JsonLdValue | undefined;
}

export interface OrganizationJsonLdInput {
  siteName: string;
  baseUrl: string;
  logoUrl?: string | null;
}

export interface WebSiteJsonLdInput {
  siteName: string;
  siteDescription?: string | null;
  baseUrl: string;
}

export interface ArticleJsonLdInput {
  url: string;
  headline: string;
  description?: string | null;
  publishedAt?: Date | string | null;
  modifiedAt?: Date | string | null;
  authorName?: string | null;
  siteName: string;
  baseUrl: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function buildOrganizationJsonLd(
  input: OrganizationJsonLdInput,
): JsonLdObject {
  const logo: JsonLdObject | undefined = input.logoUrl
    ? { '@type': 'ImageObject', url: input.logoUrl }
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.siteName,
    url: input.baseUrl,
    ...(logo ? { logo } : {}),
  };
}

export function buildWebSiteJsonLd(input: WebSiteJsonLdInput): JsonLdObject {
  const searchUrlTemplate = `${input.baseUrl}/search?q={search_term_string}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.siteName,
    url: input.baseUrl,
    ...(input.siteDescription ? { description: input.siteDescription } : {}),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrlTemplate,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildArticleJsonLd(input: ArticleJsonLdInput): JsonLdObject {
  const publisher: JsonLdObject = {
    '@type': 'Organization',
    name: input.siteName,
    ...(input.logoUrl
      ? { logo: { '@type': 'ImageObject', url: input.logoUrl } }
      : {}),
  };

  const datePublished = toIso(input.publishedAt);
  const dateModified = toIso(input.modifiedAt) ?? datePublished;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    ...(input.authorName
      ? { author: { '@type': 'Person', name: input.authorName } }
      : {}),
    publisher,
  };
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
): JsonLdObject | null {
  if (items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * JSON-LD 객체를 HTML에 안전하게 삽입하기 위해 `</script>` 등
 * JSON.stringify 결과의 script-closing 패턴을 이스케이프한다.
 *
 * 사용 예:
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
 * />
 * ```
 */
export function serializeJsonLd(jsonLd: JsonLdObject): string {
  return JSON.stringify(jsonLd).replace(/</g, '\\u003c');
}
