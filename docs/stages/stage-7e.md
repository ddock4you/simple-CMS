# Stage 7e — 공개 웹 KRDS Tailwind 도입 + Hero utility 마이그레이션 + 캐러셀 width 회귀 방어

- **공개 웹 Tailwind v4 도입 (preflight 제외 모드)**: `apps/web`에 `tailwindcss@^4`/`@tailwindcss/postcss@^4`/`postcss@^8.5` + `@krds-ui/tailwindcss-plugin@^0.6` 신규 설치. 기존 KRDS CSS + `globals.css` 1670줄과 공존하기 위해 preflight를 제외한 Tailwind 로드 방식 사용:
  - `apps/web/postcss.config.mjs` 신규 (`@tailwindcss/postcss`만 등록)
  - `apps/web/app/globals.css` 최상단: `@layer theme, krds-base, components, utilities;` + `@import 'tailwindcss/theme.css' layer(theme);` + `@import 'tailwindcss/utilities.css' layer(utilities);` + `@theme { --breakpoint-mobile: 360px; --breakpoint-tablet: 601px; --breakpoint-desktop: 1025px; }` + `@plugin "@krds-ui/tailwindcss-plugin";`
  - layout.tsx의 import 순서: `krds-react/dist/index.css` → `globals.css` 유지 (utility가 KRDS 스타일 위에 올라가도록)
  - admin은 변경 없음 — 이전부터 Tailwind v4 + shadcn/ui 사용 중
- **KRDS Tailwind plugin 성격**: plugin 함수 본문은 빈 함수이고 두 번째 인자의 `theme.screens` + `theme.extend.{colors,fontSize,fontWeight,spacing,borderRadius}` 토큰만 등록. v4 `@plugin` 호환 디렉티브로 `bg-primary-50`/`text-display-s`/`rounded-5`/`p-7`/`mobile:`/`tablet:`/`desktop:` utility가 자동 생성
- **Hero 섹션 utility 마이그레이션**: `apps/web/src/features/home-section/ui/HeroSection.tsx`를 KRDS Tailwind utility로 변환하며 globals.css의 `.home-hero*` 블록 91줄 삭제. 색상은 plugin 토큰(`bg-primary-50`/`text-gray-90` 등), spacing/radius는 KRDS scale(`p-8`=32px, `rounded-5`=12px), 브레이크포인트는 KRDS(`tablet:601px`/`desktop:1025px`), fontSize는 디자인 강조 사이즈는 arbitrary(`text-[28px]` 등) + 정확 매핑은 토큰. `.home-hero-link:hover .home-hero-title` → `group` + `group-hover:underline`
- **Swiper 캐러셀 width 회귀 방어 (Carousel.tsx 공용)**: 첫 방문 시 Pretendard CDN 폰트/KRDS Header mount 등 async layout shift로 swiper의 부모 width 측정이 실패하여 `slide.style.width`가 비정상 큰 값(예: 22369600px)으로 박히는 회귀 발생. `apps/web/src/shared/ui/Carousel.tsx`의 `useEffect`에 다층 트리거로 `swiper.update()` 호출:
  - (1) `requestAnimationFrame` 2회 — 첫 paint 직후 안정화된 layout 측정
  - (2) `window 'load'` 이벤트 — 모든 리소스(폰트/이미지) 로드 완료 시점
  - (3) `ResizeObserver` — 부모 element width 변화마다 재측정
  - swiper의 `observer`/`observeParents` 옵션은 사용 안 함 (내부 observer + update가 race 시 22M로 갱신되는 케이스 회피). `watchOverflow`만 유지
- **Hero 전용 CSS width guard**: Hero는 `slidesPerView=1` 고정이므로 `<section data-hero-carousel>` + globals.css의 `[data-hero-carousel] .swiper-slide { width: 100% !important; flex-shrink: 0; }` 이중 안전망
- **Recommended 섹션 breakpoint별 width guard**: `slidesPerView` 가변(mobile 1 / tablet 2 / desktop 3)이라 `.home-recommended .swiper-slide`에 viewport별 `calc()` width 강제 (`768px+: calc((100% - 16px) / 2)`, `1024px+: calc((100% - 40px) / 3)`). RecommendedSection.tsx의 `breakpoints` prop + `spaceBetween`과 1:1 동기화 필요 — 변경 시 globals.css도 함께 수정
- **진단 경험**: 변환 전엔 정상이었던 이유가 legacy CSS가 있어서가 아니라 swiper의 mount 측정이 우연히 안정된 layout에 걸렸던 것. 재방문(client-side nav) 시에는 layout이 이미 안정화돼 있어 mount 측정이 항상 성공 — 이 패턴이 "첫 방문 vs 재방문" 증상 차이의 원인 ([계획 문서](../../../Users/ddock/local plan files/krds-encapsulated-wind.md) 참조)
