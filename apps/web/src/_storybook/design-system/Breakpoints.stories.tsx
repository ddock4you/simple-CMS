import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';
import { KRDS_BREAKPOINTS } from './lib/krdsTokens';

const meta = {
  title: 'Web/Design System/Breakpoints',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'KRDS Tailwind 브레이크포인트 — **Tailwind 기본값과 다름**. ' +
          'mobile(360) / tablet(601) / desktop(1025). ' +
          '`apps/web/app/globals.css`의 `@theme { --breakpoint-mobile/tablet/desktop }`로 v4 native에도 등록되어 modifier가 일부 컨텍스트에서 누락되는 케이스 방어.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tokens: Story = {
  render: () => (
    <div className="space-y-[16px] max-w-3xl mx-auto">
      <SectionHeader
        title="브레이크포인트"
        description={
          <>
            모바일 우선(min-width 기반). 참조:{' '}
            <a
              href="https://uiux.egovframe.go.kr/guide/style/style_05.html"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#246BEB', textDecoration: 'underline' }}
            >
              전자정부 표준 프레임워크 가이드
            </a>
          </>
        }
      />
      {KRDS_BREAKPOINTS.map((bp) => (
        <div
          key={bp.name}
          className="p-[24px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-baseline justify-between mb-[8px]">
            <div>
              <span className="font-mono text-[17px] font-bold">{bp.name}</span>
              <span className="font-mono text-[14px] ml-[12px]" style={{ color: '#717171' }}>
                min-width: {bp.minWidth}px
              </span>
            </div>
            <code className="font-mono text-[14px]" style={{ color: '#555555' }}>
              {bp.utility}xxx
            </code>
          </div>
          <p className="text-[14px]" style={{ color: '#555555' }}>
            {bp.description}
          </p>
          <div className="mt-[12px]">
            <div
              className="h-3"
              style={{
                width: `${Math.min(bp.minWidth / 12, 100)}%`,
                backgroundColor: '#246BEB',
                borderRadius: 2,
              }}
              aria-label={`${bp.name} 시작 ${bp.minWidth}px`}
            />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const ModifierExample: Story = {
  name: 'Modifier 사용 예',
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="반응형 modifier 패턴"
        description="viewport 너비에 따라 다른 utility 적용. 모바일 우선 (default → tablet → desktop 순으로 점진 적용)."
      />

      <div className="space-y-[20px]">
        <div
          className="p-[24px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <h3 className="text-[20px] font-bold mb-[8px]">예 1: 그리드 컬럼 수 변경</h3>
          <pre
            className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
            style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
          >
{`<div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3">
  ...
</div>`}
          </pre>
          <p className="text-[14px] mt-[8px]" style={{ color: '#555555' }}>
            → ~600px: 1열 / 601~1024px: 2열 / 1025px~: 3열
          </p>
        </div>

        <div
          className="p-[24px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <h3 className="text-[20px] font-bold mb-[8px]">예 2: 폰트 사이즈 분기</h3>
          <pre
            className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
            style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
          >
{`<h1 className="text-[32px] tablet:text-[40px] desktop:text-[50px]">
  제목
</h1>`}
          </pre>
          <p className="text-[14px] mt-[8px]" style={{ color: '#555555' }}>
            → 모바일 32px → 태블릿 40px → 데스크톱 50px
          </p>
        </div>

        <div
          className="p-[24px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <h3 className="text-[20px] font-bold mb-[8px]">예 3: KRDS mobile variant 값 명시</h3>
          <pre
            className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed"
            style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}
          >
{`<p className="text-[25px] tablet:text-[40px]">
  반응형 표제
</p>`}
          </pre>
          <p className="text-[14px] mt-[8px]" style={{ color: '#555555' }}>
            → KRDS는 일부 타이포에 별도 mobile variant 값을 제공한다. Tailwind class는 px arbitrary value로 명시한다.
          </p>
        </div>
      </div>

      <p className="text-[12px] mt-[24px]" style={{ color: '#717171' }}>
        💡 Storybook 우측 상단 viewport 토글로 360/601/1025 폭을 전환해 실제 modifier 동작을 확인할 수 있다.
      </p>
    </div>
  ),
};

export const TailwindComparison: Story = {
  name: 'Tailwind 기본 vs KRDS',
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="Tailwind 기본 vs KRDS"
        description="KRDS의 mobile/tablet/desktop은 Tailwind의 sm/md/lg와 다른 경계값을 사용. Tailwind 표준에 익숙한 개발자는 헷갈리기 쉬움."
      />
      <div
        className="overflow-hidden"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4' }}
      >
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#F8F8F8' }}>
            <tr>
              <th className="text-left p-[14px] text-[14px] font-bold">상황</th>
              <th className="text-left p-[14px] text-[14px] font-bold">Tailwind 기본</th>
              <th className="text-left p-[14px] text-[14px] font-bold">web 등록 토큰</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-[14px] text-[14px]">소형 모바일 시작</td>
              <td className="p-[14px] font-mono text-[14px]" style={{ color: '#717171' }}>—</td>
              <td className="p-[12px] font-mono text-[14px] font-bold" style={{ color: '#246BEB' }}>
                mobile: 360px
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #F0F0F0' }}>
              <td className="p-[14px] text-[14px]">큰 모바일 / 태블릿 시작</td>
              <td className="p-[14px] font-mono text-[14px]" style={{ color: '#717171' }}>sm: 640px</td>
              <td className="p-[12px] font-mono text-[14px] font-bold" style={{ color: '#246BEB' }}>
                tablet: 601px
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #F0F0F0' }}>
              <td className="p-[14px] text-[14px]">태블릿 가로 / 데스크톱</td>
              <td className="p-[14px] font-mono text-[14px]" style={{ color: '#717171' }}>
                md: 768px · lg: 1024px
              </td>
              <td className="p-[12px] font-mono text-[14px] font-bold" style={{ color: '#246BEB' }}>
                desktop: 1025px
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #F0F0F0' }}>
              <td className="p-[14px] text-[14px]">와이드</td>
              <td className="p-[14px] font-mono text-[14px]" style={{ color: '#717171' }}>
                xl: 1280px · 2xl: 1536px
              </td>
              <td className="p-[14px] font-mono text-[14px]" style={{ color: '#717171' }}>
                — (별도 토큰 없음)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ),
};
