# 사전학습: 특별편 — 공개 웹 SEO 모듈화, Metadata/JSON-LD 단일 출처

> 이 문서는 Stage 9 [`sitemap-robots-구조화데이터`](./9-sitemap-robots-구조화데이터-사전학습.md)와 Stage 7l [`동적메타데이터-인메모리캐시`](./7l-동적메타데이터-인메모리캐시-MIME다층게이트-사전학습.md)의 후속 보완 문서다. 기존 문서가 "SEO 기능을 어떻게 구현하는가"에 집중했다면, 이 문서는 이미 구현된 SEO 정책을 **라우트별 중복 없이 유지보수 가능한 모듈로 정리하는 방법**에 집중한다.

## 이 주제에서 다루는 기술

- **Next.js App Router Metadata API** — `generateMetadata()`가 route segment별 `<head>` 정보를 구성하는 방식
- **MetadataRoute file convention** — `sitemap.ts`, `robots.ts`의 반환 객체를 XML/TXT로 직렬화하는 방식
- **Schema.org JSON-LD** — 검색엔진용 구조화 데이터를 `<script type="application/ld+json">`로 주입하는 방식
- **단일 출처 모듈화** — URL, title/description fallback, robots, sitemap, JSON-LD 조합 정책을 한곳에 모으는 설계
- **순수 함수 테스트** — DB/Next 런타임 없이 SEO 정책을 고정하는 단위 테스트 전략

## 핵심 개념

### Metadata Builder

#### 정의

Next.js `Metadata` 객체를 라우트 파일에서 직접 만들지 않고, 도메인별 helper 함수가 입력 데이터를 받아 `Metadata`를 반환하게 하는 패턴이다.

#### 동작 원리

App Router는 각 segment의 `generateMetadata()`를 실행하고, 반환된 `Metadata` 객체를 parent metadata와 병합해 최종 `<title>`, `<meta name="description">`, Open Graph, icon 등을 만든다. 이때 라우트 파일이 직접 `title`, `description`, `openGraph`를 조립하면 같은 fallback 정책이 여러 파일에 흩어진다.

모듈화 후 흐름은 다음과 같다.

1. route의 `generateMetadata()`는 slug/searchParams를 읽는다.
2. 필요한 공개 데이터만 조회한다.
3. `buildPostMetadata(post)` 같은 순수 helper에 넘긴다.
4. helper가 `seoTitle`, `seoDescription`, content summary, Open Graph 날짜 정책을 일관되게 적용한다.

#### 이 프로젝트에서의 적용

Simple CMS 공개 웹은 Subpage, Board, Post, Search가 서로 다른 SEO fallback을 갖는다. Post는 `seoDescription`이 없으면 plain text 본문을 160자로 요약하지만, Subpage는 블록 구조의 맥락 훼손을 피하기 위해 자동 요약을 쓰지 않는다. 이 차이를 route마다 직접 쓰면 회귀 위험이 커지므로 `apps/web/src/shared/lib/seo/metadata.ts` 같은 서버 helper로 분리하는 것이 맞다.

### JSON-LD 조합 계층

#### 정의

Schema.org 원시 builder와 페이지별 JSON-LD 조합 helper를 분리하는 패턴이다.

#### 동작 원리

JSON-LD에는 두 층이 있다.

- 원시 스키마 builder: `buildArticleJsonLd`, `buildBreadcrumbJsonLd`처럼 Schema.org 객체 하나를 만든다.
- 페이지 조합 builder: `buildPostJsonLd`처럼 branding, baseUrl, board/post 데이터를 받아 Article + BreadcrumbList 배열을 만든다.

이렇게 나누면 Schema.org 타입 자체의 규칙과 프로젝트 URL/브랜딩 정책이 섞이지 않는다. 라우트 컴포넌트는 `<JsonLdScripts items={items} />`만 렌더하고, `dangerouslySetInnerHTML`과 `<` 이스케이프를 반복하지 않는다.

#### 이 프로젝트에서의 적용

기존 `structuredData.ts`는 원시 builder 역할을 이미 잘 하고 있었다. 이번 모듈화의 핵심은 `layout.tsx`, `/p/[slug]`, `/board/[boardSlug]`, `/board/[boardSlug]/[postSlug]`에 흩어진 "어떤 JSON-LD를 어떤 URL로 만들 것인가"를 별도 helper로 옮기는 것이다.

### URL Builder 단일 출처

#### 정의

공개 URL 문자열 조합 규칙을 sitemap, metadata, JSON-LD가 공유하도록 한곳에 모으는 패턴이다.

#### 동작 원리

SEO에서는 같은 콘텐츠 URL이 여러 곳에 반복된다.

- sitemap `<loc>`
- Article `mainEntityOfPage.@id`
- BreadcrumbList `item`
- robots sitemap URL
- 향후 canonical URL

각 파일에서 `` `${baseUrl}/board/${boardSlug}/${postSlug}` ``를 반복하면 경로 변경 시 일부만 바뀌는 문제가 생긴다. `getPostUrl(baseUrl, boardSlug, postSlug)` 같은 helper가 있으면 정책 변경 지점이 하나로 줄어든다.

#### 이 프로젝트에서의 적용

Simple CMS의 공개 URL은 `/p/{slug}`, `/board/{boardSlug}`, `/board/{boardSlug}/{postSlug}`가 핵심이다. Board/Post slug 정책은 운영 콘텐츠 URL과 검색 노출에 직접 연결되므로 URL builder를 공유하는 것이 안전하다.

### 순수 함수 테스트

#### 정의

Next.js 서버 렌더링이나 DB 연결 없이 SEO 정책 helper만 독립적으로 검증하는 테스트 방식이다.

#### 동작 원리

SEO 모듈화는 화면 픽셀보다 객체 shape와 fallback 우선순위가 중요하다. 그래서 다음은 unit test로 고정하기 좋다.

- `seoTitle`이 있으면 title override
- Post content summary는 공백 정규화 + 160자 truncate
- robots는 `/api/` 기본 차단 + admin 설정 dedupe
- sitemap priority/changeFrequency 유지
- JSON-LD 직렬화에서 `<`가 `\u003c`로 escape

#### 이 프로젝트에서의 적용

`pnpm --filter @simple-cms/web exec vitest run --project unit`으로 빠르게 확인할 수 있는 테스트를 둔다. Storybook browser 테스트는 Playwright 브라우저 바이너리에 의존하므로, SEO 정책 자체는 unit project에서 먼저 고정하는 것이 안정적이다.

## 레거시 ↔ 모던 대조표

| 관점 | 레거시 환경에서는 | 이 프로젝트에서는 |
| ---- | ----------------- | ----------------- |
| 메타 태그 구성 | JSP/EJS/head include에 문자열 직접 출력 | Next.js `generateMetadata()`가 `Metadata` 객체를 반환 |
| URL 정책 | 템플릿마다 URL 문자열 반복 | `seo/urls.ts` helper가 sitemap/JSON-LD/metadata에서 공유 |
| 구조화 데이터 | HTML template에 JSON 문자열 직접 삽입 | Schema.org builder + `JsonLdScripts` 컴포넌트로 안전 렌더 |
| 보안 처리 | escape 누락을 코드 리뷰에 의존 | `serializeJsonLd()` 단일 함수로 `<` 이스케이프 고정 |
| 검증 방식 | 실제 페이지 소스 확인 중심 | 순수 함수 unit test로 fallback과 객체 shape 검증 |

## 구현 시 주의할 점

- SEO helper가 DB 조회까지 맡으면 라우트 책임과 데이터 책임이 섞인다. helper는 가능하면 입력 객체를 받아 순수하게 `Metadata`/JSON-LD를 반환한다.
- JSON-LD를 `metadata.other`로 넣지 않는다. 표준은 `<script type="application/ld+json">`이며 Next.js 공식 가이드도 page/layout에서 script 렌더를 안내한다.
- Post와 Subpage의 description fallback을 같게 만들지 않는다. Post는 plain text 기반 요약이 가능하지만, Subpage는 블록 조합이라 자동 요약이 항상 좋은 결과를 보장하지 않는다.
- route file convention(`sitemap.ts`, `robots.ts`)의 default export와 route config는 app 파일에 남긴다. helper는 반환 객체 생성만 담당한다.
- 기존 출력 보존 리팩터링이라면 `metadataBase`, canonical, Twitter card 같은 새 SEO 출력을 함께 넣지 않는다. 기능 추가와 구조 개선을 분리해야 회귀 범위가 작다.

## 이 주제를 마치면 설명할 수 있어야 하는 것

- [ ] `generateMetadata()` 안의 중복 코드를 helper로 빼도 Next.js Metadata API 동작이 바뀌지 않는 이유는 무엇인가?
- [ ] Schema.org 원시 builder와 페이지별 JSON-LD 조합 builder를 분리하는 이유는 무엇인가?
- [ ] sitemap, Article `mainEntityOfPage`, BreadcrumbList가 같은 URL builder를 공유해야 하는 이유는 무엇인가?
- [ ] `</script>` 인젝션 방어에서 `<` 이스케이프가 핵심인 이유는 무엇인가?
- [ ] 전체 Storybook browser test가 실패해도 SEO unit test와 typecheck로 어떤 범위까지 신뢰할 수 있는가?
