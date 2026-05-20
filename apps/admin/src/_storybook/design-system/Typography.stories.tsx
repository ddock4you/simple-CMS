import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';
import { TYPOGRAPHY_TOKENS } from './lib/tokenList';

const meta = {
  title: 'Admin/Design System/Typography',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '폰트: **Geist** (`next/font` → `--font-sans`). 폴백: system-ui. ' +
          '기본 본문 14px(`text-sm`) — 데이터 밀도 우선 (Apple 17px와 의도적 차이). ' +
          'weight ladder: 400 / 600 주 사용.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const SAMPLE_TEXT =
  '대시보드에서 데이터를 빠르게 파악하고 액션을 실행한다. Simple CMS 관리자 시스템';

export const Scale: Story = {
  name: '스케일',
  render: () => (
    <div className="space-y-6 max-w-3xl mx-auto">
      <SectionHeader
        title="Typography 스케일"
        description="6개 토큰. design.md §3 미러. weight ladder 400 / 600 주 사용."
      />
      {TYPOGRAPHY_TOKENS.map((t) => (
        <div key={t.name} className="rounded-lg border bg-card text-card-foreground p-6">
          <div className="flex items-baseline justify-between mb-3 pb-3 border-b">
            <div>
              <div className="font-mono text-[17px] font-semibold">{t.name}</div>
              <div className="font-mono text-[12px] text-muted-foreground mt-1">{t.yamlKey}</div>
            </div>
            <code className="font-mono text-[14px] text-muted-foreground">{t.className}</code>
          </div>
          <p className={t.className}>{SAMPLE_TEXT}</p>
          {t.description ? (
            <p className="text-[14px] text-muted-foreground mt-3">{t.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  ),
};

export const WeightLadder: Story = {
  name: 'Weight ladder',
  parameters: {
    docs: {
      description: {
        story:
          'Apple식 weight ladder(300/400/500/600/700)에서 admin은 **400 / 600**만 주 사용. 500은 제한적, 700은 거의 미사용. 300 미채택 (가독성 우선).',
      },
    },
  },
  render: () => {
    const weights = [
      { name: 'light (300)', cls: 'font-light', note: '미사용' },
      { name: 'regular (400)', cls: 'font-normal', note: '본문 기본' },
      { name: 'medium (500)', cls: 'font-medium', note: '제한적 사용' },
      { name: 'semibold (600)', cls: 'font-semibold', note: '제목 · 강조 (주 사용)' },
      { name: 'bold (700)', cls: 'font-bold', note: '거의 미사용' },
    ];
    return (
      <div className="space-y-3 max-w-3xl mx-auto">
        <SectionHeader
          title="Weight ladder"
          description="Geist 가변 폰트는 100~900 모두 지원하지만 admin 정책은 400 / 600 주 사용."
        />
        {weights.map((w) => (
          <div key={w.cls} className="rounded-lg border bg-card p-5 flex items-baseline gap-4">
            <span className="font-mono text-[14px] text-muted-foreground w-36 flex-shrink-0">
              {w.name}
            </span>
            <span className={`text-[17px] ${w.cls} flex-1`}>
              데이터를 빠르게 파악하고 액션을 실행한다.
            </span>
            <span className="text-[14px] text-muted-foreground italic">{w.note}</span>
          </div>
        ))}
      </div>
    );
  },
};

export const FontFamily: Story = {
  name: '폰트 family',
  render: () => (
    <div className="space-y-4 max-w-3xl mx-auto">
      <SectionHeader
        title="폰트 family"
        description="Sans · Monospace 2종. Geist 가변 폰트는 next/font로 자동 최적화."
      />
      <div className="rounded-lg border bg-card p-6">
        <h4 className="text-[17px] font-semibold mb-2">Sans (Geist)</h4>
        <div className="font-mono text-[12px] text-muted-foreground mb-3">
          --font-sans (Geist 가변 폰트, next/font 로드) → system-ui, sans-serif 폴백
        </div>
        <p className="text-[24px] font-semibold tracking-tight">대시보드 데이터 밀도 우선</p>
        <p className="text-[14px] mt-2">
          The quick brown fox jumps over the lazy dog. 0123456789
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <h4 className="text-[17px] font-semibold mb-2">Monospace</h4>
        <div className="font-mono text-[12px] text-muted-foreground mb-3">
          ui-monospace, SFMono-Regular, monospace
        </div>
        <p className="font-mono text-[17px]">const id = &apos;clxyz123abc&apos;;</p>
        <p className="font-mono text-[12px] mt-2 text-muted-foreground">
          → inline code · ID 표시 · 토큰 이름
        </p>
      </div>
    </div>
  ),
};
