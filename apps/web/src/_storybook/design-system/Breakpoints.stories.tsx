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
          'KRDS 표준형 스타일 breakpoint. small(360) / medium(768) / large(1024) / xlarge(1280). ' +
          '칼럼 수, 가터 너비, 최소 스크린 마진을 함께 관리한다.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tokens: Story = {
  render: () => (
    <div className="space-y-[16px] max-w-4xl mx-auto">
      <SectionHeader
        title="KRDS 표준형 breakpoint"
        description="표준형 스타일은 small부터 xlarge까지 4단계를 사용한다. xsmall(~359px)은 최적화 범위 밖이지만 기본 스타일로 안전 대응한다."
      />
      <div className="overflow-hidden" style={{ borderRadius: 8, border: '1px solid #E4E4E4' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#F8F8F8' }}>
            <tr>
              <th className="p-[14px] text-left text-[14px] font-bold">name</th>
              <th className="p-[14px] text-left text-[14px] font-bold">viewport</th>
              <th className="p-[14px] text-left text-[14px] font-bold">column</th>
              <th className="p-[14px] text-left text-[14px] font-bold">gutter</th>
              <th className="p-[14px] text-left text-[14px] font-bold">screen margin</th>
              <th className="p-[14px] text-left text-[14px] font-bold">modifier</th>
            </tr>
          </thead>
          <tbody>
            {KRDS_BREAKPOINTS.map((bp, index) => (
              <tr key={bp.name} style={{ borderTop: index === 0 ? 'none' : '1px solid #F0F0F0' }}>
                <td className="p-[14px] font-mono text-[14px] font-bold">{bp.name}</td>
                <td className="p-[14px] font-mono text-[14px]" style={{ color: '#555555' }}>{bp.minWidth}px~</td>
                <td className="p-[14px] font-mono text-[14px]">{bp.columns}</td>
                <td className="p-[14px] font-mono text-[14px]">{bp.gutter}px</td>
                <td className="p-[14px] font-mono text-[14px]">{bp.screenMargin}px</td>
                <td className="p-[14px] font-mono text-[14px]" style={{ color: '#246BEB' }}>{bp.utility}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[14px] leading-relaxed" style={{ color: '#555555' }}>
        공개 웹에서는 Tailwind 기본 <code className="font-mono">sm/md/lg/xl</code> 대신 KRDS 이름인 <code className="font-mono">small/medium/large/xlarge</code>를 사용한다. 모바일 기본값은 prefix 없이 작성하고, <code className="font-mono">small:</code>은 360px 이상에서 별도 보정이 필요할 때만 쓴다.
      </p>
    </div>
  ),
};

export const ModifierExample: Story = {
  name: 'Modifier 사용 예',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="반응형 modifier 패턴"
        description="기본 스타일 → medium → large → xlarge 순으로 점진 적용한다."
      />
      <div className="space-y-[20px]">
        <ExampleBlock
          title="예 1: KRDS 표준 column grid"
          code={`<div className="grid grid-cols-4 gap-[16px] medium:grid-cols-8 large:grid-cols-12 large:gap-[24px]">
  ...
</div>`}
          description="small: 4 columns / medium: 8 columns / large~xlarge: 12 columns"
        />
        <ExampleBlock
          title="예 2: 카드 리스트"
          code={`<ul className="grid grid-cols-1 gap-[16px] medium:grid-cols-2 large:grid-cols-3 large:gap-[24px]">
  ...
</ul>`}
          description="전체 layout grid는 KRDS column을 따르되, 카드 표시 개수는 컴포넌트 의미에 맞춰 조정한다."
        />
        <ExampleBlock
          title="예 3: 타이포그래피"
          code={`<h1 className="text-[32px] medium:text-[40px] large:text-[50px]">
  제목
</h1>`}
          description="px arbitrary value로 KRDS 타이포 값을 명시한다."
        />
      </div>
    </div>
  ),
};

export const TailwindComparison: Story = {
  name: 'Tailwind 기본 vs KRDS 표준형',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Tailwind 기본 vs KRDS 표준형"
        description="공개 웹은 KRDS 표준형 breakpoint를 단일 기준으로 사용한다. Tailwind 기본 breakpoint는 사용하지 않는다."
      />
      <div className="overflow-hidden" style={{ borderRadius: 8, border: '1px solid #E4E4E4' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#F8F8F8' }}>
            <tr>
              <th className="p-[14px] text-left text-[14px] font-bold">상황</th>
              <th className="p-[14px] text-left text-[14px] font-bold">Tailwind 기본</th>
              <th className="p-[14px] text-left text-[14px] font-bold">web KRDS 기준</th>
            </tr>
          </thead>
          <tbody>
            <ComparisonRow label="small 시작" tailwind="-" krds="small: 360px" />
            <ComparisonRow label="medium 시작" tailwind="md: 768px" krds="medium: 768px" />
            <ComparisonRow label="large 시작" tailwind="lg: 1024px" krds="large: 1024px" />
            <ComparisonRow label="xlarge 시작" tailwind="xl: 1280px" krds="xlarge: 1280px" />
          </tbody>
        </table>
      </div>
    </div>
  ),
};

function ExampleBlock({ title, code, description }: { title: string; code: string; description: string }) {
  return (
    <div className="p-[24px]" style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}>
      <h3 className="text-[20px] font-bold mb-[8px]">{title}</h3>
      <pre className="overflow-x-auto p-[16px] font-mono text-[12px] leading-relaxed" style={{ backgroundColor: '#F8F8F8', borderRadius: 4 }}>
        {code}
      </pre>
      <p className="text-[14px] mt-[8px]" style={{ color: '#555555' }}>{description}</p>
    </div>
  );
}

function ComparisonRow({ label, tailwind, krds }: { label: string; tailwind: string; krds: string }) {
  return (
    <tr style={{ borderTop: '1px solid #F0F0F0' }}>
      <td className="p-[14px] text-[14px]">{label}</td>
      <td className="p-[14px] font-mono text-[14px]" style={{ color: '#717171' }}>{tailwind}</td>
      <td className="p-[14px] font-mono text-[14px] font-bold" style={{ color: '#246BEB' }}>{krds}</td>
    </tr>
  );
}
