import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { SectionHeader } from './lib/TokenSwatch';

const meta = {
  title: 'Admin/Design System/Foundations',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'admin 디자인 시스템의 기반 — globals.css 토큰 정의 구조 · shadcn 토큰 매핑 · Geist 폰트 로드 · light/dark 페어 · design.md ↔ globals.css 검증 정책.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThemeInline: Story = {
  name: '@theme inline 구조',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="globals.css @theme inline"
        description="Tailwind v4의 @theme 토큰 → shadcn의 :root --primary 등 CSS variable로 매핑. 순환 참조 회피 + light/dark 페어 자동 해석."
      />
      <div className="rounded-lg border bg-card text-card-foreground p-5">
        <pre className="overflow-x-auto p-4 font-mono text-[12px] bg-muted rounded leading-relaxed">
{`@theme inline {
  /* shadcn 토큰 매핑 — @theme이 자동으로 --color-* utility 생성 */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-success: var(--success);              /* Stage 15c-3a 추가 */
  --color-warning: var(--warning);              /* Stage 15c-3a 추가 */

  /* radius calc() 파생 */
  --radius-lg: var(--radius);                   /* 기준 0.625rem */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-xl: calc(var(--radius) * 1.4);

  /* shadow 토큰 (Stage 15b) */
  --shadow-card: var(--shadow-card-value);
  --shadow-popover: var(--shadow-popover-value);

  /* spacing 커스텀 */
  --spacing-page-x: 24px;
  --spacing-card: 24px;

  /* 폼 컨트롤 baseline */
  --control-h-default: 2rem;                    /* 32px */
  --control-h-sm: 2rem;                         /* 32px (default와 동일) */
  --control-h-xs: 1.5rem;
  --control-h-lg: 2.25rem;
}`}
        </pre>
      </div>
      <p className="text-[14px] text-muted-foreground mt-4 leading-relaxed">
        ‼ <code className="font-mono text-[12px]">@theme inline</code>은 Tailwind v4 전용 문법. inline 키워드가 없으면 `--shadow-card-value` 같은 base variable이 두 번 평가되어 순환 참조 발생.
      </p>
    </div>
  ),
};

export const LightDarkPair: Story = {
  name: 'light / dark 페어 정의',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title=":root + .dark 페어"
        description="모든 색 토큰은 :root(light)와 .dark(dark) 양쪽에 정의. design.md §2 표가 디자이너 합의 진실원, globals.css가 runtime 진실원."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card text-card-foreground p-5">
          <h4 className="text-[17px] font-semibold mb-2">:root (light mode)</h4>
          <pre className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded leading-relaxed">
{`:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --success: oklch(0.52 0.17 145);
  --warning: oklch(0.748 0.162 70);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --radius: 0.625rem;
  /* ... 28 토큰 */
}`}
          </pre>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground p-5">
          <h4 className="text-[17px] font-semibold mb-2">.dark (dark mode)</h4>
          <pre className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded leading-relaxed">
{`.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);      /* 명도 반전 */
  --success: oklch(0.7 0.155 145);
  --warning: oklch(0.82 0.16 75);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);     /* alpha 기반 */
  /* radius/shadow는 light/dark 공유 */
}`}
          </pre>
        </div>
      </div>
      <p className="text-[14px] text-muted-foreground mt-4 leading-relaxed">
        Colors stories의 light/dark 토글 버튼은 컨테이너 div에 <code className="font-mono text-[12px]">.dark</code> 클래스를 토글. <code className="font-mono text-[12px]">@custom-variant dark (&:is(.dark *))</code>로 dark utility class도 활성화.
      </p>
    </div>
  ),
};

export const FontLoading: Story = {
  name: 'Geist 폰트 로드',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Geist 폰트 로드"
        description="Next.js 16의 next/font/google → --font-sans CSS variable 주입. self-host 아닌 next/font 자동 최적화."
      />
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-5">
          <h4 className="text-[17px] font-semibold mb-2">layout.tsx</h4>
          <pre className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded leading-relaxed">
{`import { Geist } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',         // CSS variable 이름
});

<html className={geist.variable}>
  <body>...</body>
</html>`}
          </pre>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h4 className="text-[17px] font-semibold mb-2">globals.css @theme</h4>
          <pre className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded leading-relaxed">
{`@theme inline {
  --font-heading: var(--font-sans);
  --font-sans: var(--font-sans);   // next/font 주입값 그대로
}

@layer base {
  html { @apply font-sans; }       // 전체 적용
}`}
          </pre>
        </div>
      </div>
      <p className="text-[14px] text-muted-foreground mt-4 leading-relaxed">
        Geist 가변 폰트는 300~700 weight를 단일 폰트 파일로 제공. weight ladder 400/600 주 사용 정책 (design.md §3).
      </p>
    </div>
  ),
};

export const VerifyDesignTokens: Story = {
  name: 'design.md ↔ globals.css 검증',
  parameters: {
    docs: {
      description: {
        story: 'Stage 15c-3a — globals.css의 :root oklch와 design.md YAML hex 간 ΔE2000 검증. ΔE > 1.5 시 fail.',
      },
    },
  },
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="design:verify 스크립트"
        description="design.md YAML hex(디자이너 합의)와 globals.css oklch(runtime 권위)가 ΔE 1.5 이내로 일치하는지 검증. 22 토큰 대상."
      />
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-5">
          <h4 className="text-[17px] font-semibold mb-2">실행</h4>
          <pre className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded">
{`pnpm --filter @simple-cms/admin design:verify

# 출력 예
✓ All 22 tokens pass (max ΔE: 1.29) — threshold 1.5`}
          </pre>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h4 className="text-[17px] font-semibold mb-2">불일치 시 조치</h4>
          <p className="text-[14px] mb-2">globals.css가 runtime 권위이므로 design.md hex를 css→hex 값으로 보정.</p>
          <pre className="overflow-x-auto p-3 font-mono text-[12px] bg-muted rounded">
{`✗ 1 token(s) failed (threshold ΔE ≤ 1.5):

  token          design.md hex   css→hex    ΔE2000
  ─────────────────────────────────────────────
  ✗ warning      #ed9800         #ed9700    1.82

  → design.md hex를 css→hex 값으로 보정하세요.`}
          </pre>
        </div>
      </div>
      <p className="text-[14px] text-muted-foreground mt-4 leading-relaxed">
        의존성: <code className="font-mono text-[12px]">culori</code>(oklch parse + ΔE 계산) · <code className="font-mono text-[12px]">yaml</code>(design.md frontmatter 파싱). 위치: <code className="font-mono text-[12px]">apps/admin/scripts/verify-design-tokens.mjs</code>.
      </p>
    </div>
  ),
};

export const SsotPolicy: Story = {
  name: 'SSOT 정책',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="단일 출처 (SSOT) 정책"
        description="문서/runtime/lint의 진실원을 명확히 분리. 한 곳의 변경이 자동으로 다른 곳에 반영되도록 설계."
      />
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 text-[14px] font-semibold">진실원</th>
              <th className="text-left p-3 text-[14px] font-semibold">파일</th>
              <th className="text-left p-3 text-[14px] font-semibold">소비자</th>
            </tr>
          </thead>
          <tbody>
            {[
              { src: 'Runtime (실제 렌더)', file: 'apps/admin/app/globals.css', cons: 'shadcn 28개 컴포넌트 · 모든 utility class' },
              { src: '디자이너/PM 합의', file: 'apps/admin/design.md (YAML frontmatter)', cons: 'design:verify · 디자이너 리뷰 · Stage 진행 결정' },
              { src: '카탈로그 인덱스', file: 'src/_storybook/design-system/lib/tokenList.ts', cons: 'Storybook stories (이 페이지 포함)' },
              { src: '운영 정책', file: 'apps/admin/AGENTS.md', cons: '에이전트 · 신규 기능 개발 가이드' },
              { src: 'wrapper 게이트', file: 'eslint.config.* (no-restricted-imports)', cons: 'shadcn 원본 직접 import 차단' },
            ].map((row, i) => (
              <tr key={row.file} className={i === 0 ? '' : 'border-t'}>
                <td className="p-3 text-[14px] font-semibold">{row.src}</td>
                <td className="p-3 font-mono text-[12px] text-muted-foreground">{row.file}</td>
                <td className="p-3 text-[14px]">{row.cons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[14px] text-muted-foreground mt-6 leading-relaxed">
        ⚠ <code className="font-mono text-[12px]">npx @google/design.md export css-tailwind</code> 실행 금지 — globals.css의 oklch · light/dark 페어 · radius calc() 구조를 덮어써 shadcn 28개 컴포넌트를 파괴.
      </p>
    </div>
  ),
};
