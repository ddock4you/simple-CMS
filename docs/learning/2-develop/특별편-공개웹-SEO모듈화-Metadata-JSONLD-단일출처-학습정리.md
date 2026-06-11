# 학습정리: 특별편 — 공개 웹 SEO 모듈화, Metadata/JSON-LD 단일 출처

## 구현 요약

기존 공개 웹 SEO 코드는 `layout.tsx`, 상세 페이지, `sitemap.ts`, `robots.ts`가 각자 metadata, URL, JSON-LD를 직접 조립하고 있었다.
이번 작업에서는 기능 출력은 보존하면서 `apps/web/src/shared/lib/seo/` 아래로 Metadata, JSON-LD, URL, robots, sitemap 정책을 분리했다.
`JsonLdScripts` 공통 컴포넌트를 추가해 `<script type="application/ld+json">` 반복과 안전 직렬화 호출을 한곳으로 모았다.
Post/Subpage/Board/Search 라우트는 데이터 조회와 페이지 렌더링 중심으로 얇아졌고, SEO fallback 정책은 순수 함수 테스트로 고정했다.

## 핵심 학습 포인트

### 1. SEO 정책을 route에서 helper로 이동

#### 개념

Route 파일은 URL segment와 데이터 조회, 렌더링 진입점을 담당하고, SEO 정책은 별도 helper가 담당하게 하는 구조다.

#### 동작 원리 심화

Next.js는 `generateMetadata()`가 반환하는 객체만 보면 되므로, 그 객체를 route 안에서 만들든 helper에서 만들든 프레임워크 동작은 같다. 중요한 것은 helper가 Next 런타임에 강하게 결합하지 않고 입력 객체를 받아 순수하게 `Metadata`를 반환하는 것이다. 이렇게 하면 `seoTitle`, `seoDescription`, Open Graph 날짜, demo mode title 같은 정책을 unit test로 고정할 수 있다.

#### 프로젝트 코드에서의 적용

- `apps/web/src/shared/lib/seo/metadata.ts`
  - `buildRootMetadata(branding)`
  - `buildSubpageMetadata(subpage)`
  - `buildBoardMetadata(board)`
  - `buildPostMetadata(post)`
  - `buildSearchMetadata(query)`
- `apps/web/app/p/[slug]/page.tsx`
  - 기존 inline title/description/openGraph 조립을 `buildSubpageMetadata(subpage)` 호출로 대체
- `apps/web/app/board/[boardSlug]/[postSlug]/page.tsx`
  - inline `summarizeContent`를 제거하고 `buildPostMetadata(post)`가 Post 전용 fallback을 담당

#### 설계 판단

이번 변경은 SEO 기능 추가가 아니라 보존 리팩터링이었다. 그래서 `metadataBase`, canonical, Twitter card 같은 개선 여지가 있어도 함께 넣지 않았다. 구조 변경과 출력 변경을 섞으면 문제가 생겼을 때 원인 추적이 어려워진다. 대신 현재 동작을 테스트로 고정하고, 다음 단계에서 canonical 같은 기능을 별도 PR로 넣을 수 있게 경계를 정리했다.

### 2. JSON-LD 렌더링을 공통 컴포넌트로 통합

#### 개념

JSON-LD 객체 배열을 받아 `<script type="application/ld+json">` 태그 여러 개로 렌더하는 작은 서버 컴포넌트를 둔 패턴이다.

#### 동작 원리 심화

JSON-LD는 Next Metadata 객체가 아니라 page/layout JSX에서 script로 렌더하는 것이 표준이다. 기존에는 각 라우트가 `serializeJsonLd()`와 `dangerouslySetInnerHTML`을 직접 반복했다. 이 반복은 보안 함수 누락 위험을 만든다. `JsonLdScripts`가 `serializeJsonLd()`를 내부에서 항상 호출하면 호출자는 JSON-LD 객체 배열만 넘기면 된다.

#### 프로젝트 코드에서의 적용

- `apps/web/src/shared/ui/JsonLdScripts.tsx`
  - `JsonLdObject[]`를 받아 index key로 script 태그를 렌더
  - 각 item은 `serializeJsonLd(item)`을 거쳐 `<` 이스케이프 적용
- `apps/web/src/shared/lib/seo/jsonLd.ts`
  - `buildGlobalJsonLd({ branding, baseUrl })`
  - `buildSubpageJsonLd({ subpage, branding, baseUrl })`
  - `buildBoardJsonLd({ board, branding, baseUrl })`
  - `buildPostJsonLd({ post, branding, baseUrl })`

#### 설계 판단

기존 `structuredData.ts`는 원시 Schema.org builder로 유지했다. 여기에 페이지별 조합 로직까지 모두 넣으면 파일이 "스키마 객체 생성"과 "프로젝트 라우팅 정책"을 동시에 알게 된다. 그래서 `structuredData.ts`는 Article/BreadcrumbList 같은 원시 구조를 만들고, `seo/jsonLd.ts`는 프로젝트의 URL과 branding을 조합하는 계층으로 분리했다.

### 3. URL, sitemap, robots 정책의 단일 출처화

#### 개념

공개 URL과 검색엔진 노출 정책을 여러 파일에서 문자열로 반복하지 않고 helper로 통일하는 방식이다.

#### 동작 원리 심화

SEO에서 URL은 단순 링크가 아니라 canonical 후보, sitemap 위치, breadcrumb item, Article `mainEntityOfPage.@id`가 된다. 어느 한 곳만 다른 경로를 만들면 검색엔진은 같은 콘텐츠를 다른 리소스로 해석할 수 있다. 따라서 URL helper를 별도로 두면 향후 board 경로나 subpage 경로가 바뀌어도 sitemap과 JSON-LD가 함께 바뀐다.

#### 프로젝트 코드에서의 적용

- `apps/web/src/shared/lib/seo/urls.ts`
  - `getHomeUrl`
  - `getSubpageUrl`
  - `getBoardUrl`
  - `getPostUrl`
- `apps/web/src/shared/lib/seo/sitemap.ts`
  - `buildDemoSitemap`
  - `buildPublicSitemap`
- `apps/web/src/shared/lib/seo/robots.ts`
  - `buildDemoRobotsMetadata`
  - `buildRobotsMetadata`

#### 설계 판단

`sitemap.ts`와 `robots.ts` 자체는 Next.js file convention이라 app 루트에 남겨야 한다. 대신 그 내부의 객체 생성 로직만 helper로 이동했다. 이렇게 하면 Next.js가 파일을 인식하는 경계는 그대로 두면서, 정책은 테스트 가능한 순수 함수로 분리된다.

### 4. 테스트로 보존 리팩터링 검증

#### 개념

리팩터링 전후 출력 의미가 같음을 순수 함수 단위 테스트로 확인하는 방식이다.

#### 동작 원리 심화

이번 변경은 DB schema나 사용자 화면이 아니라 SEO 객체 shape를 다룬다. 그래서 E2E보다 `buildPostMetadata`, `buildPublicSitemap`, `buildRobotsMetadata`, `buildPostJsonLd` 같은 함수 테스트가 더 직접적이다. 특히 Post summary fallback, robots dedupe, sitemap priority, JSON-LD escape는 작은 입력/출력으로 정책을 고정할 수 있다.

#### 프로젝트 코드에서의 적용

추가된 테스트:

- `apps/web/src/shared/lib/seo/metadata.test.ts`
- `apps/web/src/shared/lib/seo/jsonLd.test.ts`
- `apps/web/src/shared/lib/seo/sitemap.test.ts`
- `apps/web/src/shared/lib/seo/robots.test.ts`
- `apps/web/src/shared/lib/seo/text.test.ts`
- `apps/web/src/shared/lib/seo/urls.test.ts`

검증 결과:

- `pnpm --filter @simple-cms/web typecheck` 통과
- `pnpm --filter @simple-cms/web exec vitest run --project unit` 통과
- `pnpm --filter @simple-cms/web lint` 통과, 기존 `KoglFooter.tsx` `<img>` warning 2건만 존재
- 전체 `pnpm --filter @simple-cms/web test`는 Storybook browser project가 로컬 Playwright Chromium 바이너리를 찾지 못해 실패했지만, unit project는 통과

#### 설계 판단

전체 테스트 실패를 무시한 것이 아니라 실패 범위를 분리했다. SEO helper는 브라우저가 없어도 검증 가능한 순수 함수이고, 실제 실패 원인은 `~/.cache/ms-playwright/.../chrome-headless-shell` 누락이었다. 따라서 이번 변경 검증은 unit/typecheck/lint로 충분히 수행했고, Storybook browser 검증은 Playwright 설치 환경이 준비된 CI나 로컬에서 별도 확인하면 된다.

## 레거시 경험과의 연결

- 레거시에서는 공통 head include 파일에 meta 태그를 직접 추가하고, 예외 페이지는 각 템플릿에서 override하는 방식이 흔했다. 이번에는 같은 문제를 Next.js `Metadata` 객체와 helper 함수로 구조화했다.
- 레거시에서도 URL 문자열이 여러 JSP/템플릿에 흩어지면 경로 변경 때 누락이 생겼다. 이번에는 `seo/urls.ts`가 sitemap, JSON-LD, 향후 canonical의 단일 출처 역할을 한다.
- 운영 경험에서 중요한 것은 "잘 보이는 화면"뿐 아니라 "검색엔진, 공유 카드, 크롤러가 읽는 보이지 않는 출력"이다. 이번 작업은 그 보이지 않는 출력의 유지보수성을 높인 사례다.
- 기존 운영 감각은 테스트에도 연결된다. 브라우저 환경 문제와 실제 코드 회귀를 분리해서 판단한 점은 레거시 운영 장애 분석과 같은 사고 방식이다.

## 면접 예상 질문 & 답변

### Q1. SEO 코드를 왜 route 파일에 그대로 두지 않고 helper로 분리했나요?

#### 답변 예시

공개 웹의 SEO 정책은 title, description, Open Graph, sitemap, JSON-LD처럼 여러 route에서 반복됩니다. 처음 구현할 때는 route 파일에 직접 쓰는 것이 빠르지만, Post와 Subpage의 description fallback처럼 도메인별 차이가 생기면 중복이 곧 회귀 위험이 됩니다. 그래서 route는 데이터 조회와 렌더링 진입점만 담당하고, SEO 정책은 `shared/lib/seo` 아래 순수 helper로 분리했습니다. 이 방식은 Next.js `generateMetadata()`의 동작을 바꾸지 않으면서 테스트 가능성을 높입니다. 특히 `buildPostMetadata()`처럼 입력 객체와 출력 metadata가 명확한 함수는 DB나 브라우저 없이도 검증할 수 있습니다. 트레이드오프는 파일 수가 늘어난다는 점이지만, 공개 SEO는 검색 노출과 공유 카드에 영향을 주므로 단일 출처를 갖는 편이 유지보수에 더 유리하다고 판단했습니다.

#### 꼬리 질문 대응

**"그럼 모든 route 로직을 helper로 빼야 하나요?"**
아닙니다. route segment와 Next file convention은 app 파일에 남기는 것이 맞습니다. 반복되는 SEO 정책과 순수 조합 로직만 helper로 분리했습니다.

**"SEO 기능을 추가하지 않고 리팩터링만 한 이유는 뭔가요?"**
출력 변경과 구조 변경을 섞으면 회귀 원인 추적이 어려워집니다. 먼저 기존 출력을 보존하면서 단일 출처를 만들고, canonical이나 Twitter card는 후속 작업으로 분리하는 편이 안전합니다.

### Q2. JSON-LD를 공통 컴포넌트로 렌더하면 어떤 장점이 있나요?

#### 답변 예시

JSON-LD는 표준적으로 `<script type="application/ld+json">` 태그로 렌더해야 합니다. 기존에는 각 route가 `dangerouslySetInnerHTML`과 `serializeJsonLd()`를 반복해서 호출했는데, 이 방식은 한 곳에서 안전 직렬화를 빠뜨릴 위험이 있습니다. 그래서 `JsonLdScripts` 컴포넌트를 만들어 JSON-LD 객체 배열만 넘기면 항상 `serializeJsonLd()`를 거쳐 렌더되도록 했습니다. 원시 Schema.org builder는 `structuredData.ts`에 유지하고, 페이지별 조합은 `seo/jsonLd.ts`로 분리했습니다. 이렇게 하면 Schema.org 구조 자체와 프로젝트 URL/브랜딩 정책이 섞이지 않습니다. 트레이드오프는 컴포넌트가 매우 작아서 처음에는 과해 보일 수 있다는 점인데, 보안 관련 반복을 줄인다는 점에서 충분한 가치가 있습니다.

#### 꼬리 질문 대응

**"`metadata.other`로 JSON-LD를 넣으면 안 되나요?"**
JSON-LD는 meta tag가 아니라 script tag가 표준입니다. Next.js 공식 가이드도 page/layout JSX에서 `<script type="application/ld+json">`로 렌더하는 방식을 안내합니다.

**"왜 `<`만 이스케이프하나요?"**
HTML 파서가 script 블록을 종료하거나 새 태그를 시작하는 핵심 문자가 `<`입니다. `</script>`도 `<`가 이스케이프되면 태그 종료로 인식되지 않습니다.

### Q3. 전체 테스트가 Playwright 문제로 실패했는데, 이번 변경을 어떻게 검증했나요?

#### 답변 예시

전체 `web test`는 Storybook browser project까지 함께 실행하면서 Playwright Chromium 바이너리가 없어서 실패했습니다. 에러 메시지는 코드 실패가 아니라 `/home/ddock4you/.cache/ms-playwright/.../chrome-headless-shell` 실행 파일 누락을 가리켰습니다. 이번 SEO 모듈화의 핵심은 브라우저 상호작용이 아니라 metadata/JSON-LD/sitemap/robots 객체 shape이므로 unit project를 별도로 실행했습니다. `pnpm --filter @simple-cms/web exec vitest run --project unit`은 통과했고, 추가한 SEO 테스트 18개도 모두 통과했습니다. `typecheck`와 `lint`도 통과했기 때문에 TypeScript 경계와 코드 스타일 문제는 확인했습니다. 다만 Storybook browser 테스트는 Playwright 설치 후 별도로 실행해야 하는 잔여 환경 리스크로 기록했습니다.

#### 꼬리 질문 대응

**"그럼 E2E 검증은 필요 없나요?"**
필요합니다. 다만 이번 변경의 1차 검증은 순수 함수 출력 보존입니다. 실제 HTML source와 Rich Results 검증은 배포 URL이나 Playwright 환경이 준비된 상태에서 추가로 보는 것이 맞습니다.

**"테스트를 왜 이렇게 많이 추가했나요?"**
SEO는 화면에 잘 보이지 않는 출력이라 수동 확인만으로는 회귀를 놓치기 쉽습니다. 작은 순수 함수 테스트가 장기적으로 가장 싼 회귀 방어가 됩니다.

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| ---- | ---- | ---- |
| 전체 `pnpm --filter @simple-cms/web test` 실패 | Storybook browser project가 Playwright Chromium 바이너리를 찾지 못함 | unit project를 별도 실행해 SEO 변경 범위를 검증. Playwright 설치 후 전체 browser test 재실행 필요 |
| 기존 SEO 문서와 주제 중복 가능성 | Stage 9 SEO 구현 문서가 이미 존재 | 새 Stage 문서가 아니라 "특별편 후속"으로 작성하고 첫 문단에 보완 관계 명시 |
| JSON-LD 타입을 공통 컴포넌트에 전달하기 어려움 | `JsonLdObject`가 기존 `structuredData.ts` 내부 interface였음 | `JsonLdObject`를 export해 `JsonLdScripts`와 SEO helper가 타입을 공유 |

## 한 줄 요약 카드

- **Metadata Builder**: `generateMetadata()`의 반환 객체를 route 안에서 직접 만들지 않고 순수 helper로 분리하면 fallback 정책을 테스트할 수 있다.
- **JSON-LD 조합 계층**: Schema.org 원시 builder와 페이지별 URL/브랜딩 조합 helper를 나누면 구조화 데이터와 프로젝트 정책이 섞이지 않는다.
- **URL 단일 출처**: sitemap, breadcrumb, Article `mainEntityOfPage`가 같은 URL helper를 공유해야 검색엔진이 동일 콘텐츠를 동일 URL로 이해한다.
- **보존 리팩터링**: canonical/Twitter card 같은 새 기능은 욕심내지 않고, 먼저 기존 출력을 고정한 뒤 구조만 정리하는 것이 안전하다.
- **검증 분리**: Playwright 브라우저 환경 실패와 SEO 순수 함수 회귀는 다른 문제이므로 unit/typecheck/lint로 이번 변경 범위를 명확히 검증했다.

## 추가 학습 자료

- Next.js Docs — Metadata API: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js Docs — JSON-LD: https://nextjs.org/docs/app/guides/json-ld
- Next.js Docs — sitemap file convention: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- Next.js Docs — robots file convention: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
- Schema.org — Article: https://schema.org/Article
- Schema.org — BreadcrumbList: https://schema.org/BreadcrumbList
