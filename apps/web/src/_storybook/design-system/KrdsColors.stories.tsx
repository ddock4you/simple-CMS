import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { ColorSwatch, GroupHeader, SectionHeader } from './lib/TokenSwatch';
import { KRDS_PALETTES, type KrdsPalette } from './lib/krdsTokens';

const meta = {
  title: 'Web/Design System/KRDS Colors',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`@krds-ui/tailwindcss-plugin` v0.6.0 제공 색상 카탈로그. **31개 팔레트 × 5~12 단계**. ' +
          'KRDS plugin이 단일 출처. 50 단계가 각 팔레트의 대표 색.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const Section = ({
  title,
  subtitle,
  palettes,
}: {
  title: string;
  subtitle: string;
  palettes: KrdsPalette[];
}) => (
  <section className="pb-[40px] mb-[40px]" style={{ borderBottom: '1px solid #F0F0F0' }}>
    <SectionHeader title={title} description={subtitle} />
    <div className="space-y-[40px]">
      {palettes.map((p) => (
        <div key={p.name}>
          <GroupHeader title={p.name} description={p.description} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[16px]">
            {p.shades.map((shade) => (
              <ColorSwatch
                key={shade}
                name={`${p.name}-${shade}`}
                utility={`bg-${p.name}-${shade}`}
                shade={shade}
                hex={p.hex[shade] ?? '#000000'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const brandPalettes = KRDS_PALETTES.filter((p) => p.category === 'brand');
const neutralPalettes = KRDS_PALETTES.filter((p) => p.category === 'neutral');
const statusPalettes = KRDS_PALETTES.filter((p) => p.category === 'status');
const extendedPalettes = KRDS_PALETTES.filter((p) => p.category === 'extended');

export const Brand: Story = {
  name: 'Brand',
  render: () => (
    <Section
      title="Brand"
      subtitle="공공 사이트 브랜드 색. primary=#246BEB, secondary=#003675, point=#E71825"
      palettes={brandPalettes}
    />
  ),
};

export const Neutral: Story = {
  name: 'Neutral',
  render: () => (
    <Section
      title="Neutral"
      subtitle="텍스트 · 배경 · 경계용 중립 톤. gray-50=#8E8E8E"
      palettes={neutralPalettes}
    />
  ),
};

export const Status: Story = {
  name: 'Status',
  render: () => (
    <Section
      title="Status"
      subtitle="시맨틱 피드백 색. UI 상태 표시 전용"
      palettes={statusPalettes}
    />
  ),
};

export const Extended: Story = {
  name: 'Extended',
  parameters: {
    docs: {
      description: {
        story:
          'navy · blue · royal-blue · sky-blue · aqua · teal · green · lime-green · lime · olive · yellow · gold · saddle-brown · brown · dark-red · red · orange · coral · salmon · hot-pink · pink · fuchsia · purple · blue-violet — 디자인 강조용. fuchsia는 5~50 단계만.',
      },
    },
  },
  render: () => (
    <Section
      title="Extended"
      subtitle="확장 팔레트 (24색) — 그래프 · 일러스트레이션 · 강조용. 일반 UI는 brand/neutral/status 우선"
      palettes={extendedPalettes}
    />
  ),
};

export const All: Story = {
  name: '전체',
  render: () => (
    <div>
      <Section title="Brand" subtitle="주요 브랜드 색 3종" palettes={brandPalettes} />
      <Section title="Neutral" subtitle="중립 톤" palettes={neutralPalettes} />
      <Section title="Status" subtitle="시맨틱 피드백" palettes={statusPalettes} />
      <Section title="Extended" subtitle="확장 팔레트" palettes={extendedPalettes} />
    </div>
  ),
};
