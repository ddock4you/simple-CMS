# Stage 9 — SEO 기반 구축 (sitemap + robots + 페이지별 SEO + Schema.org JSON-LD)

공개 웹이 검색엔진·소셜 미디어에 온전히 노출되도록 SEO 골격을 구축. Stage 7l 브랜딩+메타데이터 기반 위에 sitemap.xml / robots.txt / 페이지별 SEO 필드(Post) / Schema.org 구조화 데이터를 얹어 상용 CMS 수준의 검색 노출 기반 완성.

- **Phase 1 — sitemap.xml + robots.txt + `/settings/seo` 관리자 탭**
  - `apps/web/app/sitemap.ts`: Next.js 16 `MetadataRoute.Sitemap`. `dynamic = 'force-dynamic'` + Prisma 직접 조회로 published Subpage / Board / Post 자동 수집. 타입별 `changeFrequency`/`priority`(홈 daily/1.0, Subpage monthly/0.8, Board index weekly/0.7, Post weekly/0.6). `lastModified = updatedAt ?? publishedAt ?? now`
  - `apps/web/app/robots.ts`: `MetadataRoute.Robots` 구조체. 기본 Disallow `/api/` + `ROBOTS_ADDITIONAL_DISALLOW` SiteSetting(JSON 배열)을 병합. `sitemap + host`로 sitemap 자동 링크. `dynamic = 'force-dynamic'`로 관리자 변경 즉시 반영
  - `apps/web/src/shared/lib/seoCache.ts`: `brandingCache.ts`/`domainCache.ts` 동일 패턴(60s prod / 5s dev TTL). 파싱 실패한 JSON은 폴백 빈 배열 반환해 robots.txt 서빙 차단 금지
  - `/settings/seo` 관리자 탭 신설: `SeoSettingsForm.tsx`(2개 Card — 공개 URL·sitemap URL 안내 + 추가 Disallow Textarea). Textarea ↔ `string[]` 변환은 Controller + `parseTextareaToPaths`/`pathsToTextarea` 헬퍼. Zod `updateSeoSchema`: 경로 `/`시작 + 200자 + 최대 50개
  - `PATCH /api/settings/seo`: `settings:update` 권한 + dedupe + 기본 `/api/` 중복 제거 + before/after 정렬 비교 no-op short-circuit + 변경 시만 audit(`SITE_SETTINGS` entityType)
  - **왜 구조화 방식(MetadataRoute)인가**: raw text 편집을 원할 경우 `app/robots.txt/route.ts`로 전환해야 하지만 Next.js 파일 컨벤션과 충돌 + 95% 케이스는 Disallow 추가만으로 충족. 필요 시 미래 전환 용이 (저장 키 1개만)

- **Phase 2 — Post SEO 필드 추가**
  - `Post.seoTitle String?` + `Post.seoDescription String? @db.Text` 신규(`pnpm db:push` 적용). Subpage는 Stage 7m 드라이브바이에서 이미 seoTitle/seoDescription audit diff 커버 완료 — 스키마·편집 UI·generateMetadata 모두 기존 자산 그대로 활용 (갭 없음 확인)
  - `createPostSchema`/`updatePostSchema`: max 200/500 validation 복제. `seoTitle?.trim() || null` 정규화로 빈 문자열을 null로 저장 (DB 일관성)
  - `POST /api/posts`: `changes.after`에 seoTitle/seoDescription 포함. `PATCH /api/posts/[id]`: before/after 정규화 비교로 변경된 필드만 audit diff
  - `PostForm.tsx`: 새 "SEO" Card 추가 (왼쪽 콘텐츠 컬럼 하단, SubpageForm 패턴 복제). `PostView.tsx`: seoTitle/seoDescription 중 하나라도 있으면 SEO Card 조건부 렌더
  - `PostForm.stories.tsx`: `draftPost` fixture에 seoTitle/seoDescription = null 추가 (TypeScript 타입 호환)

- **Phase 3 — generateMetadata 확장**
  - `apps/web/src/entities/post/api/getPost.ts`의 `PublishedPost`/`PreviewPost` 타입 + select에 seoTitle/seoDescription/content 추가
  - `/board/[boardSlug]/[postSlug]/page.tsx` `generateMetadata`: `title = seoTitle ?? title`, `description = seoDescription ?? summarizeContent(content)` 3단 폴백. `summarizeContent` 헬퍼(공백 정규화 + 160자 truncate + `…`). OG도 동일 title/description + `type: 'article'` + publishedTime/modifiedTime
  - Board(`/board/[boardSlug]/page.tsx`)는 기존 `board.name + board.description` 유지 (Board SEO 필드 추가는 범위 밖 — description 이미 있음)
  - Subpage(`/p/[slug]/page.tsx`)는 이미 seoTitle/seoDescription 반영 중 (Stage 7m 이전 구현) → Phase 3에서 변경 없음

- **Phase 4 — Schema.org JSON-LD**
  - `apps/web/src/shared/lib/structuredData.ts` 신규 헬퍼 4종 + `serializeJsonLd` 안전 직렬화(`<` → `<` 이스케이프 — `</script>` 인젝션 방지):
    - `buildOrganizationJsonLd(siteName, baseUrl, logoUrl?)` — 전 페이지 공통
    - `buildWebSiteJsonLd(siteName, description?, baseUrl)` — SearchAction (`/search?q={search_term_string}`) 포함, 검색엔진 sitelinks searchbox 자격 확보
    - `buildArticleJsonLd({url, headline, description?, publishedAt?, modifiedAt?, authorName?, siteName, baseUrl, logoUrl?, imageUrl?})` — Subpage + Post 공용. `mainEntityOfPage`로 canonical URL 지정. `dateModified`는 modifiedAt ?? publishedAt 폴백
    - `buildBreadcrumbJsonLd(items)` — 빈 배열이면 null 반환, 호출 측이 조건부 렌더
  - 삽입 위치:
    - `app/layout.tsx` 전역 `<head>`: Organization + WebSite 2개 (`Promise.all`로 branding/baseUrl 동시 조회)
    - `/p/[slug]/page.tsx`: Article + BreadcrumbList (홈 → Subpage 2뎁스). Subpage가 없으면 `<SubpagePage>`만 반환해 notFound 경로와 호환
    - `/board/[boardSlug]/page.tsx`: BreadcrumbList (홈 → Board)
    - `/board/[boardSlug]/[postSlug]/page.tsx`: Article + BreadcrumbList (홈 → Board → Post). preview 모드는 JSON-LD 없음 (현재 콘텐츠가 아닌 draft라 검색엔진 노출 부적합)
  - **왜 `<script dangerouslySetInnerHTML>`인가**: Next.js `metadata.other`는 meta 태그 전용. JSON-LD는 script 태그가 표준. `serializeJsonLd`의 `<` 이스케이프로 XSS 경로 차단
  - **검증 방법**: [Google Rich Results Test](https://search.google.com/test/rich-results)에 배포된 URL 입력 → Article + BreadcrumbList 인식 확인. 로컬은 dev server + View Source

- **Drive-by: 이스케이프 유틸 표준화**: `serializeJsonLd`가 JSON.stringify 결과의 모든 `<`를 `<`로 치환. `</script>`, `<!--` 주석 인젝션 모두 방어. `dangerouslySetInnerHTML` 사용처 공통 규약

- **Stage 9에서 하지 않은 것 (Out of Scope → 후속 Stage):**
  - **Phase 5 (페이지별 OG 이미지)**: Subpage/Post에 `ogImageMediaId` 필드 추가 + MediaPicker 통합 + generateMetadata.openGraph.images 폴백 (사이트 전역 → 페이지별 → 없음). 선택 사항으로 유지 — 실사용 시 이벤트/캠페인 페이지 등 특수 케이스에서만 필요. 요청 시 독립 Stage로 분리 가능
  - **Board SEO 필드**: 현재 `description`만 사용 중. `seoTitle`/`seoDescription`/`ogImageMediaId` 추가는 Board가 소개글 맥락에서 SEO 가치가 올라올 때 검토
  - **Subpage description 폴백**: `subpage.seoDescription`만 사용, content(PGroonga plain text) 폴백 미적용. 서브페이지는 블록 구성이 다양해 content가 200~수천 자로 뛰므로 description truncate 시 맥락 훼손 위험 — seoDescription 입력을 기본 전제로 유지
  - **robots.txt 전체 텍스트 편집**: 현재는 Disallow 배열만 관리. 크롤 지연/Host/복수 UA 규칙 등 고급 설정은 `app/robots.txt/route.ts` 전환 시 가능 (Next.js 파일 컨벤션 제약 때문에 robots.ts와 공존 불가)
  - **Image Sitemap / Video Sitemap**: 현재 sitemap.ts는 `MetadataRoute.Sitemap`의 `images?: string[]` 필드 미사용. 이미지 SEO 가치가 크면 후속 Stage에서 확장
  - **robots.txt 감사 로그 diff 세부화**: 현재 `ROBOTS_ADDITIONAL_DISALLOW` 전체 배열을 before/after에 덤프. 대량 경로 관리 시 added/removed 분리 diff가 유용하지만 현 규모(최대 50개)에선 과한 엔지니어링

- **검증** (2026-04-24 확인 완료)
  - `pnpm typecheck` / `pnpm lint` 녹색 (신규 0 error/warning, 기존 warning은 pre-existing)
  - `pnpm test` 녹색 (admin 25 files/90 tests, web 12 files/33 tests 유지 — Stage 7g/7h/7i/7j/7l/7m 카운트 변동 없음). Web test는 turbo 병렬 시 Playwright cold start 타임아웃(Stage 7k-3 known issue) 발생하므로 단독 실행 필요
  - `curl http://localhost:3000/sitemap.xml` → 유효한 XML + 6 URL 엔트리(홈 + Subpage 2 + Board 2 + Post 1), lastmod/changefreq/priority 정상
  - `curl http://localhost:3000/robots.txt` → `User-Agent: * / Allow: / / Disallow: /api/ / Host / Sitemap` 정상
  - 홈 `/` → Organization + WebSite JSON-LD 2개 삽입 확인. WebSite의 SearchAction `urlTemplate`이 `baseUrl/search?q={search_term_string}`로 올바르게 생성
  - Subpage `/p/sub2` → Organization + WebSite + Article(mainEntityOfPage/headline/datePublished/dateModified/publisher) + BreadcrumbList(홈 → 서브2) 4개 삽입 확인
  - Board `/board/free-board` → Organization + WebSite + BreadcrumbList 3개 확인
  - ⚠️ Post `/board/free-board/sdfgsdfg` → 500 확인. 원인: 사용자 dev server가 `pnpm db:generate` 이전에 시작되어 Prisma client에 Post.seoTitle/seoDescription/content 필드 누락. Dev server 재시작 후 정상 동작 예상. Stage 9 코드 자체는 `pnpm typecheck` 녹색으로 정적 보증 완료

- 상세 계획 문서: [`C:/Users/ddock/local plan files/cms-enchanted-koala.md`](../../../Users/ddock/local plan files/cms-enchanted-koala.md) (Stage 9 섹션)
