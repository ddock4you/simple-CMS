import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';
import { KRDS_COMPONENT_SPACING, KRDS_LAYOUT_SPACING, KRDS_RADIUS, KRDS_SPACING } from './lib/krdsTokens';

const meta = {
  title: 'Web/Design System/KRDS Spacing & Radius',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'KRDS spacing 0~10 (2/4/8/12/16/20/24/32/40/48px), borderRadius, 표준형 간격 적용 기준. ' +
          'Tailwind plugin은 사용하지 않으므로 앱 코드에서는 KRDS 정확 값이 필요할 때 arbitrary value를 명시한다.',
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
        description="KRDS 그리드 단위 (2/4/8/12/16/20/24/32/40/48px). 앱 코드에서는 표준 Tailwind spacing과 혼동하지 않도록 필요한 값만 arbitrary value로 쓴다."
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
        description="KRDS radius 0~9 (0/2/4/6/8/12/16/20/24/40px). 앱 코드에서는 rounded-[8px], rounded-[12px]처럼 값을 명시한다."
      />
      <div className="grid grid-cols-2 medium:grid-cols-3 large:grid-cols-5 gap-[16px] large:gap-[24px]">
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

export const LayoutSpacing: Story = {
  name: '간격 적용: Layout',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Layout 간격"
        description="KRDS 간격 적용의 큰 구조 기준. 공개 웹 page/subpage layout과 footer spacing의 기준이다."
      />
      <SpacingTable rows={KRDS_LAYOUT_SPACING} />
    </div>
  ),
};

export const ContentHierarchy: Story = {
  name: '간격 적용: Content hierarchy',
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="콘텐츠 계층 간격"
        description="제목과 본문, 본문 블록 사이 간격은 8-point grid에 맞춰 12/16/24/32/40px 계열로 정렬한다."
      />
      <article className="rounded-[8px] border border-[#E4E4E4] bg-white p-[24px]">
        <p className="mb-[32px] text-[14px]" style={{ color: '#555555' }}>Breadcrumb와 H1 사이 mobile 32px / PC 40px</p>
        <h1 className="mb-[32px] text-[32px] font-bold leading-[1.3]">페이지 제목</h1>
        <h2 className="mt-[40px] mb-[16px] text-[24px] font-bold">H2 제목</h2>
        <p className="my-[16px] text-[16px] leading-[1.8]" style={{ color: '#555555' }}>
          문단과 리스트는 12~16px 리듬을 사용하고, 표/이미지/blockquote 같은 블록 콘텐츠는 24px 간격을 둔다.
        </p>
        <h3 className="mt-[32px] mb-[12px] text-[20px] font-semibold">H3 제목</h3>
        <div className="my-[24px] rounded-[8px] bg-[#EFF5FF] p-[16px] text-[14px]" style={{ color: '#16408D' }}>
          blockquote / table / media block: my 24px
        </div>
      </article>
    </div>
  ),
};

export const ComponentListSpacing: Story = {
  name: '간격 적용: Component list',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="컴포넌트 리스트 간격"
        description="카드 리스트처럼 동일 컴포넌트가 반복되는 목록의 간격을 보여준다. mobile/medium은 16px, large 이상은 24px gutter를 기준으로 한다."
      />
      <div className="grid grid-cols-1 gap-[16px] medium:grid-cols-2 large:grid-cols-3 large:gap-[24px]">
        {['카드 1', '카드 2', '카드 3'].map((label) => (
          <div key={label} className="rounded-[8px] border border-[#E4E4E4] bg-white p-[16px] large:p-[24px]">
            <p className="text-[17px] font-bold">{label}</p>
            <p className="mt-[8px] text-[14px]" style={{ color: '#555555' }}>list gap 16px / 24px</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const InputGroupSpacing: Story = {
  name: '간격 적용: Input group',
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="입력 그룹 간격"
        description="인풋과 버튼처럼 가로/세로로 조합되는 입력 그룹은 16px 간격을 기준으로 한다."
      />
      <div className="rounded-[8px] border border-[#E4E4E4] bg-white p-[16px] large:p-[24px]">
        <div className="flex flex-col gap-[16px] large:flex-row">
          <input
            className="min-w-0 flex-1 rounded-[4px] border border-[#C6C6C6] px-[16px] py-[12px]"
            placeholder="검색어"
          />
          <button className="rounded-[4px] bg-[#246BEB] px-[24px] py-[12px] text-white">검색</button>
        </div>
        <p className="mt-[16px] text-[14px] leading-relaxed" style={{ color: '#555555' }}>
          검색 UI 자체가 아니라 입력 필드와 액션 버튼 사이의 16px 간격을 보여주는 예시다.
        </p>
      </div>
    </div>
  ),
};

export const ComponentPadding: Story = {
  name: '간격 적용: Component padding',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="컴포넌트 내부 패딩"
        description="카드/모달/인포박스는 mobile 16px, PC 24px을 기준으로 한다."
      />
      <SpacingTable rows={KRDS_COMPONENT_SPACING} />
    </div>
  ),
};

function SpacingTable({ rows }: { rows: readonly { name: string; pc: number; mobile: number | null; description: string }[] }) {
  return (
    <div className="overflow-hidden" style={{ borderRadius: 8, border: '1px solid #E4E4E4' }}>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#F8F8F8' }}>
          <tr>
            <th className="p-[14px] text-left text-[14px] font-bold">name</th>
            <th className="p-[14px] text-left text-[14px] font-bold">Mobile</th>
            <th className="p-[14px] text-left text-[14px] font-bold">PC</th>
            <th className="p-[14px] text-left text-[14px] font-bold">용도</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.name} style={{ borderTop: index === 0 ? 'none' : '1px solid #F0F0F0' }}>
              <td className="p-[14px] font-mono text-[14px] font-bold">{row.name}</td>
              <td className="p-[14px] font-mono text-[14px]">{row.mobile === null ? '-' : `${row.mobile}px`}</td>
              <td className="p-[14px] font-mono text-[14px]" style={{ color: '#246BEB' }}>{row.pc}px</td>
              <td className="p-[14px] text-[14px]" style={{ color: '#555555' }}>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const TailwindVsKrds: Story = {
  name: 'Tailwind 기본값 vs KRDS scale',
  parameters: {
    docs: {
      description: {
        story:
          '과거 KRDS plugin은 Tailwind 기본 spacing/borderRadius 토큰을 덮었지만, 현재는 plugin을 제거해 Tailwind 기본값을 유지한다. KRDS 값은 참고표로만 사용한다.',
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
          description="Tailwind 기본 spacing은 그대로 유지된다. KRDS scale이 필요하면 arbitrary value로 px 값을 명시한다."
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
                <th className="text-left p-[14px] font-mono text-[14px] font-bold">KRDS scale</th>
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
                    {row.tailwind !== row.krds ? '값 명시 필요' : '= 동일'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[14px] mt-[16px] leading-relaxed" style={{ color: '#555555' }}>
          KRDS scale을 그대로 맞춰야 하는 영역은 <code className="font-mono text-[12px]">p-[24px]</code>처럼 값을 직접 적어 Tailwind 기본 토큰과 구분한다.
        </p>
      </div>
    );
  },
};
