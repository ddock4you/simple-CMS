import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';
import { KRDS_RADIUS, KRDS_SPACING } from './lib/krdsTokens';

const meta = {
  title: 'Web/Design System/KRDS Spacing & Radius',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'KRDS plugin spacing 0~10 (2/4/8/12/16/20/24/32/40/48px) — **Tailwind 기본값 override**. ' +
          'borderRadius 0~9 (2/4/6/8/12/16/20/24/40px). p-1이 2px (Tailwind 기본 4px와 다름) 주의.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spacing: Story = {
  render: () => (
    <div className="space-y-[16px] max-w-3xl mx-auto">
      <SectionHeader
        title="Spacing"
        description="padding · margin · gap utility. KRDS 그리드 단위 (2/4/8/12/16/20/24/32/40/48px). p-1=2px (Tailwind 기본 4px가 아님 주의)."
      />
      {KRDS_SPACING.map((t) => (
        <div
          key={t.step}
          className="p-[20px] flex items-center gap-[20px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <div className="flex-shrink-0 w-16 text-center">
            <div className="font-mono text-[17px] font-bold">{t.step}</div>
            <div className="font-mono text-[12px]" style={{ color: '#717171' }}>
              {t.px}px
            </div>
          </div>
          <div className="flex-1 flex items-center gap-[12px]">
            <div
              className="h-6"
              style={{ width: `${t.px}px`, backgroundColor: '#246BEB', borderRadius: 2 }}
              aria-label={`spacing-${t.step} 너비 ${t.px}px`}
            />
            <span className="text-[14px]" style={{ color: '#555555' }}>
              {t.description ?? ''}
            </span>
          </div>
          <code className="font-mono text-[14px] flex-shrink-0" style={{ color: '#555555' }}>
            {t.utility}
          </code>
        </div>
      ))}
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Border Radius"
        description="rounded-0 ~ rounded-9 (0/2/4/6/8/12/16/20/24/40px). rounded-4(8px)와 rounded-5(12px)가 카드·버튼·이미지에 가장 많이 사용됨."
      />
      <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-5 gap-[16px]">
        {KRDS_RADIUS.map((t) => (
          <div key={t.step} className="text-center">
            <div
              className="h-20 mb-[8px]"
              style={{ backgroundColor: '#246BEB', borderRadius: `${t.px}px` }}
              aria-hidden
            />
            <div className="font-mono text-[14px] font-bold">{t.step}</div>
            <div className="font-mono text-[12px]" style={{ color: '#717171' }}>
              {t.px}px
            </div>
            <code className="font-mono text-[12px]" style={{ color: '#555555' }}>
              {t.utility}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const TailwindVsKrds: Story = {
  name: 'Tailwind 기본값 vs KRDS override',
  parameters: {
    docs: {
      description: {
        story:
          'KRDS plugin은 Tailwind 기본 spacing/borderRadius 토큰을 **완전히 override**. p-1, p-3 등 같은 utility 이름이지만 px 값이 다름.',
      },
    },
  },
  render: () => {
    const comparison = [
      { step: 1, tailwind: '4px', krds: '2px' },
      { step: 2, tailwind: '8px', krds: '4px' },
      { step: 3, tailwind: '12px', krds: '8px' },
      { step: 4, tailwind: '16px', krds: '12px' },
      { step: 5, tailwind: '20px', krds: '16px' },
      { step: 6, tailwind: '24px', krds: '20px' },
      { step: 7, tailwind: '28px', krds: '24px' },
      { step: 8, tailwind: '32px', krds: '32px' },
      { step: 10, tailwind: '40px', krds: '48px' },
    ];
    return (
      <div className="max-w-3xl mx-auto">
        <SectionHeader
          title="Tailwind 기본값 vs KRDS"
          description="KRDS plugin은 Tailwind 기본 spacing 토큰을 완전히 override. 같은 utility 이름(p-1, p-3 등)이지만 px 값이 다름."
        />
        <div
          className="overflow-hidden"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4' }}
        >
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#F8F8F8' }}>
              <tr>
                <th className="text-left p-[14px] font-mono text-[14px] font-bold">utility</th>
                <th className="text-left p-[14px] font-mono text-[14px] font-bold">Tailwind 기본</th>
                <th className="text-left p-[14px] font-mono text-[14px] font-bold">KRDS plugin</th>
                <th className="text-left p-[14px] text-[14px] font-bold">차이</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr
                  key={row.step}
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #F0F0F0' }}
                >
                  <td className="p-[14px] font-mono text-[14px]">p-{row.step}</td>
                  <td className="p-[14px] font-mono text-[14px]" style={{ color: '#555555' }}>
                    {row.tailwind}
                  </td>
                  <td className="p-[12px] font-mono text-[14px] font-bold" style={{ color: '#246BEB' }}>
                    {row.krds}
                  </td>
                  <td
                    className="p-[14px] text-[12px]"
                    style={{ color: row.tailwind !== row.krds ? '#E71825' : '#008A1E' }}
                  >
                    {row.tailwind !== row.krds ? '⚠ override' : '= 동일'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[14px] mt-[16px] leading-relaxed" style={{ color: '#555555' }}>
          ⚠ Tailwind 표준 spacing을 기억하고 KRDS 환경에 적용하면 오차 발생. KRDS 토큰표를 항상 확인.
        </p>
      </div>
    );
  },
};
