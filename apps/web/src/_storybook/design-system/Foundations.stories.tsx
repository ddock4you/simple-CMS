import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { GroupHeader, SectionHeader } from './lib/TokenSwatch';

const meta = {
  title: 'Web/Design System/Foundations',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'web 디자인 시스템의 기반 — 정규화 KRDS CSS · KRDS 표준형 breakpoint/spacing · CSS layer 순서 · Pretendard CDN. ' +
          'globals.css 상단 layer/source 선언과 `layout.tsx`의 import 순서가 권위.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CssImportOrder: Story = {
  name: 'CSS import 순서',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="layout.tsx import 순서 (권위)"
        description="apps/web/app/layout.tsx 3줄. 정규화 KRDS CSS가 먼저, globals.css가 다음. KRDS 컴포넌트는 유지하면서 Tailwind는 16px root 기준으로 동작한다."
      />
      <div
        className="p-[24px]"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
      >
        <pre
          className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
          style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
        >
{`// apps/web/app/layout.tsx
import './krds-normalized.css'; // 1순위 — krds-uiux token/common/component 조합
import './globals.css';         // 2순위 — Tailwind utilities + 자체 BEM 클래스

// .storybook/preview.tsx도 동일 순서 강제`}
        </pre>
      </div>
      <p className="text-[14px] mt-[16px] leading-relaxed" style={{ color: '#555555' }}>
        ⚠ <code className="font-mono text-[12px]">normalize-krds-css.mjs</code>가 KRDS의 10px root 전제를 CSS 파일 생성 시점에 흡수하고, reset-heavy bundle 대신 token/common/component CSS만 조합한다. KRDS의 button/input 기본 스타일과 Tailwind preflight가 충돌하지 않도록 preflight는 계속 제외.
      </p>
    </div>
  ),
};

export const LayerOrder: Story = {
  name: '@layer 순서',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="globals.css layer 선언"
        description="apps/web/app/globals.css 상단. Tailwind preflight 제외 정책. KRDS Tailwind plugin은 사용하지 않아 기본 spacing/screens 충돌을 피한다."
      />
      <div
        className="p-[24px]"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
      >
        <pre
          className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
          style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
        >
{`@layer theme, krds-base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);

/* preflight는 import 안 함 — KRDS button/input 스타일과 충돌 방지 */

@theme {
  --breakpoint-small: 360px;
  --breakpoint-medium: 768px;
  --breakpoint-large: 1024px;
  --breakpoint-xlarge: 1280px;

  --krds-content-max-width: 1200px;
  --krds-screen-margin-small: 16px;
  --krds-screen-margin-medium: 24px;
  --krds-gutter-small: 16px;
  --krds-gutter-large: 24px;
}

@plugin "@tailwindcss/typography";`}
        </pre>
      </div>
      <div
        className="mt-[16px] p-[20px]"
        style={{ borderRadius: 8, backgroundColor: '#EFF5FF', borderLeft: '4px solid #246BEB' }}
      >
        <p className="text-[17px] font-bold mb-[8px]">layer 우선순위 (낮음 → 높음)</p>
        <ol
          className="text-[14px] space-y-[8px] list-decimal pl-[20px] leading-relaxed"
          style={{ color: '#555555' }}
        >
          <li>
            <code className="font-mono text-[12px]">theme</code> — Tailwind 토큰(--color-* 등 CSS variable 정의)
          </li>
          <li>
            <code className="font-mono text-[12px]">krds-base</code> — KRDS 컴포넌트 기본 스타일
          </li>
          <li>
            <code className="font-mono text-[12px]">components</code> — 글로벌 컴포넌트 스타일 (현재 미사용)
          </li>
          <li>
            <code className="font-mono text-[12px]">utilities</code> — Tailwind utility class (최상위, 모든 것을 override)
          </li>
        </ol>
      </div>
    </div>
  ),
};

export const PretendardLoading: Story = {
  name: 'Pretendard CDN 로드',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="폰트 로드 흐름"
        description="layout.tsx + .storybook/preview-head.html 양쪽에서 동일 CDN을 <link>로 삽입."
      />
      <div
        className="p-[24px]"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
      >
        <GroupHeader title="apps/web/app/layout.tsx" />
        <pre
          className="overflow-x-auto p-[16px] font-mono text-[12px] mb-[16px] leading-relaxed"
          style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
        >
{`<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
/>`}
        </pre>
        <GroupHeader title=".storybook/preview-head.html" />
        <p className="text-[14px] leading-relaxed" style={{ color: '#555555' }}>
          Storybook의 iframe 환경에서도 layout.tsx와 동일하게 폰트가 로드되어야 시각 일관성 유지. 같은 URL.
        </p>
      </div>
      <p className="text-[14px] mt-[16px] leading-relaxed" style={{ color: '#555555' }}>
        🌐 CDN 로드 실패 시 globals.css의 폰트 stack 폴백(`-apple-system`, `Noto Sans KR`, `Malgun Gothic` 등)으로 자연스럽게 전환.{' '}
        <code className="font-mono text-[12px]">Web Customs &gt; Font stack</code> 참조.
      </p>
    </div>
  ),
};

export const PageContainer: Story = {
  name: '페이지 컨테이너',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="반응형 페이지 컨테이너"
        description="모든 페이지의 최대 너비와 좌우 padding을 통제. CSS variable로 override 가능."
      />
      <div
        className="p-[24px]"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
      >
        <pre
          className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
          style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
        >
{`.page-container {
  max-width: var(--content-max-width, 1200px);
  margin: 0 auto;
  padding: 0 var(--screen-margin-desktop, 24px);
}

@media (max-width: 767px) {
  .page-container {
    padding: 0 var(--screen-margin-mobile, 16px);
  }
}`}
        </pre>
        <div className="mt-[16px] space-y-[12px]">
          <div className="flex justify-between text-[14px]">
            <span>최대 너비:</span>
            <code className="font-mono text-[12px]">var(--content-max-width, 1200px)</code>
          </div>
          <div className="flex justify-between text-[14px]">
            <span>데스크톱 좌우 padding:</span>
            <code className="font-mono text-[12px]">var(--screen-margin-desktop, 24px)</code>
          </div>
          <div className="flex justify-between text-[14px]">
            <span>모바일 좌우 padding (~767px):</span>
            <code className="font-mono text-[12px]">var(--screen-margin-mobile, 16px)</code>
          </div>
        </div>
      </div>
    </div>
  ),
};
