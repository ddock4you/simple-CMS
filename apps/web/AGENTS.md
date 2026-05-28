<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
# apps/web — 공개 웹

일반 사용자 대상 공개 웹 애플리케이션. 콘텐츠 소비 중심이며, SSR/SEO를 최우선으로 한다.
KRDS 기반 UI를 사용하고, Storybook으로 문서화한다.

## 앱 성격

- 공개 서비스 전용 (비로그인 접근)
- 콘텐츠 소비 중심
- SSR/SEO 대응 필수
- 포트: **3000**

## FSD 구조 (정석)

```
app/              # Next.js App Router (루트에 배치)
pages/            # Pages Router placeholder (README.md만)
src/
├── pages/        # FSD pages 레이어
├── widgets/      # 조합형 UI 블록
├── features/     # 기능 단위 로직
├── entities/     # 도메인 엔티티 관련
└── shared/       # 공용 유틸, UI 기본 컴포넌트
```

루트 `app/`은 Next.js App Router 라우팅 전용.
실제 FSD 레이어는 `src/` 아래 구성.

> **Next.js Pages Router 충돌 방지**:
> `app/`과 `pages/`를 앱 루트에 배치하여 "same folder" 제약을 충족하고,
> `src/pages/`를 FSD pages 레이어로 안전하게 사용한다.
> 참고: https://feature-sliced.design/kr/docs/guides/tech/with-nextjs

## 라우팅

```
/                                   # 메인 페이지
/p/[slug]                           # 서브페이지
/board/[boardSlug]                  # 게시판 목록
/board/[boardSlug]/[postSlug]       # 게시글 상세
/search?q=...                       # 통합검색
```

## SSR / SEO 정책

- 모든 공개 페이지는 서버사이드 렌더링
- 콘텐츠별 title / description 메타데이터 제공
- 게시글/페이지 상세 metadata 처리
- slug 기반 URL 관리
- `published` 상태 콘텐츠만 공개 노출

### sitemap.xml + robots.txt (Stage 9)

- `apps/web/app/sitemap.ts` — Next.js 16 `MetadataRoute.Sitemap`. `dynamic = 'force-dynamic'` + Prisma 직접 조회로 published Subpage/Board/Post 자동 수집
  - 우선순위/변경 주기: 홈 daily/1.0, Subpage monthly/0.8, Board index weekly/0.7, Post weekly/0.6
  - `lastModified = updatedAt ?? publishedAt ?? now()` 3단 폴백
  - baseUrl은 `getSiteUrl()` (커스텀 도메인 → `NEXT_PUBLIC_SITE_URL` 폴백)
  - 수만 건 이상으로 커지면 `revalidate = 300` 검토 (현재 규모는 요청당 Prisma 3쿼리로 충분)
- `apps/web/app/robots.ts` — `MetadataRoute.Robots` 구조체. `dynamic = 'force-dynamic'`
  - 기본 Disallow `/api/` + admin이 `/settings/seo`에서 관리하는 `ROBOTS_ADDITIONAL_DISALLOW` SiteSetting(JSON 배열) 병합
  - `sitemap: ${baseUrl}/sitemap.xml`, `host: baseUrl` 자동 포함
  - **`DEMO_MODE=true` 분기 (시연 환경 검색엔진 차단)**: 운영 분기 진입 전 early return으로 `{ rules: { userAgent: '*', disallow: '/' } }` 출력. sitemap·host 라인 없음. defense in depth — `apps/web/vercel.json`의 `X-Robots-Tag: noindex, nofollow, noarchive` 헤더와 함께 적용. 자세한 정책은 `docs/react-cms-시연모드-배포-가이드.md` 11장 참조
- `apps/web/src/shared/lib/seoCache.ts` — `brandingCache.ts`/`domainCache.ts` 동일 패턴(60s prod / 5s dev TTL). `ROBOTS_ADDITIONAL_DISALLOW` 파싱 실패 시 빈 배열 폴백(robots.txt 서빙 차단 금지)

### 페이지별 SEO 메타데이터

- Subpage: `seoTitle`, `seoDescription` 스키마 기존 보유(Stage 7m 이전). `/p/[slug]/page.tsx` `generateMetadata`가 `seoTitle ?? title`, `seoDescription ?? undefined` 폴백
- Post (Stage 9): `seoTitle`, `seoDescription` 필드 신규 추가. `/board/[boardSlug]/[postSlug]/page.tsx` `generateMetadata`가 `seoTitle ?? title`, `seoDescription ?? summarizeContent(content)` 3단 폴백 (`summarizeContent` inline 헬퍼 — 공백 정규화 + 160자 truncate + `…`)
- Board: `description` 사용 (SEO 전용 필드 없음, Stage 9 범위 외)

### Schema.org JSON-LD (Stage 9)

- 위치: `apps/web/src/shared/lib/structuredData.ts` — 빌더 4종 + 안전 직렬화
  - `buildOrganizationJsonLd` — 전 페이지 공통
  - `buildWebSiteJsonLd` — `SearchAction` 포함(sitelinks searchbox 자격)
  - `buildArticleJsonLd` — Subpage/Post 공용, `mainEntityOfPage`로 canonical URL
  - `buildBreadcrumbJsonLd` — 빈 배열이면 null 반환
  - `serializeJsonLd` — `<` → `<` 이스케이프로 `</script>` 인젝션 차단. `dangerouslySetInnerHTML` 사용처 공통 규약
- 삽입 위치:
  - `app/layout.tsx` `<head>`: Organization + WebSite 2개 (전 페이지 공통)
  - `/p/[slug]/page.tsx`: Article + BreadcrumbList (홈 → Subpage). Preview 모드는 JSON-LD 없음 (draft 노출 부적합)
  - `/board/[boardSlug]/page.tsx`: BreadcrumbList (홈 → Board)
  - `/board/[boardSlug]/[postSlug]/page.tsx`: Article + BreadcrumbList (홈 → Board → Post). Preview 모드는 JSON-LD 없음
- 검증: [Google Rich Results Test](https://search.google.com/test/rich-results)로 배포 URL 제출 → Article + BreadcrumbList 인식 확인
- **`metadata.other` vs `<script>`**: JSON-LD는 `<script type="application/ld+json">`이 표준. Next.js `metadata.other`는 meta 태그 전용이라 부적합 — `<script dangerouslySetInnerHTML>` + `serializeJsonLd` 패턴 고정

## KRDS 사용 원칙

- KRDS는 공개 웹 전용 UI 기반
- KRDS 원본을 직접 사용하는 것이 아닌 **래퍼/조합 컴포넌트**로 관리
- 래퍼 컴포넌트는 `apps/web` 내부 레이어에서 관리 (공용 패키지 X)
- Storybook은 Stage 7f에서 shell로 도입되고 Stage 7g에서 widgets/features/KRDS showcase story로 확장됨 (아래 "Storybook + Vitest" 섹션 참조)

## KRDS Tailwind 스타일링 (Stage 7e)

공개 웹은 기존 `globals.css`(1670줄, `.home-*`/`.subpage-*` 등 BEM-스러운 네이밍)와 함께 Tailwind v4 utility를 병행한다. KRDS 컴포넌트 CSS는 사용하되, KRDS의 전역 `html { font-size: 62.5%; }` 정책과 Tailwind plugin 토큰 override는 앱 전역에 적용하지 않는다.

### 설정 구조

- `apps/web/postcss.config.mjs` — `@tailwindcss/postcss`만 등록
- `apps/web/scripts/normalize-krds-css.mjs` — `krds-react/dist/index.css`를 읽어 `apps/web/app/krds-normalized.css` 생성
  - `--krds-font-size-base: 62.5%` → `100%`
  - KRDS CSS 내부 `rem` 값은 `0.625배`로 변환해 KRDS 컴포넌트의 실제 px 크기 보존
  - `predev` / `prebuild` / `prestorybook` / `prebuild-storybook`에서 자동 재생성
- `apps/web/app/globals.css` 상단:
  ```css
  @layer theme, krds-base, components, utilities;
  @import 'tailwindcss/theme.css' layer(theme);
  @import 'tailwindcss/utilities.css' layer(utilities);
  @theme {
    --breakpoint-mobile: 360px;
    --breakpoint-tablet: 601px;
    --breakpoint-desktop: 1025px;
  }
  @plugin "@tailwindcss/typography";
  ```
- **Preflight 제외** 방식 (`tailwindcss/preflight.css` import 안 함) — KRDS 컴포넌트의 `<button>`/`<input>` 기본 스타일과 충돌 방지
- layout.tsx의 import 순서: `import './krds-normalized.css';` → `import './globals.css';` — utility가 KRDS CSS 위에 올라가 overrides 가능

### KRDS token 사용 원칙

`@krds-ui/tailwindcss-plugin`은 `theme.extend.{colors,fontSize,fontWeight,spacing,borderRadius}`뿐 아니라 spacing/screens를 Tailwind 기본과 다르게 만드는 부작용이 있어 web 런타임에서 사용하지 않는다. KRDS 값이 필요하면 hex/arbitrary value 또는 CSS variable을 명시한다.

| 카테고리 | 사용 방식 | 예시 |
|----------|-----------|------|
| 색상 | hex/arbitrary value 또는 `var(--krds-color-*)` | `bg-[#256ef4]`, `text-[#1e2124]` |
| 타이포 | px arbitrary + line-height 명시 | `text-[17px] leading-[1.5]` |
| spacing | 표준 Tailwind 또는 px arbitrary | `p-4`, `p-[24px]` |
| radius | px arbitrary | `rounded-[8px]`, `rounded-[12px]` |
| 브레이크포인트 | `@theme` 등록 modifier | `mobile:`(360+), `tablet:`(601+), `desktop:`(1025+) |

### 마이그레이션 룰 (Hero 섹션 선행)

globals.css의 기존 클래스를 utility로 옮길 때 적용하는 매핑:

- **색상**: `var(--krds-color-*)` 및 hex → arbitrary value. `#fff` → `text-white`. 정확 매핑 없는 hex는 가까운 Tailwind 기본 `gray-*` 또는 hex 직접 사용
- **spacing**: 표준 Tailwind spacing을 기본으로 사용. KRDS scale 고정값이 필요하면 arbitrary `p-[24px]`
- **radius**: KRDS radius 고정값이 필요하면 `rounded-[8px]`, `rounded-[12px]`
- **브레이크포인트**: globals.css의 `768px` 기준 → `tablet:`(601+) 매핑 (일부 구간에서 시각 변화 허용)
- **fontSize**: `text-[17px] leading-[1.5]`처럼 px/arbitrary value + line-height/tracking 보존
- **`.parent:hover .child`**: `group` + `group-hover:` 패턴 (Link wrapper에 `group`, 자식에 `group-hover:`)

### Swiper 캐러셀 width 측정 회귀 방어

`apps/web/src/shared/ui/Carousel.tsx`의 `useEffect` 다층 트리거로 swiper width 폭주 방어. 첫 방문 시 async layout shift(Pretendard CDN 폰트, KRDS Header mount 등)로 swiper의 mount 측정이 실패하면 `slide.style.width`에 22369600px 같은 비정상 값이 박히고 observer 없이는 재측정도 안 됨:

- (1) `requestAnimationFrame` 2회 — 첫 paint 직후 재측정
- (2) `window 'load'` 이벤트 — 모든 리소스(폰트/이미지) 로드 완료 시점
- (3) `ResizeObserver` — 부모 element width 변화마다 재측정
- 위 3개 트리거 모두 `swiper.update()` 호출 (idempotent). swiper의 `observer`/`observeParents` 옵션은 사용 안 함 — 내부 observer + update가 race 시 오히려 22M로 갱신되는 역효과
- 추가 CSS guard:
  - **Hero(slidesPerView=1)**: `<section data-hero-carousel>` + `[data-hero-carousel] .swiper-slide { width: 100% !important; }`
  - **Recommended(slidesPerView 가변)**: `.home-recommended .swiper-slide`에 breakpoint별 `calc()` width 강제. swiper formula `(container - spaceBetween*(n-1))/n`에 맞춰:
    - mobile 기본: `100%` (1 per view)
    - `@media (min-width: 768px)`: `calc((100% - 16px) / 2)` (2 per view, spaceBetween 16)
    - `@media (min-width: 1024px)`: `calc((100% - 40px) / 3)` (3 per view, spaceBetween 20)
  - `RecommendedSection.tsx`의 `breakpoints` prop + `spaceBetween`과 globals.css의 guard는 **1:1 동기화 필요** (변경 시 양쪽 수정)

### 향후 마이그레이션 (Stage 7e+)

Hero 외 나머지 globals.css 블록(`.subpage-*`/`.gallery-*`/`.board-*`/`.search-*`/`.home-popup-*`/`.preview-*` 등 ~1200줄)은 점진 마이그레이션. 적용 불가 블록:

- **`.tiptap-content *` (~200줄)**: 사용자 입력 HTML(p/h1/ul 등)에 적용되므로 utility 불가 — 그대로 유지
- **`.subpage-block-html *` 자식**: 동일 사유
- **`*` reset + body 폰트**: preflight 비활성화했으므로 직접 유지

## Storybook + Vitest (Stage 7f shell → 7g widgets + KRDS showcase)

web은 Server Component 중심이라 전역 Provider 없음. Storybook decorator는 비어있고, `nextjs.appDirectory: true` 전역 parameter만 제공 (RightSidebar의 `usePathname()` 등 Client Component mock용). 상세 2-track 룰은 루트 AGENTS.md "테스트 전략" 참조.

- **Framework**: `@storybook/nextjs-vite` (v10 stable) — admin과 독립 설치 (shadcn vs KRDS UI 시스템 달라 `.storybook/` 공유 불가)
- **파일 구성**:
  - `.storybook/main.ts` — framework + stories glob + `@storybook/addon-vitest`
  - `.storybook/preview.tsx` — **CSS import 순서 엄수**: `import '../app/krds-normalized.css'; import '../app/globals.css';` (layout.tsx 재현). 순서가 바뀌면 `@layer krds-base` override 순서가 깨져 Tailwind utility가 KRDS 위에 올라가지 못함
  - `.storybook/preview-head.html` — Pretendard CDN `<link rel="stylesheet">` 삽입 (layout.tsx와 동일 포맷). 다음 Stage의 swiper 22M 회귀 테스트가 "Pretendard async load race" 조건을 재현하려면 필수
  - `.storybook/vitest.setup.ts` — `setProjectAnnotations` 기반 preview 연결
  - `vite.config.ts` — React plugin + `@/*` → `./src/*` alias
  - `vitest.config.ts` — `mergeConfig(viteConfig, ...)` + `projects: [unit(jsdom), storybook(Playwright Chromium)]`
- **Sidebar 카테고리 (Stage 7g 완료 시점 12 story 파일 · 총 32 tests — 7g 후속에서 KoglFooter Type2/Type3 보완으로 +2)**:
  - `Web/Shared/Carousel` (Default / WithAutoplay — Stage 7f)
  - `Web/Widgets/SubpageBlockRenderer` (Mixed / RichTextOnly / HtmlOnly / Empty — 블록 타입별 렌더 검증. **meta decorator로 실사용처 wrapper(`<article id="subpage-{id}">` + max-width 820px + dashed border + min-height 160px)를 story 레벨에서 재현** — 단독 variant에서 텍스트 블록이 Canvas 좌상단에 묻히는 현상 방지 + 렌더 실패 시 wrapper만 보여 원인 구분 쉬움)
  - `Web/Widgets/HomePopupModal` (ContentSingle / ImageSingle / SwiperMultiple / NoPopups)
  - `Web/Widgets/RightSidebar` (ThreeItems / FiveItems / Empty)
  - `Web/Widgets/KoglFooter` (Type0 / Type1 / **Type2** / **Type3** / Type4 / WithAI / Hidden — 7g 후속에서 Type2/Type3 누락 보완. `CclType` 전체 5단계 모두 커버)
  - `Web/KRDS/{Header, Footer, SideNavigation, Pagination, Breadcrumb, Masthead, SkipLink}` — `apps/web/src/shared/ui/krds-showcase/`에 **런타임 import 없는 story 전용** 디렉토리. 실제 사용하는 variant만 등록(advisor 지적: SkipLink 추가, RightSidebar는 커스텀 JSX라 KRDS 아닌 Widgets로 분류)
  - `Web/Design System/KRDS Colors` (Brand / Neutral / Status / Extended / All) — 31개 팔레트 카탈로그. 런타임 plugin utility가 아닌 token label + inline style로 시각화 (Stage 17)
  - `Web/Design System/KRDS Typography` (Display / Heading / Title / Body / DetailLabelLink / FontWeight / FontFamily) — ~50개 타이포 값 카탈로그 (Stage 17)
  - `Web/Design System/KRDS Spacing & Radius` (Spacing / Radius / TailwindVsKrds) — KRDS scale 참고표 + Tailwind 기본값 대비 표 (Stage 17)
  - `Web/Design System/Breakpoints` (Tokens / ModifierExample / TailwindComparison) — mobile:360 / tablet:601 / desktop:1025; Tailwind `sm/md/lg`와의 차이 정리 (Stage 17)
  - `Web/Design System/Web Customs` (FontStack / DemoBannerVariable / ScopedClasses / CarouselWidthGuard) — web 전용 CSS 변수·패턴 (Stage 17)
  - `Web/Design System/Foundations` (CSS import 순서 / @layer 순서 / Pretendard CDN 로드 / 페이지 컨테이너) — KRDS 스타일 레이어 구조 (Stage 17)
- **명령**: `pnpm --filter @simple-cms/web storybook` (port 6007), `pnpm --filter @simple-cms/web test`, `pnpm --filter @simple-cms/web build-storybook`
- **시연 모드 Storybook 동봉 (`build:demo`)**: 시연 Vercel web 프로젝트는 `pnpm --filter @simple-cms/web build:demo`를 호출. `pnpm bundle-storybooks && next build` 순서로 실행되어 admin/web Storybook을 `apps/web/public/_cms/storybook/{admin,web}/`에 동봉 → 단일 도메인(`demo.example.com/_cms/storybook/{admin,web}/`)에서 정적 서빙. 운영(`pnpm build`)에는 영향 없음. 스크립트 위치: `apps/web/scripts/bundle-storybooks.mjs`. 자세한 정책은 `docs/react-cms-시연모드-배포-가이드.md` 10장
- **Stage 7i 결과 — Swiper 22M 회귀 자동 감지**: `Web/Shared/Carousel > Regression22M` variant 신규 추가. play function이 `canvasElement.querySelector('.krds-carousel')`의 `style.width`를 400px→800px로 두 번 변경해 **`ResizeObserver` 경로를 강제 트리거**한 뒤 `.swiper-slide`의 `style.width`가 `> 0 && < 2000`인지 assert. `window.resizeTo`는 Playwright Chromium headless에서 동작하지 않으므로 채택 안 함. 단순 mount 후 width assert는 방어 로직을 제거해도 통과하므로(Storybook 환경은 Pretendard race condition이 재현되지 않음) 회귀 감지기 역할 불가 — container resize로 3층 defensive triggers 중 최소 하나(ResizeObserver.observe)를 실제로 밟아야 함. 총 변동 — web 12 files / **33 tests** (32 → +1). Stage 17에서 `Web/Design System/*` 6파일 26 stories 추가 → **59 tests**. `readyState='loading'` 시뮬레이션, viewport 360/768/1024 cycle, MSW 검색/팝업 시나리오는 Stage 7i 범위에서 제외 (후속 과제)
- **Stage 17 후속 — KRDS root 정규화**: web Design System stories도 앱과 동일하게 `krds-normalized.css`를 사용한다. 과거 `storyShellDecorator`의 `useLayoutEffect` 기반 `html/body 16px !important` 보정은 제거됨. 외부 padding은 story shell inline style로만 유지해 Tailwind source scanning과 무관하게 안정화한다.
- **responsive modifier**: `@theme`에 `mobile/tablet/desktop`을 등록해 사용한다. Tailwind 기본 `sm/md/lg`도 기본 의미로 유지되지만, 공개 web의 KRDS 기준 반응형은 `mobile:/tablet:/desktop:` 우선 사용.
- **Tiptap `optimizeDeps.include` pnpm 해석 규칙 (2026-05-27)**: `renderContent.ts`가 사용하는 Tiptap 패키지는 web의 직접 dependency가 아니라 workspace package `@simple-cms/editor`의 dependency다. 따라서 `vite.config.ts`에서 `'@tiptap/html'`처럼 직접 include하면 Storybook dev의 Vite optimizer가 `apps/web` 기준으로 해석하다 `Failed to resolve dependency: @tiptap/*`를 반복 출력하고 preview가 비어 보일 수 있다. 선제 최적화가 필요할 때는 Vite nested dependency 표기인 `'@simple-cms/editor > @tiptap/html'` / `'@simple-cms/editor > @tiptap/core'` 형태로만 추가한다. 검증은 `pnpm --filter @simple-cms/web typecheck`와 `pnpm --filter @simple-cms/web build-storybook`을 실행하고, dev 실행 로그에 Tiptap resolve warning이 없는지 확인한다.
- **Stage 7g에서 만난 이슈 — addon-vitest dep cache**: admin과 동일 증상으로 첫 실행 `Failed to fetch dynamically imported module` 발생. `node_modules/.cache/storybook + .vite` 삭제 후 성공
- **Story meta decorator로 실사용처 맥락 재현 패턴**: `SubpageBlockRenderer`처럼 부모 wrapper(`<article>` + CSS 클래스)에 의존하는 컴포넌트는 `layout: 'padded'`만으론 시각적으로 묻힘. `meta.decorators`에 실제 rendering 환경을 축약 재현한 wrapper를 추가해 story 레벨에서도 동등한 맥락 확보. 가치는 (a) 단독 variant의 시각 확인 용이, (b) 렌더 실패 vs 묻힘 구분 명확화

## 콘텐츠 표시 규칙

- `published` 상태만 노출 (draft는 표시하지 않음)
- 메뉴: `isVisible = true`인 항목만 노출
- 노출 기간이 있으면 현재 시점 기준 판정
- **부모 메뉴가 비노출이면 하위 메뉴도 함께 비노출**
- 연결된 페이지/게시판이 비공개이면 자동 비노출 처리

## 메뉴 렌더링

- 메뉴 배치: NavigationMenu의 `slots` 배열로 결정 (HEADER/FOOTER/SIDEBAR)
  - 하나의 메뉴가 여러 슬롯에 동시 배치 가능 (예: 같은 메뉴를 헤더+푸터에 사용)
  - 조회: `getMenuBySlot(slot)` → `prisma.findFirst({ where: { slots: { has: slot } } })`
- 헤더: `slots`에 HEADER 포함된 메뉴 렌더링 (KRDS Header.MainMenu, 3depth 지원)
- 푸터: KRDS Footer Default 구조 사용. `SITE_FOOTER_CONFIG`가 address/contacts/quickLinks/socialLinks/bottomLinks/identifier/copyright를 제공하고, `slots`에 FOOTER 포함된 메뉴는 KRDS Footer `links`로 렌더링
- **우측 사이드바 (Stage 7d)**: `slots`에 SIDEBAR 포함된 메뉴가 있을 때만 전체 페이지 우측에 KRDS `InPageNavigation` **스타일**로 렌더
  - KRDS 원본 `InPageNavigation` 컴포넌트는 items의 href를 `document.querySelector(href)`로 소비하는 페이지 내 앵커 전용(외부/경로 URL을 넣으면 SyntaxError). 페이지 링크 네비게이션에는 부적합
  - `widgets/layout/ui/RightSidebar.tsx` — KRDS 원본 컴포넌트 대신 동일 DOM 구조(`.krds-in-page-navigation-type`/`-area`/`.in-page-navigation-header`/`.in-page-navigation-list`)와 CSS 클래스를 차용한 커스텀 JSX로 렌더, `<Link>`/`<a>`로 실제 라우팅
  - 1뎁스 flat 구조(leaf-only DFS 평탄화). 현재 `pathname`과 매칭되는 항목은 `active` 클래스 + `aria-current="page"`
  - 외부 링크는 `<a>` + `target/rel`, 내부 링크는 `<Link>`(Next 클라이언트 라우팅)
  - `title = NavigationMenu.name`, `caption = `${name} 네비게이션``
  - `slots`에 SIDEBAR를 포함한 메뉴가 없으면 우측 사이드바 자체가 렌더되지 않음
- **좌측 서브페이지 사이드바 (Stage 7d)**: `/p/[slug]`에서만 자동 렌더
  - `entities/navigation/lib/findHeaderBranchForPath.ts`가 HEADER 메뉴에서 현재 경로가 속한 1뎁스 루트를 찾음
  - 매칭 시 `widgets/subpage-sidebar/ui/SubpageSideNavigation.tsx`에 그 루트의 2/3뎁스 트리를 KRDS `SideNavigation`으로 렌더
  - 메뉴 어디에도 없는 서브페이지는 서브페이지 제목만 `SideNavigation.Title`로 표시(하위 없음)
  - 슬롯 기반 수동 배정이 아닌 HEADER 메뉴에서 자동 파생
- 메뉴 depth: 최대 3단계
- 메뉴 레이아웃/반응형은 코드에서 통제
- 모바일/데스크톱 동일 데이터, 렌더링 방식만 분기
- 운영자는 메뉴명/링크/노출 여부/순서/슬롯만 수정

## 메인 페이지

메인은 일반 서브페이지와 **다른 구조**로 렌더링:

- **섹션 기반 랜딩 페이지** (문서형 아님)
- 레이아웃은 코드에서 통제
- 데이터(텍스트, 이미지, 링크 등)는 운영자가 admin에서 관리
- 섹션 노출 여부/순서는 admin에서 설정한 대로 반영
- 디자이너 시안 → 재사용 가능한 섹션 컴포넌트로 분해

### 구현 (Stage 5a + Stage 19)

- **7개 섹션 타입**: HERO, SUB_CAROUSEL, RECOMMENDED, SHORTCUT, LATEST_POSTS, CTA, NOTICE
- **SSR Server Component 중심**: 섹션 컴포넌트는 Server, 슬라이드 컨트롤만 Client (`Carousel`)
- **자체 커스텀 디자인** (시안 확정 전): `apps/web/app/globals.css`의 `.home-*` 클래스로 스코프된 스타일. 시안 확정 시 섹션 컴포넌트 교체 전제, admin 데이터 구조는 안정

### HERO / RECOMMENDED 슬라이드

- **HERO**: 슬라이드 1개면 정적 배너, 2개 이상이면 Carousel (1 per view)
  - 아이템 스키마: `{ imageUrl, imageAlt, title, description?, url? }`
  - url 있으면 전체 슬라이드가 `<Link>`로 감싸짐
  - 배경 이미지 + 그라데이션 오버레이 + 하단 제목/설명
- **SUB_CAROUSEL** (Stage 19): 4단 카피(tagline/mainHeading/subHeading/description) + 원형 썸네일 캐러셀. **항상 Swiper** (RECOMMENDED처럼 그리드 폴백 없음). slidesPerView: mobile 1 / tablet 2 / desktop 4. `SubCarouselItem`: title + subtitle + imageUrl/imageAlt + url/mediaId
- **RECOMMENDED**: 자유 갤러리 (subpage/post 참조 아님)
  - 아이템 개수 ≤ 3: 그리드 (모바일 1, 태블릿 2, 데스크톱 3)
  - 아이템 개수 > 3: Carousel (디바이스별 slidesPerView: mobile 1, tablet 2, desktop 3)
- **슬라이드 라이브러리**: [Swiper 12](https://swiperjs.com/) + 커스텀 컨트롤 버튼
  - `apps/web/src/shared/ui/Carousel.tsx`: Client Component, SlideOptions props
  - Swiper modules: A11y, Keyboard (기본) + Navigation/Pagination/Autoplay (옵션별 조건부)
  - 접근성: `aria-roledescription="carousel"`, `aria-live` (swiper 내장), keyboard nav, `pauseOnMouseEnter`, `prefers-reduced-motion` CSS 존중
  - **width 측정 회귀 방어 (Stage 7e)**: `useEffect`에서 RAF 2회 + `window 'load'` + `ResizeObserver` 3단계 트리거로 `swiper.update()` 호출. swiper `observer`/`observeParents`는 사용 안 함 (race 위험). Hero는 `data-hero-carousel` CSS guard, Recommended는 breakpoint별 `calc()` width guard 추가 — "KRDS Tailwind 스타일링" 섹션 참조

### FSD 구조

```
src/entities/home-section/
├── api/getHomeSections.ts      # React.cache, LATEST_POSTS 참조만 배치 조회
└── lib/parseConfig.ts          # configJson Zod safeParse 타입 가드 (7개)

src/features/home-section/ui/
├── HeroSection.tsx             # 단일/슬라이드 분기
├── SubCarouselSection.tsx      # 항상 Swiper, 원형 썸네일 4열 (Stage 19)
├── RecommendedSection.tsx      # 그리드/슬라이드 분기
├── ShortcutSection.tsx
├── LatestPostsSection.tsx
├── CtaSection.tsx
└── NoticeSection.tsx

src/widgets/home-sections/ui/HomeSections.tsx   # 섹션 타입별 라우팅 오케스트레이터
src/pages/home/ui/HomePage.tsx                   # <HomeSections /> 렌더링
src/shared/ui/Carousel.tsx                       # Swiper 기반 공통 캐러셀 ('use client')
```

### 데이터 해결 흐름 (`getHomeSections`)

1. `isVisible: true` 섹션을 `displayOrder asc`로 조회
2. 각 섹션의 `configJson`을 타입별로 Zod safeParse — 실패 시 skip
3. LATEST_POSTS의 boardId만 배치 조회 (Promise.all, N+1 방지). RECOMMENDED/HERO는 외부 참조 없음
4. dead reference (삭제된/비공개 게시판 등)는 자동 skip — 에러 없이 나머지 렌더

### 엣지케이스

- **configJson 손상**: Zod 실패 → 해당 섹션 skip
- **HERO slides 빈 배열**: 섹션 전체 숨김 (seed 기본값이 빈 배열이므로 관리자 편집 전까지 미표시)
- **SUB_CAROUSEL items 빈 배열**: 섹션 전체 숨김 (항상 Swiper이므로 items ≥ 1이어야 렌더)
- **RECOMMENDED items 빈 배열**: 섹션 전체 숨김
- **LATEST_POSTS boardId null 또는 비공개**: 섹션은 표시하되 items 빈 배열 → "게시글이 없습니다" placeholder
- **이미지 URL 입력만 지원** (Stage 5a): `<img src>`로 직접 로드, lazy loading. 이후 Media 관리 Stage에서 업로드 지원 추가 예정
- **슬라이드 하나만 있는 HERO**: Carousel을 생략하고 정적 배너 렌더링 (성능 + 불필요 컨트롤 제거)

## 메인 팝업 (Stage 5b)

- 메인 페이지에서만 노출
- 0개 → 표시 안 함
- **1개 → 단일 모달**
- **2개 이상 → Swiper 슬라이드형 모달** (`Carousel` 재사용)
- 순서는 admin에서 정한 `displayOrder`
- 노출 기간이 있으면 현재 시점 기준 판정

### FSD 구조

```
src/entities/home-popup/api/getActiveHomePopups.ts   # React.cache + Prisma 직접 조회
src/widgets/home-popup/ui/HomePopupModal.tsx         # Client Component (모달 + dnd + 쿠키)
src/shared/lib/popupCookies.ts                        # "오늘 하루 보지 않기" 쿠키 헬퍼
```

### 데이터 해결 흐름 (`getActiveHomePopups`)

- 필터: `isVisible=true` + `startDate ≤ now` (null 허용) + `endDate ≥ now` (null 허용)
- 정렬: `displayOrder asc, createdAt desc`
- **콘텐츠형의 `contentJson` → HTML**: 서버에서 `renderTiptapContent()`(@tiptap/html `generateHTML` + DOMPurify) 수행 후 `contentHtml` 필드로 클라이언트에 전달 (hydration/CSP 안전)

### 팝업 타입

- **콘텐츠형**: 제목 + 본문 HTML(서버 렌더) + 버튼 라벨/링크(optional)
- **이미지형**: 이미지 + alt + 링크(optional) — 링크 있으면 `<a>`로 래핑 + 클릭 시 닫기

### "오늘 하루 보지 않기"

- 쿠키 키: `hide_popup_{popupId}=1`, 만료: 로컬 자정, `path=/`, `SameSite=Lax`
- 서버는 쿠키 무관하게 모든 활성 팝업 내려보내고, 클라이언트 하이드레이션 후 필터링 (SSR 캐시 효율 유지)
- 체크 후 닫기 시 visible 목록의 모든 id를 각 쿠키에 기록

### 접근성

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby="home-popup-title"`
- 이미지형 alt 필수 (admin 입력 강제)
- ESC 키 닫기 + backdrop 클릭 닫기
- 모달 열릴 때 `document.body.style.overflow = 'hidden'` → 닫을 때 복원
- 이전 포커스 저장 → 모달 열릴 때 `dialogRef`로 이동 → 닫힐 때 복원
- 슬라이드는 `Carousel`의 a11y 모듈 (keyboard, aria-live)

## 미리보기 모드 (Stage 7a)

admin에서 발급한 토큰을 교환해 **draft 콘텐츠**를 공개 웹 렌더러로 그대로 확인한다. admin(3001)과 web(3000)의 origin 분리로 admin 세션 쿠키를 web이 읽을 수 없으므로 **preview 토큰 교환 → web 도메인 전용 쿠키 세팅** 패턴을 쓴다.

### 흐름

1. web `GET /api/preview?token=...&type=subpage|post&id=...`:
   - `prisma.previewToken.findUnique(token)` → 만료·entityType·entityId 검증
   - 대상 slug 조회 후 `preview_session` httpOnly 쿠키(Max-Age 600초, SameSite=Lax) 세팅
   - `/p/{slug}?preview=1` 또는 `/board/{boardSlug}/{postSlug}?preview=1`로 302
   - 어떤 검증 실패든 `/`로 폴백 리다이렉트 (에러 표시 없이)
2. Server Component가 `getPreviewSession()` 호출 → `cookies().get('preview_session')` + DB 재검증 (`React.cache`로 1요청 1쿼리)
3. 세션 `entityType/entityId`와 URL의 slug가 가리키는 엔티티 id가 **일치할 때만** preview 모드로 분기

### 공용 유틸

- `src/shared/lib/previewCookies.ts` — `PREVIEW_COOKIE_NAME`, `setPreviewCookie()`, `clearPreviewCookie()` (Route Handler용, `NextResponse.cookies` 사용)
- `src/shared/lib/previewSession.ts` — `getPreviewSession()` (cache), `isPreviewingEntity(session, type, id)`
- Route Handler: `app/api/preview/route.ts` (GET — 토큰 교환 + 쿠키 세팅), `app/api/preview/exit/route.ts` (POST — 쿠키 삭제)
- UI: `src/features/preview/ui/PreviewBanner.tsx` (Client, 종료 버튼 → `/api/preview/exit` POST → `router.refresh()`)

### 데이터 조회 분기

- `src/entities/subpage/api/getSubpage.ts`의 `getSubpageForPreview(slug)` — status 필터 + block isVisible 필터 모두 제거 (draft + 숨김 블록 포함)
- `src/entities/post/api/getPost.ts`의 `getPostForPreview(boardSlug, postSlug)` — `board.isPublic` 필터 없음
- preview 세션 없이 위 함수가 반환한 draft를 렌더하지 않도록 **페이지 컴포넌트가** `isPreviewingEntity`로 gate

### 렌더러 확장

- `SubpageBlockRenderer`에 `showHidden?: boolean` prop — `true`면 `isVisible=false` 블록도 렌더 (`.subpage-block-hidden-preview` wrapper로 opacity + "숨김" 배지)
- preview 모드에서만 `showHidden={true}` 전달

## 서브페이지 렌더링

**통합 블록 모델 (Stage 6)** — 서브페이지의 모든 콘텐츠는 PageBlock 목록이다. 별도의 본문 렌더 단계가 없다.

렌더링 순서:

1. **블록 목록**: `<SubpageBlockRenderer blocks={...} subpageId={subpage.id} />` — `isVisible = true`인 블록만, `displayOrder asc` (subpageId는 HTML 블록 css의 `#subpage-{id}` 스코프 prefix 생성에 필요)
   - 위치: `src/widgets/subpage-content/ui/SubpageBlockRenderer.tsx` (Server Component, 클라이언트 JS 0)
   - **RICH_TEXT 블록**: `renderTiptapContent`로 Tiptap JSON → HTML(DOMPurify sanitize) → `<TiptapContent>` 렌더. 기존의 "본문" 역할
   - **HTML 블록**: DOMPurify sanitize 후 `dangerouslySetInnerHTML`
   - **IMAGE 블록**: `<figure><img alt><figcaption></figure>`, optional `<a>` 래핑
   - **IFRAME 블록**: aspect-ratio wrapper + iframe, 허용 호스트 **서버에서 2중 재검증** (관리자 우회 입력 방어)
   - image 노드의 `mediaId` attr → `<img data-media-id="cuid...">` 직렬화 (DOMPurify ALLOWED_ATTR에 `data-media-id` 포함, Media 라이브러리 참조 추적)
   - 데이터: `getPublishedSubpage()` 반환 객체의 `blocks` (Prisma select)
2. **HTML 블록의 CSS/HTML (Stage 7b — Option B)**: HTML 블록의 `configJson`이 `{ html, css? }` 구조 — 페이지 단위 `Subpage.customHtml`/`customCss` 필드는 폐기됨. HTML 블록 내부에서 처리:
   - 페이지 컴포넌트(`SubpagePage`)가 `<article id="subpage-${subpage.id}">` 루트 + `<SubpageBlockRenderer subpageId={subpage.id} ... />` 호출
   - `SubpageBlockRenderer.HtmlBlock`이 css가 있으면 `scopeCustomCss(css, subpageId)`(`src/shared/lib/scopeCustomCss.ts`)로 `#subpage-{id}` prefix 주입 + `html`/`body`/`:root` 치환 → `<style dangerouslySetInnerHTML>`을 `<div>` 옆에 삽입
   - html이 있으면 `sanitizeCustomHtml(raw)`(`src/shared/lib/renderContent.ts`)로 확장 DOMPurify config(iframe / section / article / figure / details / summary / nav / header / footer / main 등 의미론 태그 허용 + iframe src를 `@simple-cms/types`의 `isIframeHostAllowed`로 서버 재검증)로 정화 → `<div className="subpage-block subpage-block-html" dangerouslySetInnerHTML>` 렌더
   - 같은 페이지에 HTML 블록이 N개 있어도 모두 같은 `#subpage-{id}` prefix 공유 → 한 블록의 css가 페이지 전체(다른 블록 포함)에 영향. 운영자가 "이 페이지의 h2 빨강"을 한 블록에서 처리 가능
   - `<script>`, `on*` 이벤트 핸들러, `javascript:` URL은 DOMPurify가 제거. iframe src는 `www.youtube.com` / `youtube.com` / `www.youtube-nocookie.com` / `player.vimeo.com`만 허용, 그 외는 iframe 전체 제거
   - `IFRAME_ALLOWED_HOSTS` + `isIframeHostAllowed`는 Stage 7k-1에 `@simple-cms/types`의 `block.types.ts`로 단일 출처 통합. `renderContent.ts`와 `SubpageBlockRenderer.tsx` 양쪽이 `import { isIframeHostAllowed } from '@simple-cms/types'`로 참조
   - 알려진 한계: `scopeCustomCss`는 `:is()` / `:where()` / `:has()` / `@container` / CSS nesting 등 신형 CSS 기능의 내부 복합 셀렉터 완전 지원 불가 — 필요 시 `postcss-prefix-selector` 도입 검토

- 블록 순서와 노출 여부는 admin에서 관리한 대로 반영
- 블록이 0개면 "콘텐츠가 준비 중입니다" placeholder 표시
- HTML 블록의 css가 비어있으면 `<style>` 태그 미렌더, html이 비어있으면 `<div>` 미렌더 (둘 다 비어있으면 블록 자체 null)
- HTML 블록의 css는 페이지 단위 스코프 — 같은 서브페이지의 다른 블록에도 영향. 다른 서브페이지에는 영향 없음 (전역 스타일 오염 방지)
- 블록 스타일: `apps/web/app/globals.css`의 `.subpage-block-*` 클래스 (프로토타입, 시안 확정 시 렌더러와 함께 교체)

### 사용자 피드백 위젯 (Stage 10)

`<KoglFooter>` 다음에 `<SubpageFeedback>`이 자동 렌더된다. KRDS 가이드(https://www.krds.go.kr/html/site/global/global_05.html) + Figma 시안(`r1dfm2jnjfajM4bL0CpNGu` node `50:3508`) 기반.

- 위치: `src/widgets/feedback/ui/SubpageFeedback.tsx` (Server) + `SubpageFeedbackForm.tsx` (Client) + `lib/feedbackStorage.ts` (localStorage 24h TTL wrapper)
- **노출 조건**: `feedbackEnabled === true`. `getPublishedSubpage` / `getSubpageForPreview` select에 포함되어 SSR 단계에서 결정
- **previewMode prop**: preview 세션에서는 UI 노출하되 평가완료 disabled + 안내 ("미리보기 모드에서는 피드백을 제출할 수 없습니다.") — 운영자 미리보기에서 통계 오염 방지
- **상태 머신**: 초기(네/아니오 chip만) → POSITIVE면 Q1(긍정 이유 3개 체크박스) + Q2(자유 텍스트 1000자, 카운터) + 취소/평가완료 / NEGATIVE면 Q2 + 취소/평가완료. 제출 후 감사 메시지 + `aria-live="polite"`
- **재제출 차단**: localStorage `feedback_submitted_{subpageId}` 24h TTL. 서버 `(ipHash, subpageId, 24h)` rate limit이 진실의 원천이고 클라이언트는 UX
- **POST `/api/feedback`** (apps/web/app/api/feedback/route.ts, runtime nodejs): Zod 검증 → preview 쿠키 차단(403) → subpage 존재 + PUBLISHED + feedbackEnabled 게이트(403/404) → ipHash + subpageId 24h rate limit(429) → 화이트리스트 subset 검증 → `sha256(ip + FEEDBACK_IP_SALT)` → DB 저장. 감사 로그 생략(익명 입수 이벤트)
- **환경 변수**: `.env`의 `FEEDBACK_IP_SALT` (운영 배포 전 강한 랜덤 값으로 교체 필수). 미설정 시 console.warn + fallback (dev 편의)
- **스타일링**: KRDS chip/check CSS 클래스는 유지하고, wrapper/문구/버튼 보조 스타일은 `bg-[#f4f5f6]`, `rounded-[12px]`, `text-[17px] leading-[1.5]`처럼 Tailwind arbitrary value로 명시한다. native HTML form (KRDS 폼 컴포넌트 미사용 패턴 일관)

## 게시판 / 게시글 렌더링

### 게시판 목록

- 스킨: `list` (목록형) / `gallery` (갤러리형)
- admin에서 설정한 스킨에 따라 렌더링 분기
- `published` 게시글만 표시

### 게시글 상세

- Tiptap JSON 본문 렌더링 (`generateHTML()` from `@tiptap/html`)
- 대표 이미지 표시
- 게시판 정보 함께 표시
- 메타데이터(SEO) 처리

## 통합검색

- **PGroonga 기반 한글 검색**
- 검색 대상: Subpage(제목+본문) + Post(제목+본문) — `content` 필드는 Tiptap JSON에서 추출한 plain text
- `published` 상태만 인덱싱/검색 (Post는 `board.isPublic = true` 추가 필터)
- 라우트: `/search?q=...` (`force-dynamic`, SSR)
- 결과에 타입 구분 뱃지 표시 (페이지 / 게시글)
- 게시글 결과에 게시판 정보 함께 표시
- 관련도 중심 정렬 (`pgroonga_score`) + 최신순 보조 (`publishedAt DESC`)

### 검색 FSD 구조

```
app/search/page.tsx                           # 라우트 (Server Component, force-dynamic)
src/entities/search/api/getSearchResults.ts   # React.cache() 래핑 → @simple-cms/db searchContent
src/features/search/ui/SearchForm.tsx         # Client Component (검색 입력 폼, useRouter)
src/pages/search/ui/SearchPage.tsx            # Client Component (결과 목록 + PaginationNav)
```

- 데이터: `@simple-cms/db`의 `searchContent()` — PGroonga `&@~` 연산자, `$queryRaw` 사용
- 헤더: `PageLayout.tsx`에 `/search` 링크 아이콘 추가

### 검색 반영 규칙

- 저장/발행 시점에 검색 데이터 갱신 (content 필드 = Tiptap JSON → plain text)
- `published → draft` 또는 비공개 전환 시 검색 결과에서 제외
- `draft` 상태는 검색 인덱싱 대상 제외

### 2차 확장 후보

- 필터(전체/페이지/게시글)
- 하이라이트 스니펫
- 자동완성
- 인기 검색어

## 도메인 설정 반영

관리자가 admin에서 설정한 커스텀 도메인을 공개 웹에 반영한다.

- `proxy.ts`: 요청 호스트네임과 설정 도메인 비교, 불일치 시 301 리다이렉트 (Next.js 16: middleware → proxy)
- `src/shared/lib/domainCache.ts`: DB 도메인 설정을 인메모리 캐시 (TTL: prod 60초 / dev 5초)
- `src/shared/lib/siteUrl.ts`: `getSiteUrl()` — 도메인 인식 URL 생성 유틸리티
- SEO 반영: `metadataBase`, canonical URL, sitemap, OG 태그에 설정 도메인 적용
- 개발 모드: `NODE_ENV === 'development'`일 때 localhost 접근 항상 허용
- 폴백: DB 설정 없으면 `NEXT_PUBLIC_SITE_URL` 환경변수 사용
- 상세 명세: `docs/react-cms-커스텀-도메인-명세서.md`

## 헤더 브랜딩 + 동적 메타데이터 (Stage 7l)

관리자가 admin `/settings/branding`에서 설정한 사이트명/로고/favicon/OG 이미지/사이트 설명을 공개 웹 헤더와 SEO 메타데이터에 반영한다. SiteSettings 6키(`SITE_NAME`, `SITE_DESCRIPTION`, `SITE_LOGO_MEDIA_ID`, `SITE_LOGO_ALT`, `SITE_FAVICON_MEDIA_ID`, `SITE_OG_IMAGE_MEDIA_ID`) 기반.

### `getCachedBranding` 캐시

- 위치: `src/shared/lib/brandingCache.ts`
- 패턴: `domainCache.ts` 동일 — 인메모리 60s prod / 5s dev TTL
- 6키 + 3개 Media url join을 1회 fetch
- admin → web 별 인스턴스라 즉시 invalidate 불가 → "최대 1분 후 반영"
- fetch 실패 시 폴백 객체 반환 (`siteName: 'Simple CMS'`, `siteDescription: '공개 웹'`, 나머지 null) — 페이지 렌더 차단 안 함

### 헤더 커스텀 컴포넌트

- 위치: `src/widgets/layout/ui/HeaderBranding.tsx` (Stage 7l NEW)
- KRDS `Header.Branding`이 `children`을 `.logo`(`<h2>`) **밖**에 렌더하므로 로고 이미지를 클릭 가능 영역(`<a href="/">`) 안에 두려면 그대로 사용 불가
- Stage 7d `RightSidebar`/`SubpageSideNavigation` 동일 패턴 — KRDS DOM 클래스(`.header-branding > h2.logo > a`) 차용한 커스텀 JSX
- 폴백: logoUrl 미설정 시 sr-only 대신 `.header-logo-text`로 사이트명 시각 표시
- KRDS 메이저 업데이트 시 이 컴포넌트와 7d 2개를 함께 점검

### globals.css 로고 클래스

- `.header-branding .header-logo-image { max-height: 100%; width: auto; max-width: 200px; object-fit: contain; display: block }`
- `.header-branding .header-logo-text { font-size: 1.125rem; font-weight: 700 }`
- 와이드 로고도 헤더 height 깨지 않게 max-height/object-fit으로 fit

### `generateMetadata` 동적화 (`apps/web/app/layout.tsx`)

`export const metadata` → `export async function generateMetadata()` 변환.

- `title.default = branding.siteName`, `template = '%s | ${branding.siteName}'` (페이지별 metadata override 그대로 동작)
- `description = branding.siteDescription` (폴백 '공개 웹')
- `icons.icon = ${faviconUrl}?v=${faviconMediaId}` — 브라우저 favicon 캐시 무효화 (mediaId 변경 시 새 favicon fetch)
- `openGraph.images = [{ url: ogImageUrl, width: 1200, height: 630, alt: siteName }]`
- `RootLayout`도 같은 `getCachedBranding()` 호출 — 인메모리 TTL 캐시(60s/5s)로 dedup, 첫 호출만 DB hit

### KRDS Footer 설정

- `PageLayout`이 `footerConfig` prop을 받아 KRDS Footer Default 구조(`quickLinks`, `address`, `contacts`, `links`, `socialLinks`, `bottomLinks`, `identifierText`, `copyright`)로 렌더링
- `apps/web/src/shared/lib/footerConfigCache.ts`가 `SITE_FOOTER_CONFIG` JSON을 인메모리 캐시(60s prod / 5s dev TTL)로 조회. 파싱 실패/조회 실패 시 중립 기본값으로 fallback하며 페이지 렌더를 차단하지 않음
- `apps/web/app/layout.tsx`는 `export const revalidate = 60`을 명시한다. 운영 모드에서 `/` 정적 prerender 장점을 유지하면서 DB 기반 footer/branding/site settings가 빌드 시점 값으로 영구 고정되지 않게 하는 ISR 안전장치
- `copyright` 미설정 시 `© ${branding.siteName}. All rights reserved.` 자동 생성
- `identifierText` 미설정 시 `이 누리집은 공공서비스 제공을 위한 누리집입니다.` fallback
- 일반 푸터 탐색 링크는 `FOOTER` 슬롯 메뉴에서 관리하고, `bottomLinks`는 개인정보처리방침/저작권 정책 같은 정책 링크 전용
- Masthead 정부 공식 문구는 무변경

### `app/favicon.ico` 파일 컨벤션 충돌 주의

- Next.js 16 App Router는 `app/favicon.ico` / `app/icon.*` / `app/apple-icon.*` / `app/opengraph-image.*` 파일을 자동 picking하여 `metadata.icons` / `openGraph`를 override함
- Stage 7l 진입 시 0건 확인 완료
- **누군가 이 파일들을 추가하면 동적 favicon/OG가 무시됨** — 추가 금지

## 데이터 페칭 패턴

- 기본: **Server Component + `@simple-cms/db` 직접 Prisma 쿼리** (SSR/SEO 우선)
- 모든 공개 페이지는 서버에서 데이터 조회 후 렌더링
- 데이터 소스: **`@simple-cms/db` 직접 접근** (admin BFF API를 호출하지 않음)
  - 이유: admin과 web은 운영상 독립 — admin 장애가 web에 전파되지 않아야 함
  - web의 쿼리는 읽기 전용 + `published` 필터 + 공개 안전 필드만 select
- Client Component에 데이터 필요 시: **props 전달 우선**, 불가피하면 client-side fetch
- 캐시: Next.js fetch cache + `revalidatePath` / `revalidateTag` 활용
- TanStack Query 등 클라이언트 상태 관리는 사용하지 않음 (읽기 전용 SSR 특성)

### Server Component 병렬화 / fetch 통합 (Stage 18)

- **자식 Server Component의 fetch가 부모 await에 묶이지 않게 분리**: 부모가 자식이 필요한 데이터를 미리 `Promise.all`로 모아 props로 전달. 예: `apps/web/src/pages/home/ui/HomePage.tsx`가 `Promise.all([getActiveHomePopups(), getHomeSections()])` 후 `<HomeSections sections={...}>`로 전달. React `cache()`로도 dedup되지만 props가 더 명시적이고 cache 의존성 제거
- **여러 슬롯/조건의 데이터를 단일 쿼리로 통합**: 같은 모델을 다른 WHERE로 N번 조회하는 패턴은 `IN`/`hasSome`/`OR`로 묶고 메모리에서 그룹핑. 예: `getMenusBySlots(['HEADER','FOOTER','SIDEBAR'])` (`apps/web/src/entities/navigation/api/getNavigation.ts`)가 `NavigationMenu.findMany({ where: { slots: { hasSome } } })` 1회 호출 후 slot별 result 객체로 그룹핑. DB round-trip 3 → 1
- **Prisma 타입 portability**: 통합 헬퍼의 반환 타입을 `cache()`로 inferred하면 TS2742(non-portable) 발생 가능. `interface ResolvedMenu` / `type MenusBySlotsResult = Record<NavigationMenuSlot, ResolvedMenu | null>` 같은 명시적 type을 export하고 callback에 `Promise<MenusBySlotsResult>` annotation

### force-dynamic 회피 + 운영 모드 정적화 (Stage 18)

- **새 page/layout에 `export const dynamic = 'force-dynamic'` 명시 자제**: dynamic API(`cookies()`/`headers()`/`searchParams`) 호출 시 Next.js가 자동으로 dynamic 판정한다. 명시는 강제 force-dynamic으로 운영 모드 ISR/static을 차단
- **layout이 dynamic API 호출하면 모든 하위 페이지가 강제 dynamic** (전염성): `apps/web/app/layout.tsx`는 `process.env.DEMO_MODE === 'true'` 가드로 `ensureDemoSession`/`getCurrentPathname`(headers() 사용)을 운영 모드에서 skip → 운영에서만 layout이 정적화되어 메인 페이지 ISR 동작
- **Next.js route config는 ternary 불가**: `export const dynamic = process.env.X === 'true' ? 'force-dynamic' : 'auto';`는 build 시 `Next.js can't recognize the exported \`dynamic\` field in route. It needs to be a static string` 에러. dynamic 명시를 **제거**하거나 build profile 자체를 분기하는 것이 정답
- **운영 build 검증**: `DEMO_MODE= pnpm --filter @simple-cms/web build` 출력 Route 테이블에서 `/`가 `○ (Static)` 표시 → 정적화 성공. `ƒ (Dynamic)`이면 layout/page 어딘가가 여전히 dynamic API 호출 중. typecheck/test는 이걸 검증하지 않으므로 build 단계 확인 필수
- **sitemap.xml**: visitor 무관한 공개 URL 목록이라 시연/운영 모두 `revalidate=300` 5분 ISR. `force-dynamic` 명시 제거 (Stage 18)

## 컴포넌트 구조 패턴

- **pages 레이어**: Server Component — 데이터 fetching + metadata + 레이아웃 조합
- **widgets 레이어**: 조합형 UI 블록 — 헤더, 푸터, 사이드바 등 (Server/Client 혼합)
- **features 레이어**: Client Component 중심 — 검색, 팝업 모달, 모바일 메뉴 등 인터랙티브 기능
- **entities 레이어**: 도메인 표시 컴포넌트 — 게시글 카드, 페이지 요약 등 (주로 Server Component)
- **shared 레이어**: KRDS 래퍼 컴포넌트, 공용 유틸, 기본 UI

## FSD 레이어 의존성 규칙

```
pages → widgets, features, entities, shared   ✅
widgets → features, entities, shared         ✅
features → entities, shared                  ✅
entities → shared                            ✅
```

금지:

- 역방향 import (예: shared → features, entities → widgets) ❌
- 같은 레이어 내 슬라이스 간 직접 import (예: entities/page → entities/post) ❌
- 공유가 필요하면 하위 레이어(entities 또는 shared)로 내림
- `/check-fsd` 스킬로 검증 가능

## 에러 캡처 전략

공개 웹에서 발생하는 런타임 에러를 DB에 기록하여 admin에서 조회할 수 있도록 한다.

### 서버 사이드 에러 캡처

- `app/error.tsx` (Next.js 세그먼트 에러 바운더리, `'use client'`): Server Component/SSR 에러 수신 — `error.digest` 유무로 `SERVER_SSR` vs `CLIENT_REACT` 분기 후 `/api/error-report`로 리포트
- `app/global-error.tsx`: 루트 레이아웃 치명적 에러 캡처 (`<html>`, `<body>` 포함 필수)
- `proxy.ts` catch 블록: 프록시 에러 캡처, `@simple-cms/db`의 `logWebError()`를 서버 사이드에서 직접 호출 (미들웨어는 Node 런타임, fail-open으로 사용자 응답 차단 방지)
- fire-and-forget: 에러 로깅이 사용자 응답을 차단하지 않음

### 클라이언트 사이드 에러 캡처

- `src/shared/ui/ErrorBoundary.tsx`: React class Error Boundary (검색, 팝업 등 인터랙티브 컴포넌트용), `componentDidCatch`에서 `reportError({ source: 'CLIENT_REACT' })`
- `src/shared/ui/ErrorReporterMount.tsx`: 루트 레이아웃에서 1회 마운트되어 전역 리스너 등록
- `src/shared/lib/errorReporter.ts`: 클라이언트 에러 리포터 (`navigator.sendBeacon` 우선, `fetch({keepalive:true})` 폴백)
- 전역 핸들러: `window.addEventListener('error')`(리소스 로드 에러는 제외), `window.addEventListener('unhandledrejection')`
- API Route: `app/api/error-report/route.ts` — Zod 검증 + 공개 엔드포인트, `requirePermission` 사용 안 함
- Rate limiting: IP당 분당 10건 (in-memory 카운터), 50요청마다 만료 엔트리 cleanup

### 캡처 컨텍스트

- 서버: URL, method, statusCode, userAgent, IP, referer, error.stack, error.digest
- 클라이언트: URL, userAgent, referrer, error.stack, 컴포넌트명(React boundary)
- 메타데이터(Json): route params, query params, 추가 컨텍스트

### 원칙

- 에러 로깅 실패가 사용자 경험에 영향을 주지 않음
- `logWebError()`는 주 렌더링/응답 트랜잭션에 포함하지 않음
- INFO 레벨 로깅은 범위 외 (ERROR, WARN만)
- 향후 Sentry 등 외부 도구 병행 가능 (logWebError와 독립적 통합)

## 접근성 기본 원칙

- KRDS 컴포넌트의 접근성 속성(aria-\*, role) 유지
- 모든 이미지에 `alt` 필수 (이미지형 팝업 포함)
- 시맨틱 HTML 우선 (`<nav>`, `<main>`, `<article>`, `<section>` 등)
- 키보드 내비게이션 지원 (Tab 순서, Enter/Space 활성화)
- 모달: 포커스 트랩, ESC 닫기, 배경 스크롤 방지
- 색상 대비: WCAG AA 수준 (4.5:1) 목표
- 스크린 리더 테스트: 주요 흐름(메뉴 → 콘텐츠 → 검색) 확인

## Docker 배포 (Stage 8a)

운영 self-host 절차서: [`docs/react-cms-운영-배포-가이드.md`](../../docs/react-cms-운영-배포-가이드.md).

### `apps/web/Dockerfile` 구조

admin과 동일 4-stage 패턴 (`base → deps → builder → runner`). 차이점은 **`public/` 디렉토리 COPY가 필수**라는 것.

- **base**: `node:22-bookworm-slim` + corepack
- **deps**: 모노레포 lockfile 기반 `pnpm install --frozen-lockfile`
- **builder**: `pnpm db:generate` (web도 `@simple-cms/db` 직접 import) + `pnpm --filter @simple-cms/web build`
- **runner**: 3개 디렉토리 COPY 필수:
  - `.next/standalone` — Next.js 최소 실행 산출물
  - `.next/static` — chunked JS/CSS (standalone은 자동 복사 안 함)
  - `public/` — favicon / KOGL 마크 / 정적 이미지 (standalone은 자동 복사 안 함)
- 최종 image: ~430MB disk / ~101MB content. EXPOSE 3000, non-root `nextjs:1001`

### `apps/web/next.config.ts` Docker 핵심 옵션

- `output: 'standalone'`
- `outputFileTracingRoot: path.resolve(__dirname, '../../')` — admin과 동일 이유. `@simple-cms/{db,types,editor}` workspace deps tracing
- 기존 `transpilePackages` + `allowedDevOrigins` + demo rewrites는 무영향

### `/uploads/*` 정적 서빙

- compose가 `uploads_data` named volume을 `/app/apps/web/public/uploads:ro` (read-only)로 마운트
- admin 컨테이너가 업로드한 파일을 web이 즉시 정적 서빙 — Next.js의 public/ 자동 서빙 동작
- Supabase Storage 모드(`STORAGE_PROVIDER=supabase`)에선 `Media.url`이 절대 URL이라 web의 정적 서빙 경로 무관

### web의 DB 접근 독립성 유지

- web Dockerfile에도 `DATABASE_URL`이 build 시 placeholder + runtime 실제 값으로 주입됨
- web은 `@simple-cms/db`로 Prisma 직접 접근 — admin BFF 의존 X
- compose `depends_on: db (healthy)`로 db 부팅 완료 대기. admin/web 양쪽 동일
