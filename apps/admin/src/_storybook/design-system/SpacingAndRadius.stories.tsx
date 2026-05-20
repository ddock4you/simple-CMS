import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';
import { useCssVar } from './lib/useCssVar';
import { RADIUS_TOKENS, SPACING_TOKENS } from './lib/tokenList';

const meta = {
  title: 'Admin/Design System/Spacing & Radius',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '7개 spacing 토큰 + 5개 radius 토큰. design.md §4 + §6 미러. ' +
          'spacing은 `xs/sm/md/lg/xl`(Tailwind utility 표기 `p-1/p-2/p-4/p-6/p-8`) + `page-x/card`(CSS variable). ' +
          'radius는 `--radius: 0.625rem` 기준으로 calc() 파생.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spacing: Story = {
  name: 'Spacing',
  render: () => (
    <div className="space-y-3 max-w-3xl mx-auto">
      <SectionHeader
        title="Spacing"
        description="padding · margin · gap utility. xs(4) / sm(8) / md(16) / lg(24) / xl(32) — page-x · card는 CSS variable로 별도."
      />
      {SPACING_TOKENS.map((t) => (
        <div key={t.name} className="rounded-lg border bg-card text-card-foreground p-4">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="font-mono text-[17px] font-semibold">{t.name}</span>
              <span className="font-mono text-[14px] text-muted-foreground ml-3">{t.px}</span>
              {t.cssVar ? (
                <span className="font-mono text-[12px] text-muted-foreground ml-3">
                  {t.cssVar}
                </span>
              ) : null}
            </div>
            <code className="font-mono text-[14px] text-muted-foreground">{t.utility}</code>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="h-6 rounded-sm bg-primary"
              style={{ width: t.px }}
              aria-label={`${t.name} 너비 ${t.px}`}
            />
            <span className="text-[14px] text-muted-foreground">{t.description}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-2">{t.yamlKey}</div>
        </div>
      ))}
    </div>
  ),
};

export const PaddingExample: Story = {
  name: 'Padding 적용 예',
  parameters: {
    docs: {
      description: {
        story: 'Card 내부 padding(`--spacing-card` = 24px)이 어떻게 보이는지 비교.',
      },
    },
  },
  render: () => (
    <div className="space-y-4 max-w-2xl mx-auto">
      <SectionHeader
        title="Padding 적용 비교"
        description="실제 카드에서 padding 토큰이 어떻게 보이는지 시각적으로 확인."
      />
      {[
        { utility: 'p-1', px: '4px', note: '' },
        { utility: 'p-4', px: '16px', note: '' },
        { utility: 'p-6', px: '24px', note: 'Card 기본' },
        { utility: 'p-8', px: '32px', note: '섹션 간 여백' },
      ].map((row) => (
        <div key={row.utility} className="rounded-lg border bg-card">
          <div className="bg-primary/5 p-1 rounded-t-lg text-[12px] font-mono text-center text-muted-foreground">
            {row.utility} ({row.px}) {row.note ? `— ${row.note}` : ''}
          </div>
          <div
            className="bg-card"
            style={{ padding: row.px }}
          >
            <div className="bg-primary/10 rounded h-12 flex items-center justify-center text-[14px]">
              콘텐츠
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};

function RadiusCard({ name, cssVar, utility, yamlKey, description }: typeof RADIUS_TOKENS[number]) {
  const { ref, value } = useCssVar(cssVar);
  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className={`bg-primary h-24 ${utility} border border-primary/20 flex items-center justify-center`}
      >
        <code className="text-primary-foreground font-mono text-[12px]">{utility}</code>
      </div>
      <div className="space-y-0.5">
        <div className="font-mono text-[14px] font-semibold">{name}</div>
        <div className="font-mono text-[12px] text-muted-foreground">
          {cssVar !== '—' ? `${cssVar} → ${value || '—'}` : '9999px'}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">{yamlKey}</div>
        {description ? (
          <div className="text-[14px] text-muted-foreground pt-1">{description}</div>
        ) : null}
      </div>
    </div>
  );
}

export const Radius: Story = {
  name: 'Radius',
  render: () => (
    <div className="max-w-5xl mx-auto">
      <SectionHeader
        title="Radius"
        description="`--radius: 0.625rem`가 기준. shadcn/ui는 `rounded-lg`(0.625rem)를 기본값으로 사용. Apple식 pill CTA(`rounded-full`)는 운영 도구에 부적합으로 미채택."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {RADIUS_TOKENS.map((t) => (
          <RadiusCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  ),
};

export const RadiusCalcChain: Story = {
  name: 'Radius calc() 파생 관계',
  parameters: {
    docs: {
      description: {
        story:
          '`--radius`(기준 0.625rem) → `--radius-sm/md/lg/xl/2xl/3xl/4xl`로 calc() 파생. 기준값 변경 시 전체 자동 조정.',
      },
    },
  },
  render: () => {
    const calcRows = [
      { token: '--radius-sm', formula: 'calc(--radius * 0.6)', utility: 'rounded-sm' },
      { token: '--radius-md', formula: 'calc(--radius * 0.8)', utility: 'rounded-md' },
      { token: '--radius-lg', formula: 'var(--radius)', utility: 'rounded-lg', note: '기준' },
      { token: '--radius-xl', formula: 'calc(--radius * 1.4)', utility: 'rounded-xl' },
      { token: '--radius-2xl', formula: 'calc(--radius * 1.8)', utility: 'rounded-2xl' },
      { token: '--radius-3xl', formula: 'calc(--radius * 2.2)', utility: 'rounded-3xl' },
      { token: '--radius-4xl', formula: 'calc(--radius * 2.6)', utility: 'rounded-4xl' },
    ];
    return (
      <div className="space-y-2 max-w-3xl mx-auto">
        <SectionHeader
          title="Radius calc() 파생"
          description={
            <>
              기준: <code className="font-mono text-[12px] bg-muted px-2 py-1 rounded">--radius: 0.625rem</code>. 모든 파생 값은 calc()로 자동 결정.
            </>
          }
        />
        {calcRows.map((row) => (
          <div
            key={row.token}
            className="rounded-lg border bg-card text-card-foreground p-3 flex items-center gap-4"
          >
            <div className="flex-shrink-0 w-20">
              <div className={`bg-primary h-12 w-12 ${row.utility}`} />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[14px] font-semibold">
                {row.token}
                {row.note ? (
                  <span className="ml-2 text-[12px] font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {row.note}
                  </span>
                ) : null}
              </div>
              <div className="font-mono text-[12px] text-muted-foreground">{row.formula}</div>
            </div>
            <code className="font-mono text-[12px] text-muted-foreground">{row.utility}</code>
          </div>
        ))}
      </div>
    );
  },
};
