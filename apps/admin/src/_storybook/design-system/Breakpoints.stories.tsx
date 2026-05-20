import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';

const meta = {
  title: 'Admin/Design System/Breakpoints',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'admin은 Tailwind 기본 브레이크포인트(sm/md/lg/xl/2xl)를 그대로 사용. ' +
          '**데스크톱 우선** 환경 — 모바일(`< md`)에서 PageToolbar가 Top Sheet로 collapse.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const BREAKPOINTS = [
  { token: 'sm', value: '640px', usage: '거의 미사용', note: '' },
  { token: 'md', value: '768px', usage: '모바일 ↔ 태블릿 분기', note: 'PageToolbar Sheet collapse 경계' },
  { token: 'lg', value: '1024px', usage: '태블릿 ↔ 데스크톱 분기', note: 'admin 주 사용 환경' },
  { token: 'xl', value: '1280px', usage: '와이드 모니터', note: '' },
  { token: '2xl', value: '1536px', usage: '초와이드', note: '거의 미사용' },
];

export const Tokens: Story = {
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="Breakpoints"
        description="Tailwind 기본값을 그대로 사용. min-width 기반. 모바일 우선 (`default → md → lg → xl`로 점진 적용)."
      />
      <div className="space-y-2">
        {BREAKPOINTS.map((bp) => (
          <div
            key={bp.token}
            className="rounded-lg border bg-card text-card-foreground p-4 flex items-baseline gap-4"
          >
            <span className="font-mono text-[17px] font-semibold w-16 flex-shrink-0">{bp.token}</span>
            <code className="font-mono text-[14px] text-muted-foreground w-24 flex-shrink-0">
              {bp.value}
            </code>
            <span className="text-[14px] flex-1">{bp.usage}</span>
            {bp.note ? (
              <span className="text-[12px] text-muted-foreground italic">{bp.note}</span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-[14px] text-muted-foreground mt-6 leading-relaxed">
        admin은 데스크톱 우선. 모바일(<code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">&lt; md</code>)에서 PageToolbar가 Top Sheet로 collapse.
      </p>
    </div>
  ),
};

export const ModifierExample: Story = {
  name: 'Modifier 사용 예',
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="반응형 modifier 패턴"
        description="viewport 너비에 따라 다른 utility 적용. 모바일 우선 (default → md → lg 순으로 점진 적용)."
      />
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-[17px] font-semibold mb-2">예 1: 그리드 컬럼 수 변경</h4>
          <pre
            className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded"
          >
{`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  ...
</div>`}
          </pre>
          <p className="text-[14px] text-muted-foreground mt-2">
            → ~767px: 1열 / 768~1023px: 2열 / 1024px~: 3열
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h4 className="text-[17px] font-semibold mb-2">예 2: PageToolbar Sheet collapse</h4>
          <pre
            className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded"
          >
{`// PageToolbar 내부
<div className="hidden md:flex items-center gap-2">
  {/* desktop — inline 표시 */}
</div>
<div className="md:hidden">
  {/* mobile — Top Sheet collapse */}
</div>`}
          </pre>
          <p className="text-[14px] text-muted-foreground mt-2">
            → 모바일 768px 미만에서 자동 collapse. 사용자가 버튼 클릭으로 Top Sheet 펼침
          </p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground mt-6">
        💡 Storybook 우측 상단 viewport 토글로 640/768/1024 폭 전환하여 modifier 동작 확인 가능.
      </p>
    </div>
  ),
};
