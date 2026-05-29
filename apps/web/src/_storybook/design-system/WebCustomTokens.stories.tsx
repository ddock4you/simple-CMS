import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { GroupHeader, SectionHeader } from './lib/TokenSwatch';

const meta = {
  title: 'Web/Design System/Web Customs',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`apps/web/app/globals.css`에 정의된 web 자체 디자인 토큰 · 클래스. ' +
          'KRDS plugin 외에 web이 직접 관리하는 영역 — 폰트 stack, Tiptap 콘텐츠 스타일, 페이지 레이아웃 보조, 서브페이지 블록 등.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FontStack: Story = {
  name: '폰트 stack',
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="body 폰트 stack"
        description="apps/web/app/globals.css (33줄~) 정의. Pretendard Variable CDN이 우선이고, 로드 실패 시 단계별 폴백."
      />
      <div
        className="p-[28px]"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
      >
        <pre
          className="overflow-x-auto p-[20px] font-mono text-[12px] leading-relaxed"
          style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
        >
{`font-family:
  'Pretendard Variable',          /* 1순위 — CDN 로드 */
  Pretendard,                     /* 2순위 — 시스템 설치 */
  -apple-system,                  /* macOS · iOS 시스템 폰트 */
  BlinkMacSystemFont,
  system-ui,
  Roboto,
  'Helvetica Neue',
  'Segoe UI',
  'Apple SD Gothic Neo',          /* macOS Korean */
  'Noto Sans KR',                 /* Google Fonts Korean */
  'Malgun Gothic',                /* Windows Korean */
  'Apple Color Emoji',
  'Segoe UI Emoji',
  'Segoe UI Symbol',
  sans-serif;
line-height: 1.6;
color: #333;
-webkit-font-smoothing: antialiased;`}
        </pre>
        <p className="text-[14px] mt-[16px] leading-relaxed" style={{ color: '#555555' }}>
          한글이 자연스럽게 표시되도록 OS별 한글 폰트를 모두 폴백에 포함. Pretendard CDN 로드 실패 시 운영체제 기본 한글 폰트로 자동 전환.
        </p>
      </div>
    </div>
  ),
};

export const DemoBannerVariable: Story = {
  name: 'Demo banner CSS 변수',
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="DEMO_MODE 배너 높이 변수"
        description="시연 모드(DEMO_MODE=true)에서 상단 banner가 표시될 때 sticky 헤더의 top 값을 보정하기 위한 CSS 변수."
      />
      <div
        className="p-[28px]"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
      >
        <pre
          className="overflow-x-auto p-[20px] font-mono text-[12px] mb-[12px] leading-relaxed"
          style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
        >
{`/* apps/web/app/layout.tsx (또는 admin globals.css의 :root) */
:root {
  --demo-banner-h: 0px;          /* 기본값 (비DEMO) */
}

/* DEMO_MODE에서 layout이 inline style로 override */
<body style={{ '--demo-banner-h': '2.25rem' }}>
  <DemoBanner />               {/* h-9 (36px) */}
  ...
</body>`}
        </pre>
        <p className="text-[14px] leading-relaxed" style={{ color: '#555555' }}>
          AdminHeader / PageToolbar의 sticky top 계산에 사용:{' '}
          <code className="font-mono text-[12px]">top-[var(--demo-banner-h,0px)]</code>. 비DEMO 환경 영향 0.
        </p>
      </div>
    </div>
  ),
};

export const ScopedClasses: Story = {
  name: '스코프 클래스',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="globals.css 스코프 클래스"
        description="Tailwind utility로 표현 불가한 영역(사용자 입력 HTML, 동적 콘텐츠)은 BEM 스타일 클래스로 관리. Stage 7e에서 점진 마이그레이션 중 — Hero/Recommended는 utility로 이동 완료."
      />
      <div className="space-y-[16px]">
        {[
          {
            scope: '.tiptap-content',
            range: 'globals.css ~143줄',
            purpose: 'Tiptap 본문(JSON → HTML)의 h1/h2/p/ul/blockquote/code/pre/table 등 스타일',
            note: 'utility 불가 — 사용자가 입력한 HTML 태그에 직접 적용',
          },
          {
            scope: '.home-popup-*',
            range: 'globals.css ~1345줄',
            purpose: '메인 팝업 모달(backdrop, panel, header, body, footer)',
            note: 'Stage 5b 컴포넌트. 시안 확정 시 컴포넌트와 함께 교체',
          },
          {
            scope: '.subpage-block-*',
            range: 'globals.css ~1513줄',
            purpose: 'Stage 6 통합 블록 모델의 HTML/IMAGE/IFRAME 렌더 컨테이너',
            note: '데이터 구조는 안정, 스타일만 시안 확정 시 교체',
          },
          {
            scope: '.preview-banner *',
            range: 'globals.css ~1594줄',
            purpose: 'Stage 7a draft 미리보기 모드 상단 banner + "숨김" 블록 outline',
            note: 'sticky top-0 z-[1000], 노란색 강조',
          },
          {
            scope: '.header-branding *',
            range: 'globals.css ~1321줄',
            purpose: 'Stage 7l 동적 로고 이미지 + 텍스트 폴백 (max-height, object-fit)',
            note: 'KRDS Header.Branding의 children 위치 한계 우회',
          },
          {
            scope: '.kogl-mark',
            range: 'globals.css ~111줄',
            purpose: '공공누리 라이선스 마크 컨테이너 (margin-top 2rem, border-top)',
            note: 'Stage 7d',
          },
        ].map((row) => (
          <div
            key={row.scope}
            className="p-[24px]"
            style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
          >
            <div className="flex items-baseline justify-between mb-[8px]">
              <code className="font-mono text-[17px] font-bold">{row.scope}</code>
              <span className="font-mono text-[12px]" style={{ color: '#717171' }}>
                {row.range}
              </span>
            </div>
            <p className="text-[14px] mb-[4px]">{row.purpose}</p>
            <p className="text-[12px]" style={{ color: '#555555' }}>
              ⓘ {row.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const CarouselWidthGuard: Story = {
  name: 'Swiper width 회귀 방어 CSS',
  parameters: {
    docs: {
      description: {
        story:
          'Stage 7e/7i — Swiper mount 측정 race로 slide.style.width가 22369600px 같은 비정상 값으로 박히는 회귀를 CSS guard로 무력화. JS의 ResizeObserver 트리거와 함께 작동.',
      },
    },
  },
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Hero · Recommended 캐러셀 너비 guard"
        description="Carousel.tsx의 RAF×2 + window load + ResizeObserver 트리거와 함께 작동하는 CSS guard. JS만으로는 첫 mount race를 완전히 막을 수 없어 CSS로 한 번 더 강제."
      />
      <div className="space-y-[16px]">
        <div
          className="p-[20px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <GroupHeader title="Hero (slidesPerView=1)" />
          <pre
            className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
            style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
          >
{`[data-hero-carousel] .swiper,
[data-hero-carousel] .swiper-wrapper {
  width: 100%;
  max-width: 100%;
}
[data-hero-carousel] .swiper-slide {
  width: 100% !important;
  max-width: 100%;
  flex-shrink: 0;
}`}
          </pre>
        </div>
        <div
          className="p-[20px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <GroupHeader
            title="Recommended (slidesPerView 가변)"
            description="base 1 / medium 2 / large 3 — RecommendedSection.tsx의 breakpoints prop과 1:1 동기화 필요."
          />
          <pre
            className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
            style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
          >
{`.home-recommended .swiper-slide {
  width: 100% !important;
  flex-shrink: 0;
}
@media (min-width: 768px) {
  .home-recommended .swiper-slide {
    width: calc((100% - 16px) / 2) !important;
  }
}
@media (min-width: 1024px) {
  .home-recommended .swiper-slide {
    width: calc((100% - 48px) / 3) !important;
  }
}`}
          </pre>
        </div>
        <div
          className="p-[20px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <GroupHeader
            title="SubCarousel (slidesPerView 가변)"
            description="base 1 / medium 2 / large 4 — SubCarouselSection.tsx의 breakpoints prop과 1:1 동기화 필요."
          />
          <pre
            className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
            style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
          >
{`.home-sub-carousel .swiper-slide {
  width: 100% !important;
  flex-shrink: 0;
}
@media (min-width: 768px) {
  .home-sub-carousel .swiper-slide {
    width: calc((100% - 16px) / 2) !important;
  }
}
@media (min-width: 1024px) {
  .home-sub-carousel .swiper-slide {
    width: calc((100% - 72px) / 4) !important;
  }
}`}
          </pre>
        </div>
      </div>
      <p className="text-[12px] mt-[16px] leading-relaxed" style={{ color: '#717171' }}>
        🛡 회귀 감지: <code className="font-mono">Web/Shared/Carousel &gt; Regression22M</code> story가 container resize로 ResizeObserver 경로를 강제 트리거하여 slide width가 정상 범위(`&gt; 0 && &lt; 2000px`)인지 자동 검증.
      </p>
    </div>
  ),
};
