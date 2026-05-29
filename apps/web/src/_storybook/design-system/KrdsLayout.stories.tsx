import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';
import { KRDS_BREAKPOINTS, KRDS_CONTENT_MAX_WIDTH } from './lib/krdsTokens';

const meta = {
  title: 'Web/Design System/KRDS Layout',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'KRDS 표준형 스타일의 콘텐츠 영역, screen margin, column, gutter 기준. 공개 웹 page-container와 section layout의 기준 문서.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const StandardContainer: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="표준형 콘텐츠 영역"
        description={`표준형은 최대 ${KRDS_CONTENT_MAX_WIDTH}px 콘텐츠 영역을 사용한다. 1248px 이상에서는 1200px을 유지하고, 그 미만에서는 screen margin을 제외한 폭으로 축소한다.`}
      />
      <div className="rounded-[8px] border border-[#E4E4E4] bg-white p-[24px]">
        <div className="mx-auto max-w-[1200px] bg-[#EFF5FF] px-[16px] py-[24px] medium:px-[24px]">
          <div className="rounded-[4px] bg-[#246BEB] py-[32px] text-center text-[17px] font-bold text-white">
            max-width 1200px · screen margin 16px / 24px
          </div>
        </div>
      </div>
    </div>
  ),
};

export const ResponsiveGrid: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="표준형 column grid"
        description="small 4 columns, medium 8 columns, large/xlarge 12 columns. large부터 gutter는 24px이다."
      />
      <div className="grid grid-cols-4 gap-[16px] medium:grid-cols-8 large:grid-cols-12 large:gap-[24px]">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="flex h-[96px] items-center justify-center rounded-[4px] bg-[#D3E1FB] text-[13px] font-bold text-[#16408D]"
          >
            {index + 1}
          </div>
        ))}
      </div>
      <p className="mt-[16px] text-[14px] leading-relaxed" style={{ color: '#555555' }}>
        실제 앱에서는 전체 layout grid를 기준으로 콘텐츠 폭과 gutter를 맞추고, 카드 개수는 컴포넌트 목적에 따라 1/2/3/4열 등으로 조정한다.
      </p>
    </div>
  ),
};

export const ScreenMargins: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="최소 screen margin"
        description="small은 16px, medium 이상은 24px을 최소 여백으로 유지한다."
      />
      <div className="space-y-[16px]">
        {KRDS_BREAKPOINTS.map((bp) => (
          <div key={bp.name} className="rounded-[8px] border border-[#E4E4E4] bg-white p-[20px]">
            <div className="mb-[8px] flex items-baseline justify-between">
              <strong className="font-mono text-[17px]">{bp.name}</strong>
              <span className="font-mono text-[14px]" style={{ color: '#555555' }}>
                margin {bp.screenMargin}px
              </span>
            </div>
            <div className="flex h-[48px] rounded-[4px] bg-[#F8F8F8]">
              <div style={{ width: bp.screenMargin }} className="bg-[#FFD47C]" />
              <div className="flex flex-1 items-center justify-center bg-[#D3E1FB] text-[13px] font-bold text-[#16408D]">
                content
              </div>
              <div style={{ width: bp.screenMargin }} className="bg-[#FFD47C]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Gutters: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Gutter"
        description="small/medium은 16px, large/xlarge는 24px gutter를 사용한다."
      />
      <div className="space-y-[16px]">
        {KRDS_BREAKPOINTS.map((bp) => (
          <div key={bp.name} className="rounded-[8px] border border-[#E4E4E4] bg-white p-[20px]">
            <div className="mb-[8px] font-mono text-[14px] font-bold">
              {bp.name}: {bp.gutter}px
            </div>
            <div className="flex items-stretch" style={{ gap: bp.gutter }}>
              <div className="h-[64px] flex-1 rounded-[4px] bg-[#246BEB]" />
              <div className="h-[64px] flex-1 rounded-[4px] bg-[#246BEB]" />
              <div className="h-[64px] flex-1 rounded-[4px] bg-[#246BEB]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};
